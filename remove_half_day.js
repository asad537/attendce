const fs = require('fs');

function processFrontend(baseDir) {
  const path = baseDir + '/src/pages/employee/WfhManagement.tsx';
  if (!fs.existsSync(path)) return;
  
  let content = fs.readFileSync(path, 'utf8');

  // Remove the Duration field
  const durationFieldRegex = /<div>\s*<label className="label text-sm font-medium text-gray-700">Duration<\/label>[\s\S]*?<\/div>\s*<\/div>/;
  content = content.replace(durationFieldRegex, '');

  fs.writeFileSync(path, content, 'utf8');
  console.log("Updated", path);
}

processFrontend('/Users/rumaiharana/Documents/React-js/attendance-system');
processFrontend('/Users/rumaiharana/Documents/React-js/attendance-api/frontend');
