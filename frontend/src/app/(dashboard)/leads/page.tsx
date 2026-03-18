'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '@/lib/api-client';
import Link from 'next/link';
import { Users, Search, Zap, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const STAGE_COLORS: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-600',
  CONTACTED: 'bg-blue-100 text-blue-700',
  QUALIFIED: 'bg-purple-100 text-purple-700',
  PROPOSAL: 'bg-yellow-100 text-yellow-700',
  NEGOTIATION: 'bg-orange-100 text-orange-700',
  CLOSED_WON: 'bg-green-100 text-green-700',
  CLOSED_LOST: 'bg-red-100 text-red-600',
};

const STAGE_LABELS: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  CLOSED_WON: 'Won',
  CLOSED_LOST: 'Lost',
};

const STAGE_ACTIONS: Record<string, string> = {
  NEW: '🆕 New — not contacted yet',
  CONTACTED: '📧 Contacted — email / call sent',
  QUALIFIED: '✅ Qualified — interested & fits ICP',
  PROPOSAL: '📄 Proposal — quote / deck sent',
  NEGOTIATION: '🤝 Negotiation — in discussion',
  CLOSED_WON: '🏆 Won — deal closed',
  CLOSED_LOST: '❌ Lost — not interested / competitor',
};

const STAGES = Object.keys(STAGE_ACTIONS);

export default function LeadsPage() {
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['leads', search, stage, page],
    queryFn: () => leadsApi.list({ search: search || undefined, stage: stage || undefined, page, limit: 20 }),
    placeholderData: (prev) => prev,
  });

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => leadsApi.updateStage(id, stage),
    onSuccess: (_data: any, vars: any) => {
      toast.success(`Moved to ${STAGE_LABELS[vars.stage] ?? vars.stage}`);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Stage update failed'),
  });

  const scoreMutation = useMutation({
    mutationFn: (id: string) => leadsApi.score(id),
    onSuccess: (result: any) =>
      toast.success(`ICP Score: ${result.score}/100 — ${result.recommendation}`, { duration: 5000 }),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'AI scoring failed'),
  });

  const allLeads: any[] = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 mt-1">{data?.meta?.total ?? 0} total leads</p>
        </div>
        <Link href="/leads/new" className="btn-primary">
          <Users className="w-4 h-4" /> Add Lead
        </Link>
      </div>

      {/* AI Score explanation banner */}
      <div className="flex items-start gap-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 text-sm text-purple-800">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-500" />
        <div>
          <span className="font-semibold">AI Score</span> — Each lead gets an ICP (Ideal Customer Profile) score 0–100.{' '}
          <strong>70+</strong> = strong fit &nbsp;·&nbsp; <strong>50–69</strong> = moderate &nbsp;·&nbsp; <strong>below 50</strong> = low priority.
          Click <span className="font-semibold">Run AI Score</span> to generate or refresh.
          Stages update automatically via n8n (email sent → Contacted, meeting booked → Qualified, deal closed → Won)
          or update manually using the dropdown.
        </div>
      </div>

      {/* Pipeline summary */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
        {STAGES.map(s => {
          const count = allLeads.filter((l: any) => l.stage === s).length;
          const isActive = stage === s;
          return (
            <button
              key={s}
              onClick={() => setStage(isActive ? '' : s)}
              className={`rounded-xl border p-3 text-center transition-all cursor-pointer ${
                isActive
                  ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-400'
                  : 'border-gray-100 bg-white shadow-sm hover:shadow-md'
              }`}
            >
              <div className="text-lg font-bold text-gray-800">{count}</div>
              <div className="text-xs text-gray-500 mt-1">{STAGE_LABELS[s]}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="card p-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, email, company..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="input w-48"
          value={stage}
          onChange={e => { setStage(e.target.value); setPage(1); }}
        >
          <option value="">All stages</option>
          {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Title / Company</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Pipeline Stage</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                <span className="flex items-center gap-1">AI Score <Info className="w-3 h-3 text-gray-400" /></span>
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Source</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Added</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : allLeads.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No leads found</td></tr>
            ) : (
              allLeads.map((lead: any) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link href={`/leads/${lead.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                      {lead.firstName} {lead.lastName}
                    </Link>
                    <div className="text-xs text-gray-400">{lead.email}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    <div>{lead.title}</div>
                    <div className="text-xs text-gray-400">{lead.company?.name ?? lead.companyName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      title="Update pipeline stage. Automations also update this automatically."
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 max-w-[200px]"
                      value={lead.stage}
                      onChange={e => stageMutation.mutate({ id: lead.id, stage: e.target.value })}
                      disabled={stageMutation.isPending}
                    >
                      {STAGES.map(s => (
                        <option key={s} value={s}>{STAGE_ACTIONS[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    {lead.aiScore != null ? (
                      <div className="flex items-center gap-1">
                        <span className={`font-bold text-sm ${lead.aiScore >= 70 ? 'text-green-600' : lead.aiScore >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                          {lead.aiScore}
                        </span>
                        <span className="text-xs text-gray-400">/100</span>
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs">Not scored</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">{lead.source ?? '—'}</td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => scoreMutation.mutate(lead.id)}
                      disabled={scoreMutation.isPending}
                      title="Score this lead's ICP fit using AI"
                      className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium whitespace-nowrap"
                    >
                      <Zap className="w-3 h-3" /> Run AI Score
                    </button>
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
