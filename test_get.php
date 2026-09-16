<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$atts = \App\Models\Attendance::get()->toArray();
echo json_encode($atts, JSON_PRETTY_PRINT);
