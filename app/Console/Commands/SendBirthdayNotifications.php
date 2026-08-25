<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Services\NotificationService;
use Carbon\Carbon;

class SendBirthdayNotifications extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'notifications:birthdays';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send birthday countdown notifications to all users';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $today = Carbon::today();
        
        // Define countdown intervals (in days): countdown starting from 7 days
        $intervals = [7, 6, 5, 4, 3, 2, 1, 0];
        
        $usersWithBirthdays = User::active()->whereNotNull('birth_date')->get();
        $allActiveUsers = User::active()->get();

        foreach ($usersWithBirthdays as $birthdayUser) {
            $dob = Carbon::parse($birthdayUser->birth_date);
            $birthdayThisYear = $dob->copy()->year($today->year);
            
            if ($birthdayThisYear->isPast() && !$birthdayThisYear->isToday()) {
                $birthdayThisYear->addYear();
            }

            $daysUntil = $today->diffInDays($birthdayThisYear, false);
            
            if (in_array($daysUntil, $intervals)) {
                $dateFormatted = $birthdayThisYear->format('M jS');
                
                if ($daysUntil === 0) {
                    $title = "🎂 Happy Birthday!";
                    $message = "Today is {$birthdayUser->name}'s birthday! ({$dateFormatted}) 🎂";
                } elseif ($daysUntil === 1) {
                    $title = "🎂 Upcoming Birthday";
                    $message = "Tomorrow is {$birthdayUser->name}'s birthday! ({$dateFormatted}) 🎂";
                } else {
                    $title = "🎂 Upcoming Birthday";
                    $message = "{$birthdayUser->name}'s birthday is coming up in {$daysUntil} days! ({$dateFormatted}) 🎂";
                }

                foreach ($allActiveUsers as $user) {
                    NotificationService::send($user, $title, $message, 'info', null, $birthdayUser);
                }
            }
        }

        return 0;
    }
}
