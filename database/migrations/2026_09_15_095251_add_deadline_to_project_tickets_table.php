<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddDeadlineToProjectTicketsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up(): void
    {
        Schema::table('project_tickets', function (Blueprint $table) {
            $table->dateTime('deadline')->nullable()->after('status');
            $table->boolean('deadline_notified')->default(false)->after('deadline');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down(): void
    {
        Schema::table('project_tickets', function (Blueprint $table) {
            $table->dropColumn(['deadline', 'deadline_notified']);
        });
    }
}
