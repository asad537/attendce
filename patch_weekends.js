const fs = require('fs');

function processFrontend(baseDir) {
  const path = baseDir + '/src/pages/ceo/CeoReports.tsx';
  if (!fs.existsSync(path)) return;
  
  let content = fs.readFileSync(path, 'utf8');

  const oldLogic = `
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

  const newLogic = `
  const totalHolidays = useMemo(() => {
    if (!holidaysData) return 0;
    
    // Create a Set of configured holiday dates for fast lookup (YYYY-MM-DD format)
    const configuredHolidays = new Set(
      holidaysData.map((h: any) => h.date.split('T')[0])
    );
    
    const start = new Date(startDate);
    start.setHours(0,0,0,0);
    const end = new Date(endDate);
    end.setHours(23,59,59,999);
    
    let count = 0;
    let current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
      const dateString = format(current, 'yyyy-MM-dd'); // date-fns format
      
      // If it's a weekend OR it's a configured holiday, count it as a holiday
      if (isWeekend || configuredHolidays.has(dateString)) {
        count++;
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }, [holidaysData, startDate, endDate]);
`;

  content = content.replace(oldLogic.trim(), newLogic.trim());
  fs.writeFileSync(path, content, 'utf8');
  console.log("Updated", path);
}

processFrontend('/Users/rumaiharana/Documents/React-js/attendance-system');
processFrontend('/Users/rumaiharana/Documents/React-js/attendance-api/frontend');
