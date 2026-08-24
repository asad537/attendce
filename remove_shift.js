const fs = require('fs');

function removeShift(path) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');

  // Find the block for Shifts and remove it
  const shiftRegex = /\s*\{\s*label:\s*'Shifts',\s*path:\s*'(.*?)',\s*roles:\s*\[(.*?)\],\s*icon:\s*(.*?),\s*\},/g;
  content = content.replace(shiftRegex, '');

  fs.writeFileSync(path, content, 'utf8');
  console.log('Removed Shifts from', path);
}

const apiPath = '/Users/rumaiharana/Documents/React-js/attendance-api/frontend/src/components/layout/Sidebar.tsx';
const sysPath = '/Users/rumaiharana/Documents/React-js/attendance-system/src/components/layout/Sidebar.tsx';

removeShift(apiPath);
removeShift(sysPath);
