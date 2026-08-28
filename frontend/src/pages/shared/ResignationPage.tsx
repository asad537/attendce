import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../services/api';
import { Resignation, resignationService } from '../../services/resignationService';
import Modal from '../../components/common/Modal';
import { PageLoader } from '../../components/common/LoadingSpinner';

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-600',
  withdrawn: 'bg-gray-100 text-gray-500',
};
const fmtDate = (d?: string | null) => (d ? format(parseISO(d), 'dd MMM yyyy') : '—');
const initials = (name = '') => name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

function StatusBadge({ status }: { status: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${STATUS_STYLE[status] || 'bg-gray-100 text-gray-500'}`}>{status}</span>;
}

export default function ResignationPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canReview = user?.role === 'ceo' || user?.role === 'manager';

  const { data: items = [], isLoading } = useQuery({ queryKey: ['resignations'], queryFn: resignationService.list });
  const hasPending = items.some(r => r.user.id === user?.id && r.status === 'pending');
  const stats = useMemo(() => ({
    total: items.length,
    pending: items.filter(r => r.status === 'pending').length,
    approved: items.filter(r => r.status === 'approved').length,
    rejected: items.filter(r => r.status === 'rejected').length,
  }), [items]);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ last_working_day: '', reason: '' });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['resignations'] });

  const submit = useMutation({
    mutationFn: () => resignationService.submit(form),
    onSuccess: () => { toast.success('Resignation submitted'); setForm({ last_working_day: '', reason: '' }); setShowModal(false); invalidate(); },
    onError: e => toast.error(getErrorMessage(e)),
  });
  const review = useMutation({
    mutationFn: ({ id, action, remarks }: { id: number; action: 'approve' | 'reject'; remarks?: string }) => resignationService.review(id, action, remarks),
    onSuccess: () => { toast.success('Resignation updated'); invalidate(); },
    onError: e => toast.error(getErrorMessage(e)),
  });
  const withdraw = useMutation({
    mutationFn: (id: number) => resignationService.withdraw(id),
    onSuccess: () => { toast.success('Resignation withdrawn'); invalidate(); },
    onError: e => toast.error(getErrorMessage(e)),
  });

  const onReview = (r: Resignation, action: 'approve' | 'reject') => {
    const remarks = window.prompt(`${action === 'approve' ? 'Approve' : 'Reject'} ${r.user.name}'s resignation — remarks (optional):`) ?? undefined;
    review.mutate({ id: r.id, action, remarks });
  };

  const STAT_CARDS: [string, number, string][] = [
    ['Total', stats.total, 'text-gray-900'],
    ['Pending', stats.pending, 'text-amber-600'],
    ['Approved', stats.approved, 'text-emerald-600'],
    ['Rejected', stats.rejected, 'text-red-500'],
  ];

  return <div className="min-h-full bg-[#f7f9f8] p-4 text-[#17251f] sm:p-6 lg:p-8"><div className="mx-auto max-w-[1200px]">
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-[26px] font-bold tracking-[-.03em]">Resignation</h1>
        <p className="mt-1 text-sm text-gray-500"><span className="font-semibold text-emerald-600">Dashboard</span> &nbsp;/&nbsp; Resignation</p>
      </div>
      {!hasPending && <button onClick={() => setShowModal(true)} className="inline-flex h-11 items-center gap-2 self-start rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
        Submit Resignation
      </button>}
    </header>

    {isLoading ? <PageLoader /> : <>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STAT_CARDS.map(([label, value, color]) => <div key={label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">{label}</p>
          <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
        </div>)}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-bold">{canReview ? 'Resignation Requests' : 'My Resignations'}</h2>
        </div>
        {!items.length ? <p className="p-12 text-center text-sm text-gray-400">No resignations yet.{!hasPending && ' Use “Submit Resignation” to file one.'}</p> :
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#fafbfa] text-xs text-gray-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Employee</th>
                <th className="px-3 py-3 font-semibold">Last Working Day</th>
                <th className="px-3 py-3 font-semibold">Reason</th>
                <th className="px-3 py-3 font-semibold">Submitted</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(r => {
                const isOwn = r.user.id === user?.id;
                const reviewable = canReview && !isOwn && r.status === 'pending';
                return <tr key={r.id} className="align-top hover:bg-[#fbfdfc]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-[10px] font-bold text-white">{initials(r.user.name)}</span>
                      <span>
                        <b className="block text-[13px] leading-tight">{r.user.name}{isOwn && <span className="ml-1 text-[10px] font-semibold text-emerald-600">(You)</span>}</b>
                        <small className="text-gray-400">{r.user.employee_id || '—'} · {r.user.department || '—'}</small>
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-semibold">{fmtDate(r.last_working_day)}</td>
                  <td className="max-w-[240px] px-3 py-3 text-gray-600"><p className="line-clamp-2" title={r.reason}>{r.reason}</p>{r.remarks && <p className="mt-1 text-[11px] text-gray-400"><b>Remarks:</b> {r.remarks}{r.reviewer ? ` — ${r.reviewer}` : ''}</p>}</td>
                  <td className="px-3 py-3 text-gray-500">{fmtDate(r.created_at)}</td>
                  <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-5 py-3 text-right">
                    {reviewable ? <div className="inline-flex gap-2">
                      <button onClick={() => onReview(r, 'approve')} disabled={review.isPending} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Approve</button>
                      <button onClick={() => onReview(r, 'reject')} disabled={review.isPending} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50">Reject</button>
                    </div> : (isOwn && r.status === 'pending') ? <button onClick={() => withdraw.mutate(r.id)} disabled={withdraw.isPending} className="text-xs font-semibold text-red-500 hover:text-red-700">Withdraw</button>
                    : <span className="text-xs text-gray-300">—</span>}
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>}
      </div>
    </>}

    <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Submit Resignation">
      <div className="space-y-4">
        <label className="block text-sm font-semibold text-gray-600">Last working day
          <input type="date" value={form.last_working_day} onChange={e => setForm({ ...form, last_working_day: e.target.value })} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
        </label>
        <label className="block text-sm font-semibold text-gray-600">Reason
          <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={4} placeholder="Reason for resignation…" className="mt-1 w-full resize-none rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
        </label>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={() => setShowModal(false)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
        <button onClick={() => submit.mutate()} disabled={!form.last_working_day || !form.reason.trim() || submit.isPending} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{submit.isPending ? 'Submitting…' : 'Submit'}</button>
      </div>
    </Modal>
  </div></div>;
}
