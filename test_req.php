<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$request = \Illuminate\Http\Request::create('/api/attendance?date=2026-09-16');
$query = \App\Models\Attendance::whereDate('date', '2026-09-16')->count();
echo "Count: $query\n";
