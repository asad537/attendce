const fs = require('fs');

function fixFile(path) {
  if (!fs.existsSync(path)) return;
  
  let content = fs.readFileSync(path, 'utf8');

  // Replace emp.current_status with emp.status
  let oldContent = content;
  content = content.replace(/emp\.current_status/g, 'emp.status');
  
  // Add support for work_from_home color
  content = content.replace(
    /emp\.status === 'on_leave' \? 'badge-yellow' :/g,
    "emp.status === 'on_leave' ? 'badge-yellow' :\n                        emp.status === 'work_from_home' ? 'badge-purple' :"
  );

  if (oldContent !== content) {
    fs.writeFileSync(path, content, 'utf8');
    console.log("Updated", path);
  }
}

function processFrontend(baseDir) {
  fixFile(baseDir + '/src/pages/ceo/CeoDashboard.tsx');
  fixFile(baseDir + '/src/pages/manager/ManagerDashboard.tsx');
}

processFrontend('/Users/rumaiharana/Documents/React-js/attendance-system');
processFrontend('/Users/rumaiharana/Documents/React-js/attendance-api/frontend');
