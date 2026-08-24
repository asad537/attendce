import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { PageLoader } from '../../components/common/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import { attendanceService } from '../../services/attendanceService';
import { Attendance } from '../../types';

const FALLBACK_START = '10:00:00';
const FALLBACK_END = '19:00:00';

function timeOnDate(value: string, base: Date) {
  const [hours = 0, minutes = 0, seconds = 0] = value.split(':').map(Number);
  const result = new Date(base);
  result.setHours(hours, minutes, seconds, 0);
  return result;
}

function duration(seconds: number, includeSeconds = true) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const base = `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
  return includeSeconds ? `${base} ${String(secs).padStart(2, '0')}s` : base;
}

function clock(value?: string | null) {
  if (!value) return '–';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '–' : format(date, 'hh:mm a');
}

function Icon({ type, className = '' }: { type: 'in' | 'out' | 'clock' | 'calendar' | 'timer'; className?: string }) {
  const paths = {
    in: <><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/></>,
    out: <><path d="M14 7l5 5-5 5"/><path d="M19 12H7"/><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    timer: <><circle cx="12" cy="13" r="8"/><path d="M12 9v5l3 2M9 2h6"/></>,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[type]}</svg>;
}

export default function EmployeeDashboard() {
  const { user, refreshUser } = useAuth();
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    try {
      const result = await attendanceService.getToday();
      setAttendance(result.attendance);
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const checkedIn = Boolean(attendance?.check_in && !attendance?.check_out);
  const checkedOut = Boolean(attendance?.check_out);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const result = await attendanceService.checkIn({ work_mode: 'office' });
      await Promise.all([load(), refreshUser()]);
      toast.success(result.is_late ? `Checked in — ${result.late_minutes} min late` : 'Checked in successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Check-in failed');
    } finally { setActionLoading(false); }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const result = await attendanceService.checkOut();
      await Promise.all([load(), refreshUser()]);
      toast.success(`Checked out — ${result.working_hours.toFixed(2)}h worked`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Check-out failed');
    } finally { setActionLoading(false); }
  };

  const workday = useMemo(() => {
    const shiftStart = timeOnDate(user?.shift?.start_time || FALLBACK_START, now);
    let shiftEnd = timeOnDate(user?.shift?.end_time || FALLBACK_END, now);
    if (shiftEnd <= shiftStart) shiftEnd = new Date(shiftEnd.getTime() + 86400000);
    const checkIn = attendance?.check_in ? new Date(attendance.check_in) : null;
    const checkOut = attendance?.check_out ? new Date(attendance.check_out) : null;
    const stopAt = checkOut || now;
    const worked = checkIn ? Math.max(0, (stopAt.getTime() - checkIn.getTime()) / 1000 - (attendance?.break_minutes || 0) * 60) : 0;
    const expected = Math.max(0, (shiftEnd.getTime() - shiftStart.getTime()) / 1000);
    const remaining = Math.max(0, expected - worked);
    const timelinePoint = checkOut || (checkedIn ? now : shiftStart);
    const progress = Math.min(100, Math.max(0, ((timelinePoint.getTime() - shiftStart.getTime()) / (shiftEnd.getTime() - shiftStart.getTime())) * 100));
    const ticks: Date[] = [shiftStart];
    let tick = new Date(shiftStart);
    tick.setMinutes(0, 0, 0);
    if (tick <= shiftStart) tick = new Date(tick.getTime() + 3600000);
    while (tick < shiftEnd && ticks.length < 14) {
      ticks.push(tick);
      tick = new Date(tick.getTime() + 3600000);
    }
    ticks.push(shiftEnd);
    return { shiftStart, shiftEnd, worked, expected, remaining, progress, ticks };
  }, [attendance, checkedIn, now, user?.shift?.end_time, user?.shift?.start_time]);

  if (loading) return <PageLoader />;

  const status = checkedIn ? 'Working' : checkedOut ? 'Completed' : 'Not checked in';
  const onTrack = workday.remaining > 0 && checkedIn;

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 p-3 sm:p-4 lg:p-5">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-gray-900 sm:text-xl">Live Workday Progress</h1>
              {checkedIn && <span className="rounded-md bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">Live</span>}
            </div>
            <p className="mt-1 text-sm text-gray-500">{format(now, 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${checkedIn ? 'bg-green-50 text-green-700' : checkedOut ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
            <span className={`h-2 w-2 rounded-full ${checkedIn ? 'bg-green-500' : checkedOut ? 'bg-blue-500' : 'bg-gray-400'}`} />{status}
          </span>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-3 sm:gap-8">
          <WorkdayValue icon="in" tone="green" label="Check In" value={clock(attendance?.check_in)} note={attendance?.check_in ? 'Today' : 'Not checked in'} />
          <WorkdayValue icon="out" tone="red" label="Check Out" value={clock(attendance?.check_out)} note={attendance?.check_out ? 'Today' : 'Not checked out'} />
          <WorkdayValue icon="clock" tone="green" label="Total Working Time" value={duration(workday.worked)} note={attendance?.check_in ? `Since ${clock(attendance.check_in)}` : 'Starts after check in'} highlight />
        </div>

        <div className="mt-5 flex justify-center">
          {!attendance?.check_in ? (
            <button onClick={handleCheckIn} disabled={actionLoading} className="flex w-full max-w-sm items-center justify-center gap-2 rounded-lg border border-green-500 bg-white px-5 py-2.5 font-semibold text-green-600 transition hover:bg-green-50 disabled:opacity-60">
              <Icon type="in" className="h-5 w-5" />{actionLoading ? 'Checking in…' : 'Check In'}
            </button>
          ) : checkedIn ? (
            <button onClick={handleCheckOut} disabled={actionLoading} className="flex w-full max-w-sm items-center justify-center gap-2 rounded-lg border border-red-400 bg-white px-5 py-2.5 font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60">
              <Icon type="out" className="h-5 w-5" />{actionLoading ? 'Checking out…' : 'Check Out'}
            </button>
          ) : <div className="w-full max-w-sm rounded-lg bg-blue-50 px-5 py-2.5 text-center font-semibold text-blue-700">Workday completed</div>}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-gray-900">Workday Timeline</h2>
        <p className="mt-1 text-sm text-gray-500">Work hours: {format(workday.shiftStart, 'hh:mm a')} – {format(workday.shiftEnd, 'hh:mm a')}</p>
        <div className="mt-7 w-full px-2 pt-8 sm:px-3">
          <div className="relative h-28">
              {workday.ticks.map((tick, index) => {
                const position = ((tick.getTime() - workday.shiftStart.getTime()) / (workday.shiftEnd.getTime() - workday.shiftStart.getTime())) * 100;
                const edgeClass = index === 0 ? '' : index === workday.ticks.length - 1 ? '-translate-x-full' : '-translate-x-1/2';
                const middleTick = Math.floor((workday.ticks.length - 1) / 2);
                const mobileVisibility = index > 0 && index < workday.ticks.length - 1 && index !== middleTick ? 'hidden sm:block' : '';
                return <div key={tick.toISOString()} className="absolute top-1 h-7 border-l border-gray-200" style={{ left: `${position}%` }}><span className={`absolute -top-7 whitespace-nowrap text-[10px] font-semibold ${index === 0 ? 'text-green-600' : 'text-gray-600'} sm:text-xs ${edgeClass} ${mobileVisibility}`}>{format(tick, 'hh:mm a')}</span>{index === 0 && <span className="absolute top-8 whitespace-nowrap text-[10px] font-medium text-green-600">Start</span>}{index === workday.ticks.length - 1 && <span className="absolute top-8 -translate-x-full whitespace-nowrap text-[10px] font-medium text-gray-500">End</span>}</div>;
              })}
              <div className="absolute left-0 right-0 top-7 border-t-2 border-dashed border-gray-300" />
              <div className="absolute left-0 top-7 h-0.5 bg-green-600 transition-[width] duration-500" style={{ width: `${workday.progress}%` }} />
              <span className="absolute left-0 top-[23px] h-3 w-3 -translate-x-1/2 rounded-full bg-green-600" />
              <span className="absolute right-0 top-[23px] h-3 w-3 translate-x-1/2 rounded-full bg-gray-400" />
              {(checkedIn || checkedOut) && <>
                <span className="absolute top-[19px] z-10 h-5 w-5 -translate-x-1/2 rounded-full border-[3px] border-white bg-green-500 shadow-[0_0_0_4px_rgba(34,197,94,.2)]" style={{ left: `${workday.progress}%` }} />
                <div className={`absolute top-12 z-10 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-center shadow-md ${workday.progress > 88 ? '-translate-x-full' : workday.progress < 12 ? '' : '-translate-x-1/2'}`} style={{ left: `${workday.progress}%` }}><p className="text-xs font-bold text-green-700 sm:text-sm">{clock(attendance?.check_out || now.toISOString())}</p><p className="text-[10px] text-gray-500 sm:text-xs">{checkedIn ? 'Current Time' : 'Check Out'}</p></div>
              </>}
          </div>
          <div className="flex justify-center gap-6 text-xs text-gray-600 sm:gap-10 sm:text-sm">
            <span className="flex items-center gap-2"><span className="h-0.5 w-8 bg-green-600" />Worked Time</span>
            <span className="flex items-center gap-2"><span className="w-8 border-t-2 border-dashed border-gray-400" />Remaining Time</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon="clock" tone="green" label="Worked Time" value={duration(workday.worked)} note={checkedIn ? 'Live' : checkedOut ? 'Completed' : 'Today'} />
        <SummaryCard icon="calendar" tone="blue" label="Expected Work Time" value={duration(workday.expected, false)} note={`${format(workday.shiftStart, 'hh:mm a')} – ${format(workday.shiftEnd, 'hh:mm a')}`} />
        <SummaryCard icon="timer" tone="orange" label="Remaining Time" value={duration(workday.remaining)} note={`Until ${format(workday.shiftEnd, 'hh:mm a')}`} />
      </section>

      <div className={`flex items-center gap-3 rounded-xl border px-5 py-4 text-sm font-medium ${onTrack ? 'border-green-100 bg-green-50 text-green-700' : checkedOut ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600'}`}>
        <span className="text-xl">💡</span>{onTrack ? 'You are on track! Keep up the great work.' : checkedOut ? 'Your workday is complete.' : 'Check in to start tracking your workday.'}
      </div>
    </div>
  );
}

const tones = { green: 'bg-green-50 text-green-600', red: 'bg-red-50 text-red-500', blue: 'bg-blue-50 text-blue-600', orange: 'bg-orange-50 text-orange-500' };

function WorkdayValue({ icon, tone, label, value, note, highlight = false }: { icon: 'in' | 'out' | 'clock'; tone: keyof typeof tones; label: string; value: string; note: string; highlight?: boolean }) {
  return <div className="flex min-w-0 items-start gap-3"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}><Icon type={icon} className="h-5 w-5" /></span><div className="min-w-0"><p className="text-xs font-medium text-gray-600 sm:text-sm">{label}</p><p className={`mt-0.5 truncate text-lg font-bold sm:text-xl ${highlight ? 'text-green-600' : 'text-gray-900'}`}>{value}</p><p className="mt-0.5 text-xs text-gray-500">{note}</p></div></div>;
}

function SummaryCard({ icon, tone, label, value, note }: { icon: 'clock' | 'calendar' | 'timer'; tone: keyof typeof tones; label: string; value: string; note: string }) {
  return <div className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}><Icon type={icon} className="h-5 w-5" /></span><div className="min-w-0"><p className="text-xs text-gray-600 sm:text-sm">{label}</p><p className={`mt-0.5 truncate text-lg font-bold ${tone === 'green' ? 'text-green-600' : 'text-gray-900'}`}>{value}</p><p className="mt-0.5 truncate text-xs text-gray-500">{note}</p></div></div>;
}
