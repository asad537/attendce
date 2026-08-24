<?php

namespace Database\Seeders;

use App\Models\LeaveType;
use Illuminate\Database\Seeder;

class LeaveTypeSeeder extends Seeder
{
    public function run()
    {
        $types = [
            [
                'name' => 'Annual Leave', 'code' => 'AL',
                'days_allowed_per_year' => 14, 'is_paid' => true,
                'carry_forward' => true, 'max_carry_forward_days' => 5,
                'color' => '#3B82F6', 'description' => 'Yearly paid leave',
            ],
            [
                'name' => 'Sick Leave', 'code' => 'SL',
                'days_allowed_per_year' => 10, 'is_paid' => true,
                'carry_forward' => false,
                'color' => '#EF4444', 'description' => 'Medical/sick leave',
            ],
            [
                'name' => 'Casual Leave', 'code' => 'CL',
                'days_allowed_per_year' => 7, 'is_paid' => true,
                'carry_forward' => false,
                'color' => '#F59E0B', 'description' => 'Casual/personal leave',
            ],
            [
                'name' => 'Unpaid Leave', 'code' => 'UL',
                'days_allowed_per_year' => 30, 'is_paid' => false,
                'carry_forward' => false,
                'color' => '#6B7280', 'description' => 'Leave without pay',
            ],
            [
                'name' => 'Maternity Leave', 'code' => 'ML',
                'days_allowed_per_year' => 90, 'is_paid' => true,
                'allow_half_day' => false,
                'color' => '#EC4899', 'description' => 'Maternity leave',
            ],
            [
                'name' => 'Paternity Leave', 'code' => 'PL',
                'days_allowed_per_year' => 7, 'is_paid' => true,
                'allow_half_day' => false,
                'color' => '#8B5CF6', 'description' => 'Paternity leave',
            ],
            [
                'name' => 'Work From Home', 'code' => 'WFH',
                'days_allowed_per_year' => 30, 'is_paid' => true,
                'requires_approval' => true,
                'color' => '#10B981', 'description' => 'Remote work request',
            ],
        ];

        foreach ($types as $type) {
            LeaveType::firstOrCreate(['code' => $type['code']], $type);
        }
    }
}
