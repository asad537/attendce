<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Department extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'description',
        'manager_id',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function employees()
    {
        return $this->hasMany(User::class);
    }

    public function designations()
    {
        return $this->hasMany(Designation::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function getEmployeeCountAttribute(): int
    {
        return $this->employees()->active()->count();
    }
}
