<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$atts = \App\Models\Attendance::with('user')->whereDate('date', '2026-09-16')->get();
foreach ($atts as $att) {
    echo "ID: {$att->id}, UserID: {$att->user_id}, UserRole: " . ($att->user ? $att->user->role : 'NULL') . "\n";
}
