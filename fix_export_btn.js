const fs = require('fs');

function processFrontend(baseDir) {
  const path = baseDir + '/src/pages/ceo/CeoReports.tsx';
  if (!fs.existsSync(path)) return;
  
  let content = fs.readFileSync(path, 'utf8');

  // Fix button class and dropdown gap
  const oldDropdownRegex = /<div className="relative group">\s*<button className="btn-secondary py-1.5 px-3 text-sm flex items-center gap-2">[\s\S]*?<div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg border border-gray-100 hidden group-hover:block z-10 overflow-hidden">[\s\S]*?<\/div>\s*<\/div>/;
  
  const newDropdown = `
                <div className="relative group">
                  <button className="btn-primary py-1.5 px-3 text-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Export
                    <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <div className="absolute right-0 pt-2 w-36 z-50 hidden group-hover:block">
                    <div className="bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden flex flex-col">
                      <button onClick={handleExportCSV} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors">Export as CSV</button>
                      <button onClick={handleExportPDF} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 border-t border-gray-100 transition-colors">Export as PDF</button>
                    </div>
                  </div>
                </div>
`;
  
  content = content.replace(oldDropdownRegex, newDropdown.trim());
  fs.writeFileSync(path, content, 'utf8');
  console.log("Updated", path);
}

processFrontend('/Users/rumaiharana/Documents/React-js/attendance-system');
processFrontend('/Users/rumaiharana/Documents/React-js/attendance-api/frontend');
