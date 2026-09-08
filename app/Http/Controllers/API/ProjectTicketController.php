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
    // A ticket may be assigned to anyone on the project team (a lead or a
    // member). The CEO and project leads build that team, so the assignable
    // pool is the whole project team rather than "my direct reports".
    private function canAssignUser(Request $request, Project $project, int $targetId): bool
    {
        if ($request->user()->isCeo()) {
            return User::whereKey($targetId)->exists();
        }
        return in_array($targetId, $project->teamUserIds(), true);
    }

    // Who can manage a project's tickets: the CEO, the project creator, or any
    // of the project's leads (a project can now have several leads).
    private function canManageProject(Request $request, Project $project): bool
    {
        $user = $request->user();
        return $user->isCeo()
            || (int) $project->created_by === (int) $user->id
            || $project->isLead($user->id);
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
        
        $query = ProjectTicket::with(['assignee:id,first_name,last_name,name,email,role', 'rater:id,first_name,last_name,name'])->where('project_id', $project->id);

        // CEO, the creator and any project lead see every ticket; everyone else
        // (a plain member/assignee) sees only the tickets assigned to them.
        if (!$this->canManageProject($request, $project)) {
            $query->where('assignee_id', $user->id);
        }

        return response()->json(['tickets' => $query->get()]);
    }
    public function store(Request $request, Project $project)
    {
        abort_unless($this->canManageProject($request, $project), 403);
        $data = $request->validate(['title'=>'required|string|max:200','description'=>'nullable|string','status'=>'nullable|in:todo,in_progress,in_review,done','priority'=>'nullable|in:low,medium,high,urgent','due_date'=>'nullable|date','attachment'=>'nullable|file|mimes:pdf,jpg,jpeg,png,doc,docx,xls,xlsx,txt|max:10240','assignee_id'=>'nullable|exists:users,id']);
        if (!empty($data['assignee_id'])) {
            abort_unless($this->canAssignUser($request, $project, (int) $data['assignee_id']), 403, 'You can only assign this ticket to a member of the project team.');
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
        $data = $request->validate(['title'=>'sometimes|required|string|max:200','description'=>'nullable|string','status'=>'sometimes|in:todo,in_progress,in_review,done','progress'=>'sometimes|integer|min:0|max:100','priority'=>'sometimes|in:low,medium,high,urgent','due_date'=>'nullable|date','assignee_id'=>'nullable|exists:users,id']);
        if (!$this->canManageProject($request, $ticket->project)) {
            // The assignee (doer) may move the status and update their progress %.
            $data = array_intersect_key($data, array_flip(['status', 'progress']));
        }
        if (isset($data['status']) && $data['status'] === 'done' && $ticket->status === 'in_review') {
            abort_unless($this->canManageProject($request, $ticket->project), 403, 'Only the President or a project lead can move a ticket from Review to Done.');
        }
        // Keep the progress bar honest: a done ticket is 100%, anything else <100.
        if (isset($data['status'])) {
            if ($data['status'] === 'done') $data['progress'] = 100;
            elseif ($ticket->progress >= 100 && !isset($data['progress'])) $data['progress'] = 0;
        }
        if (!empty($data['assignee_id'])) {
            abort_unless($this->canAssignUser($request, $ticket->project, (int) $data['assignee_id']), 403, 'You can only assign this ticket to a member of the project team.');
        }
        $ticket->load('project');
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
                    $projectName = $ticket->project ? $ticket->project->name : 'Project';
                    NotificationService::send(
                        $newUser,
                        'Ticket assigned to you',
                        "You've been assigned \"{$ticket->title}\" in {$projectName}.",
                        'info',
                        "/projects/{$ticket->project_id}?ticket={$ticket->id}",
                        $ticket
                    );
                }
            } elseif (in_array($field, ['status', 'priority', 'title', 'description'])) {
                TicketActivity::create(['ticket_id'=>$ticket->id, 'user_id'=>$request->user()->id, 'type'=>$field.'_changed', 'old_value'=>$oldValue, 'new_value'=>$newValue]);
            } elseif ($field === 'progress') {
                TicketActivity::create(['ticket_id'=>$ticket->id, 'user_id'=>$request->user()->id, 'type'=>'progress_changed', 'old_value'=>($oldValue ?? 0).'%', 'new_value'=>$newValue.'%']);
            }
        }

        return response()->json(['ticket' => $ticket->fresh('assignee')]);
    }
    public function subtasks(Request $request, ProjectTicket $ticket) { $this->authorizeTicket($request,$ticket); return response()->json(['subtasks'=>TicketSubtask::where('ticket_id',$ticket->id)->get()]); }
    public function addSubtask(Request $request, ProjectTicket $ticket) { $this->authorizeTicket($request,$ticket); $data=$request->validate(['title'=>'required|string|max:200']); $data['ticket_id']=$ticket->id; return response()->json(['subtask'=>TicketSubtask::create($data)],201); }
    public function updateSubtask(Request $request, TicketSubtask $subtask) { $ticket=ProjectTicket::findOrFail($subtask->ticket_id); $this->authorizeTicket($request,$ticket); $subtask->update($request->validate(['title'=>'sometimes|string|max:200','is_completed'=>'sometimes|boolean'])); return ['subtask'=>$subtask]; }

    // A completed ticket can be rated 1-5 by the CEO or a project lead, and
    // re-rated later (the rating simply updates).
    public function rate(Request $request, ProjectTicket $ticket)
    {
        $ticket->load('project');
        abort_unless($this->canManageProject($request, $ticket->project), 403, 'Only the President or a project lead can rate a ticket.');
        abort_unless($ticket->status === 'done', 422, 'Only completed (Done) tickets can be rated.');

        $data = $request->validate(['rating' => 'required|integer|min:1|max:5']);
        $previous = $ticket->rating;

        $ticket->update([
            'rating' => $data['rating'],
            'rated_by' => $request->user()->id,
            'rated_at' => now(),
        ]);

        TicketActivity::create([
            'ticket_id' => $ticket->id,
            'user_id' => $request->user()->id,
            'type' => $previous ? 'rating_updated' : 'rated',
            'old_value' => $previous ? $previous . '★' : null,
            'new_value' => $data['rating'] . '★',
        ]);

        // Let the person who did the work know how it was rated.
        if ($ticket->assignee_id && (int) $ticket->assignee_id !== (int) $request->user()->id) {
            $assignee = User::find($ticket->assignee_id);
            if ($assignee) {
                NotificationService::send(
                    $assignee,
                    $previous ? 'Ticket rating updated' : 'Your ticket was rated',
                    "\"{$ticket->title}\" was rated {$data['rating']}★.",
                    'info',
                    "/projects/{$ticket->project_id}?ticket={$ticket->id}",
                    $ticket
                );
            }
        }

        return response()->json(['ticket' => $ticket->fresh(['assignee', 'rater'])]);
    }

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
