'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { followUpsApi } from '@/lib/api-client';
import Link from 'next/link';
import { TableWrapper } from '@/components/ui/table-wrapper';
import {
  CalendarClock, Plus, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, ExternalLink, Phone, Mail, Video, Users, MessageCircle, MoreHorizontal,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const TYPE_ICONS: Record<string, any> = {
  CALL:      Phone,
  EMAIL:     Mail,
  MEETING:   Video,
  LINKEDIN:  Users,
  WHATSAPP:  MessageCircle,
  OTHER:     MoreHorizontal,
};

const STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
  PENDING:     { bg: 'bg-amber-50',   text: 'text-amber-700' },
  DONE:        { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  RESCHEDULED: { bg: 'bg-blue-50',    text: 'text-blue-700' },
  CANCELLED:   { bg: 'bg-gray-100',   text: 'text-gray-500' },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{status}</span>;
}

export default function FollowUpsPage() {
  const [view, setView]     = useState<'today' | 'all' | 'buckets'>('today');
  const [status, setStatus] = useState('');
  const [page, setPage]     = useState(1);
  const queryClient         = useQueryClient();

  const { data: todayData, isLoading: loadingToday } = useQuery({
    queryKey: ['follow-ups-today'],
    queryFn: followUpsApi.today,
    enabled: view === 'today',
  });

  const { data: allData, isLoading: loadingAll } = useQuery({
    queryKey: ['follow-ups', status, page],
    queryFn: () => followUpsApi.list({ status: status || undefined, page, limit: 100 }),
    placeholderData: (prev: any) => prev,
    enabled: view === 'all' || view === 'buckets',
  });

  const markDone = useMutation({
    mutationFn: (id: string) => followUpsApi.markDone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups-today'] });
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
    },
  });

  const isLoading = view === 'today' ? loadingToday : loadingAll;
  const items: any[] = view === 'today'
    ? (todayData as any[] ?? [])
    : (allData?.items ?? []);
  const total: number = allData?.total ?? items.length;
  const pages: number = allData?.pages ?? 1;

  // Sort items into 4 buckets based on scheduledAt date
  const buckets: Record<string, any[]> = { overdue: [], today: [], upcoming: [], done: [] };
  if (view === 'buckets' && !loadingAll) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    items.forEach((item: any) => {
      if (item.status === 'DONE') {
        buckets.done.push(item);
      } else if (!item.scheduledAt) {
        buckets.upcoming.push(item);
      } else {
        const scheduled = new Date(item.scheduledAt);
        const scheduledDate = new Date(scheduled.getFullYear(), scheduled.getMonth(), scheduled.getDate());
        if (scheduledDate < today) {
          buckets.overdue.push(item);
        } else if (scheduledDate.getTime() === today.getTime()) {
          buckets.today.push(item);
        } else {
          buckets.upcoming.push(item);
        }
      }
    });
  }

  const fmt = (d?: string | null) => {
    if (!d) return '—';
    const dt = new Date(d);
    return `${format(dt, 'dd MMM yyyy, hh:mm a')} · ${formatDistanceToNow(dt, { addSuffix: true })}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
            <CalendarClock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Follow Ups</h1>
            <p className="text-sm text-gray-500">Manage tasks, calls and meetings</p>
          </div>
        </div>
        <Link
          href="/follow-ups/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> New Follow Up
        </Link>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setView('today')}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            view === 'today' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-1.5" />Today
        </button>
        <button
          onClick={() => setView('buckets')}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            view === 'buckets' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          <CalendarClock className="w-4 h-4 inline mr-1.5" />Buckets
        </button>
        <button
          onClick={() => setView('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            view === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          All Follow Ups
        </button>
        {view === 'all' && (
          <select
            className="ml-2 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All Status</option>
            {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* BUCKETS VIEW */}
      {view === 'buckets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { key: 'overdue', label: 'Overdue', color: 'red', icon: '🔴' },
            { key: 'today', label: 'Due Today', color: 'amber', icon: '🟡' },
            { key: 'upcoming', label: 'Upcoming', color: 'blue', icon: '🔵' },
            { key: 'done', label: 'Done', color: 'emerald', icon: '✓' },
          ].map(({ key, label, color }) => {
            const items = buckets[key as keyof typeof buckets] ?? [];
            const colorClasses = {
              red: 'bg-red-50 border-red-200',
              amber: 'bg-amber-50 border-amber-200',
              blue: 'bg-blue-50 border-blue-200',
              emerald: 'bg-emerald-50 border-emerald-200',
            };
            const textColors = {
              red: 'text-red-700',
              amber: 'text-amber-700',
              blue: 'text-blue-700',
              emerald: 'text-emerald-700',
            };
            return (
              <div key={key} className={`${colorClasses[color as keyof typeof colorClasses]} border rounded-lg p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`font-semibold text-sm ${textColors[color as keyof typeof textColors]}`}>{label}</h3>
                  <span className={`text-xs font-bold ${textColors[color as keyof typeof textColors]} bg-white/60 rounded-full px-2 py-0.5`}>{items.length}</span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {items.length === 0 ? (
                    <div className="text-xs text-gray-400 italic py-2">None</div>
                  ) : (
                    items.map((f: any) => {
                      const Icon = TYPE_ICONS[f.type] ?? Clock;
                      const related = f.client?.name ?? f.lead?.firstName ?? f.contact?.firstName ?? '—';
                      return (
                        <div key={f.id} className="bg-white rounded border border-gray-100 p-2 hover:shadow-sm transition-shadow text-xs">
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <Icon className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-700 truncate">{f.title}</p>
                              <p className="text-gray-500 text-[10px]">{related}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] text-gray-400">{fmt(f.scheduledAt).split(' · ')[0]}</span>
                            {f.status !== 'DONE' && (
                              <button
                                onClick={() => markDone.mutate(f.id)}
                                disabled={markDone.isPending}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-100 rounded hover:bg-emerald-200 disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {view !== 'buckets' && (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <TableWrapper>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Type', 'Title', 'Related To', 'Scheduled', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-gray-400">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <div>{view === 'today' ? 'No follow-ups due today' : 'No follow-ups found'}</div>
                  </td>
                </tr>
              ) : (
                items.map((f: any) => {
                  const Icon = TYPE_ICONS[f.type] ?? Clock;
                  const related = f.client?.name ?? f.lead?.firstName ?? f.contact?.firstName ?? '—';
                  return (
                    <tr key={f.id} className={`hover:bg-gray-50 ${f.status === 'DONE' ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Icon className="w-3.5 h-3.5 text-gray-600" />
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{f.title}</td>
                      <td className="px-4 py-3 text-gray-600">{related}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(f.scheduledAt)}</td>
                      <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {f.status !== 'DONE' && (
                            <button
                              onClick={() => markDone.mutate(f.id)}
                              disabled={markDone.isPending}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Done
                            </button>
                          )}
                          <Link href={`/follow-ups/${f.id}`} className="p-1.5 text-gray-400 hover:text-blue-600">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </TableWrapper>
        {view === 'all' && pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">Total: {total}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium">{page}/{pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
