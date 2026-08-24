<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BreakRecord extends Model
{
    use HasFactory;

    protected $table = 'breaks';

    protected $fillable = [
        'attendance_id',
        'user_id',
        'break_start',
        'break_end',
        'duration_minutes',
        'type',
        'note',
    ];

    protected $casts = [
        'break_start' => 'datetime',
        'break_end'   => 'datetime',
    ];

    public function attendance()
    {
        return $this->belongsTo(Attendance::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function getIsActiveAttribute(): bool
    {
        return is_null($this->break_end);
    }

    public function getDurationFormattedAttribute(): string
    {
        $mins = $this->duration_minutes;
        $h = intdiv($mins, 60);
        $m = $mins % 60;
        return $h > 0 ? "{$h}h {$m}m" : "{$m}m";
    }
}
