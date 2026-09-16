<?php

namespace App\Http\Middleware;

use App\Services\DeviceLockService;
use Closure;
use Illuminate\Http\Request;

class EnsureTrustedDevice
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if ($user && ($reason = DeviceLockService::check($user, $request))) {
            // Device lock is scoped to clock-in; keep the user signed in so
            // dashboard and other HR actions remain usable from this device.
            return response()->json(['message' => $reason, 'code' => 'device_locked'], 403);
        }

        return $next($request);
    }
}
