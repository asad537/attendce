<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\ProjectTicket;
use App\Models\TicketComment;
use App\Models\TicketActivity;
use App\Models\TicketWorklog;
use Illuminate\Http\Request;

class TicketActivityController extends Controller
{
    private function authorizeTicket(Request $request, ProjectTicket $ticket)
    {
        $project = $ticket->project;
        $user = $request->user();
        if ($user->isCeo()) return;
        if ($project->created_by == $user->id || $project->project_lead_id == $user->id) return;
        if ((int) $ticket->assignee_id === (int) $user->id) return;
        abort(403);
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

        $worklogs = TicketWorklog::with('user:id,first_name,last_name,name,email,role')
            ->where('ticket_id', $ticket->id)
            ->get()
            ->map(function ($w) {
                return [
                    'id' => 'worklog_'.$w->id,
                    'type' => 'worklog',
                    'time_spent' => $w->time_spent,
                    'time_remaining' => $w->time_remaining,
                    'user' => $w->user,
                    'created_at' => $w->created_at
                ];
            });

        $feed = collect($comments)->merge($activities)->merge($worklogs)->sortByDesc('created_at')->values();

        return response()->json(['feed' => $feed]);
    }

    public function storeComment(Request $request, ProjectTicket $ticket)
    {
        $this->authorizeTicket($request, $ticket);
        
        $data = $request->validate([
            'body' => 'required|string|max:2000'
        ]);
        
        $comment = $ticket->comments()->create([
            'user_id' => $request->user()->id,
            'body' => $data['body']
        ]);

        return response()->json(['message' => 'Comment added', 'comment' => $comment->load('user')], 201);
    }

    private function parseJiraTime($timeStr) {
        if (!$timeStr) return 0;
        $minutes = 0;
        preg_match_all('/(\d+)\s*(w|d|h|m)/i', $timeStr, $matches, PREG_SET_ORDER);
        foreach ($matches as $match) {
            $val = (int)$match[1];
            $unit = strtolower($match[2]);
            if ($unit === 'w') $minutes += $val * 5 * 8 * 60; // 1w = 40h
            else if ($unit === 'd') $minutes += $val * 8 * 60; // 1d = 8h
            else if ($unit === 'h') $minutes += $val * 60;
            else if ($unit === 'm') $minutes += $val;
        }
        return $minutes;
    }

    public function storeWorklog(Request $request, ProjectTicket $ticket)
    {
        $this->authorizeTicket($request, $ticket);
        
        $data = $request->validate([
            'time_spent' => 'required|string',
            'time_remaining' => 'nullable|string'
        ]);

        $timeSpentMins = $this->parseJiraTime($data['time_spent']);
        if ($timeSpentMins <= 0) {
            return response()->json(['message' => 'Invalid time spent format'], 422);
        }

        $timeRemainingMins = null;
        if (!empty($data['time_remaining'])) {
            $timeRemainingMins = $this->parseJiraTime($data['time_remaining']);
        }

        $worklog = $ticket->worklogs()->create([
            'user_id' => $request->user()->id,
            'time_spent' => $timeSpentMins,
            'time_remaining' => $timeRemainingMins,
        ]);

        return response()->json(['message' => 'Work logged successfully', 'worklog' => $worklog->load('user')], 201);
    }
}
