const fs = require('fs');
const path = '/Users/rumaiharana/Documents/React-js/attendance-api/app/Http/Controllers/API/WfhRequestController.php';

let content = fs.readFileSync(path, 'utf8');
if (!content.includes("$request->filled('user_id')")) {
  content = content.replace(
    "if ($request->filled('status')) {",
    "if ($request->filled('user_id') && !$user->isEmployee()) {\n            $query->where('user_id', $request->user_id);\n        }\n\n        if ($request->filled('status')) {"
  );
  fs.writeFileSync(path, content, 'utf8');
  console.log('Added user_id filter to WfhRequestController');
} else {
  console.log('user_id filter already present');
}
