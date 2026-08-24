const fs = require('fs');
const path = '/Users/rumaiharana/Documents/React-js/attendance-api/app/Services/ReportService.php';
let content = fs.readFileSync(path, 'utf8');

const originalUserSummary = `    public function userAttendanceSummary(User $user, string $start, string $end): array
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
    }`;

const newUserSummary = `    public function userAttendanceSummary(User $user, string $start, string $end): array
    {
        $startDate = Carbon::parse($start);
        $endDate = Carbon::parse($end);
        
        $totalDays = $startDate->diffInDays($endDate) + 1;
        $workingDaysInPeriod = $startDate->diffInWeekdays($endDate->copy()->addDay());
        
        // Fetch standard attendance records
        $records = Attendance::forUser($user->id)->forDateRange($start, $end)->get();
        
        // Fetch WFM explicitly since it was detached from Attendance
        $wfmDays = \\App\\Models\\WfhRequest::where('user_id', $user->id)
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
        $leaveDays = \\App\\Models\\Leave::where('user_id', $user->id)
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
    }`;

content = content.replace(originalUserSummary, newUserSummary);
fs.writeFileSync(path, content, 'utf8');
console.log('Backend patched');
