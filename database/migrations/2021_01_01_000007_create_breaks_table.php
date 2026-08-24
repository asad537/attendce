<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateBreaksTable extends Migration
{
    public function up()
    {
        Schema::create('breaks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('attendance_id');
            $table->unsignedBigInteger('user_id');
            $table->dateTime('break_start');
            $table->dateTime('break_end')->nullable();
            $table->integer('duration_minutes')->default(0);
            $table->enum('type', ['lunch', 'short', 'prayer', 'other'])->default('short');
            $table->text('note')->nullable();
            $table->timestamps();

            $table->foreign('attendance_id')->references('id')->on('attendance')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index(['attendance_id', 'user_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('breaks');
    }
}
