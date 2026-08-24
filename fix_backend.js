const fs = require('fs');

const policyPath = '/Users/rumaiharana/Documents/React-js/attendance-api/app/Policies/LeavePolicy.php';
let policy = fs.readFileSync(policyPath, 'utf8');
policy = policy.replace('return ($auth->isManager() || $auth->isTl())', 'return $auth->isManager()');
// Should TL still view their reports' leaves? "leave approval should be done by ceo and manager only" - so view is probably fine or we can remove TL from everything related to leaves. Let's just remove TL from managerReview.
fs.writeFileSync(policyPath, policy, 'utf8');

const controllerPath = '/Users/rumaiharana/Documents/React-js/attendance-api/app/Http/Controllers/API/LeaveController.php';
let controller = fs.readFileSync(controllerPath, 'utf8');
controller = controller.replace('if ($user->isManager() || $user->isTl()) {', 'if ($user->isManager()) {');
// Wait, replacing it globally might remove it from `index` and `pendingCount`. If TLs can't approve, they probably don't need to see pending counts or team leaves in the dashboard.
controller = controller.replace('if ($user->isManager() || $user->isTl()) {', 'if ($user->isManager()) {'); // second occurrence
fs.writeFileSync(controllerPath, controller, 'utf8');

console.log('Backend fixed');
