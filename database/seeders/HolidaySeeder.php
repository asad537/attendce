<?php

namespace Database\Seeders;

use App\Models\Holiday;
use Illuminate\Database\Seeder;

class HolidaySeeder extends Seeder
{
    public function run()
    {
        $year = date('Y');

        $holidays = [
            ['name' => "New Year's Day",        'date' => "{$year}-01-01", 'type' => 'public', 'is_recurring' => true],
            ['name' => 'Labour Day',             'date' => "{$year}-05-01", 'type' => 'public', 'is_recurring' => true],
            ['name' => 'Independence Day',       'date' => "{$year}-08-31", 'type' => 'public', 'is_recurring' => true],
            ['name' => 'Christmas Day',          'date' => "{$year}-12-25", 'type' => 'public', 'is_recurring' => true],
            ['name' => 'Boxing Day',             'date' => "{$year}-12-26", 'type' => 'public', 'is_recurring' => true],
            ['name' => 'Year End Holiday',       'date' => "{$year}-12-31", 'type' => 'optional'],
        ];

        foreach ($holidays as $h) {
            Holiday::firstOrCreate(['name' => $h['name'], 'date' => $h['date']], $h);
        }
    }
}
