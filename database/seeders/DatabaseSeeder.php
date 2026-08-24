<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run()
    {
        $seeders = [
            RoleSeeder::class,
            ShiftSeeder::class,
            DepartmentSeeder::class,
            DesignationSeeder::class,
            LeaveTypeSeeder::class,
            HolidaySeeder::class,
        ];

        // Demo accounts have documented passwords and must never be created in production.
        if (app()->environment(['local', 'testing'])) {
            $seeders[] = UserSeeder::class;
            $seeders[] = LeaveBalanceSeeder::class;
        }

        $this->call($seeders);
    }
}
