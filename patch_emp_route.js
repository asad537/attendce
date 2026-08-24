const fs = require('fs');

function processFrontend(baseDir) {
  const path = baseDir + '/src/App.tsx';
  if (!fs.existsSync(path)) return;
  
  let content = fs.readFileSync(path, 'utf8');

  if (content.includes('path="/employee"')) {
    if (!content.includes('<Route path="reports"       element={<CeoReports />} />', content.indexOf('path="/employee"'))) {
      content = content.replace(
        '<Route path="wfh"        element={<WfhManagement />} />',
        '<Route path="wfh"        element={<WfhManagement />} />\n          <Route path="reports"    element={<CeoReports />} />'
      );
    }
  }

  fs.writeFileSync(path, content, 'utf8');
  console.log("Updated", path);
}

processFrontend('/Users/rumaiharana/Documents/React-js/attendance-system');
processFrontend('/Users/rumaiharana/Documents/React-js/attendance-api/frontend');
