'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { opportunitiesApi } from '@/lib/api-client';
import Link from 'next/link';
import { TableWrapper } from '@/components/ui/table-wrapper';
import { DeskShell, DeskTableSection, zebraRow, DESK_TH, DeskPageHeader } from '@/components/ui/desk-shell';
import {
  TrendingUp, Search, Plus, ChevronLeft, ChevronRight,
  DollarSign, Calendar, Target, ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';

const STAGE_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  DISCOVERY:     { bg: 'bg-gray-100',    text: 'text-gray-600',    dot: 'bg-gray-400' },
  PROPOSAL:      { bg: 'bg-blue-50',     text: 'text-blue-700',    dot: 'bg-blue-500' },
  NEGOTIATION:   { bg: 'bg-violet-50',   text: 'text-violet-700',  dot: 'bg-violet-500' },
  VERBAL_COMMIT: { bg: 'bg-amber-50',    text: 'text-amber-700',   dot: 'bg-amber-500' },
  CLOSED_WON:    { bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500' },
  CLOSED_LOST:   { bg: 'bg-red-50',      text: 'text-red-700',     dot: 'bg-red-400' },
  ON_HOLD:       { bg: 'bg-orange-50',   text: 'text-orange-700',  dot: 'bg-orange-500' },
};
const STAGES = Object.keys(STAGE_CONFIG);

function StageBadge({ stage }: { stage: string }) {
  const c = STAGE_CONFIG[stage] ?? STAGE_CONFIG.DISCOVERY;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {stage.replace('_', ' ')}
    </span>
  );
}

export default function OpportunitiesPage() {
  const [search, setSearch] = useState('');
  const [stage, setStage]   = useState('');
  const [page, setPage]     = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['opportunities', search, stage, page],
    queryFn: () => opportunitiesApi.list({ stage: stage || undefined, page, limit: 20 }),
    placeholderData: (prev: any) => prev,
  });

  const { data: pipeline } = useQuery({
    queryKey: ['opportunities-pipeline'],
    queryFn: opportunitiesApi.pipeline,
  });

  const items: any[] = data?.items ?? [];
  const total: number = data?.total ?? 0;
  const pages: number = data?.pages ?? 1;

  const fmt = (d?: string | null) => d ? format(new Date(d), 'dd MMM yyyy') : '—';

  return (
    <div className="space-y-6">
      <DeskPageHeader
        icon={TrendingUp}
        title="Opportunities"
        subtitle="Track deals, weighted probability, and expected close dates across client accounts."
        accentClassName="bg-violet-700"
        actions={
          <Link href="/opportunities/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Opportunity
          </Link>
        }
      />

      {pipeline && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Pipeline overview</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {(pipeline as any[]).map((p: any) => {
              const c = STAGE_CONFIG[p.stage];
              return (
                <div
                  key={p.stage}
                  onClick={() => setStage(stage === p.stage ? '' : p.stage)}
                  className={`min-w-[120px] p-3 rounded-xl border cursor-pointer transition-all shadow-sm ${
                    stage === p.stage ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-300'
                  } ${c.bg}`}
                >
                  <div className="text-lg font-bold text-gray-900">{p.count}</div>
                  <div className={`text-xs font-medium ${c.text}`}>{p.stage.replace('_', ' ')}</div>
                  {p.totalValue > 0 && (
                    <div className="text-xs text-gray-500 mt-1">${p.totalValue.toLocaleString()}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Stage</span>
        <select
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[180px]"
          value={stage}
          onChange={(e) => { setStage(e.target.value); setPage(1); }}
        >
          <option value="">All Stages</option>
          {STAGES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      <DeskShell
        title="Deal register"
        subtitle="Opportunity-level grid with value and probability — same records and detail routes as before."
      >
        <DeskTableSection>
        <TableWrapper>
          <table className="w-full text-sm min-w-[1000px]">
            <thead className="sticky top-0 z-20 shadow-sm">
              <tr>
                {['Opportunity', 'Client', 'Stage', 'Value', 'Probability', 'Close Date', 'Created', 'Actions'].map(h => (
                  <th key={h} className={DESK_TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-gray-400">
                    <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <div>No opportunities found</div>
                  </td>
                </tr>
              ) : (
                items.map((o: any, rowIdx: number) => (
                  <tr key={o.id} className={zebraRow(rowIdx) + ' hover:bg-blue-50/50 transition-colors'}>
                    <td className="px-4 py-3">
                      <Link href={`/opportunities/${o.id}`} className="font-medium text-gray-900 hover:text-blue-600">{o.title}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{o.client?.name ?? '—'}</td>
                    <td className="px-4 py-3"><StageBadge stage={o.stage} /></td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {o.value ? `${o.currency} ${Number(o.value).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5 w-16">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${o.probability}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{o.probability}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmt(o.expectedCloseDate)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmt(o.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/opportunities/${o.id}`} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">
                        View <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableWrapper>
        {pages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <span className="text-sm text-slate-500">Total: {total} opportunities</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-slate-700">{page}/{pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        </DeskTableSection>
      </DeskShell>
    </div>
  );
}
