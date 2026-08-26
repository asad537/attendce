import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCalendarEvents } from '../../hooks/useCalendarEvents';
import { attendanceService } from '../../services/attendanceService';
import { leaveService } from '../../services/leaveService';
import { Attendance, Leave, TeamMemberStatus } from '../../types';
import { PageLoader } from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
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

const performanceData = [
  { name: 'Jan', value: 50 },
  { name: 'Feb', value: 58 },
  { name: 'Mar', value: 55 },
  { name: 'Apr', value: 75 },
  { name: 'May', value: 95.2 },
  { name: 'Jun', value: 70 },
];

const attendanceData = [
  { time: '8:00 AM', mon: 100, tue: 100, wed: 100, thu: 100, fri: 100 },
  { time: '8:30 AM', mon: 100, tue: 80, wed: 100, thu: 100, fri: 100 },
  { time: '9:00 AM', mon: 60, tue: 60, wed: 80, thu: 100, fri: 100 },
  { time: '9:30 AM', mon: 40, tue: 40, wed: 80, thu: 80, fri: 60 },
  { time: '10:00 AM', mon: 20, tue: 40, wed: 60, thu: 40, fri: 40 },
  { time: '10:30 AM', mon: 10, tue: 20, wed: 20, thu: 20, fri: 10 },
];

export default function CeoDashboard() {
  const { user } = useAuth();
  
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [team, setTeam] = useState<TeamMemberStatus[]>([]);
  const [pending, setPending] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [today, teamStatus, leaves] = await Promise.all([
        attendanceService.getToday(), 
        attendanceService.getTeamStatus(), 
        leaveService.getList({ status: 'pending', per_page: 5 })
      ]);
      setAttendance(today.attendance); 
      setTeam(teamStatus); 
      setPending(leaves.data);
    } catch { 
      toast.error('Failed to load dashboard'); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const PRESENT_SET = ['working', 'on_break', 'checked_out', 'work_from_home'];
  const stats = useMemo(() => ({
    present: team.filter(m => PRESENT_SET.includes(m.current_status)).length,
    absent: team.filter(m => m.current_status === 'absent').length,
    leave: team.filter(m => m.current_status === 'on_leave').length,
  }), [team]);
  const total = team.length;
  const percent = (n: number) => total ? Math.round(n / total * 100) : 0;
  
  const { events } = useCalendarEvents();
  const [calendarDate, setCalendarDate] = useState(new Date());
  const handlePrevMonth = () => setCalendarDate(subMonths(calendarDate, 1));
  const handleNextMonth = () => setCalendarDate(addMonths(calendarDate, 1));

  const monthStart = startOfMonth(calendarDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  if (loading) return <PageLoader />;
  
  return (
    <div className="min-h-screen bg-[#f8f9fb] p-6 lg:p-8 font-sans text-gray-900">
      {/* Header section is managed by DashboardLayout, but we can override page title */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="text-gray-500 font-medium text-sm">Hello {user?.name?.split(' ')[0] || 'Davis'}!</h2>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Good Morning</h1>
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
                <button onClick={handlePrevMonth} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg></button>
                <button onClick={handleNextMonth} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg></button>
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
              <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                {format(calendarDate, 'MMM yyyy')} v
              </span>
            </div>
            <div className="space-y-3">
              {(() => {
                 const monthEvents = events.filter(e => e.date.startsWith(format(calendarDate, 'yyyy-MM'))).slice(0, 3);
                 if (monthEvents.length === 0) return <p className="text-sm text-gray-500 italic">No schedules this month.</p>;
                 return monthEvents.map(ev => (
                   <ScheduleCard 
                     key={ev.id} 
                     category={ev.type === 'talent' ? 'Talent Acquisition' : ev.type === 'dev' ? 'Employee Development' : 'Workplace Engagement'}
                     title={ev.title} 
                     room={ev.location || 'Online'} 
                     time={`${format(parseISO(ev.date), 'dd MMM')} - ${ev.time}`} 
                     color={ev.type === 'talent' ? 'text-emerald-500' : ev.type === 'dev' ? 'text-blue-500' : 'text-purple-500'} 
                   />
                 ));
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
                  <span className="text-2xl font-bold">92%</span>
                  <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                    1.54%
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Attendance Rate</p>
              </div>
              <button className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg flex items-center gap-1">This Month v</button>
            </div>
            
            {/* Heatmap simulation */}
            <div className="relative pt-4">
              <div className="flex mb-2">
                <div className="w-16"></div>
                <div className="flex-1 flex justify-between text-[10px] font-semibold text-gray-400 px-2">
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span>
                </div>
              </div>
              {attendanceData.map((row, i) => (
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
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg">Employee Satisfaction</h3>
              <button className="text-gray-400">...</button>
            </div>
            
            <div className="flex items-end justify-between mb-4">
              <div>
                <span className="text-3xl font-bold">73%</span>
                <p className="text-xs text-gray-500 font-medium mt-1 mb-1">Employee Satisfied</p>
                <div className="flex text-amber-400 text-xs">
                  ★ ★ ★ ★ <span className="text-gray-300">★</span> <span className="text-gray-800 font-bold ml-2">4.2/5</span>
                </div>
              </div>
              <div className="w-24 h-12 relative overflow-hidden">
                 {/* Gauge simulation */}
                 <div className="w-24 h-24 rounded-full border-[12px] border-gray-100 absolute bottom-0 left-0"></div>
                 <div className="w-24 h-24 rounded-full border-[12px] border-emerald-400 absolute bottom-0 left-0" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)', transform: 'rotate(45deg)' }}></div>
                 <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-8 bg-gray-800 rounded-full origin-bottom" style={{ transform: 'rotate(30deg)' }}></div>
                 <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-gray-800 rounded-full border-4 border-white"></div>
              </div>
            </div>
            
            <div className="bg-emerald-50 text-emerald-800 text-xs font-medium px-4 py-2 rounded-xl mb-6">
              That's an <strong className="text-emerald-700">increase of 6%</strong> from last month
            </div>
            
            <div className="space-y-4">
              <SatisfactionBar label="Compensation & Benefits" val="78%" score="4.5/5" />
              <SatisfactionBar label="Work Culture" val="74%" score="4.3/5" />
              <SatisfactionBar label="Work-Life Balance" val="71%" score="4.1/5" />
              <SatisfactionBar label="Career Growth Opportunities" val="68%" score="3.9/5" />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Team Performance */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-lg">Team Performance</h3>
                <div className="text-3xl font-bold mt-2">89.52%</div>
                <div className="flex items-center gap-2 mt-2">
                   <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                     <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
                     3.84%
                   </span>
                   <span className="text-xs text-gray-400">Increased vs last week</span>
                </div>
              </div>
              <button className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg flex items-center gap-1">Last 6 Months v</button>
            </div>
            
            <div className="h-48 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} ticks={[0, 25, 50, 75, 100]} tickFormatter={(val) => `${val}%`} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Employment Status */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Employment Status</h3>
              <button className="text-gray-400">...</button>
            </div>
            
            <div className="flex items-end gap-2 mb-4">
              <span className="text-3xl font-bold leading-none">128</span>
              <span className="text-sm text-gray-500 font-medium mb-1">Employees</span>
            </div>
            
            {/* Progress Bar */}
            <div className="flex h-3 w-full rounded-full overflow-hidden mb-2">
              <div className="bg-[#115e59]" style={{ width: '68%' }}></div>
              <div className="bg-[#34d399]" style={{ width: '15%' }}></div>
              <div className="bg-[#a7f3d0]" style={{ width: '10%' }}></div>
              <div className="bg-[#ecfdf5]" style={{ width: '7%' }}></div>
            </div>
            <div className="flex justify-between text-xs font-semibold text-gray-400 mb-6">
              <span>0%</span>
              <span>100%</span>
            </div>
            
            <div className="grid grid-cols-2 gap-y-5">
               <StatusLegend dot="bg-[#115e59]" label="Full-Time" percent="68%" count="87" />
               <StatusLegend dot="bg-[#34d399]" label="Part-Time" percent="15%" count="19" />
               <StatusLegend dot="bg-[#a7f3d0]" label="Freelance" percent="10%" count="13" />
               <StatusLegend dot="bg-[#ecfdf5] border border-gray-200" label="Internship" percent="7%" count="9" />
            </div>
          </div>

          {/* Tasks */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Tasks</h3>
              <button className="text-gray-400">...</button>
            </div>
            
            <div className="flex items-start gap-3">
              <input type="checkbox" className="mt-1 w-5 h-5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500" />
              <div>
                <p className="text-sm font-medium text-gray-800 leading-snug">Complete pre-session survey for Leadership Track session</p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md uppercase tracking-wider">Employee Development</span>
                  <span className="text-[11px] font-semibold text-gray-400">28 June 2035</span>
                </div>
              </div>
            </div>
          </div>
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
        <button className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-50 text-gray-400">...</button>
      </div>
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        <span className="text-xs font-semibold text-gray-400">{suffix}</span>
      </div>
      <div className="bg-[#eff8ef] text-[#4b7a4b] text-[11px] font-semibold px-4 py-2.5 rounded-xl text-center">
        {message}
      </div>
    </div>
  );
}

function ScheduleCard({ category, title, room, time, color }: { category: string, title: string, room: string, time: string, color: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col gap-2">
      <span className={`text-[10px] font-bold ${color}`}>{category}</span>
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
  let bg = 'bg-[#f0fdf4]'; // very light
  if (value > 80) bg = 'bg-[#115e59]'; // dark
  else if (value > 50) bg = 'bg-[#34d399]'; // mid
  else if (value > 20) bg = 'bg-[#a7f3d0]'; // light
  
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
