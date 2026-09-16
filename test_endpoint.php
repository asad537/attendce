<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = \App\Models\User::find(1); // CEO
$request = \Illuminate\Http\Request::create('/api/attendance', 'GET', ['date' => '2026-09-16']);
$request->setUserResolver(function () use ($user) {
    return $user;
});

$controller = $app->make(\App\Http\Controllers\API\AttendanceController::class);
$response = $controller->index($request);
echo $response->getContent();
