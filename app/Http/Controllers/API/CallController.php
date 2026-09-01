<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\CallParticipant;
use App\Models\CallSignal;
use App\Models\Message;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CallController extends Controller
{
    /**
     * Record a finished call as a message in the conversation so it shows up
     * in the chat thread (like WhatsApp's "Missed voice call" rows). Only the
     * caller logs, so the entry is never duplicated.
     */
    public function log(Request $request): JsonResponse
    {
        $data = $request->validate([
            'to_user_id' => 'required|exists:users,id',
            'kind' => 'required|in:voice,video',
            'outcome' => 'required|in:ended,missed,declined,cancelled',
            'duration' => 'nullable|integer|min:0',
        ]);

        abort_if((int) $data['to_user_id'] === (int) $request->user()->id, 422, 'You cannot call yourself.');

        $message = Message::create([
            'sender_id' => $request->user()->id,
            'recipient_id' => $data['to_user_id'],
            'subject' => '(Call)',
            'body' => json_encode([
                'kind' => $data['kind'],
                'outcome' => $data['outcome'],
                'duration' => (int) ($data['duration'] ?? 0),
            ]),
            'label' => 'call',
        ]);

        return response()->json(['ok' => true, 'id' => $message->id], 201);
    }

    /**
     * Join / heartbeat a group-call room and return its live roster. Called
     * every few seconds while in a group call; participants whose heartbeat
     * is older than 12s are treated as gone.
     */
    public function join(Request $request): JsonResponse
    {
        $data = $request->validate([
            'call_id' => 'required|string|max:40',
            'kind' => 'required|in:voice,video',
        ]);

        CallParticipant::updateOrCreate(
            ['call_id' => $data['call_id'], 'user_id' => $request->user()->id],
            ['kind' => $data['kind'], 'last_seen_at' => now()]
        );

        return response()->json(['participants' => $this->roster($data['call_id'], $request->user()->id)]);
    }

    /** Leave a group-call room. */
    public function leave(Request $request): JsonResponse
    {
        $data = $request->validate(['call_id' => 'required|string|max:40']);
        CallParticipant::where('call_id', $data['call_id'])->where('user_id', $request->user()->id)->delete();

        return response()->json(['ok' => true]);
    }

    /** Active participants of a room (heartbeat within 12s), excluding $exceptId. */
    private function roster(string $callId, int $exceptId): array
    {
        return CallParticipant::with('user:id,name,avatar,role')
            ->where('call_id', $callId)
            ->where('user_id', '!=', $exceptId)
            ->where('last_seen_at', '>=', now()->subSeconds(12))
            ->get()
            ->map(fn ($p) => [
                'id' => $p->user_id,
                'name' => optional($p->user)->name,
                'avatar_url' => optional($p->user)->avatar_url,
                'kind' => $p->kind,
            ])
            ->values()
            ->all();
    }

    /**
     * Post a signalling message (offer / answer / ice / hangup / reject / cancel)
     * to the other participant. Signalling rides on top of normal polling so no
     * WebSocket server is required.
     */
    public function signal(Request $request): JsonResponse
    {
        $data = $request->validate([
            'call_id' => 'required|string|max:40',
            'to_user_id' => 'required|exists:users,id',
            'type' => 'required|in:offer,answer,ice,hangup,reject,cancel,invite,join,leave',
            'data' => 'nullable',
        ]);

        abort_if((int) $data['to_user_id'] === (int) $request->user()->id, 422, 'You cannot call yourself.');

        CallSignal::create([
            'call_id' => $data['call_id'],
            'from_user_id' => $request->user()->id,
            'to_user_id' => $data['to_user_id'],
            'type' => $data['type'],
            'data' => isset($data['data']) ? json_encode($data['data']) : null,
        ]);

        return response()->json(['ok' => true]);
    }

    /**
     * Return (and consume) any pending signalling messages addressed to me.
     */
    public function poll(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $signals = CallSignal::with('from:id,name,email,avatar,role')
            ->where('to_user_id', $userId)
            ->whereNull('read_at')
            ->where('created_at', '>=', now()->subSeconds(60))
            ->orderBy('id')
            ->limit(50)
            ->get();

        if ($signals->isNotEmpty()) {
            CallSignal::whereIn('id', $signals->pluck('id'))->update(['read_at' => now()]);
        }

        return response()->json([
            'signals' => $signals->map(fn ($signal) => [
                'id' => $signal->id,
                'call_id' => $signal->call_id,
                'type' => $signal->type,
                'data' => $signal->data ? json_decode($signal->data, true) : null,
                'from' => [
                    'id' => $signal->from->id,
                    'name' => $signal->from->name,
                    'email' => $signal->from->email,
                    'role' => $signal->from->role,
                    'avatar_url' => $signal->from->avatar_url,
                ],
                'created_at' => $signal->created_at,
            ]),
        ]);
    }
}
