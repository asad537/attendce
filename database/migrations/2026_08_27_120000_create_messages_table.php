<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateMessagesTable extends Migration
{
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('recipient_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('messages')->nullOnDelete();
            $table->string('subject', 200)->default('(No subject)');
            $table->text('body')->nullable();
            $table->string('label', 30)->nullable();
            $table->boolean('is_draft')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamp('starred_by_sender_at')->nullable();
            $table->timestamp('starred_by_recipient_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamp('spam_at')->nullable();
            $table->timestamp('deleted_by_sender_at')->nullable();
            $table->timestamp('deleted_by_recipient_at')->nullable();
            $table->timestamps();
            $table->index(['recipient_id', 'read_at']);
            $table->index(['sender_id', 'is_draft']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
}
