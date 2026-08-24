<?php

namespace Database\Seeders;

use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Models\User;
use Illuminate\Database\Seeder;

class LeaveBalanceSeeder extends Seeder
{
    public function run()
    {
        $year      = (int) date('Y');
        $leaveTypes = LeaveType::active()->get();
        $users      = User::active()->get();

        foreach ($users as $user) {
            foreach ($leaveTypes as $type) {
                LeaveBalance::firstOrCreate(
                    ['user_id' => $user->id, 'leave_type_id' => $type->id, 'year' => $year],
                    [
                        'allocated'       => $type->days_allowed_per_year,
                        'used'            => 0,
                        'carried_forward' => 0,
                    ]
                );
            }
        }
    }
}
