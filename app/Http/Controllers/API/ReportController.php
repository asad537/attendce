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
        $cacheKey = 'daily_snapshot_' . date('Y-m-d');
        $snapshot = \Illuminate\Support\Facades\Cache::remember($cacheKey, 30, function() {
            return $this->service->dailySnapshot();
        });
        return response()->json($snapshot);
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
            $cacheKey = "att_summary_tl_{$auth->id}_{$start}_{$end}";
            $res = \Illuminate\Support\Facades\Cache::remember($cacheKey, 45, function() use ($auth, $start, $end) {
                return ['team' => $this->service->teamAttendanceSummary($auth, $start, $end)];
            });
            return response()->json($res);
        }

        // Manager and CEO → whole company
        $userId = $request->get('user_id');
        if ($userId) {
            $user = User::findOrFail($userId);
            return response()->json($this->service->userAttendanceSummary($user, $start, $end));
        }

        $cacheKey = "att_summary_company_{$start}_{$end}";
        $res = \Illuminate\Support\Facades\Cache::remember($cacheKey, 45, function() use ($start, $end) {
            return ['company' => $this->service->companyAttendanceSummary($start, $end)];
        });
        return response()->json($res);
    }

    /** POST /api/reports/attendance-sheet/cell — set one employee's status for a day */
    public function updateAttendanceCell(Request $request): JsonResponse
    {
        abort_unless(in_array($request->user()->role, ['ceo', 'manager']), 403, 'Not allowed.');

        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'date' => 'required|date',
            'status' => 'required|in:present,late,on_leave,absent,work_from_home,holiday',
        ]);

        // A holiday is organisation-wide — mark the whole date.
        if ($data['status'] === 'holiday') {
            \App\Models\Holiday::firstOrCreate(['date' => $data['date']], ['name' => 'Holiday', 'type' => 'public']);
            return response()->json(['ok' => true]);
        }

        if ($data['status'] === 'absent') {
            Attendance::where('user_id', $data['user_id'])->whereDate('date', $data['date'])->delete();
        } elseif ($data['status'] === 'work_from_home') {
            Attendance::updateOrCreate(
                ['user_id' => $data['user_id'], 'date' => $data['date']],
                ['status' => 'present', 'is_late' => false, 'work_mode' => 'remote']
            );
        } else {
            Attendance::updateOrCreate(
                ['user_id' => $data['user_id'], 'date' => $data['date']],
                ['status' => $data['status'], 'is_late' => $data['status'] === 'late', 'work_mode' => 'office']
            );
        }

        return response()->json(['ok' => true]);
    }

    /** GET /api/reports/dashboard-stats — dynamic widgets for the dashboard */
    public function dashboardStats(Request $request): JsonResponse
    {
        $auth = $request->user();
        abort_if($auth->isEmployee(), 403, 'Forbidden.');

        // CEO sees the whole company; manager / team lead see their team.
        $users = $auth->isCeo()
            ? \App\Models\User::active()->get(['id', 'employment_type'])
            : \App\Models\User::active()->where('manager_id', $auth->id)->get(['id', 'employment_type']);
        $ids = $users->pluck('id')->all();
        $count = max(1, count($ids));

        // ── Employment status ─────────────────────────────────────────────
        $labels = ['full_time' => 'Full-Time', 'part_time' => 'Part-Time', 'freelance' => 'Freelance', 'internship' => 'Internship', 'contract' => 'Contract'];
        $employmentStatus = $users->groupBy('employment_type')->map(function ($group, $type) use ($users, $labels) {
            return [
                'type' => $labels[$type] ?? ucfirst(str_replace('_', ' ', (string) $type)),
                'count' => $group->count(),
                'percent' => $users->count() ? round($group->count() / $users->count() * 100) : 0,
            ];
        })->values();

        // ── Team performance: attendance rate over the last N months ──────
        $months = in_array((int) $request->query('months'), [3, 6, 12], true) ? (int) $request->query('months') : 6;
        $monthly = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $m = now()->copy()->subMonths($i);
            $monthStart = $m->copy()->startOfMonth();
            $limit = $m->isSameMonth(now()) ? now() : $monthStart->copy()->endOfMonth();
            $weekdays = $monthStart->diffInWeekdays($limit->copy()->addDay());
            $presents = \App\Models\Attendance::whereIn('user_id', $ids)->whereIn('status', ['present', 'late'])
                ->whereYear('date', $m->year)->whereMonth('date', $m->month)->count();
            $expected = max(1, $weekdays * $count);
            $monthly[] = ['name' => $m->format('M'), 'value' => min(100, round($presents / $expected * 100, 1))];
        }
        $current = end($monthly)['value'];
        $prev = count($monthly) > 1 ? $monthly[count($monthly) - 2]['value'] : 0;

        // ── Attendance report for the selected period ─────────────────────
        $period = in_array($request->query('period'), ['this_month', 'last_month', 'this_week'], true)
            ? $request->query('period') : 'this_month';
        [$pStart, $pEnd] = $this->periodRange($period);
        [$qStart, $qEnd] = $this->periodRange($period, true);

        // Attendance rate for a date range, capped at today.
        $rateFor = function (Carbon $start, Carbon $end) use ($ids, $count) {
            $limit = $end->isFuture() ? now() : $end;
            $weekdays = $start->copy()->diffInWeekdays($limit->copy()->addDay());
            $presents = \App\Models\Attendance::whereIn('user_id', $ids)->whereIn('status', ['present', 'late'])
                ->whereBetween('date', [$start->toDateString(), $limit->toDateString()])->count();
            return min(100, round($presents / max(1, $weekdays * $count) * 100, 1));
        };
        $attRate = $rateFor($pStart, $pEnd);
        $attPrev = $rateFor($qStart, $qEnd);
        $heatEnd = $pEnd->isFuture() ? now() : $pEnd;

        // ── Attendance heatmap: check-in distribution for the period ──────
        $slots = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30'];
        $grid = array_fill(0, 6, array_fill(1, 5, 0));
        foreach (\App\Models\Attendance::whereIn('user_id', $ids)->whereNotNull('check_in')
            ->whereBetween('date', [$pStart->toDateString(), $heatEnd->toDateString()])->get(['date', 'check_in']) as $rec) {
            $wd = Carbon::parse($rec->date)->dayOfWeekIso;
            if ($wd < 1 || $wd > 5) continue;
            $t = Carbon::parse($rec->check_in);
            $mins = ($t->hour - 8) * 60 + $t->minute;
            $slot = max(0, min(5, intdiv($mins, 30)));
            $grid[$slot][$wd]++;
        }
        $maxCell = 0;
        foreach ($grid as $row) $maxCell = max($maxCell, max($row));
        $heatmap = [];
        foreach ($slots as $idx => $time) {
            $heatmap[] = [
                'time' => $time,
                'mon' => $maxCell ? round($grid[$idx][1] / $maxCell * 100) : 0,
                'tue' => $maxCell ? round($grid[$idx][2] / $maxCell * 100) : 0,
                'wed' => $maxCell ? round($grid[$idx][3] / $maxCell * 100) : 0,
                'thu' => $maxCell ? round($grid[$idx][4] / $maxCell * 100) : 0,
                'fri' => $maxCell ? round($grid[$idx][5] / $maxCell * 100) : 0,
            ];
        }

        // ── Tasks: pending tickets in scope ──────────────────────────────
        $tasks = \App\Models\ProjectTicket::whereIn('assignee_id', $ids)->where('status', '!=', 'done')
            ->with('project:id,name')->orderByRaw('due_date IS NULL, due_date ASC')->limit(4)->get()
            ->map(fn ($t) => [
                'title' => $t->title,
                'category' => optional($t->project)->name ?: 'General',
                'due_date' => $t->due_date,
            ]);

        return response()->json([
            'employment_status' => ['total' => $users->count(), 'breakdown' => $employmentStatus],
            'team_performance' => ['current' => $current, 'delta' => round($current - $prev, 2), 'monthly' => $monthly],
            'attendance_report' => ['rate' => $attRate, 'delta' => round($attRate - $attPrev, 2), 'heatmap' => $heatmap],
            'tasks' => $tasks,
        ]);
    }

    /**
     * Resolve a named period to a [start, end] Carbon range.
     * When $previous is true, returns the immediately-preceding equivalent period.
     */
    private function periodRange(string $period, bool $previous = false): array
    {
        switch ($period) {
            case 'this_week':
                $ref = $previous ? now()->copy()->subWeek() : now();
                return [$ref->copy()->startOfWeek(), $ref->copy()->endOfWeek()];
            case 'last_month':
                $ref = now()->copy()->subMonths($previous ? 2 : 1);
                return [$ref->copy()->startOfMonth(), $ref->copy()->endOfMonth()];
            case 'this_month':
            default:
                $ref = $previous ? now()->copy()->subMonth() : now();
                return [$ref->copy()->startOfMonth(), $ref->copy()->endOfMonth()];
        }
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
