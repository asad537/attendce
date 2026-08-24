<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateProjectsTable extends Migration
{
    public function up()
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('status')->default('planning');
            $table->date('start_date')->nullable();
            $table->date('due_date')->nullable();
            $table->unsignedBigInteger('project_lead_id')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->timestamps();
            $table->foreign('project_lead_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down()
    {
        Schema::dropIfExists('projects');
    }
}
