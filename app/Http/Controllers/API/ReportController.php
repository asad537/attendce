<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\AttendanceResource;
use App\Models\Attendance;
use App\Models\User;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    private $service;
    public function __construct(ReportService $service) { $this->service = $service; }

    /** GET /api/reports/daily-snapshot */
    public function dailySnapshot(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->isEmployee()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }
        return response()->json($this->service->dailySnapshot());
    }

    /** GET /api/reports/attendance-summary */
    public function attendanceSummary(Request $request): JsonResponse
    {
        $auth  = $request->user();
        $start = $request->get('start_date', now()->startOfMonth()->toDateString());
        $end   = $request->get('end_date', now()->toDateString());

        if ($auth->isEmployee()) {
            return response()->json($this->service->userAttendanceSummary($auth, $start, $end));
        }

        if ($auth->isTl()) {
            return response()->json(['team' => $this->service->teamAttendanceSummary($auth, $start, $end)]);
        }

        // CEO
        $userId = $request->get('user_id');
        if ($userId) {
            $user = User::findOrFail($userId);
            return response()->json($this->service->userAttendanceSummary($user, $start, $end));
        }

        return response()->json(['company' => $this->service->companyAttendanceSummary($start, $end)]);
    }

    /** GET /api/reports/leave-summary */
    public function leaveSummary(Request $request): JsonResponse
    {
        $auth   = $request->user();
        $year   = (int) $request->get('year', date('Y'));
        $userId = $request->get('user_id');

        if ($auth->isEmployee()) {
            $userId = $auth->id;
        }

        return response()->json($this->service->leaveSummary($year, $userId ? (int) $userId : null));
    }

    /** GET /api/reports/export - CSV/Excel download */
    public function export(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $start = $request->get('start_date', now()->startOfMonth()->toDateString());
        $end   = $request->get('end_date', now()->toDateString());
        $auth  = $request->user();

        $query = Attendance::with('user')->forDateRange($start, $end)->orderBy('date');

        if ($auth->isEmployee()) {
            $query->where('user_id', $auth->id);
        } elseif ($auth->isManager()) {
            $teamIds = User::where('manager_id', $auth->id)->pluck('id')->push($auth->id);
            $query->whereIn('user_id', $teamIds);
        }

        $records = $query->get();

        $headers = [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"attendance_{$start}_to_{$end}.csv\"",
        ];

        $callback = function () use ($records) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Date', 'Employee ID', 'Name', 'Check In', 'Check Out', 'Status', 'Working Hours', 'Overtime Hours', 'Is Late', 'Late Minutes', 'Work Mode']);
            foreach ($records as $r) {
                fputcsv($handle, [
                    $r->date ? $r->date->toDateString() : null,
                    $r->user ? $r->user->employee_id : null,
                    $r->user ? $r->user->name : null,
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
}
