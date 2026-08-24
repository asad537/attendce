import React, { useEffect, useState } from 'react';
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

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <h1 className="text-xl font-bold text-gray-900">My Attendance</h1>

      {/* Filters */}
      <div className="card py-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label text-xs">From</label>
            <input type="date" className="input text-sm" value={startDate} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="label text-xs">To</label>
            <input type="date" className="input text-sm" value={endDate} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <button onClick={() => { setPage(1); load(); }} className="btn-primary">Apply</button>
        </div>
      </div>

      {loading ? <PageLoader /> : (
        <div className="card p-0">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th><th>Check In</th><th>Check Out</th><th>Status</th>
                  <th>Work Mode</th><th>Hours</th><th>Breaks</th><th>Overtime</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">No records found</td></tr>
                ) : data?.data.map((a) => (
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
          {data && data.meta.last_page > 1 && (
            <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">Showing {data.data.length} of {data.meta.total}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm">Prev</button>
                <button onClick={() => setPage(p => Math.min(data.meta.last_page, p + 1))} disabled={page === data.meta.last_page} className="btn-secondary btn-sm">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
