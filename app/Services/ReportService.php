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
        $records = Attendance::forUser($user->id)->forDateRange($start, $end)->get();

        return [
            'user'            => $user->only(['id', 'name', 'employee_id', 'role']),
            'period'          => ['start' => $start, 'end' => $end],
            'total_days'      => $records->count(),
            'present'         => $records->whereIn('status', ['present', 'late', 'work_from_home'])->count(),
            'absent'          => $records->where('status', 'absent')->count(),
            'late'            => $records->where('status', 'late')->count(),
            'on_leave'        => $records->where('status', 'on_leave')->count(),
            'work_from_home'  => $records->where('status', 'work_from_home')->count(),
            'total_working_hours'  => round($records->sum('working_minutes') / 60, 2),
            'total_overtime_hours' => round($records->sum('overtime_minutes') / 60, 2),
            'avg_working_hours'    => $records->count() > 0
                ? round($records->avg('working_minutes') / 60, 2)
                : 0,
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
