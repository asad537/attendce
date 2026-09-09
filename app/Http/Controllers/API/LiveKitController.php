<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\CallParticipant;
use App\Models\CallSignal;
use App\Services\LiveKitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LiveKitController extends Controller
{
    /**
     * POST /api/livekit/token — join the LiveKit room for a call. Only someone
     * who is a party to the call (sent/received its invite, or already joined)
     * may get a token, so a room name alone is never enough to eavesdrop.
     */
    public function token(Request $request): JsonResponse
    {
        abort_unless(LiveKitService::configured(), 503, 'Calls are not configured (LiveKit).');
        $data = $request->validate(['call_id' => 'required|string|max:40']);
        $callId = $data['call_id'];
        $user = $request->user();

        $isParty = CallParticipant::where('call_id', $callId)->where('user_id', $user->id)->exists()
            || CallSignal::where('call_id', $callId)
                ->where(fn ($q) => $q->where('from_user_id', $user->id)->orWhere('to_user_id', $user->id))
                ->exists();
        abort_unless($isParty, 403, 'You are not part of this call.');

        // Keep the roster row so guest-invite / party checks keep working.
        CallParticipant::updateOrCreate(
            ['call_id' => $callId, 'user_id' => $user->id],
            ['kind' => $request->input('kind') === 'video' ? 'video' : 'voice', 'last_seen_at' => now()]
        );

        return response()->json([
            'url' => LiveKitService::url(),
            'token' => LiveKitService::token('u' . $user->id, $user->name, $callId),
            'identity' => 'u' . $user->id,
        ]);
    }
}
