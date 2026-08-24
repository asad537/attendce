const fs = require('fs');

function processFrontend(baseDir) {
  const appPath = baseDir + '/src/App.tsx';
  if (!fs.existsSync(appPath)) return;
  
  let app = fs.readFileSync(appPath, 'utf8');
  
  if (!app.includes('CeoHolidays')) {
    app = app.replace(
      "import CeoReports from './pages/ceo/CeoReports';",
      "import CeoReports from './pages/ceo/CeoReports';\nimport CeoHolidays from './pages/ceo/CeoHolidays';"
    );
    app = app.replace(
      '<Route path="reports"         element={<CeoReports />} />',
      '<Route path="reports"         element={<CeoReports />} />\n          <Route path="holidays"        element={<CeoHolidays />} />'
    );
    fs.writeFileSync(appPath, app, 'utf8');
    console.log("Updated App.tsx in", baseDir);
  }
}

processFrontend('/Users/rumaiharana/Documents/React-js/attendance-system');
processFrontend('/Users/rumaiharana/Documents/React-js/attendance-api/frontend');

fs.copyFileSync(
  '/Users/rumaiharana/Documents/React-js/attendance-api/frontend/src/pages/ceo/CeoHolidays.tsx',
  '/Users/rumaiharana/Documents/React-js/attendance-system/src/pages/ceo/CeoHolidays.tsx'
);
console.log('Copied CeoHolidays.tsx');
