<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreShiftRequest;
use App\Http\Resources\ShiftResource;
use App\Models\Shift;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShiftController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['shifts' => ShiftResource::collection(Shift::active()->get())]);
    }

    public function store(StoreShiftRequest $request): JsonResponse
    {
        $shift = Shift::create($request->validated());
        return response()->json(['message' => 'Shift created.', 'shift' => new ShiftResource($shift)], 201);
    }

    public function show(Shift $shift): JsonResponse
    {
        return response()->json(['shift' => new ShiftResource($shift)]);
    }

    public function update(Request $request, Shift $shift): JsonResponse
    {
        $validated = $request->validate([
            'name'               => 'sometimes|string|max:100',
            'start_time'         => 'sometimes|date_format:H:i',
            'end_time'           => 'sometimes|date_format:H:i',
            'grace_minutes'      => 'sometimes|integer|min:0|max:60',
            'max_overtime_hours' => 'sometimes|integer|min:0|max:12',
            'is_night_shift'     => 'boolean',
            'is_active'          => 'boolean',
        ]);
        $shift->update($validated);
        return response()->json(['message' => 'Shift updated.', 'shift' => new ShiftResource($shift)]);
    }

    public function destroy(Shift $shift): JsonResponse
    {
        $shift->delete();
        return response()->json(['message' => 'Shift deleted.']);
    }
}
