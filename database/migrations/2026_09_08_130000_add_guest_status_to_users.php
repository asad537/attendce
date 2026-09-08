<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // Guests invited to a call get a throwaway users row (role='guest',
    // status='guest'). The 'guest' status keeps them out of every staff list,
    // because scopeActive() only matches status='active'.
    public function up(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN status ENUM('active','inactive','suspended','guest') NOT NULL DEFAULT 'active'");
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('employee','manager','tl','ceo','guest') NOT NULL DEFAULT 'employee'");
    }

    public function down(): void
    {
        DB::statement("DELETE FROM users WHERE status = 'guest' OR role = 'guest'");
        DB::statement("ALTER TABLE users MODIFY COLUMN status ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active'");
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('employee','manager','tl','ceo') NOT NULL DEFAULT 'employee'");
    }
};
