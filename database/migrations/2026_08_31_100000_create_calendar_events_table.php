<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('calendar_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('title', 200);
            $table->date('event_date');
            $table->string('event_time', 20)->nullable();
            $table->string('type', 80)->default('talent');
            $table->string('location', 500)->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
            $table->index('event_date');
        });
    }
    public function down(): void { Schema::dropIfExists('calendar_events'); }
};
