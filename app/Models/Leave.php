<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Leave extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'leave_type_id',
        'start_date',
        'end_date',
        'days_requested',
        'is_half_day',
        'half_day_period',
        'reason',
        'attachment',
        'status',
        'reviewed_by_manager',
        'manager_reviewed_at',
        'manager_remarks',
        'reviewed_by_ceo',
        'ceo_reviewed_at',
        'ceo_remarks',
    ];

    protected $casts = [
        'start_date'          => 'date',
        'end_date'            => 'date',
        'days_requested'      => 'decimal:1',
        'is_half_day'         => 'boolean',
        'manager_reviewed_at' => 'datetime',
        'ceo_reviewed_at'     => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function leaveType()
    {
        return $this->belongsTo(LeaveType::class);
    }

    public function reviewedByManager()
    {
        return $this->belongsTo(User::class, 'reviewed_by_manager');
    }

    public function reviewedByCeo()
    {
        return $this->belongsTo(User::class, 'reviewed_by_ceo');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function getStatusLabelAttribute(): string
    {
        $labels = [
            'pending'          => 'Pending',
            'manager_approved' => 'Manager Approved',
            'manager_rejected' => 'Manager Rejected',
            'approved'         => 'Approved',
            'rejected'         => 'Rejected',
            'cancelled'        => 'Cancelled',
        ];
        return isset($labels[$this->status]) ? $labels[$this->status] : ucfirst($this->status);
    }

    public function getCanBeCancelledAttribute(): bool
    {
        return in_array($this->status, ['pending', 'manager_approved'])
            && $this->start_date->isFuture();
    }
}
