const fs = require('fs');
const path = require('path');

function processFrontendDir(baseDir) {
  const sidebarPath = path.join(baseDir, 'src/components/layout/Sidebar.tsx');
  const appPath = path.join(baseDir, 'src/App.tsx');
  const ceoApprovalsPath = path.join(baseDir, 'src/pages/ceo/CeoLeaveApprovals.tsx');
  const managerApprovalsPath = path.join(baseDir, 'src/pages/manager/ManagerLeaveApprovals.tsx');
  const managerDashboardPath = path.join(baseDir, 'src/pages/manager/ManagerDashboard.tsx');

  if (!fs.existsSync(sidebarPath)) return;

  // 1. Sidebar.tsx
  let sidebar = fs.readFileSync(sidebarPath, 'utf8');
  sidebar = sidebar.replace(
    "{ icon: <RiCheckDoubleLine />, label: 'Leave Approvals', path: '/manager/leaves' },",
    "{ icon: <RiCheckDoubleLine />, label: 'Leave Approvals', path: '/manager/leave-approvals' },\n      { icon: <RiCalendarEventLine />, label: 'My Leaves', path: '/manager/my-leaves' },"
  );
  if (!sidebar.includes('RiCalendarEventLine')) {
      sidebar = sidebar.replace('RiCalendarLine', 'RiCalendarLine, RiCalendarEventLine');
  }
  fs.writeFileSync(sidebarPath, sidebar, 'utf8');

  // 2. App.tsx
  let app = fs.readFileSync(appPath, 'utf8');
  if (!app.includes('ManagerLeaveApprovals')) {
    app = app.replace(
      "import ManagerDashboard from './pages/manager/ManagerDashboard';",
      "import ManagerDashboard from './pages/manager/ManagerDashboard';\nimport ManagerLeaveApprovals from './pages/manager/ManagerLeaveApprovals';"
    );
    app = app.replace(
      '<Route path="leaves"      element={<LeaveManagement />} />',
      '<Route path="leave-approvals" element={<ManagerLeaveApprovals />} />\n          <Route path="my-leaves" element={<LeaveManagement />} />'
    );
    fs.writeFileSync(appPath, app, 'utf8');
  }

  // 3. ManagerDashboard.tsx (update links to /manager/leave-approvals)
  let dashboard = fs.readFileSync(managerDashboardPath, 'utf8');
  dashboard = dashboard.replace(/to="\/manager\/leaves"/g, 'to="/manager/leave-approvals"');
  fs.writeFileSync(managerDashboardPath, dashboard, 'utf8');

  // 4. Create ManagerLeaveApprovals.tsx
  let ceoContent = fs.readFileSync(ceoApprovalsPath, 'utf8');
  let managerContent = ceoContent
    .replace(/CeoLeaveApprovals/g, 'ManagerLeaveApprovals')
    .replace(/\/ceo-review/g, '/manager-review')
    .replace('ceo_reviewed_at', 'manager_reviewed_at');
    
  fs.writeFileSync(managerApprovalsPath, managerContent, 'utf8');
  console.log('Processed', baseDir);
}

processFrontendDir('/Users/rumaiharana/Documents/React-js/attendance-system');
processFrontendDir('/Users/rumaiharana/Documents/React-js/attendance-api/frontend');
