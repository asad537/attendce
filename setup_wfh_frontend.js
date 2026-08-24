const fs = require('fs');
const path = require('path');

function processFrontend(baseDir) {
  const appPath = path.join(baseDir, 'src/App.tsx');
  const sidebarPath = path.join(baseDir, 'src/components/layout/Sidebar.tsx');

  // Update App.tsx
  if (fs.existsSync(appPath)) {
    let app = fs.readFileSync(appPath, 'utf8');
    if (!app.includes('WfhManagement')) {
      app = app.replace(
        "import LeaveManagement from './pages/employee/LeaveManagement';",
        "import LeaveManagement from './pages/employee/LeaveManagement';\nimport WfhManagement from './pages/employee/WfhManagement';"
      );
      app = app.replace(
        "import ManagerLeaveApprovals from './pages/manager/ManagerLeaveApprovals';",
        "import ManagerLeaveApprovals from './pages/manager/ManagerLeaveApprovals';\nimport WfhApprovals from './pages/manager/WfhApprovals';"
      );
      
      // employee routes
      app = app.replace(
        '<Route path="leaves"     element={<LeaveManagement />} />',
        '<Route path="leaves"     element={<LeaveManagement />} />\n          <Route path="wfh"        element={<WfhManagement />} />'
      );
      
      // manager routes
      app = app.replace(
        '<Route path="team"        element={<TeamMembers />} />',
        '<Route path="team"        element={<TeamMembers />} />\n          <Route path="wfh"         element={<WfhManagement />} />\n          <Route path="wfh-approvals" element={<WfhApprovals />} />'
      );
      
      // tl routes
      app = app.replace(
        '<Route path="my-leaves"     element={<LeaveManagement />} />',
        '<Route path="my-leaves"     element={<LeaveManagement />} />\n          <Route path="wfh"           element={<WfhManagement />} />\n          <Route path="wfh-approvals" element={<WfhApprovals />} />'
      );
      
      // ceo routes
      app = app.replace(
        '<Route path="departments"     element={<CeoDepartments />} />',
        '<Route path="departments"     element={<CeoDepartments />} />\n          <Route path="wfh-approvals"   element={<WfhApprovals />} />'
      );
      
      fs.writeFileSync(appPath, app, 'utf8');
    }
  }

  // Update Sidebar.tsx
  if (fs.existsSync(sidebarPath)) {
    let sidebar = fs.readFileSync(sidebarPath, 'utf8');
    
    if (!sidebar.includes('RiHomeSmileLine')) {
      sidebar = sidebar.replace('RiDashboardLine,', 'RiDashboardLine, RiHomeSmileLine,');
    }

    if (!sidebar.includes("label: 'Work From Home'")) {
      // CEO
      sidebar = sidebar.replace(
        "{ icon: <RiCheckDoubleLine />, label: 'Leave Approvals', path: '/ceo/leave-approvals' },",
        "{ icon: <RiCheckDoubleLine />, label: 'Leave Approvals', path: '/ceo/leave-approvals' },\n      { icon: <RiHomeSmileLine />, label: 'Work From Home', path: '/ceo/wfh-approvals' },"
      );
      // Manager
      sidebar = sidebar.replace(
        "{ icon: <RiGroupLine />, label: 'My Team', path: '/manager/team' },",
        "{ icon: <RiGroupLine />, label: 'My Team', path: '/manager/team' },\n      { icon: <RiHomeSmileLine />, label: 'WFH Approvals', path: '/manager/wfh-approvals' },\n      { icon: <RiHomeSmileLine />, label: 'Work From Home', path: '/manager/wfh' },"
      );
      // TL
      sidebar = sidebar.replace(
        "{ icon: <RiCheckDoubleLine />, label: 'Leave Approvals', path: '/tl/leaves' },",
        "{ icon: <RiCheckDoubleLine />, label: 'Leave Approvals', path: '/tl/leaves' },\n      { icon: <RiHomeSmileLine />, label: 'WFH Approvals', path: '/tl/wfh-approvals' },"
      );
      sidebar = sidebar.replace(
        "{ icon: <RiCalendarEventLine />, label: 'My Leaves', path: '/tl/my-leaves' }",
        "{ icon: <RiCalendarEventLine />, label: 'My Leaves', path: '/tl/my-leaves' },\n      { icon: <RiHomeSmileLine />, label: 'Work From Home', path: '/tl/wfh' }"
      );
      // Employee
      sidebar = sidebar.replace(
        "{ icon: <RiCalendarLine />, label: 'My Leaves', path: '/employee/leaves' },",
        "{ icon: <RiCalendarLine />, label: 'My Leaves', path: '/employee/leaves' },\n      { icon: <RiHomeSmileLine />, label: 'Work From Home', path: '/employee/wfh' },"
      );
      
      fs.writeFileSync(sidebarPath, sidebar, 'utf8');
    }
  }
}

processFrontend('/Users/rumaiharana/Documents/React-js/attendance-system');
processFrontend('/Users/rumaiharana/Documents/React-js/attendance-api/frontend');
