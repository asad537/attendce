import { useEffect, useMemo, useState } from 'react';
import { attendanceService } from '../../services/attendanceService';
import { Attendance, PaginatedResponse } from '../../types';
import StatusBadge from '../../components/common/StatusBadge';
import { PageLoader } from '../../components/common/LoadingSpinner';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';

export default function AttendanceHistory() {
  const [data, setData]   = useState<PaginatedResponse<Attendance> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage]   = useState(1);
  const [startDate, setStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEnd]     = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const load = async () => {
    setLoading(true);
    try {
      const res = await attendanceService.getList({ start_date: startDate, end_date: endDate, page, per_page: 20 });
      setData(res);
    } catch { toast.error('Failed to load attendance'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, startDate, endDate]);

  const summary = useMemo(() => {
    const rows = data?.data || [];
    return {
      records: data?.meta.total || 0,
      present: rows.filter(row => ['present', 'late', 'work_from_home'].includes(row.status)).length,
      hours: rows.reduce((total, row) => total + (row.working_hours || 0), 0),
      late: rows.filter(row => row.is_late).length,
    };
  }, [data]);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <header><div className="mb-2 inline-flex rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">ATTENDANCE</div><h1 className="text-2xl font-bold tracking-tight text-gray-950">My Attendance</h1><p className="mt-1 text-sm text-gray-500">Review your attendance, working hours and punctuality.</p></header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
        ['Total Records', summary.records, '◎', 'bg-indigo-50 text-indigo-600'],
        ['Present Days', summary.present, '✓', 'bg-emerald-50 text-emerald-600'],
        ['Hours Worked', `${summary.hours.toFixed(1)}h`, '◷', 'bg-blue-50 text-blue-600'],
        ['Late Arrivals', summary.late, '!', 'bg-amber-50 text-amber-600'],
      ].map(([label, value, icon, color]) => <article key={String(label)} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-gray-400">{label}</p><span className={`grid h-9 w-9 place-items-center rounded-xl font-bold ${color}`}>{icon}</span></div><p className="mt-4 text-2xl font-bold text-gray-950">{value}</p><p className="mt-1 text-xs text-gray-400">Selected period</p></article>)}</section>

      {/* Filters */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4"><h2 className="font-bold text-gray-900">Select date range</h2><p className="text-xs text-gray-400">Choose the period you want to review</p></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="w-full">
            <label className="label text-xs">From</label>
            <input type="date" className="input text-sm" value={startDate} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="w-full">
            <label className="label text-xs">To</label>
            <input type="date" className="input text-sm" value={endDate} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <button onClick={() => { setPage(1); load(); }} className="btn-primary h-10 px-6">Apply filters</button>
        </div>
      </div>

      {loading ? <div className="rounded-2xl border border-gray-200 bg-white py-16"><PageLoader /></div> : (
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><div><h2 className="font-bold text-gray-900">Attendance History</h2><p className="text-xs text-gray-400">{data?.meta.total || 0} records in this period</p></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">Page {page}</span></div>
          {!data?.data.length ? <div className="grid min-h-60 place-items-center p-8 text-center"><div><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gray-100 text-2xl">▣</div><h3 className="mt-4 font-semibold text-gray-800">No attendance records</h3><p className="mt-1 text-sm text-gray-400">Try selecting a different date range.</p></div></div> : <>
          <div className="divide-y divide-gray-100 md:hidden">{data.data.map(a => <article key={a.id} className="p-4"><div className="flex items-start justify-between"><div><p className="font-semibold text-gray-900">{format(new Date(a.date), 'EEEE, MMM d')}</p><p className="mt-1 text-xs capitalize text-gray-400">{a.work_mode.replace('_', ' ')}</p></div><StatusBadge status={a.status} /></div><div className="mt-4 grid grid-cols-3 rounded-xl bg-gray-50 p-3 text-center"><div><p className="text-[10px] uppercase text-gray-400">Check in</p><b className={a.is_late ? 'text-xs text-amber-600' : 'text-xs'}>{a.check_in ? format(new Date(a.check_in), 'HH:mm') : '—'}</b></div><div className="border-x"><p className="text-[10px] uppercase text-gray-400">Check out</p><b className="text-xs">{a.check_out ? format(new Date(a.check_out), 'HH:mm') : '—'}</b></div><div><p className="text-[10px] uppercase text-gray-400">Hours</p><b className="text-xs">{a.working_hours ? `${a.working_hours}h` : '—'}</b></div></div></article>)}</div>
          <div className="hidden overflow-x-auto md:block">
            <table className="table min-w-[900px]">
              <thead>
                <tr>
                  <th>Date</th><th>Check In</th><th>Check Out</th><th>Status</th>
                  <th>Work Mode</th><th>Hours</th><th>Breaks</th><th>Overtime</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((a) => (
                  <tr key={a.id}>
                    <td className="font-medium">{format(new Date(a.date), 'EEE, MMM d')}</td>
                    <td>
                      {a.check_in ? (
                        <span className={a.is_late ? 'text-amber-600 font-medium' : ''}>
                          {format(new Date(a.check_in), 'HH:mm')}
                          {a.is_late && <span className="text-xs ml-1">({a.late_minutes}m late)</span>}
                        </span>
                      ) : '–'}
                    </td>
                    <td>{a.check_out ? format(new Date(a.check_out), 'HH:mm') : '–'}</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="capitalize">{a.work_mode.replace('_', ' ')}</td>
                    <td className="font-medium">{a.working_hours ? `${a.working_hours}h` : '–'}</td>
                    <td>{a.break_minutes ? `${a.break_minutes}m` : '–'}</td>
                    <td>{a.overtime_minutes ? <span className="text-indigo-600 font-medium">{(a.overtime_minutes / 60).toFixed(1)}h</span> : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>}
          {data && data.meta.last_page > 1 && (
            <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">Showing {data.data.length} of {data.meta.total}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm">Prev</button>
                <button onClick={() => setPage(p => Math.min(data.meta.last_page, p + 1))} disabled={page === data.meta.last_page} className="btn-secondary btn-sm">Next</button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
