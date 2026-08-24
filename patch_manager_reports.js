const fs = require('fs');

function patchController(path) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace('if ($auth->isTl()) {', 'if ($auth->isTeamLead()) {');
  fs.writeFileSync(path, content, 'utf8');
  console.log('Updated ReportController.php');
}

function patchReports(path) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace('return (res as any).company || [];', 'return (res as any).company || (res as any).team || [];');
  fs.writeFileSync(path, content, 'utf8');
  console.log('Updated CeoReports.tsx');
}

function patchSidebar(path) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  
  if (!content.includes("path: '/manager/reports'")) {
    const managerReports = `
  {
    label: 'Reports', path: '/manager/reports',
    roles: ['manager'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },`;
    content = content.replace(
      "roles: ['manager'],\n    icon: <svg className=\"w-5 h-5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6\" /></svg>,\n  },",
      "roles: ['manager'],\n    icon: <svg className=\"w-5 h-5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6\" /></svg>,\n  }," + managerReports
    );
  }

  if (!content.includes("path: '/tl/reports'")) {
    const tlReports = `
  {
    label: 'Reports', path: '/tl/reports',
    roles: ['tl'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  },`;
    content = content.replace(
      "roles: ['tl'],\n    icon: <svg className=\"w-5 h-5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6\" /></svg>,\n  },",
      "roles: ['tl'],\n    icon: <svg className=\"w-5 h-5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6\" /></svg>,\n  }," + tlReports
    );
  }

  fs.writeFileSync(path, content, 'utf8');
  console.log('Updated Sidebar.tsx');
}

function patchApp(path) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');

  // Fix manager reports
  content = content.replace(
    '<Route path="reports"       element={<CeoReports />} />\n          <Route path="reports"       element={<CeoReports />} />',
    '<Route path="reports"       element={<CeoReports />} />'
  );

  // Add tl reports
  if (!content.includes('<Route path="reports"           element={<CeoReports />} />')) {
    content = content.replace(
      '<Route path="wfh-approvals" element={<WfhApprovals />} />',
      '<Route path="wfh-approvals" element={<WfhApprovals />} />\n          <Route path="reports"           element={<CeoReports />} />'
    );
  }

  fs.writeFileSync(path, content, 'utf8');
  console.log('Updated App.tsx');
}

patchController('/Users/rumaiharana/Documents/React-js/attendance-api/app/Http/Controllers/API/ReportController.php');

const feBase = '/Users/rumaiharana/Documents/React-js/attendance-api/frontend';
patchReports(feBase + '/src/pages/ceo/CeoReports.tsx');
patchSidebar(feBase + '/src/components/layout/Sidebar.tsx');
patchApp(feBase + '/src/App.tsx');

const sysBase = '/Users/rumaiharana/Documents/React-js/attendance-system';
patchReports(sysBase + '/src/pages/ceo/CeoReports.tsx');
patchSidebar(sysBase + '/src/components/layout/Sidebar.tsx');
patchApp(sysBase + '/src/App.tsx');
