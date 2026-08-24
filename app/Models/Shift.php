<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Shift extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'start_time',
        'end_time',
        'grace_minutes',
        'max_overtime_hours',
        'is_night_shift',
        'is_active',
    ];

    protected $casts = [
        'is_night_shift' => 'boolean',
        'is_active'      => 'boolean',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Get shift duration in hours
     */
    public function getDurationHoursAttribute(): float
    {
        $start = \Carbon\Carbon::parse($this->start_time);
        $end   = \Carbon\Carbon::parse($this->end_time);
        if ($end->lt($start)) {
            $end->addDay(); // night shift
        }
        return round($start->diffInMinutes($end) / 60, 2);
    }
}
