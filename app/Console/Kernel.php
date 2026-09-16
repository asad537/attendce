<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     *
     * @param  \Illuminate\Console\Scheduling\Schedule  $schedule
     * @return void
     */
    protected function schedule(Schedule $schedule)
    {
        $schedule->command('attendance:reminders')->everyMinute();
        $schedule->command('notifications:birthdays')->dailyAt('09:00')->timezone(config('app.business_timezone'));
        // Runs often so people are checked out shortly after their shift's
        // overtime window closes, instead of once a day at 23:59 UTC (5 AM PKT).
        $schedule->command('attendance:autocheckout')->everyFiveMinutes()->withoutOverlapping();
        $schedule->command('tickets:check-deadlines')->everyFiveMinutes()->withoutOverlapping();
        $schedule->command('notifications:prune')->daily()->timezone(config('app.business_timezone', 'Asia/Karachi'));
    }

    /**
     * Register the commands for the application.
     *
     * @return void
     */
    protected function commands()
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
