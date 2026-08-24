const fs = require('fs');

const filterCode = `.filter(b => !['Annual Leave', 'Paternity Leave', 'Maternity Leave'].includes(b.leave_type?.name || ''))`;

function fixEmployeeDashboard(p) {
  if (!fs.existsSync(p)) return;
  let content = fs.readFileSync(p, 'utf8');
  
  // Undo previous inline filter if any
  content = content.replace(
    "{balances.filter(b => !['Annual Leave', 'Paternity Leave', 'Maternity Leave'].includes(b.leave_type?.name || '')).map((b) => (",
    "{balances.map((b) => ("
  );

  // Apply filter at state setting
  if (content.includes('setBalances(balRes.balances);')) {
    content = content.replace(
      'setBalances(balRes.balances);',
      `setBalances(balRes.balances${filterCode});`
    );
  } else if (!content.includes(filterCode)) {
    // maybe it already has it
  }
  fs.writeFileSync(p, content, 'utf8');
  console.log('Fixed', p);
}

function fixLeaveManagement(p) {
  if (!fs.existsSync(p)) return;
  let content = fs.readFileSync(p, 'utf8');
  
  if (content.includes('setBalances(balRes.balances);')) {
    content = content.replace(
      'setBalances(balRes.balances);',
      `setBalances(balRes.balances${filterCode});`
    );
  }
  fs.writeFileSync(p, content, 'utf8');
  console.log('Fixed', p);
}

const paths = [
  '/Users/rumaiharana/Documents/React-js/attendance-system/src/pages/employee/EmployeeDashboard.tsx',
  '/Users/rumaiharana/Documents/React-js/attendance-system/src/pages/employee/LeaveManagement.tsx',
  '/Users/rumaiharana/Documents/React-js/attendance-api/frontend/src/pages/employee/EmployeeDashboard.tsx',
  '/Users/rumaiharana/Documents/React-js/attendance-api/frontend/src/pages/employee/LeaveManagement.tsx'
];

fixEmployeeDashboard(paths[0]);
fixLeaveManagement(paths[1]);
fixEmployeeDashboard(paths[2]);
fixLeaveManagement(paths[3]);

