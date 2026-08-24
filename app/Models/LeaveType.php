<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveType extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'days_allowed_per_year',
        'is_paid',
        'requires_approval',
        'carry_forward',
        'max_carry_forward_days',
        'allow_half_day',
        'color',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_paid'           => 'boolean',
        'requires_approval' => 'boolean',
        'carry_forward'     => 'boolean',
        'allow_half_day'    => 'boolean',
        'is_active'         => 'boolean',
    ];

    public function leaves()
    {
        return $this->hasMany(Leave::class);
    }

    public function balances()
    {
        return $this->hasMany(LeaveBalance::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
