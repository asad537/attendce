<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Resignation extends Model
{
    protected $fillable = ['user_id', 'last_working_day', 'reason', 'status', 'reviewed_by', 'reviewed_at', 'remarks'];

    protected $casts = ['last_working_day' => 'date', 'reviewed_at' => 'datetime'];

    public function user() { return $this->belongsTo(User::class, 'user_id'); }
    public function reviewer() { return $this->belongsTo(User::class, 'reviewed_by'); }
}
