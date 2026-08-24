const fs = require('fs');

function processFrontend(baseDir) {
  const path = baseDir + '/src/App.tsx';
  if (!fs.existsSync(path)) return;
  
  let content = fs.readFileSync(path, 'utf8');

  // Add reports route to manager
  if (!content.includes('<Route path="reports"       element={<CeoReports />} />', content.indexOf('path="/manager"'))) {
    content = content.replace(
      '<Route path="wfh-approvals" element={<WfhApprovals />} />',
      '<Route path="wfh-approvals" element={<WfhApprovals />} />\n          <Route path="reports"       element={<CeoReports />} />'
    );
  }

  // Add reports route to tl
  if (!content.includes('<Route path="reports"       element={<CeoReports />} />', content.indexOf('path="/tl"'))) {
    content = content.replace(
      '<Route path="wfh-approvals" element={<WfhApprovals />} />',
      '<Route path="wfh-approvals" element={<WfhApprovals />} />\n          <Route path="reports"       element={<CeoReports />} />'
    );
  }

  // Add reports route to employee
  if (content.includes('path="/employee"')) {
    if (!content.includes('<Route path="reports"       element={<CeoReports />} />', content.indexOf('path="/employee"'))) {
      content = content.replace(
        '<Route path="wfh"           element={<WfhManagement />} />',
        '<Route path="wfh"           element={<WfhManagement />} />\n          <Route path="reports"       element={<CeoReports />} />'
      );
    }
  } else {
    // If no /employee route exists with that syntax, let's just make sure.
    // Employee routes are usually the default or under path="/" or path="/employee".
    // Wait, the index routes in App.tsx are under path="/" with allowedRoles=['employee'] maybe?
  }

  fs.writeFileSync(path, content, 'utf8');
  console.log("Updated", path);
}

processFrontend('/Users/rumaiharana/Documents/React-js/attendance-system');
processFrontend('/Users/rumaiharana/Documents/React-js/attendance-api/frontend');
