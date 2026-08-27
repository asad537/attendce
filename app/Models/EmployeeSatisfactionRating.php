<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeSatisfactionRating extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'rated_by_id',
        'compensation_benefits',
        'work_culture',
        'work_life_balance',
        'career_growth',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function ratedBy()
    {
        return $this->belongsTo(User::class, 'rated_by_id');
    }
}
