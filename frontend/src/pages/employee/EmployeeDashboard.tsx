import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { attendanceService, breakService } from '../../services/attendanceService';
import { leaveService } from '../../services/leaveService';
import { holidayService } from '../../services/reportService';
import { Attendance, Holiday, LeaveBalance } from '../../types';
import StatusBadge from '../../components/common/StatusBadge';
import { PageLoader } from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function EmployeeDashboard() {
  const { user, refreshUser } = useAuth();
  const [attendance, setAttendance]   = useState<Attendance | null>(null);
  const [currentStatus, setStatus]    = useState<string>('absent');
  const [balances, setBalances]       = useState<LeaveBalance[]>([]);
  const [holidays, setHolidays]       = useState<Holiday[]>([]);
  const [loading, setLoading]         = useState(true);
  const [actionLoading, setAction]    = useState(false);
  const [workMode, setWorkMode]       = useState<'office' | 'remote'>('office');

  const load = useCallback(async () => {
    try {
      const [todayRes, balRes, holRes] = await Promise.all([
        attendanceService.getToday(),
        leaveService.getBalances(),
        holidayService.getUpcoming(),
      ]);
      setAttendance(todayRes.attendance);
      setStatus(todayRes.current_status);
      setBalances(balRes.balances);
      setHolidays(holRes);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCheckIn = async () => {
    setAction(true);
    try {
      const att = await attendanceService.checkIn({ work_mode: workMode });
      setAttendance(att);
      setStatus(workMode === 'remote' ? 'work_from_home' : 'working');
      await refreshUser();
      toast.success(att.is_late ? `Checked in — ${att.late_minutes} min late` : 'Checked in successfully!');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Check-in failed');
    } finally { setAction(false); }
  };

  const handleCheckOut = async () => {
    setAction(true);
    try {
      const att = await attendanceService.checkOut();
      setAttendance(att);
      setStatus('checked_out');
      toast.success(`Checked out — ${att.working_hours.toFixed(2)}h worked`);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Check-out failed');
    } finally { setAction(false); }
  };

  const handleBreakStart = async () => {
    setAction(true);
    try {
      await breakService.startBreak('short');
      setStatus('on_break');
      toast.success('Break started');
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to start break');
    } finally { setAction(false); }
  };

  const handleBreakEnd = async () => {
    setAction(true);
    try {
      await breakService.endBreak();
      setStatus('working');
      toast.success('Break ended');
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to end break');
    } finally { setAction(false); }
  };

  if (loading) return <PageLoader />;

  const today = format(new Date(), 'EEEE, MMMM d, yyyy');
  const isCheckedIn  = !!attendance?.check_in && !attendance?.check_out;
  const isOnBreak    = currentStatus === 'on_break';
  const isCheckedOut = !!attendance?.check_out;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Good {getGreeting()}, {user?.name?.split(' ')[0]}!</h1>
        <p className="text-gray-500 text-sm mt-0.5">{today}</p>
      </div>

      {/* Check-in / Check-out card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Today's Attendance</h2>
          <StatusBadge status={currentStatus} pulse={currentStatus === 'working'} />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5 text-center">
          <div>
            <p className="text-xs text-gray-500 mb-1">Check In</p>
            <p className="font-semibold text-gray-900">
              {attendance?.check_in ? format(new Date(attendance.check_in), 'HH:mm') : '–'}
            </p>
            {attendance?.is_late && (
              <p className="text-xs text-amber-600">{attendance.late_minutes}m late</p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Check Out</p>
            <p className="font-semibold text-gray-900">
              {attendance?.check_out ? format(new Date(attendance.check_out), 'HH:mm') : '–'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Hours</p>
            <p className="font-semibold text-gray-900">
              {isCheckedIn ? <LiveTimer checkIn={attendance!.check_in!} breakMins={attendance!.break_minutes} /> : (attendance?.working_hours ? `${attendance.working_hours.toFixed(2)}h` : '–')}
            </p>
          </div>
        </div>

        {/* Work mode selector */}
        {!isCheckedIn && !isCheckedOut && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setWorkMode('office')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${workMode === 'office' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              🏢 Office
            </button>
            <button
              onClick={() => setWorkMode('remote')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${workMode === 'remote' ? 'bg-purple-50 border-purple-300 text-purple-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              🏠 Remote
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          {!isCheckedIn && !isCheckedOut && (
            <button onClick={handleCheckIn} disabled={actionLoading} className="btn-success flex-1">
              {actionLoading ? 'Checking in…' : '✓ Check In'}
            </button>
          )}
          {isCheckedIn && !isOnBreak && (
            <>
              <button onClick={handleBreakStart} disabled={actionLoading} className="btn-warning flex-1">
                ☕ Start Break
              </button>
              <button onClick={handleCheckOut} disabled={actionLoading} className="btn-danger flex-1">
                {actionLoading ? 'Checking out…' : '✗ Check Out'}
              </button>
            </>
          )}
          {isOnBreak && (
            <button onClick={handleBreakEnd} disabled={actionLoading} className="btn-success flex-1">
              ▶ End Break
            </button>
          )}
          {isCheckedOut && (
            <div className="flex-1 py-2.5 text-center text-sm text-gray-500 bg-gray-50 rounded-lg">
              Workday complete — see you tomorrow!
            </div>
          )}
        </div>

        {/* Break history */}
        {attendance?.breaks && attendance.breaks.length > 0 && (
          <div className="mt-4 border-t border-gray-50 pt-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Breaks today</p>
            <div className="space-y-1">
              {attendance.breaks.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-xs text-gray-600">
                  <span className="capitalize">{b.type} break</span>
                  <span>{b.break_start ? format(new Date(b.break_start), 'HH:mm') : ''} — {b.break_end ? format(new Date(b.break_end), 'HH:mm') : 'ongoing'}</span>
                  <span className="font-medium">{b.is_active ? '…' : b.duration_formatted}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Shift" value={user?.shift?.name || 'N/A'} icon="🕐" color="indigo" />
        <StatCard label="Department" value={user?.department?.name || 'N/A'} icon="🏢" color="blue" />
        <StatCard label="Annual Leave" value={`${user?.annual_leave_balance ?? 0} days`} icon="📅" color="green" />
        <StatCard label="Employee ID" value={user?.employee_id || 'N/A'} icon="🪪" color="purple" />
      </div>

      {/* Leave balances */}
      {balances.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Leave Balances</h2>
            <Link to="/employee/leaves" className="text-sm text-indigo-600 hover:underline">Request leave →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {balances.map((b) => (
              <div key={b.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600 truncate">{b.leave_type?.name}</span>
                  <span className="text-xs font-bold text-indigo-700">{b.remaining}d</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-indigo-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (b.remaining / b.allocated) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{b.used} used of {b.allocated}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming holidays */}
      {holidays.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3">Upcoming Holidays</h2>
          <div className="space-y-2">
            {holidays.slice(0, 5).map((h) => (
              <div key={h.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{h.name}</p>
                  <p className="text-xs text-gray-500">{h.type}</p>
                </div>
                <p className="text-sm text-gray-600 font-medium">{format(new Date(h.date), 'MMM d')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700',
    blue:   'bg-blue-50 text-blue-700',
    green:  'bg-emerald-50 text-emerald-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  return (
    <div className="card py-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${colors[color]}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="font-semibold text-gray-900 text-sm truncate">{value}</p>
        </div>
      </div>
    </div>
  );
}

function LiveTimer({ checkIn, breakMins }: { checkIn: string; breakMins: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(checkIn).getTime();
    const tick = () => {
      const mins = Math.floor((Date.now() - start) / 60000) - breakMins;
      setElapsed(Math.max(0, mins));
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [checkIn, breakMins]);
  const h = Math.floor(elapsed / 60);
  const m = elapsed % 60;
  return <span className="text-emerald-600">{h}h {m}m</span>;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
