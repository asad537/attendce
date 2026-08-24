<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureActiveUser
{
    public function handle(Request $request, Closure $next)
    {
        if (!$request->user() || $request->user()->status !== 'active') {
            optional($request->user())->tokens()->delete();
            return response()->json(['message' => 'Your account is not active.'], 403);
        }

        return $next($request);
    }
}
