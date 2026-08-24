<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\CheckInRequest;
use App\Http\Requests\CheckOutRequest;
use App\Http\Resources\AttendanceResource;
use App\Models\Attendance;
use App\Models\User;
use App\Services\AttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    private $service;
    public function __construct(AttendanceService $service) { $this->service = $service; }

    /** GET /api/attendance - paginated list (role-scoped) */
    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $query = Attendance::with(['user.department', 'breaks'])->orderByDesc('date');

        if ($user->isEmployee()) {
            $query->where('user_id', $user->id);
        } elseif ($user->isManager()) {
            $teamIds = User::where('manager_id', $user->id)->pluck('id')->push($user->id);
            $query->whereIn('user_id', $teamIds);
        }
        // CEO gets all

        if ($request->filled('date')) {
            $query->whereDate('date', $request->date);
        }
        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('date', [$request->start_date, $request->end_date]);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('user_id') && !$user->isEmployee()) {
            $query->where('user_id', $request->user_id);
        }

        $per_page = min((int) $request->get('per_page', 20), 100);
        $records  = $query->paginate($per_page);

        return response()->json([
            'data'  => AttendanceResource::collection($records->items()),
            'meta'  => [
                'total'        => $records->total(),
                'per_page'     => $records->perPage(),
                'current_page' => $records->currentPage(),
                'last_page'    => $records->lastPage(),
            ],
        ]);
    }

    /** GET /api/attendance/today */
    public function today(Request $request): JsonResponse
    {
        $user       = $request->user();
        $attendance = Attendance::where('user_id', $user->id)
            ->whereDate('date', today())
            ->with('breaks')
            ->first();

        return response()->json([
            'attendance'     => $attendance ? new AttendanceResource($attendance) : null,
            'current_status' => $user->current_status,
        ]);
    }

    /** POST /api/attendance/check-in */
    public function checkIn(CheckInRequest $request): JsonResponse
    {
        try {
            $attendance = $this->service->checkIn($request->user(), $request->validated());
            return response()->json([
                'message'    => 'Checked in successfully.',
                'attendance' => new AttendanceResource($attendance->load('breaks')),
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /** POST /api/attendance/check-out */
    public function checkOut(CheckOutRequest $request): JsonResponse
    {
        try {
            $attendance = $this->service->checkOut($request->user(), $request->validated());
            return response()->json([
                'message'    => 'Checked out successfully.',
                'attendance' => new AttendanceResource($attendance->load('breaks')),
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /** GET /api/attendance/{id} */
    public function show(Request $request, int $id): JsonResponse
    {
        $attendance = Attendance::with(['user.department', 'breaks'])->findOrFail($id);
        $this->authorize('view', $attendance);
        return response()->json(['attendance' => new AttendanceResource($attendance)]);
    }

    /** GET /api/attendance/team-status - Manager/CEO live team status */
    public function teamStatus(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isEmployee()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $query = User::with(['todayAttendance.breaks', 'department'])->active();

        if ($user->isManager()) {
            $query->where(function ($q) use ($user) {
                $q->where('manager_id', $user->id)->orWhere('id', $user->id);
            });
        }

        $users = $query->get()->map(function (User $u) {
            return [
                'id'             => $u->id,
                'name'           => $u->name,
                'employee_id'    => $u->employee_id,
                'department'     => $u->department ? $u->department->name : null,
                'current_status' => $u->current_status,
                'check_in'       => ($u->todayAttendance && $u->todayAttendance->check_in) ? $u->todayAttendance->check_in->toISOString() : null,
                'check_out'      => ($u->todayAttendance && $u->todayAttendance->check_out) ? $u->todayAttendance->check_out->toISOString() : null,
                'working_hours'  => $u->todayAttendance ? $u->todayAttendance->working_hours : 0,
                'is_late'        => $u->todayAttendance ? $u->todayAttendance->is_late : false,
                'late_minutes'   => $u->todayAttendance ? $u->todayAttendance->late_minutes : 0,
            ];
        });

        return response()->json(['team' => $users]);
    }
}
