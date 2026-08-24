<?php

namespace App\Services;

use App\Events\AttendanceUpdated;
use App\Models\Attendance;
use App\Models\BreakRecord;
use App\Models\Holiday;
use App\Models\Leave;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AttendanceService
{
    /**
     * Check in a user for today
     */
    public function checkIn(User $user, array $data): Attendance
    {
        $today = today()->toDateString();
        $now = now();
        
        // Prevent check in after working hours
        if ($user->shift) {
            $shiftEnd = \Carbon\Carbon::parse($today . ' ' . $user->shift->end_time);
            if ($now->greaterThanOrEqualTo($shiftEnd)) {
                throw new \Exception('You cannot check in after your working hours have ended.');
            }
        }

        // Already checked in today?
        $existing = Attendance::where('user_id', $user->id)->whereDate('date', $today)->first();
        if ($existing && $existing->check_in) {
            if ($existing->check_out) {
                // Allow "resuming" shift if they accidentally checked out
                $existing->check_out = null;
                $existing->working_minutes = 0; // Will be recalculated upon the next checkout
                $existing->status = 'present';
                $existing->save();
                return $existing;
            } else {
                throw new \Exception('You have already checked in today.');
            }
        }

        $approvedLeave = Leave::where('user_id', $user->id)
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->exists();
        if ($approvedLeave) {
            throw new \Exception('You cannot check in while you are on approved leave.');
        }

        $now       = Carbon::now();
        $shift     = $user->shift;
        $isLate    = false;
        $lateMinutes = 0;

        if ($shift) {
            $shiftStart  = Carbon::parse($today . ' ' . $shift->start_time);
            $graceEnd    = $shiftStart->copy()->addMinutes($shift->grace_minutes);
            if ($now->gt($graceEnd)) {
                $isLate      = true;
                $lateMinutes = $shiftStart->diffInMinutes($now);
            }
        }

        $status = $isLate ? 'late' : 'present';
        if (!empty($data['work_mode']) && $data['work_mode'] === 'remote') {
            $status = 'work_from_home';
        }

        $attendance = Attendance::updateOrCreate(
            ['user_id' => $user->id, 'date' => $today],
            [
                'check_in'     => $now,
                'status'       => $status,
                'work_mode'    => $data['work_mode'] ?? 'office',
                'is_late'      => $isLate,
                'late_minutes' => $lateMinutes,
                'check_in_ip'  => request()->ip(),
                'check_in_lat' => $data['check_in_lat'] ?? null,
                'check_in_lng' => $data['check_in_lng'] ?? null,
                'note'         => $data['note'] ?? null,
            ]
        );

        AuditService::log('check_in', 'attendance', "User {$user->name} checked in", $user->id, Attendance::class, $attendance->id);

        // Broadcast real-time status update
        try {
            broadcast(new AttendanceUpdated($user, $attendance))->toOthers();
        } catch (\Exception $e) {}

        if ($isLate) {
            NotificationService::send(
                $user,
                'Late Check-in',
                "You checked in {$lateMinutes} minutes late today.",
                'warning'
            );
        }

        return $attendance;
    }

    /**
     * Check out a user for today
     */
    public function checkOut(User $user, array $data = []): Attendance
    {
        $attendance = Attendance::where('user_id', $user->id)
            ->whereDate('date', today())
            ->whereNotNull('check_in')
            ->whereNull('check_out')
            ->firstOrFail();

        // End any active break first
        $activeBreak = BreakRecord::where('attendance_id', $attendance->id)
            ->whereNull('break_end')
            ->first();
        if ($activeBreak) {
            $this->endBreak($user, $activeBreak);
        }

        // Reload to get updated break_minutes
        $attendance->refresh();

        $now           = Carbon::now();
        $checkIn       = Carbon::parse($attendance->check_in);
        $totalMinutes  = $checkIn->diffInMinutes($now);
        $workMinutes   = max(0, $totalMinutes - $attendance->break_minutes);

        // Overtime calculation
        $overtimeMinutes = 0;
        $shift = $user->shift;
        if ($shift) {
            $shiftEnd      = Carbon::parse(today()->toDateString() . ' ' . $shift->end_time);
            if ($shift->is_night_shift && $shiftEnd->lt($checkIn)) {
                $shiftEnd->addDay();
            }
            $shiftDuration = Carbon::parse(today()->toDateString() . ' ' . $shift->start_time)
                ->diffInMinutes($shiftEnd);
            if ($workMinutes > $shiftDuration) {
                $overtimeMinutes = $workMinutes - $shiftDuration;
            }
        }

        $attendance->update([
            'check_out'       => $now,
            'working_minutes' => $workMinutes,
            'overtime_minutes'=> $overtimeMinutes,
            'note'            => $data['note'] ?? $attendance->note,
        ]);

        AuditService::log('check_out', 'attendance', "User {$user->name} checked out", $user->id, Attendance::class, $attendance->id);

        try {
            broadcast(new AttendanceUpdated($user, $attendance))->toOthers();
        } catch (\Exception $e) {}

        return $attendance;
    }

    /**
     * Start a break
     */
    public function startBreak(User $user, string $type = 'short', ?string $note = null): BreakRecord
    {
        $attendance = Attendance::where('user_id', $user->id)
            ->whereDate('date', today())
            ->whereNotNull('check_in')
            ->whereNull('check_out')
            ->firstOrFail();

        // Block if already on break
        $active = BreakRecord::where('attendance_id', $attendance->id)->whereNull('break_end')->first();
        if ($active) {
            throw new \Exception('You are already on a break.');
        }

        $break = BreakRecord::create([
            'attendance_id' => $attendance->id,
            'user_id'       => $user->id,
            'break_start'   => Carbon::now(),
            'type'          => $type,
            'note'          => $note,
        ]);

        try {
            broadcast(new AttendanceUpdated($user, $attendance))->toOthers();
        } catch (\Exception $e) {}

        return $break;
    }

    /**
     * End a break
     */
    public function endBreak(User $user, ?BreakRecord $break = null): BreakRecord
    {
        if (!$break) {
            $attendance = Attendance::where('user_id', $user->id)
                ->whereDate('date', today())
                ->firstOrFail();
            $break = BreakRecord::where('attendance_id', $attendance->id)
                ->whereNull('break_end')
                ->firstOrFail();
        }

        $now       = Carbon::now();
        $duration  = Carbon::parse($break->break_start)->diffInMinutes($now);

        $break->update([
            'break_end'        => $now,
            'duration_minutes' => $duration,
        ]);

        // Update total break_minutes on attendance
        $break->attendance->increment('break_minutes', $duration);

        try {
            broadcast(new AttendanceUpdated($user, $break->attendance))->toOthers();
        } catch (\Exception $e) {}

        return $break;
    }

    /**
     * Mark absent for all users who haven't checked in today (run via scheduler)
     */
    public function markAbsent(): int
    {
        $today   = today()->toDateString();
        $isHoliday = Holiday::isHoliday(today());
        if ($isHoliday) return 0;

        $users = User::active()->whereDoesntHave('attendance', function ($q) use ($today) {
            $q->whereDate('date', $today);
        })->get();

        $count = 0;
        foreach ($users as $user) {
            Attendance::create([
                'user_id' => $user->id,
                'date'    => $today,
                'status'  => 'absent',
            ]);
            $count++;
        }

        return $count;
    }
}
