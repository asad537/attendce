<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$atts = \App\Models\Attendance::where('date', '2026-09-16')->get()->toArray();
print_r($atts);
