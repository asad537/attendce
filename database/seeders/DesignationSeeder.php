<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Designation;
use Illuminate\Database\Seeder;

class DesignationSeeder extends Seeder
{
    public function run()
    {
        $eng  = Department::where('code', 'DEV')->first();
        $hr   = Department::where('code', 'CW')->first();
        $fin  = Department::where('code', 'SEO')->first();
        $exec = Department::where('code', 'DSGN')->first();

        $designations = [
            ['title' => 'Software Engineer',        'department_id' => $eng ? $eng->id : null],
            ['title' => 'Senior Software Engineer', 'department_id' => $eng ? $eng->id : null],
            ['title' => 'Software-Intern',          'department_id' => $eng ? $eng->id : null],
            ['title' => 'Engineering Manager',      'department_id' => $eng ? $eng->id : null],
            ['title' => 'HR Manager',               'department_id' => $hr ? $hr->id : null],
            ['title' => 'Finance Manager',          'department_id' => $fin ? $fin->id : null],
            ['title' => 'Chief Executive Officer',  'department_id' => $exec ? $exec->id : null],
        ];

        foreach ($designations as $d) {
            Designation::firstOrCreate(['title' => $d['title']], $d);
        }
    }
}
