<?php

use App\Http\Controllers\API\AttendanceController;
use App\Http\Controllers\API\AuditLogController;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\BreakController;
use App\Http\Controllers\API\DepartmentController;
use App\Http\Controllers\API\DesignationController;
use App\Http\Controllers\API\HolidayController;
use App\Http\Controllers\API\LeaveController;
use App\Http\Controllers\API\NotificationController;
use App\Http\Controllers\API\ProjectController;
use App\Http\Controllers\API\ReportController;
use App\Http\Controllers\API\ShiftController;
use App\Http\Controllers\API\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// ── Public ──────────────────────────────────────────────────────────────
Route::post('/login', [AuthController::class, 'login']);

// ── Authenticated ────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/logout',         [AuthController::class, 'logout']);
    Route::get('/me',              [AuthController::class, 'me']);
    Route::post('/me',             [AuthController::class, 'updateProfile']);

    // Attendance
    Route::get('/attendance',               [AttendanceController::class, 'index']);
    Route::get('/attendance/today',         [AttendanceController::class, 'today']);
    Route::get('/attendance/team-status',   [AttendanceController::class, 'teamStatus']);
    Route::get('/attendance/{id}',          [AttendanceController::class, 'show']);
    Route::post('/attendance/check-in',     [AttendanceController::class, 'checkIn']);
    Route::post('/attendance/check-out',    [AttendanceController::class, 'checkOut']);

    // Breaks
    Route::post('/breaks/start', [BreakController::class, 'start']);
    Route::post('/breaks/end',   [BreakController::class, 'end']);

    // Leaves
    Route::get('/leaves/balances',       [LeaveController::class, 'balances']);
    Route::get('/leaves/pending-count',  [LeaveController::class, 'pendingCount']);
    Route::get('/leaves',                [LeaveController::class, 'index']);
    Route::post('/leaves',               [LeaveController::class, 'store']);
    Route::get('/leaves/{leave}',        [LeaveController::class, 'show']);
    Route::post('/leaves/{leave}/manager-review', [LeaveController::class, 'managerReview']);
    Route::post('/leaves/{leave}/ceo-review',     [LeaveController::class, 'ceoReview']);
    Route::post('/leaves/{leave}/cancel',         [LeaveController::class, 'cancel']);

    // Users
    Route::get('/users',           [UserController::class, 'index']);
    Route::post('/users',          [UserController::class, 'store']);
    Route::get('/users/{user}',    [UserController::class, 'show']);
    Route::put('/users/{user}',    [UserController::class, 'update']);
    Route::delete('/users/{user}', [UserController::class, 'destroy']);

    // Projects — employees cannot create or access projects.
    Route::get('/projects',  [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::put('/projects/{project}', [ProjectController::class, 'update']);

    // Departments (CEO only via policy)
    Route::get('/departments',                [DepartmentController::class, 'index']);
    Route::post('/departments',               [DepartmentController::class, 'store']);
    Route::get('/departments/{department}',   [DepartmentController::class, 'show']);
    Route::put('/departments/{department}',   [DepartmentController::class, 'update']);
    Route::delete('/departments/{department}',[DepartmentController::class, 'destroy']);

    // Designations
    Route::get('/designations',                   [DesignationController::class, 'index']);
    Route::post('/designations',                  [DesignationController::class, 'store']);
    Route::put('/designations/{designation}',     [DesignationController::class, 'update']);
    Route::delete('/designations/{designation}',  [DesignationController::class, 'destroy']);

    // Shifts
    Route::get('/shifts',           [ShiftController::class, 'index']);
    Route::post('/shifts',          [ShiftController::class, 'store']);
    Route::get('/shifts/{shift}',   [ShiftController::class, 'show']);
    Route::put('/shifts/{shift}',   [ShiftController::class, 'update']);
    Route::delete('/shifts/{shift}',[ShiftController::class, 'destroy']);

    // Holidays
    Route::get('/holidays',              [HolidayController::class, 'index']);
    Route::get('/holidays/upcoming',     [HolidayController::class, 'upcoming']);
    Route::post('/holidays',             [HolidayController::class, 'store']);
    Route::put('/holidays/{holiday}',    [HolidayController::class, 'update']);
    Route::delete('/holidays/{holiday}', [HolidayController::class, 'destroy']);

    // Reports
    Route::get('/reports/daily-snapshot',    [ReportController::class, 'dailySnapshot']);
    Route::get('/reports/attendance-summary',[ReportController::class, 'attendanceSummary']);
    Route::get('/reports/leave-summary',     [ReportController::class, 'leaveSummary']);
    Route::get('/reports/export',            [ReportController::class, 'export']);

    // Notifications
    Route::get('/notifications',              [NotificationController::class, 'index']);
    Route::post('/notifications/{id}/read',   [NotificationController::class, 'markRead']);
    Route::post('/notifications/read-all',    [NotificationController::class, 'markAllRead']);
    Route::delete('/notifications/{id}',      [NotificationController::class, 'destroy']);

    // Audit Logs (CEO only)
    Route::get('/audit-logs', [AuditLogController::class, 'index']);
});
