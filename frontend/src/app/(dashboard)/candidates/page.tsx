'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { candidatesApi } from '@/lib/api-client';
import Link from 'next/link';
import { UserPlus, Search, Filter, Briefcase } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const STAGE_BADGE: Record<string, string> = {
  SOURCED: 'badge-gray', SCREENED: 'badge-purple', INTERVIEWING: 'badge-blue',
  OFFERED: 'badge-green', PLACED: 'badge-green', REJECTED: 'badge-red', WITHDRAWN: 'badge-yellow',
};

export default function CandidatesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['candidates', search, page],
    queryFn: () => candidatesApi.list({ search: search || undefined, page, limit: 20 }),
    placeholderData: (prev) => prev,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
          <p className="text-gray-500 mt-1">{data?.meta?.total ?? 0} total candidates</p>
        </div>
        <Link href="/candidates/new" className="btn-primary">
          <UserPlus className="w-4 h-4" /> Add Candidate
        </Link>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, email, title, company..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Title / Company</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Applications</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : data?.data?.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No candidates found</td></tr>
            ) : (
              data?.data?.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/candidates/${c.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                      {c.firstName} {c.lastName}
                    </Link>
                    <div className="text-xs text-gray-400">{c.email}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    <div>{c.currentTitle}</div>
                    <div className="text-xs text-gray-400">{c.currentCompany}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/candidates/${c.id}`} className="flex items-center gap-1 text-sm text-gray-600 hover:text-brand-600">
                      <Briefcase className="w-3.5 h-3.5" />
                      {c._count?.applications ?? 0} job{(c._count?.applications ?? 0) !== 1 ? 's' : ''}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    {c.scorecards?.[0]?.score != null ? (
                      <span className={`font-semibold ${c.scorecards[0].score >= 70 ? 'text-green-600' : c.scorecards[0].score >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                        {c.scorecards[0].score}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {data?.meta && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-500">Page {page} of {data.meta.totalPages}</span>
            <div className="flex gap-2">
              <button className="btn-secondary py-1 px-3 text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <button className="btn-secondary py-1 px-3 text-xs" disabled={page >= data.meta.totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
