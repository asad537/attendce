const fs = require('fs');
const path = '/Users/rumaiharana/Documents/React-js/attendance-system/src/pages/employee/EmployeeDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

console.log(content.substring(content.indexOf('{/* Action buttons */}'), content.indexOf('{/* Break history */}')));
console.log('--- STATS ---');
console.log(content.substring(content.indexOf('{/* Stats row */}'), content.indexOf('{/* Leave balances */}')));
console.log('--- BALANCES ---');
console.log(content.substring(content.indexOf('{/* Leave balances */}'), content.indexOf('{/* Upcoming holidays */}')));
console.log('--- TIMER ---');
console.log(content.substring(content.indexOf('function LiveTimer'), content.indexOf('function getGreeting')));
