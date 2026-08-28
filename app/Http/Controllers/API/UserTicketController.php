<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\ProjectTicket;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class UserTicketController extends Controller
{
    /**
     * Get all tickets assigned to the authenticated user.
     */
    public function myTickets(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $tickets = ProjectTicket::with(['project:id,name', 'assignee:id,first_name,last_name,name,email,role'])
            ->where('assignee_id', $user->id)
            ->latest()
            ->get();

        return response()->json([
            'tickets' => $tickets
        ]);
    }

    /**
     * Mark assigned tickets as seen for the authenticated user.
     */
    public function markSeen(Request $request): JsonResponse
    {
        $request->user()->update(['tickets_last_seen_at' => now()]);
        return response()->json(['message' => 'Tickets marked as seen.']);
    }
}
