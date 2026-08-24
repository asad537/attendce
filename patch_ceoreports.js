const fs = require('fs');

function processFrontend(baseDir) {
  const path = baseDir + '/src/pages/ceo/CeoReports.tsx';
  if (!fs.existsSync(path)) return;
  
  let content = fs.readFileSync(path, 'utf8');

  // Add selected state and custom date range state
  if (!content.includes('selectedEmployees')) {
    content = content.replace(
      "const [activeFilter, setActiveFilter] = useState('This Month');",
      "const [activeFilter, setActiveFilter] = useState('This Month');\n  const [showCustomRange, setShowCustomRange] = useState(false);\n  const [selectedEmployees, setSelectedEmployees] = useState<Set<number>>(new Set());"
    );

    // Update setFilter to handle Custom
    content = content.replace(
      "const setFilter = (filter: string) => {",
      "const setFilter = (filter: string) => {\n    if (filter === 'Custom') {\n      setActiveFilter('Custom');\n      setShowCustomRange(true);\n      return;\n    }\n    setShowCustomRange(false);\n"
    );

    // Add 'Custom' to the filter buttons
    content = content.replace(
      "['Today', '7 days', '30 days', 'This Month'].map",
      "['Today', '7 days', '30 days', 'This Month', 'Custom'].map"
    );

    // Insert Custom date pickers below the filter buttons
    const customDatePickers = `
            {showCustomRange && (
              <div className="flex items-center gap-2 ml-4">
                <input type="date" className="input py-1 text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <span className="text-gray-400">to</span>
                <input type="date" className="input py-1 text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} />
              </div>
            )}`;
    content = content.replace(
      "Refresh\n            </button>\n          </div>",
      `Refresh\n            </button>\n            ${customDatePickers}\n          </div>`
    );

    // Add export function
    const exportFn = `
  const handleExport = () => {
    const toExport = data?.filter((r: any) => selectedEmployees.size === 0 || selectedEmployees.has(r.user.id)) || [];
    if (toExport.length === 0) return;
    
    const headers = ['Employee Name', 'Total Days', 'Total Working Days', 'Presents', 'WFM', 'Leaves', 'Days Worked (Excl. Weekends)'];
    const csvContent = [
      headers.join(','),
      ...toExport.map((r: any) => [
        \`"\${r.user.name}"\`,
        r.total_days,
        r.working_days_in_period,
        r.present,
        r.work_from_home,
        r.on_leave,
        r.days_worked_excl_weekends
      ].join(','))
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', \`Report_\${startDate}_\${endDate}.csv\`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleEmployee = (id: number) => {
    const newSet = new Set(selectedEmployees);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedEmployees(newSet);
  };
  
  const toggleAll = () => {
    if (selectedEmployees.size === data?.length) setSelectedEmployees(new Set());
    else setSelectedEmployees(new Set(data?.map((r: any) => r.user.id)));
  };
`;
    content = content.replace("return (", exportFn + "\n  return (");

    // Add export button in Records header
    content = content.replace(
      '<div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">\n                <div>',
      '<div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">\n                <div>'
    );
    // actually, let's replace the whole header div
    const recordsHeaderRegex = /<div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">[\s\S]*?<\/div>\s*<\/div>/;
    const newRecordsHeader = `<div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Employee Records</h3>
                  <p className="text-xs text-gray-500 mt-1">Detailed breakdown per employee for the selected period.</p>
                </div>
                <button onClick={handleExport} className="btn-secondary py-1.5 px-3 text-sm flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Export CSV
                </button>
              </div>`;
    content = content.replace(recordsHeaderRegex, newRecordsHeader);

    // Add checkbox column to table header
    content = content.replace(
      '<th className="px-6 py-3">Employee Name</th>',
      '<th className="px-6 py-3 w-12"><input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500" onChange={toggleAll} checked={data?.length > 0 && selectedEmployees.size === data?.length} /></th>\n                      <th className="px-6 py-3">Employee Name</th>'
    );

    // Add checkbox column to table rows
    content = content.replace(
      '<td className="px-6 py-4 text-sm font-medium text-gray-900">{r.user.name}</td>',
      '<td className="px-6 py-4"><input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500" checked={selectedEmployees.has(r.user.id)} onChange={() => toggleEmployee(r.user.id)} /></td>\n                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{r.user.name}</td>'
    );
    
    // Fix colSpan when empty
    content = content.replace(
      '<td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-400">',
      '<td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-400">'
    );

    fs.writeFileSync(path, content, 'utf8');
    console.log("Updated", path);
  }
}

processFrontend('/Users/rumaiharana/Documents/React-js/attendance-system');
processFrontend('/Users/rumaiharana/Documents/React-js/attendance-api/frontend');
