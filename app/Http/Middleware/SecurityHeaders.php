<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SecurityHeaders
{
    /**
     * Add hardening response headers to every response. This API is consumed by
     * a separate SPA, so these headers mainly protect direct responses
     * (attachments, avatars, error pages) and provide defense-in-depth.
     */
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        $headers = [
            'X-Content-Type-Options' => 'nosniff',        // no MIME sniffing (attachments)
            'X-Frame-Options' => 'DENY',                  // clickjacking
            'Referrer-Policy' => 'no-referrer',
            'X-XSS-Protection' => '0',                     // rely on CSP, not the legacy auditor
            'Content-Security-Policy' => "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
        ];
        if ($request->secure()) {
            $headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
        }
        foreach ($headers as $key => $value) {
            if (! $response->headers->has($key)) {
                $response->headers->set($key, $value);
            }
        }

        return $response;
    }
}
