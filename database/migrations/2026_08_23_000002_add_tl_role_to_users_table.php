<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AddTlRoleToUsersTable extends Migration
{
    public function up()
    {
        // MySQL: modify the enum to include 'tl'
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('employee','manager','tl','ceo') NOT NULL DEFAULT 'employee'");
    }

    public function down()
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('employee','manager','ceo') NOT NULL DEFAULT 'employee'");
    }
}
