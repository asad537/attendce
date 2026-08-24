<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    public function run()
    {
        $departments = [
            ['name' => 'Developers',       'code' => 'DEV',  'description' => 'Software and product development'],
            ['name' => 'SEO',              'code' => 'SEO',  'description' => 'Search engine optimization'],
            ['name' => 'Content Writers',  'code' => 'CW',   'description' => 'Content strategy and writing'],
            ['name' => 'Designers',        'code' => 'DSGN', 'description' => 'Product and creative design'],
        ];

        foreach ($departments as $dept) {
            Department::firstOrCreate(['code' => $dept['code']], $dept);
        }
    }
}
