<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run()
    {
        $this->call([
            RoleSeeder::class,
            ShiftSeeder::class,
            DepartmentSeeder::class,
            DesignationSeeder::class,
            LeaveTypeSeeder::class,
            HolidaySeeder::class,
            UserSeeder::class,
            LeaveBalanceSeeder::class,
        ]);
    }
}
