<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('group_chats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('name', 120);
            $table->text('description')->nullable();
            $table->timestamps();
        });
        Schema::create('group_chat_user', function (Blueprint $table) {
            $table->foreignId('group_chat_id')->constrained('group_chats')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->primary(['group_chat_id', 'user_id']);
        });
        Schema::table('messages', function (Blueprint $table) {
            $table->foreignId('conversation_id')->nullable()->after('recipient_id')->constrained('group_chats')->cascadeOnDelete();
            $table->index(['conversation_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('messages', fn (Blueprint $table) => $table->dropForeign(['conversation_id']));
        Schema::table('messages', fn (Blueprint $table) => $table->dropColumn('conversation_id'));
        Schema::dropIfExists('group_chat_user');
        Schema::dropIfExists('group_chats');
    }
};
