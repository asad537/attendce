<?php

namespace Database\Seeders;

use App\Models\Shift;
use Illuminate\Database\Seeder;

class ShiftSeeder extends Seeder
{
    public function run()
    {
        $shifts = [
            ['name' => 'Morning Shift',   'start_time' => '08:00:00', 'end_time' => '17:00:00', 'grace_minutes' => 15],
            ['name' => 'Afternoon Shift', 'start_time' => '12:00:00', 'end_time' => '21:00:00', 'grace_minutes' => 15],
            ['name' => 'Night Shift',     'start_time' => '22:00:00', 'end_time' => '06:00:00', 'grace_minutes' => 15, 'is_night_shift' => true],
            ['name' => 'General Shift',   'start_time' => '09:00:00', 'end_time' => '18:00:00', 'grace_minutes' => 10],
        ];

        foreach ($shifts as $shift) {
            Shift::firstOrCreate(['name' => $shift['name']], $shift);
        }
    }
}
