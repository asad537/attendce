<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\DesignationResource;
use App\Models\Designation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DesignationController extends Controller
{
    /** GET /api/designations */
    public function index(Request $request): JsonResponse
    {
        $query = Designation::with('department');

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        if ($request->filled('active')) {
            $query->where('is_active', true);
        }

        $designations = $query->orderBy('title')->get();

        return response()->json([
            'designations' => DesignationResource::collection($designations),
        ]);
    }

    /** POST /api/designations */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'         => 'required|string|max:100',
            'department_id' => 'required|exists:departments,id',
            'description'   => 'nullable|string|max:500',
            'is_active'     => 'boolean',
        ]);

        $data['is_active'] = $data['is_active'] ?? true;

        $designation = Designation::create($data);

        return response()->json([
            'message'     => 'Designation created.',
            'designation' => new DesignationResource($designation->load('department')),
        ], 201);
    }

    /** PUT /api/designations/{designation} */
    public function update(Request $request, Designation $designation): JsonResponse
    {
        $data = $request->validate([
            'title'         => 'sometimes|string|max:100',
            'department_id' => 'sometimes|exists:departments,id',
            'description'   => 'nullable|string|max:500',
            'is_active'     => 'boolean',
        ]);

        $designation->update($data);

        return response()->json([
            'message'     => 'Designation updated.',
            'designation' => new DesignationResource($designation->fresh('department')),
        ]);
    }

    /** DELETE /api/designations/{designation} */
    public function destroy(Designation $designation): JsonResponse
    {
        $designation->delete();
        return response()->json(['message' => 'Designation deleted.']);
    }
}
