<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CallParticipant extends Model
{
    protected $fillable = ['call_id', 'user_id', 'kind', 'last_seen_at'];

    protected $casts = ['last_seen_at' => 'datetime'];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
