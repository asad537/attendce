<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\BreakResource;
use App\Services\AttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BreakController extends Controller
{
    private $service;
    public function __construct(AttendanceService $service) { $this->service = $service; }

    /** POST /api/breaks/start */
    public function start(Request $request): JsonResponse
    {
        $request->validate([
            'type' => 'sometimes|in:lunch,short,prayer,other',
            'note' => 'nullable|string|max:200',
        ]);

        try {
            $break = $this->service->startBreak(
                $request->user(),
                $request->input('type', 'short'),
                $request->input('note')
            );
            return response()->json([
                'message' => 'Break started.',
                'break'   => new BreakResource($break),
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /** POST /api/breaks/end */
    public function end(Request $request): JsonResponse
    {
        try {
            $break = $this->service->endBreak($request->user());
            return response()->json([
                'message' => 'Break ended.',
                'break'   => new BreakResource($break),
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
