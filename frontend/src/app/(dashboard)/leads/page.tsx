'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { leadsApi } from '@/lib/api-client';
import Link from 'next/link';
import { Users, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const STAGE_BADGE: Record<string, string> = {
  NEW: 'badge-gray', CONTACTED: 'badge-blue', QUALIFIED: 'badge-purple',
  PROPOSAL: 'badge-yellow', NEGOTIATION: 'badge-blue', WON: 'badge-green',
  LOST: 'badge-red', DORMANT: 'badge-gray',
};

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST', 'DORMANT'];

export default function LeadsPage() {
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['leads', search, stage, page],
    queryFn: () => leadsApi.list({ search: search || undefined, stage: stage || undefined, page, limit: 20 }),
    placeholderData: (prev) => prev,
  });

  const scoreMutation = useMutation({
    mutationFn: (id: string) => leadsApi.score(id),
    onSuccess: (result) => toast.success(`ICP Score: ${result.score}/100 — ${result.recommendation}`),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Scoring failed'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 mt-1">{data?.meta?.total ?? 0} total leads</p>
        </div>
        <Link href="/leads/new" className="btn-primary"><Users className="w-4 h-4" /> Add Lead</Link>
      </div>

      {/* Filters */}
      <div className="card p-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search leads..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input w-40" value={stage} onChange={e => { setStage(e.target.value); setPage(1); }}>
          <option value="">All stages</option>
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Kanban-style summary */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
        {STAGES.map(s => {
          const count = data?.data?.filter((l: any) => l.stage === s).length ?? 0;
          return (
            <button key={s} onClick={() => setStage(stage === s ? '' : s)}
              className={`card p-3 text-center transition-all cursor-pointer ${stage === s ? 'ring-2 ring-brand-500' : ''}`}>
              <div className="text-lg font-bold text-gray-800">{count}</div>
              <div className="text-xs text-gray-500 mt-1">{s}</div>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Name', 'Title / Company', 'Stage', 'AI Score', 'Source', 'Added', ''].map(h => (
                <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : data?.data?.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No leads found</td></tr>
            ) : (
              data?.data?.map((lead: any) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link href={`/leads/${lead.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                      {lead.fullName}
                    </Link>
                    <div className="text-xs text-gray-400">{lead.email}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    <div>{lead.title}</div>
                    <div className="text-xs text-gray-400">{lead.company?.name ?? lead.companyName}</div>
                  </td>
                  <td className="px-6 py-4"><span className={STAGE_BADGE[lead.stage] ?? 'badge-gray'}>{lead.stage}</span></td>
                  <td className="px-6 py-4">
                    {lead.aiScore != null ? (
                      <span className={`font-semibold ${lead.aiScore >= 70 ? 'text-green-600' : lead.aiScore >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{lead.aiScore}</span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{lead.source}</td>
                  <td className="px-6 py-4 text-gray-400 text-xs">{formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => scoreMutation.mutate(lead.id)} disabled={scoreMutation.isPending}
                      className="text-xs text-purple-600 hover:text-purple-800 font-medium">Score AI</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {data?.meta && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t bg-gray-50">
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
