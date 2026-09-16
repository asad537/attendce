<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GroupChat extends Model
{
    protected $fillable = ['created_by', 'name', 'description'];

    public function members() { return $this->belongsToMany(User::class, 'group_chat_user'); }
    public function creator() { return $this->belongsTo(User::class, 'created_by'); }
    public function messages() { return $this->hasMany(Message::class, 'conversation_id'); }
}
