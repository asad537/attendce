<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\TrimStrings as Middleware;
use Illuminate\Support\Str;

class TrimStrings extends Middleware
{
    /**
     * The names of the attributes that should not be trimmed.
     *
     * Matched against the final segment of the (possibly nested) input key,
     * so 'sdp' also protects nested payloads such as 'data.sdp.sdp'.
     *
     * @var array<int, string>
     */
    protected $except = [
        'current_password',
        'password',
        'password_confirmation',
        // WebRTC SDP payloads must keep their exact whitespace, especially the
        // trailing newline — trimming it corrupts the final SDP line.
        'sdp',
    ];

    /**
     * Transform the given value, skipping any key whose final segment is
     * exempt (framework's parent only matches the full dotted key).
     *
     * @param  string  $key
     * @param  mixed  $value
     * @return mixed
     */
    protected function transform($key, $value)
    {
        if (in_array(Str::afterLast($key, '.'), $this->except, true)) {
            return $value;
        }

        return parent::transform($key, $value);
    }
}
