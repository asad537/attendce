<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $fillable = ['name', 'description', 'status', 'start_date', 'due_date', 'project_lead_id', 'created_by'];
    protected $casts = ['start_date' => 'date', 'due_date' => 'date'];

    public function projectLead() { return $this->belongsTo(User::class, 'project_lead_id'); }
    public function creator() { return $this->belongsTo(User::class, 'created_by'); }
    public function tickets() { return $this->hasMany(ProjectTicket::class); }
}
