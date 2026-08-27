<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Attendance;
use App\Models\BreakRecord;
use Carbon\Carbon;
use App\Services\AttendanceService;

class AutoCheckout extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'attendance:autocheckout';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically checkout users who forgot to checkout at the end of their shift.';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle(AttendanceService $attendanceService)
    {
        $today = today()->toDateString();
        
        // Find all attendances for today where user hasn't checked out
        $attendances = Attendance::with('user.shift')
            ->whereDate('date', $today)
            ->whereNotNull('check_in')
            ->whereNull('check_out')
            ->get();

        foreach ($attendances as $attendance) {
            $user = $attendance->user;
            $shift = $user->shift;

            // Default auto-checkout time is 21:00:00 (9:00 PM) if no shift is defined
            $checkoutTimeStr = $shift ? $shift->end_time : '21:00:00';
            $checkoutTime = Carbon::parse($today . ' ' . $checkoutTimeStr);

            // If the checkout time is somehow before check in, adjust it
            $checkIn = Carbon::parse($attendance->check_in);
            if ($checkoutTime->lt($checkIn)) {
                if ($shift && $shift->is_night_shift) {
                    $checkoutTime->addDay();
                } else {
                    $checkoutTime = $checkIn->copy();
                }
            }

            // End any active break first
            $activeBreak = BreakRecord::where('attendance_id', $attendance->id)
                ->whereNull('break_end')
                ->first();
            
            if ($activeBreak) {
                // End the break at the checkout time if it started before it, else end it when it started
                $breakStart = Carbon::parse($activeBreak->break_start);
                $breakEnd = $checkoutTime->gt($breakStart) ? $checkoutTime : $breakStart;
                
                $duration = $breakStart->diffInMinutes($breakEnd);
                $activeBreak->update([
                    'break_end' => $breakEnd,
                    'duration_minutes' => $duration
                ]);
                $attendance->increment('break_minutes', $duration);
                $attendance->refresh();
            }

            $totalMinutes = $checkIn->diffInMinutes($checkoutTime);
            $workMinutes = max(0, $totalMinutes - $attendance->break_minutes);

            $attendance->update([
                'check_out' => $checkoutTime,
                'working_minutes' => $workMinutes,
                'overtime_minutes' => 0, // Auto checkout assumes no overtime
                'note' => ltrim($attendance->note . ' (Auto checked out at shift end)'),
            ]);
            
            $this->info("Auto checked out user {$user->id} at {$checkoutTime}");
        }

        return 0;
    }
}
