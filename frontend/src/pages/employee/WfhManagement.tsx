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

export default function WfhManagement() {
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
  });

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
      await wfhService.request(form);
      toast.success('WFM request submitted!');
      setModal(false);
      setForm({ start_date: '', end_date: '', is_half_day: false, half_day_period: 'morning', reason: '' });
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
                  </td>
                  <td>
                    {r.is_half_day ? (
                      <span className="badge-gray">Half Day ({r.half_day_period})</span>
                    ) : (
                      <span className="badge-indigo">Full Day</span>
                    )}
                  </td>
                  <td className="max-w-xs truncate text-gray-500">{r.reason}</td>
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
          <div className="grid grid-cols-2 gap-4">
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
            <textarea className="input resize-none" rows={3} value={form.reason}
              onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Why do you need to work from home?" required minLength={10} />
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
