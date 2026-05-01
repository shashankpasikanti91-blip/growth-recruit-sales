'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Bell, CheckCheck, Briefcase, Send, Calendar, AlertCircle, X } from 'lucide-react';
import { notificationsApi } from '@/lib/api-client';
import { clsx } from 'clsx';

const TYPE_ICON: Record<string, React.ElementType> = {
  JD_ASSIGNED:         Briefcase,
  SUBMISSION_RECEIVED: Send,
  INTERVIEW_SCHEDULED: Calendar,
  FEEDBACK_REMINDER:   AlertCircle,
};

const TYPE_COLOR: Record<string, string> = {
  JD_ASSIGNED:         'text-brand-600',
  SUBMISSION_RECEIVED: 'text-green-600',
  INTERVIEW_SCHEDULED: 'text-purple-600',
  FEEDBACK_REMINDER:   'text-amber-600',
};

const ENTITY_HREF: Record<string, (id: string) => string> = {
  job:         id => `/jobs/${id}`,
  submission:  id => `/submissions/${id}`,
  interview:   id => `/interviews/${id}`,
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Poll unread count every 30 s
  const { data: countData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 30_000,
  });

  const { data: preview = [] } = useQuery({
    queryKey: ['notifications-preview'],
    queryFn: notificationsApi.preview,
    enabled: open,
  });

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-preview'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-preview'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = countData?.count ?? 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-900 text-sm">Notifications</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={() => markAllMutation.mutate()}
                  disabled={markAllMutation.isPending}
                  className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <ul className="divide-y divide-gray-50 max-h-[360px] overflow-y-auto">
            {preview.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-gray-400">
                No notifications yet
              </li>
            )}
            {preview.map((n: any) => {
              const Icon = TYPE_ICON[n.type] ?? Bell;
              const iconColor = TYPE_COLOR[n.type] ?? 'text-gray-500';
              const href = n.entityType && n.entityId && ENTITY_HREF[n.entityType]
                ? ENTITY_HREF[n.entityType](n.entityId)
                : '/notifications';

              return (
                <li
                  key={n.id}
                  className={clsx('px-4 py-3 hover:bg-gray-50 transition-colors', !n.isRead && 'bg-brand-50/40')}
                >
                  <Link href={href} onClick={() => { markReadMutation.mutate(n.id); setOpen(false); }} className="flex gap-3">
                    <span className={clsx('mt-0.5 flex-shrink-0', iconColor)}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={clsx('text-sm leading-snug truncate', n.isRead ? 'text-gray-600' : 'font-medium text-gray-900')}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-2.5 text-center">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
