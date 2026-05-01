'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Send, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { myHubApi } from '@/lib/api-client';
import { clsx } from 'clsx';

const STAGE_COLORS: Record<string, string> = {
  DRAFT:               'bg-gray-100 text-gray-600',
  SUBMITTED_TO_CLIENT: 'bg-blue-100 text-blue-700',
  CLIENT_REVIEWING:    'bg-yellow-100 text-yellow-700',
  INTERVIEW_SCHEDULED: 'bg-purple-100 text-purple-700',
  OFFER_EXTENDED:      'bg-orange-100 text-orange-700',
  PLACED:              'bg-green-100 text-green-700',
  REJECTED:            'bg-red-100 text-red-700',
  WITHDRAWN:           'bg-gray-200 text-gray-500',
};

const STAGES = ['', 'DRAFT', 'SUBMITTED_TO_CLIENT', 'CLIENT_REVIEWING', 'INTERVIEW_SCHEDULED', 'OFFER_EXTENDED', 'PLACED', 'REJECTED'];

export default function MySubmissionsPage() {
  const [page, setPage]   = useState(1);
  const [stage, setStage] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['my-submissions', page, stage],
    queryFn: () => myHubApi.getMySubmissions({ page, limit: 20, stage: stage || undefined }),
  });

  const items = data?.items ?? [];
  const pages = data?.pages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/my-hub" className="text-gray-400 hover:text-gray-700"><ChevronLeft className="w-5 h-5" /></Link>
        <Send className="w-6 h-6 text-green-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Submissions</h1>
          <p className="text-sm text-gray-500">Candidates you submitted to clients</p>
        </div>
        <div className="ml-auto">
          <select
            value={stage}
            onChange={e => { setStage(e.target.value); setPage(1); }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-500"
          >
            {STAGES.map(s => (
              <option key={s} value={s}>{s || 'All Stages'}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Sub ID</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Candidate</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">JD</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Client</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Stage</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Submitted</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>}
            {!isLoading && items.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No submissions found.</td></tr>}
            {items.map((s: any) => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.businessId}</td>
                <td className="px-4 py-3">
                  <Link href={`/candidates/${s.candidateId}`} className="font-medium text-gray-900 hover:text-brand-600">
                    {s.candidate?.firstName} {s.candidate?.lastName}
                  </Link>
                  {s.candidate?.currentTitle && <p className="text-xs text-gray-500">{s.candidate.currentTitle}</p>}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/jobs/${s.jobId}`} className="text-gray-700 hover:text-brand-600">{s.job?.title ?? '—'}</Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{s.client?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', STAGE_COLORS[s.stage] ?? 'bg-gray-100 text-gray-600')}>
                    {s.stage?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/submissions/${s.id}`} className="text-gray-400 hover:text-brand-600">
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-sm text-gray-500">{total} submission{total !== 1 ? 's' : ''}</p>
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
