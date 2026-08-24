const fs = require('fs');

function addCasualLeave(p) {
  if (!fs.existsSync(p)) return;
  let content = fs.readFileSync(p, 'utf8');
  
  if (content.includes("!['Annual Leave', 'Paternity Leave', 'Maternity Leave']")) {
    content = content.replace(
      "!['Annual Leave', 'Paternity Leave', 'Maternity Leave']",
      "!['Annual Leave', 'Paternity Leave', 'Maternity Leave', 'Casual Leave']"
    );
    fs.writeFileSync(p, content, 'utf8');
    console.log('Fixed', p);
  } else {
    console.log('Target array not found in', p);
  }
}

const paths = [
  '/Users/rumaiharana/Documents/React-js/attendance-system/src/pages/employee/EmployeeDashboard.tsx',
  '/Users/rumaiharana/Documents/React-js/attendance-system/src/pages/employee/LeaveManagement.tsx',
  '/Users/rumaiharana/Documents/React-js/attendance-api/frontend/src/pages/employee/EmployeeDashboard.tsx',
  '/Users/rumaiharana/Documents/React-js/attendance-api/frontend/src/pages/employee/LeaveManagement.tsx'
];

paths.forEach(addCasualLeave);

