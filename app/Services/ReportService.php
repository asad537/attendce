<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\Holiday;
use App\Models\Leave;
use App\Models\ProjectTicket;
use App\Models\TicketWorklog;
use App\Models\User;
use App\Models\WfhRequest;
use Carbon\Carbon;

class ReportService
{
    /**
     * Attendance summary for a user over a date range
     */
    public function userAttendanceSummary(User $user, string $start, string $end): array
    {
        $startDate = Carbon::parse($start);
        $endDate = Carbon::parse($end);
        
        $totalDays = $startDate->diffInDays($endDate) + 1;
        $workingDaysInPeriod = $startDate->diffInWeekdays($endDate->copy()->addDay());
        
        // Fetch standard attendance records
        $records = Attendance::forUser($user->id)->forDateRange($start, $end)->get();
        
        // Fetch WFM explicitly since it was detached from Attendance
        $wfmDays = \App\Models\WfhRequest::where('user_id', $user->id)
            ->where('status', 'approved')
            ->where('start_date', '<=', $end)
            ->where('end_date', '>=', $start)
            ->get()
            ->sum(function($wfh) use ($start, $end) {
                // Calculate overlapping days
                $wStart = max(Carbon::parse($start), Carbon::parse($wfh->start_date));
                $wEnd = min(Carbon::parse($end), Carbon::parse($wfh->end_date));
                if ($wStart->greaterThan($wEnd)) return 0;
                
                // Count weekdays in range
                $days = $wStart->diffInWeekdays($wEnd->copy()->addDay());
                return $wfh->is_half_day ? min($days, 0.5) : $days;
            });

        // Fetch Leaves
        $leaveDays = \App\Models\Leave::where('user_id', $user->id)
            ->where('status', 'approved')
            ->where('start_date', '<=', $end)
            ->where('end_date', '>=', $start)
            ->get()
            ->sum(function($l) use ($start, $end) {
                $lStart = max(Carbon::parse($start), Carbon::parse($l->start_date));
                $lEnd = min(Carbon::parse($end), Carbon::parse($l->end_date));
                if ($lStart->greaterThan($lEnd)) return 0;
                return $lStart->diffInWeekdays($lEnd->copy()->addDay());
            });

        // Actual checked-in presents (excluding weekends)
        $presentsExcludingWeekends = $records->filter(function($r) {
            return !Carbon::parse($r->date)->isWeekend() && in_array($r->status, ['present', 'late']);
        })->count();
        
        $totalPresents = $records->whereIn('status', ['present', 'late'])->count();

        // Project delivery metrics use the same selected report period.
        $assignedTickets = ProjectTicket::where('assignee_id', $user->id)
            ->whereDate('created_at', '<=', $end)
            ->count();
        $completedTickets = ProjectTicket::where('assignee_id', $user->id)
            ->where('status', 'done')
            ->whereBetween('updated_at', [$startDate->copy()->startOfDay(), $endDate->copy()->endOfDay()])
            ->count();
        $inProgressTickets = ProjectTicket::where('assignee_id', $user->id)
            ->whereIn('status', ['in_progress', 'in_review'])
            ->whereDate('created_at', '<=', $end)
            ->count();
        $overdueTickets = ProjectTicket::where('assignee_id', $user->id)
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', ($endDate->lessThan(now()) ? $endDate : now())->toDateString())
            ->where('status', '!=', 'done')
            ->count();
        $ticketWorkMinutes = TicketWorklog::where('user_id', $user->id)
            ->whereBetween('created_at', [$startDate->copy()->startOfDay(), $endDate->copy()->endOfDay()])
            ->sum('time_spent');

        return [
            'user'            => array_merge(
                $user->only(['id', 'name', 'employee_id', 'role']),
                [
                    'department' => $user->department ? $user->department->only(['id', 'name']) : null,
                    'designation' => $user->designation ? $user->designation->only(['id', 'name']) : null,
                ]
            ),
            'period'          => ['start' => $start, 'end' => $end],
            'total_days'      => $totalDays,
            'working_days_in_period' => $workingDaysInPeriod,
            'present'         => $totalPresents,
            'absent'          => $records->where('status', 'absent')->count(),
            'late'            => $records->where('status', 'late')->count(),
            'on_leave'        => $leaveDays,
            'work_from_home'  => $wfmDays,
            'days_worked_excl_weekends' => $presentsExcludingWeekends + $wfmDays,
            'total_working_hours'  => round($records->sum('working_minutes') / 60, 2),
            'total_overtime_hours' => round($records->sum('overtime_minutes') / 60, 2),
            'avg_working_hours'    => $records->count() > 0
                ? round($records->avg('working_minutes') / 60, 2)
                : 0,
            'assigned_tickets'     => $assignedTickets,
            'completed_tickets'    => $completedTickets,
            'in_progress_tickets'  => $inProgressTickets,
            'overdue_tickets'      => $overdueTickets,
            'ticket_worklog_hours' => round($ticketWorkMinutes / 60, 2),
        ];
    }

    /**
     * Day-by-day attendance sheet (matrix) for a month.
     * Each user gets a status for every day: P present, A absent, L leave,
     * W work-from-home, H holiday, WE weekend, '' for future days.
     *
     * @param  array|null  $userIds  limit to these users (null = all active)
     */
    public function attendanceSheet(string $month, ?array $userIds = null): array
    {
        $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        $end = $start->copy()->endOfMonth();
        $daysInMonth = (int) $end->day;
        $todayStr = today()->toDateString();

        $users = User::active()
            ->when($userIds !== null, fn ($q) => $q->whereIn('id', $userIds))
            ->with('department:id,name')
            ->orderBy('name')->get();
        $ids = $users->pluck('id')->all();

        // Attendance rows indexed [user_id][day].
        $byUserDay = [];
        foreach (Attendance::whereIn('user_id', $ids)->whereBetween('date', [$start->toDateString(), $end->toDateString()])->get(['user_id', 'date', 'status', 'is_late', 'work_mode']) as $r) {
            $byUserDay[$r->user_id][(int) Carbon::parse($r->date)->day] = $r;
        }

        // Approved leave / WFH day-sets indexed [user_id][day].
        $leaveDays = $this->rangeDaysByUser(Leave::whereIn('user_id', $ids)->where('status', 'approved'), $start, $end);
        $wfhDays = $this->rangeDaysByUser(WfhRequest::whereIn('user_id', $ids)->where('status', 'approved'), $start, $end);

        // Payroll (net salary) for the month, indexed by user.
        $payrolls = \App\Models\Payroll::whereIn('user_id', $ids)->whereDate('payroll_month', $start->toDateString())->get()->keyBy('user_id');

        // Holidays -> set of day numbers (with names).
        $holidays = [];
        foreach (Holiday::whereDate('date', '<=', $end->toDateString())->get(['name', 'date', 'end_date']) as $h) {
            $hStart = Carbon::parse($h->date);
            $hEnd = $h->end_date ? Carbon::parse($h->end_date) : $hStart;
            for ($d = $hStart->copy(); $d->lte($hEnd); $d->addDay()) {
                if ($d->between($start, $end)) $holidays[(int) $d->day] = $h->name;
            }
        }

        // Header meta for each day of the month.
        $dayMeta = [];
        for ($n = 1; $n <= $daysInMonth; $n++) {
            $date = $start->copy()->day($n);
            $dayMeta[] = [
                'day' => $n,
                'weekday' => $date->format('D')[0],
                'is_weekend' => $date->isWeekend(),
                'is_holiday' => isset($holidays[$n]),
                'holiday' => $holidays[$n] ?? null,
            ];
        }

        $rows = $users->map(function ($user) use ($byUserDay, $leaveDays, $wfhDays, $holidays, $start, $daysInMonth, $todayStr, $payrolls) {
            $days = [];
            $totals = ['present' => 0, 'absent' => 0, 'leave' => 0, 'wfh' => 0, 'holiday' => 0, 'late' => 0];
            for ($n = 1; $n <= $daysInMonth; $n++) {
                $date = $start->copy()->day($n);
                $rec = $byUserDay[$user->id][$n] ?? null;
                $late = false;
                if (isset($holidays[$n])) { $code = 'H'; $totals['holiday']++; }
                elseif (isset($leaveDays[$user->id][$n])) { $code = 'L'; $totals['leave']++; }
                elseif (isset($wfhDays[$user->id][$n])) { $code = 'W'; $totals['wfh']++; }
                elseif ($rec && $rec->work_mode === 'weekend') { $code = 'WOD'; $totals['present']++; }
                elseif ($rec && $rec->work_mode === 'remote') { $code = 'W'; $totals['wfh']++; }
                elseif ($rec && in_array($rec->status, ['present', 'late'])) { $code = 'P'; $totals['present']++; $late = (bool) $rec->is_late; if ($late) $totals['late']++; }
                elseif ($rec && $rec->status === 'on_leave') { $code = 'L'; $totals['leave']++; }
                elseif ($date->isWeekend()) { $code = 'WE'; }
                elseif ($date->toDateString() > $todayStr) { $code = ''; }
                else { $code = 'A'; $totals['absent']++; }
                $days[] = ['day' => $n, 'code' => $code, 'late' => $late];
            }
            $pr = $payrolls->get($user->id);
            $salary = $pr ? ((float) $pr->base_salary + (float) $pr->allowances + (float) $pr->incentives - (float) $pr->deductions) : 0;
            return [
                'user' => array_merge($user->only(['id', 'name', 'employee_id', 'role']), ['department' => optional($user->department)->name]),
                'days' => $days,
                'totals' => $totals,
                'salary' => $salary,
            ];
        })->values()->toArray();

        return [
            'month' => $month,
            'days_in_month' => $daysInMonth,
            'day_meta' => $dayMeta,
            'rows' => $rows,
        ];
    }

    /**
     * Expand approved date-range requests into [user_id][day] => true for the month.
     */
    private function rangeDaysByUser($query, Carbon $start, Carbon $end): array
    {
        $out = [];
        foreach ($query->where('start_date', '<=', $end->toDateString())->where('end_date', '>=', $start->toDateString())->get(['user_id', 'start_date', 'end_date']) as $req) {
            $rStart = Carbon::parse($req->start_date)->max($start);
            $rEnd = Carbon::parse($req->end_date)->min($end);
            for ($d = $rStart->copy(); $d->lte($rEnd); $d->addDay()) {
                $out[$req->user_id][(int) $d->day] = true;
            }
        }
        return $out;
    }

    /**
     * Team attendance for a manager
     */
    public function teamAttendanceSummary(User $manager, string $start, string $end): array
    {
        $team = User::where('manager_id', $manager->id)->active()->get();

        return $team->map(fn ($u) => $this->userAttendanceSummary($u, $start, $end))->toArray();
    }

    /**
     * Company-wide attendance summary (CEO)
     */
    public function companyAttendanceSummary(string $start, string $end): array
    {
        // The CEO is the viewer, not a tracked employee — leave them out of the list.
        $users = User::active()->where('role', '!=', 'ceo')->get();
        return $users->map(fn ($u) => $this->userAttendanceSummary($u, $start, $end))->toArray();
    }

    /**
     * Daily status snapshot for today
     */
    public function dailySnapshot(): array
    {
        $today = today()->toDateString();
        $users = User::active()->with(['todayAttendance'])->get();

        $snapshot = [
            'date'          => $today,
            'total'         => $users->count(),
            'working'       => 0,
            'on_break'      => 0,
            'checked_out'   => 0,
            'absent'        => 0,
            'on_leave'      => 0,
            'work_from_home'=> 0,
            'employees'     => [],
        ];

        foreach ($users as $user) {
            $status = $user->current_status;
            if (isset($snapshot[$status])) $snapshot[$status]++;
            elseif ($status === 'working') $snapshot['working']++;
            else $snapshot['absent']++;

            $snapshot['employees'][] = [
                'id'     => $user->id,
                'name'   => $user->name,
                'role'   => $user->role,
                'status' => $status,
                'check_in'  => $user->todayAttendance ? $user->todayAttendance->check_in : null,
                'check_out' => $user->todayAttendance ? $user->todayAttendance->check_out : null,
            ];
        }

        return $snapshot;
    }

    /**
     * Leave summary per user
     */
    public function leaveSummary(int $year, ?int $userId = null): array
    {
        $query = Leave::with(['user', 'leaveType'])
            ->whereYear('start_date', $year)
            ->where('status', 'approved');

        if ($userId) {
            $query->where('user_id', $userId);
        }

        return $query->get()->groupBy('user_id')->map(function ($leaves, $userId) {
            $user = $leaves->first()->user;
            return [
                'user'   => $user->only(['id', 'name', 'employee_id']),
                'total_days_taken' => $leaves->sum('days_requested'),
                'by_type' => $leaves->groupBy('leave_type_id')->map(fn ($l) => [
                    'type' => $l->first()->leaveType->name,
                    'days' => $l->sum('days_requested'),
                ])->values(),
            ];
        })->values()->toArray();
    }

    public function leaveSummaryForUsers(int $year, array $userIds): array
    {
        $query = Leave::with(['user', 'leaveType'])
            ->whereYear('start_date', $year)
            ->where('status', 'approved')
            ->whereIn('user_id', $userIds);

        return $this->formatLeaveSummary($query->get());
    }

    private function formatLeaveSummary($leaves): array
    {
        return $leaves->groupBy('user_id')->map(function ($userLeaves) {
            $user = $userLeaves->first()->user;
            return [
                'user' => $user->only(['id', 'name', 'employee_id']),
                'total_days_taken' => $userLeaves->sum('days_requested'),
                'by_type' => $userLeaves->groupBy('leave_type_id')->map(fn ($items) => [
                    'type' => $items->first()->leaveType->name,
                    'days' => $items->sum('days_requested'),
                ])->values(),
            ];
        })->values()->toArray();
    }
}
