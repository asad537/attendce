<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Leave;
use App\Models\Message;
use App\Models\ProjectTicket;
use App\Models\Resignation;
use App\Models\User;
use App\Models\WfhRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SidebarController extends Controller
{
    /**
     * Get aggregate sidebar badge counts based on the authenticated user's role.
     */
    public function counts(Request $request): JsonResponse
    {
        $user = $request->user();

        // 1. Unread inbox messages
        try {
            $unreadMessages = Message::where('recipient_id', $user->id)
                ->where('is_draft', false)
                ->whereNull('read_at')
                ->whereNull('archived_at')
                ->whereNull('spam_at')
                ->whereNull('deleted_by_recipient_at')
                ->count();
        } catch (\Throwable $e) {
            $unreadMessages = 0;
        }

        // 2. Open / In-progress tickets assigned to user (unseen)
        try {
            $myTicketsQuery = ProjectTicket::where('assignee_id', $user->id)
                ->whereNotIn('status', ['done', 'closed', 'completed', 'resolved']);

            if ($user->tickets_last_seen_at) {
                $myTicketsQuery->where('created_at', '>', $user->tickets_last_seen_at);
            }

            $myTickets = $myTicketsQuery->count();
        } catch (\Throwable $e) {
            $myTickets = 0;
        }

        // 3. Leave Approvals (pending review)
        try {
            if ($user->isCeo()) {
                $leaveApprovals = Leave::where('status', 'pending')->count();
            } elseif ($user->isTeamLead()) {
                $teamIds = User::where('manager_id', $user->id)->pluck('id');
                $leaveApprovals = Leave::where('status', 'pending')->whereIn('user_id', $teamIds)->count();
            } else {
                $leaveApprovals = 0;
            }
        } catch (\Throwable $e) {
            $leaveApprovals = 0;
        }

        // 4. My Leaves (own pending leave requests)
        try {
            $myLeaves = Leave::where('user_id', $user->id)->where('status', 'pending')->count();
        } catch (\Throwable $e) {
            $myLeaves = 0;
        }

        // 5. WFM Approvals (pending WFH review)
        try {
            if ($user->isCeo()) {
                $wfhApprovals = WfhRequest::where('status', 'pending')->count();
            } elseif ($user->isTeamLead()) {
                $teamIds = User::where('manager_id', $user->id)->pluck('id');
                $wfhApprovals = WfhRequest::whereIn('user_id', $teamIds)->where('status', 'pending')->count();
            } else {
                $wfhApprovals = 0;
            }
        } catch (\Throwable $e) {
            $wfhApprovals = 0;
        }

        // 6. My WFM (own pending WFH requests)
        try {
            $myWfh = WfhRequest::where('user_id', $user->id)->where('status', 'pending')->count();
        } catch (\Throwable $e) {
            $myWfh = 0;
        }

        // 7. Resignations (pending resignation count)
        try {
            if ($user->isCeo()) {
                $pendingResignations = Resignation::where('status', 'pending')->count();
            } elseif ($user->isTeamLead()) {
                $teamIds = User::where('manager_id', $user->id)->pluck('id')->push($user->id);
                $pendingResignations = Resignation::where('status', 'pending')->whereIn('user_id', $teamIds)->count();
            } else {
                $pendingResignations = Resignation::where('status', 'pending')->where('user_id', $user->id)->count();
            }
        } catch (\Throwable $e) {
            $pendingResignations = 0;
        }

        return response()->json([
            'unread_messages'      => $unreadMessages,
            'my_tickets'           => $myTickets,
            'leave_approvals'      => $leaveApprovals,
            'my_leaves'            => $myLeaves,
            'wfh_approvals'        => $wfhApprovals,
            'my_wfh'               => $myWfh,
            'pending_resignations' => $pendingResignations,
        ]);
    }
}
