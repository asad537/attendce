import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { reportService } from '../../services/reportService';
import { PageLoader } from '../../components/common/LoadingSpinner';

type ReportRow = {
  user: { id: number; name: string; employee_id?: string; role?: string; designation?: { name?: string }; department?: { name?: string } };
  total_days?: number; working_days_in_period?: number; present?: number; work_from_home?: number;
  on_leave?: number; days_worked_excl_weekends?: number; total_working_hours?: number; avg_working_hours?: number;
  assigned_tickets?: number; completed_tickets?: number; in_progress_tickets?: number; overdue_tickets?: number;
  ticket_worklog_hours?: number;
};

const palette = ['#25b99a', '#167463', '#d9a446', '#669c8c', '#477b72', '#d27660'];
const initials = (name = '') => name.split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'U';

function Avatar({ name, index }: { name: string; index: number }) {
  return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white ring-4 ring-emerald-50" style={{ background: `linear-gradient(145deg,${palette[index % palette.length]},var(--color-emerald-800, #0b5b50))` }}>{initials(name)}</span>;
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[18px] border border-[#edf1ef] bg-white shadow-[0_8px_30px_rgba(31,62,53,.035)] ${className}`}>{children}</section>;
}

function PeriodSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="relative inline-flex shrink-0 items-center">
    <select value={value} onChange={event => onChange(event.target.value)} className="h-11 min-w-[148px] cursor-pointer appearance-none rounded-[14px] border-0 bg-emerald-50 py-0 pl-5 pr-11 text-sm font-semibold text-emerald-800 outline-none transition hover:bg-emerald-100 focus:ring-2 focus:ring-emerald-500/40">
      <option value="This Month">This Month</option>
      <option value="Last Month">Last Month</option>
    </select>
    <svg className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
  </label>;
}

async function fetchReportRows(startDate: string, endDate: string): Promise<ReportRow[]> {
  const response: unknown = await reportService.getAttendanceSummary({ start_date: startDate, end_date: endDate });
  if (Array.isArray(response)) return response as ReportRow[];
  if (response && typeof response === 'object') {
    const payload = response as Record<string, unknown>;
    if (Array.isArray(payload.company)) return payload.company as ReportRow[];
    if (Array.isArray(payload.team)) return payload.team as ReportRow[];
  }
  return [];
}

function rowIndex(row: ReportRow) {
  const workingDays = Math.max(1, Number(row.working_days_in_period || row.total_days || 1));
  const worked = Number(row.days_worked_excl_weekends ?? ((row.present || 0) + (row.work_from_home || 0)));
  const attendance = Math.min(100, Math.round(worked / workingDays * 100));
  const assigned = Number(row.assigned_tickets || 0);
  const completion = assigned ? Math.min(100, Math.round(Number(row.completed_tickets || 0) / assigned * 100)) : 0;
  return assigned ? Math.round(attendance * .6 + completion * .4) : attendance;
}

export default function CeoReports() {
  const [period, setPeriod] = useState('This Month');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'score', direction: 'desc' });
  const [openMenu, setOpenMenu] = useState<'average' | 'top' | 'alerts' | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'records'>('overview');
  const [recordUserId, setRecordUserId] = useState<number | null>(null);
  const perPage = 7;
  const range = useMemo(() => {
    const date = period === 'Last Month' ? subMonths(new Date(), 1) : new Date();
    return { startDate: format(startOfMonth(date), 'yyyy-MM-dd'), endDate: format(endOfMonth(date), 'yyyy-MM-dd') };
  }, [period]);

  const { data = [], isLoading } = useQuery<ReportRow[]>({
    queryKey: ['company-reports', range.startDate, range.endDate],
    queryFn: () => fetchReportRows(range.startDate, range.endDate),
  });

  const previousRange = useMemo(() => {
    const selected = period === 'Last Month' ? subMonths(new Date(), 1) : new Date();
    const previous = subMonths(selected, 1);
    return { startDate: format(startOfMonth(previous), 'yyyy-MM-dd'), endDate: format(endOfMonth(previous), 'yyyy-MM-dd') };
  }, [period]);
  const { data: previousData = [] } = useQuery<ReportRow[]>({
    queryKey: ['company-reports-previous', previousRange.startDate, previousRange.endDate],
    queryFn: () => fetchReportRows(previousRange.startDate, previousRange.endDate),
  });

  const employees = useMemo(() => data.map(row => {
    const workingDays = Math.max(1, Number(row.working_days_in_period || row.total_days || 1));
    const worked = Number(row.days_worked_excl_weekends ?? ((row.present || 0) + (row.work_from_home || 0)));
    const attendance = Math.min(100, Math.round(worked / workingDays * 100));
    const assignedTickets = Number(row.assigned_tickets || 0);
    const completedTickets = Number(row.completed_tickets || 0);
    const completionRate = assignedTickets ? Math.min(100, Math.round(completedTickets / assignedTickets * 100)) : 0;
    const score = rowIndex(row);
    return { ...row, attendance, assignedTickets, completedTickets, completionRate, score, workingHours: Number(row.total_working_hours || 0), ticketHours: Number(row.ticket_worklog_hours || 0), inProgressTickets: Number(row.in_progress_tickets || 0), overdueTickets: Number(row.overdue_tickets || 0), role: row.user.designation?.name || row.user.role || 'Team Member', department: row.user.department?.name || 'Operations' };
  }), [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? employees.filter(e => [e.user.name, e.user.employee_id, e.role, e.department].some(value => value?.toLowerCase().includes(term))) : employees;
  }, [employees, search]);
  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const values: Record<string, [string | number, string | number]> = {
      name: [a.user.name, b.user.name], role: [a.role, b.role], attendance: [a.attendance, b.attendance],
      workingHours: [a.workingHours, b.workingHours], assignedTickets: [a.assignedTickets, b.assignedTickets],
      completedTickets: [a.completedTickets, b.completedTickets], ticketHours: [a.ticketHours, b.ticketHours],
      leaves: [Number(a.on_leave || 0), Number(b.on_leave || 0)], score: [a.score, b.score],
    };
    const [left, right] = values[sort.key] || values.score;
    const comparison = typeof left === 'string' ? left.localeCompare(String(right)) : Number(left) - Number(right);
    return sort.direction === 'asc' ? comparison : -comparison;
  }), [filtered, sort]);
  const pageCount = Math.max(1, Math.ceil(sorted.length / perPage));
  const visible = sorted.slice((page - 1) * perPage, page * perPage);
  const top = [...employees].sort((a, b) => b.score - a.score).slice(0, 5);
  const alerts = [...employees].sort((a, b) => (b.overdueTickets - a.overdueTickets) || (a.attendance - b.attendance)).slice(0, 3);
  const average = employees.length ? Math.round(employees.reduce((sum, e) => sum + e.score, 0) / employees.length) : 0;
  const previousAverage = previousData.length ? Math.round(previousData.reduce((sum, row) => sum + rowIndex(row), 0) / previousData.length) : 0;
  const averageChange = average - previousAverage;
  const totalWorkingHours = employees.reduce((sum, e) => sum + e.workingHours, 0);
  const totalTicketHours = employees.reduce((sum, e) => sum + e.ticketHours, 0);
  const totalAssigned = employees.reduce((sum, e) => sum + e.assignedTickets, 0);
  const totalCompleted = employees.reduce((sum, e) => sum + e.completedTickets, 0);
  const avgAttendance = employees.length ? Math.round(employees.reduce((sum, e) => sum + e.attendance, 0) / employees.length) : 0;
  const ticketCompletion = totalAssigned ? Math.min(100, Math.round(totalCompleted / totalAssigned * 100)) : 0;
  const expectedHours = employees.reduce((sum, e) => sum + Number(e.working_days_in_period || 0) * 8, 0);
  const hoursProgress = expectedHours ? Math.min(100, Math.round(totalWorkingHours / expectedHours * 100)) : 0;
  const worklogCoverage = totalWorkingHours ? Math.min(100, Math.round(totalTicketHours / totalWorkingHours * 100)) : 0;
  const categories = [
    { label: 'Attendance Rate', value: `${avgAttendance}%`, percent: avgAttendance, color: 'var(--color-emerald-400)' },
    { label: 'Attendance Working Hours', value: `${totalWorkingHours.toFixed(1)}h`, percent: hoursProgress, color: '#196657' },
    { label: 'Tickets Completed', value: `${totalCompleted}/${totalAssigned}`, percent: ticketCompletion, color: '#7b8581' },
    { label: 'Ticket Worklogs', value: `${totalTicketHours.toFixed(1)}h`, percent: worklogCoverage, color: '#f1c75d' },
  ];
  const departments = useMemo(() => {
    const groups = new Map<string, { name: string; attendance: number; completion: number; count: number }>();
    employees.forEach(e => { const g = groups.get(e.department) || { name: e.department, attendance: 0, completion: 0, count: 0 }; g.attendance += e.attendance; g.completion += e.completionRate; g.count++; groups.set(e.department, g); });
    const result = Array.from(groups.values()).map(g => { const attendance = Math.round(g.attendance / g.count); const completion = Math.round(g.completion / g.count); return { ...g, attendance, completion, score: Math.round(attendance * .6 + completion * .4) }; });
    return result.slice(0, 6);
  }, [employees]);
  const selectedRecord = employees.find(employee => employee.user.id === recordUserId) || null;

  const changeSort = (key: string) => {
    setSort(current => ({ key, direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc' }));
    setPage(1);
  };
  const sortLabel = (label: string, key: string) => <button onClick={() => changeSort(key)} className="inline-flex items-center gap-1 hover:text-emerald-700">{label}<span>{sort.key === key ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</span></button>;

  const exportPdf = (rows = filtered, suffix = 'performance') => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(17); doc.text(`Performance Report — ${period}`, 14, 16);
    autoTable(doc, { startY: 23, head: [['Employee', 'Job title', 'Attendance', 'Working hours', 'Assigned tickets', 'Completed', 'Ticket worklog', 'Leaves', 'Index']], body: rows.map(e => [e.user.name, e.role, `${e.attendance}%`, e.workingHours.toFixed(1), e.assignedTickets, e.completedTickets, e.ticketHours.toFixed(1), e.on_leave || 0, `${e.score}%`]), headStyles: { fillColor: [18, 107, 91] } });
    doc.save(`${suffix}-${range.startDate}-${range.endDate}.pdf`);
  };

  if (isLoading) return <PageLoader />;

  return <div className="min-h-full bg-[#f7f9f8] px-4 py-6 text-[#17251f] sm:px-6 lg:px-8">
    <div className="mx-auto max-w-[1560px]">
      <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div><h1 className="text-[26px] font-bold tracking-[-.035em]">Performance</h1><p className="mt-1 text-sm text-[#8a9691]"><span className="font-semibold text-emerald-500">Dashboard</span><span className="mx-2">/</span>Performance</p></div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative block sm:w-80"><svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#50605a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search anything" className="h-12 w-full rounded-2xl border border-[#edf1ef] bg-white pl-12 pr-4 text-sm outline-none focus:border-[#49b9a2] focus:ring-4 focus:ring-emerald-100" /></label>
          <button onClick={() => exportPdf()} className="h-12 rounded-2xl bg-emerald-100 px-5 text-sm font-bold text-[#245849] ">Export report</button>
        </div>
      </header>

      <div className="mb-5 inline-flex rounded-xl border border-[#e5ebe8] bg-white p-1 shadow-sm">
        <button onClick={() => setActiveTab('overview')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === 'overview' ? 'bg-emerald-600 text-white shadow-sm' : 'text-[#66756f] hover:bg-emerald-50'}`}>Overview</button>
        <button onClick={() => setActiveTab('records')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${activeTab === 'records' ? 'bg-emerald-600 text-white shadow-sm' : 'text-[#66756f] hover:bg-emerald-50'}`}>Records</button>
      </div>

      {activeTab === 'records' && <Card className="overflow-hidden"><div className="flex flex-col gap-4 border-b border-[#edf1ef] p-5 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-bold">Employee Performance Records</h2><p className="mt-1 text-xs text-[#929d98]">Choose an employee and export their selected-period performance report.</p></div><div className="flex flex-col gap-2 sm:flex-row"><select value={recordUserId ?? ''} onChange={event => setRecordUserId(event.target.value ? Number(event.target.value) : null)} className="h-11 min-w-56 rounded-xl border border-[#dfe6e3] bg-white px-3 text-sm outline-none focus:border-emerald-500"><option value="">Select employee…</option>{employees.map(employee => <option key={employee.user.id} value={employee.user.id}>{employee.user.name} — {employee.user.employee_id || employee.role}</option>)}</select><button disabled={!selectedRecord} onClick={() => selectedRecord && exportPdf([selectedRecord], `performance-${selectedRecord.user.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`)} className="h-11 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">Export selected</button></div></div>{selectedRecord ? <div className="grid gap-px bg-[#edf1ef] sm:grid-cols-2 lg:grid-cols-5">{[['Attendance', `${selectedRecord.attendance}%`], ['Working Hours', `${selectedRecord.workingHours.toFixed(1)}h`], ['Tickets Completed', `${selectedRecord.completedTickets}/${selectedRecord.assignedTickets}`], ['Ticket Worklogs', `${selectedRecord.ticketHours.toFixed(1)}h`], ['Performance Index', `${selectedRecord.score}/100`]].map(([label,value]) => <div key={label} className="bg-white p-5"><small className="text-xs text-[#8a9691]">{label}</small><b className="mt-2 block text-2xl text-emerald-700">{value}</b></div>)}</div> : <div className="py-16 text-center text-sm text-[#929d98]">Select an employee to view and export their records.</div>}</Card>}

      {activeTab === 'overview' && <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="min-w-0 space-y-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(330px,.9fr)_minmax(420px,1.3fr)]">
            <Card className="p-5 sm:p-6">
              <div className="mb-7 flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Team Performance</h2><PeriodSelect value={period} onChange={value => { setPeriod(value); setPage(1); }} /></div>
              <div className="flex h-64 items-end justify-around gap-3 border-b border-[#edf1ef] px-1">
                {departments.map(department => <div key={department.name} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={`${department.name}: ${department.attendance}% attendance, ${department.completion}% ticket completion`}><span className="mb-3 text-xs font-bold text-[#50605a]">{department.score}%</span><div className="flex h-[76%] w-full max-w-[48px] flex-col justify-end overflow-hidden rounded-t-lg bg-[#f2f4f3]"><span className="bg-[var(--color-emerald-100,#e2f1d9)]" style={{ height: `${Math.max(0, 100 - department.score)}%` }}/><span className="bg-[var(--color-emerald-500,#10b981)]" style={{ height: `${department.completion * .4}%` }}/><span className="bg-[var(--color-emerald-800,#064e3b)]" style={{ height: `${department.attendance * .6}%` }}/></div><span className="mt-3 max-w-full truncate text-[11px] text-[#7c8984]">{department.name.split(' ')[0]}</span></div>)}
                {!departments.length && <div className="flex h-full w-full items-center justify-center text-sm text-[#929d98]">No department activity in this period.</div>}
              </div>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-[#87938e]">{[['var(--color-emerald-800,#064e3b)','Attendance (60%)'],['var(--color-emerald-500,#10b981)','Tickets done (40%)'],['var(--color-emerald-100,#e2f1d9)','Remaining']].map(([color,label]) => <span key={label} className="flex items-center gap-2"><i className="h-1.5 w-6 rounded-full" style={{ backgroundColor: color }}/>{label}</span>)}</div>
            </Card>

            <Card className="p-5 sm:p-6">
              <div className="mb-8 flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Real System Metrics</h2><PeriodSelect value={period} onChange={value => { setPeriod(value); setPage(1); }} /></div>
              <div className="space-y-6">{categories.map(metric => <div key={metric.label}><div className="mb-2 flex justify-between text-sm"><span className="font-semibold text-[#52615b]">{metric.label}</span><span><b>{metric.value}</b><b className="ml-4">{metric.percent}%</b></span></div><div className="flex h-8 gap-[3px]">{Array.from({length:38}).map((_,i) => <i key={i} className="h-full min-w-1 flex-1 rounded-[2px]" style={{ backgroundColor: i < Math.round(metric.percent * .38) ? metric.color : '#eef1ef' }}/>)}</div></div>)}</div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h2 className="text-lg font-bold">Employee Activity</h2><p className="mt-1 text-xs text-[#929d98]">Live attendance, ticket and worklog totals from your system</p></div><PeriodSelect value={period} onChange={value => { setPeriod(value); setPage(1); }} /></div>
            <div id="employee-activity" className="overflow-x-auto"><table className="w-full min-w-[1080px] text-left"><thead className="bg-[#fafbfa] text-[11px] font-semibold text-[#8b9691]"><tr><th className="px-6 py-4">{sortLabel('Name','name')}</th><th className="px-4 py-4">{sortLabel('Job Title','role')}</th><th className="px-4 py-4 text-center">{sortLabel('Attendance','attendance')}</th><th className="px-4 py-4 text-center">{sortLabel('Working Hours','workingHours')}</th><th className="px-4 py-4 text-center">{sortLabel('Assigned Tickets','assignedTickets')}</th><th className="px-4 py-4 text-center">{sortLabel('Completed','completedTickets')}</th><th className="px-4 py-4 text-center">{sortLabel('Ticket Worklog','ticketHours')}</th><th className="px-4 py-4 text-center">{sortLabel('Leaves','leaves')}</th><th className="px-6 py-4 text-center">{sortLabel('Index','score')}</th></tr></thead>
              <tbody className="divide-y divide-[#edf1ef]">{visible.length ? visible.map((employee,index) => <tr key={employee.user.id} className="hover:bg-[#fbfdfc]"><td className="px-6 py-4"><div className="flex items-center gap-3"><Avatar name={employee.user.name} index={index}/><span><b className="block text-sm">{employee.user.name}</b><small className="text-[#9aa49f]">{employee.user.employee_id || `EMP-${String(employee.user.id).padStart(4,'0')}`}</small></span></div></td><td className="px-4 py-4"><b className="block text-sm font-semibold text-[#45534e]">{employee.role}</b><small className="text-[#9aa49f]">{employee.department}</small></td><td className="px-4 py-4 text-center text-sm font-semibold">{employee.attendance}%<small className="block font-normal text-[#9aa49f]">{employee.days_worked_excl_weekends || 0} days</small></td><td className="px-4 py-4 text-center text-sm font-semibold">{employee.workingHours.toFixed(1)}h<small className="block font-normal text-[#9aa49f]">avg {Number(employee.avg_working_hours || 0).toFixed(1)}h</small></td><td className="px-4 py-4 text-center text-sm font-semibold">{employee.assignedTickets}<small className="block font-normal text-[#9aa49f]">{employee.inProgressTickets} active</small></td><td className="px-4 py-4 text-center text-sm font-bold text-emerald-700">{employee.completedTickets}<small className="block font-normal text-[#9aa49f]">{employee.completionRate}% rate</small></td><td className="px-4 py-4 text-center text-sm font-semibold">{employee.ticketHours.toFixed(1)}h</td><td className="px-4 py-4 text-center text-sm font-semibold">{employee.on_leave || 0}<small className="block font-normal text-[#9aa49f]">WFM {employee.work_from_home || 0}</small></td><td className="px-6 py-4 text-center text-sm font-extrabold text-emerald-700">{employee.score}</td></tr>) : <tr><td colSpan={9} className="px-6 py-12 text-center text-sm text-[#929d98]">No employee matches your search.</td></tr>}</tbody>
            </table></div>
            <div className="flex flex-col gap-3 border-t border-[#edf1ef] px-6 py-4 text-sm text-[#7e8b86] sm:flex-row sm:items-center sm:justify-between"><span>Showing <b className="text-[#33443d]">{visible.length}</b> of <b className="text-[#33443d]">{filtered.length}</b> results</span><div className="flex items-center gap-1"><button onClick={() => setPage(Math.max(1,page-1))} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-emerald-50">‹</button>{Array.from({length:Math.min(4,pageCount)}).map((_,i) => <button key={i} onClick={() => setPage(i+1)} className={`grid h-9 w-9 place-items-center rounded-lg font-semibold ${page === i+1 ? 'bg-emerald-500 text-white' : 'hover:bg-emerald-50'}`}>{i+1}</button>)}<button onClick={() => setPage(Math.min(pageCount,page+1))} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-emerald-50">›</button></div></div>
          </Card>
        </main>

        <aside className="space-y-5">
          <Card className="relative p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Average Performance</h2><button onClick={() => setOpenMenu(openMenu === 'average' ? null : 'average')} aria-label="Average performance options" className="text-xl tracking-[3px] text-[#94a09b]">•••</button></div>{openMenu === 'average' && <div className="absolute right-5 top-14 z-20 w-44 rounded-xl border border-[#e5ebe8] bg-white p-1 text-sm shadow-xl"><button onClick={() => { exportPdf(); setOpenMenu(null); }} className="w-full rounded-lg px-3 py-2 text-left hover:bg-emerald-50">Export report</button><button onClick={() => { setPeriod(period === 'This Month' ? 'Last Month' : 'This Month'); setOpenMenu(null); }} className="w-full rounded-lg px-3 py-2 text-left hover:bg-emerald-50">Compare period</button></div>}<div className="relative mx-auto mt-6 h-[180px] w-[260px] overflow-hidden"><div className="absolute left-5 top-3 h-[230px] w-[230px] rounded-full" style={{ background: `conic-gradient(from 270deg,var(--color-emerald-800) 0deg ${average*1.8}deg,var(--color-emerald-400) ${average*1.8}deg 180deg,transparent 180deg)` }}/><div className="absolute left-[48px] top-[31px] h-[174px] w-[174px] rounded-full bg-white"/><div className="absolute inset-x-0 top-[82px] text-center"><span className="block text-xs text-[#98a29e]">Performance Index</span><b className="text-4xl tracking-[-.04em] text-[var(--color-emerald-800)]">{average}%</b><span className={`mx-auto mt-2 block w-fit rounded-md px-2 py-1 text-xs font-bold ${averageChange >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-50 text-red-600'}`}>{averageChange >= 0 ? '↗' : '↘'} {Math.abs(averageChange)}% vs previous</span></div></div></Card>
          <Card className="relative p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Top Performers</h2><button onClick={() => setOpenMenu(openMenu === 'top' ? null : 'top')} aria-label="Top performers options" className="text-xl tracking-[3px] text-[#94a09b]">•••</button></div>{openMenu === 'top' && <div className="absolute right-5 top-14 z-20 w-48 rounded-xl border border-[#e5ebe8] bg-white p-1 text-sm shadow-xl"><button onClick={() => { changeSort('score'); setOpenMenu(null); document.getElementById('employee-activity')?.scrollIntoView({ behavior: 'smooth' }); }} className="w-full rounded-lg px-3 py-2 text-left hover:bg-emerald-50">View ranked table</button><button onClick={() => { exportPdf(); setOpenMenu(null); }} className="w-full rounded-lg px-3 py-2 text-left hover:bg-emerald-50">Export performers</button></div>}<div className="divide-y divide-[#edf1ef]">{top.map((employee,index) => <button onClick={() => { setSearch(employee.user.name); setPage(1); document.getElementById('employee-activity')?.scrollIntoView({ behavior: 'smooth' }); }} key={employee.user.id} className="flex w-full items-center gap-3 py-4 text-left hover:bg-[#fbfdfc]"><Avatar name={employee.user.name} index={index}/><span className="min-w-0 flex-1"><b className="block truncate text-sm">{employee.user.name}</b><small className="block truncate text-[#929d98]">{employee.role}</small></span><b className="text-sm text-emerald-700">{employee.score}<small className="font-normal text-[#9aa49f]">/100</small></b></button>)}</div>{!top.length && <p className="py-8 text-center text-sm text-[#929d98]">No performance data yet.</p>}</Card>
          <Card className="relative p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Activity Alerts</h2><button onClick={() => setOpenMenu(openMenu === 'alerts' ? null : 'alerts')} aria-label="Activity alert options" className="text-xl tracking-[3px] text-[#94a09b]">•••</button></div>{openMenu === 'alerts' && <div className="absolute right-5 top-14 z-20 w-44 rounded-xl border border-[#e5ebe8] bg-white p-1 text-sm shadow-xl"><button onClick={() => { setSearch(''); changeSort('attendance'); setOpenMenu(null); document.getElementById('employee-activity')?.scrollIntoView({ behavior: 'smooth' }); }} className="w-full rounded-lg px-3 py-2 text-left hover:bg-emerald-50">Review all activity</button></div>}<div className="divide-y divide-[#edf1ef]">{alerts.map((employee,index) => <button onClick={() => { setSearch(employee.user.name); setPage(1); document.getElementById('employee-activity')?.scrollIntoView({ behavior: 'smooth' }); }} key={employee.user.id} className="flex w-full gap-3 py-4 text-left hover:bg-[#fbfdfc]"><Avatar name={employee.user.name} index={index+3}/><span className="min-w-0"><b className="text-sm">{employee.user.name}</b><span className="ml-2 text-xs text-[#78857f]">{employee.role}</span><small className="mt-1 block leading-5 text-[#929d98]">{employee.overdueTickets > 0 ? `${employee.overdueTickets} overdue ticket${employee.overdueTickets > 1 ? 's' : ''} need attention.` : employee.attendance < 70 ? `Attendance rate is ${employee.attendance}% this month.` : `${employee.inProgressTickets} active tickets and ${employee.ticketHours.toFixed(1)} logged hours.`}</small></span></button>)}</div>{!alerts.length && <p className="py-8 text-center text-sm text-[#929d98]">No alerts for this period.</p>}</Card>
        </aside>
      </div>}
      <footer className="mt-8 flex flex-col gap-3 border-t border-[#e8edeb] py-5 text-xs text-[#8a9691] sm:flex-row sm:items-center sm:justify-between"><b className="text-[#45534e]">Copyright © 2026 Attendance System</b><span className="flex gap-5"><a href="#">Privacy Policy</a><a href="#">Terms and conditions</a><a href="#">Contact</a></span></footer>
    </div>
  </div>;
}
