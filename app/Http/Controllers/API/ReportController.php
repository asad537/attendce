<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\AttendanceResource;
use App\Models\Attendance;
use App\Models\User;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

class ReportController extends Controller
{
    private $service;
    public function __construct(ReportService $service) { $this->service = $service; }

    /** GET /api/reports/daily-snapshot */
    public function dailySnapshot(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isCeo()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }
        return response()->json($this->service->dailySnapshot());
    }

    /** GET /api/reports/attendance-summary */
    public function attendanceSummary(Request $request): JsonResponse
    {
        $auth  = $request->user();
        [$start, $end] = $this->validatedDateRange($request);

        if ($auth->isEmployee()) {
            return response()->json($this->service->userAttendanceSummary($auth, $start, $end));
        }

        // Team Lead → only their direct reports
        if ($auth->isTl()) {
            return response()->json(['team' => $this->service->teamAttendanceSummary($auth, $start, $end)]);
        }

        // Manager and CEO → whole company
        $userId = $request->get('user_id');
        if ($userId) {
            $user = User::findOrFail($userId);
            return response()->json($this->service->userAttendanceSummary($user, $start, $end));
        }

        return response()->json(['company' => $this->service->companyAttendanceSummary($start, $end)]);
    }

    /** GET /api/reports/attendance-sheet — day-by-day matrix for a month */
    public function attendanceSheet(Request $request): JsonResponse
    {
        $auth = $request->user();
        abort_if($auth->isEmployee(), 403, 'Forbidden.');

        $data = $request->validate(['month' => 'nullable|date_format:Y-m']);
        $month = $data['month'] ?? now()->format('Y-m');

        // CEO & Manager see everyone; Team Lead sees their own team.
        $userIds = null;
        if ($auth->isTl()) {
            $userIds = User::where('manager_id', $auth->id)->pluck('id')->push($auth->id)->unique()->values()->all();
        }

        return response()->json($this->service->attendanceSheet($month, $userIds));
    }

    /** GET /api/reports/leave-summary */
    public function leaveSummary(Request $request): JsonResponse
    {
        $auth   = $request->user();
        $year   = (int) $request->get('year', date('Y'));
        $userId = $request->get('user_id');

        if ($auth->isEmployee()) {
            $userId = $auth->id;
        } elseif ($auth->isTeamLead()) {
            $allowedIds = User::where('manager_id', $auth->id)->pluck('id')->push($auth->id);
            if ($userId) {
                abort_unless($allowedIds->contains((int) $userId), 403);
            } else {
                return response()->json($this->service->leaveSummaryForUsers($year, $allowedIds->all()));
            }
        }

        return response()->json($this->service->leaveSummary($year, $userId ? (int) $userId : null));
    }

    /** GET /api/reports/export - CSV/Excel download */
    public function export(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        [$start, $end] = $this->validatedDateRange($request);
        $auth  = $request->user();

        $query = Attendance::with('user')->forDateRange($start, $end)->orderBy('date')->orderBy('id');

        if ($auth->isEmployee()) {
            $query->where('user_id', $auth->id);
        } elseif ($auth->isTeamLead()) {
            $teamIds = User::where('manager_id', $auth->id)->pluck('id')->push($auth->id);
            $query->whereIn('user_id', $teamIds);
        }

        $headers = [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"attendance_{$start}_to_{$end}.csv\"",
        ];

        $callback = function () use ($query) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Date', 'Employee ID', 'Name', 'Check In', 'Check Out', 'Status', 'Working Hours', 'Overtime Hours', 'Is Late', 'Late Minutes', 'Work Mode']);
            foreach ($query->lazy(500) as $r) {
                fputcsv($handle, [
                    $r->date ? $r->date->toDateString() : null,
                    $this->safeCsv($r->user ? $r->user->employee_id : null),
                    $this->safeCsv($r->user ? $r->user->name : null),
                    $r->check_in ? $r->check_in->format('H:i:s') : null,
                    $r->check_out ? $r->check_out->format('H:i:s') : null,
                    $r->status,
                    $r->working_hours,
                    round($r->overtime_minutes / 60, 2),
                    $r->is_late ? 'Yes' : 'No',
                    $r->late_minutes,
                    $r->work_mode,
                ]);
            }
            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    private function validatedDateRange(Request $request): array
    {
        $dates = [
            'start_date' => $request->get('start_date', now()->startOfMonth()->toDateString()),
            'end_date' => $request->get('end_date', now()->toDateString()),
        ];
        Validator::make($dates, [
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ])->validate();

        if (Carbon::parse($dates['start_date'])->diffInDays(Carbon::parse($dates['end_date'])) > 366) {
            throw ValidationException::withMessages(['end_date' => 'Report ranges cannot exceed 366 days.']);
        }

        return [$dates['start_date'], $dates['end_date']];
    }

    private function safeCsv($value): ?string
    {
        if ($value === null) return null;
        $value = (string) $value;
        return preg_match('/^[=+\-@]/', $value) ? "'" . $value : $value;
    }
}
