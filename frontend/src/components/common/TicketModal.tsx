import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface TicketModalProps {
  open: boolean;
  onClose: () => void;
  ticketId: number;
  children: React.ReactNode;
  onDelete?: (id: number) => void;
}

export default function TicketModal({ open, onClose, ticketId, children, onDelete }: TicketModalProps) {
  const [watching, setWatching] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleWatch = () => {
    setWatching(!watching);
    toast.success(watching ? 'Stopped watching ticket.' : 'You are now watching this ticket.');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Ticket link copied to clipboard.');
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this ticket?")) return;
    try {
        await api.delete(`/tickets/${ticketId}`);
        toast.success("Ticket deleted");
        if (onDelete) onDelete(ticketId);
        onClose();
    } catch (e) {
        toast.error("Failed to delete ticket");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-900/80 transition-opacity backdrop-blur-sm" onClick={onClose} />

        {/* Dialog - Light Mode Dashboard Style */}
        <div className="relative bg-white text-gray-800 rounded-xl shadow-2xl w-full max-w-[1200px] transform transition-all flex flex-col min-h-[85vh] border border-gray-100">
          
          {/* Custom Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-4 text-[13px] text-gray-500 font-medium">
              <span className="flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded cursor-pointer transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Add epic
              </span>
              <span>/</span>
              <span className="flex items-center gap-2 hover:bg-gray-100 px-2 py-1 rounded cursor-pointer transition-colors text-indigo-600">
                <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 bg-white text-indigo-600 focus:ring-indigo-500 cursor-pointer" onClick={(e)=>e.stopPropagation()} />
                KAN-{ticketId || 'X'}
              </span>
            </div>
            <div className="flex items-center gap-2 relative">
              <button onClick={handleWatch} className={`${watching ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:bg-gray-100'} hover:text-gray-700 p-1.5 rounded transition-colors`} title="Watch ticket">
                <svg className="w-5 h-5" fill={watching ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              </button>
              <button onClick={handleShare} className="text-gray-400 hover:text-gray-700 p-1.5 rounded hover:bg-gray-100 transition-colors" title="Share ticket">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              </button>
              <div className="relative">
                <button onClick={() => setShowMenu(!showMenu)} className="text-gray-400 hover:text-gray-700 p-1.5 rounded hover:bg-gray-100 transition-colors" title="More actions">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
                </button>
                {showMenu && (
                    <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-50">
                        <button onClick={handleDelete} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Delete ticket</button>
                    </div>
                )}
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-800 p-1.5 rounded hover:bg-gray-100 transition-colors ml-2" title="Close">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
          
          {/* Body */}
          <div className="flex-1 p-6" onClick={() => setShowMenu(false)}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
