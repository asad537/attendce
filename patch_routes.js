const fs = require('fs');

const path = '/Users/rumaiharana/Documents/React-js/attendance-api/routes/api.php';
let content = fs.readFileSync(path, 'utf8');

const useStmt = "use App\\Http\\Controllers\\API\\WfhRequestController;";
if (!content.includes(useStmt)) {
    content = content.replace(
        "use App\\Http\\Controllers\\API\\LeaveController;",
        "use App\\Http\\Controllers\\API\\LeaveController;\nuse App\\Http\\Controllers\\API\\WfhRequestController;"
    );
}

const wfhRoutes = `
    // WFH Routes
    Route::get('/wfh/pending-count', [WfhRequestController::class, 'pendingCount']);
    Route::get('/wfh',               [WfhRequestController::class, 'index']);
    Route::post('/wfh',              [WfhRequestController::class, 'store']);
    Route::post('/wfh/{wfhRequest}/review', [WfhRequestController::class, 'review']);
    Route::post('/wfh/{wfhRequest}/cancel', [WfhRequestController::class, 'cancel']);
`;

if (!content.includes("Route::get('/wfh'")) {
    content = content.replace(
        "// Leave Management",
        wfhRoutes + "\n\n    // Leave Management"
    );
    fs.writeFileSync(path, content, 'utf8');
}
