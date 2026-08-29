import React, { useEffect, useState } from 'react';
import { notificationService } from '../../services/reportService';
import { AppNotification } from '../../types';
import { formatDistanceToNow, format } from 'date-fns';

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

export default function NotificationsPage() {
  const [notifications, setNotifs] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await notificationService.getList();
      setNotifs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: number) => {
    await notificationService.markRead(id);
    setNotifs((n) => n.map((x) => x.id === id ? { ...x, is_read: true } : x));
  };

  const markAll = async () => {
    await notificationService.markAllRead();
    setNotifs((n) => n.map((x) => ({ ...x, is_read: true })));
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
    <div className="mx-auto w-full max-w-[1400px] space-y-4 p-3 sm:p-4 lg:p-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">All Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">View and manage your recent notifications</p>
        </div>
        <button onClick={markAll} className="btn-primary">
          <CheckCircleIcon className="w-4 h-4" />
          Mark all as read
        </button>
      </div>

      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center text-gray-400">You have no notifications</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((n, index) => {
              const getCategory = (dateStr: string) => {
                const date = new Date(dateStr);
                const now = new Date();
                if (date.toDateString() === now.toDateString()) return 'Today';
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
                return format(date, 'MMM d, yyyy');
              };
              
              const category = getCategory(n.created_at);
              const prevCategory = index > 0 ? getCategory(notifications[index - 1].created_at) : null;
              const showHeader = category !== prevCategory;

              return (
                <React.Fragment key={n.id}>
                  {showHeader && (
                    <div className="px-6 py-2.5 bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider sticky top-0 z-10 border-y border-gray-100 first:border-t-0">
                      {category}
                    </div>
                  )}
                  <div
                    onClick={() => !n.is_read && markRead(n.id)}
                    className={`flex gap-5 px-6 py-5 bg-white transition-colors hover:bg-gray-50 cursor-pointer ${n.is_read ? 'opacity-70' : ''}`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      {getIconForNotification(n)}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${typeDot[n.type] || 'bg-orange-400'}`}></span>
                          <h4 className="font-bold text-gray-900 text-[15px]">{n.title}</h4>
                        </div>
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ml-2"></span>}
                      </div>
                      <p className="text-[14px] text-gray-600 pl-4.5">{n.message}</p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2.5 pl-4.5">
                        <ClockIcon className="w-3.5 h-3.5" />
                        <span>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
