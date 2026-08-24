import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { attendanceService, breakService } from '../../services/attendanceService';
import { leaveService } from '../../services/leaveService';
import { Attendance, Leave, TeamMemberStatus } from '../../types';
import StatusBadge from '../../components/common/StatusBadge';
import { PageLoader } from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function ManagerDashboard() {
  const { user, refreshUser } = useAuth();
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [myStatus, setMyStatus]     = useState<string>('absent');
  const [team, setTeam]             = useState<TeamMemberStatus[]>([]);
  const [pending, setPending]       = useState<Leave[]>([]);
  const [loading, setLoading]       = useState(true);
  const [actionLoading, setAction]  = useState(false);

  const load = useCallback(async () => {
    try {
      const [todayRes, teamRes, leaveRes] = await Promise.all([
        attendanceService.getToday(),
        attendanceService.getTeamStatus(),
        leaveService.getList({ status: 'pending', per_page: 5 }),
      ]);
      setAttendance(todayRes.attendance);
      setMyStatus(todayRes.current_status);
      setTeam(teamRes);
      setPending(leaveRes.data);
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCheckIn = async () => {
    setAction(true);
    try {
      const att = await attendanceService.checkIn({ work_mode: 'office' });
      setAttendance(att); setMyStatus('working');
      await refreshUser();
      toast.success('Checked in!');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Check-in failed'); }
    finally { setAction(false); }
  };

  const handleCheckOut = async () => {
    setAction(true);
    try {
      const att = await attendanceService.checkOut();
      setAttendance(att); setMyStatus('checked_out');
      toast.success(`Checked out — ${att.working_hours.toFixed(2)}h worked`);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Check-out failed'); }
    finally { setAction(false); }
  };

  if (loading) return <PageLoader />;

  const stats = {
    working: team.filter((t) => t.current_status === 'working').length,
    onBreak: team.filter((t) => t.current_status === 'on_break').length,
    absent:  team.filter((t) => t.current_status === 'absent').length,
    onLeave: team.filter((t) => t.current_status === 'on_leave').length,
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="text-gray-500 text-sm">{user?.department?.name} · {format(new Date(), 'EEEE, MMMM d')}</p>
      </div>

      {/* Personal check-in + team stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* My check-in */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 text-sm">My Attendance</h2>
            <StatusBadge status={myStatus} pulse={myStatus === 'working'} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-center mb-4">
            <div>
              <p className="text-xs text-gray-500">Check In</p>
              <p className="font-semibold">{attendance?.check_in ? format(new Date(attendance.check_in), 'HH:mm') : '–'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Check Out</p>
              <p className="font-semibold">{attendance?.check_out ? format(new Date(attendance.check_out), 'HH:mm') : '–'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!attendance?.check_in && (
              <button onClick={handleCheckIn} disabled={actionLoading} className="btn-success flex-1 btn-sm">Check In</button>
            )}
            {attendance?.check_in && !attendance?.check_out && (
              <button onClick={handleCheckOut} disabled={actionLoading} className="btn-danger flex-1 btn-sm">Check Out</button>
            )}
            {attendance?.check_out && <p className="text-xs text-gray-500 w-full text-center py-2">Workday complete</p>}
          </div>
        </div>

        {/* Team snapshot */}
        <div className="card lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-3">Team Today — {team.length} members</h2>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-emerald-50 rounded-xl">
              <p className="text-2xl font-bold text-emerald-700">{stats.working}</p>
              <p className="text-xs text-emerald-600">Working</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl">
              <p className="text-2xl font-bold text-amber-700">{stats.onBreak}</p>
              <p className="text-xs text-amber-600">On Break</p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl">
              <p className="text-2xl font-bold text-red-700">{stats.absent}</p>
              <p className="text-xs text-red-600">Absent</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <p className="text-2xl font-bold text-blue-700">{stats.onLeave}</p>
              <p className="text-xs text-blue-600">On Leave</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live team status */}
      <div className="card p-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Live Team Status</h2>
          <Link to="/manager/attendance" className="text-sm text-indigo-600 hover:underline">Full view →</Link>
        </div>
        <div className="divide-y divide-gray-50">
          {team.map((member) => (
            <div key={member.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-semibold">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.employee_id}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-gray-500">
                    {member.check_in ? `In: ${format(new Date(member.check_in), 'HH:mm')}` : ''}
                    {member.check_out ? ` · Out: ${format(new Date(member.check_out), 'HH:mm')}` : ''}
                  </p>
                  {member.working_hours > 0 && <p className="text-xs font-medium text-gray-700">{member.working_hours}h</p>}
                  {member.is_late && <p className="text-xs text-amber-600">{member.late_minutes}m late</p>}
                </div>
                <StatusBadge status={member.current_status} pulse={member.current_status === 'working'} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending leave requests */}
      {pending.length > 0 && (
        <div className="card p-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Pending Leave Requests</h2>
            <Link to="/manager/leaves" className="text-sm text-indigo-600 hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {pending.map((leave) => (
              <div key={leave.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{leave.user?.name}</p>
                  <p className="text-xs text-gray-500">
                    {leave.leave_type?.name} · {format(new Date(leave.start_date), 'MMM d')} – {format(new Date(leave.end_date), 'MMM d')} ({leave.days_requested}d)
                  </p>
                </div>
                <Link to="/manager/leaves" className="btn-primary btn-sm">Review</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
