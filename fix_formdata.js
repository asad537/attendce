const fs = require('fs');

const originalStr = `      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && v !== undefined) fd.append(k, String(v));
      });`;

const replacementStr = `      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && v !== undefined) {
          fd.append(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
        }
      });`;

function replaceInFile(path) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  if (content.includes("fd.append(k, String(v));")) {
    content = content.replace(originalStr, replacementStr);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Fixed', path);
  } else {
    console.log('Not found in', path);
  }
}

const paths = [
  '/Users/rumaiharana/Documents/React-js/attendance-system/src/pages/employee/LeaveManagement.tsx',
  '/Users/rumaiharana/Documents/React-js/attendance-api/frontend/src/pages/employee/LeaveManagement.tsx'
];

paths.forEach(replaceInFile);

