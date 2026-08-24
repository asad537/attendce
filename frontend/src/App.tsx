import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import { PageLoader } from './components/common/LoadingSpinner';

// Auth
import LoginPage from './pages/auth/LoginPage';

// Employee pages
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import AttendanceHistory from './pages/employee/AttendanceHistory';
import LeaveManagement from './pages/employee/LeaveManagement';

// Manager pages
import ManagerDashboard from './pages/manager/ManagerDashboard';

// CEO pages
import CeoDashboard from './pages/ceo/CeoDashboard';
import CeoAttendance from './pages/ceo/CeoAttendance';
import CeoLeaveApprovals from './pages/ceo/CeoLeaveApprovals';
import CeoEmployees from './pages/ceo/CeoEmployees';
import CeoDepartments from './pages/ceo/CeoDepartments';

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
        </Route>
      </Route>

      {/* ── Manager routes ─────────────────────────────────────────────── */}
      <Route path="/manager" element={<ProtectedRoute allowedRoles={['manager']} />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ManagerDashboard />} />
          <Route path="attendance" element={<AttendanceHistory />} />
          <Route path="leaves" element={<LeaveManagement />} />
        </Route>
      </Route>

      {/* ── Team Lead routes — same pages as manager, scoped by backend ── */}
      <Route path="/tl" element={<ProtectedRoute allowedRoles={['tl']} />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ManagerDashboard />} />
          <Route path="attendance" element={<AttendanceHistory />} />
          <Route path="leaves" element={<LeaveManagement />} />
          <Route path="my-attendance" element={<AttendanceHistory />} />
          <Route path="my-leaves" element={<LeaveManagement />} />
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
          <Route path="departments" element={<CeoDepartments />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
