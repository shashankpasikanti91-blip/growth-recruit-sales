'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Bell, CheckCheck, Briefcase, Send, Calendar,
  AlertCircle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { notificationsApi } from '@/lib/api-client';
import { clsx } from 'clsx';

const TYPE_ICON: Record<string, React.ElementType> = {
  JD_ASSIGNED:         Briefcase,
  SUBMISSION_RECEIVED: Send,
  INTERVIEW_SCHEDULED: Calendar,
  FEEDBACK_REMINDER:   AlertCircle,
};

const TYPE_COLOR: Record<string, string> = {
  JD_ASSIGNED:         'bg-brand-100 text-brand-700',
  SUBMISSION_RECEIVED: 'bg-green-100 text-green-700',
  INTERVIEW_SCHEDULED: 'bg-purple-100 text-purple-700',
  FEEDBACK_REMINDER:   'bg-amber-100 text-amber-700',
};

const TYPE_LABEL: Record<string, string> = {
  JD_ASSIGNED:         'JD Assigned',
  SUBMISSION_RECEIVED: 'Submission',
  INTERVIEW_SCHEDULED: 'Interview',
  FEEDBACK_REMINDER:   'Feedback Due',
};

const ENTITY_HREF: Record<string, (id: string) => string> = {
  job:        id => `/jobs/${id}`,
  submission: id => `/submissions/${id}`,
  interview:  id => `/interviews/${id}`,
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

export default function NotificationsPage() {
  const [page, setPage]           = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const queryClient               = useQueryClient();
  const limit                      = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page, unreadOnly],
    queryFn: () => notificationsApi.list({ page, limit, unreadOnly }),
  });

  const { data: countData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const items: any[]  = data?.items ?? [];
  const total: number = data?.total ?? 0;
  const pages: number = data?.pages ?? 1;
  const unread        = countData?.count ?? 0;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-gray-700" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {unread > 0 ? `${unread} unread` : 'All caught up'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Unread filter */}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={e => { setUnreadOnly(e.target.checked); setPage(1); }}
              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            Unread only
          </label>
          {unread > 0 && (
            <button
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm overflow-hidden">
        {isLoading && (
          <div className="px-6 py-12 text-center text-sm text-gray-400">Loading…</div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="px-6 py-16 text-center">
            <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No notifications</p>
            <p className="text-sm text-gray-400 mt-1">
              {unreadOnly ? 'No unread notifications.' : 'You\'re all caught up.'}
            </p>
          </div>
        )}

        {items.map((n: any) => {
          const Icon   = TYPE_ICON[n.type]  ?? Bell;
          const color  = TYPE_COLOR[n.type] ?? 'bg-gray-100 text-gray-600';
          const label  = TYPE_LABEL[n.type] ?? n.type;
          const href   = n.entityType && n.entityId && ENTITY_HREF[n.entityType]
            ? ENTITY_HREF[n.entityType](n.entityId)
            : '#';

          return (
            <div
              key={n.id}
              className={clsx(
                'flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors',
                !n.isRead && 'bg-brand-50/30',
              )}
            >
              {/* Icon badge */}
              <span className={clsx('mt-0.5 p-2 rounded-lg flex-shrink-0', color)}>
                <Icon className="w-4 h-4" />
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={clsx('text-sm', n.isRead ? 'text-gray-700' : 'font-semibold text-gray-900')}>
                      {n.title}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className={clsx('text-[11px] font-medium px-2 py-0.5 rounded-full', color)}>
                        {label}
                      </span>
                      <span className="text-xs text-gray-400">{timeAgo(n.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!n.isRead && (
                      <button
                        onClick={() => markReadMutation.mutate(n.id)}
                        className="text-xs text-brand-600 hover:text-brand-800 font-medium whitespace-nowrap"
                      >
                        Mark read
                      </button>
                    )}
                    {href !== '#' && (
                      <Link
                        href={href}
                        onClick={() => { if (!n.isRead) markReadMutation.mutate(n.id); }}
                        className="text-xs text-gray-400 hover:text-gray-700 font-medium whitespace-nowrap"
                      >
                        View →
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Unread dot */}
              {!n.isRead && <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-2" />}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-sm text-gray-500">
            {total} notification{total !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-700 font-medium">
              {page} / {pages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
