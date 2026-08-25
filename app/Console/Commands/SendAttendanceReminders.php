<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Attendance;
use App\Models\Notification;
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
        $now = Carbon::now();
        $targetTime = $now->copy()->addMinutes(15)->format('H:i');
        $today = $now->toDateString();

        $users = User::with('shift')->where('status', 'active')->get();
        $count = 0;

        foreach ($users as $user) {
            if (!$user->shift) continue;

            $shiftStart = Carbon::parse($user->shift->start_time)->format('H:i');
            $shiftEnd = Carbon::parse($user->shift->end_time)->format('H:i');

            // 1. Check-In Reminder (15 mins before start time)
            if ($targetTime === $shiftStart) {
                // Check if they already checked in today
                $attendance = Attendance::where('user_id', $user->id)
                    ->whereDate('date', $today)
                    ->whereNotNull('check_in')
                    ->first();

                if (!$attendance) {
                    \App\Services\NotificationService::send(
                        $user,
                        'Upcoming Shift Reminder',
                        'Don\'t forget to check in! Your shift starts in 15 minutes at ' . Carbon::parse($shiftStart)->format('h:i A') . '.',
                        'info',
                        '/employee/dashboard'
                    );
                    $count++;
                }
            }

            // 2. Check-Out Reminder (15 mins before end time)
            if ($targetTime === $shiftEnd) {
                // Check if they are currently checked in, but NOT checked out
                $attendance = Attendance::where('user_id', $user->id)
                    ->whereDate('date', $today)
                    ->whereNotNull('check_in')
                    ->whereNull('check_out')
                    ->first();

                if ($attendance) {
                    \App\Services\NotificationService::send(
                        $user,
                        'Shift Ending Soon',
                        'Your shift ends in 15 minutes at ' . Carbon::parse($shiftEnd)->format('h:i A') . '. Don\'t forget to check out.',
                        'info',
                        '/employee/dashboard'
                    );
                    $count++;
                }
            }
        }

        $this->info("Successfully sent {$count} attendance reminders.");
        return 0;
    }
}
