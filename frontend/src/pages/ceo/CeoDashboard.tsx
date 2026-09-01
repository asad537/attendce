import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCalendarEvents } from '../../hooks/useCalendarEvents';
import { attendanceService } from '../../services/attendanceService';
import { leaveService } from '../../services/leaveService';
import { reportService, DashboardStats } from '../../services/reportService';
import { Attendance, Leave, TeamMemberStatus } from '../../types';
import { PageLoader } from '../../components/common/LoadingSpinner';
import EmployeeSatisfactionCard from '../../components/employee/EmployeeSatisfactionCard';
import toast from 'react-hot-toast';
import UpcomingHolidaysWidget from '../../components/common/UpcomingHolidaysWidget';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, parseISO } from 'date-fns';

export default function CeoDashboard() {
  const { user } = useAuth();
  
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [team, setTeam] = useState<TeamMemberStatus[]>([]);
  const [pending, setPending] = useState<Leave[]>([]);
  const [dstats, setDstats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Dropdown-driven ranges for the Attendance Report + Team Performance cards.
  const [attPeriod, setAttPeriod] = useState<'this_month' | 'last_month' | 'this_week'>('this_month');
  const [perfMonths, setPerfMonths] = useState<number>(6);

  const load = useCallback(async () => {
    // Give each request a second chance so a transient failure (a rate-limit
    // hiccup or a request aborted on a fast reload) self-heals, and settle them
    // independently so one failure never blanks the dashboard or fires a toast.
    const withRetry = async <T,>(fn: () => Promise<T>): Promise<T> => {
      try { return await fn(); }
      catch { await new Promise(r => setTimeout(r, 700)); return fn(); }
    };
    const [todayRes, teamRes, leavesRes] = await Promise.allSettled([
      withRetry(() => attendanceService.getToday()),
      withRetry(() => attendanceService.getTeamStatus()),
      withRetry(() => leaveService.getList({ status: 'pending', per_page: 5 })),
    ]);
    if (todayRes.status === 'fulfilled') setAttendance(todayRes.value.attendance);
    if (teamRes.status === 'fulfilled') setTeam(teamRes.value);
    if (leavesRes.status === 'fulfilled') setPending(leavesRes.value.data);
    // Only surface an error if everything failed (e.g. offline / auth lost).
    if (todayRes.status === 'rejected' && teamRes.status === 'rejected' && leavesRes.status === 'rejected') {
      toast.error('Failed to load dashboard');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Re-fetch the report stats whenever a range dropdown changes (retry once).
  useEffect(() => {
    let active = true;
    reportService.getDashboardStats({ months: perfMonths, period: attPeriod })
      .catch(() => new Promise(r => setTimeout(r, 700)).then(() => reportService.getDashboardStats({ months: perfMonths, period: attPeriod })))
      .then(stats => { if (active && stats) setDstats(stats); })
      .catch(() => {});
    return () => { active = false; };
  }, [perfMonths, attPeriod]);

  const PRESENT_SET = ['working', 'on_break', 'checked_out', 'work_from_home'];
  const stats = useMemo(() => ({
    present: team.filter(m => PRESENT_SET.includes(m.current_status)).length,
    absent: team.filter(m => m.current_status === 'absent').length,
    leave: team.filter(m => m.current_status === 'on_leave').length,
  }), [team]);
  const total = team.length;
  const percent = (n: number) => total ? Math.round(n / total * 100) : 0;
  
  const { events, categories } = useCalendarEvents();
  const [calendarDate, setCalendarDate] = useState(new Date());
  const handlePrevMonth = () => setCalendarDate(subMonths(calendarDate, 1));
  const handleNextMonth = () => setCalendarDate(addMonths(calendarDate, 1));

  const monthStart = startOfMonth(calendarDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  // ── Real dashboard data (from /reports/dashboard-stats) ──
  const performanceData = dstats?.team_performance.monthly || [];
  const attendanceHeatmap = dstats?.attendance_report.heatmap || [];
  const teamPerf = dstats?.team_performance;
  const attReport = dstats?.attendance_report;
  const employment = dstats?.employment_status;
  const tasks = dstats?.tasks || [];
  const withSign = (n?: number) => `${(n ?? 0) >= 0 ? '' : ''}${n ?? 0}%`;
  const legendColors = ['bg-emerald-800', 'bg-emerald-500', 'bg-emerald-300', 'bg-emerald-100 border border-gray-200'];
  const barColors = ['var(--color-emerald-800)', 'var(--color-emerald-500)', 'var(--color-emerald-300)', 'var(--color-emerald-100)'];

  if (loading) return <PageLoader />;
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="min-h-screen bg-[#f8f9fb] p-6 lg:p-8 font-sans text-gray-900">
      {/* Header section is managed by DashboardLayout, but we can override page title */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="text-gray-500 font-medium text-sm">Hello {user?.name?.split(' ')[0] || 'Davis'}!</h2>
          <h1 className="text-3xl font-bold tracking-tight mt-1">{getGreeting()}</h1>
        </div>
        
        {/* We add a custom search and icons just to show how it looks, though it might duplicate DashboardLayout topbar. We will just leave it out to avoid duplication, or add a styled search bar if desired. We'll add a beautiful styled search bar. */}
        <div className="hidden md:flex items-center gap-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Search anything" className="pl-10 pr-4 py-2.5 rounded-full border border-gray-200 bg-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-64 shadow-sm" />
          </div>
        </div>
      </header>

      {/* TOP CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Workforce" value={String(total)} suffix="Employees" message="Active team members" />
        <StatCard title="Present Today" value={String(stats.present)} suffix={`${percent(stats.present)}% of team`} message="Current active workforce" />
        <StatCard title="Absent Today" value={String(stats.absent)} suffix={`${percent(stats.absent)}% of team`} message="People missing today" />
        <StatCard title="On Leave" value={String(stats.leave)} suffix={`${percent(stats.leave)}% of team`} message={pending.length > 0 ? `${pending.length} pending leave requests` : 'No pending requests'} />
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Calendar */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">{format(calendarDate, 'MMMM yyyy')}</h3>
              <div className="flex gap-2">
                <button onClick={handlePrevMonth} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 "><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg></button>
                <button onClick={handleNextMonth} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 "><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg></button>
              </div>
            </div>
            <div className="grid grid-cols-7 text-center text-xs font-semibold text-gray-400 mb-2">
              <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
            </div>
            <div className="grid grid-cols-7 text-center text-sm gap-y-3 font-medium">
              {calendarDays.map((day, idx) => {
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isCurrentDay = isToday(day);
                const dayStr = format(day, 'yyyy-MM-dd');
                const hasEvents = events.some(e => e.date === dayStr);

                let dayContent;
                let bgClass = "mx-auto w-7 h-7 flex items-center justify-center rounded-full transition-colors cursor-default";
                
                if (!isCurrentMonth) {
                  dayContent = <div className="text-gray-300">{format(day, 'd')}</div>;
                } else if (isCurrentDay) {
                  dayContent = <div className={`${bgClass} bg-emerald-900 text-white`}>{format(day, 'd')}</div>;
                } else if (hasEvents) {
                  dayContent = <div className={`${bgClass} bg-emerald-400 text-white shadow-md shadow-emerald-200 hover:bg-emerald-300`} title="Has events">{format(day, 'd')}</div>;
                } else {
                  dayContent = <div className={`${bgClass} hover:bg-emerald-50 text-gray-700`}>{format(day, 'd')}</div>;
                }

                return (
                  <React.Fragment key={idx}>
                    {dayContent}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Schedules */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Schedules</h3>
              <div className="relative">
                <select 
                  className="appearance-none cursor-pointer flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-700 pl-3 pr-8 py-1.5 rounded-full hover:bg-emerald-100 transition-colors outline-none"
                  value={format(calendarDate, 'yyyy-MM')}
                  onChange={(e) => {
                    setCalendarDate(parseISO(`${e.target.value}-01`));
                  }}
                >
                  {Array.from({ length: 24 }).map((_, i) => {
                    // Build from the 1st so day-of-month never rolls a short
                    // month over (e.g. Feb 30 → Mar), which duplicated months.
                    const now = new Date();
                    const d = new Date(now.getFullYear(), now.getMonth() - 12 + i, 1);
                    const val = format(d, 'yyyy-MM');
                    const label = format(d, 'MMM yyyy');
                    return <option key={val} value={val}>{label}</option>;
                  })}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                  <svg className="w-3 h-3 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                </div>
              </div>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 overflow-x-hidden custom-scrollbar">
              {(() => {
                 const monthEvents = events.filter(e => e.date.startsWith(format(calendarDate, 'yyyy-MM'))).sort((a, b) => a.date.localeCompare(b.date));
                 if (monthEvents.length === 0) return <p className="text-sm text-gray-500 italic">No schedules this month.</p>;
                 return monthEvents.map(ev => {
                   const cat = categories.find(c => c.key === ev.type);
                   return (
                     <ScheduleCard 
                       key={ev.id} 
                       category={cat?.label || ev.type}
                       title={ev.title} 
                       room={ev.location || 'Online'} 
                       time={`${format(parseISO(ev.date), 'dd MMM')} - ${ev.time}`} 
                       color={cat?.color || 'text-gray-500'} 
                     />
                   );
                 });
              })()}
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN */}
        <div className="space-y-6">
          {/* Attendance Report */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-lg">Attendance Report</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-2xl font-bold">{attReport?.rate ?? 0}%</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${(attReport?.delta ?? 0) < 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                    <svg className={`w-3 h-3 ${(attReport?.delta ?? 0) < 0 ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                    {withSign(attReport?.delta)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Attendance Rate</p>
              </div>
              <div className="relative shrink-0">
                <select
                  className="appearance-none cursor-pointer text-xs font-semibold bg-emerald-50 text-emerald-700 pl-3 pr-8 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors outline-none"
                  value={attPeriod}
                  onChange={(e) => setAttPeriod(e.target.value as 'this_month' | 'last_month' | 'this_week')}
                >
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="this_week">This Week</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                  <svg className="w-3 h-3 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                </div>
              </div>
            </div>

            {/* Heatmap simulation */}
            <div className="relative pt-4">
              <div className="flex mb-2">
                <div className="w-16"></div>
                <div className="flex-1 flex justify-between text-[10px] font-semibold text-gray-400 px-2">
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span>
                </div>
              </div>
              {attendanceHeatmap.map((row, i) => (
                <div key={i} className="flex items-center mb-1.5">
                  <span className="w-16 text-[10px] font-semibold text-gray-400 text-right pr-3">{row.time}</span>
                  <div className="flex-1 flex justify-between gap-1">
                    <HeatBar value={row.mon} />
                    <HeatBar value={row.tue} />
                    <HeatBar value={row.wed} />
                    <HeatBar value={row.thu} />
                    <HeatBar value={row.fri} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Employee Satisfaction */}
          <EmployeeSatisfactionCard />
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Team Performance */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-lg">Team Performance</h3>
                <div className="text-3xl font-bold mt-2">{teamPerf?.current ?? 0}%</div>
                <div className="flex items-center gap-2 mt-2">
                   <span className={`text-xs font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${(teamPerf?.delta ?? 0) < 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                     <svg className={`w-3 h-3 ${(teamPerf?.delta ?? 0) < 0 ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                     {withSign(teamPerf?.delta)}
                   </span>
                   <span className="text-xs text-gray-400">vs last month · attendance</span>
                </div>
              </div>
              <div className="relative shrink-0">
                <select
                  className="appearance-none cursor-pointer text-xs font-semibold bg-emerald-50 text-emerald-700 pl-3 pr-8 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors outline-none"
                  value={perfMonths}
                  onChange={(e) => setPerfMonths(Number(e.target.value))}
                >
                  <option value={3}>Last 3 Months</option>
                  <option value={6}>Last 6 Months</option>
                  <option value={12}>Last 12 Months</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                  <svg className="w-3 h-3 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                </div>
              </div>
            </div>

            <div className="h-48 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} ticks={[0, 25, 50, 75, 100]} tickFormatter={(val) => `${val}%`} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="value" stroke="var(--color-emerald-400)" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: 'var(--color-emerald-500)', stroke: '#fff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Employment Status */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Employment Status</h3>
            </div>
            
            <div className="flex items-end gap-2 mb-4">
              <span className="text-3xl font-bold leading-none">{employment?.total ?? 0}</span>
              <span className="text-sm text-gray-500 font-medium mb-1">Employees</span>
            </div>

            {/* Progress Bar */}
            <div className="flex h-3 w-full rounded-full overflow-hidden mb-2 bg-gray-100">
              {(employment?.breakdown || []).map((b, i) => (
                <div key={b.type} style={{ width: `${b.percent}%`, backgroundColor: barColors[i % barColors.length] }}></div>
              ))}
            </div>
            <div className="flex justify-between text-xs font-semibold text-gray-400 mb-6">
              <span>0%</span>
              <span>100%</span>
            </div>

            <div className="grid grid-cols-2 gap-y-5">
              {(employment?.breakdown || []).map((b, i) => (
                <StatusLegend key={b.type} dot={legendColors[i % legendColors.length]} label={b.type} percent={`${b.percent}%`} count={String(b.count)} />
              ))}
              {!employment?.breakdown.length && <p className="text-sm text-gray-400">No employee data.</p>}
            </div>
          </div>

          {/* Tasks */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Tasks</h3>
              <button className="text-gray-400">...</button>
            </div>
            
            <div className="space-y-4">
              {tasks.map((t, i) => (
                <div key={i} className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1 w-5 h-5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 leading-snug truncate">{t.title}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md uppercase tracking-wider">{t.category}</span>
                      {t.due_date && <span className="text-[11px] font-semibold text-gray-400">{format(parseISO(t.due_date), 'dd MMM yyyy')}</span>}
                    </div>
                  </div>
                </div>
              ))}
              {!tasks.length && <p className="text-sm text-gray-400 italic">No pending tasks.</p>}
            </div>
          </div>

          {/* Upcoming Holidays */}
          <UpcomingHolidaysWidget />
        </div>

      </div>
    </div>
  );
}

function StatCard({ title, value, suffix, message }: { title: string, value: string, suffix: string, message: string }) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-gray-500 font-medium text-sm">{title}</h3>
      </div>
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        <span className="text-xs font-semibold text-gray-400">{suffix}</span>
      </div>
      <div className="bg-emerald-50 text-emerald-700 text-[11px] font-semibold px-4 py-2.5 rounded-xl text-center">
        {message}
      </div>
    </div>
  );
}

function ScheduleCard({ category, title, room, time, color }: { category: string, title: string, room: string, time: string, color: string }) {
  const isHex = color?.startsWith('#');
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col gap-2">
      <span className={`text-[10px] font-bold ${!isHex ? color : ''}`} style={isHex ? { color } : undefined}>{category}</span>
      <h4 className="font-bold text-sm text-gray-800">{title}</h4>
      <div className="flex justify-between items-center mt-1">
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md">{room}</span>
           <span className="text-[10px] font-semibold text-gray-400">{time}</span>
        </div>
        <div className="flex -space-x-2">
           <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white"></div>
           <div className="w-6 h-6 rounded-full bg-pink-100 border-2 border-white"></div>
           <div className="w-6 h-6 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-emerald-700">+3</div>
        </div>
      </div>
    </div>
  );
}

function HeatBar({ value }: { value: number }) {
  // Value 0 to 100
  let bg = 'bg-emerald-50'; // very light
  if (value > 80) bg = 'bg-emerald-900'; // dark
  else if (value > 50) bg = 'bg-emerald-400'; // mid
  else if (value > 20) bg = 'bg-emerald-200'; // light
  
  return <div className={`flex-1 h-5 rounded-sm ${bg} transition-colors`}></div>;
}

function SatisfactionBar({ label, val, score }: { label: string, val: string, score: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-bold text-gray-700">{label}</span>
        <div className="flex items-center gap-1">
          <div className="flex text-amber-400 text-[10px]">★★★★<span className="text-gray-300">★</span></div>
          <span className="font-bold text-gray-800 ml-1">{score}</span>
        </div>
      </div>
      <p className="text-[10px] text-gray-400 mb-1">{val} Satisfaction</p>
    </div>
  );
}

function StatusLegend({ dot, label, percent, count }: { dot: string, label: string, percent: string, count: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-2 h-2 rounded-full ${dot}`}></div>
        <span className="text-sm font-bold text-gray-800">{label}</span>
      </div>
      <div className="flex items-center gap-2 pl-4">
        <span className="text-xs font-bold text-gray-500">{percent}</span>
        <span className="text-xs font-semibold text-gray-400">— {count} Employees</span>
      </div>
    </div>
  );
}
