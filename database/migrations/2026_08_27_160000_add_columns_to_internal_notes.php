<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddColumnsToInternalNotes extends Migration
{
    public function up(): void
    {
        Schema::table('internal_notes', function (Blueprint $table) {
            if (! Schema::hasColumn('internal_notes', 'user_id')) {
                $table->foreignId('user_id')->after('id')->constrained('users')->cascadeOnDelete();
            }
            if (! Schema::hasColumn('internal_notes', 'author_id')) {
                $table->foreignId('author_id')->nullable()->after('user_id')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('internal_notes', 'title')) {
                $table->string('title')->after('author_id');
            }
            if (! Schema::hasColumn('internal_notes', 'body')) {
                $table->text('body')->nullable()->after('title');
            }
        });
    }

    public function down(): void
    {
        Schema::table('internal_notes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
            $table->dropConstrainedForeignId('author_id');
            $table->dropColumn(['title', 'body']);
        });
    }
}
