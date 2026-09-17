<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        DB::statement('ALTER TABLE projects MODIFY description LONGTEXT');
        DB::statement('ALTER TABLE project_tickets MODIFY description LONGTEXT');
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        DB::statement('ALTER TABLE projects MODIFY description TEXT');
        DB::statement('ALTER TABLE project_tickets MODIFY description TEXT');
    }
};
