<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('employee_satisfaction_ratings', function (Blueprint $table) {
            if (\Illuminate\Support\Facades\DB::getDriverName() !== 'sqlite') {
                $table->dropForeign(['user_id']);
                $table->dropUnique(['user_id', 'rated_by_id']);
                $table->dropColumn('user_id');
                $table->unique('rated_by_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_satisfaction_ratings', function (Blueprint $table) {
            $table->dropUnique(['rated_by_id']);
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->unique(['user_id', 'rated_by_id']);
        });
    }
};
