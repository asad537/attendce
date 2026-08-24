<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\Leave;
use App\Models\User;
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
                return $wStart->diffInWeekdays($wEnd->copy()->addDay());
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

        return [
            'user'            => $user->only(['id', 'name', 'employee_id', 'role']),
            'period'          => ['start' => $start, 'end' => $end],
            'total_days'      => $totalDays,
            'working_days_in_period' => $workingDaysInPeriod,
            'present'         => $totalPresents,
            'absent'          => $records->where('status', 'absent')->count(),
            'on_leave'        => $leaveDays,
            'work_from_home'  => $wfmDays,
            'days_worked_excl_weekends' => $presentsExcludingWeekends + $wfmDays,
        ];
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
        $users = User::active()->get();
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
}
