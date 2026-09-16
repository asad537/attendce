<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('leave_balances', function (Blueprint $table) {
            $table->decimal('monthly_allocated', 5, 1)->nullable()->after('allocated');
        });
    }

    public function down(): void
    {
        Schema::table('leave_balances', fn (Blueprint $table) => $table->dropColumn('monthly_allocated'));
    }
};
