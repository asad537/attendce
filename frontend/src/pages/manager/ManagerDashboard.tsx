import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { attendanceService } from '../../services/attendanceService';
import { leaveService } from '../../services/leaveService';
import { Attendance, Leave, TeamMemberStatus } from '../../types';
import { PageLoader } from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';

const palette = {
  workforce: { text: 'text-indigo-600', icon: 'bg-indigo-50', line: '#6366f1' },
  present: { text: 'text-emerald-600', icon: 'bg-emerald-50', line: '#10b981' },
  absent: { text: 'text-rose-500', icon: 'bg-rose-50', line: '#f43f5e' },
  leave: { text: 'text-amber-500', icon: 'bg-amber-50', line: '#f59e0b' },
};

function StatCard({ label, value, note, tone, icon }: { label: string; value: number; note: string; tone: keyof typeof palette; icon: string }) {
  const color = palette[tone];
  return <article className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between"><p className={`font-semibold ${color.text}`}>{label}</p><span className={`rounded-xl px-2.5 py-2 ${color.icon}`}>{icon}</span></div>
    <p className="mt-6 text-3xl font-bold text-gray-950">{value}</p><p className="mt-1 text-sm text-gray-500">{note}</p>
    <div className="pointer-events-none absolute bottom-0 left-6 right-6 h-10 opacity-30" aria-hidden="true">
      <svg className="h-full w-full overflow-visible" viewBox="0 0 300 42" preserveAspectRatio="none">
        <path d="M0 42 C28 42 48 38 75 39 S108 24 137 35 S176 5 213 17 S258 24 300 42" fill="none" stroke={color.line} strokeWidth="2" strokeLinecap="round" />
        <path d="M0 42 C28 42 48 38 75 39 S108 24 137 35 S176 5 213 17 S258 24 300 42 L300 42 L0 42Z" fill={color.line} />
      </svg>
    </div>
  </article>;
}

export default function ManagerDashboard({ executive = false }: { executive?: boolean }) {
  const { user, refreshUser } = useAuth();
  const basePath = executive ? '/ceo' : user?.role === 'tl' ? '/tl' : '/manager';
  const approvalPath = executive ? '/ceo/leave-approvals' : user?.role === 'tl' ? '/tl/leaves' : '/manager/leave-approvals';
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [team, setTeam] = useState<TeamMemberStatus[]>([]);
  const [pending, setPending] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [today, teamStatus, leaves] = await Promise.all([attendanceService.getToday(), attendanceService.getTeamStatus(), leaveService.getList({ status: 'pending', per_page: 5 })]);
      setAttendance(today.attendance); setTeam(teamStatus); setPending(leaves.data);
    } catch { toast.error('Failed to load dashboard'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => ({
    present: team.filter(m => ['working', 'on_break', 'checked_out', 'work_from_home'].includes(m.current_status)).length,
    absent: team.filter(m => m.current_status === 'absent').length,
    leave: team.filter(m => m.current_status === 'on_leave').length,
  }), [team]);
  const total = team.length;
  const percent = (n: number) => total ? Math.round(n / total * 100) : 0;

  const toggleAttendance = async () => {
    setActionLoading(true);
    try {
      if (!attendance?.check_in) await attendanceService.checkIn({ work_mode: 'office' }); else if (!attendance.check_out) await attendanceService.checkOut();
      await Promise.all([load(), refreshUser()]); toast.success('Attendance updated');
    } catch { toast.error('Attendance update failed'); } finally { setActionLoading(false); }
  };
  if (loading) return <PageLoader />;

  const donut = `conic-gradient(#10b981 0 ${percent(stats.present)}%, #f43f5e ${percent(stats.present)}% ${percent(stats.present + stats.absent)}%, #f59e0b ${percent(stats.present + stats.absent)}% ${percent(stats.present + stats.absent + stats.leave)}%, #d1d5db 0)`;
  return <div className="space-y-5 p-4 sm:p-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-2xl font-bold text-gray-950">Welcome back, {user?.name} 👋</h1><p className="mt-1 text-sm text-gray-500">Here&apos;s what&apos;s happening with {executive ? 'your company' : user?.role === 'tl' ? 'your team' : 'your department'} today.</p></div><div className="rounded-xl bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">▣ &nbsp;{format(new Date(), 'EEEE, MMMM d, yyyy')}</div></header>

    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total Workforce" value={total} note="Active team members" tone="workforce" icon="♧" />
      <StatCard label="Present Today" value={stats.present} note={`${percent(stats.present)}% of team`} tone="present" icon="◉" />
      <StatCard label="Absent Today" value={stats.absent} note={`${percent(stats.absent)}% of team`} tone="absent" icon="◍" />
      <StatCard label="On Leave" value={stats.leave} note={`${percent(stats.leave)}% of team`} tone="leave" icon="◐" />
    </section>

    <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-gray-900">Today&apos;s Attendance Overview</h2><div className="mt-7 flex flex-col items-center gap-7 sm:flex-row sm:justify-around"><div className="grid h-44 w-44 place-items-center rounded-full" style={{ background: donut }}><div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center"><div><p className="text-2xl font-bold">{total}</p><p className="text-xs text-gray-500">Total</p></div></div></div><div className="w-full max-w-xs space-y-3">{[['Present',stats.present,'bg-emerald-500'],['Absent',stats.absent,'bg-rose-500'],['On Leave',stats.leave,'bg-amber-500'],['Not Marked',Math.max(0,total-stats.present-stats.absent-stats.leave),'bg-gray-400']].map(([label,value,color]) => <div key={String(label)} className="flex items-center justify-between border-b border-gray-100 pb-2 text-sm"><span className="flex items-center gap-2"><i className={`h-3 w-3 rounded-full ${color}`}/>{label}</span><b>{value as number} ({percent(value as number)}%)</b></div>)}</div></div></div>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b px-5 py-4"><h2 className="font-bold text-gray-900">Pending Leave Requests</h2><Link to={approvalPath} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600">View all</Link></div><div className="divide-y">{pending.length ? pending.map(l => <div key={l.id} className="flex items-center justify-between gap-3 px-5 py-4"><div className="min-w-0"><p className="truncate text-sm font-semibold">{l.user?.name}</p><p className="mt-1 text-xs text-gray-500">{l.leave_type?.name} · {format(new Date(l.start_date),'MMM d')} – {format(new Date(l.end_date),'MMM d')}</p></div><span className="badge-yellow shrink-0">Pending</span></div>) : <div className="grid min-h-56 place-items-center text-sm text-gray-400">No pending leave requests</div>}</div></div>
    </section>

    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b px-5 py-4"><h2 className="font-bold text-gray-900">Today&apos;s Workforce Status</h2><Link to={`${basePath}/attendance`} className="text-xs font-semibold text-indigo-600">View full attendance</Link></div><div className="overflow-x-auto"><table className="table min-w-[720px]"><thead><tr><th>Employee</th><th>Department</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Hours</th></tr></thead><tbody>{team.map(member => <tr key={member.id}><td className="font-semibold text-gray-900">{member.name}</td><td>{member.department || 'N/A'}</td><td><StatusBadge status={member.current_status}/></td><td>{member.check_in ? format(new Date(member.check_in),'hh:mm a') : '-'}</td><td>{member.check_out ? format(new Date(member.check_out),'hh:mm a') : '-'}</td><td>{member.working_hours ? `${member.working_hours}h` : '-'}</td></tr>)}</tbody></table></div></section>

    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-gray-900">Quick Actions</h2><div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{!executive && <button onClick={toggleAttendance} disabled={actionLoading || Boolean(attendance?.check_out)} className="flex items-center gap-3 rounded-xl border p-4 text-left hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-50"><span className="rounded-lg bg-emerald-50 p-2">♧</span><span><b className="block text-sm">{attendance?.check_in ? 'Mark Check Out' : 'Mark Attendance'}</b><small className="text-gray-500">Check in / out</small></span></button>}{!executive && <Link to={`${basePath}/my-leaves`} className="flex items-center gap-3 rounded-xl border p-4 hover:border-indigo-300 hover:bg-indigo-50"><span className="rounded-lg bg-indigo-50 p-2">♧</span><span><b className="block text-sm">Apply Leave</b><small className="text-gray-500">Request time off</small></span></Link>}<Link to={`${basePath}/reports`} className="flex items-center gap-3 rounded-xl border p-4 hover:border-blue-300 hover:bg-blue-50"><span className="rounded-lg bg-blue-50 p-2">▧</span><span><b className="block text-sm">View Reports</b><small className="text-gray-500">Attendance reports</small></span></Link><Link to={executive ? '/ceo/employees' : `${basePath}/team`} className="flex items-center gap-3 rounded-xl border p-4 hover:border-rose-300 hover:bg-rose-50"><span className="rounded-lg bg-rose-50 p-2">▦</span><span><b className="block text-sm">{executive ? 'Employees' : 'My Team'}</b><small className="text-gray-500">Manage team members</small></span></Link></div></section>
  </div>;
}
