<?php

namespace App\Services;

use App\Models\TrustedDevice;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Device lock: an account with device_lock on can clock in only from a
 * trusted browser/device. The browser sends a random, persistent X-Device-Id
 * header; the first device to clock in is trusted automatically, every other
 * device is refused until the President resets the account's devices.
 *
 * (A web app cannot read MAC addresses — browsers never expose them and
 * they do not cross the router — so this is the practical equivalent.)
 */
class DeviceLockService
{
    const HEADER = 'X-Device-Id';

    public static function deviceId(Request $request): ?string
    {
        $id = trim((string) $request->header(self::HEADER, ''));
        return preg_match('/^[A-Za-z0-9_-]{16,64}$/', $id) ? $id : null;
    }

    /**
     * Null when the request may proceed, otherwise the message to refuse with.
     */
    public static function check(User $user, Request $request): ?string
    {
        if (!$user->device_lock) {
            return null;
        }

        $deviceId = self::deviceId($request);
        if (!$deviceId) {
            return 'This account is locked to a registered device. Please sign in from the app on your own device.';
        }

        $device = TrustedDevice::where('user_id', $user->id)->where('device_id', $deviceId)->first();
        if (!$device) {
            if (TrustedDevice::where('user_id', $user->id)->exists()) {
                AuditService::log('device_blocked', 'auth', "Blocked clock-in for {$user->name} from an unregistered device ({$request->ip()})", $user->id);
                return 'Clock-in is locked to another device. Ask the President to reset your device access.';
            }
            // First device wins and becomes the trusted one.
            $device = TrustedDevice::create([
                'user_id'    => $user->id,
                'device_id'  => $deviceId,
                'label'      => TrustedDevice::labelFromUserAgent($request->userAgent()),
                'ip_address' => $request->ip(),
            ]);
            AuditService::log('device_trusted', 'auth', "Device registered for {$user->name}: {$device->label}", $user->id);
        }

        // Cheap "last seen" bookkeeping, at most once a minute.
        if (!$device->last_used_at || $device->last_used_at->lt(now()->subMinute())) {
            $device->forceFill(['last_used_at' => now(), 'ip_address' => $request->ip()])->saveQuietly();
        }

        return null;
    }
}
