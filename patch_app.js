const fs = require('fs');

function processFrontend(baseDir) {
  const appPath = baseDir + '/src/App.tsx';
  if (!fs.existsSync(appPath)) return;
  
  let app = fs.readFileSync(appPath, 'utf8');
  
  if (!app.includes('CeoReports')) {
    app = app.replace(
      "import CeoDepartments from './pages/ceo/CeoDepartments';",
      "import CeoDepartments from './pages/ceo/CeoDepartments';\nimport CeoReports from './pages/ceo/CeoReports';"
    );
    app = app.replace(
      '<Route path="departments"     element={<CeoDepartments />} />',
      '<Route path="departments"     element={<CeoDepartments />} />\n          <Route path="reports"         element={<CeoReports />} />'
    );
    fs.writeFileSync(appPath, app, 'utf8');
    console.log("Updated App.tsx in", baseDir);
  }
}

processFrontend('/Users/rumaiharana/Documents/React-js/attendance-system');
processFrontend('/Users/rumaiharana/Documents/React-js/attendance-api/frontend');

fs.copyFileSync(
  '/Users/rumaiharana/Documents/React-js/attendance-api/frontend/src/pages/ceo/CeoReports.tsx',
  '/Users/rumaiharana/Documents/React-js/attendance-system/src/pages/ceo/CeoReports.tsx'
);
console.log('Copied CeoReports.tsx');
