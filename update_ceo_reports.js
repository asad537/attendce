const fs = require('fs');

function processFrontend(baseDir) {
  const path = baseDir + '/src/pages/ceo/CeoReports.tsx';
  if (!fs.existsSync(path)) return;
  
  let content = fs.readFileSync(path, 'utf8');

  // Add jspdf import
  if (!content.includes('jsPDF')) {
    content = content.replace(
      "import { PageLoader } from '../../components/common/LoadingSpinner';",
      "import { PageLoader } from '../../components/common/LoadingSpinner';\nimport jsPDF from 'jspdf';\nimport autoTable from 'jspdf-autotable';"
    );
  }

  // Replace Title
  content = content.replace(
    '<h1 className="text-2xl font-bold text-gray-900">Performance</h1>',
    '<h1 className="text-2xl font-bold text-gray-900">Company Reports</h1>'
  );

  // Rename handleExport to handleExportCSV
  content = content.replace('const handleExport = () => {', 'const handleExportCSV = () => {');

  // Add handleExportPDF
  const handleExportPDF = `
  const handleExportPDF = () => {
    const toExport = data?.filter((r: any) => selectedEmployees.size === 0 || selectedEmployees.has(r.user.id)) || [];
    if (toExport.length === 0) return;
    
    const doc = new jsPDF();
    doc.text(\`Company Reports (\${startDate} to \${endDate})\`, 14, 15);
    
    const tableColumn = ["Employee Name", "Total Days", "Working Days", "Presents", "WFM", "Leaves", "Worked (Excl. Weekends)"];
    const tableRows = toExport.map((r: any) => [
      r.user.name,
      r.total_days,
      r.working_days_in_period,
      r.present,
      r.work_from_home,
      r.on_leave,
      r.days_worked_excl_weekends
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
    
    doc.save(\`Report_\${startDate}_\${endDate}.pdf\`);
  };
`;
  if (!content.includes('handleExportPDF')) {
    content = content.replace('const toggleEmployee = (id: number) => {', handleExportPDF + '\n  const toggleEmployee = (id: number) => {');
  }

  // Replace Export Button with Dropdown
  const oldButtonRegex = /<button onClick=\{handleExportCSV\}[\s\S]*?Export CSV\n\s*<\/button>/; // it might still be handleExport if I run this first? No, I renamed it above, so the source file has handleExport.
  // Wait, I replaced 'const handleExport' with 'handleExportCSV', but the button still says onClick={handleExport}. Let's replace the button carefully.
  
  const newDropdown = `
                <div className="relative group">
                  <button className="btn-secondary py-1.5 px-3 text-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Export
                    <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg border border-gray-100 hidden group-hover:block z-10 overflow-hidden">
                    <button onClick={handleExportCSV} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Export as CSV</button>
                    <button onClick={handleExportPDF} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100">Export as PDF</button>
                  </div>
                </div>
`;
  content = content.replace(/<button onClick=\{handleExport\}[\s\S]*?Export CSV\n\s*<\/button>/, newDropdown);

  fs.writeFileSync(path, content, 'utf8');
  console.log("Updated", path);
}

processFrontend('/Users/rumaiharana/Documents/React-js/attendance-system');
processFrontend('/Users/rumaiharana/Documents/React-js/attendance-api/frontend');
