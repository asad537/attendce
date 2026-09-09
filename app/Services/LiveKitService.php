<?php

namespace App\Services;

/**
 * Mints LiveKit access tokens (JWT, HS256) for a single room. Hand-rolled so
 * it runs on PHP 7.4 with no extra dependency — the payload is the documented
 * LiveKit "video grant" shape.
 */
class LiveKitService
{
    public static function url(): string
    {
        return (string) config('services.livekit.url');
    }

    public static function configured(): bool
    {
        return (bool) (config('services.livekit.url') && config('services.livekit.key') && config('services.livekit.secret'));
    }

    /**
     * @param string $identity  unique per participant (e.g. "u12", "g34")
     * @param string $name      display name shown to others
     * @param string $room      room name (we use the call_id)
     * @param int    $ttl       seconds the token is valid to JOIN with
     */
    public static function token(string $identity, string $name, string $room, int $ttl = 6 * 3600): string
    {
        $key = (string) config('services.livekit.key');
        $secret = (string) config('services.livekit.secret');
        $now = time();

        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $payload = [
            'iss' => $key,
            'sub' => $identity,
            'name' => $name,
            'nbf' => $now - 10,
            'iat' => $now,
            'exp' => $now + $ttl,
            'video' => [
                'room' => $room,
                'roomJoin' => true,
                'canPublish' => true,
                'canSubscribe' => true,
                'canPublishData' => true,
            ],
        ];

        $segments = [self::b64(json_encode($header)), self::b64(json_encode($payload))];
        $signature = hash_hmac('sha256', implode('.', $segments), $secret, true);
        $segments[] = self::b64($signature);

        return implode('.', $segments);
    }

    private static function b64(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
