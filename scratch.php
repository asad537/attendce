<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$attendance = \App\Models\Attendance::firstOrNew([
    'user_id' => 2,
    'date' => '2026-09-16',
]);
$attendance->status = 'present';
if (empty($attendance->check_in)) {
    $attendance->check_in = '2026-09-16 09:00:00';
}
$attendance->save();
print_r($attendance->toArray());
