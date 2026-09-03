import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import { PageLoader } from './components/common/LoadingSpinner';

// Pages are lazy-loaded so each route ships its own small chunk instead of one
// ~2 MB bundle — the app boots fast and only downloads a page when it's visited.
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));

const EmployeeDashboard = lazy(() => import('./pages/employee/EmployeeDashboard'));
const AttendanceHistory = lazy(() => import('./pages/employee/AttendanceHistory'));
const LeaveManagement = lazy(() => import('./pages/employee/LeaveManagement'));
const WfhManagement = lazy(() => import('./pages/employee/WfhManagement'));
const RateEmployeesPage = lazy(() => import('./pages/employee/RateEmployeesPage'));

const ManagerDashboard = lazy(() => import('./pages/manager/ManagerDashboard'));
const ManagerLeaveApprovals = lazy(() => import('./pages/manager/ManagerLeaveApprovals'));
const WfhApprovals = lazy(() => import('./pages/manager/WfhApprovals'));
const TeamMembers = lazy(() => import('./pages/shared/TeamMembers'));

const CeoDashboard = lazy(() => import('./pages/ceo/CeoDashboard'));
const CeoAttendance = lazy(() => import('./pages/ceo/CeoAttendance'));
const CeoLeaveApprovals = lazy(() => import('./pages/ceo/CeoLeaveApprovals'));
const CeoEmployees = lazy(() => import('./pages/ceo/CeoEmployees'));
const CeoDepartments = lazy(() => import('./pages/ceo/CeoDepartments'));
const CeoReports = lazy(() => import('./pages/ceo/CeoReports'));
const CeoHolidays = lazy(() => import('./pages/ceo/CeoHolidays'));
const CeoAuditLogs = lazy(() => import('./pages/ceo/CeoAuditLogs'));
const CeoProjects = lazy(() => import('./pages/ceo/CeoProjects'));
const ProjectTickets = lazy(() => import('./pages/ceo/ProjectTickets'));
const MyTickets = lazy(() => import('./pages/shared/MyTickets'));
const AddEditEmployeePage = lazy(() => import('./pages/shared/AddEditEmployeePage'));
const CalendarPage = lazy(() => import('./pages/shared/CalendarPage'));
const EmployeeDetails = lazy(() => import('./pages/shared/EmployeeDetails'));
const InboxPage = lazy(() => import('./pages/shared/InboxPage'));
const SettingsPage = lazy(() => import('./pages/shared/SettingsPage'));
const AttendanceSheetPage = lazy(() => import('./pages/shared/AttendanceSheetPage'));
const ResignationPage = lazy(() => import('./pages/shared/ResignationPage'));
const CeoPayroll = lazy(() => import('./pages/ceo/CeoPayroll'));
const NotificationsPage = lazy(() => import('./pages/shared/NotificationsPage'));

function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;

  const getRootRedirect = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'employee': return '/employee/dashboard';
      case 'tl': return '/tl/dashboard';
      case 'manager': return '/manager/dashboard';
      case 'ceo': return '/ceo/dashboard';
      default: return '/login';
    }
  };

  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={!user ? <LoginPage /> : <Navigate to={getRootRedirect()} replace />}
      />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to={getRootRedirect()} replace />} />

      {/* ── Employee routes (employee only — not CEO, not manager shared) ── */}
      <Route path="/employee" element={<ProtectedRoute allowedRoles={['employee']} />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<EmployeeDashboard />} />
          <Route path="attendance" element={<AttendanceHistory />} />
          <Route path="leaves" element={<LeaveManagement />} />
          <Route path="wfh" element={<WfhManagement />} />
          <Route path="rate-peers" element={<RateEmployeesPage />} />
        </Route>
      </Route>

      {/* ── Manager routes ─────────────────────────────────────────────── */}
      <Route path="/manager" element={<ProtectedRoute allowedRoles={['manager']} />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          {/* Managers now see the richer CEO-style dashboard */}
          <Route path="dashboard" element={<CeoDashboard />} />
          <Route path="attendance" element={<AttendanceHistory />} />
          <Route path="leave-approvals" element={<ManagerLeaveApprovals />} />
          <Route path="my-leaves" element={<LeaveManagement />} />
          <Route path="team" element={<TeamMembers />} />
          <Route path="wfh" element={<WfhManagement />} />
          <Route path="wfh-approvals" element={<WfhApprovals />} />
          <Route path="reports" element={<CeoReports />} />
        </Route>
      </Route>

      {/* ── Team Lead routes ────────────────────────────────────────────── */}
      <Route path="/tl" element={<ProtectedRoute allowedRoles={['tl']} />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          {/* TL uses the same self-service check-in dashboard as employees */}
          <Route path="dashboard" element={<EmployeeDashboard />} />
          <Route path="attendance" element={<AttendanceHistory />} />
          <Route path="leaves" element={<LeaveManagement />} />
          <Route path="team" element={<TeamMembers />} />
          <Route path="my-attendance" element={<AttendanceHistory />} />
          <Route path="my-leaves" element={<LeaveManagement />} />
          <Route path="reports" element={<CeoReports />} />
          <Route path="wfh" element={<WfhManagement />} />
          <Route path="wfh-approvals" element={<WfhApprovals />} />
          <Route path="rate-peers" element={<RateEmployeesPage />} />
        </Route>
      </Route>

      {/* ── CEO routes — NO check-in/out, NO personal leave management ── */}
      <Route path="/ceo" element={<ProtectedRoute allowedRoles={['ceo']} />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<CeoDashboard />} />
          <Route path="attendance" element={<CeoAttendance />} />
          <Route path="leave-approvals" element={<CeoLeaveApprovals />} />
          <Route path="employees" element={<CeoEmployees />} />
          <Route path="wfh-approvals" element={<WfhApprovals />} />
          <Route path="reports" element={<CeoReports />} />
          <Route path="payroll" element={<CeoPayroll />} />
          <Route path="holidays" element={<CeoHolidays />} />
          <Route path="audit-logs" element={<CeoAuditLogs />} />
        </Route>
      </Route>

      <Route path="/projects" element={<ProtectedRoute allowedRoles={['ceo', 'manager', 'tl', 'employee']} />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<div className="p-4 sm:p-6"><CeoProjects /></div>} />
          <Route path=":projectId" element={<ProjectTickets />} />
        </Route>
      </Route>

      <Route path="/departments" element={<ProtectedRoute allowedRoles={['ceo', 'manager', 'tl']} />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<CeoDepartments />} />
        </Route>
      </Route>

      <Route path="/my-tickets" element={<ProtectedRoute allowedRoles={['ceo', 'manager', 'tl', 'employee']} />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<MyTickets />} />
        </Route>
      </Route>

      <Route path="/calendar" element={<ProtectedRoute allowedRoles={['ceo', 'manager', 'tl', 'employee']} />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<CalendarPage />} />
        </Route>
      </Route>

      <Route path="/inbox" element={<ProtectedRoute allowedRoles={['ceo', 'manager', 'tl', 'employee']} />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<InboxPage />} />
        </Route>
      </Route>

      <Route path="/resignation" element={<ProtectedRoute allowedRoles={['ceo', 'manager', 'tl', 'employee']} />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<ResignationPage />} />
        </Route>
      </Route>

      <Route path="/settings" element={<ProtectedRoute allowedRoles={['ceo', 'manager']} />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="/attendance-sheet" element={<ProtectedRoute allowedRoles={['ceo', 'manager', 'tl']} />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<AttendanceSheetPage />} />
        </Route>
      </Route>

      {/* Shared routes for user management */}
      <Route path="/notifications" element={<ProtectedRoute allowedRoles={['ceo', 'manager', 'tl', 'employee']} />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<NotificationsPage />} />
        </Route>
      </Route>

      <Route path="/users" element={<ProtectedRoute allowedRoles={['ceo', 'manager', 'tl']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="new" element={<AddEditEmployeePage />} />
          <Route path=":id/edit" element={<AddEditEmployeePage />} />
          <Route path=":id/details" element={<EmployeeDetails />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}

export default App;
