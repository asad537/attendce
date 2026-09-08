<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProjectController extends Controller
{
    // Who may edit a project (and therefore its lead/member list):
    // the CEO, the project's creator, or any of the project's leads.
    private function canManageProject(User $user, Project $project): bool
    {
        return $user->isCeo()
            || (int) $project->created_by === (int) $user->id
            || $project->isLead($user->id);
    }

    // Replace the project's lead/member rows. Only touches a role when its id
    // list was actually sent, so a partial update never wipes the other role.
    private function syncTeam(Project $project, ?array $leadIds, ?array $memberIds, int $fallbackLeadId): void
    {
        $now = now();

        if ($leadIds !== null) {
            $leadIds = collect($leadIds)->map(fn ($x) => (int) $x)->filter()->unique()->values();
            // A project must always have at least one lead.
            if ($leadIds->isEmpty()) $leadIds = collect([$fallbackLeadId]);

            DB::table('project_user')->where('project_id', $project->id)->where('role', 'lead')->delete();
            DB::table('project_user')->insert($leadIds->map(fn ($id) => [
                'project_id' => $project->id, 'user_id' => $id, 'role' => 'lead',
                'created_at' => $now, 'updated_at' => $now,
            ])->all());

            // Keep the legacy single-lead column pointing at a real lead.
            $project->update(['project_lead_id' => $leadIds->first()]);
        }

        if ($memberIds !== null) {
            $memberIds = collect($memberIds)->map(fn ($x) => (int) $x)->filter()->unique()->values();
            DB::table('project_user')->where('project_id', $project->id)->where('role', 'member')->delete();
            if ($memberIds->isNotEmpty()) {
                DB::table('project_user')->insert($memberIds->map(fn ($id) => [
                    'project_id' => $project->id, 'user_id' => $id, 'role' => 'member',
                    'created_at' => $now, 'updated_at' => $now,
                ])->all());
            }
        }
    }

    private function teamLoad(): array
    {
        $cols = ['id', 'first_name', 'last_name', 'name', 'email', 'role'];
        return [
            'projectLead:' . implode(',', $cols),
            'creator:' . implode(',', $cols),
            'leads:' . implode(',', $cols),
            'members:' . implode(',', $cols),
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $projects = Project::with($this->teamLoad())
            ->when(!$user->isCeo(), function ($query) use ($user) {
                $query->where(function ($scope) use ($user) {
                    $scope->where('created_by', $user->id)
                          ->orWhere('project_lead_id', $user->id)
                          ->orWhereHas('team', function ($q) use ($user) {
                              $q->where('users.id', $user->id);
                          })
                          ->orWhereHas('tickets', function ($q) use ($user) {
                              $q->where('assignee_id', $user->id);
                          });
                });
            })->latest()->get();

        return response()->json(['projects' => $projects]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!($user->isCeo() || $user->isManager() || $user->isTl())) {
            abort(403, 'Only CEOs, managers, and team leads can create projects.');
        }

        $data = $request->validate([
            'name' => 'required|string|max:150', 'description' => 'nullable|string|max:2000',
            'status' => 'nullable|in:planning,in_progress,on_hold,completed',
            'start_date' => 'nullable|date', 'due_date' => 'nullable|date|after_or_equal:start_date',
            'project_lead_id' => 'nullable|exists:users,id',
            'lead_ids' => 'nullable|array', 'lead_ids.*' => 'integer|exists:users,id',
            'member_ids' => 'nullable|array', 'member_ids.*' => 'integer|exists:users,id',
        ]);

        $leadIds = $request->has('lead_ids') ? $data['lead_ids'] ?? [] : null;
        $memberIds = $request->has('member_ids') ? $data['member_ids'] ?? [] : null;

        // Default single lead: explicit column, else first of lead_ids, else creator.
        $primaryLead = $data['project_lead_id'] ?? ($leadIds[0] ?? $user->id);

        $project = Project::create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'status' => $data['status'] ?? 'planning',
            'start_date' => $data['start_date'] ?? null,
            'due_date' => $data['due_date'] ?? null,
            'project_lead_id' => $primaryLead,
            'created_by' => $user->id,
        ]);

        // If no explicit leads were sent, seed the pivot with the primary lead so
        // the new project already has a lead row.
        $this->syncTeam($project, $leadIds ?? [(int) $primaryLead], $memberIds, (int) $primaryLead);

        AuditService::log('project_created', 'project', "Project {$project->name} created", $user->id, Project::class, $project->id);

        return response()->json(['message' => 'Project created successfully.', 'project' => $project->load($this->teamLoad())], 201);
    }

    public function update(Request $request, Project $project): JsonResponse
    {
        $user = $request->user();
        abort_unless($this->canManageProject($user, $project), 403, 'You are not allowed to update this project.');

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:150', 'description' => 'nullable|string|max:2000',
            'status' => 'sometimes|in:planning,in_progress,on_hold,completed',
            'start_date' => 'nullable|date', 'due_date' => 'nullable|date|after_or_equal:start_date',
            'project_lead_id' => 'nullable|exists:users,id',
            'lead_ids' => 'nullable|array', 'lead_ids.*' => 'integer|exists:users,id',
            'member_ids' => 'nullable|array', 'member_ids.*' => 'integer|exists:users,id',
        ]);

        $leadIds = $request->has('lead_ids') ? $data['lead_ids'] ?? [] : null;
        $memberIds = $request->has('member_ids') ? $data['member_ids'] ?? [] : null;

        $project->update(array_intersect_key($data, array_flip([
            'name', 'description', 'status', 'start_date', 'due_date', 'project_lead_id',
        ])));

        $this->syncTeam($project, $leadIds, $memberIds, (int) ($project->project_lead_id ?: $user->id));

        AuditService::log('project_updated', 'project', "Project {$project->name} updated", $user->id, Project::class, $project->id);
        return response()->json(['message' => 'Project updated successfully.', 'project' => $project->fresh($this->teamLoad())]);
    }

    // The assignable team for a project: everyone attached as a lead or member,
    // deduped. Used to populate ticket-assignee dropdowns.
    public function members(Request $request, Project $project): JsonResponse
    {
        $user = $request->user();
        $isTeam = $this->canManageProject($user, $project)
            || $project->team()->where('users.id', $user->id)->exists()
            || $project->tickets()->where('assignee_id', $user->id)->exists();
        abort_unless($isTeam, 403);

        // Qualify with the users table — the pivot join also has an `id` column.
        $cols = ['users.id', 'users.first_name', 'users.last_name', 'users.name', 'users.email', 'users.role'];
        $leads = $project->leads()->get($cols);
        $members = $project->members()->get($cols);

        // Deduped assignable pool (a lead may also do work).
        $team = $leads->concat($members)->unique('id')->values();

        return response()->json([
            'leads' => $leads,
            'members' => $members,
            'team' => $team,
            'can_manage' => $this->canManageProject($user, $project),
        ]);
    }
}
