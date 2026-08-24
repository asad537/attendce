<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\ProjectTicket;
use App\Models\TicketComment;
use App\Models\TicketActivity;
use Illuminate\Http\Request;

class TicketActivityController extends Controller
{
    private function authorizeTicket(Request $request, ProjectTicket $ticket)
    {
        $project = $ticket->project;
        $user = $request->user();
        if ($user->isEmployee() || (!$user->isCeo() && $project->created_by !== $user->id && $project->project_lead_id !== $user->id)) {
            abort(403);
        }
    }

    public function activity(Request $request, ProjectTicket $ticket)
    {
        $this->authorizeTicket($request, $ticket);

        $comments = TicketComment::with('user:id,first_name,last_name,name,email,role')
            ->where('ticket_id', $ticket->id)
            ->get()
            ->map(function ($c) {
                return [
                    'id' => 'comment_'.$c->id,
                    'type' => 'comment',
                    'user' => $c->user,
                    'body' => $c->body,
                    'created_at' => $c->created_at
                ];
            });

        $activities = TicketActivity::with('user:id,first_name,last_name,name,email,role')
            ->where('ticket_id', $ticket->id)
            ->get()
            ->map(function ($a) {
                return [
                    'id' => 'activity_'.$a->id,
                    'type' => 'activity',
                    'activity_type' => $a->type,
                    'old_value' => $a->old_value,
                    'new_value' => $a->new_value,
                    'user' => $a->user,
                    'created_at' => $a->created_at
                ];
            });

        $feed = collect($comments)->merge($activities)->sortByDesc('created_at')->values();

        return response()->json(['feed' => $feed]);
    }

    public function storeComment(Request $request, ProjectTicket $ticket)
    {
        $this->authorizeTicket($request, $ticket);

        $data = $request->validate([
            'body' => 'required|string|max:1000'
        ]);

        $comment = TicketComment::create([
            'ticket_id' => $ticket->id,
            'user_id' => $request->user()->id,
            'body' => $data['body']
        ]);

        return response()->json(['comment' => $comment->load('user')], 201);
    }
}
