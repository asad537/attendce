const fs = require('fs');

function processFrontend(baseDir) {
  const path = baseDir + '/src/components/layout/Sidebar.tsx';
  if (!fs.existsSync(path)) return;
  
  let content = fs.readFileSync(path, 'utf8');

  // We need to add the report icon to manager, tl and employee routes.
  // The structure is usually an array of objects.
  
  // For manager
  if (content.includes("const managerLinks = [")) {
    if (!content.includes("{ name: 'Reports', href: '/manager/reports'")) {
      content = content.replace(
        "const managerLinks = [",
        "const managerLinks = [\n    { name: 'Reports', href: '/manager/reports', icon: ChartBarIcon },"
      );
    }
  }

  // For tl
  if (content.includes("const tlLinks = [")) {
    if (!content.includes("{ name: 'Reports', href: '/tl/reports'")) {
      content = content.replace(
        "const tlLinks = [",
        "const tlLinks = [\n    { name: 'Reports', href: '/tl/reports', icon: ChartBarIcon },"
      );
    }
  }

  // For employee
  if (content.includes("const employeeLinks = [")) {
    if (!content.includes("{ name: 'Reports', href: '/employee/reports'")) {
      content = content.replace(
        "const employeeLinks = [",
        "const employeeLinks = [\n    { name: 'Reports', href: '/employee/reports', icon: ChartBarIcon },"
      );
    }
  }

  fs.writeFileSync(path, content, 'utf8');
  console.log("Updated", path);
}

processFrontend('/Users/rumaiharana/Documents/React-js/attendance-system');
processFrontend('/Users/rumaiharana/Documents/React-js/attendance-api/frontend');
