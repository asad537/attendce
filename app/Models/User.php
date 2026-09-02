<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use Illuminate\Support\Facades\URL;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes, HasRoles;

    protected $fillable = [
        'employee_id',
        'first_name',
        'last_name',
        'name',
        'email',
        'password',
        'phone',
        'gender',
        'avatar',
        'role',
        'allowed_ip',
        'employment_type',
        'work_mode',
        'status',
        'department_id',
        'designation_id',
        'shift_id',
        'manager_id',
        'join_date',
        'birth_date',
        'address',
        'emergency_contact',
        'annual_leave_balance',
        'sick_leave_balance',
        'casual_leave_balance',
        'tickets_last_seen_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at'    => 'datetime',
        'join_date'            => 'date',
        'birth_date'           => 'date',
        'tickets_last_seen_at' => 'datetime',
    ];

    // ─── Role Helpers ─────────────────────────────────────────────
    public function isCeo(): bool      { return $this->role === 'ceo'; }
    public function isManager(): bool  { return $this->role === 'manager'; }
    public function isTl(): bool       { return $this->role === 'tl'; }
    public function isEmployee(): bool { return $this->role === 'employee'; }

    /** True for anyone who leads a team (manager or TL) */
    public function isTeamLead(): bool { return in_array($this->role, ['manager', 'tl']); }

    // ─── Relationships ─────────────────────────────────────────────
    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function designation()
    {
        return $this->belongsTo(Designation::class);
    }

    public function shift()
    {
        return $this->belongsTo(Shift::class);
    }

    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function subordinates()
    {
        return $this->hasMany(User::class, 'manager_id');
    }

    public function attendance()
    {
        return $this->hasMany(Attendance::class);
    }

    public function todayAttendance()
    {
        return $this->hasOne(Attendance::class)->whereDate('date', today());
    }

    public function breaks()
    {
        return $this->hasMany(\App\Models\BreakRecord::class);
    }

    public function leaves()
    {
        return $this->hasMany(Leave::class);
    }

    public function leaveBalances()
    {
        return $this->hasMany(LeaveBalance::class);
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class);
    }

    public function documents()
    {
        return $this->hasMany(UserDocument::class);
    }

    // ─── Scopes ────────────────────────────────────────────────────
    public function scopeActive($query)
    {
        return $query->where('status', 'active')
            ->whereNotIn('id', function($q) {
                $q->select('user_id')
                  ->from('resignations')
                  ->where('status', 'approved')
                  ->where('last_working_day', '<=', now()->toDateString());
            });
    }

    public function scopeByRole($query, string $role)
    {
        return $query->where('role', $role);
    }

    // ─── Accessors ─────────────────────────────────────────────────

    /**
     * Full name derived from first_name + last_name.
     * Falls back to the legacy `name` column when the new columns are empty.
     */
    public function getFullNameAttribute(): string
    {
        $first = trim($this->first_name ?? '');
        $last  = trim($this->last_name ?? '');

        if ($first || $last) {
            return trim("{$first} {$last}");
        }

        return $this->name ?? '';
    }

    public function getAvatarUrlAttribute(): ?string
    {
        return $this->avatar
            ? URL::temporarySignedRoute('users.avatar', now()->addDays(7), ['user' => $this->id], false)
            : null;
    }

    public function getCurrentStatusAttribute(): string
    {
        $attendance = $this->todayAttendance()->first();
        if (!$attendance || !$attendance->check_in) {
            $wfh = \App\Models\WfhRequest::where('user_id', $this->id)
                ->where('status', 'approved')
                ->where('start_date', '<=', today())
                ->where('end_date', '>=', today())
                ->exists();
            if ($wfh) return 'work_from_home';
            return 'absent';
        }
        if ($attendance->status === 'on_leave') return 'on_leave';
        if (!$attendance->check_out) {
            $activeBreak = \App\Models\BreakRecord::where('user_id', $this->id)
                ->whereNull('break_end')
                ->first();
            return $activeBreak ? 'on_break' : 'working';
        }
        return 'checked_out';
    }
}
