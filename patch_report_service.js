const fs = require('fs');
const path = '/Users/rumaiharana/Documents/React-js/attendance-api/app/Services/ReportService.php';
let content = fs.readFileSync(path, 'utf8');

// Replace WFM query
const wfmRegex = /\/\/ Fetch WFM explicitly[\s\S]*?\}\);/m;
const wfmReplacement = `// Fetch WFM explicitly
        $wfmQuery = \\App\\Models\\WfhRequest::where('user_id', $user->id)
            ->where('start_date', '<=', $end)
            ->where('end_date', '>=', $start)
            ->get();
            
        $wfmDays = $wfmQuery->where('status', 'approved')->sum(function($wfh) use ($start, $end) {
            $wStart = max(\\Carbon\\Carbon::parse($start), \\Carbon\\Carbon::parse($wfh->start_date));
            $wEnd = min(\\Carbon\\Carbon::parse($end), \\Carbon\\Carbon::parse($wfh->end_date));
            if ($wStart->greaterThan($wEnd)) return 0;
            return $wStart->diffInWeekdays($wEnd->copy()->addDay());
        });

        $rejectedWfmDays = $wfmQuery->where('status', 'rejected')->sum(function($wfh) use ($start, $end) {
            $wStart = max(\\Carbon\\Carbon::parse($start), \\Carbon\\Carbon::parse($wfh->start_date));
            $wEnd = min(\\Carbon\\Carbon::parse($end), \\Carbon\\Carbon::parse($wfh->end_date));
            if ($wStart->greaterThan($wEnd)) return 0;
            return $wStart->diffInWeekdays($wEnd->copy()->addDay());
        });`;
content = content.replace(wfmRegex, wfmReplacement);

// Replace Leaves query
const leavesRegex = /\/\/ Fetch Leaves[\s\S]*?\}\);/m;
const leavesReplacement = `// Fetch Leaves
        $leavesQuery = \\App\\Models\\Leave::with('leaveType')
            ->where('user_id', $user->id)
            ->where('start_date', '<=', $end)
            ->where('end_date', '>=', $start)
            ->get();
            
        $leaveDays = $leavesQuery->where('status', 'approved')->sum(function($l) use ($start, $end) {
            $lStart = max(\\Carbon\\Carbon::parse($start), \\Carbon\\Carbon::parse($l->start_date));
            $lEnd = min(\\Carbon\\Carbon::parse($end), \\Carbon\\Carbon::parse($l->end_date));
            if ($lStart->greaterThan($lEnd)) return 0;
            return $lStart->diffInWeekdays($lEnd->copy()->addDay());
        });

        $paidLeaveDays = $leavesQuery->filter(function($l) {
            return $l->status === 'approved' && $l->leaveType && $l->leaveType->is_paid;
        })->sum(function($l) use ($start, $end) {
            $lStart = max(\\Carbon\\Carbon::parse($start), \\Carbon\\Carbon::parse($l->start_date));
            $lEnd = min(\\Carbon\\Carbon::parse($end), \\Carbon\\Carbon::parse($l->end_date));
            if ($lStart->greaterThan($lEnd)) return 0;
            return $lStart->diffInWeekdays($lEnd->copy()->addDay());
        });

        $rejectedLeaveDays = $leavesQuery->where('status', 'rejected')->sum(function($l) use ($start, $end) {
            $lStart = max(\\Carbon\\Carbon::parse($start), \\Carbon\\Carbon::parse($l->start_date));
            $lEnd = min(\\Carbon\\Carbon::parse($end), \\Carbon\\Carbon::parse($l->end_date));
            if ($lStart->greaterThan($lEnd)) return 0;
            return $lStart->diffInWeekdays($lEnd->copy()->addDay());
        });`;
content = content.replace(leavesRegex, leavesReplacement);

// Add to return array
const returnRegex = /'on_leave'\s*=> \$leaveDays,/m;
const returnReplacement = `'on_leave'        => $leaveDays,
            'paid_leaves'     => $paidLeaveDays,
            'rejected_leaves' => $rejectedLeaveDays,
            'rejected_wfm'    => $rejectedWfmDays,`;
content = content.replace(returnRegex, returnReplacement);

fs.writeFileSync(path, content, 'utf8');
console.log('ReportService updated');
