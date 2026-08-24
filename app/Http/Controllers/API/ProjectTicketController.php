<?php
namespace App\Http\Controllers\API;
use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectTicket;
use App\Models\User;
use App\Models\TicketSubtask;
use App\Models\TicketActivity;
use Illuminate\Http\Request;

class ProjectTicketController extends Controller
{
    private function authorizeProject(Request $request, Project $project): void
    {
        $user = $request->user();
        if ($user->isEmployee() || (!$user->isCeo() && $project->created_by !== $user->id && $project->project_lead_id !== $user->id)) abort(403);
    }
    public function index(Request $request, Project $project)
    {
        $this->authorizeProject($request, $project);
        return response()->json(['tickets' => ProjectTicket::with('assignee:id,first_name,last_name,name,email,role')->where('project_id', $project->id)->get()]);
    }
    public function store(Request $request, Project $project)
    {
        $this->authorizeProject($request, $project);
        $data = $request->validate(['title'=>'required|string|max:200','description'=>'nullable|string','status'=>'nullable|in:todo,in_progress,in_review,done','priority'=>'nullable|in:low,medium,high,urgent','due_date'=>'nullable|date','attachment'=>'nullable|file|max:10240','assignee_id'=>'nullable|exists:users,id']);
        if ($request->hasFile('attachment')) { $data['attachment_name'] = $request->file('attachment')->getClientOriginalName(); $data['attachment_path'] = $request->file('attachment')->store('ticket-attachments', 'public'); }
        unset($data['attachment']);
        if (!empty($data['assignee_id'])) {
            $assignee = User::findOrFail($data['assignee_id']);
            $allowedRoles = $request->user()->isCeo() ? ['manager', 'tl'] : ['tl', 'employee'];
            if (!in_array($assignee->role, $allowedRoles, true)) {
                return response()->json(['message' => 'This user cannot be assigned a ticket from your role.'], 422);
            }
        }
        $data['project_id'] = $project->id; $data['created_by'] = $request->user()->id;
        $ticket = ProjectTicket::create($data);
        TicketActivity::create([
            'ticket_id' => $ticket->id,
            'user_id' => $request->user()->id,
            'type' => 'created',
            'new_value' => 'Ticket created'
        ]);
        return response()->json(['ticket' => $ticket->load('assignee')], 201);
    }

    public function update(Request $request, ProjectTicket $ticket)
    {
        $this->authorizeProject($request, $ticket->project);
        $data = $request->validate(['title'=>'sometimes|required|string|max:200','description'=>'nullable|string','status'=>'sometimes|in:todo,in_progress,in_review,done','priority'=>'sometimes|in:low,medium,high,urgent','due_date'=>'nullable|date','attachment'=>'nullable|file|max:10240','assignee_id'=>'nullable|exists:users,id']);
        if ($request->hasFile('attachment')) { $data['attachment_name'] = $request->file('attachment')->getClientOriginalName(); $data['attachment_path'] = $request->file('attachment')->store('ticket-attachments', 'public'); }
        unset($data['attachment']);

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
            } elseif (in_array($field, ['status', 'priority', 'title', 'description'])) {
                TicketActivity::create(['ticket_id'=>$ticket->id, 'user_id'=>$request->user()->id, 'type'=>$field.'_changed', 'old_value'=>$oldValue, 'new_value'=>$newValue]);
            }
        }

        return response()->json(['ticket' => $ticket->fresh('assignee')]);
    }
    public function subtasks(Request $request, ProjectTicket $ticket) { $this->authorizeProject($request,$ticket->project); return response()->json(['subtasks'=>TicketSubtask::where('ticket_id',$ticket->id)->get()]); }
    public function addSubtask(Request $request, ProjectTicket $ticket) { $this->authorizeProject($request,$ticket->project); $data=$request->validate(['title'=>'required|string|max:200']); $data['ticket_id']=$ticket->id; return response()->json(['subtask'=>TicketSubtask::create($data)],201); }
    public function updateSubtask(Request $request, TicketSubtask $subtask) { $ticket=ProjectTicket::findOrFail($subtask->ticket_id); $this->authorizeProject($request,$ticket); $subtask->update($request->validate(['title'=>'sometimes|string|max:200','is_completed'=>'sometimes|boolean'])); return ['subtask'=>$subtask]; }
}
