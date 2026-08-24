<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateLeavesTable extends Migration
{
    public function up()
    {
        Schema::create('leaves', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('leave_type_id');
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('days_requested', 4, 1); // supports 0.5 for half day
            $table->boolean('is_half_day')->default(false);
            $table->enum('half_day_period', ['morning', 'afternoon'])->nullable();
            $table->text('reason');
            $table->string('attachment')->nullable(); // file path

            // Workflow: employee → manager → ceo
            $table->enum('status', [
                'pending',
                'manager_approved',
                'manager_rejected',
                'approved',   // CEO final approval
                'rejected',   // CEO final rejection
                'cancelled'
            ])->default('pending');

            // Manager review
            $table->unsignedBigInteger('reviewed_by_manager')->nullable();
            $table->dateTime('manager_reviewed_at')->nullable();
            $table->text('manager_remarks')->nullable();

            // CEO review
            $table->unsignedBigInteger('reviewed_by_ceo')->nullable();
            $table->dateTime('ceo_reviewed_at')->nullable();
            $table->text('ceo_remarks')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('leave_type_id')->references('id')->on('leave_types');
            $table->foreign('reviewed_by_manager')->references('id')->on('users')->nullOnDelete();
            $table->foreign('reviewed_by_ceo')->references('id')->on('users')->nullOnDelete();
            $table->index(['user_id', 'status']);
            $table->index(['start_date', 'end_date']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('leaves');
    }
}
