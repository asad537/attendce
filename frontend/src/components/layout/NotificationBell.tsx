import React, { useEffect, useRef, useState } from 'react';
import { notificationService } from '../../services/reportService';
import { AppNotification } from '../../types';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationBell() {
  const [open, setOpen]               = useState(false);
  const [notifications, setNotifs]    = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await notificationService.getList();
      setNotifs(res.data);
      setUnreadCount(res.unread_count);
    } catch {}
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id: number) => {
    await notificationService.markRead(id);
    setNotifs((n) => n.map((x) => x.id === id ? { ...x, is_read: true } : x));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAll = async () => {
    await notificationService.markAllRead();
    setNotifs((n) => n.map((x) => ({ ...x, is_read: true })));
    setUnreadCount(0);
  };

  const typeColors: Record<string, string> = {
    success: 'bg-emerald-50 border-emerald-200',
    warning: 'bg-amber-50 border-amber-200',
    error:   'bg-red-50 border-red-200',
    info:    'bg-blue-50 border-blue-200',
  };
  const typeDot: Record<string, string> = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error:   'bg-red-500',
    info:    'bg-blue-500',
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium leading-none min-w-[18px] h-[18px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAll} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">No notifications</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  className={`px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${!n.is_read ? 'bg-blue-50/40' : ''}`}
                >
                  <div className="flex gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${typeDot[n.type] || typeDot.info}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${n.is_read ? 'text-gray-600' : 'text-gray-900'}`}>{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
