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

    // Multi-lead / multi-member support via the project_user pivot.
    public function leads() { return $this->belongsToMany(User::class, 'project_user')->wherePivot('role', 'lead')->withTimestamps(); }
    public function members() { return $this->belongsToMany(User::class, 'project_user')->wherePivot('role', 'member')->withTimestamps(); }
    // Everyone attached to the project (leads + members) — the assignable team.
    public function team() { return $this->belongsToMany(User::class, 'project_user')->withPivot('role')->withTimestamps(); }

    public function isLead($userId): bool
    {
        return $this->leads()->whereKey($userId)->exists();
    }

    // The set of user ids that make up the project team (deduped leads + members).
    public function teamUserIds(): array
    {
        return $this->team()->pluck('users.id')->unique()->values()->all();
    }
}
