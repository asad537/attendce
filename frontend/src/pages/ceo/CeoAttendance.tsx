import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { attendanceService } from '../../services/attendanceService';
import { departmentService, userService } from '../../services/userService';
import { Attendance, Department, PaginatedResponse, User } from '../../types';
import { PageLoader } from '../../components/common/LoadingSpinner';

type AttStatus = 'present' | 'absent' | 'late' | 'on_leave' | 'holiday' | '';
const statusColor: Record<string, string> = {
  present: 'bg-emerald-50 text-emerald-700 ring-emerald-200', late: 'bg-amber-50 text-amber-700 ring-amber-200',
  absent: 'bg-rose-50 text-rose-700 ring-rose-200', on_leave: 'bg-blue-50 text-blue-700 ring-blue-200',
  holiday: 'bg-violet-50 text-violet-700 ring-violet-200', half_day: 'bg-orange-50 text-orange-700 ring-orange-200',
  work_from_home: 'bg-emerald-50 text-emerald-700 ring-emerald-200', weekend: 'bg-gray-50 text-gray-500 ring-gray-200',
};
const prettyStatus = (status: string) => status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const time = (value?: string) => value ? format(parseISO(value), 'hh:mm a') : '—';

export default function CeoAttendance() {
  const [data, setData] = useState<PaginatedResponse<Attendance> | null>(null);
  const [departments, setDepts] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterDept, setFilterDept] = useState('');
  const [filterEmp, setFilterEmp] = useState('');
  const [filterStatus, setFilterStatus] = useState<AttStatus>('');

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, per_page: 20 };
      if (filterDate) params.date = filterDate;
      if (filterDept) params.department_id = filterDept;
      if (filterEmp) params.user_id = filterEmp;
      if (filterStatus) params.status = filterStatus;
      setData(await attendanceService.getList(params));
    } catch { toast.error('Failed to load attendance records'); } finally { setLoading(false); }
  }, [filterDate, filterDept, filterEmp, filterStatus]);

  useEffect(() => {
    Promise.all([departmentService.getAll(), userService.getList({ per_page: 100 })])
      .then(([deps, users]) => { setDepts(deps); setEmployees(users.data); }).catch(() => undefined);
  }, []);
  useEffect(() => { load(1); }, [load]);

  const summary = useMemo(() => {
    const rows = data?.data || [];
    return { total: data?.meta.total || 0, present: rows.filter(a => ['present', 'late', 'work_from_home'].includes(a.status)).length, leave: rows.filter(a => a.status === 'on_leave').length, late: rows.filter(a => a.is_late).length };
  }, [data]);
  const clearFilters = () => { setFilterDate(format(new Date(), 'yyyy-MM-dd')); setFilterDept(''); setFilterEmp(''); setFilterStatus(''); };

  return <div className="space-y-5 p-4 sm:p-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="mb-2 inline-flex rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">ATTENDANCE</div><h1 className="text-2xl font-bold tracking-tight text-gray-950">Company Attendance</h1><p className="mt-1 text-sm text-gray-500">Track workforce attendance, working hours and punctuality.</p></div>
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm">▣ &nbsp;{format(parseISO(filterDate), 'EEEE, MMMM d, yyyy')}</div>
    </header>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
      ['Total Records', summary.total, 'bg-emerald-50 text-emerald-600', '◎'], ['Present', summary.present, 'bg-emerald-50 text-emerald-600', '✓'],
      ['On Leave', summary.leave, 'bg-blue-50 text-blue-600', '◇'], ['Late Arrivals', summary.late, 'bg-amber-50 text-amber-600', '◷'],
    ].map(([label, value, color, icon]) => <article key={String(label)} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p><span className={`grid h-9 w-9 place-items-center rounded-xl text-lg ${color}`}>{icon}</span></div><p className="mt-4 text-3xl font-bold text-gray-950">{value}</p><p className="mt-1 text-xs text-gray-400">Selected date and filters</p></article>)}</section>

    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-gray-900">Filter records</h2><p className="text-xs text-gray-400">Refine the attendance list below</p></div><button onClick={clearFilters} className="rounded-lg px-3 py-2 text-xs font-semibold text-emerald-600 ">Reset filters</button></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-semibold text-gray-600">Date<input type="date" className="input mt-1.5 w-full" value={filterDate} onChange={e => setFilterDate(e.target.value)} /></label>
        <label className="text-xs font-semibold text-gray-600">Department<select className="input mt-1.5 w-full" value={filterDept} onChange={e => setFilterDept(e.target.value)}><option value="">All Departments</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-gray-600">Employee<select className="input mt-1.5 w-full" value={filterEmp} onChange={e => setFilterEmp(e.target.value)}><option value="">All Employees</option>{employees.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-gray-600">Status<select className="input mt-1.5 w-full" value={filterStatus} onChange={e => setFilterStatus(e.target.value as AttStatus)}><option value="">All Statuses</option><option value="present">Present</option><option value="late">Late</option><option value="absent">Absent</option><option value="on_leave">On Leave</option><option value="holiday">Holiday</option></select></label>
      </div>
    </section>

    {loading ? <div className="rounded-2xl border border-gray-200 bg-white py-16"><PageLoader /></div> : <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><div><h2 className="font-bold text-gray-900">Attendance Records</h2><p className="text-xs text-gray-400">{data?.meta.total || 0} matching records</p></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">Page {data?.meta.current_page || 1}</span></div>
      {!data?.data.length ? <div className="grid min-h-60 place-items-center p-8 text-center"><div><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gray-100 text-2xl">⌕</div><h3 className="mt-4 font-semibold text-gray-800">No attendance found</h3><p className="mt-1 text-sm text-gray-400">Try changing or resetting your filters.</p></div></div> : <>
        <div className="divide-y divide-gray-100 md:hidden">{data.data.map(a => <article key={a.id} className="p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3">{a.user?.avatar_url ? <img src={a.user?.avatar_url} className="h-10 w-10 shrink-0 rounded-xl object-cover" /> : <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 font-bold text-emerald-600">{a.user?.name?.charAt(0).toUpperCase()}</div>}<div className="min-w-0"><p className="truncate font-semibold text-gray-900">{a.user?.name}</p><p className="text-xs text-gray-400">{a.user?.employee_id} · {format(parseISO(a.date), 'MMM d, yyyy')}</p></div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusColor[a.status] || statusColor.weekend}`}>{prettyStatus(a.status)}</span></div><div className="mt-4 grid grid-cols-3 rounded-xl bg-gray-50 p-3 text-center"><div><p className="text-[10px] uppercase text-gray-400">Check in</p><b className="text-xs">{time(a.check_in)}</b></div><div className="border-x"><p className="text-[10px] uppercase text-gray-400">Check out</p><b className="text-xs">{time(a.check_out)}</b></div><div><p className="text-[10px] uppercase text-gray-400">Hours</p><b className="text-xs">{a.working_hours > 0 ? `${a.working_hours.toFixed(1)}h` : '—'}</b></div></div></article>)}</div>
        <div className="hidden overflow-x-auto md:block"><table className="table min-w-[980px]"><thead><tr><th>Employee</th><th>Date</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Overtime</th><th>Mode</th><th>Late</th></tr></thead><tbody>{data.data.map(a => <tr key={a.id}><td><div className="flex items-center gap-3">{a.user?.avatar_url ? <img src={a.user?.avatar_url} className="h-9 w-9 shrink-0 rounded-xl object-cover" /> : <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-xs font-bold text-emerald-600">{a.user?.name?.charAt(0).toUpperCase()}</div>}<div><p className="font-semibold text-gray-900">{a.user?.name}</p><p className="text-xs text-gray-400">{a.user?.employee_id}</p></div></div></td><td className="whitespace-nowrap text-gray-600">{format(parseISO(a.date), 'EEE, MMM d, yyyy')}</td><td><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusColor[a.status] || statusColor.weekend}`}>{prettyStatus(a.status)}</span></td><td>{time(a.check_in)}</td><td>{time(a.check_out)}</td><td className="font-semibold text-gray-900">{a.working_hours > 0 ? `${a.working_hours.toFixed(1)}h` : '—'}</td><td className={a.overtime_minutes > 0 ? 'font-semibold text-emerald-600' : 'text-gray-300'}>{a.overtime_minutes > 0 ? `${(a.overtime_minutes / 60).toFixed(1)}h` : '—'}</td><td className="capitalize text-gray-500">{a.work_mode.replace('_', ' ')}</td><td>{a.is_late ? <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-600">{a.late_minutes}m</span> : <span className="text-gray-300">—</span>}</td></tr>)}</tbody></table></div>
      </>}
      {data && data.meta.last_page > 1 && <footer className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><span className="text-xs text-gray-500">Showing page {data.meta.current_page} of {data.meta.last_page} · {data.meta.total} records</span><div className="flex flex-wrap gap-1">{Array.from({ length: data.meta.last_page }, (_, i) => i + 1).map(page => <button key={page} onClick={() => load(page)} className={`grid h-8 min-w-8 place-items-center rounded-lg px-2 text-xs font-semibold ${page === data.meta.current_page ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>{page}</button>)}</div></footer>}
    </section>}
  </div>;
}
