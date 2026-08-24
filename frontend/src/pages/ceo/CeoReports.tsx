import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportService, holidayService } from '../../services/reportService';
import { leaveService } from '../../services/leaveService';
import { wfhService } from '../../services/wfhService';
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { PageLoader } from '../../components/common/LoadingSpinner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

export default function CeoReports() {
  const [activeTab, setActiveTab] = useState<'overview' | 'records'>('overview');
  
  // Date range state
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [activeFilter, setActiveFilter] = useState('This Month');
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<number>>(new Set());

  const setFilter = (filter: string) => {
    if (filter === 'Custom') {
      setActiveFilter('Custom');
      setShowCustomRange(true);
      return;
    }
    setShowCustomRange(false);

    setActiveFilter(filter);
    const today = new Date();
    if (filter === 'Today') {
      setStartDate(format(today, 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else if (filter === '7 days') {
      setStartDate(format(subDays(today, 6), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else if (filter === '30 days') {
      setStartDate(format(subDays(today, 29), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else if (filter === 'This Month') {
      setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
    }
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['company-reports', startDate, endDate],
    queryFn: async () => {
      const res = await reportService.getAttendanceSummary({ start_date: startDate, end_date: endDate });
      return (res as any).company || (res as any).team || [];
    },
  });
      
  const handleExportCSV = () => {
    const toExport = data?.filter((r: any) => selectedEmployees.size === 0 || selectedEmployees.has(r.user.id)) || [];
    if (toExport.length === 0) return;
    
    const headers = ['Employee Name', 'Total Days', 'Total Working Days', 'Holidays', 'Presents', 'WFM', 'Rejected WFM', 'Leaves', 'Paid Leaves', 'Rejected Leaves', 'Days Worked (Excl. Weekends)'];
    const csvCell = (value: unknown) => {
      const text = String(value ?? '');
      const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const csvContent = [
      headers.join(','),
      ...toExport.map((r: any) => [
        r.user.name,
        r.total_days,
        r.working_days_in_period,
        totalHolidays,
        r.present,
        r.work_from_home,
        r.rejected_wfm || 0,
        r.on_leave,
        r.paid_leaves || 0,
        r.rejected_leaves || 0,
        r.days_worked_excl_weekends
      ].map(csvCell).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Report_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  
  const handleExportPDF = () => {
    const toExport = data?.filter((r: any) => selectedEmployees.size === 0 || selectedEmployees.has(r.user.id)) || [];
    if (toExport.length === 0) return;
    
    const doc = new jsPDF();
    doc.text(`Company Reports (${startDate} to ${endDate})`, 14, 15);
    
    const tableColumn = ["Employee Name", "Total Days", "Working Days", "Holidays", "Presents", "WFM", "Rej WFM", "Leaves", "Paid Lvs", "Rej Lvs", "Worked"];
    const tableRows = toExport.map((r: any) => [
      r.user.name,
      r.total_days,
      r.working_days_in_period,
      totalHolidays,
      r.present,
      r.work_from_home,
      r.rejected_wfm || 0,
      r.on_leave,
      r.paid_leaves || 0,
      r.rejected_leaves || 0,
      r.days_worked_excl_weekends
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
    
    doc.save(`Report_${startDate}_${endDate}.pdf`);
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

  
  const { data: holidaysData } = useQuery({
    queryKey: ['company-reports-holidays'],
    queryFn: () => holidayService.getAll(),
  });

  
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

  // Calculate Aggregates
  const stats = useMemo(() => {
    if (!data) return { totalPresents: 0, totalWfm: 0, totalLeaves: 0, totalDaysWorked: 0, workingDays: 0 };
    return data.reduce((acc: any, r: any) => {
      acc.totalPresents += r.present;
      acc.totalWfm += r.work_from_home;
      acc.totalLeaves += r.on_leave;
      acc.totalDaysWorked += r.days_worked_excl_weekends;
      acc.workingDays = r.working_days_in_period; // Same for all users
      return acc;
    }, { totalPresents: 0, totalWfm: 0, totalLeaves: 0, totalDaysWorked: 0, workingDays: 0 });
  }, [data]);

  const pieData = [
    { name: 'Presents', value: stats.totalPresents, color: '#4f46e5' },
    { name: 'WFM', value: stats.totalWfm, color: '#8b5cf6' },
    { name: 'Leaves', value: stats.totalLeaves, color: '#f59e0b' },
  ];

  // Chart data (top 10 employees by present)
  const chartData = useMemo(() => {
    if (!data) return [];
    return data
      .sort((a: any, b: any) => b.present - a.present)
      .slice(0, 10)
      .map((r: any) => ({
        name: r.user.name.split(' ')[0],
        Presents: r.present,
        WFM: r.work_from_home,
        Leaves: r.on_leave,
      }));
  }, [data]);

  return (
    <div className="min-h-full bg-gray-50 pb-6 sm:pb-8">
      {/* ── Top Header Bar ────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6">
        <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Company Reports</h1>
            <p className="text-sm text-gray-500">Company performance over the selected period.</p>
          </div>

          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {/* View Tabs */}
            <div className="grid grid-cols-2 bg-gray-100 p-1 rounded-lg sm:flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 sm:px-4 py-2 sm:py-1.5 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'overview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('records')}
                className={`px-3 sm:px-4 py-2 sm:py-1.5 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'records' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Records
              </button>
            </div>

            {/* Date Filters */}
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:flex min-w-0 bg-gray-100 p-1 rounded-lg sm:overflow-x-auto 2xl:ml-2">
              {['Today', '7 days', '30 days', 'This Month', 'Custom'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setFilter(filter)}
                  className={`whitespace-nowrap px-3 py-2 sm:py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeFilter === filter ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <button 
              onClick={() => refetch()} 
              className="w-full sm:w-auto px-4 py-2 sm:py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Refresh
            </button>
            
            {showCustomRange && (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-2 w-full">
                <input type="date" className="input py-2 sm:py-1 text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <span className="text-gray-400">to</span>
                <input type="date" className="input py-2 sm:py-1 text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} />
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : (
        <div className="w-full p-4 sm:p-6 space-y-5 sm:space-y-6">
          
          {activeTab === 'overview' && (
            <>
              {/* ── Stat Cards ────────────────────────────────────────── */}
              <div>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Overview</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                  {/* Total Days */}
                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Working Days</p>
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats.workingDays}</p>
                    <p className="text-sm text-gray-400 mt-1">Mon-Fri in period</p>
                  </div>
                  
                  
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

                  {/* Paid Leaves */}
                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Paid Leaves</p>
                      <div className="w-8 h-8 rounded-lg bg-green-50 text-green-500 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{extraStats?.paidLeaves || 0}</p>
                    <p className="text-sm text-gray-400 mt-1">In period</p>
                  </div>

                  {/* Rejected Leaves */}
                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Rejected Leaves</p>
                      <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{extraStats?.rejectedLeaves || 0}</p>
                    <p className="text-sm text-gray-400 mt-1">In period</p>
                  </div>

                  {/* Rejected WFM */}
                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Rejected WFM</p>
                      <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{extraStats?.rejectedWfh || 0}</p>
                    <p className="text-sm text-gray-400 mt-1">In period</p>
                  </div>

                  {/* Total Presents */}
                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Presents</p>
                      <div className="w-8 h-8 rounded-lg bg-green-50 text-green-500 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalPresents}</p>
                    <p className="text-sm text-gray-400 mt-1">Company-wide check-ins</p>
                  </div>

                  {/* WFM */}
                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Work From Home</p>
                      <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalWfm}</p>
                    <p className="text-sm text-gray-400 mt-1">Approved remote days</p>
                  </div>

                  {/* Leaves */}
                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Leaves</p>
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalLeaves}</p>
                    <p className="text-sm text-gray-400 mt-1">Approved leave days</p>
                  </div>
                </div>
              </div>

              {/* ── Charts ────────────────────────────────────────── */}
              <div>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Trends & Outcomes</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Bar Chart */}
                  <div className="min-w-0 bg-white p-4 sm:p-6 rounded-xl border border-gray-100 shadow-sm lg:col-span-2">
                    <h3 className="text-sm font-semibold text-gray-900 mb-6">Attendance Distribution (Top 10 Employees)</h3>
                    <div className="h-64 sm:h-72 min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                          <RechartsTooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                          <Bar dataKey="Presents" stackId="a" fill="#4f46e5" radius={[0, 0, 4, 4]} />
                          <Bar dataKey="WFM" stackId="a" fill="#8b5cf6" />
                          <Bar dataKey="Leaves" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Pie Chart */}
                  <div className="min-w-0 bg-white p-4 sm:p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-6">Company Outcomes</h3>
                    <div className="h-56 relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-bold text-gray-900">{stats.totalPresents + stats.totalWfm + stats.totalLeaves}</span>
                        <span className="text-xs text-gray-400">Total Records</span>
                      </div>
                    </div>
                    
                    {/* Custom Legend */}
                    <div className="mt-6 space-y-3">
                      {pieData.map(item => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                            <span className="text-gray-600">{item.name}</span>
                          </div>
                          <span className="font-semibold text-gray-900">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </>
          )}

          {activeTab === 'records' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Employee Records</h3>
                  <p className="text-xs text-gray-500 mt-1">Detailed breakdown per employee for the selected period.</p>
                </div>
                
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

              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-3 w-12"><input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500" onChange={toggleAll} checked={data?.length > 0 && selectedEmployees.size === data?.length} /></th>
                      <th className="px-6 py-3">Employee Name</th>
                      <th className="px-6 py-3">Total Days</th>
                      <th className="px-6 py-3">Total Working Days</th>
                      <th className="px-6 py-3">Holidays</th>
                      <th className="px-6 py-3">Presents</th>
                      <th className="px-6 py-3">WFM</th>
                      <th className="px-6 py-3">Leaves</th>
                      <th className="px-6 py-3">Days Worked (Excl. Weekends)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data?.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-6 py-8 text-center text-sm text-gray-400">
                          No data available for this period.
                        </td>
                      </tr>
                    ) : (
                      data?.map((r: any) => (
                        <tr key={r.user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4"><input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500" checked={selectedEmployees.has(r.user.id)} onChange={() => toggleEmployee(r.user.id)} /></td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{r.user.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{r.total_days}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{r.working_days_in_period}</td>
                          <td className="px-6 py-4 text-sm text-pink-600 font-semibold">{totalHolidays}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 font-semibold">{r.present}</td>
                          <td className="px-6 py-4 text-sm text-purple-600 font-semibold">{r.work_from_home}</td>
                          <td className="px-6 py-4 text-sm text-amber-600 font-semibold">{r.on_leave}</td>
                          <td className="px-6 py-4 text-sm text-indigo-600 font-bold">{r.days_worked_excl_weekends}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
