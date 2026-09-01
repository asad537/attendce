<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
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
     * Post a signalling message (offer / answer / ice / hangup / reject / cancel)
     * to the other participant. Signalling rides on top of normal polling so no
     * WebSocket server is required.
     */
    public function signal(Request $request): JsonResponse
    {
        $data = $request->validate([
            'call_id' => 'required|string|max:40',
            'to_user_id' => 'required|exists:users,id',
            'type' => 'required|in:offer,answer,ice,hangup,reject,cancel',
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
