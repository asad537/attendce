<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    public function run()
    {
        $departments = [
            ['name' => 'Engineering',      'code' => 'ENG',  'description' => 'Software Engineering & Development'],
            ['name' => 'Human Resources',  'code' => 'HR',   'description' => 'HR & Recruitment'],
            ['name' => 'Finance',          'code' => 'FIN',  'description' => 'Finance & Accounting'],
            ['name' => 'Marketing',        'code' => 'MKT',  'description' => 'Marketing & Communications'],
            ['name' => 'Operations',       'code' => 'OPS',  'description' => 'Operations & Support'],
            ['name' => 'Executive',        'code' => 'EXEC', 'description' => 'Executive Leadership'],
        ];

        foreach ($departments as $dept) {
            Department::firstOrCreate(['code' => $dept['code']], $dept);
        }
    }
}
