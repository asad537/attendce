<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDepartmentRequest;
use App\Http\Resources\DepartmentResource;
use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $departments = Department::with('manager')->active()->get();
        return response()->json(['departments' => DepartmentResource::collection($departments)]);
    }

    public function store(StoreDepartmentRequest $request): JsonResponse
    {
        $dept = Department::create($request->validated());
        return response()->json(['message' => 'Department created.', 'department' => new DepartmentResource($dept)], 201);
    }

    public function show(Department $department): JsonResponse
    {
        return response()->json(['department' => new DepartmentResource($department->load(['manager', 'employees']))]);
    }

    public function update(Request $request, Department $department): JsonResponse
    {
        $validated = $request->validate([
            'name'       => 'sometimes|string|max:100',
            'code'       => "sometimes|string|max:10|unique:departments,code,{$department->id}",
            'description'=> 'nullable|string|max:500',
            'manager_id' => 'nullable|exists:users,id',
            'is_active'  => 'boolean',
        ]);
        $department->update($validated);
        return response()->json(['message' => 'Department updated.', 'department' => new DepartmentResource($department->fresh('manager'))]);
    }

    public function destroy(Department $department): JsonResponse
    {
        $department->delete();
        return response()->json(['message' => 'Department deleted.']);
    }
}
