<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\InternalNote;
use App\Models\Payroll;
use App\Models\User;
use App\Services\ReportService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeProfileController extends Controller
{
    private $reports;
    public function __construct(ReportService $reports) { $this->reports = $reports; }

    /** GET /api/users/{user}/profile-stats?month=YYYY-MM */
    public function stats(Request $request, User $user): JsonResponse
    {
        $month = $request->validate(['month' => 'nullable|date_format:Y-m'])['month'] ?? now()->format('Y-m');

        return response()->json([
            'work_model'  => $this->workModel($user),
            'performance' => $this->performance($user),
            'hours_week'  => $this->hoursThisWeek($user),
            'calendar'    => $this->calendar($user, $month),
            'payroll'     => $this->payroll($user),
        ]);
    }

    private function workModel(User $user): ?string
    {
        // Prefer the work mode configured on the employee's profile; fall back
        // to whatever their most recent attendance record was logged under.
        $mode = $user->work_mode
            ?: Attendance::where('user_id', $user->id)->whereNotNull('work_mode')->latest('date')->value('work_mode');
        return $mode ? ucfirst(str_replace('_', ' ', $mode)) : null;
    }

    /** Monthly attendance rate across the current year. */
    private function performance(User $user): array
    {
        $year = (int) now()->year;
        $records = Attendance::where('user_id', $user->id)
            ->whereYear('date', $year)
            ->whereIn('status', ['present', 'late'])
            ->get(['date']);

        $presentsByMonth = array_fill(1, 12, 0);
        foreach ($records as $r) {
            $presentsByMonth[(int) Carbon::parse($r->date)->month]++;
        }

        $monthly = [];
        for ($m = 1; $m <= 12; $m++) {
            $monthStart = Carbon::create($year, $m, 1);
            $limit = $monthStart->isFuture() ? $monthStart : ($monthStart->isSameMonth(now()) ? now() : $monthStart->copy()->endOfMonth());
            $weekdays = $monthStart->isFuture() ? 0 : $monthStart->diffInWeekdays($limit->copy()->addDay());
            $value = $weekdays > 0 ? min(100, round($presentsByMonth[$m] / $weekdays * 100, 1)) : 0;
            $monthly[] = ['name' => $monthStart->format('M'), 'value' => $value];
        }

        $current = (int) now()->month;
        $currentValue = $monthly[$current - 1]['value'];
        $prevValue = $current > 1 ? $monthly[$current - 2]['value'] : 0;

        return [
            'current' => $currentValue,
            'delta' => round($currentValue - $prevValue, 2),
            'monthly' => $monthly,
        ];
    }

    /** Working minutes per day for the current week (Mon–Sun). */
    private function hoursThisWeek(User $user): array
    {
        $start = now()->startOfWeek(Carbon::MONDAY);
        $end = now()->endOfWeek(Carbon::SUNDAY);
        $records = Attendance::where('user_id', $user->id)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->get(['date', 'working_minutes']);

        $byDay = [];
        foreach ($records as $r) {
            $byDay[Carbon::parse($r->date)->dayOfWeekIso] = ($byDay[Carbon::parse($r->date)->dayOfWeekIso] ?? 0) + (int) $r->working_minutes;
        }

        $labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        $todayIso = now()->dayOfWeekIso;
        $days = [];
        $total = 0;
        for ($i = 1; $i <= 7; $i++) {
            $minutes = $byDay[$i] ?? 0;
            $total += $minutes;
            $days[] = ['day' => $labels[$i - 1], 'minutes' => $minutes, 'active' => $i === $todayIso];
        }

        return ['total_minutes' => $total, 'days' => $days];
    }

    /** Day-by-day attendance for a month + counts, reusing the report matrix. */
    private function calendar(User $user, string $month): array
    {
        $sheet = $this->reports->attendanceSheet($month, [$user->id]);
        $row = $sheet['rows'][0] ?? ['days' => [], 'totals' => []];

        $counts = ['present' => 0, 'late' => 0, 'on_leave' => 0, 'absent' => 0];
        $days = [];
        foreach ($row['days'] as $cell) {
            $status = null;
            if ($cell['code'] === 'P') { $status = $cell['late'] ? 'late' : 'present'; $cell['late'] ? $counts['late']++ : $counts['present']++; }
            elseif ($cell['code'] === 'L') { $status = 'leave'; $counts['on_leave']++; }
            elseif ($cell['code'] === 'A') { $status = 'absent'; $counts['absent']++; }
            elseif ($cell['code'] === 'W') { $status = 'present'; $counts['present']++; }
            $days[] = ['day' => $cell['day'], 'status' => $status];
        }

        return ['month' => $month, 'days' => $days, 'counts' => $counts];
    }

    private function payroll(User $user): array
    {
        $record = Payroll::where('user_id', $user->id)->latest('payroll_month')->first();
        $base = (float) ($record->base_salary ?? 0);
        $allowances = (float) ($record->allowances ?? 0);
        $incentives = (float) ($record->incentives ?? 0);
        $deductions = (float) ($record->deductions ?? 0);

        return [
            'has_record' => (bool) $record,
            'month' => $record ? Carbon::parse($record->payroll_month)->format('Y-m') : null,
            'base_salary' => $base,
            'allowances' => $allowances,
            'incentives' => $incentives,
            'deductions' => $deductions,
            'overtime_rate' => (float) ($record->overtime_rate ?? 0),
            'total' => $base + $allowances + $incentives - $deductions,
        ];
    }

    // ── Internal notes ──────────────────────────────────────────────────────

    /** GET /api/users/{user}/notes */
    public function notes(User $user): JsonResponse
    {
        $notes = InternalNote::with('author:id,name')->where('user_id', $user->id)->latest()->get()
            ->map(fn ($n) => [
                'id' => $n->id, 'title' => $n->title, 'body' => $n->body,
                'author' => $n->author ? $n->author->name : 'System',
                'created_at' => $n->created_at,
            ]);
        return response()->json(['notes' => $notes]);
    }

    /** POST /api/users/{user}/notes */
    public function storeNote(Request $request, User $user): JsonResponse
    {
        abort_unless(in_array($request->user()->role, ['ceo', 'manager']), 403);
        $data = $request->validate(['title' => 'required|string|max:150', 'body' => 'nullable|string|max:5000']);
        $note = InternalNote::create([
            'user_id' => $user->id, 'author_id' => $request->user()->id,
            'title' => $data['title'], 'body' => $data['body'] ?? '',
        ]);
        return response()->json(['note' => $note->load('author:id,name')], 201);
    }

    /** DELETE /api/notes/{note} */
    public function destroyNote(Request $request, InternalNote $note): JsonResponse
    {
        abort_unless(in_array($request->user()->role, ['ceo', 'manager']), 403);
        $note->delete();
        return response()->json(['message' => 'Note deleted.']);
    }
}
