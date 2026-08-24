const fs = require('fs');
const path = require('path');

function processSidebar(baseDir) {
  const sidebarPath = path.join(baseDir, 'src/components/layout/Sidebar.tsx');
  if (!fs.existsSync(sidebarPath)) return;
  let content = fs.readFileSync(sidebarPath, 'utf8');
  
  if (content.includes("WFM")) return; // skip if already inserted manually, though my previous script did rename WFH to WFM inside the file but it missed the menu items because they weren't added.

  const wfmIcon = `<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>`;

  // Insert for Employee
  const empLeavesStr = `    label: 'My Leaves', path: '/employee/leaves',
    roles: ['employee'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  },`;
  const empWfm = `
  {
    label: 'Work From Home (WFM)', path: '/employee/wfh',
    roles: ['employee'],
    icon: ${wfmIcon},
  },`;
  content = content.replace(empLeavesStr, empLeavesStr + empWfm);

  // Insert for Manager
  const mgrTeamStr = `    label: 'My Team', path: '/manager/team',
    roles: ['manager'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  },`;
  const mgrWfm = `
  {
    label: 'WFM Approvals', path: '/manager/wfh-approvals',
    roles: ['manager'],
    icon: ${wfmIcon},
  },
  {
    label: 'My WFM', path: '/manager/wfh',
    roles: ['manager'],
    icon: ${wfmIcon},
  },`;
  content = content.replace(mgrTeamStr, mgrTeamStr + mgrWfm);

  // Insert for TL
  const tlLeavesStr = `    label: 'My Leaves', path: '/tl/my-leaves',
    roles: ['tl'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  },`;
  const tlWfm = `
  {
    label: 'WFM Approvals', path: '/tl/wfh-approvals',
    roles: ['tl'],
    icon: ${wfmIcon},
  },
  {
    label: 'My WFM', path: '/tl/wfh',
    roles: ['tl'],
    icon: ${wfmIcon},
  },`;
  content = content.replace(tlLeavesStr, tlLeavesStr + tlWfm);

  // Insert for CEO
  const ceoLeavesStr = `    label: 'Leave Approvals', path: '/ceo/leave-approvals',
    roles: ['ceo'],
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },`;
  const ceoWfm = `
  {
    label: 'WFM Approvals', path: '/ceo/wfh-approvals',
    roles: ['ceo'],
    icon: ${wfmIcon},
  },`;
  content = content.replace(ceoLeavesStr, ceoLeavesStr + ceoWfm);

  fs.writeFileSync(sidebarPath, content, 'utf8');
  console.log("Updated Sidebar in", baseDir);
}

processSidebar('/Users/rumaiharana/Documents/React-js/attendance-system');
processSidebar('/Users/rumaiharana/Documents/React-js/attendance-api/frontend');
