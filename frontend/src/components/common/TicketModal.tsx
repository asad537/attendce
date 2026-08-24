import React, { useEffect } from 'react';

interface TicketModalProps {
  open: boolean;
  onClose: () => void;
  ticketId: number;
  children: React.ReactNode;
}

export default function TicketModal({ open, onClose, ticketId, children }: TicketModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-900/80 transition-opacity backdrop-blur-sm" onClick={onClose} />

        {/* Dialog - Dark Mode Jira Style */}
        <div className="relative bg-[#1D2125] text-[#B6C2CF] rounded-xl shadow-2xl w-full max-w-[1200px] transform transition-all flex flex-col min-h-[85vh] border border-[#323940]">
          
          {/* Custom Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#323940]">
            <div className="flex items-center gap-4 text-[13px] text-[#8C9BAB] font-medium">
              <span className="flex items-center gap-1 hover:bg-[#2C333A] px-2 py-1 rounded cursor-pointer transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Add epic
              </span>
              <span>/</span>
              <span className="flex items-center gap-2 hover:bg-[#2C333A] px-2 py-1 rounded cursor-pointer transition-colors">
                <input type="checkbox" className="w-3.5 h-3.5 rounded border-0 bg-white text-blue-600 focus:ring-0 cursor-pointer" onClick={(e)=>e.stopPropagation()} />
                KAN-{ticketId || 'X'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button className="text-[#8C9BAB] hover:text-[#B6C2CF] p-1.5 rounded hover:bg-[#2C333A] transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              </button>
              <button className="text-[#8C9BAB] hover:text-[#B6C2CF] p-1.5 rounded hover:bg-[#2C333A] transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              </button>
              <button className="text-[#8C9BAB] hover:text-[#B6C2CF] p-1.5 rounded hover:bg-[#2C333A] transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
              </button>
              <button onClick={onClose} className="text-[#8C9BAB] hover:text-white p-1.5 rounded hover:bg-[#2C333A] transition-colors ml-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
          
          {/* Body */}
          <div className="flex-1 p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
