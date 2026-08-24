<?php
$path = '/Users/rumaiharana/Documents/React-js/attendance-api/app/Http/Controllers/API/ReportController.php';
$content = file_get_contents($path);

$oldLogic = <<<OLD
        if (\$auth->isManager()) {
            return response()->json(['team' => \$this->service->teamAttendanceSummary(\$auth, \$start, \$end)]);
        }
OLD;

$newLogic = <<<NEW
        if (\$auth->isTl()) {
            return response()->json(['team' => \$this->service->teamAttendanceSummary(\$auth, \$start, \$end)]);
        }
NEW;

$content = str_replace($oldLogic, $newLogic, $content);
file_put_contents($path, $content);
echo "Updated ReportController.php\n";
