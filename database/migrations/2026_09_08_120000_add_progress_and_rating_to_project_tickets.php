<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_tickets', function (Blueprint $table) {
            // Assignee-adjustable completion percentage (0-100) for in-progress work.
            $table->unsignedTinyInteger('progress')->default(0)->after('status');
            // Manager/TL rating of a completed ticket (1-5), who rated it and when.
            $table->unsignedTinyInteger('rating')->nullable()->after('progress');
            $table->unsignedBigInteger('rated_by')->nullable()->after('rating');
            $table->timestamp('rated_at')->nullable()->after('rated_by');
            $table->foreign('rated_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('project_tickets', function (Blueprint $table) {
            $table->dropForeign(['rated_by']);
            $table->dropColumn(['progress', 'rating', 'rated_by', 'rated_at']);
        });
    }
};
