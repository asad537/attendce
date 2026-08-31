import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/reportService';
import { AppNotification } from '../../types';
import { formatDistanceToNow } from 'date-fns';

const BellIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const LockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5l7 7-7 7" />
  </svg>
);

const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 19l-7-7 7-7" />
  </svg>
);

export default function NotificationBell() {
  const [open, setOpen]               = useState(false);
  const [notifications, setNotifs]    = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const knownNotificationIds = useRef<Set<number>>(new Set());
  const didLoadNotifications = useRef(false);
  const audioContext = useRef<AudioContext | null>(null);
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const pageSize = 4;

  const totalPages = Math.ceil(notifications.length / pageSize);
  const currentNotifications = notifications.slice(page * pageSize, (page + 1) * pageSize);

  const prepareSound = () => {
    if (!audioContext.current) audioContext.current = new AudioContext();
    if (audioContext.current.state === 'suspended') void audioContext.current.resume();
  };

  const playNotificationSound = () => {
    const context = audioContext.current;
    if (!context || context.state !== 'running') return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.setValueAtTime(1175, context.currentTime + .13);
    gain.gain.setValueAtTime(.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.12, context.currentTime + .02);
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .32);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + .34);
  };

  const load = async () => {
    try {
      const res = await notificationService.getList();
      const unread = res.data.filter(notification => !notification.is_read);
      if (didLoadNotifications.current && unread.some(notification => !knownNotificationIds.current.has(notification.id))) playNotificationSound();
      knownNotificationIds.current = new Set(res.data.map(notification => notification.id));
      didLoadNotifications.current = true;
      setNotifs(res.data);
      setUnreadCount(res.unread_count);
    } catch {}
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5_000);
    return () => clearInterval(interval);
  }, []);

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

  const typeDot: Record<string, string> = {
    success: 'bg-emerald-500',
    warning: 'bg-orange-400',
    error:   'bg-red-500',
    info:    'bg-blue-500',
  };

  const getIconForNotification = (n: AppNotification) => {
    if (n.title.toLowerCase().includes('password') || n.title.toLowerCase().includes('security')) {
      return <LockIcon className="w-5 h-5" />;
    }
    return <BellIcon className="w-5 h-5" />;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { prepareSound(); setOpen(!open); }}
        className="relative p-2 text-gray-500 hover:text-gray-800 transition-colors outline-none focus:outline-none"
        aria-label="Notifications"
      >
        <BellIcon className="w-6 h-6 stroke-[1.8]" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-[18px] h-[18px] bg-emerald-500 border-2 border-white text-white text-[10px] rounded-full flex items-center justify-center font-bold leading-none translate-x-1/2 -translate-y-1/2">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-3 w-[420px] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 z-50">
          <div className="absolute -top-2 right-[18px] w-4 h-4 bg-white border-t border-l border-gray-100 transform rotate-45" />
          
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 relative z-10 bg-white rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <BellIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Notifications</h3>
                <p className="text-[13px] text-gray-500 mt-0.5">You have {unreadCount} new notifications</p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button onClick={markAll} className="flex items-center gap-1.5 text-[13px] text-emerald-600 hover:text-emerald-700 font-medium outline-none focus:outline-none">
                <CheckCircleIcon className="w-4 h-4" />
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto bg-white">
            {currentNotifications.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No notifications</div>
            ) : (
              currentNotifications.map((n, index) => {
                const getCategory = (dateStr: string) => {
                  const date = new Date(dateStr);
                  const now = new Date();
                  if (date.toDateString() === now.toDateString()) return 'Today';
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
                  return formatDistanceToNow(date, { addSuffix: true }); // Or use formatted date
                };
                
                const category = getCategory(n.created_at);
                const prevCategory = index > 0 ? getCategory(currentNotifications[index - 1].created_at) : null;
                const showHeader = category !== prevCategory;

                return (
                  <React.Fragment key={n.id}>
                    {showHeader && (
                      <div className="px-5 py-2 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider sticky top-0 z-10">
                        {category}
                      </div>
                    )}
                    <div
                      onClick={() => { if (!n.is_read) void markRead(n.id); if (n.action_url) { setOpen(false); navigate(n.action_url); } }}
                      className="flex gap-4 px-5 py-4 border-b border-gray-100 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        {getIconForNotification(n)}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${typeDot[n.type] || 'bg-orange-400'}`}></span>
                            <h4 className="font-bold text-gray-900 text-[14px] truncate">{n.title}</h4>
                          </div>
                          {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 ml-2"></span>}
                        </div>
                        <p className="text-[13px] text-gray-500 mt-1 pl-4.5 line-clamp-2">{n.message}</p>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2 pl-4.5">
                          <ClockIcon className="w-3.5 h-3.5" />
                          <span>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between px-5 py-3.5 bg-white rounded-b-2xl">
            <button 
              onClick={() => { setOpen(false); navigate('/notifications'); }}
              className="flex items-center gap-1 text-[13px] font-semibold text-emerald-600 hover:text-emerald-700 transition-colors outline-none focus:outline-none"
            >
              View all notifications
              <ChevronRightIcon className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors outline-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors outline-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
