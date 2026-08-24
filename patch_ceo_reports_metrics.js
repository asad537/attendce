const fs = require('fs');

function processFrontend(baseDir) {
  const path = baseDir + '/src/pages/ceo/CeoReports.tsx';
  if (!fs.existsSync(path)) return;
  
  let content = fs.readFileSync(path, 'utf8');

  // Add calculations for stat cards
  const calcRegex = /const totalLeaves = reportData\?.reduce\(\(acc: number, r: any\) => acc \+ \(r\.on_leave \|\| 0\), 0\) \|\| 0;/;
  const newCalcs = `const totalLeaves = reportData?.reduce((acc: number, r: any) => acc + (r.on_leave || 0), 0) || 0;
  const totalPaidLeaves = reportData?.reduce((acc: number, r: any) => acc + (r.paid_leaves || 0), 0) || 0;
  const totalRejectedLeaves = reportData?.reduce((acc: number, r: any) => acc + (r.rejected_leaves || 0), 0) || 0;
  const totalRejectedWfm = reportData?.reduce((acc: number, r: any) => acc + (r.rejected_wfm || 0), 0) || 0;`;
  if (!content.includes('totalPaidLeaves')) {
      content = content.replace(calcRegex, newCalcs);
  }

  // Update Grid Cols for stat cards from 5 to 8 (or two rows)
  content = content.replace('grid-cols-1 md:grid-cols-2 lg:grid-cols-5', 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'); // Let's make it 2 rows of 4 instead of 8 cols

  // Add the 3 new Stat Cards
  const newCards = `
                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Paid Leaves</p>
                      <div className="w-8 h-8 rounded-lg bg-green-50 text-green-500 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{totalPaidLeaves}</p>
                    <p className="text-sm text-gray-400 mt-1">Approved paid leaves</p>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Rejected Leaves</p>
                      <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{totalRejectedLeaves}</p>
                    <p className="text-sm text-gray-400 mt-1">Declined requests</p>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Rejected WFM</p>
                      <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{totalRejectedWfm}</p>
                    <p className="text-sm text-gray-400 mt-1">Declined WFM requests</p>
                  </div>
`;
  if (!content.includes('Paid Leaves</p>')) {
      content = content.replace('{/* Total Leaves */}', '{/* Total Leaves */}\n' + newCards);
  }

  // Update PDF Export
  const pdfColsOld = 'const tableColumn = ["Employee Name", "Total Days", "Working Days", "Holidays", "Presents", "WFM", "Leaves", "Worked (Excl. Weekends)"];';
  const pdfColsNew = 'const tableColumn = ["Employee Name", "Total Days", "Working Days", "Holidays", "Presents", "WFM", "Rej WFM", "Leaves", "Paid Lvs", "Rej Lvs", "Worked"];';
  content = content.replace(pdfColsOld, pdfColsNew);

  const pdfRowsOld = 'r.work_from_home,\n      r.on_leave,\n      r.days_worked_excl_weekends';
  const pdfRowsNew = 'r.work_from_home,\n      r.rejected_wfm || 0,\n      r.on_leave,\n      r.paid_leaves || 0,\n      r.rejected_leaves || 0,\n      r.days_worked_excl_weekends';
  content = content.replace(pdfRowsOld, pdfRowsNew);

  // Update CSV Export
  const csvColsOld = "const headers = ['Employee Name', 'Total Days', 'Total Working Days', 'Holidays', 'Presents', 'WFM', 'Leaves', 'Days Worked (Excl. Weekends)'];";
  const csvColsNew = "const headers = ['Employee Name', 'Total Days', 'Total Working Days', 'Holidays', 'Presents', 'WFM', 'Rejected WFM', 'Leaves', 'Paid Leaves', 'Rejected Leaves', 'Days Worked (Excl. Weekends)'];";
  content = content.replace(csvColsOld, csvColsNew);

  const csvRowsOld = "r.work_from_home,\n        r.on_leave,\n        r.days_worked_excl_weekends";
  const csvRowsNew = "r.work_from_home,\n        r.rejected_wfm || 0,\n        r.on_leave,\n        r.paid_leaves || 0,\n        r.rejected_leaves || 0,\n        r.days_worked_excl_weekends";
  content = content.replace(csvRowsOld, csvRowsNew);

  // Update HTML Table
  const tableHeadersOld = `<th className="px-6 py-3">WFM</th>
                      <th className="px-6 py-3">Leaves</th>
                      <th className="px-6 py-3">Worked (Excl. Weekends)</th>`;
  const tableHeadersNew = `<th className="px-6 py-3">WFM</th>
                      <th className="px-6 py-3 text-red-500">Rej WFM</th>
                      <th className="px-6 py-3">Leaves</th>
                      <th className="px-6 py-3 text-green-600">Paid Lvs</th>
                      <th className="px-6 py-3 text-red-500">Rej Lvs</th>
                      <th className="px-6 py-3">Worked (Excl. Weekends)</th>`;
  content = content.replace(tableHeadersOld, tableHeadersNew);

  const tableRowsOld = `<td className="px-6 py-4 text-sm text-gray-600">{r.work_from_home}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{r.on_leave}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-indigo-600">{r.days_worked_excl_weekends}</td>`;
  const tableRowsNew = `<td className="px-6 py-4 text-sm text-gray-600">{r.work_from_home}</td>
                          <td className="px-6 py-4 text-sm text-red-500">{r.rejected_wfm || 0}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{r.on_leave}</td>
                          <td className="px-6 py-4 text-sm text-green-600">{r.paid_leaves || 0}</td>
                          <td className="px-6 py-4 text-sm text-red-500">{r.rejected_leaves || 0}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-indigo-600">{r.days_worked_excl_weekends}</td>`;
  content = content.replace(tableRowsOld, tableRowsNew);
  
  content = content.replace('colSpan={9}', 'colSpan={12}');

  fs.writeFileSync(path, content, 'utf8');
  console.log("Updated", path);
}

processFrontend('/Users/rumaiharana/Documents/React-js/attendance-system');
processFrontend('/Users/rumaiharana/Documents/React-js/attendance-api/frontend');
