<?php

namespace App\Support;

use Carbon\Carbon;

/**
 * Shift times ("09:00", "18:00") are wall-clock times in the company's local
 * timezone, while the application itself stores and compares timestamps in
 * UTC. Every comparison between "now" and a shift time has to go through
 * here, otherwise it is off by the UTC offset (5 hours for Pakistan).
 */
class BusinessTime
{
    public static function tz(): string
    {
        return (string) config('app.business_timezone', 'Asia/Karachi');
    }

    /** Current time as the company sees it on the wall clock. */
    public static function now(): Carbon
    {
        return Carbon::now(self::tz());
    }

    /**
     * A wall-clock time on a given date, converted to the app timezone so it
     * can be compared with now() and stored like every other timestamp.
     */
    public static function at(string $date, string $time): Carbon
    {
        return Carbon::parse(substr($date, 0, 10) . ' ' . $time, self::tz())
            ->setTimezone(config('app.timezone', 'UTC'));
    }
}
