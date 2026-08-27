<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CallSignal extends Model
{
    protected $fillable = ['call_id', 'from_user_id', 'to_user_id', 'type', 'data', 'read_at'];

    protected $casts = ['read_at' => 'datetime'];

    public function from() { return $this->belongsTo(User::class, 'from_user_id'); }
    public function to() { return $this->belongsTo(User::class, 'to_user_id'); }
}
