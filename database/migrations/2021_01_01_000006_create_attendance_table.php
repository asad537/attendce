<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateAttendanceTable extends Migration
{
    public function up()
    {
        Schema::create('attendance', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->date('date');
            $table->dateTime('check_in')->nullable();
            $table->dateTime('check_out')->nullable();
            $table->enum('status', [
                'present',
                'absent',
                'late',
                'half_day',
                'on_leave',
                'holiday',
                'work_from_home',
                'weekend'
            ])->default('absent');
            $table->enum('work_mode', ['office', 'remote', 'hybrid'])->default('office');
            $table->integer('working_minutes')->default(0);      // net work time
            $table->integer('break_minutes')->default(0);        // total break time
            $table->integer('overtime_minutes')->default(0);
            $table->boolean('is_late')->default(false);
            $table->integer('late_minutes')->default(0);
            $table->string('check_in_ip')->nullable();
            $table->string('check_out_ip')->nullable();
            $table->decimal('check_in_lat', 10, 8)->nullable();
            $table->decimal('check_in_lng', 11, 8)->nullable();
            $table->text('note')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'date']);
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
            $table->index(['user_id', 'date']);
            $table->index('status');
        });
    }

    public function down()
    {
        Schema::dropIfExists('attendance');
    }
}
