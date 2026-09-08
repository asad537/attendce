<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_user', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id');
            $table->unsignedBigInteger('user_id');
            // A project can now have MANY leads and many members.
            $table->enum('role', ['lead', 'member'])->default('member');
            $table->timestamps();

            $table->foreign('project_id')->references('id')->on('projects')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['project_id', 'user_id', 'role']);
        });

        // Backfill so existing projects keep working exactly as before:
        //  - the current single project_lead_id becomes a 'lead' row,
        //  - everyone already assigned a ticket in the project becomes a 'member'.
        $now = now();

        $projects = DB::table('projects')->select('id', 'project_lead_id')->get();
        foreach ($projects as $project) {
            if ($project->project_lead_id) {
                DB::table('project_user')->updateOrInsert(
                    ['project_id' => $project->id, 'user_id' => $project->project_lead_id, 'role' => 'lead'],
                    ['created_at' => $now, 'updated_at' => $now]
                );
            }
        }

        $assignees = DB::table('project_tickets')
            ->whereNotNull('assignee_id')
            ->select('project_id', 'assignee_id')
            ->distinct()
            ->get();
        foreach ($assignees as $row) {
            DB::table('project_user')->updateOrInsert(
                ['project_id' => $row->project_id, 'user_id' => $row->assignee_id, 'role' => 'member'],
                ['created_at' => $now, 'updated_at' => $now]
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('project_user');
    }
};
