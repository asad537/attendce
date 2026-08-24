<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use HasFactory;

    protected $table = 'attendance';

    protected $fillable = [
        'user_id',
        'date',
        'check_in',
        'check_out',
        'status',
        'work_mode',
        'working_minutes',
        'break_minutes',
        'overtime_minutes',
        'is_late',
        'late_minutes',
        'check_in_ip',
        'check_out_ip',
        'check_in_lat',
        'check_in_lng',
        'note',
        'approved_by',
    ];

    protected $casts = [
        'date'       => 'date',
        'check_in'   => 'datetime',
        'check_out'  => 'datetime',
        'is_late'    => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function breaks()
    {
        return $this->hasMany(BreakRecord::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeForDate($query, string $date)
    {
        return $query->whereDate('date', $date);
    }

    public function scopeForDateRange($query, string $start, string $end)
    {
        return $query->whereBetween('date', [$start, $end]);
    }

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Get working hours as decimal (e.g. 8.5)
     */
    public function getWorkingHoursAttribute(): float
    {
        return round($this->working_minutes / 60, 2);
    }

    /**
     * Is currently active (checked in but not out)
     */
    public function getIsActiveAttribute(): bool
    {
        return $this->check_in && !$this->check_out;
    }
}
