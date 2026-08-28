import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface TimeTrackingModalProps {
  open: boolean;
  onClose: () => void;
  ticketId: number;
  onSuccess: () => void;
}

export default function TimeTrackingModal({ open, onClose, ticketId, onSuccess }: TimeTrackingModalProps) {
  const [timeSpent, setTimeSpent] = useState('');
  const [timeRemaining, setTimeRemaining] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSave = async () => {
    if (!timeSpent.trim()) {
        return toast.error("Time spent is required.");
    }
    setLoading(true);
    try {
        await api.post(`/tickets/${ticketId}/worklogs`, {
            time_spent: timeSpent,
            time_remaining: timeRemaining || undefined
        });
        toast.success("Work logged successfully!");
        setTimeSpent('');
        setTimeRemaining('');
        onSuccess();
        onClose();
    } catch (e: any) {
        toast.error(e.response?.data?.message || "Failed to log work.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/60 transition-opacity backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-[20px] font-semibold text-gray-900">Time tracking</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded  transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Time spent</label>
                    <input 
                        type="text"
                        className="w-full border border-gray-300 rounded p-2 text-[14px] text-gray-900 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        value={timeSpent}
                        onChange={(e) => setTimeSpent(e.target.value)}
                        placeholder="e.g. 2w 4d 6h 45m"
                        autoFocus
                    />
                </div>
                <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                        Time remaining
                        <svg className="w-4 h-4 text-gray-400 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </label>
                    <input 
                        type="text"
                        className="w-full border border-gray-300 rounded p-2 text-[14px] text-gray-900 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        value={timeRemaining}
                        onChange={(e) => setTimeRemaining(e.target.value)}
                        placeholder="e.g. 1d 2h"
                    />
                </div>
            </div>

            <div className="text-[13px] text-gray-600 space-y-2">
                <p>Use the format: <strong>2w 4d 6h 45m</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>w</strong> = weeks</li>
                    <li><strong>d</strong> = days</li>
                    <li><strong>h</strong> = hours</li>
                    <li><strong>m</strong> = minutes</li>
                </ul>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 text-[14px] font-medium text-gray-700 hover:text-gray-900  rounded transition-colors">
                    Cancel
                </button>
                <button type="button" onClick={handleSave} disabled={loading} className="px-4 py-2 text-[14px] font-medium text-white bg-emerald-600  rounded transition-colors disabled:opacity-50 shadow-sm">
                    {loading ? 'Saving...' : 'Save'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
