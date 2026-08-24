const fs = require('fs');

function addWfhCard(path) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  
  if (content.includes("WFH Card")) return; // already added

  const onLeaveCardRegex = /(<h3[^>]*>On Leave<\/h3>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>)/;
  
  const wfhCard = `
        {/* WFH Card */}
        <div className="card bg-gradient-to-br from-indigo-50 to-white hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">Work From Home</h3>
            <span className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-4">{snapshot?.work_from_home || 0}</p>
        </div>
`;

  content = content.replace(onLeaveCardRegex, '$1' + wfhCard);
  
  // also update the employee list status badge color for wfh
  content = content.replace(
    "on_leave: 'bg-amber-100 text-amber-700',",
    "on_leave: 'bg-amber-100 text-amber-700',\n                      work_from_home: 'bg-indigo-100 text-indigo-700',"
  );
  content = content.replace(
    "on_leave: 'On Leave',",
    "on_leave: 'On Leave',\n                      work_from_home: 'WFH',"
  );

  fs.writeFileSync(path, content, 'utf8');
  console.log("Updated", path);
}

['/Users/rumaiharana/Documents/React-js/attendance-system', '/Users/rumaiharana/Documents/React-js/attendance-api/frontend'].forEach(base => {
  addWfhCard(base + '/src/pages/ceo/CeoDashboard.tsx');
  addWfhCard(base + '/src/pages/manager/ManagerDashboard.tsx');
});
