<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class ReplaceDepartmentsWithCompanyTeams extends Migration
{
    public function up()
    {
        DB::transaction(function () {
            // The existing foreign keys use nullOnDelete, so employees and
            // designations remain intact while their old assignment is cleared.
            DB::table('departments')->delete();

            $now = now();
            DB::table('departments')->insert([
                ['name' => 'Developers', 'code' => 'DEV', 'description' => 'Software and product development', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['name' => 'SEO', 'code' => 'SEO', 'description' => 'Search engine optimization', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['name' => 'Content Writers', 'code' => 'CW', 'description' => 'Content strategy and writing', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['name' => 'Designers', 'code' => 'DSGN', 'description' => 'Product and creative design', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ]);
        });
    }

    public function down()
    {
        throw new RuntimeException('The previous department assignments cannot be restored automatically.');
    }
}
