const fs = require('fs');
const path = '/Users/rumaiharana/Documents/React-js/attendance-api/app/Models/User.php';
let content = fs.readFileSync(path, 'utf8');

const replacement = `
    public function getCurrentStatusAttribute(): string
    {
        $attendance = $this->todayAttendance()->first();
        if (!$attendance || !$attendance->check_in) {
            $wfh = \\App\\Models\\WfhRequest::where('user_id', $this->id)
                ->where('status', 'approved')
                ->where('start_date', '<=', today())
                ->where('end_date', '>=', today())
                ->exists();
            if ($wfh) return 'work_from_home';
            return 'absent';
        }
        if ($attendance->status === 'on_leave') return 'on_leave';
        if (!$attendance->check_out) {
            $activeBreak = \\App\\Models\\BreakRecord::where('user_id', $this->id)
                ->whereNull('break_end')
                ->first();
            return $activeBreak ? 'on_break' : 'working';
        }
        return 'checked_out';
    }
`;

content = content.replace(/public function getCurrentStatusAttribute\(\): string[\s\S]*?return 'checked_out';\s*\}/, replacement.trim());
fs.writeFileSync(path, content, 'utf8');
