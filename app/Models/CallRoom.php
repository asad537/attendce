<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class CallRoom extends Model
{
    protected $primaryKey = 'call_id';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $fillable = ['call_id', 'host_id', 'ended_at'];
    protected $casts = ['ended_at' => 'datetime'];
    public static function ensureActive(string $callId): void {
        abort_if(static::whereKey($callId)->whereNotNull('ended_at')->exists(), 410, 'The host ended this call.');
    }
}
