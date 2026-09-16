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
            // Kill the session so a stolen token is useless off the trusted device.
            optional($user->currentAccessToken())->delete();
            return response()->json(['message' => $reason, 'code' => 'device_locked'], 403);
        }

        return $next($request);
    }
}
