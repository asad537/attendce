<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateHolidaysTable extends Migration
{
    public function up()
    {
        Schema::create('holidays', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->date('date');
            $table->date('end_date')->nullable(); // for multi-day holidays
            $table->text('description')->nullable();
            $table->enum('type', ['public', 'optional', 'restricted'])->default('public');
            $table->boolean('is_recurring')->default(false); // repeats every year
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('holidays');
    }
}
