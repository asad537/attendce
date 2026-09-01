import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../services/api';
import { Resignation, resignationService } from '../../services/resignationService';
import Modal from '../../components/common/Modal';
import { PageLoader } from '../../components/common/LoadingSpinner';
import RichTextComposer from '../../components/common/RichTextComposer';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { plainText } from '../../lib/text';

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-200/60',
  approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  rejected: 'bg-rose-50 text-rose-600 border border-rose-200/60',
  withdrawn: 'bg-gray-100 text-gray-500 border border-gray-200/60',
};
const fmtDate = (d?: string | null) => (d ? format(parseISO(d), 'dd MMM yyyy') : '—');
const initials = (name = '') => name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[status] || 'bg-gray-100 text-gray-500'}`}>{status}</span>;
}

export default function ResignationPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isCeo = user?.role === 'ceo';
  const canReview = isCeo || user?.role === 'manager';

  const { data: items = [], isLoading } = useQuery({ queryKey: ['resignations'], queryFn: resignationService.list });
  const hasPending = items.some(r => r.user.id === user?.id && r.status === 'pending');
  const canSubmit = !isCeo && !hasPending;
  const stats = useMemo(() => ({
    total: items.length,
    pending: items.filter(r => r.status === 'pending').length,
    approved: items.filter(r => r.status === 'approved').length,
    rejected: items.filter(r => r.status === 'rejected').length,
  }), [items]);

  const [showModal, setShowModal] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [form, setForm] = useState({
    last_working_day: '',
    reason: '',
    drive_link: '',
    is_confidential: false,
    signature: ''
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['resignations'] });

  const resetForm = () => {
    setForm({ last_working_day: '', reason: '', drive_link: '', is_confidential: false, signature: '' });
    setAttachment(null);
  };

  const submit = useMutation({
    mutationFn: () => resignationService.submit({ last_working_day: form.last_working_day, reason: form.reason }),
    onSuccess: () => { toast.success('Resignation submitted'); resetForm(); setShowModal(false); invalidate(); },
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

  const STAT_CARDS = [
    { label: 'Total Requests', value: stats.total, color: 'text-gray-900', bg: 'bg-gray-50 text-gray-600', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    )},
    { label: 'Pending', value: stats.pending, color: 'text-amber-600', bg: 'bg-amber-50 text-amber-600', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    )},
    { label: 'Approved', value: stats.approved, color: 'text-emerald-600', bg: 'bg-emerald-50 text-emerald-600', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    )},
    { label: 'Rejected', value: stats.rejected, color: 'text-rose-500', bg: 'bg-rose-50 text-rose-500', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    )},
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 font-sans text-gray-900 w-full">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Resignation Management</h1>
          <p className="mt-0.5 text-sm text-gray-500"><span className="font-semibold text-emerald-600">Dashboard</span> &nbsp;/&nbsp; Resignation</p>
        </div>
        {canSubmit && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex h-10 items-center gap-2 self-start rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Submit Resignation
          </button>
        )}
      </header>

      {isLoading ? (
        <PageLoader />
      ) : (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {STAT_CARDS.map((card) => (
              <div key={card.label} className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm hover:shadow transition-shadow flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500">{card.label}</p>
                  <p className={`mt-1 text-2xl font-bold ${card.color}`}>{card.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${card.bg}`}>
                  {card.icon}
                </div>
              </div>
            ))}
          </div>

          {/* Main Card */}
          <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-base font-bold text-gray-900">{canReview ? 'Resignation Requests' : 'My Resignations'}</h2>
              <span className="text-xs font-semibold text-gray-500">{items.length} {items.length === 1 ? 'record' : 'records'}</span>
            </div>

            {!items.length ? (
              <div className="py-12 px-4 text-center max-w-sm mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h3 className="text-sm font-bold text-gray-800 mb-1">No Resignation Requests</h3>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">There are currently no resignation requests filed in the system.</p>
                {canSubmit && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    File Resignation
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-gray-50/80 text-xs font-semibold text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="px-5 py-3">Employee</th>
                      <th className="px-3 py-3">Last Working Day</th>
                      <th className="px-3 py-3">Reason</th>
                      <th className="px-3 py-3">Submitted</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map(r => {
                      const isOwn = r.user.id === user?.id;
                      const reviewable = canReview && !isOwn && r.status === 'pending';
                      return (
                        <tr key={r.id} className="align-top hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-[10px] font-bold text-white shadow-xs">{initials(r.user.name)}</span>
                              <span>
                                <b className="block text-xs font-bold text-gray-900 leading-tight">{r.user.name}{isOwn && <span className="ml-1 text-[10px] font-semibold text-emerald-600">(You)</span>}</b>
                                <small className="text-gray-400 text-[11px]">{r.user.employee_id || '—'} · {r.user.department || '—'}</small>
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3.5 font-medium text-xs text-gray-900">{fmtDate(r.last_working_day)}</td>
                          <td className="max-w-[280px] px-3 py-3.5 text-xs text-gray-600">
                            <div className="max-w-none text-xs text-gray-600 line-clamp-3 whitespace-pre-wrap">{plainText(r.reason)}</div>
                            {r.remarks && <p className="mt-1 text-[11px] text-gray-400"><b>Remarks:</b> {r.remarks}{r.reviewer ? ` — ${r.reviewer}` : ''}</p>}
                          </td>
                          <td className="px-3 py-3.5 text-xs text-gray-500">{fmtDate(r.created_at)}</td>
                          <td className="px-3 py-3.5"><StatusBadge status={r.status} /></td>
                          <td className="px-5 py-3.5 text-right">
                            {reviewable ? (
                              <div className="inline-flex gap-1.5">
                                <button onClick={() => onReview(r, 'approve')} disabled={review.isPending} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">Approve</button>
                                <button onClick={() => onReview(r, 'reject')} disabled={review.isPending} className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-50 transition-colors">Reject</button>
                              </div>
                            ) : (isOwn && r.status === 'pending') ? (
                              <button onClick={() => withdraw.mutate(r.id)} disabled={withdraw.isPending} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Withdraw</button>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Submit Resignation" size="xl">
        <div className="space-y-4 pt-1">
          <label className="block text-xs font-semibold text-gray-700">Last Working Day
            <input type="date" value={form.last_working_day} onChange={e => setForm({ ...form, last_working_day: e.target.value })} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
          </label>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Reason / Details</label>
            <ErrorBoundary>
              <RichTextComposer
                value={form.reason}
                onChange={(val) => setForm(f => ({ ...f, reason: val }))}
                onAttachmentChange={setAttachment}
                driveLink={form.drive_link}
                onDriveLinkChange={(val) => setForm(f => ({ ...f, drive_link: val }))}
                isConfidential={form.is_confidential}
                onConfidentialChange={(val) => setForm(f => ({ ...f, is_confidential: val }))}
                signature={form.signature}
                onSignatureChange={(val) => setForm(f => ({ ...f, signature: val }))}
              />
            </ErrorBoundary>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setShowModal(false)} className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => submit.mutate()} disabled={!form.last_working_day || !form.reason.replace(/<[^>]*>/g, '').trim() || submit.isPending} className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{submit.isPending ? 'Submitting…' : 'Submit'}</button>
        </div>
      </Modal>
    </div>
  );
}
