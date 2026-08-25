<?php
namespace App\Http\Controllers\API;
use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectTicket;
use App\Models\User;
use App\Models\TicketSubtask;
use App\Models\TicketActivity;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class ProjectTicketController extends Controller
{
    private function canAssignUser(Request $request, int $targetId): bool
    {
        $actor = $request->user();

        // No one can self-assign — assigners aren't the doers of the work.
        if ($targetId === (int) $actor->id) {
            return false;
        }

        // Active OR inactive users are both assignable (deactivated staff
        // may still own historical work).
        return User::query()
            ->whereKey($targetId)
            ->when(!$actor->isCeo(), function ($query) use ($actor) {
                // Manager / TL can only assign to their direct reports.
                $query->where('manager_id', $actor->id);
            })
            ->exists();
    }

    private function canManageProject(Request $request, Project $project): bool
    {
        $user = $request->user();
        return $user->isCeo()
            || (int) $project->created_by === (int) $user->id
            || (int) $project->project_lead_id === (int) $user->id;
    }

    private function authorizeProjectView(Request $request, Project $project): void
    {
        if ($this->canManageProject($request, $project)) return;
        if (ProjectTicket::where('project_id', $project->id)->where('assignee_id', $request->user()->id)->exists()) return;
        abort(403);
    }

    private function authorizeTicket(Request $request, ProjectTicket $ticket): void
    {
        if ($this->canManageProject($request, $ticket->project)) return;
        abort_unless((int) $ticket->assignee_id === (int) $request->user()->id, 403);
    }
    public function index(Request $request, Project $project)
    {
        $this->authorizeProjectView($request, $project);
        $user = $request->user();
        
        $query = ProjectTicket::with('assignee:id,first_name,last_name,name,email,role')->where('project_id', $project->id);
        
        if (!$user->isCeo() && $project->created_by != $user->id && $project->project_lead_id != $user->id) {
            $query->where('assignee_id', $user->id);
        }

        return response()->json(['tickets' => $query->get()]);
    }
    public function store(Request $request, Project $project)
    {
        abort_unless($this->canManageProject($request, $project), 403);
        $data = $request->validate(['title'=>'required|string|max:200','description'=>'nullable|string','status'=>'nullable|in:todo,in_progress,in_review,done','priority'=>'nullable|in:low,medium,high,urgent','due_date'=>'nullable|date','attachment'=>'nullable|file|mimes:pdf,jpg,jpeg,png,doc,docx,xls,xlsx,txt|max:10240','assignee_id'=>'nullable|exists:users,id']);
        if (!empty($data['assignee_id'])) {
            abort_unless($this->canAssignUser($request, (int) $data['assignee_id']), 403, 'You cannot assign this ticket to that user.');
        }

        $storedPath = null;
        try {
            if ($request->hasFile('attachment')) {
                $data['attachment_name'] = $request->file('attachment')->getClientOriginalName();
                $storedPath = $request->file('attachment')->store('ticket-attachments');
                $data['attachment_path'] = $storedPath;
            }
            unset($data['attachment']);
            $data['project_id'] = $project->id;
            $data['created_by'] = $request->user()->id;

            $ticket = DB::transaction(function () use ($data, $request) {
                $ticket = ProjectTicket::create($data);
                TicketActivity::create([
                    'ticket_id' => $ticket->id,
                    'user_id' => $request->user()->id,
                    'type' => 'created',
                    'new_value' => 'Ticket created'
                ]);
                return $ticket;
            });
        } catch (\Throwable $error) {
            if ($storedPath) Storage::disk('local')->delete($storedPath);
            throw $error;
        }

        // Notify the assignee (unless they assigned it to themselves).
        if (!empty($data['assignee_id']) && (int) $data['assignee_id'] !== (int) $request->user()->id) {
            $assignee = User::find($data['assignee_id']);
            if ($assignee) {
                NotificationService::send(
                    $assignee,
                    'New ticket assigned',
                    "You've been assigned \"{$ticket->title}\" in {$project->name}.",
                    'info',
                    "/projects/{$project->id}?ticket={$ticket->id}",
                    $ticket
                );
            }
        }

        return response()->json(['ticket' => $ticket->load('assignee')], 201);
    }

    public function update(Request $request, ProjectTicket $ticket)
    {
        $this->authorizeTicket($request, $ticket);
        $data = $request->validate(['title'=>'sometimes|required|string|max:200','description'=>'nullable|string','status'=>'sometimes|in:todo,in_progress,in_review,done','priority'=>'sometimes|in:low,medium,high,urgent','due_date'=>'nullable|date','assignee_id'=>'nullable|exists:users,id']);
        if (!$this->canManageProject($request, $ticket->project)) {
            $data = array_intersect_key($data, array_flip(['status']));
        }
        if (!empty($data['assignee_id'])) {
            abort_unless($this->canAssignUser($request, (int) $data['assignee_id']), 403, 'You cannot assign this ticket to that user.');
        }
        $original = $ticket->getOriginal();
        $ticket->update($data);

        $changes = $ticket->getChanges();
        unset($changes['updated_at']);

        foreach ($changes as $field => $newValue) {
            $oldValue = $original[$field] ?? null;
            if ($field === 'assignee_id') {
                $oldUser = $oldValue ? User::find($oldValue) : null;
                $newUser = $newValue ? User::find($newValue) : null;
                $oldValStr = $oldUser ? $oldUser->name : 'Unassigned';
                $newValStr = $newUser ? $newUser->name : 'Unassigned';
                TicketActivity::create(['ticket_id'=>$ticket->id, 'user_id'=>$request->user()->id, 'type'=>'assignee_changed', 'old_value'=>$oldValStr, 'new_value'=>$newValStr]);
                // Notify the newly-assigned user (unless they reassigned it to themselves).
                if ($newUser && (int) $newUser->id !== (int) $request->user()->id) {
                    NotificationService::send(
                        $newUser,
                        'Ticket assigned to you',
                        "You've been assigned \"{$ticket->title}\" in {$ticket->project->name}.",
                        'info',
                        "/projects/{$ticket->project_id}?ticket={$ticket->id}",
                        $ticket
                    );
                }
            } elseif (in_array($field, ['status', 'priority', 'title', 'description'])) {
                TicketActivity::create(['ticket_id'=>$ticket->id, 'user_id'=>$request->user()->id, 'type'=>$field.'_changed', 'old_value'=>$oldValue, 'new_value'=>$newValue]);
            }
        }

        return response()->json(['ticket' => $ticket->fresh('assignee')]);
    }
    public function subtasks(Request $request, ProjectTicket $ticket) { $this->authorizeTicket($request,$ticket); return response()->json(['subtasks'=>TicketSubtask::where('ticket_id',$ticket->id)->get()]); }
    public function addSubtask(Request $request, ProjectTicket $ticket) { $this->authorizeTicket($request,$ticket); $data=$request->validate(['title'=>'required|string|max:200']); $data['ticket_id']=$ticket->id; return response()->json(['subtask'=>TicketSubtask::create($data)],201); }
    public function updateSubtask(Request $request, TicketSubtask $subtask) { $ticket=ProjectTicket::findOrFail($subtask->ticket_id); $this->authorizeTicket($request,$ticket); $subtask->update($request->validate(['title'=>'sometimes|string|max:200','is_completed'=>'sometimes|boolean'])); return ['subtask'=>$subtask]; }

    public function uploadAttachment(Request $request, ProjectTicket $ticket)
    {
        abort_unless($this->canManageProject($request, $ticket->project), 403);
        $data = $request->validate(['attachment' => 'required|file|mimes:pdf,jpg,jpeg,png,doc,docx,xls,xlsx,txt|max:10240']);
        $file = $data['attachment'];
        $oldPath = $ticket->attachment_path;
        $newPath = $file->store('ticket-attachments');

        try {
            DB::transaction(function () use ($ticket, $file, $newPath, $request) {
                $ticket->update(['attachment_name' => $file->getClientOriginalName(), 'attachment_path' => $newPath]);
                TicketActivity::create(['ticket_id' => $ticket->id, 'user_id' => $request->user()->id, 'type' => 'attachment_added', 'new_value' => $ticket->attachment_name]);
            });
        } catch (\Throwable $error) {
            Storage::disk('local')->delete($newPath);
            throw $error;
        }

        if ($oldPath && $oldPath !== $newPath) Storage::disk('local')->delete($oldPath);
        return response()->json(['ticket' => $ticket->fresh('assignee')]);
    }

    public function downloadAttachment(Request $request, ProjectTicket $ticket)
    {
        $this->authorizeTicket($request, $ticket);
        abort_unless($ticket->attachment_path && Storage::disk('local')->exists($ticket->attachment_path), 404);
        return Storage::disk('local')->download($ticket->attachment_path, $ticket->attachment_name);
    }

    public function destroy(Request $request, ProjectTicket $ticket)
    {
        abort_unless($this->canManageProject($request, $ticket->project), 403);
        if ($ticket->attachment_path) Storage::disk('local')->delete($ticket->attachment_path);
        $ticket->delete();
        return response()->json(['message' => 'Ticket deleted.']);
    }

    public function watchStatus(Request $request, ProjectTicket $ticket)
    {
        $this->authorizeTicket($request, $ticket);
        return response()->json(['watching' => DB::table('ticket_watchers')->where(['ticket_id' => $ticket->id, 'user_id' => $request->user()->id])->exists()]);
    }

    public function toggleWatch(Request $request, ProjectTicket $ticket)
    {
        $this->authorizeTicket($request, $ticket);
        $query = DB::table('ticket_watchers')->where(['ticket_id' => $ticket->id, 'user_id' => $request->user()->id]);
        if ($query->exists()) { $query->delete(); $watching = false; }
        else { DB::table('ticket_watchers')->insert(['ticket_id' => $ticket->id, 'user_id' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]); $watching = true; }
        return response()->json(['watching' => $watching]);
    }
}
