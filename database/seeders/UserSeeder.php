<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Designation;
use App\Models\Shift;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run()
    {
        // These demo accounts share the password "password" — never create them
        // in production, even if the seeder is invoked directly.
        if (app()->environment('production')) {
            $this->command->warn('UserSeeder skipped: refusing to seed demo accounts in production.');
            return;
        }

        $generalShift = Shift::where('name', 'General Shift')->first();
        $morningShift = Shift::where('name', 'Morning Shift')->first();
        $engDept      = Department::where('code', 'DEV')->first();
        $hrDept       = Department::where('code', 'CW')->first();
        $execDept     = Department::where('code', 'DSGN')->first();
        $ceoDesig     = Designation::where('title', 'Chief Executive Officer')->first();
        $engMgrDesig  = Designation::where('title', 'Engineering Manager')->first();
        $hrMgrDesig   = Designation::where('title', 'HR Manager')->first();
        $swDesig      = Designation::where('title', 'Software Engineer')->first();
        $hrDesig      = Designation::where('title', 'HR Executive')->first();

        // CEO / Super Admin
        $ceo = User::firstOrCreate(
            ['email' => 'ceo@attendance.com'],
            [
                'employee_id'   => 'EMP-0001',
                'name'          => 'John CEO',
                'password'      => Hash::make('password'),
                'role'          => 'ceo',
                'status'        => 'active',
                'department_id' => $execDept ? $execDept->id : null,
                'designation_id'=> $ceoDesig ? $ceoDesig->id : null,
                'shift_id'      => $generalShift ? $generalShift->id : null,
                'join_date'     => '2020-01-15',
            ]
        );
        $ceo->assignRole('ceo');

        // Manager 1 — Engineering
        $mgr1 = User::firstOrCreate(
            ['email' => 'manager.eng@attendance.com'],
            [
                'employee_id'   => 'EMP-0002',
                'name'          => 'Alice Manager',
                'password'      => Hash::make('password'),
                'role'          => 'manager',
                'status'        => 'active',
                'department_id' => $engDept ? $engDept->id : null,
                'designation_id'=> $engMgrDesig ? $engMgrDesig->id : null,
                'shift_id'      => $generalShift ? $generalShift->id : null,
                'join_date'     => '2021-03-01',
            ]
        );
        $mgr1->assignRole('manager');

        if ($engDept) $engDept->update(['manager_id' => $mgr1->id]);

        // Manager 2 — HR
        $mgr2 = User::firstOrCreate(
            ['email' => 'manager.hr@attendance.com'],
            [
                'employee_id'   => 'EMP-0003',
                'name'          => 'Bob Manager',
                'password'      => Hash::make('password'),
                'role'          => 'manager',
                'status'        => 'active',
                'department_id' => $hrDept ? $hrDept->id : null,
                'designation_id'=> $hrMgrDesig ? $hrMgrDesig->id : null,
                'shift_id'      => $morningShift ? $morningShift->id : null,
                'join_date'     => '2021-06-15',
            ]
        );
        $mgr2->assignRole('manager');
        if ($hrDept) $hrDept->update(['manager_id' => $mgr2->id]);

        // Employees
        $employees = [
            ['employee_id' => 'EMP-0004', 'name' => 'Carol Developer', 'email' => 'carol@attendance.com',  'dept' => $engDept, 'desig' => $swDesig,  'shift' => $generalShift, 'mgr' => $mgr1],
            ['employee_id' => 'EMP-0005', 'name' => 'Dave Engineer',   'email' => 'dave@attendance.com',   'dept' => $engDept, 'desig' => $swDesig,  'shift' => $morningShift, 'mgr' => $mgr1],
            ['employee_id' => 'EMP-0006', 'name' => 'Eve Frontend',    'email' => 'eve@attendance.com',    'dept' => $engDept, 'desig' => $swDesig,  'shift' => $generalShift, 'mgr' => $mgr1],
            ['employee_id' => 'EMP-0007', 'name' => 'Frank HR',        'email' => 'frank@attendance.com',  'dept' => $hrDept,  'desig' => $hrDesig, 'shift' => $morningShift, 'mgr' => $mgr2],
            ['employee_id' => 'EMP-0008', 'name' => 'Grace HR',        'email' => 'grace@attendance.com',  'dept' => $hrDept,  'desig' => $hrDesig, 'shift' => $morningShift, 'mgr' => $mgr2],
        ];

        foreach ($employees as $e) {
            $user = User::firstOrCreate(
                ['email' => $e['email']],
                [
                    'employee_id'   => $e['employee_id'],
                    'name'          => $e['name'],
                    'password'      => Hash::make('password'),
                    'role'          => 'employee',
                    'status'        => 'active',
                    'department_id' => $e['dept'] ? $e['dept']->id : null,
                    'designation_id'=> $e['desig'] ? $e['desig']->id : null,
                    'shift_id'      => $e['shift'] ? $e['shift']->id : null,
                    'manager_id'    => $e['mgr'] ? $e['mgr']->id : null,
                    'join_date'     => '2022-01-10',
                ]
            );
            $user->assignRole('employee');
        }
    }
}
