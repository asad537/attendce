import React, { useEffect, useState } from 'react';
import { wfhService } from '../../services/wfhService';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { PageLoader } from '../../components/common/LoadingSpinner';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../services/api';

export default function WfhApprovals() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<{ wfh: any; action: 'approve' | 'reject' } | null>(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmit] = useState(false);

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const res = await wfhService.getList({ page, per_page: 20, status: 'pending' });
      setData(res);
    } catch {
      toast.error('Failed to load WFM requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!review) return;
    setSubmit(true);
    try {
      await wfhService.review(review.wfh.id, { action: review.action, remarks });
      toast.success(`WFM request ${review.action}d!`);
      setReview(null);
      setRemarks('');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmit(false);
    }
  };

  if (loading && !data) return <PageLoader />;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">WFM Approvals</h1>
      </div>

      <div className="card p-0">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Pending Requests</h2>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Employee</th><th>Period</th><th>Duration</th><th>Reason</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {data?.data.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">No pending WFM requests</td></tr>
              ) : data?.data.map((r: any) => (
                <tr key={r.id}>
                  <td>
                    <div className="font-medium text-gray-900 text-sm">{r.user?.name}</div>
                    <div className="text-xs text-gray-400">{r.user?.employee_id}</div>
                  </td>
                  <td>
                    {format(parseISO(r.start_date), 'MMM d')}
                    {r.start_date !== r.end_date && ` – ${format(parseISO(r.end_date), 'MMM d, yyyy')}`}
                  </td>
                  <td>
                    {r.is_half_day ? (
                      <span className="badge-gray">Half Day ({r.half_day_period})</span>
                    ) : (
                      <span className="badge-indigo">Full Day</span>
                    )}
                  </td>
                  <td className="max-w-xs truncate text-gray-500">{r.reason}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setReview({ wfh: r, action: 'approve' })}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setReview({ wfh: r, action: 'reject' })}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!review}
        onClose={() => setReview(null)}
        title={review?.action === 'approve' ? '✓ Approve WFM' : '✗ Reject WFM'}
        size="md"
      >
        {review && (
          <form onSubmit={handleReview} className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Employee</span>
                <span className="font-medium text-gray-900">{review.wfh.user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Duration</span>
                <span className="font-medium text-gray-900">
                  {review.wfh.is_half_day ? `Half Day (${review.wfh.half_day_period})` : 'Full Day'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Reason</span>
                <span className="text-gray-700 text-right max-w-[200px]">{review.wfh.reason}</span>
              </div>
            </div>

            <div>
              <label className="label">
                Remarks{review.action === 'reject' && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <textarea
                className="input resize-none"
                rows={3}
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder={
                  review.action === 'approve'
                    ? 'Optional remarks for the employee…'
                    : 'Please provide a reason for rejection…'
                }
                required={review.action === 'reject'}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setReview(null)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                type="submit"
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  review.action === 'approve'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
                disabled={submitting}
              >
                {submitting
                  ? 'Processing…'
                  : review.action === 'approve'
                  ? 'Confirm Approval'
                  : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
