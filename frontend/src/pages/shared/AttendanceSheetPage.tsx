import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { reportService, SheetCell } from '../../services/reportService';
import { getErrorMessage } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { PageLoader } from '../../components/common/LoadingSpinner';

const CODE_STYLE: Record<string, string> = {
  P: 'bg-emerald-100 text-emerald-700',
  A: 'bg-red-100 text-red-600',
  L: 'bg-amber-100 text-amber-700',
  W: 'bg-blue-100 text-blue-700',
  H: 'bg-purple-100 text-purple-700',
  WE: 'bg-gray-100 text-gray-300',
  WOD: 'bg-indigo-100 text-indigo-700',
  '': 'text-gray-300',
};
const LEGEND: [string, string][] = [
  ['P', 'Present'], ['A', 'Absent'], ['L', 'Leave'], ['W', 'Work from home'], ['H', 'Holiday'], ['WE', 'Weekend'], ['WOD', 'Weekend Work'],
];
const STATUS_OPTIONS: { status: 'present' | 'late' | 'on_leave' | 'absent' | 'work_from_home' | 'holiday'; label: string }[] = [
  { status: 'present', label: 'Present' },
  { status: 'late', label: 'Late' },
  { status: 'on_leave', label: 'Leave' },
  { status: 'work_from_home', label: 'Work from home' },
  { status: 'absent', label: 'Absent' },
  { status: 'holiday', label: 'Holiday' },
];
const cellText = (c: SheetCell) => (c.code === 'WE' ? '·' : c.code === '' ? '' : c.code);

export default function AttendanceSheetPage() {
  const { user } = useAuth();
  const { money } = useSettings();
  const queryClient = useQueryClient();
  const canEdit = ['ceo', 'manager'].includes(user?.role || '');

  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const { data, isLoading } = useQuery({ queryKey: ['attendance-sheet', month], queryFn: () => reportService.getAttendanceSheet(month) });
  const monthLabel = useMemo(() => format(new Date(`${month}-01T00:00:00`), 'MMMM yyyy'), [month]);

  const [editing, setEditing] = useState<{ userId: number; day: number; x: number; y: number } | null>(null);
  const setCell = useMutation({
    mutationFn: reportService.updateSheetCell,
    onSuccess: () => { setEditing(null); queryClient.invalidateQueries({ queryKey: ['attendance-sheet', month] }); },
    onError: e => toast.error(getErrorMessage(e)),
  });
  const dateFor = (day: number) => `${month}-${String(day).padStart(2, '0')}`;

  const exportCsv = () => {
    if (!data) return;
    const head = ['Name', 'Employee ID', 'Department', ...data.day_meta.map(d => String(d.day)), 'Present', 'Absent', 'Leave', 'WFH', 'Late', 'Salary'];
    const lines = data.rows.map(r => [
      r.user.name, r.user.employee_id || '', r.user.department || '',
      ...r.days.map(c => c.code || '-'),
      r.totals.present, r.totals.absent, r.totals.leave, r.totals.wfh, r.totals.late, r.salary,
    ]);
    const csv = [head, ...lines].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url; a.download = `attendance-sheet-${month}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return <div className="min-h-full bg-[#f7f9f8] p-4 text-[#17251f] sm:p-6 lg:p-8"><div className="mx-auto max-w-[1560px]">
    <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-[26px] font-bold tracking-[-.03em]">Attendance Sheet</h1>
        <p className="mt-1 text-sm text-gray-500">Attendance Sheet · {monthLabel}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <label className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4">
          <span className="text-xs font-semibold text-gray-500">Month</span>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="bg-transparent text-sm font-semibold outline-none" />
        </label>
        <button onClick={exportCsv} disabled={!data} className="h-11 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white  disabled:opacity-50">Export CSV</button>
        <button onClick={() => window.print()} disabled={!data} className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Print / PDF</button>
      </div>
    </header>

    <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-gray-600 print:mb-2">
      {LEGEND.map(([code, label]) => <span key={code} className="flex items-center gap-1.5">
        <span className={`grid h-5 min-w-[20px] place-items-center rounded px-1 text-[10px] font-bold ${CODE_STYLE[code]}`}>{code === 'WE' ? '·' : code}</span>{label}
      </span>)}
      {canEdit && <span className="ml-auto text-[11px] font-medium text-emerald-600 print:hidden">Tip: click any day cell to change it.</span>}
    </div>

    {isLoading || !data ? <PageLoader /> : !data.rows.length ? <p className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-500">No employees to show.</p> :
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
      <table className="w-full border-collapse text-center text-[11px]">
        <thead>
          <tr className="bg-[#fafbfa] text-gray-500">
            <th className="sticky left-0 z-10 min-w-[180px] border-b border-gray-100 bg-[#fafbfa] px-4 py-3 text-left text-xs">Employee</th>
            {data.day_meta.map(d => <th key={d.day} className={`w-8 border-b border-gray-100 px-0 py-2 font-semibold ${d.is_holiday ? 'bg-purple-50 text-purple-500' : d.is_weekend ? 'bg-gray-50 text-gray-400' : ''}`} title={d.holiday || ''}>
              <div className="leading-none">{d.day}</div><div className="text-[9px] font-normal text-gray-400">{d.weekday}</div>
            </th>)}
            {['P', 'A', 'L', 'W'].map(t => <th key={t} className="w-9 border-b border-l border-gray-100 px-0 py-3 font-bold">{t}</th>)}
            <th className="min-w-[90px] border-b border-l border-gray-100 px-3 py-3 text-right font-bold">Salary</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.rows.map(r => <tr key={r.user.id} className="hover:bg-[#fbfdfc]">
            <td className="sticky left-0 z-10 border-r border-gray-50 bg-white px-4 py-2 text-left">
              <b className="block text-[12px] leading-tight text-[#1f2c28]">{r.user.name}</b>
              <small className="text-gray-400">{r.user.employee_id || '—'} · {r.user.department || '—'}</small>
            </td>
            {r.days.map(c => {
              const clickable = canEdit && c.code !== 'WE' && c.code !== 'H';
              return <td key={c.day} className="px-0 py-1.5">
                <span
                  onClick={e => { if (clickable) { const rect = e.currentTarget.getBoundingClientRect(); setEditing({ userId: r.user.id, day: c.day, x: rect.left, y: rect.bottom }); } }}
                  className={`relative mx-auto grid h-6 min-w-[24px] w-fit place-items-center rounded px-1 text-[10px] font-bold ${CODE_STYLE[c.code]} ${clickable ? 'cursor-pointer hover:ring-2 hover:ring-emerald-300' : ''}`}>
                  {cellText(c)}{c.late && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" title="Late" />}
                </span>
              </td>;
            })}
            <td className="border-l border-gray-100 font-bold text-emerald-600">{r.totals.present}</td>
            <td className="font-bold text-red-500">{r.totals.absent}</td>
            <td className="font-bold text-amber-600">{r.totals.leave}</td>
            <td className="font-bold text-blue-600">{r.totals.wfh}</td>
            <td className="border-l border-gray-100 px-3 text-right font-bold text-[#1f2c28]">{r.salary ? money(r.salary) : '—'}</td>
          </tr>)}
        </tbody>
      </table>
    </div>}

    {editing && <>
      <div className="fixed inset-0 z-40" onClick={() => setEditing(null)} />
      <div style={{ position: 'fixed', left: editing.x, top: editing.y + 4 }} className="z-50 w-28 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 text-left text-xs shadow-xl">
        {STATUS_OPTIONS.map(o => (
          <button key={o.status} disabled={setCell.isPending}
            onClick={() => setCell.mutate({ user_id: editing.userId, date: dateFor(editing.day), status: o.status })}
            className="block w-full px-3 py-1.5 text-left hover:bg-gray-50 disabled:opacity-50">{o.label}</button>
        ))}
      </div>
    </>}
  </div></div>;
}
