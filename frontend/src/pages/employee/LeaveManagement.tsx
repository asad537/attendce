import { useAuth } from '../../contexts/AuthContext';
import React, { useEffect, useState } from 'react';
import { leaveService } from '../../services/leaveService';
import api from '../../services/api';
import { Leave, LeaveBalance, LeaveType, PaginatedResponse } from '../../types';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { PageLoader } from '../../components/common/LoadingSpinner';
import { format, differenceInBusinessDays, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../services/api';
import RichTextComposer from '../../components/common/RichTextComposer';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { plainText } from '../../lib/text';

export default function LeaveManagement() {
  const { user } = useAuth();
  const [data, setData]         = useState<PaginatedResponse<Leave> | null>(null);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setModal]   = useState(false);
  const [submitting, setSubmit] = useState(false);

  // Form state
  const [form, setForm] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    is_half_day: false,
    half_day_period: 'morning',
    reason: '',
    drive_link: '',
    is_confidential: false,
    signature: '',
  });
  const [attachment, setAttachment] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [leaveRes, balRes, typesRes] = await Promise.all([
        leaveService.getList({ per_page: 20, user_id: user?.id }),
        leaveService.getBalances(),
        api.get('/leave-types').catch(() => ({ data: { leave_types: [] } })),
      ]);
      setData(leaveRes);
      setBalances(balRes.balances.filter((b: any) => !['Annual Leave', 'Paternity Leave', 'Maternity Leave', 'Casual Leave'].includes(b.leave_type?.name || '')));
      setLeaveTypes((typesRes as any).data?.leave_types || []);
    } catch { toast.error('Failed to load leaves'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load().then(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmit(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && v !== undefined) {
          fd.append(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
        }
      });
      if (attachment) {
        fd.append('attachment', attachment);
      }

      await leaveService.request(fd);
      toast.success('Leave request submitted!');
      setModal(false);
      setForm({ leave_type_id: '', start_date: '', end_date: '', is_half_day: false, half_day_period: 'morning', reason: '', drive_link: '', is_confidential: false, signature: '' });
      setAttachment(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally { setSubmit(false); }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Cancel this leave request?')) return;
    try {
      await leaveService.cancel(id);
      toast.success('Leave cancelled');
      load();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">My Leaves</h1>
        <button onClick={() => setModal(true)} className="btn-primary">+ Request Leave</button>
      </div>

      {balances.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {balances.slice(0, 4).map((b) => (
            <div key={b.id} className="card py-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">{b.remaining}</div>
              <div className="text-xs text-gray-500 mt-1">{b.leave_type?.name}</div>
              <div className="text-xs text-gray-400">{b.used} used of {b.allocated}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card p-0">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Leave History</h2>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Type</th><th>Period</th><th>Days</th><th>Reason</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {data?.data.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No leave requests yet</td></tr>
              ) : data?.data.map((l) => (
                <tr key={l.id}>
                  <td>
                    <span className="font-medium" style={{ color: l.leave_type?.color }}>
                      {l.leave_type?.name}
                    </span>
                    {l.is_half_day && <span className="badge-gray ml-2">Half Day</span>}
                    {l.is_confidential && <span className="text-xs ml-2 text-red-500">🔒</span>}
                  </td>
                  <td>{format(parseISO(l.start_date), 'MMM d')} – {format(parseISO(l.end_date), 'MMM d, yyyy')}</td>
                  <td>{l.days_requested}</td>
                  <td className="max-w-xs truncate text-gray-500">
                    <div className="whitespace-pre-wrap">{plainText(l.reason)}</div>
                    {l.attachment && <a href={`/api/leaves/${l.id}/attachment`} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 block mt-1">📎 Attachment</a>}
                  </td>
                  <td><StatusBadge status={l.status} /></td>
                  <td>
                    {l.can_be_cancelled && (
                      <button onClick={() => handleCancel(l.id)} className="btn-secondary btn-sm text-red-600 hover:text-red-700">Cancel</button>
                    )}
                    {l.manager_remarks && <p className="text-xs text-gray-400 mt-1">Manager: {l.manager_remarks}</p>}
                    {l.ceo_remarks && <p className="text-xs text-gray-400">CEO: {l.ceo_remarks}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showModal} onClose={() => setModal(false)} title="Request Leave" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Leave Type</label>
            <select
              className="input"
              value={form.leave_type_id}
              onChange={(e) => setForm(f => ({ ...f, leave_type_id: e.target.value }))}
              required
            >
              <option value="">Select type…</option>
              {balances.map((b) => (
                <option key={b.id} value={b.leave_type?.id || ''}>
                  {b.leave_type?.name} ({b.remaining} days remaining)
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" value={form.start_date} min={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))} required />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input" value={form.end_date} min={form.start_date}
                onChange={(e) => setForm(f => ({ ...f, end_date: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label className="label text-sm font-medium text-gray-700">Leave Duration</label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="radio" name="duration" checked={!form.is_half_day}
                  onChange={() => setForm(f => ({ ...f, is_half_day: false }))} className="text-indigo-600 focus:ring-indigo-500" />
                Full Day
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="radio" name="duration" checked={form.is_half_day}
                  onChange={() => setForm(f => ({ ...f, is_half_day: true }))} className="text-indigo-600 focus:ring-indigo-500" />
                Half Day
              </label>
            </div>
            {form.is_half_day && (
              <div className="mt-3">
                <select className="input text-sm" value={form.half_day_period}
                  onChange={(e) => setForm(f => ({ ...f, half_day_period: e.target.value }))}>
                  <option value="morning">Morning (First Half)</option>
                  <option value="afternoon">Afternoon (Second Half)</option>
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="label">Reason / Details</label>
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
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
