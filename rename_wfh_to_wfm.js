const fs = require('fs');

function replaceInFile(path) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/WFH/g, 'WFM');
  fs.writeFileSync(path, content, 'utf8');
  console.log("Updated", path);
}

const files = [
  '/src/components/common/StatusBadge.tsx',
  '/src/pages/manager/WfhApprovals.tsx',
  '/src/pages/employee/WfhManagement.tsx',
  '/src/pages/ceo/CeoDashboard.tsx',
  '/src/pages/manager/ManagerDashboard.tsx',
  '/src/components/layout/Sidebar.tsx'
];

['/Users/rumaiharana/Documents/React-js/attendance-system', '/Users/rumaiharana/Documents/React-js/attendance-api/frontend'].forEach(base => {
  files.forEach(f => replaceInFile(base + f));
});
