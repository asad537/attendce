<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Attendance;
use App\Models\Notification;
use App\Support\BusinessTime;
use Carbon\Carbon;

class SendAttendanceReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'attendance:reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send automatic check-in and check-out reminders to users based on their shift timing.';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $now = BusinessTime::now();
        $today = today()->toDateString();

        $users = User::with('shift')->where('status', 'active')->get();
        $count = 0;

        foreach ($users as $user) {
            if (!$user->shift) continue;

            $shiftStart = Carbon::parse($user->shift->start_time);
            $shiftEnd = Carbon::parse($user->shift->end_time);
            
            // Adjust dates for comparison if needed
            $startDiff = $now->diffInMinutes(BusinessTime::at($now->toDateString(), $user->shift->start_time), false);
            if ($startDiff < 0) {
                // Shift started earlier today, maybe check next day
                $startDiff = $now->diffInMinutes(BusinessTime::at($now->copy()->addDay()->toDateString(), $user->shift->start_time), false);
            }
            
            $endDiff = $now->diffInMinutes(BusinessTime::at($now->toDateString(), $user->shift->end_time), false);
            if ($endDiff < 0) {
                // Shift ended earlier today
                $endDiff = $now->diffInMinutes(BusinessTime::at($now->copy()->addDay()->toDateString(), $user->shift->end_time), false);
            }

            // 1. Check-In Reminder (12 to 16 mins before start time)
            if ($startDiff > 0 && $startDiff <= 16) {
                $cacheKey = "reminder_checkin_{$user->id}_{$today}";
                if (!\Cache::has($cacheKey)) {
                    // Check if they already checked in today
                    $attendance = Attendance::where('user_id', $user->id)
                        ->whereDate('date', $today)
                        ->whereNotNull('check_in')
                        ->first();

                    if (!$attendance) {
                        \App\Services\NotificationService::send(
                            $user,
                            'Upcoming Shift Reminder',
                            'Don\'t forget to check in! Your shift starts soon at ' . $shiftStart->format('h:i A') . '.',
                            'info',
                            '/employee/dashboard'
                        );
                        \Cache::put($cacheKey, true, now()->addHours(12));
                        $count++;
                    }
                }
            }

            // 2. Check-Out Reminder (12 to 16 mins before end time)
            if ($endDiff > 0 && $endDiff <= 16) {
                $cacheKey = "reminder_checkout_{$user->id}_{$today}";
                if (!\Cache::has($cacheKey)) {
                    // Check if they are currently checked in, but NOT checked out
                    $attendance = Attendance::where('user_id', $user->id)
                        ->whereNotNull('check_in')
                        ->whereNull('check_out')
                        ->latest('check_in')
                        ->first();

                    if ($attendance) {
                        \App\Services\NotificationService::send(
                            $user,
                            'Shift Ending Soon',
                            'Your shift ends soon at ' . $shiftEnd->format('h:i A') . '. Don\'t forget to check out.',
                            'info',
                            '/employee/dashboard'
                        );
                        \Cache::put($cacheKey, true, now()->addHours(12));
                        $count++;
                    }
                }
            }
        }

        $this->info("Successfully sent {$count} attendance reminders.");
        return 0;
    }
}
