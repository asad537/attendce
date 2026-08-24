<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /** GET /api/notifications */
    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $query = $user->notifications()->orderByDesc('created_at');

        if ($request->boolean('unread')) {
            $query->unread();
        }

        $notifications = $query->paginate(20);

        return response()->json([
            'data'         => NotificationResource::collection($notifications->items()),
            'unread_count' => $user->notifications()->unread()->count(),
            'meta'         => [
                'total'        => $notifications->total(),
                'current_page' => $notifications->currentPage(),
                'last_page'    => $notifications->lastPage(),
            ],
        ]);
    }

    /** POST /api/notifications/{id}/read */
    public function markRead(Request $request, int $id): JsonResponse
    {
        $notif = $request->user()->notifications()->findOrFail($id);
        $notif->markAsRead();
        return response()->json(['message' => 'Marked as read.']);
    }

    /** POST /api/notifications/read-all */
    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->notifications()->unread()->update([
            'is_read' => true,
            'read_at' => now(),
        ]);
        return response()->json(['message' => 'All notifications marked as read.']);
    }

    /** DELETE /api/notifications/{id} */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $request->user()->notifications()->findOrFail($id)->delete();
        return response()->json(['message' => 'Notification deleted.']);
    }
}
