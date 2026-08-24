const fs = require('fs');

function patchFile(path) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');

  // Add useAuth import
  if (!content.includes("import { useAuth }")) {
    content = content.replace(
      "import React,",
      "import { useAuth } from '../../contexts/AuthContext';\nimport React,"
    );
  }

  // Add useAuth call inside component
  if (!content.includes("const { user } = useAuth();")) {
    content = content.replace(
      "const [page, setPage] = useState(1);",
      "const { user } = useAuth();\n  const [page, setPage] = useState(1);"
    );
  }

  // Pass user_id to getList
  if (path.includes('WfhManagement')) {
    content = content.replace(
      "wfhService.getList({ page, per_page: 20 })",
      "wfhService.getList({ page, per_page: 20, user_id: user?.id })"
    );
    // There is another one in useEffect:
    // Wait, wait... `getList({ page, per_page: 20 })` could be anywhere. Use regex.
    content = content.replace(
      /wfhService\.getList\(\{\s*page,\s*per_page:\s*20\s*\}\)/g,
      "wfhService.getList({ page, per_page: 20, user_id: user?.id })"
    );
  } else if (path.includes('LeaveManagement')) {
    content = content.replace(
      /leaveService\.getList\(\{\s*per_page:\s*20\s*\}\)/g,
      "leaveService.getList({ per_page: 20, user_id: user?.id })"
    );
  }

  fs.writeFileSync(path, content, 'utf8');
  console.log('Patched', path);
}

const basePath1 = '/Users/rumaiharana/Documents/React-js/attendance-api/frontend/src/pages/employee';
const basePath2 = '/Users/rumaiharana/Documents/React-js/attendance-system/src/pages/employee';

patchFile(basePath1 + '/WfhManagement.tsx');
patchFile(basePath1 + '/LeaveManagement.tsx');
patchFile(basePath2 + '/WfhManagement.tsx');
patchFile(basePath2 + '/LeaveManagement.tsx');
