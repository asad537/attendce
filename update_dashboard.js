const fs = require('fs');
const path = '/Users/rumaiharana/Documents/React-js/attendance-system/src/pages/employee/EmployeeDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '<StatCard label="Annual Leave" value={`${user?.annual_leave_balance ?? 0} days`} icon="📅" color="green" />',
  ''
);

content = content.replace(
  'className="grid grid-cols-2 lg:grid-cols-4 gap-4"',
  'className="grid grid-cols-2 lg:grid-cols-3 gap-4"'
);

content = content.replace(
  '{balances.map((b) => (',
  "{balances.filter(b => !['Annual Leave', 'Paternity Leave', 'Maternity Leave'].includes(b.leave_type?.name || '')).map((b) => ("
);

content = content.replace(
  'className="btn-success flex-1"',
  'className="btn-success btn-sm flex-1"'
);
content = content.replace(
  'className="btn-warning flex-1"',
  'className="btn-warning btn-sm flex-1"'
);
content = content.replace(
  'className="btn-danger flex-1"',
  'className="btn-danger btn-sm flex-1"'
);

content = content.replace(
  'const id = setInterval(tick, 60000);',
  `      const secs = Math.floor((Date.now() - start) / 1000) - (breakMins * 60);
      setElapsed(Math.max(0, secs));
    };
    tick();
    const id = setInterval(tick, 1000);`
);

content = content.replace(
  'const mins = Math.floor((Date.now() - start) / 60000) - breakMins;\n      setElapsed(Math.max(0, mins));\n    };\n    tick();',
  ''
);

content = content.replace(
  'const h = Math.floor(elapsed / 60);\n  const m = elapsed % 60;\n  return <span className="text-emerald-600">{h}h {m}m</span>;',
  `const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return <span className="text-emerald-600">{h}h {m}m {s}s</span>;`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Updated!');
