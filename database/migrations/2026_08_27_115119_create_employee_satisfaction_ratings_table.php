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
        Schema::create('employee_satisfaction_ratings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete(); // The employee being rated
            $table->foreignId('rated_by_id')->constrained('users')->cascadeOnDelete(); // The employee giving the rating
            $table->integer('compensation_benefits'); // 1-5
            $table->integer('work_culture'); // 1-5
            $table->integer('work_life_balance'); // 1-5
            $table->integer('career_growth'); // 1-5
            $table->timestamps();

            // An employee can only have one active rating record for another employee at a time.
            $table->unique(['user_id', 'rated_by_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_satisfaction_ratings');
    }
};
