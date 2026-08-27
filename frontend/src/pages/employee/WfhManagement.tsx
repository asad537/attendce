import { useAuth } from '../../contexts/AuthContext';
import React, { useEffect, useState } from 'react';
import { wfhService } from '../../services/wfhService';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { PageLoader } from '../../components/common/LoadingSpinner';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../services/api';
import { PaginatedResponse } from '../../types';
import RichTextComposer from '../../components/common/RichTextComposer';

export default function WfhManagement() {
  const { user } = useAuth();
  const [data, setData] = useState<PaginatedResponse<any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setModal] = useState(false);
  const [submitting, setSubmit] = useState(false);

  const [form, setForm] = useState({
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

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const res = await wfhService.getList({ page, per_page: 20, user_id: user?.id });
      setData(res);
    } catch {
      toast.error('Failed to load WFM requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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

      await wfhService.request(fd); // Assuming wfhService supports FormData for attachments now
      toast.success('WFM request submitted!');
      setModal(false);
      setForm({ start_date: '', end_date: '', is_half_day: false, half_day_period: 'morning', reason: '', drive_link: '', is_confidential: false, signature: '' });
      setAttachment(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmit(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Cancel this WFM request?')) return;
    try {
      await wfhService.cancel(id);
      toast.success('WFM cancelled');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading && !data) return <PageLoader />;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Work From Home</h1>
        <button onClick={() => setModal(true)} className="btn-primary">+ Request WFM</button>
      </div>

      <div className="card p-0">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">WFM History</h2>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Period</th><th>Duration</th><th>Reason</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {data?.data.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">No WFM requests yet</td></tr>
              ) : data?.data.map((r: any) => (
                <tr key={r.id}>
                  <td>
                    {format(parseISO(r.start_date), 'MMM d')}
                    {r.start_date !== r.end_date && ` – ${format(parseISO(r.end_date), 'MMM d, yyyy')}`}
                    {r.start_date === r.end_date && `, ${format(parseISO(r.start_date), 'yyyy')}`}
                    {r.is_confidential && <span className="text-xs ml-2 text-red-500">🔒</span>}
                  </td>
                  <td>
                    {r.is_half_day ? (
                      <span className="badge-gray">Half Day ({r.half_day_period})</span>
                    ) : (
                      <span className="badge-indigo">Full Day</span>
                    )}
                  </td>
                  <td className="max-w-xs truncate text-gray-500">
                    <div dangerouslySetInnerHTML={{ __html: r.reason }} />
                    {r.attachment && <a href={`/api/wfh/${r.id}/attachment`} target="_blank" className="text-xs text-indigo-600 block mt-1">📎 Attachment</a>}
                  </td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>
                    {r.status === 'pending' && (
                      <button onClick={() => handleCancel(r.id)} className="btn-secondary btn-sm text-red-600">Cancel</button>
                    )}
                    {r.remarks && <p className="text-xs text-gray-400 mt-1">Reviewer: {r.remarks}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showModal} onClose={() => setModal(false)} title="Request Work From Home" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <label className="label">Reason</label>
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
