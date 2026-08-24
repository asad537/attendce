<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveBalance extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'leave_type_id',
        'year',
        'allocated',
        'used',
        'carried_forward',
    ];

    protected $casts = [
        'allocated'       => 'decimal:1',
        'used'            => 'decimal:1',
        'carried_forward' => 'decimal:1',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function leaveType()
    {
        return $this->belongsTo(LeaveType::class);
    }

    public function getRemainingAttribute(): float
    {
        return max(0, ($this->allocated + $this->carried_forward) - $this->used);
    }
}
