import { useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
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
  workforce: { text: 'text-indigo-600', icon: 'bg-indigo-50 text-indigo-600', badge: 'bg-indigo-50 text-indigo-600', line: '#6366f1' },
  present:   { text: 'text-emerald-600', icon: 'bg-emerald-50 text-emerald-600', badge: 'bg-emerald-50 text-emerald-600', line: '#10b981' },
  absent:    { text: 'text-rose-500', icon: 'bg-rose-50 text-rose-500', badge: 'bg-rose-50 text-rose-500', line: '#fb7185' },
  leave:     { text: 'text-amber-500', icon: 'bg-amber-50 text-amber-600', badge: 'bg-amber-50 text-amber-600', line: '#f59e0b' },
};

const svg = (className: string, ...paths: ReactNode[]) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
);
const Icons = {
  workforce: svg('h-5 w-5', <path key="a" d="M17 21v-2a4 4 0 0 0-3-3.87" />, <path key="b" d="M7 21v-2a4 4 0 0 1 3-3.87" />, <circle key="c" cx="12" cy="7" r="3" />, <path key="d" d="M5 21v-1a3 3 0 0 1 3-3" />),
  present: svg('h-5 w-5', <path key="a" d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />, <circle key="b" cx="9" cy="7" r="3" />, <path key="c" d="m16 11 2 2 4-4" />),
  absent: svg('h-5 w-5', <path key="a" d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />, <circle key="b" cx="9" cy="7" r="3" />, <path key="c" d="M17 8h5" />),
  leave: svg('h-5 w-5', <rect key="a" x="3" y="4" width="18" height="18" rx="2" />, <path key="b" d="M16 2v4M8 2v4M3 10h18" />),
  workforceBadge: svg('h-4 w-4', <path key="a" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />, <circle key="b" cx="9" cy="7" r="3" />, <path key="c" d="M19 8v6M22 11h-6" />),
  person: svg('h-3.5 w-3.5', <circle key="a" cx="12" cy="8" r="3.2" />, <path key="b" d="M5.5 20a6.5 6.5 0 0 1 13 0" />),
  trend: svg('h-4 w-4', <path key="a" d="M3 17l6-6 4 4 7-7" />, <path key="b" d="M17 8h4v4" />),
  code: svg('h-4 w-4', <path key="a" d="m16 18 6-6-6-6" />, <path key="b" d="m8 6-6 6 6 6" />),
  pencil: svg('h-4 w-4', <path key="a" d="M12 20h9" />, <path key="b" d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />),
  search: svg('h-4 w-4', <circle key="a" cx="11" cy="11" r="7" />, <path key="b" d="m21 21-4.3-4.3" />),
  brush: svg('h-4 w-4', <path key="a" d="M9.06 11.9 3 18v3h3l6.1-6.06" />, <path key="b" d="M13 7 17 3l4 4-4 4Z" />),
  office: svg('h-4 w-4', <rect key="a" x="4" y="3" width="16" height="18" rx="2" />, <path key="b" d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h6" />),
  kebab: svg('h-4 w-4', <circle key="a" cx="12" cy="5" r="1" />, <circle key="b" cx="12" cy="12" r="1" />, <circle key="c" cx="12" cy="19" r="1" />),
};

function deptIcon(name: string) {
  const n = name.toLowerCase();
  if (/develop|engineer|tech|software/.test(n)) return { icon: Icons.code, tint: 'bg-indigo-50 text-indigo-600' };
  if (/content|writer|editor/.test(n)) return { icon: Icons.pencil, tint: 'bg-emerald-50 text-emerald-600' };
  if (/seo|market|growth/.test(n)) return { icon: Icons.search, tint: 'bg-rose-50 text-rose-500' };
  if (/design|creative|art/.test(n)) return { icon: Icons.brush, tint: 'bg-amber-50 text-amber-600' };
  return { icon: Icons.office, tint: 'bg-slate-100 text-slate-600' };
}

function StatCard({ label, value, note, tone, icon, badge }: { label: string; value: number; note: string; tone: keyof typeof palette; icon: ReactNode; badge: ReactNode }) {
  const color = palette[tone];
  return <article className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${color.icon}`}>{icon}</span>
        <p className={`font-semibold ${color.text}`}>{label}</p>
      </div>
      <span className={`grid place-items-center rounded-full px-2 py-1 text-xs font-semibold ${color.badge}`}>{badge}</span>
    </div>
    <p className="mt-5 text-3xl font-bold text-gray-950">{value}</p>
    <p className="mt-1 text-sm text-gray-500">{note}</p>
    <div className="pointer-events-none absolute bottom-0 left-4 right-4 h-9 opacity-30" aria-hidden="true">
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

  const PRESENT_SET = ['working', 'on_break', 'checked_out', 'work_from_home'];
  const stats = useMemo(() => ({
    present: team.filter(m => PRESENT_SET.includes(m.current_status)).length,
    absent: team.filter(m => m.current_status === 'absent').length,
    leave: team.filter(m => m.current_status === 'on_leave').length,
  }), [team]);
  const total = team.length;
  const workforceRows = team.filter(member => member.role === 'tl' || member.role === 'employee');
  const percent = (n: number) => total ? Math.round(n / total * 100) : 0;
  const attendanceRate = percent(stats.present);

  const deptStats = useMemo(() => {
    const map = new Map<string, { name: string; present: number; absent: number; leave: number; total: number }>();
    for (const m of team) {
      const d = m.department || 'Unassigned';
      if (!map.has(d)) map.set(d, { name: d, present: 0, absent: 0, leave: 0, total: 0 });
      const row = map.get(d)!;
      row.total++;
      if (PRESENT_SET.includes(m.current_status)) row.present++;
      else if (m.current_status === 'on_leave') row.leave++;
      else row.absent++;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [team]);

  const liveStatuses = useMemo(() => {
    const defs = [
      { key: 'working', label: 'Working', color: '#10b981' },
      { key: 'on_break', label: 'On Break', color: '#8b5cf6' },
      { key: 'work_from_home', label: 'Work From Home', color: '#6366f1' },
      { key: 'checked_out', label: 'Checked Out', color: '#3b82f6' },
      { key: 'on_leave', label: 'On Leave', color: '#f59e0b' },
      { key: 'absent', label: 'Absent', color: '#f43f5e' },
    ];
    return defs.map(d => ({ ...d, count: team.filter(m => m.current_status === d.key).length }));
  }, [team]);
  const liveMax = Math.max(1, ...liveStatuses.map(s => s.count));

  const toggleAttendance = async () => {
    setActionLoading(true);
    try {
      if (!attendance?.check_in) await attendanceService.checkIn({ work_mode: 'office' }); else if (!attendance.check_out) await attendanceService.checkOut();
      await Promise.all([load(), refreshUser()]); toast.success('Attendance updated');
    } catch { toast.error('Attendance update failed'); } finally { setActionLoading(false); }
  };
  if (loading) return <PageLoader />;

  const donut = `conic-gradient(#10b981 0 ${percent(stats.present)}%, #fb7185 ${percent(stats.present)}% ${percent(stats.present + stats.absent)}%, #f59e0b ${percent(stats.present + stats.absent)}% ${percent(stats.present + stats.absent + stats.leave)}%, #e5e7eb 0)`;
  const notMarked = Math.max(0, total - stats.present - stats.absent - stats.leave);

  return <div className="space-y-5 p-4 sm:p-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-950">Welcome back, {user?.name} 👋</h1>
        <p className="mt-1 text-sm text-gray-500">Here&apos;s what&apos;s happening with {executive ? 'your company' : user?.role === 'tl' ? 'your team' : 'your department'} today.</p>
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">{Icons.leave}{format(new Date(), 'EEEE, MMMM d, yyyy')}</div>
    </header>

    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total Workforce" value={total} note="Active team members" tone="workforce" icon={Icons.workforce} badge={Icons.workforceBadge} />
      <StatCard label="Present Today" value={stats.present} note={`${percent(stats.present)}% of team`} tone="present" icon={Icons.present} badge={`${percent(stats.present)}%`} />
      <StatCard label="Absent Today" value={stats.absent} note={`${percent(stats.absent)}% of team`} tone="absent" icon={Icons.absent} badge={`${percent(stats.absent)}%`} />
      <StatCard label="On Leave" value={stats.leave} note={`${percent(stats.leave)}% of team`} tone="leave" icon={Icons.leave} badge={`${percent(stats.leave)}%`} />
    </section>

    <section className="grid grid-cols-1 gap-4 2xl:grid-cols-[0.85fr_1.15fr]">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-gray-900">Today&apos;s Attendance Overview</h2>
        <div className="mt-7 flex flex-col items-center gap-7 sm:flex-row sm:justify-around">
          <div className="grid h-44 w-44 place-items-center rounded-full" style={{ background: donut }}>
            <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center"><div><p className="text-2xl font-bold">{total}</p><p className="text-xs text-gray-500">Total</p></div></div>
          </div>
          <div className="w-full max-w-xs space-y-3">
            {[['Present', stats.present, 'bg-emerald-500'], ['Absent', stats.absent, 'bg-rose-400'], ['On Leave', stats.leave, 'bg-amber-500'], ['Not Marked', notMarked, 'bg-gray-300']].map(([label, value, color]) =>
              <div key={String(label)} className="flex items-center justify-between border-b border-gray-100 pb-2 text-sm"><span className="flex items-center gap-2"><i className={`h-3 w-3 rounded-full ${color}`} />{label}</span><b>{value as number} ({percent(value as number)}%)</b></div>)}
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <span className="text-emerald-600">{Icons.trend}</span>
          {attendanceRate >= 75 ? 'Great turnout today! Keep up the momentum.' : 'Keep up the good work! Let’s improve attendance together.'}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4"><h2 className="font-bold text-gray-900">Pending Leave Requests</h2><Link to={approvalPath} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600">View all</Link></div>
        <div className="divide-y">
          {pending.length ? pending.map(l =>
            <div key={l.id} className="flex items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{l.user?.name}</p><p className="mt-1 text-xs text-gray-500">{l.leave_type?.name} · {format(new Date(l.start_date), 'MMM d')} – {format(new Date(l.end_date), 'MMM d')}</p></div>
              <span className="badge-yellow shrink-0">Pending</span>
            </div>) :
            <div className="grid min-h-56 place-items-center px-6 py-10 text-center">
              <div>
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-indigo-50 text-indigo-400">
                  <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M9 5V3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V5" /><circle cx="16.5" cy="15.5" r="4" /><path d="M16.5 14v1.6l1 1" /></svg>
                </div>
                <p className="mt-4 text-sm font-bold text-gray-900">No pending leave requests</p>
                <p className="mt-1 text-xs text-gray-500">All caught up! There are no leave requests waiting for approval.</p>
              </div>
            </div>}
        </div>
      </div>
    </section>

    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {/* Department attendance */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div><h2 className="font-bold text-gray-900">Department Attendance</h2><p className="mt-0.5 text-xs text-gray-500">Present vs absent vs on-leave by department</p></div>
          <div className="flex items-center gap-3 text-[11px] text-gray-500">
            <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Present</span>
            <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-amber-400" />Leave</span>
            <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-gray-200" />Away</span>
          </div>
        </div>
        <div className="mt-5 space-y-4">
          {deptStats.length ? deptStats.map(d => {
            const di = deptIcon(d.name);
            return (
              <div key={d.name} className="flex items-center gap-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${di.tint}`}>{di.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-700">{d.name}</span>
                    <span className="text-gray-400"><b className="text-emerald-600">{d.present}</b>/{d.total} present</span>
                  </div>
                  <div className="relative flex h-1.5 w-full gap-0.5 rounded-full bg-gray-100">
                    <div className="rounded-full bg-emerald-500 transition-all" style={{ width: `${(d.present / d.total) * 100}%` }} />
                    <div className="rounded-full bg-amber-400 transition-all" style={{ width: `${(d.leave / d.total) * 100}%` }} />
                    <span className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-white bg-gray-300 shadow-sm" />
                  </div>
                </div>
              </div>
            );
          }) : <div className="grid min-h-40 place-items-center text-sm text-gray-400">No department data</div>}
        </div>
      </div>

      {/* Live status breakdown */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div><h2 className="font-bold text-gray-900">Live Status Breakdown</h2><p className="mt-0.5 text-xs text-gray-500">Where your workforce is right now</p></div>
          <div className="flex items-center gap-2">
            <div className="relative h-14 w-14">
              <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(attendanceRate / 100) * 97.4} 97.4`} />
              </svg>
              <span className="absolute inset-0 grid place-items-center text-xs font-bold text-emerald-600">{attendanceRate}%</span>
            </div>
            <p className="text-[11px] leading-tight text-gray-400">attendance<br />rate</p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {liveStatuses.map(s => (
            <div key={s.key} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs font-medium text-gray-600">{s.label}</span>
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-white" style={{ background: s.color }}>{Icons.person}</span>
              <div className="h-6 flex-1 overflow-hidden rounded-md" style={{ background: `${s.color}1f` }}>
                <div className="flex h-full items-center justify-end rounded-md px-2 text-[11px] font-bold text-white transition-all" style={{ width: `${Math.max((s.count / liveMax) * 100, s.count ? 14 : 0)}%`, background: `linear-gradient(90deg, ${s.color}cc, ${s.color})` }}>
                  {s.count > 0 && s.count}
                </div>
              </div>
              <span className="w-6 shrink-0 text-right text-xs font-semibold text-gray-500">{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div><h2 className="font-bold text-gray-900">Today&apos;s Workforce Status</h2><p className="mt-0.5 text-xs text-gray-500">Detailed breakdown of employee status</p></div>
        <Link to={`${basePath}/attendance`} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600">View full attendance</Link>
      </div>
      <div className="overflow-x-auto">
        <table className="table min-w-[760px]">
          <thead><tr><th>Employee</th><th>Department</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Working Hours</th><th className="text-right">Actions</th></tr></thead>
          <tbody>
            {workforceRows.map(member => (
              <tr key={member.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">{member.name.charAt(0).toUpperCase()}</span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-semibold text-gray-900">{member.name}{member.role === 'tl' && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">TL</span>}</p>
                      <p className="text-xs text-gray-400">{member.department || '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="text-sm text-gray-600">{member.department || 'N/A'}</td>
                <td><StatusBadge status={member.current_status} /></td>
                <td className="text-sm">{member.check_in ? <span className="inline-flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{format(new Date(member.check_in), 'hh:mm a')}</span> : '—'}</td>
                <td className="text-sm">{member.check_out ? format(new Date(member.check_out), 'hh:mm a') : '—'}</td>
                <td className="text-sm">{member.working_hours ? `${member.working_hours}h` : (member.check_in && !member.check_out ? <span className="font-medium text-emerald-600">Live</span> : '—')}</td>
                <td className="text-right"><button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">{Icons.kebab}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-gray-900">Quick Actions</h2><div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{!executive && <button onClick={toggleAttendance} disabled={actionLoading || Boolean(attendance?.check_out)} className="flex items-center gap-3 rounded-xl border p-4 text-left hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-50"><span className="rounded-lg bg-emerald-50 p-2 text-emerald-600">{Icons.present}</span><span><b className="block text-sm">{attendance?.check_in ? 'Mark Check Out' : 'Mark Attendance'}</b><small className="text-gray-500">Check in / out</small></span></button>}{!executive && <Link to={`${basePath}/my-leaves`} className="flex items-center gap-3 rounded-xl border p-4 hover:border-indigo-300 hover:bg-indigo-50"><span className="rounded-lg bg-indigo-50 p-2 text-indigo-600">{Icons.leave}</span><span><b className="block text-sm">Apply Leave</b><small className="text-gray-500">Request time off</small></span></Link>}<Link to={`${basePath}/reports`} className="flex items-center gap-3 rounded-xl border p-4 hover:border-blue-300 hover:bg-blue-50"><span className="rounded-lg bg-blue-50 p-2 text-blue-600">{Icons.trend}</span><span><b className="block text-sm">View Reports</b><small className="text-gray-500">Attendance reports</small></span></Link><Link to={executive ? '/ceo/employees' : `${basePath}/team`} className="flex items-center gap-3 rounded-xl border p-4 hover:border-rose-300 hover:bg-rose-50"><span className="rounded-lg bg-rose-50 p-2 text-rose-500">{Icons.workforce}</span><span><b className="block text-sm">{executive ? 'Employees' : 'My Team'}</b><small className="text-gray-500">Manage team members</small></span></Link></div></section>
  </div>;
}
