<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AddTlRoleToUsersTable extends Migration
{
    public function up()
    {
        // SQLite stores enum columns as text, so it already accepts the new value.
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('employee','manager','tl','ceo') NOT NULL DEFAULT 'employee'");
        }
    }

    public function down()
    {
        if (DB::getDriverName() === 'mysql') {
            DB::table('users')->where('role', 'tl')->update(['role' => 'employee']);
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('employee','manager','ceo') NOT NULL DEFAULT 'employee'");
        }
    }
}
