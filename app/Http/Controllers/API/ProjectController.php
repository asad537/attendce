<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $projects = Project::with(['projectLead:id,first_name,last_name,name,email,role', 'creator:id,first_name,last_name,name,email,role'])
            ->when(!$user->isCeo(), function ($query) use ($user) {
                $query->where(function ($scope) use ($user) {
                    $scope->where('created_by', $user->id)
                          ->orWhere('project_lead_id', $user->id)
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
        ]);

        if (!empty($data['project_lead_id'])) {
            $lead = User::findOrFail($data['project_lead_id']);
            // Allow any valid user to be assigned as project lead
        }

        $data['created_by'] = $user->id;
        $data['project_lead_id'] = $data['project_lead_id'] ?? $user->id;
        $project = Project::create($data);
        AuditService::log('project_created', 'project', "Project {$project->name} created", $user->id, Project::class, $project->id);

        return response()->json(['message' => 'Project created successfully.', 'project' => $project->load(['projectLead', 'creator'])], 201);
    }

    public function update(Request $request, Project $project): JsonResponse
    {
        $user = $request->user();
        if (!($user->isCeo() || (($user->isManager() || $user->isTl()) && ($project->created_by == $user->id || $project->project_lead_id == $user->id)))) {
            abort(403, 'You are not allowed to update this project.');
        }

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:150', 'description' => 'nullable|string|max:2000',
            'status' => 'sometimes|in:planning,in_progress,on_hold,completed',
            'start_date' => 'nullable|date', 'due_date' => 'nullable|date|after_or_equal:start_date',
            'project_lead_id' => 'nullable|exists:users,id',
        ]);

        if (array_key_exists('project_lead_id', $data) && $data['project_lead_id']) {
            $lead = User::findOrFail($data['project_lead_id']);
            // Allow any valid user to be assigned as project lead
        }

        $project->update($data);
        AuditService::log('project_updated', 'project', "Project {$project->name} updated", $user->id, Project::class, $project->id);
        return response()->json(['message' => 'Project updated successfully.', 'project' => $project->fresh(['projectLead', 'creator'])]);
    }
}
