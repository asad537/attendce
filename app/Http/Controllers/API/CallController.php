<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\CallSignal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CallController extends Controller
{
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
