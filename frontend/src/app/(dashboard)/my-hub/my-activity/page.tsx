'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Activity, ChevronLeft, ChevronRight, Pencil, Trash2, Plus, Eye, LogIn } from 'lucide-react';
import { myHubApi } from '@/lib/api-client';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';

const ACTION_ICONS: Record<string, React.ElementType> = {
  CREATE: Plus,
  UPDATE: Pencil,
  DELETE: Trash2,
  VIEW:   Eye,
  LOGIN:  LogIn,
};

const ENTITY_COLORS: Record<string, string> = {
  Lead:        'bg-purple-100 text-purple-700',
  Client:      'bg-blue-100 text-blue-700',
  Job:         'bg-indigo-100 text-indigo-700',
  Submission:  'bg-teal-100 text-teal-700',
  Candidate:   'bg-green-100 text-green-700',
  FollowUp:    'bg-orange-100 text-orange-700',
  User:        'bg-gray-100 text-gray-600',
};

export default function MyActivityPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['my-activity', page],
    queryFn: () => myHubApi.getMyActivity({ page, limit: 30 }),
  });

  const items = data?.items ?? [];
  const pages = data?.pages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/my-hub" className="text-gray-400 hover:text-gray-700"><ChevronLeft className="w-5 h-5" /></Link>
        <Activity className="w-6 h-6 text-gray-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Activity</h1>
          <p className="text-sm text-gray-500">Your recent actions in the platform</p>
        </div>
        <span className="ml-auto text-sm text-gray-400">{total} entries</span>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16 text-gray-400">Loading…</div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
          No activity recorded yet.
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {items.map((log: any) => {
            const Icon = ACTION_ICONS[log.action] ?? Activity;
            return (
              <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className={clsx('mt-0.5 p-2 rounded-lg',
                  log.action === 'CREATE' ? 'bg-green-100 text-green-600' :
                  log.action === 'DELETE' ? 'bg-red-100 text-red-600' :
                  log.action === 'UPDATE' ? 'bg-blue-100 text-blue-600' :
                  'bg-gray-100 text-gray-500'
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 capitalize">{log.action?.toLowerCase()}</span>
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', ENTITY_COLORS[log.entityType] ?? 'bg-gray-100 text-gray-600')}>
                      {log.entityType}
                    </span>
                    {log.entityId && (
                      <span className="font-mono text-xs text-gray-400">#{log.entityId.slice(-8)}</span>
                    )}
                  </div>
                  {log.changes && (
                    <p className="text-sm text-gray-500 mt-0.5 truncate max-w-xl">
                      {typeof log.changes === 'string' ? log.changes : JSON.stringify(log.changes)}
                    </p>
                  )}
                </div>
                <div className="text-xs text-gray-400 whitespace-nowrap mt-0.5">
                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-sm text-gray-500">{total} entries</p>
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
