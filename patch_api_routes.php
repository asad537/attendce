<?php
$path = '/Users/rumaiharana/Documents/React-js/attendance-api/routes/api.php';
$content = file_get_contents($path);

$wfhRoutes = <<<'ROUTES'
    // WFH Requests
    Route::get('/wfh',                       [WfhRequestController::class, 'index']);
    Route::post('/wfh',                      [WfhRequestController::class, 'store']);
    Route::get('/wfh/pending-count',         [WfhRequestController::class, 'pendingCount']);
    Route::post('/wfh/{wfhRequest}/review',  [WfhRequestController::class, 'review']);
    Route::post('/wfh/{wfhRequest}/cancel',  [WfhRequestController::class, 'cancel']);

ROUTES;

if (strpos($content, '/wfh') === false) {
    $content = str_replace(
        "    // Holidays\n",
        $wfhRoutes . "    // Holidays\n",
        $content
    );
    file_put_contents($path, $content);
    echo "Added WFH routes to api.php\n";
}
