<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\CallParticipant;
use App\Models\CallSignal;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * External-guest access to a single call. Guests never receive a Sanctum token
 * and can reach nothing but these endpoints, all scoped to one call_id by a
 * tamper-proof encrypted token (Laravel Crypt = AES-256 with the app key).
 *
 *  - invite()  : a signed-in participant mints a guest link for THEIR call.
 *  - join()    : the guest opens the link, gives a name, and gets a throwaway
 *                users row (role/status = 'guest', so it never shows in any
 *                staff list) plus a guest token scoped to that call.
 *  - signal/poll/heartbeat/leave: the same polling signalling as real users,
 *                but authenticated by the guest token instead of Sanctum.
 */
class GuestCallController extends Controller
{
    private const INVITE_TTL = 3600;   // guest link valid for 1 hour
    private const SESSION_TTL = 14400; // a joined guest session lasts up to 4 hours

    /** A signed-in user who is a party to $callId mints a shareable guest link. */
    public function invite(Request $request): JsonResponse
    {
        $data = $request->validate(['call_id' => 'required|string|max:40']);
        $callId = $data['call_id'];
        $userId = $request->user()->id;

        // Only a party to this call may invite guests to it.
        $isParty = CallParticipant::where('call_id', $callId)->where('user_id', $userId)->exists()
            || CallSignal::where('call_id', $callId)
                ->where(fn ($q) => $q->where('from_user_id', $userId)->orWhere('to_user_id', $userId))
                ->exists();
        abort_unless($isParty, 403, 'You are not part of this call.');

        $token = Crypt::encryptString(json_encode([
            'k' => 'invite',
            'call_id' => $callId,
            'exp' => now()->addSeconds(self::INVITE_TTL)->timestamp,
        ]));

        return response()->json([
            'token' => $token,
            'path'  => '/guest/' . $token,   // front-end guest join route
            'expires_in' => self::INVITE_TTL,
        ]);
    }

    /** Guest opens the link and joins: creates a throwaway user + guest token. */
    public function join(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => 'required|string',
            'name'  => 'required|string|max:60',
        ]);

        $invite = $this->openToken($data['token'], 'invite');
        $callId = $invite['call_id'];

        $name = trim(preg_replace('/\s+/', ' ', $data['name'])) ?: 'Guest';

        $guest = User::create([
            'first_name' => $name,
            'last_name'  => '(guest)',
            'name'       => $name,
            'email'      => 'guest_' . Str::random(24) . '@guest.local',
            'password'   => Hash::make(Str::random(40)),
            'role'       => 'guest',
            'status'     => 'guest',
        ]);

        $guestToken = Crypt::encryptString(json_encode([
            'k' => 'session',
            'guest_id' => $guest->id,
            'call_id'  => $callId,
            'exp' => now()->addSeconds(self::SESSION_TTL)->timestamp,
        ]));

        return response()->json([
            'guest'      => ['id' => $guest->id, 'name' => $guest->name],
            'call_id'    => $callId,
            'guest_token'=> $guestToken,
        ], 201);
    }

    /** Guest posts a signalling message to a call participant. */
    public function signal(Request $request): JsonResponse
    {
        [$guestId, $callId] = $this->session($request);
        $data = $request->validate([
            'to_user_id' => 'required|exists:users,id',
            'type' => 'required|in:offer,answer,ice,hangup,reject,cancel,invite,join,leave',
            'data' => 'nullable',
        ]);
        abort_if((int) $data['to_user_id'] === $guestId, 422, 'Invalid target.');

        CallSignal::create([
            'call_id' => $callId,
            'from_user_id' => $guestId,
            'to_user_id' => (int) $data['to_user_id'],
            'type' => $data['type'],
            'data' => isset($data['data']) ? json_encode($data['data']) : null,
        ]);

        return response()->json(['ok' => true]);
    }

    /** Guest fetches (and consumes) signalling addressed to them. */
    public function poll(Request $request): JsonResponse
    {
        [$guestId, $callId] = $this->session($request);

        $signals = CallSignal::with('from:id,name,email,avatar,role')
            ->where('to_user_id', $guestId)
            ->where('call_id', $callId)
            ->whereNull('read_at')
            ->where('created_at', '>=', now()->subSeconds(60))
            ->orderBy('id')->limit(50)->get();

        if ($signals->isNotEmpty()) {
            CallSignal::whereIn('id', $signals->pluck('id'))->update(['read_at' => now()]);
        }

        return response()->json([
            'signals' => $signals->map(fn ($s) => [
                'id' => $s->id,
                'call_id' => $s->call_id,
                'type' => $s->type,
                'data' => $s->data ? json_decode($s->data, true) : null,
                'from' => [
                    'id' => $s->from->id,
                    'name' => $s->from->name,
                    'email' => $s->from->email,
                    'role' => $s->from->role,
                    'avatar_url' => $s->from->avatar_url,
                ],
                'created_at' => $s->created_at,
            ]),
        ]);
    }

    /** Guest heartbeat + roster (same 6s liveness window as real users). */
    public function heartbeat(Request $request): JsonResponse
    {
        [$guestId, $callId] = $this->session($request);
        $data = $request->validate(['kind' => 'required|in:voice,video']);

        CallParticipant::updateOrCreate(
            ['call_id' => $callId, 'user_id' => $guestId],
            ['kind' => $data['kind'], 'last_seen_at' => now()]
        );

        $roster = CallParticipant::with('user:id,name,avatar,role')
            ->where('call_id', $callId)
            ->where('user_id', '!=', $guestId)
            ->where('last_seen_at', '>=', now()->subSeconds(6))
            ->get()
            ->map(fn ($p) => [
                'id' => $p->user_id,
                'name' => optional($p->user)->name,
                'avatar_url' => optional($p->user)->avatar_url,
                'kind' => $p->kind,
            ])->values()->all();

        return response()->json(['participants' => $roster]);
    }

    /** Guest leaves: drop their participant row and delete the throwaway user. */
    public function leave(Request $request): JsonResponse
    {
        [$guestId, $callId] = $this->session($request);
        CallParticipant::where('call_id', $callId)->where('user_id', $guestId)->delete();
        // Signals cascade-delete with the user; remove the throwaway account.
        User::where('id', $guestId)->where('role', 'guest')->delete();
        return response()->json(['ok' => true]);
    }

    // ── helpers ────────────────────────────────────────────────────────────

    /** Decrypt + validate a token of the given kind; aborts on tamper/expiry. */
    private function openToken(string $token, string $kind): array
    {
        try {
            $payload = json_decode(Crypt::decryptString($token), true);
        } catch (\Throwable $e) {
            abort(403, 'Invalid or expired link.');
        }
        if (!is_array($payload) || ($payload['k'] ?? null) !== $kind) abort(403, 'Invalid link.');
        if (($payload['exp'] ?? 0) < now()->timestamp) abort(403, 'This link has expired.');
        return $payload;
    }

    /** Resolve the guest session token from the request; returns [guestId, callId]. */
    private function session(Request $request): array
    {
        $token = $request->input('guest_token') ?: $request->bearerToken() ?: '';
        $payload = $this->openToken($token, 'session');
        $guestId = (int) ($payload['guest_id'] ?? 0);
        // The guest account must still exist (not yet cleaned up / left).
        abort_unless($guestId && User::where('id', $guestId)->where('role', 'guest')->exists(), 403, 'Guest session ended.');
        return [$guestId, $payload['call_id']];
    }
}
