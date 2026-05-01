'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Target, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { myHubApi } from '@/lib/api-client';
import { clsx } from 'clsx';

const STAGE_COLORS: Record<string, string> = {
  NEW:        'bg-gray-100 text-gray-600',
  CONTACTED:  'bg-blue-100 text-blue-700',
  QUALIFIED:  'bg-indigo-100 text-indigo-700',
  NURTURING:  'bg-yellow-100 text-yellow-700',
  PROPOSAL:   'bg-orange-100 text-orange-700',
  NEGOTIATING:'bg-purple-100 text-purple-700',
  CONVERTED:  'bg-green-100 text-green-700',
  LOST:       'bg-red-100 text-red-700',
};

const STAGES = ['', 'NEW', 'CONTACTED', 'QUALIFIED', 'NURTURING', 'PROPOSAL', 'NEGOTIATING'];

export default function MyLeadsPage() {
  const [page, setPage]   = useState(1);
  const [stage, setStage] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['my-leads', page, stage],
    queryFn: () => myHubApi.getMyLeads({ page, limit: 20, stage: stage || undefined }),
  });

  const items = data?.items ?? [];
  const pages = data?.pages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/my-hub" className="text-gray-400 hover:text-gray-700"><ChevronLeft className="w-5 h-5" /></Link>
        <Target className="w-6 h-6 text-purple-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Leads</h1>
          <p className="text-sm text-gray-500">Leads assigned to you</p>
        </div>
        <div className="ml-auto">
          <select
            value={stage}
            onChange={e => { setStage(e.target.value); setPage(1); }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-500"
          >
            {STAGES.map(s => <option key={s} value={s}>{s || 'All Stages'}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Lead ID</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Company</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Contact</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Stage</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">ICP Score</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Last Contacted</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Next Follow-up</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>}
            {!isLoading && items.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No leads assigned to you.</td></tr>}
            {items.map((lead: any) => (
              <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{lead.businessId}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{lead.companyName ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">
                  {lead.contact ? `${lead.contact.firstName} ${lead.contact.lastName}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', STAGE_COLORS[lead.stage] ?? 'bg-gray-100 text-gray-600')}>
                    {lead.stage}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {lead.icp ? (
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-bold', lead.icp.totalScore >= 70 ? 'bg-green-100 text-green-700' : lead.icp.totalScore >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}>
                      {lead.icp.totalScore}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {lead.lastContactedAt ? new Date(lead.lastContactedAt).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {lead.nextFollowUpAt ? (
                    <span className={clsx(new Date(lead.nextFollowUpAt) < new Date() ? 'text-red-600 font-medium' : '')}>
                      {new Date(lead.nextFollowUpAt).toLocaleDateString()}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/leads/${lead.id}`} className="text-gray-400 hover:text-brand-600"><ExternalLink className="w-4 h-4" /></Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-sm text-gray-500">{total} lead{total !== 1 ? 's' : ''}</p>
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
