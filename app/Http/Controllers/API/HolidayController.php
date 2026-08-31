<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreHolidayRequest;
use App\Http\Resources\HolidayResource;
use App\Models\Holiday;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HolidayController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $year = $request->get('year', date('Y'));
        $holidays = Holiday::forYear($year)->orderBy('date')->get();
        return response()->json(['holidays' => HolidayResource::collection($holidays)]);
    }

    public function upcoming(): JsonResponse
    {
        $holidays = Holiday::upcoming()->limit(10)->get();
        return response()->json(['holidays' => HolidayResource::collection($holidays)]);
    }

    public function store(StoreHolidayRequest $request): JsonResponse
    {
        $holiday = Holiday::create($request->validated());
        NotificationService::notifyAll('New holiday announced', $holiday->name . ' has been added to the holiday calendar.', 'info', $holiday);
        return response()->json(['message' => 'Holiday created.', 'holiday' => new HolidayResource($holiday)], 201);
    }

    public function update(Request $request, Holiday $holiday): JsonResponse
    {
        $validated = $request->validate([
            'name'         => 'sometimes|string|max:100',
            'date'         => 'sometimes|date',
            'end_date'     => 'nullable|date|after_or_equal:date',
            'description'  => 'nullable|string',
            'type'         => 'sometimes|in:public,optional,restricted',
            'is_recurring' => 'boolean',
        ]);
        $holiday->update($validated);
        NotificationService::notifyAll('Holiday updated', $holiday->name . ' has been updated in the holiday calendar.', 'info', $holiday);
        return response()->json(['message' => 'Holiday updated.', 'holiday' => new HolidayResource($holiday)]);
    }

    public function destroy(Holiday $holiday): JsonResponse
    {
        $name = $holiday->name;
        $holiday->delete();
        NotificationService::notifyAll('Holiday removed', $name . ' has been removed from the holiday calendar.', 'warning');
        return response()->json(['message' => 'Holiday deleted.']);
    }
}
