import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { PageLoader } from '../../components/common/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import { attendanceService, breakService } from '../../services/attendanceService';
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

type IconType = 'in' | 'out' | 'clock' | 'calendar' | 'timer' | 'coffee' | 'info';

function Icon({ type, className = '' }: { type: IconType; className?: string }) {
  const paths = {
    in: <><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/></>,
    out: <><path d="M14 7l5 5-5 5"/><path d="M19 12H7"/><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    timer: <><circle cx="12" cy="13" r="8"/><path d="M12 9v5l3 2M9 2h6"/></>,
    coffee: <><path d="M17 8h1a3 3 0 010 6h-1"/><path d="M3 8h14v7a4 4 0 01-4 4H7a4 4 0 01-4-4V8z"/><path d="M6 2v3M10 2v3M14 2v3"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></>,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[type]}</svg>;
}

export default function EmployeeDashboard() {
  const { user, refreshUser } = useAuth();
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [breakLoading, setBreakLoading] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [activeTab, setActiveTab] = useState<'regular' | 'weekend'>(() => {
    const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
    return isWeekend ? 'weekend' : 'regular';
  });

  useEffect(() => {
    if (attendance?.work_mode === 'weekend') {
      setActiveTab('weekend');
    }
  }, [attendance?.work_mode]);

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
  const activeBreak = attendance?.breaks?.find((b) => b.is_active) || null;
  const onBreak = Boolean(activeBreak);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const result = await attendanceService.checkIn({ work_mode: activeTab === 'weekend' ? 'weekend' : 'office' });
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

  const handleBreak = async () => {
    setBreakLoading(true);
    try {
      if (onBreak) {
        await breakService.endBreak();
        toast.success('Break ended');
      } else {
        await breakService.startBreak('short');
        toast.success('Break started');
      }
      await load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Break action failed');
    } finally { setBreakLoading(false); }
  };

  const workday = useMemo(() => {
    const checkIn = attendance?.check_in ? new Date(attendance.check_in) : null;
    const checkOut = attendance?.check_out ? new Date(attendance.check_out) : null;
    // Anchor the shift day to the attendance record so a stale/previous-day
    // check-in still positions the marker correctly on today's timeline.
    const baseDay = checkIn || checkOut || now;
    const shiftStart = timeOnDate(FALLBACK_START, baseDay);
    let shiftEnd = timeOnDate(FALLBACK_END, baseDay);
    if (shiftEnd <= shiftStart) shiftEnd = new Date(shiftEnd.getTime() + 86400000);
    const stopAt = checkOut || now;
    const breakSeconds = (attendance?.break_minutes || 0) * 60
      + (activeBreak ? Math.max(0, (now.getTime() - new Date(activeBreak.break_start).getTime()) / 1000) : 0);
    const worked = checkIn ? Math.max(0, (stopAt.getTime() - checkIn.getTime()) / 1000 - breakSeconds) : 0;
    const expected = Math.max(0, (shiftEnd.getTime() - shiftStart.getTime()) / 1000);
    const remaining = Math.max(0, expected - worked);
    const timelinePoint = checkOut || (checkedIn ? now : shiftStart);
    const checkInPoint = checkIn || shiftStart;
    const startProgress = Math.min(100, Math.max(0, ((checkInPoint.getTime() - shiftStart.getTime()) / (shiftEnd.getTime() - shiftStart.getTime())) * 100));
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
    return { shiftStart, shiftEnd, worked, expected, remaining, progress, startProgress, ticks, breakSeconds };
  }, [attendance, activeBreak, checkedIn, now]);

  if (loading) return <PageLoader />;

  const status = onBreak ? 'On break' : checkedIn ? 'Working' : checkedOut ? 'Completed' : 'Not checked in';
  const statusTone = onBreak ? 'bg-purple-50 text-purple-700' : checkedIn ? 'bg-emerald-50 text-emerald-700' : checkedOut ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600';
  const statusDot = onBreak ? 'bg-purple-500' : checkedIn ? 'bg-emerald-500' : checkedOut ? 'bg-blue-500' : 'bg-gray-400';
  const onTrack = workday.remaining > 0 && checkedIn;

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 p-3 sm:p-4 lg:p-5">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex gap-4 border-b border-gray-200">
          <button onClick={() => setActiveTab('regular')} className={`pb-3 font-semibold transition outline-none ${activeTab === 'regular' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>Regular Workday</button>
          <button 
            onClick={() => setActiveTab('weekend')} 
            disabled={!(new Date().getDay() === 0 || new Date().getDay() === 6) && attendance?.work_mode !== 'weekend'}
            title={!(new Date().getDay() === 0 || new Date().getDay() === 6) && attendance?.work_mode !== 'weekend' ? "Only available on weekends" : ""}
            className={`pb-3 font-semibold transition outline-none ${activeTab === 'weekend' ? 'border-b-2 border-emerald-500 text-emerald-600' : ((new Date().getDay() === 0 || new Date().getDay() === 6) || attendance?.work_mode === 'weekend') ? 'text-gray-500 hover:text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}
          >
            Work On Weekend (WOD)
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-gray-900 sm:text-xl">Today's Attendance</h1>
              {checkedIn && <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Live</span>}
            </div>
            <p className="mt-1 text-sm text-gray-500">{format(now, 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${statusTone}`}>
            <span className={`h-2 w-2 rounded-full ${statusDot}`} />{status}
          </span>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-3 sm:gap-8">
          <WorkdayValue icon="in" tone="green" label="Check In" value={clock(attendance?.check_in)} note={attendance?.check_in ? 'Today' : 'Not checked in'} />
          <WorkdayValue icon="out" tone="red" label="Check Out" value={clock(attendance?.check_out)} note={attendance?.check_out ? 'Today' : 'Not Checked Out'} />
          <WorkdayValue icon="clock" tone="green" label="Total Working Time" value={duration(workday.worked)} note={attendance?.check_in ? `Since ${clock(attendance.check_in)}` : 'Starts after check in'} highlight />
        </div>

        <div className="mt-5">
          {!attendance?.check_in ? (
            <div className="flex justify-start">
              <button onClick={handleCheckIn} disabled={actionLoading} className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500 bg-white px-4 py-2 font-semibold text-emerald-600 transition  disabled:opacity-60">
                <Icon type="in" className="h-4 w-4" />{actionLoading ? 'Checking in…' : 'Check In'}
              </button>
            </div>
          ) : checkedIn ? (
            <div className="flex justify-start">
              {/* <button onClick={handleBreak} disabled={breakLoading} className={`flex items-center justify-center gap-2 rounded-lg border px-5 py-2.5 font-semibold transition disabled:opacity-60 ${onBreak ? 'border-purple-400 bg-purple-50 text-purple-700 ' : 'border-gray-300 bg-white text-gray-700 '}`}>
                <Icon type="coffee" className="h-5 w-5" />{breakLoading ? '…' : onBreak ? 'End Break' : 'Start Break'}
              </button> */}
              <button onClick={handleCheckOut} disabled={actionLoading || onBreak} className="flex items-center justify-center gap-2 rounded-lg border border-red-400 bg-white px-4 py-2 font-semibold text-red-600 transition  disabled:opacity-60">
                <Icon type="out" className="h-4 w-4" />{actionLoading ? 'Checking out…' : 'Check Out'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 font-semibold text-blue-700">
                <Icon type="clock" className="h-4 w-4" />Workday completed
              </div>
              <button onClick={handleCheckIn} disabled={actionLoading} className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500 bg-white px-4 py-2 font-semibold text-emerald-600 transition  disabled:opacity-60">
                <Icon type="in" className="h-4 w-4" />{actionLoading ? 'Resuming…' : 'Resume Work'}
              </button>
            </div>
          )}
        </div>
      </section>

      {activeTab === 'regular' && (
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900">Workday Timeline</h2>
          <Icon type="info" className="h-4 w-4 text-gray-400" />
        </div>
        <p className="mt-1 text-sm text-gray-500">Work hours: {format(workday.shiftStart, 'hh:mm a')} – {format(workday.shiftEnd, 'hh:mm a')}</p>
        <div className="mt-6 w-full px-2 sm:px-4">
          {/* Time labels row */}
          <div className="relative h-9">
            {workday.ticks.map((tick, index) => {
              const position = ((tick.getTime() - workday.shiftStart.getTime()) / (workday.shiftEnd.getTime() - workday.shiftStart.getTime())) * 100;
              const isFirst = index === 0;
              const isLast = index === workday.ticks.length - 1;
              const transform = isFirst ? 'translateX(0)' : isLast ? 'translateX(-100%)' : 'translateX(-50%)';
              const middleTick = Math.floor((workday.ticks.length - 1) / 2);
              const mobileVisibility = !isFirst && !isLast && index !== middleTick ? 'hidden sm:flex' : 'flex';
              return (
                <div
                  key={tick.toISOString()}
                  className={`absolute top-0 ${mobileVisibility} flex-col ${isLast ? 'items-end' : 'items-start'}`}
                  style={{ left: `${position}%`, transform }}
                >
                  <span className="whitespace-nowrap text-[11px] font-semibold text-gray-700 sm:text-xs">{format(tick, 'hh:mm a')}</span>
                  {isFirst && <span className="mt-0.5 text-[10px] font-medium text-gray-500 sm:text-xs">Start</span>}
                  {isLast && <span className="mt-0.5 text-[10px] font-medium text-gray-500 sm:text-xs">End</span>}
                </div>
              );
            })}
          </div>

          {/* Ticks + bar + endpoints + current marker (layered) */}
          <div className="relative mt-1" style={{ height: 40 }}>
            {/* Full-height vertical tick lines (behind the bar) */}
            {workday.ticks.map((tick) => {
              const position = ((tick.getTime() - workday.shiftStart.getTime()) / (workday.shiftEnd.getTime() - workday.shiftStart.getTime())) * 100;
              return (
                <div
                  key={tick.toISOString()}
                  style={{ position: 'absolute', top: 0, height: '50%', width: 1, background: '#e5e7eb', left: `${position}%` }}
                />
              );
            })}
            {/* Dashed baseline */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                borderTop: '2px dashed #d1d5db',
              }}
            />
            {/* Green progress bar */}
            <div
              style={{
                position: 'absolute',
                left: `${workday.startProgress}%`,
                top: '50%',
                height: 3,
                width: `${Math.max(0, workday.progress - workday.startProgress)}%`,
                transform: 'translateY(-50%)',
                background: '#16a34a',
                borderRadius: 9999,
              }}
            />
            {/* Endpoint dots */}
            <span
              style={{
                position: 'absolute',
                left: 0,
                top: '50%',
                height: 16,
                width: 16,
                transform: 'translate(-50%, -50%)',
                background: '#9ca3af',
                border: '2px solid #ffffff',
                borderRadius: 9999,
                boxShadow: '0 1px 2px rgba(0,0,0,.08)',
              }}
            />
            <span
              style={{
                position: 'absolute',
                right: 0,
                top: '50%',
                height: 16,
                width: 16,
                transform: 'translate(50%, -50%)',
                background: '#9ca3af',
                border: '2px solid #ffffff',
                borderRadius: 9999,
                boxShadow: '0 1px 2px rgba(0,0,0,.08)',
              }}
            />
            {/* Current-time pulse */}
            {(checkedIn || checkedOut) && (
              <span
                style={{
                  position: 'absolute',
                  left: `${workday.progress}%`,
                  top: '50%',
                  height: 20,
                  width: 20,
                  transform: 'translate(-50%, -50%)',
                  background: '#22c55e',
                  border: '3px solid #ffffff',
                  borderRadius: 9999,
                  boxShadow: '0 0 0 4px rgba(34,197,94,.2)',
                  zIndex: 10,
                }}
              />
            )}
          </div>

          {/* Tooltip row */}
          <div className="relative mt-3 h-14">
            {(checkedIn || checkedOut) && (
              <div
                className="absolute top-0 z-10 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-center shadow-md"
                style={{
                  left: `${workday.progress}%`,
                  transform: workday.progress > 88 ? 'translateX(-100%)' : workday.progress < 12 ? 'translateX(0)' : 'translateX(-50%)',
                }}
              >
                {/* Caret pointing up to the current-time dot */}
                <span
                  style={{
                    position: 'absolute',
                    top: -6,
                    left: workday.progress > 88 ? 'calc(100% - 16px)' : workday.progress < 12 ? 16 : '50%',
                    transform: 'translateX(-50%) rotate(45deg)',
                    width: 10,
                    height: 10,
                    background: '#ffffff',
                    borderTop: '1px solid #e5e7eb',
                    borderLeft: '1px solid #e5e7eb',
                  }}
                />
                <p className="text-xs font-bold text-green-700 sm:text-sm">{clock(attendance?.check_out || now.toISOString())}</p>
                <p className="text-[10px] text-gray-500 sm:text-xs">{checkedIn ? 'Current Time' : 'Check Out'}</p>
              </div>
            )}
          </div>

          {/* Legend */}
          <div
            className="mt-2 text-xs text-gray-600 sm:text-sm"
            style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: 40, rowGap: 8 }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-block', width: 32, height: 3, background: '#16a34a', borderRadius: 9999 }} />
              <span>Worked Time</span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-block', width: 32, borderTop: '2px dashed #9ca3af' }} />
              <span>Remaining Time</span>
            </div>
          </div>
        </div>
      </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon="clock" tone="green" label="Worked Time" value={duration(workday.worked)} note={checkedIn ? 'Live' : checkedOut ? 'Completed' : 'Today'} />
        {activeTab === 'regular' ? (
          <>
            <SummaryCard icon="calendar" tone="blue" label="Expected Work Time" value={duration(workday.expected, false)} note={`${format(workday.shiftStart, 'hh:mm a')} – ${format(workday.shiftEnd, 'hh:mm a')}`} />
            <SummaryCard icon="timer" tone="orange" label="Remaining Time" value={duration(workday.remaining)} note={`Until ${format(workday.shiftEnd, 'hh:mm a')}`} />
          </>
        ) : (
          <>
            <SummaryCard icon="calendar" tone="blue" label="Expected Work Time" value="Flexible" note="Weekend Work" />
            <SummaryCard icon="timer" tone="orange" label="Remaining Time" value="–" note="No strict limit" />
          </>
        )}
      </section>

      <section className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
          <Icon type="clock" className="h-4 w-4 text-gray-400" />
        </div>
        <div className="space-y-4">
          {!attendance?.check_in ? (
            <p className="text-sm text-gray-500">No activity yet today.</p>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Icon type="in" className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Checked In</p>
                  <p className="text-xs text-gray-500">{clock(attendance.check_in)}</p>
                </div>
              </div>
              {attendance?.check_out && (
                <div className="relative flex items-start gap-3 before:absolute before:-top-4 before:left-4 before:h-4 before:w-0.5 before:bg-gray-200">
                  <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
                    <Icon type="out" className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Checked Out</p>
                    <p className="text-xs text-gray-500">{clock(attendance.check_out)}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <div className={`flex items-center gap-3 rounded-xl border px-5 py-4 text-sm font-medium ${onTrack ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : checkedOut ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600'}`}>
        <span className="text-xl">💡</span>{onTrack ? 'You are on track! Keep up the great work.' : checkedOut ? 'Your workday is complete.' : 'Check in to start tracking your workday.'}
      </div>
    </div>
  );
}

const tones = { green: 'bg-emerald-50 text-emerald-600', red: 'bg-red-50 text-red-500', blue: 'bg-blue-50 text-blue-600', orange: 'bg-orange-50 text-orange-500', purple: 'bg-purple-50 text-purple-600' };

function WorkdayValue({ icon, tone, label, value, note, highlight = false }: { icon: 'in' | 'out' | 'clock'; tone: keyof typeof tones; label: string; value: string; note: string; highlight?: boolean }) {
  return <div className="flex min-w-0 items-start gap-3"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}><Icon type={icon} className="h-5 w-5" /></span><div className="min-w-0"><p className="text-xs font-medium text-gray-600 sm:text-sm">{label}</p><p className={`mt-0.5 truncate text-lg font-bold sm:text-xl ${highlight ? 'text-emerald-600' : 'text-gray-900'}`}>{value}</p><p className="mt-0.5 text-xs text-gray-500">{note}</p></div></div>;
}

function SummaryCard({ icon, tone, label, value, note }: { icon: IconType; tone: keyof typeof tones; label: string; value: string; note: string }) {
  const valueTone = tone === 'green' ? 'text-emerald-600' : 'text-gray-900';
  return <div className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}><Icon type={icon} className="h-5 w-5" /></span><div className="min-w-0"><p className="text-xs text-gray-600 sm:text-sm">{label}</p><p className={`mt-0.5 truncate text-lg font-bold ${valueTone}`}>{value}</p><p className="mt-0.5 truncate text-xs text-gray-500">{note}</p></div></div>;
}
