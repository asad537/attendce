const fs = require('fs');

function processFrontend(baseDir) {
  const path = baseDir + '/src/pages/ceo/CeoReports.tsx';
  if (!fs.existsSync(path)) return;
  
  let content = fs.readFileSync(path, 'utf8');

  // Import holidayService
  if (!content.includes('holidayService')) {
    content = content.replace(
      "import { reportService } from '../../services/reportService';",
      "import { reportService, holidayService } from '../../services/reportService';"
    );
  }

  // Add holidays query
  const holidayQuery = `
  const { data: holidaysData } = useQuery({
    queryKey: ['company-reports-holidays'],
    queryFn: () => holidayService.getAll(),
  });

  const totalHolidays = useMemo(() => {
    if (!holidaysData) return 0;
    const start = new Date(startDate);
    start.setHours(0,0,0,0);
    const end = new Date(endDate);
    end.setHours(23,59,59,999);
    return holidaysData.filter((h: any) => {
      const hDate = new Date(h.date);
      return hDate >= start && hDate <= end;
    }).length;
  }, [holidaysData, startDate, endDate]);
`;
  if (!content.includes('company-reports-holidays')) {
    content = content.replace('// Calculate Aggregates', holidayQuery + '\n  // Calculate Aggregates');
  }

  // Update grid-cols for 5 cards
  content = content.replace('grid-cols-1 md:grid-cols-2 lg:grid-cols-4', 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5');

  // Insert the Total Holidays card before Total Presents
  const holidayCard = `
                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Holidays</p>
                      <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-500 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{totalHolidays}</p>
                    <p className="text-sm text-gray-400 mt-1">In selected period</p>
                  </div>
`;
  if (!content.includes('Total Holidays</p>')) {
    content = content.replace('<!-- Total Presents -->', holidayCard + '\n                  {/* Total Presents */}');
    // Wait, my comment in the original file was: {/* Total Presents */}
    content = content.replace('{/* Total Presents */}', holidayCard + '\n                  {/* Total Presents */}');
  }

  // Add to PDF Export Headers
  content = content.replace(
    'const tableColumn = ["Employee Name", "Total Days", "Working Days", "Presents", "WFM", "Leaves", "Worked (Excl. Weekends)"];',
    'const tableColumn = ["Employee Name", "Total Days", "Working Days", "Holidays", "Presents", "WFM", "Leaves", "Worked (Excl. Weekends)"];'
  );
  
  // Add to PDF Export Rows
  content = content.replace(
    'r.working_days_in_period,\n      r.present,',
    'r.working_days_in_period,\n      totalHolidays,\n      r.present,'
  );

  // Add to CSV Export Headers
  content = content.replace(
    "const headers = ['Employee Name', 'Total Days', 'Total Working Days', 'Presents', 'WFM', 'Leaves', 'Days Worked (Excl. Weekends)'];",
    "const headers = ['Employee Name', 'Total Days', 'Total Working Days', 'Holidays', 'Presents', 'WFM', 'Leaves', 'Days Worked (Excl. Weekends)'];"
  );

  // Add to CSV Export Rows
  content = content.replace(
    'r.working_days_in_period,\n        r.present,',
    'r.working_days_in_period,\n        totalHolidays,\n        r.present,'
  );

  // Add to HTML Table Headers
  content = content.replace(
    '<th className="px-6 py-3">Total Working Days</th>\n                      <th className="px-6 py-3">Presents</th>',
    '<th className="px-6 py-3">Total Working Days</th>\n                      <th className="px-6 py-3">Holidays</th>\n                      <th className="px-6 py-3">Presents</th>'
  );

  // Add to HTML Table Rows
  content = content.replace(
    '<td className="px-6 py-4 text-sm text-gray-600">{r.working_days_in_period}</td>\n                          <td className="px-6 py-4 text-sm text-gray-600 font-semibold">{r.present}</td>',
    '<td className="px-6 py-4 text-sm text-gray-600">{r.working_days_in_period}</td>\n                          <td className="px-6 py-4 text-sm text-pink-600 font-semibold">{totalHolidays}</td>\n                          <td className="px-6 py-4 text-sm text-gray-600 font-semibold">{r.present}</td>'
  );

  // Fix colspan
  content = content.replace('colSpan={8}', 'colSpan={9}');

  fs.writeFileSync(path, content, 'utf8');
  console.log("Updated", path);
}

processFrontend('/Users/rumaiharana/Documents/React-js/attendance-system');
processFrontend('/Users/rumaiharana/Documents/React-js/attendance-api/frontend');
