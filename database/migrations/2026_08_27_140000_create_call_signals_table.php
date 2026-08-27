<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateCallSignalsTable extends Migration
{
    public function up(): void
    {
        Schema::create('call_signals', function (Blueprint $table) {
            $table->id();
            $table->string('call_id', 40)->index();
            $table->foreignId('from_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('to_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('type', 20);       // offer, answer, ice, hangup, reject, cancel
            $table->longText('data')->nullable(); // JSON payload (SDP / ICE candidate / meta)
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->index(['to_user_id', 'read_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('call_signals');
    }
}
