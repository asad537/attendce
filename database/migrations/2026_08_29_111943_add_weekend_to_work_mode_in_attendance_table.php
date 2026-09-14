<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class AddWeekendToWorkModeInAttendanceTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        if (DB::getDriverName() === 'mysql') { // ENUM MODIFY is MySQL-only; sqlite (tests) stores plain strings
            DB::statement("ALTER TABLE attendance MODIFY COLUMN work_mode ENUM('office', 'remote', 'hybrid', 'weekend') DEFAULT 'office'");
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        if (DB::getDriverName() === 'mysql') { // ENUM MODIFY is MySQL-only; sqlite (tests) stores plain strings
            DB::statement("ALTER TABLE attendance MODIFY COLUMN work_mode ENUM('office', 'remote', 'hybrid') DEFAULT 'office'");
        }
    }
}
