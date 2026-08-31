<?php

use App\Http\Controllers\API\AttendanceController;
use App\Http\Controllers\API\AuditLogController;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\BreakController;
use App\Http\Controllers\API\DepartmentController;
use App\Http\Controllers\API\DesignationController;
use App\Http\Controllers\API\HolidayController;
use App\Http\Controllers\API\LeaveController;
use App\Http\Controllers\API\WfhRequestController;
use App\Http\Controllers\API\NotificationController;
use App\Http\Controllers\API\ProjectController;
use App\Http\Controllers\API\ProjectTicketController;
use App\Http\Controllers\API\TicketActivityController;
use App\Http\Controllers\API\ReportController;
use App\Http\Controllers\API\ShiftController;
use App\Http\Controllers\API\UserController;
use App\Http\Controllers\API\UserTicketController;
use App\Http\Controllers\API\MessageController;
use App\Http\Controllers\API\CallController;
use App\Http\Controllers\API\SettingController;
use App\Http\Controllers\API\EmployeeProfileController;
use App\Http\Controllers\API\ResignationController;
use App\Http\Controllers\API\PayrollController;
use App\Http\Controllers\API\SidebarController;
use App\Http\Controllers\API\CalendarEventController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// ── Public ──────────────────────────────────────────────────────────────
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::get('/users/{user}/avatar', [UserController::class, 'avatar'])
    ->middleware(['signed:relative', 'throttle:60,1'])
    ->name('users.avatar');

// ── Authenticated ────────────────────────────────────────────────────────
Route::middleware(['auth:sanctum', 'active'])->group(function () {

    // Auth & Sidebar Counts
    Route::post('/logout',         [AuthController::class, 'logout']);
    Route::get('/me',              [AuthController::class, 'me']);
    Route::post('/me',             [AuthController::class, 'updateProfile']);
    Route::get('/sidebar/counts',  [SidebarController::class, 'counts']);
    Route::get('/calendar-events', [CalendarEventController::class, 'index']);
    Route::post('/calendar-events', [CalendarEventController::class, 'store']);
    Route::put('/calendar-events/{calendarEvent}', [CalendarEventController::class, 'update']);
    Route::delete('/calendar-events/{calendarEvent}', [CalendarEventController::class, 'destroy']);

    // Internal inbox
    Route::get('/messages',                    [MessageController::class, 'index']);
    Route::get('/messages/recipients',         [MessageController::class, 'recipients']);
    Route::get('/messages/conversations',      [MessageController::class, 'conversations']);
    Route::get('/messages/thread/{user}',      [MessageController::class, 'thread']);
    Route::post('/messages/typing',            [MessageController::class, 'typing']);
    Route::get('/messages/typing/{user}',      [MessageController::class, 'typingStatus']);
    Route::post('/messages',                   [MessageController::class, 'store']);
    Route::patch('/messages/{message}',        [MessageController::class, 'update']);
    Route::delete('/messages/{message}',       [MessageController::class, 'destroy']);

    // Resignations
    Route::get('/resignations',                       [ResignationController::class, 'index']);
    Route::post('/resignations',                      [ResignationController::class, 'store']);
    Route::post('/resignations/{resignation}/review', [ResignationController::class, 'review']);
    Route::post('/resignations/{resignation}/withdraw', [ResignationController::class, 'withdraw']);

    // Calls (WebRTC signalling over polling)
    Route::post('/calls/signal',               [CallController::class, 'signal']);
    Route::get('/calls/poll',                  [CallController::class, 'poll']);

    // Organisation settings (currency + theme accent)
    Route::get('/settings',                    [SettingController::class, 'index']);
    Route::put('/settings',                    [SettingController::class, 'update']);

    Route::get('/payroll',                     [PayrollController::class, 'index']);
    Route::put('/payroll/{user}',              [PayrollController::class, 'update']);

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
    Route::get('/leaves/{leave}/attachment', [LeaveController::class, 'downloadAttachment']);
    Route::post('/leaves/{leave}/manager-review', [LeaveController::class, 'managerReview']);
    Route::post('/leaves/{leave}/ceo-review',     [LeaveController::class, 'ceoReview']);
    Route::post('/leaves/{leave}/cancel',         [LeaveController::class, 'cancel']);

    // Users
    Route::get('/users',           [UserController::class, 'index']);
    Route::post('/users',          [UserController::class, 'store']);
    Route::get('/users/{user}',    [UserController::class, 'show']);
    Route::put('/users/{user}',    [UserController::class, 'update']);
    Route::delete('/users/{user}', [UserController::class, 'destroy']);
    Route::get('/users/{user}/profile-stats', [EmployeeProfileController::class, 'stats']);
    Route::get('/users/{user}/notes',      [EmployeeProfileController::class, 'notes']);
    Route::post('/users/{user}/notes',     [EmployeeProfileController::class, 'storeNote']);
    Route::delete('/notes/{note}',         [EmployeeProfileController::class, 'destroyNote']);
    Route::get('/users/{user}/documents', [\App\Http\Controllers\API\UserDocumentController::class, 'index']);
    Route::post('/users/{user}/documents', [\App\Http\Controllers\API\UserDocumentController::class, 'store']);
    Route::get('/documents/{document}/download', [\App\Http\Controllers\API\UserDocumentController::class, 'download']);
    Route::delete('/documents/{document}', [\App\Http\Controllers\API\UserDocumentController::class, 'destroy']);
    
    // Employee Satisfaction Ratings
    Route::get('/satisfaction-ratings/company-overall', [\App\Http\Controllers\API\EmployeeSatisfactionRatingController::class, 'companyOverall']);
    Route::get('/users/{user}/satisfaction-ratings', [\App\Http\Controllers\API\EmployeeSatisfactionRatingController::class, 'index']);
    Route::post('/satisfaction-ratings', [\App\Http\Controllers\API\EmployeeSatisfactionRatingController::class, 'store']);

    // Projects — employees cannot create or access projects.
    Route::get('/my-tickets', [UserTicketController::class, 'myTickets']);
    Route::post('/my-tickets/mark-seen', [UserTicketController::class, 'markSeen']);
    
    Route::get('/projects',  [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::put('/projects/{project}', [ProjectController::class, 'update']);
    Route::get('/projects/{project}/tickets', [ProjectTicketController::class, 'index']);
    Route::post('/projects/{project}/tickets', [ProjectTicketController::class, 'store']);
    Route::put('/tickets/{ticket}', [ProjectTicketController::class, 'update']);
    Route::delete('/tickets/{ticket}', [ProjectTicketController::class, 'destroy']);
    Route::post('/tickets/{ticket}/attachment', [ProjectTicketController::class, 'uploadAttachment']);
    Route::get('/tickets/{ticket}/attachment', [ProjectTicketController::class, 'downloadAttachment']);
    Route::get('/tickets/{ticket}/watch', [ProjectTicketController::class, 'watchStatus']);
    Route::post('/tickets/{ticket}/watch', [ProjectTicketController::class, 'toggleWatch']);
    Route::get('/tickets/{ticket}/subtasks', [ProjectTicketController::class, 'subtasks']);
    Route::post('/tickets/{ticket}/subtasks', [ProjectTicketController::class, 'addSubtask']);
    Route::put('/ticket-subtasks/{subtask}', [ProjectTicketController::class, 'updateSubtask']);
    Route::get('/tickets/{ticket}/activity', [TicketActivityController::class, 'activity']);
    Route::post('/tickets/{ticket}/comments', [TicketActivityController::class, 'storeComment']);
    Route::post('/tickets/{ticket}/worklogs', [TicketActivityController::class, 'storeWorklog']);

    // Departments (CEO only via policy)
    Route::get('/departments',                [DepartmentController::class, 'index']);
    Route::post('/departments',               [DepartmentController::class, 'store'])->middleware('can:manage-organization');
    Route::get('/departments/{department}',   [DepartmentController::class, 'show']);
    Route::put('/departments/{department}',   [DepartmentController::class, 'update'])->middleware('can:manage-organization');
    Route::delete('/departments/{department}',[DepartmentController::class, 'destroy'])->middleware('can:manage-organization');

    // Designations
    Route::get('/designations',                   [DesignationController::class, 'index']);
    Route::post('/designations',                  [DesignationController::class, 'store']);
    Route::put('/designations/{designation}',     [DesignationController::class, 'update']);
    Route::delete('/designations/{designation}',  [DesignationController::class, 'destroy']);

    // Shifts
    Route::get('/shifts',           [ShiftController::class, 'index']);
    Route::post('/shifts',          [ShiftController::class, 'store'])->middleware('can:manage-organization');
    Route::get('/shifts/{shift}',   [ShiftController::class, 'show']);
    Route::put('/shifts/{shift}',   [ShiftController::class, 'update'])->middleware('can:manage-organization');
    Route::delete('/shifts/{shift}',[ShiftController::class, 'destroy'])->middleware('can:manage-organization');

    // WFH Requests
    Route::get('/wfh',                       [WfhRequestController::class, 'index']);
    Route::post('/wfh',                      [WfhRequestController::class, 'store']);
    Route::get('/wfh/pending-count',         [WfhRequestController::class, 'pendingCount']);
    Route::post('/wfh/{wfhRequest}/review',  [WfhRequestController::class, 'review']);
    Route::post('/wfh/{wfhRequest}/cancel',  [WfhRequestController::class, 'cancel']);
    // Holidays
    Route::get('/holidays',              [HolidayController::class, 'index']);
    Route::get('/holidays/upcoming',     [HolidayController::class, 'upcoming']);
    Route::post('/holidays',             [HolidayController::class, 'store'])->middleware('can:manage-organization');
    Route::put('/holidays/{holiday}',    [HolidayController::class, 'update'])->middleware('can:manage-organization');
    Route::delete('/holidays/{holiday}', [HolidayController::class, 'destroy'])->middleware('can:manage-organization');

    // Reports
    Route::get('/reports/dashboard-stats',    [ReportController::class, 'dashboardStats']);
    Route::get('/reports/attendance-sheet',   [ReportController::class, 'attendanceSheet']);
    Route::post('/reports/attendance-sheet/cell', [ReportController::class, 'updateAttendanceCell']);
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
    Route::get('/audit-logs', [AuditLogController::class, 'index'])->middleware('can:view-audit-logs');
});
