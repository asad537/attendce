import React, { useCallback, useEffect, useState } from 'react';
import { attendanceService } from '../../services/attendanceService';
import { userService, departmentService } from '../../services/userService';
import { Attendance, Department, PaginatedResponse, User } from '../../types';
import StatusBadge from '../../components/common/StatusBadge';
import { PageLoader } from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

type AttStatus = 'present' | 'absent' | 'late' | 'on_leave' | 'holiday' | '';

export default function CeoAttendance() {
  const [data, setData]             = useState<PaginatedResponse<Attendance> | null>(null);
  const [departments, setDepts]     = useState<Department[]>([]);
  const [employees, setEmployees]   = useState<User[]>([]);
  const [loading, setLoading]       = useState(true);

  // Filters
  const [filterDate, setFilterDate]   = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterDept, setFilterDept]   = useState('');
  const [filterEmp, setFilterEmp]     = useState('');
  const [filterStatus, setFilterStatus] = useState<AttStatus>('');
  const [page, setPage]               = useState(1);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page: p, per_page: 20 };
      if (filterDate)   params.date          = filterDate;
      if (filterDept)   params.department_id = filterDept;
      if (filterEmp)    params.user_id       = filterEmp;
      if (filterStatus) params.status        = filterStatus;

      const res = await attendanceService.getList(params);
      setData(res);
      setPage(p);
    } catch {
      toast.error('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterDept, filterEmp, filterStatus]);

  // Load departments + employees once
  useEffect(() => {
    Promise.all([departmentService.getAll(), userService.getList({ per_page: 100 })])
      .then(([deps, usrs]) => {
        setDepts(deps);
        setEmployees(usrs.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { load(1); }, [load]);

  const statusColor: Record<string, string> = {
    present:       'bg-emerald-100 text-emerald-700',
    late:          'bg-amber-100 text-amber-700',
    absent:        'bg-red-100 text-red-700',
    on_leave:      'bg-blue-100 text-blue-700',
    holiday:       'bg-purple-100 text-purple-700',
    half_day:      'bg-orange-100 text-orange-700',
    work_from_home:'bg-indigo-100 text-indigo-700',
    weekend:       'bg-gray-100 text-gray-500',
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">All Attendance</h1>
        <p className="text-sm text-gray-500 mt-0.5">Company-wide attendance records</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="label text-xs">Date</label>
          <input
            type="date"
            className="input w-44"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label text-xs">Department</label>
          <select className="input w-44" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label text-xs">Employee</label>
          <select className="input w-44" value={filterEmp} onChange={e => setFilterEmp(e.target.value)}>
            <option value="">All Employees</option>
            {employees.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label text-xs">Status</label>
          <select className="input w-36" value={filterStatus} onChange={e => setFilterStatus(e.target.value as AttStatus)}>
            <option value="">All Statuses</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
            <option value="on_leave">On Leave</option>
            <option value="holiday">Holiday</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? <PageLoader /> : (
        <div className="card p-0">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Hours</th>
                  <th>Overtime</th>
                  <th>Mode</th>
                  <th>Late</th>
                </tr>
              </thead>
              <tbody>
                {!data?.data.length ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-gray-400">
                      No attendance records found for the selected filters.
                    </td>
                  </tr>
                ) : data.data.map(a => (
                  <tr key={a.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xs shrink-0">
                          {a.user?.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm leading-tight">{a.user?.name}</p>
                          <p className="text-xs text-gray-400">{a.user?.employee_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm text-gray-600 whitespace-nowrap">
                      {format(parseISO(a.date), 'EEE, MMM d, yyyy')}
                    </td>
                    <td>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[a.status] || 'bg-gray-100 text-gray-500'}`}>
                        {a.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    </td>
                    <td className="text-sm text-gray-700">
                      {a.check_in ? format(parseISO(a.check_in), 'HH:mm') : '—'}
                    </td>
                    <td className="text-sm text-gray-700">
                      {a.check_out ? format(parseISO(a.check_out), 'HH:mm') : '—'}
                    </td>
                    <td className="text-sm font-medium text-gray-900">
                      {a.working_hours > 0 ? `${a.working_hours.toFixed(1)}h` : '—'}
                    </td>
                    <td className={`text-sm font-medium ${a.overtime_minutes > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {a.overtime_minutes > 0 ? `${(a.overtime_minutes / 60).toFixed(1)}h` : '—'}
                    </td>
                    <td className="text-sm text-gray-500 capitalize">
                      {a.work_mode.replace('_', ' ')}
                    </td>
                    <td>
                      {a.is_late ? (
                        <span className="text-xs font-medium text-amber-600">{a.late_minutes}m</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.meta.last_page > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
              <span>{data.meta.total} records</span>
              <div className="flex gap-1">
                {Array.from({ length: data.meta.last_page }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => load(p)}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      p === data.meta.current_page
                        ? 'bg-indigo-600 text-white'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
