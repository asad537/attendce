<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CalendarEvent extends Model
{
    protected $fillable = ['created_by', 'title', 'event_date', 'event_time', 'type', 'location', 'note'];
    protected $casts = ['event_date' => 'date'];
    public function creator() { return $this->belongsTo(User::class, 'created_by'); }
}
