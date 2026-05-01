'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Briefcase, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { myHubApi } from '@/lib/api-client';
import { clsx } from 'clsx';

function StageBadge({ active }: { active: boolean }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
      {active ? 'Open' : 'Closed'}
    </span>
  );
}

export default function MyJDsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['my-jds', page],
    queryFn: () => myHubApi.getMyJDs({ page, limit: 20 }),
  });

  const items = data?.items ?? [];
  const pages = data?.pages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/my-hub" className="text-gray-400 hover:text-gray-700"><ChevronLeft className="w-5 h-5" /></Link>
        <Briefcase className="w-6 h-6 text-brand-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Assigned JDs</h1>
          <p className="text-sm text-gray-500">Job descriptions assigned to you</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">JD ID</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Job Title</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Department</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Location</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Applications</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">My Subs</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No JDs assigned to you yet.</td></tr>
            )}
            {items.map((j: any) => (
              <tr key={j.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{j.businessId}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{j.title}</td>
                <td className="px-4 py-3 text-gray-600">{j.department ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{j.location ?? '—'}</td>
                <td className="px-4 py-3"><StageBadge active={j.isActive} /></td>
                <td className="px-4 py-3 text-right text-gray-700">{j._count?.applications ?? 0}</td>
                <td className="px-4 py-3 text-right text-brand-600 font-medium">{j.mySubmissions}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/jobs/${j.id}`} className="text-gray-400 hover:text-brand-600">
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-sm text-gray-500">{total} JD{total !== 1 ? 's' : ''}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium">{page} / {pages}</span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
