import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { attendanceService, breakService } from '../../services/attendanceService';
import { leaveService } from '../../services/leaveService';
import { holidayService } from '../../services/reportService';
import { Attendance, Holiday, LeaveBalance } from '../../types';
import { PageLoader } from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { format, differenceInMinutes, parseISO } from 'date-fns';

export default function EmployeeDashboard() {
  const { user, refreshUser } = useAuth();
  const [attendance, setAttendance]   = useState<Attendance | null>(null);
  const [currentStatus, setStatus]    = useState<string>('absent');
  const [balances, setBalances]       = useState<LeaveBalance[]>([]);
  const [holidays, setHolidays]       = useState<Holiday[]>([]);
  const [loading, setLoading]         = useState(true);
  const [actionLoading, setAction]    = useState(false);

  const load = useCallback(async () => {
    try {
      const [todayRes, balRes, holRes] = await Promise.all([
        attendanceService.getToday(),
        leaveService.getBalances(),
        holidayService.getUpcoming(),
      ]);
      setAttendance(todayRes.attendance);
      setStatus(todayRes.current_status);
      setBalances(balRes.balances.filter(b => !['Annual Leave', 'Paternity Leave', 'Maternity Leave', 'Casual Leave'].includes(b.leave_type?.name || '')));
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
      const att = await attendanceService.checkIn({ work_mode: 'office' }); // defaults to office
      await load();
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
      await load();
      toast.success(`Checked out — ${att.working_hours.toFixed(2)}h worked`);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Check-out failed');
    } finally { setAction(false); }
  };

  const handleBreakStart = async () => {
    setAction(true);
    try {
      await breakService.startBreak('short');
      toast.success('Break started');
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to start break');
    } finally { setAction(false); }
  };

  const handleBreakEnd = async () => {
    setAction(true);
    try {
      await breakService.endBreak();
      toast.success('Break ended');
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to end break');
    } finally { setAction(false); }
  };

  const isCheckedIn  = !!attendance?.check_in && !attendance?.check_out;
  const isOnBreak    = currentStatus === 'on_break';
  const isCheckedOut = !!attendance?.check_out;

  const isPastWorkingHours = useMemo(() => {
    if (!user?.shift?.end_time) return false;
    const [h, m] = user.shift.end_time.split(':');
    const end = new Date();
    end.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    return new Date() > end;
  }, [user]);

  // Chart Data Generation (Live Simulation)
  const chartData = useMemo(() => {
    if (!attendance?.check_in) return [];
    
    const start = parseISO(attendance.check_in);
    const now = new Date();
    
    const shiftStartStr = user?.shift?.start_time || '10:00:00';
    const shiftEndStr = user?.shift?.end_time || '19:00:00';
    const todayStr = format(now, 'yyyy-MM-dd');
    const shiftStart = parseISO(`${todayStr}T${shiftStartStr}`);
    const shiftEnd = parseISO(`${todayStr}T${shiftEndStr}`);
    
    const data = [];
    let current = shiftStart;
    
    // Generate data points for every hour of the shift
    while (current <= shiftEnd) {
       const timeStr = format(current, 'hh:mm a');
       if (current > now) {
          // Future points -> no line
          data.push({ time: timeStr, hours: null, isLatest: false });
       } else if (current < start) {
          // Time before check in -> 0 hours
          data.push({ time: timeStr, hours: 0, isLatest: false });
       } else {
          // Time actively working
          const elapsed = Math.max(0, differenceInMinutes(current, start));
          data.push({ time: timeStr, hours: Number((elapsed / 60).toFixed(2)), isLatest: false });
       }
       current = new Date(current.getTime() + 60 * 60000); // 1 hour step
    }
    
    // Find the latest non-null point to add the active dot
    let lastNonNull = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i].hours !== null) lastNonNull = i;
    }
    if (lastNonNull >= 0) {
      data[lastNonNull].isLatest = true;
      // Overwrite the very last drawn point with the EXACT current elapsed time to make it smooth
      const actualEnd = (isCheckedOut && attendance.check_out) ? parseISO(attendance.check_out) : now;
      const actualElapsed = Math.max(0, differenceInMinutes(actualEnd, start));
      data[lastNonNull].hours = Number((actualElapsed / 60).toFixed(2));
    }
    
    return data;
  }, [attendance, isCheckedOut, currentStatus, user]);

  if (loading) return <PageLoader />;

  // Format Helper
  const fmtTime = (dateStr?: string) => dateStr ? format(new Date(dateStr), 'hh:mm a') : '–';
  const fmtBreak = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
  };

  // Activity Timeline
  const activities = [];
  if (attendance?.check_in) {
    activities.push({ id: 'in', title: 'Checked In', time: fmtTime(attendance.check_in), icon: '✅', color: 'bg-green-100 text-green-600' });
  }
  /* if (attendance?.breaks) {
    attendance.breaks.forEach((b: any, i: number) => {
      activities.push({ id: `b${i}-start`, title: 'Start Break', time: fmtTime(b.break_start), icon: '☕', color: 'bg-orange-100 text-orange-600' });
      if (b.break_end) {
        activities.push({ id: `b${i}-end`, title: 'End Break', time: fmtTime(b.break_end), icon: '🔙', color: 'bg-green-100 text-green-600' });
      }
    });
  } */
  if (attendance?.check_out) {
    activities.push({ id: 'out', title: 'Checked Out', time: fmtTime(attendance.check_out), icon: '🚪', color: 'bg-red-100 text-red-600' });
  }
  // Sort by time roughly
  activities.reverse();

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto bg-gray-50 min-h-screen font-sans">
      
      {/* 1. TOP CARD: Today's Attendance */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="flex-1 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 sm:mb-0 min-w-[200px]">Today's Attendance</h2>
            
            <div className="flex flex-wrap md:flex-nowrap gap-8 flex-1">
              {/* Check In Stat */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600 text-xl border border-green-100 shadow-sm">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-0.5">Check In</p>
                  <p className="font-bold text-gray-900 text-lg leading-tight">{fmtTime(attendance?.check_in)}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Today</p>
                </div>
              </div>

              {/* Check Out Stat */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-xl border border-red-100 shadow-sm">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-0.5">Check Out</p>
                  <p className="font-bold text-gray-900 text-lg leading-tight">{fmtTime(attendance?.check_out)}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{isCheckedOut ? 'Today' : 'Not Checked Out'}</p>
                </div>
              </div>

              {/* Live Working Hours */}
              <div className="flex items-center gap-4 border-l pl-8 border-gray-100">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-xl border border-emerald-100 shadow-sm">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-0.5">Live Working Hours</p>
                  <p className="font-bold text-emerald-600 text-xl leading-tight">
                    {isCheckedIn ? <LiveTimer checkIn={attendance!.check_in!} breakMins={attendance!.break_minutes} /> : (attendance?.working_hours ? attendance.working_hours.toFixed(2) + 'h' : '–')}
                  </p>
                  <p className="text-[11px] text-emerald-600 mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> {isCheckedIn && !isOnBreak ? 'Live' : 'Paused'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons (Left Aligned) */}
        <div className="mt-8 flex gap-4 border-t border-gray-50 pt-6">
          {!isCheckedIn && !isCheckedOut && (
            <button onClick={handleCheckIn} disabled={actionLoading} className="px-6 py-2.5 rounded-xl border-2 border-emerald-500 text-emerald-600 font-semibold flex items-center gap-2 hover:bg-emerald-50 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
              {actionLoading ? 'Checking In...' : 'Check In'}
            </button>
          )}

          {isCheckedIn && !isOnBreak && (
            <>
              {/* Start Break Button Commented Out */}
              <button onClick={handleCheckOut} disabled={actionLoading} className="px-6 py-2.5 rounded-xl border-2 border-red-400 text-red-500 font-semibold flex items-center gap-2 hover:bg-red-50 transition-colors shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                {actionLoading ? 'Checking Out...' : 'Check Out'}
              </button>
            </>
          )}

          {/* End Break Logic Commented Out */}

          {isCheckedOut && (
            <button onClick={handleCheckIn} disabled={actionLoading || isPastWorkingHours} title={isPastWorkingHours ? "Working hours have ended" : ""} className={`px-6 py-2.5 rounded-xl border-2 font-semibold flex items-center gap-2 transition-colors ${isPastWorkingHours ? 'border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed' : 'border-emerald-500 text-emerald-600 hover:bg-emerald-50'}`}>
              ↻ Resume Shift
            </button>
          )}
        </div>
      </div>

      {/* 2. 4 MINI STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
        
        {/* Total Hours */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between h-[140px]">
          <div className="flex gap-4 items-start">
             <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
             </div>
             <div>
               <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Total Hours (Today)</p>
               <p className="text-xl font-bold text-gray-900 mt-0.5">
                  {isCheckedIn ? <LiveTimer checkIn={attendance!.check_in!} breakMins={attendance!.break_minutes} /> : (attendance?.working_hours ? attendance.working_hours.toFixed(2) + 'h' : '00h 00m')}
               </p>
               <p className="text-[11px] text-gray-400 mt-1">Spent at work</p>
             </div>
          </div>
          {/* Sparkline decoration */}
          <div className="h-6 mt-2 opacity-50">
            <svg viewBox="0 0 100 20" className="w-full h-full text-emerald-400 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
              <path d="M0 15 L20 12 L40 18 L60 8 L80 10 L100 2" />
            </svg>
          </div>
        </div>

        {/* Check In */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between h-[140px]">
          <div className="flex gap-4 items-start">
             <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </div>
             <div>
               <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Check In</p>
               <p className="text-xl font-bold text-gray-900 mt-0.5">{fmtTime(attendance?.check_in)}</p>
               <p className="text-[11px] text-gray-400 mt-1">Today</p>
             </div>
          </div>
        </div>

        {/* Check Out */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between h-[140px]">
          <div className="flex gap-4 items-start">
             <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
             </div>
             <div>
               <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Check Out</p>
               <p className="text-xl font-bold text-gray-900 mt-0.5">{fmtTime(attendance?.check_out)}</p>
               <p className="text-[11px] text-gray-400 mt-1">{isCheckedOut ? 'Today' : 'Not Checked Out'}</p>
             </div>
          </div>
        </div>

        {/* Break Time (Commented Out per request) */}
        {/* 
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between h-[140px]">
          <div className="flex gap-4 items-start">
             <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </div>
             <div>
               <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Break Time</p>
               <p className="text-xl font-bold text-gray-900 mt-0.5">{fmtBreak(attendance?.break_minutes || 0)}</p>
               <p className="text-[11px] text-gray-400 mt-1">Today's Break</p>
             </div>
          </div>
          <div className="mt-4 flex justify-between items-center px-1">
            <div className="flex gap-1">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-100"></div>
              ))}
            </div>
          </div>
        </div> */}
      </div>

      {/* 3. CHART & ACTIVITY ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
                                        {/* Shift Timeline (Replaced Chart) */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 lg:col-span-2 flex flex-col">
          <div className="flex flex-col mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-gray-900">Workday Timeline</h3>
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            {user?.shift && (
               <p className="text-[13px] font-medium text-gray-500 mt-1">Work hours: {format(parseISO(`2000-01-01T${user.shift.start_time}`), 'hh:mm a')} – {format(parseISO(`2000-01-01T${user.shift.end_time}`), 'hh:mm a')}</p>
            )}
          </div>
          
          <div className="flex-1 flex flex-col w-full mt-6 mb-2">
            {(() => {
              const parseTime = (timeStr) => {
                if (!timeStr) return null;
                const [h, m] = timeStr.split(':');
                const d = new Date();
                d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
                return d;
              };

              const shiftStart = parseTime(user?.shift?.start_time || '10:00:00');
              const shiftEnd = parseTime(user?.shift?.end_time || '19:00:00');
              
              const now = new Date();
              const totalMins = (shiftEnd - shiftStart) / 60000;
              let elapsedMins = (now - shiftStart) / 60000;
              
              if (!isCheckedIn && !isCheckedOut) elapsedMins = 0; 
              if (elapsedMins < 0) elapsedMins = 0;
              if (elapsedMins > totalMins || isCheckedOut) elapsedMins = totalMins;
              
              const progress = Math.max(0, Math.min(100, (elapsedMins / totalMins) * 100));

              const ticks = [];
              let currentTick = new Date(shiftStart);
              while (currentTick <= shiftEnd) {
                 ticks.push(new Date(currentTick));
                 currentTick.setHours(currentTick.getHours() + 1);
              }
              if (ticks[ticks.length - 1].getTime() !== shiftEnd.getTime()) {
                 ticks.push(new Date(shiftEnd));
              }

              return (
                <div className="relative w-full pt-12 pb-16 px-6">
                  
                  {/* Ticks Container (Anchored right above the line) */}
                  <div className="absolute top-0 left-6 right-6 h-[80px]">
                    {ticks.map((tick, i) => {
                       const tickProgress = ((tick - shiftStart) / 60000) / totalMins * 100;
                       const isStart = i === 0;
                       const isEnd = i === ticks.length - 1;
                       return (
                         <div key={i} className="absolute bottom-0 flex flex-col items-center" style={{ left: `${tickProgress}%`, transform: 'translateX(-50%)' }}>
                            <div className={`text-[11px] font-bold whitespace-nowrap mb-1 ${isStart ? 'text-[#00a65a]' : 'text-[#334155]'}`}>
                               {format(tick, 'hh:mm a')}
                            </div>
                            {(isStart || isEnd) && (
                               <div className={`text-[10px] font-semibold mb-1 ${isStart ? 'text-[#00a65a]' : 'text-gray-400'}`}>
                                 {isStart ? 'Start' : 'End'}
                               </div>
                            )}
                            {/* Short tick line touching the bar */}
                            <div className={`border-l ${(isStart || isEnd) ? 'mt-0 h-4' : 'mt-4 h-5'} border-gray-300 opacity-60`}></div>
                         </div>
                       );
                    })}
                  </div>

                  {/* The Timeline Track */}
                  <div className="relative mt-[80px] w-full flex items-center">
                    
                    {/* Remaining Time (Dashed Background) */}
                    <div className="absolute w-full border-t-[2px] border-dashed border-[#cbd5e1] z-0"></div>
                    
                    {/* Worked Time (Solid Green Foreground) */}
                    <div 
                      className="absolute h-[6px] bg-[#00a65a] rounded-full z-10 transition-all duration-1000 ease-in-out"
                      style={{ width: `${progress}%` }}
                    ></div>
                    
                    {/* The Current Time Dot */}
                    {(isCheckedIn || isCheckedOut) && (
                      <div 
                        className="absolute w-[16px] h-[16px] bg-[#00a65a] border-[4px] border-[#dcfce7] rounded-full shadow-sm transition-all duration-1000 ease-in-out z-20 flex items-center justify-center box-content"
                        style={{ left: `calc(${progress}% - 16px)` }}
                      >
                        {/* Current Time Bubble Below */}
                        {!isCheckedOut && (
                          <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-white border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.08)] rounded-xl py-2 px-4 flex flex-col items-center whitespace-nowrap z-30">
                            {/* Little triangle pointing up */}
                            <div className="absolute -top-[6px] left-1/2 -ml-[6px] w-[12px] h-[12px] bg-white border-t border-l border-gray-100 rotate-45"></div>
                            
                            <span className="text-[#00a65a] font-bold text-[14px]">{format(now, 'hh:mm a')}</span>
                            <span className="text-[#64748b] text-[10px] font-medium mt-0.5">Current Time</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* End Dot (Grey) from Figma */}
                    <div className="absolute right-0 w-[12px] h-[12px] bg-[#94a3b8] rounded-full z-0 translate-x-1.5"></div>
                    {/* Start Dot (Green) */}
                    <div className="absolute left-0 w-[12px] h-[12px] bg-[#00a65a] rounded-full z-10 -translate-x-1.5"></div>
                  </div>
                  
                  {/* Legend */}
                  <div className="absolute bottom-0 w-full flex justify-center items-center gap-10 text-[12px] font-bold text-[#475569]">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-[2px] bg-[#00a65a] rounded-full"></div>
                        Worked Time
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="w-8 border-t-[2px] border-dashed border-[#94a3b8] rounded-full"></div>
                        Remaining Time
                     </div>
                  </div>

                </div>
              );
            })()}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
            <span className="px-3 py-1 rounded-lg bg-gray-100 text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors">View All</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-6">
            {activities.length > 0 ? activities.map((act) => (
              <div key={act.id} className="flex gap-4 items-start">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${act.color}`}>
                  {act.icon}
                </div>
                <div className="flex-1 pb-4 border-b border-gray-50 last:border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{act.title}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{act.time}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium">Today</p>
                  </div>
                </div>
              </div>
            )) : (
               <div className="text-center text-gray-400 text-sm mt-10">No activities yet.</div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 border-dashed text-center">
             <button className="text-emerald-500 font-semibold text-sm hover:text-emerald-600 transition-colors">
               View All Activity →
             </button>
          </div>
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
      const secs = Math.floor((Date.now() - start) / 1000) - (breakMins * 60);
      setElapsed(Math.max(0, secs));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [checkIn, breakMins]);
  
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  
  return (
    <>
      {h.toString().padStart(2, '0')}h {m.toString().padStart(2, '0')}m <span className="text-sm opacity-80">{s.toString().padStart(2, '0')}s</span>
    </>
  );
}
