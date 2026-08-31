import React, { useCallback, useEffect, useState } from 'react';
import { leaveService } from '../../services/leaveService';
import { Leave, PaginatedResponse } from '../../types';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { PageLoader } from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../services/api';
import { format, parseISO } from 'date-fns';

type FilterStatus = '' | 'pending' | 'manager_approved' | 'manager_rejected' | 'approved' | 'rejected';
const plainReason = (value = '') => { const element = document.createElement('div'); element.innerHTML = value; return (element.textContent || element.innerText || '').replace(/\s+/g, ' ').trim(); };

interface ReviewState {
  leave: Leave;
  action: 'approve' | 'reject';
}

export default function ManagerLeaveApprovals() {
  const [data, setData]         = useState<PaginatedResponse<Leave> | null>(null);
  const [loading, setLoading]   = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('');
  const [filterYear, setFilterYear]     = useState(String(new Date().getFullYear()));
  const [review, setReview]     = useState<ReviewState | null>(null);
  const [remarks, setRemarks]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage]         = useState(1);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page: p, per_page: 15 };
      if (filterStatus) params.status = filterStatus;
      if (filterYear)   params.year   = filterYear;
      const res = await leaveService.getList(params);
      setData(res);
      setPage(p);
    } catch {
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterYear]);

  useEffect(() => { load(1); }, [load]);

  const openReview = (leave: Leave, action: 'approve' | 'reject') => {
    setReview({ leave, action });
    setRemarks('');
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!review) return;
    setSubmitting(true);
    try {
      await leaveService.managerReview(review.leave.id, review.action, remarks || undefined);
      toast.success(`Leave ${review.action}d successfully.`);
      setReview(null);
      load(page);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadgeColor: Record<string, string> = {
    pending:           'bg-amber-100 text-amber-700',
    manager_approved:  'bg-blue-100 text-blue-700',
    manager_rejected:  'bg-orange-100 text-orange-700',
    approved:          'bg-emerald-100 text-emerald-700',
    rejected:          'bg-red-100 text-red-700',
    cancelled:         'bg-gray-100 text-gray-500',
  };

  const statusLabel: Record<string, string> = {
    pending:           'Pending',
    manager_approved:  'Manager Approved',
    manager_rejected:  'Mgr Rejected',
    approved:          'Approved',
    rejected:          'Rejected',
    cancelled:         'Cancelled',
  };

  const canReview = (l: Leave) =>
    ['pending', 'manager_approved', 'manager_rejected'].includes(l.status);

  const years = [String(new Date().getFullYear()), String(new Date().getFullYear() - 1)];

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Leave Approvals</h1>
        <p className="text-sm text-gray-500 mt-0.5">Review and approve employee leave requests</p>
      </div>

      {/* Summary chips */}
      {data && (
        <div className="flex flex-wrap gap-3">
          {(['', 'pending', 'manager_approved', 'approved', 'rejected'] as FilterStatus[]).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === '' ? 'All' : statusLabel[s]}
            </button>
          ))}
          <select
            className="input ml-auto w-28 text-sm"
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      {/* Table */}
      {loading ? <PageLoader /> : (
        <div className="card p-0">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Period</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Manager</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!data?.data.length ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-gray-400">
                      No leave requests found.
                    </td>
                  </tr>
                ) : data.data.map(l => (
                  <tr key={l.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        {l.user?.avatar_url ? (
                          <img src={l.user?.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm shrink-0">
                            {l.user?.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 text-sm leading-tight">{l.user?.name}</p>
                          <p className="text-xs text-gray-400">{l.user?.employee_id}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className="text-sm font-medium"
                        style={{ color: l.leave_type?.color || '#6366f1' }}
                      >
                        {l.leave_type?.name || '—'}
                      </span>
                      {l.is_half_day && (
                        <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                          Half day
                        </span>
                      )}
                    </td>
                    <td className="text-sm text-gray-600 whitespace-nowrap">
                      {format(parseISO(l.start_date), 'MMM d')}
                      {l.start_date !== l.end_date && ` – ${format(parseISO(l.end_date), 'MMM d, yyyy')}`}
                      {l.start_date === l.end_date && `, ${format(parseISO(l.start_date), 'yyyy')}`}
                    </td>
                    <td className="text-sm text-gray-700 font-medium">{l.days_requested}d</td>
                    <td className="max-w-[180px]">
                      <p className="text-sm text-gray-500 truncate">{plainReason(l.reason)}</p>
                    </td>
                    <td>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeColor[l.status] || ''}`}>
                        {statusLabel[l.status] || l.status}
                      </span>
                    </td>
                    <td className="text-sm text-gray-500">
                      {l.reviewed_by_manager ? (
                        <div>
                          <p className="text-xs text-gray-700">{l.reviewed_by_manager.name}</p>
                          {l.manager_remarks && (
                            <p className="text-xs text-gray-400 truncate max-w-[120px]">{l.manager_remarks}</p>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="text-right">
                      {canReview(l) ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openReview(l, 'approve')}
                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openReview(l, 'reject')}
                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {l.manager_reviewed_at
                            ? format(parseISO(l.manager_reviewed_at), 'MMM d')
                            : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.meta.last_page > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
              <span>{data.meta.total} requests total</span>
              <div className="flex gap-1">
                {Array.from({ length: data.meta.last_page }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => load(p)}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      p === data.meta.current_page
                        ? 'bg-emerald-600 text-white'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      <Modal
        open={!!review}
        onClose={() => setReview(null)}
        title={review?.action === 'approve' ? '✓ Approve Leave' : '✗ Reject Leave'}
        size="md"
      >
        {review && (
          <form onSubmit={handleReview} className="space-y-4">
            {/* Summary card */}
            <div className="p-4 bg-gray-50 rounded-xl space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Employee</span>
                <span className="font-medium text-gray-900">{review.leave.user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Leave Type</span>
                <span className="font-medium" style={{ color: review.leave.leave_type?.color }}>
                  {review.leave.leave_type?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Period</span>
                <span className="font-medium text-gray-900">
                  {format(parseISO(review.leave.start_date), 'MMM d')}
                  {review.leave.start_date !== review.leave.end_date &&
                    ` – ${format(parseISO(review.leave.end_date), 'MMM d, yyyy')}`}
                  {' '}({review.leave.days_requested}d)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Reason</span>
                <span className="text-gray-700 text-right max-w-[200px]">{plainReason(review.leave.reason)}</span>
              </div>
            </div>

            {/* Remarks */}
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
                    ? 'bg-emerald-600 text-white '
                    : 'bg-red-600 text-white '
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
