<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrustedDevice extends Model
{
    protected $fillable = ['user_id', 'device_id', 'label', 'ip_address', 'last_used_at'];
    protected $casts = ['last_used_at' => 'datetime'];

    public function user() { return $this->belongsTo(User::class); }

    /** Short "Chrome on Windows" style label from a user agent string. */
    public static function labelFromUserAgent(?string $ua): string
    {
        $ua = (string) $ua;
        $browser = 'Browser';
        foreach (['Edg' => 'Edge', 'OPR' => 'Opera', 'Chrome' => 'Chrome', 'Firefox' => 'Firefox', 'Safari' => 'Safari'] as $needle => $name) {
            if (stripos($ua, $needle) !== false) { $browser = $name; break; }
        }
        $os = 'device';
        foreach (['Windows' => 'Windows', 'Android' => 'Android', 'iPhone' => 'iPhone', 'iPad' => 'iPad', 'Mac OS' => 'Mac', 'Linux' => 'Linux'] as $needle => $name) {
            if (stripos($ua, $needle) !== false) { $os = $name; break; }
        }
        return "{$browser} on {$os}";
    }
}
