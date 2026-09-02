<?php
$content = file_get_contents('app/Http/Controllers/API/ReportController.php');
// Find the tasks section and insert turnover_rate
$search = "// ── Tasks: pending tickets in scope";
$replace = "// ── Turnover Rate ────────────────────────────────────────────────
        $turnoverMonthly = [];
        for (\$i = \$months - 1; \$i >= 0; \$i--) {
            \$m = now()->copy()->subMonths(\$i);
            // Count resignations in this month
            \$resigned = \App\Models\Resignation::where('status', 'approved')
                ->whereYear('last_working_day', \$m->year)
                ->whereMonth('last_working_day', \$m->month)
                ->count();
            // Count active employees (simplified as total active currently)
            // Or better, total users registered before end of that month who haven't resigned by then
            \$activeThisMonth = \App\Models\User::where('status', 'active')->count(); // simplified
            \$turnoverMonthly[] = ['name' => \$m->format('M'), 'left' => \$resigned, 'active' => \$activeThisMonth];
        }

        " . $search;

$content = str_replace($search, $replace, $content);

$search2 = "'attendance_report' => ['rate' => \$attRate, 'delta' => round(\$attRate - \$attPrev, 2), 'heatmap' => \$heatmap],";
$replace2 = $search2 . "\n            'turnover_rate' => ['monthly' => \$turnoverMonthly],";

$content = str_replace($search2, $replace2, $content);
file_put_contents('app/Http/Controllers/API/ReportController.php', $content);
echo "Patched ReportController.php\n";
