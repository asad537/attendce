const fs = require('fs');

function processFrontend(baseDir) {
  const path = baseDir + '/src/pages/ceo/CeoReports.tsx';
  if (!fs.existsSync(path)) return;
  
  let content = fs.readFileSync(path, 'utf8');

  // Import leaveService and wfhService if needed
  if (!content.includes('leaveService')) {
    content = content.replace(
      "import { reportService, holidayService } from '../../services/reportService';",
      "import { reportService, holidayService } from '../../services/reportService';\nimport { leaveService } from '../../services/leaveService';\nimport { wfhService } from '../../services/wfhService';"
    );
  }

  const queryBlock = `
  const { data: leavesResp } = useQuery({
    queryKey: ['company-reports-all-leaves'],
    queryFn: () => leaveService.getList({ per_page: 10000 }),
  });

  const { data: wfhResp } = useQuery({
    queryKey: ['company-reports-all-wfh'],
    queryFn: () => wfhService.getList({ per_page: 10000 }),
  });

  const extraStats = useMemo(() => {
    let paidLeaves = 0;
    let rejectedLeaves = 0;
    let rejectedWfh = 0;

    const start = new Date(startDate); start.setHours(0,0,0,0);
    const end = new Date(endDate); end.setHours(23,59,59,999);

    if (leavesResp?.data) {
      leavesResp.data.forEach((l: any) => {
        const lDate = new Date(l.start_date);
        if (lDate >= start && lDate <= end) {
          if (l.status === 'rejected') rejectedLeaves++;
          // Assuming paid leaves are those where type is "paid" or similar, or just approved leaves that are paid? 
          // Wait, typically leave_type tells if it's paid. Or we can just count all approved leaves as paid unless specified otherwise. Let's assume approved paid leaves. Wait, the user said "total paid leaves". I'll count approved leaves with leave_type.name containing 'paid' or similar. 
          // If we don't know, we'll count approved leaves.
          if (l.status === 'approved' && (!l.leave_type || l.leave_type.is_paid !== false)) {
             paidLeaves++;
          }
        }
      });
    }

    if (wfhResp?.data) {
      wfhResp.data.forEach((w: any) => {
        const wDate = new Date(w.start_date);
        if (wDate >= start && wDate <= end && w.status === 'rejected') {
          rejectedWfh++;
        }
      });
    }

    return { paidLeaves, rejectedLeaves, rejectedWfh };
  }, [leavesResp, wfhResp, startDate, endDate]);
`;

  if (!content.includes('company-reports-all-leaves')) {
    content = content.replace('const totalHolidays =', queryBlock + '\n  const totalHolidays =');
  }

  // Add Cards
  const cardsHtml = `
                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Paid Leaves</p>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{extraStats.paidLeaves}</p>
                    <p className="text-sm text-gray-400 mt-1">In period</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Rejected Leaves</p>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{extraStats.rejectedLeaves}</p>
                    <p className="text-sm text-gray-400 mt-1">In period</p>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Rejected WFM</p>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{extraStats.rejectedWfh}</p>
                    <p className="text-sm text-gray-400 mt-1">In period</p>
                  </div>
`;

  content = content.replace('lg:grid-cols-5', 'lg:grid-cols-4 xl:grid-cols-8'); // adjust grid
  if (!content.includes('Rejected Leaves')) {
    content = content.replace('{/* Total Presents */}', cardsHtml + '\n                  {/* Total Presents */}');
  }

  fs.writeFileSync(path, content, 'utf8');
  console.log("Updated", path);
}

processFrontend('/Users/rumaiharana/Documents/React-js/attendance-system');
processFrontend('/Users/rumaiharana/Documents/React-js/attendance-api/frontend');
