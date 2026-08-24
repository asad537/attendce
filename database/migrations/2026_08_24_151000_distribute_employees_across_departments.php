<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class DistributeEmployeesAcrossDepartments extends Migration
{
    public function up()
    {
        DB::transaction(function () {
            $departments = DB::table('departments')->pluck('id', 'code');
            $assignments = [
                'DEV' => ['EMP-0002', 'EMP-0004', 'EMP-0005', 'EMP-0006'],
                'SEO' => ['EMP-0009', 'EMP-0010'],
                'CW' => ['EMP-0003', 'EMP-0007', 'EMP-0008'],
                'DSGN' => ['EMP-0001'],
            ];

            foreach ($assignments as $code => $employeeIds) {
                if (isset($departments[$code])) {
                    DB::table('users')->whereIn('employee_id', $employeeIds)
                        ->update(['department_id' => $departments[$code], 'updated_at' => now()]);
                }
            }

            $departmentManagers = ['DEV' => 'EMP-0002', 'SEO' => 'EMP-0009', 'CW' => 'EMP-0003', 'DSGN' => 'EMP-0001'];
            foreach ($departmentManagers as $code => $employeeId) {
                if (!isset($departments[$code])) continue;
                $managerId = DB::table('users')->where('employee_id', $employeeId)->value('id');
                DB::table('departments')->where('id', $departments[$code])->update(['manager_id' => $managerId, 'updated_at' => now()]);
            }
        });
    }

    public function down()
    {
        DB::table('departments')->update(['manager_id' => null]);
        DB::table('users')->update(['department_id' => null]);
    }
}
