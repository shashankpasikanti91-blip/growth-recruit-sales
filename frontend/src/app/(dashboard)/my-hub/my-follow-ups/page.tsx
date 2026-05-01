'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CalendarClock, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { myHubApi } from '@/lib/api-client';
import { clsx } from 'clsx';

type View = 'today' | 'overdue' | 'week' | 'completed' | 'all';

const VIEWS: { key: View; label: string }[] = [
  { key: 'today',     label: 'Today' },
  { key: 'overdue',   label: 'Overdue' },
  { key: 'week',      label: 'This Week' },
  { key: 'completed', label: 'Completed' },
  { key: 'all',       label: 'All' },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const TYPE_COLORS: Record<string, string> = {
  CALL:    'bg-blue-100 text-blue-700',
  EMAIL:   'bg-indigo-100 text-indigo-700',
  MEETING: 'bg-purple-100 text-purple-700',
  TASK:    'bg-gray-100 text-gray-600',
  OTHER:   'bg-gray-100 text-gray-600',
};

export default function MyFollowUpsPage() {
  const searchParams = useSearchParams();
  const [view, setView]   = useState<View>((searchParams.get('view') as View) ?? 'today');
  const [page, setPage]   = useState(1);

  useEffect(() => { setPage(1); }, [view]);

  const { data, isLoading } = useQuery({
    queryKey: ['my-follow-ups', view, page],
    queryFn: () => myHubApi.getMyFollowUps({ view, page, limit: 20 }),
  });

  const items = data?.items ?? [];
  const pages = data?.pages ?? 1;
  const total = data?.total ?? 0;

  const now = new Date();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/my-hub" className="text-gray-400 hover:text-gray-700"><ChevronLeft className="w-5 h-5" /></Link>
        <CalendarClock className="w-6 h-6 text-orange-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Follow-ups</h1>
          <p className="text-sm text-gray-500">Follow-ups assigned to you</p>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {VIEWS.map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-colors', view === v.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Subject</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Entity</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Scheduled At</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Completed At</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>}
            {!isLoading && items.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No follow-ups in this view.</td></tr>}
            {items.map((fu: any) => {
              const isOverdue = fu.status === 'PENDING' && fu.scheduledAt && new Date(fu.scheduledAt) < now;
              return (
                <tr key={fu.id} className={clsx('hover:bg-gray-50 transition-colors', isOverdue && 'bg-red-50')}>
                  <td className="px-4 py-3 font-medium text-gray-900">{fu.subject ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', TYPE_COLORS[fu.type] ?? 'bg-gray-100 text-gray-600')}>
                      {fu.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[fu.status] ?? 'bg-gray-100 text-gray-600', isOverdue && 'bg-red-100 text-red-700')}>
                      {isOverdue ? 'OVERDUE' : fu.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {fu.lead ? (
                      <Link href={`/leads/${fu.lead.id}`} className="hover:text-brand-600 hover:underline">{fu.lead.companyName}</Link>
                    ) : fu.client ? (
                      <Link href={`/clients/${fu.client.id}`} className="hover:text-brand-600 hover:underline">{fu.client.name}</Link>
                    ) : '—'}
                  </td>
                  <td className={clsx('px-4 py-3 text-xs', isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500')}>
                    {fu.scheduledAt ? new Date(fu.scheduledAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {fu.completedAt ? new Date(fu.completedAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {fu.lead && <Link href={`/leads/${fu.lead.id}`} className="text-gray-400 hover:text-brand-600"><ExternalLink className="w-4 h-4" /></Link>}
                    {fu.client && <Link href={`/clients/${fu.client.id}`} className="text-gray-400 hover:text-brand-600"><ExternalLink className="w-4 h-4" /></Link>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-sm text-gray-500">{total} follow-up{total !== 1 ? 's' : ''}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-medium">{page} / {pages}</span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
