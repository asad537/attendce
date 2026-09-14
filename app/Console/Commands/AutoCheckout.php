<?php

namespace App\Console\Commands;

use App\Models\Attendance;
use App\Models\BreakRecord;
use App\Support\BusinessTime;
use Carbon\Carbon;
use Illuminate\Console\Command;

class AutoCheckout extends Command
{
    protected $signature = 'attendance:autocheckout {--dry-run : Only report who would be checked out}';

    protected $description = 'Check out users who forgot to, once their shift (plus its overtime window) is over.';

    /** Wall-clock shift end for people without a shift. */
    const DEFAULT_END_TIME = '18:00:00';

    /** How long after shift end we wait before assuming the person forgot (hours). */
    const DEFAULT_OVERTIME_HOURS = 2;

    public function handle()
    {
        $now = Carbon::now();

        // Look at today and yesterday so night shifts and late runs are covered.
        $attendances = Attendance::with('user.shift')
            ->whereDate('date', '>=', today()->subDay()->toDateString())
            ->whereNotNull('check_in')
            ->whereNull('check_out')
            ->get();

        $done = 0;
        foreach ($attendances as $attendance) {
            $user = $attendance->user;
            if (!$user) {
                continue;
            }
            $shift = $user->shift;
            $date = Carbon::parse($attendance->date)->toDateString();
            $checkIn = Carbon::parse($attendance->check_in);

            // Shift end on the company's wall clock, converted to UTC.
            $checkoutTime = BusinessTime::at($date, $shift ? $shift->end_time : self::DEFAULT_END_TIME);
            if ($checkoutTime->lt($checkIn)) {
                // Night shift ends the next day; anything else means they
                // checked in after the shift ended — close it at check-in.
                if ($shift && $shift->is_night_shift) {
                    $checkoutTime->addDay();
                } else {
                    $checkoutTime = $checkIn->copy();
                }
            }

            // Give people their overtime window before deciding they forgot.
            $overtimeHours = $shift && $shift->max_overtime_hours !== null
                ? (float) $shift->max_overtime_hours
                : self::DEFAULT_OVERTIME_HOURS;
            $cutoff = $checkoutTime->copy()->addMinutes((int) round($overtimeHours * 60));
            if ($now->lt($cutoff)) {
                continue;
            }

            if ($this->option('dry-run')) {
                $this->line("Would check out user {$user->id} ({$user->name}) at {$checkoutTime} (cutoff {$cutoff})");
                $done++;
                continue;
            }

            // End any active break first.
            $activeBreak = BreakRecord::where('attendance_id', $attendance->id)
                ->whereNull('break_end')
                ->first();
            if ($activeBreak) {
                $breakStart = Carbon::parse($activeBreak->break_start);
                $breakEnd = $checkoutTime->gt($breakStart) ? $checkoutTime : $breakStart;
                $duration = $breakStart->diffInMinutes($breakEnd);
                $activeBreak->update([
                    'break_end' => $breakEnd,
                    'duration_minutes' => $duration,
                ]);
                $attendance->increment('break_minutes', $duration);
                $attendance->refresh();
            }

            $totalMinutes = $checkIn->diffInMinutes($checkoutTime);
            $workMinutes = max(0, $totalMinutes - (int) $attendance->break_minutes);

            $attendance->update([
                'check_out' => $checkoutTime,
                'working_minutes' => $workMinutes,
                'overtime_minutes' => 0, // Auto checkout assumes no overtime
                'note' => trim(($attendance->note ? $attendance->note . ' ' : '') . '(Auto checked out at shift end)'),
            ]);

            $this->info("Auto checked out user {$user->id} ({$user->name}) at {$checkoutTime}");
            $done++;
        }

        $this->info("{$done} attendance record(s) " . ($this->option('dry-run') ? 'would be' : 'were') . ' auto checked out.');

        return 0;
    }
}
