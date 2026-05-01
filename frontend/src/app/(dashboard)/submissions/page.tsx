'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { submissionsApi } from '@/lib/api-client';
import Link from 'next/link';
import { TableWrapper } from '@/components/ui/table-wrapper';
import {
  SendHorizonal, Plus, ChevronLeft, ChevronRight, ExternalLink, Filter, LayoutGrid, List,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STAGE_CONFIG: Record<string, { bg: string; text: string; step: number }> = {
  DRAFT:                { bg: 'bg-gray-100',   text: 'text-gray-600',    step: 1 },
  INTERNAL_REVIEW:      { bg: 'bg-slate-50',   text: 'text-slate-700',   step: 2 },
  SUBMITTED_TO_SALES:   { bg: 'bg-blue-50',    text: 'text-blue-700',    step: 3 },
  SUBMITTED_TO_CLIENT:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  step: 4 },
  CLIENT_REVIEW:        { bg: 'bg-violet-50',  text: 'text-violet-700',  step: 5 },
  INTERVIEW:            { bg: 'bg-amber-50',   text: 'text-amber-700',   step: 6 },
  OFFER:                { bg: 'bg-orange-50',  text: 'text-orange-700',  step: 7 },
  JOINED:               { bg: 'bg-emerald-50', text: 'text-emerald-700', step: 8 },
  REJECTED:             { bg: 'bg-red-50',     text: 'text-red-700',     step: 0 },
  WITHDRAWN:            { bg: 'bg-rose-50',    text: 'text-rose-700',    step: 0 },
};
const STAGES = Object.keys(STAGE_CONFIG);

function StageBadge({ stage }: { stage: string }) {
  const c = STAGE_CONFIG[stage] ?? { bg: 'bg-gray-100', text: 'text-gray-500' };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {stage.replace(/_/g, ' ')}
    </span>
  );
}

export default function SubmissionsPage() {
  const [stage, setStage]   = useState('');
  const [page, setPage]     = useState(1);
  const [viewMode, setViewMode] = useState<'table' | 'board'>('table');
  const queryClient = useQueryClient();

  const { data: statsData } = useQuery({
    queryKey: ['submissions-stats'],
    queryFn: submissionsApi.stats,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['submissions', stage, page],
    queryFn: () => submissionsApi.list({ stage: stage || undefined, page, limit: 20 }),
    placeholderData: (prev: any) => prev,
  });

  const { data: boardData, isLoading: boardLoading } = useQuery({
    queryKey: ['submissions-board'],
    queryFn: () => submissionsApi.list({ limit: 200 }),
    enabled: viewMode === 'board',
  });

  const changeStageMutation = useMutation({
    mutationFn: ({ subId, stage: newStage }: { subId: string; stage: string }) =>
      submissionsApi.update(subId, { stage: newStage }),
    onSuccess: () => {
      toast.success('Stage updated');
      queryClient.invalidateQueries({ queryKey: ['submissions-board'] });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to update stage'),
  });

  const items: any[] = data?.items ?? [];
  const total: number = data?.total ?? 0;
  const pages: number = data?.pages ?? 1;
  const stats: any[] = (statsData as any[]) ?? [];

  const boardItems: any[] = boardData?.items ?? [];
  const boardByStage = STAGES.reduce<Record<string, any[]>>((acc, s) => {
    acc[s] = boardItems.filter(item => item.stage === s);
    return acc;
  }, {});

  const fmt = (d?: string | null) => d ? format(new Date(d), 'dd MMM yyyy') : '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <SendHorizonal className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Submissions</h1>
            <p className="text-sm text-gray-500">Candidate submissions to clients across all jobs</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}
              title="Table view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'board' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}
              title="Kanban board"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <Link
            href="/submissions/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> New Submission
          </Link>
        </div>
      </div>

      {/* Stats */}
      {stats.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {stats.map((s: any) => {
            const c = STAGE_CONFIG[s.stage];
            return (
              <button
                key={s.stage}
                onClick={() => setStage(stage === s.stage ? '' : s.stage)}
                className={`px-3 py-2 rounded-xl border text-center transition-all cursor-pointer ${
                  stage === s.stage ? 'border-blue-400 ring-1 ring-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-lg font-bold text-gray-900">{s.count}</div>
                <div className={`text-xs font-medium ${c?.text ?? 'text-gray-500'}`}>{s.stage.replace(/_/g, ' ')}</div>
              </button>
            );
          })}
        </div>
      )}

      {viewMode === 'table' && <>
      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={stage}
          onChange={(e) => { setStage(e.target.value); setPage(1); }}
        >
          <option value="">All Stages</option>
          {STAGES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <TableWrapper>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Candidate', 'Client', 'Job', 'Stage', 'AI Score', 'Submitted', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                    <SendHorizonal className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <div>No submissions found</div>
                  </td>
                </tr>
              ) : (
                items.map((s: any) => {
                  const score: number | null = s.aiMatchScore ?? null;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {s.candidate?.firstName} {s.candidate?.lastName}
                        </div>
                        <div className="text-xs text-gray-400">{s.candidate?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{s.client?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{s.job?.title ?? '—'}</td>
                      <td className="px-4 py-3"><StageBadge stage={s.stage} /></td>
                      <td className="px-4 py-3">
                        {score != null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-14 bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-400'}`}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600 font-medium">{score}%</span>
                          </div>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{fmt(s.submittedAt ?? s.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/submissions/${s.id}`} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">
                          View <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </TableWrapper>
        {pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">Total: {total} submissions</span>
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
      </>}

      {viewMode === 'board' && (
        <div className="overflow-x-auto -mx-1 px-1 pb-4">
          <div className="flex gap-3" style={{ minWidth: `${STAGES.length * 216}px` }}>
            {STAGES.map(s => {
              const c = STAGE_CONFIG[s];
              return (
                <div key={s} className="w-52 flex-shrink-0">
                  <div className={`mb-2 px-2.5 py-1.5 rounded-lg flex items-center justify-between ${c.bg}`}>
                    <span className={`text-xs font-semibold uppercase tracking-wide ${c.text}`}>
                      {s.replace(/_/g, ' ')}
                    </span>
                    <span className={`text-xs font-bold ${c.text}`}>{boardByStage[s].length}</span>
                  </div>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-0.5">
                    {boardLoading
                      ? Array.from({ length: 2 }).map((_, i) => (
                          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                        ))
                      : boardByStage[s].length === 0
                      ? <div className="py-4 text-center text-gray-300 text-xs">—</div>
                      : boardByStage[s].map(sub => (
                          <div key={sub.id} className="p-3 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="font-medium text-sm text-gray-900 truncate">
                              {sub.candidate?.firstName} {sub.candidate?.lastName}
                            </div>
                            {sub.candidate?.currentTitle && (
                              <div className="text-xs text-gray-400 truncate">{sub.candidate.currentTitle}</div>
                            )}
                            <div className="text-xs text-gray-500 mt-1 truncate">{sub.job?.title ?? '—'}</div>
                            <div className="text-xs text-gray-400 truncate">{sub.client?.name ?? '—'}</div>
                            {sub.aiMatchScore != null && (
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <div className="flex-1 bg-gray-100 rounded-full h-1">
                                  <div
                                    className={`h-1 rounded-full ${sub.aiMatchScore >= 80 ? 'bg-emerald-500' : sub.aiMatchScore >= 60 ? 'bg-amber-500' : 'bg-red-400'}`}
                                    style={{ width: `${sub.aiMatchScore}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500">{sub.aiMatchScore}%</span>
                              </div>
                            )}
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-xs text-gray-400">{fmt(sub.submittedAt ?? sub.createdAt)}</span>
                              <Link href={`/submissions/${sub.id}`} className="text-gray-400 hover:text-blue-600">
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            </div>
                            <select
                              className="mt-2 w-full text-xs border border-gray-100 rounded-lg px-1.5 py-1 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={sub.stage}
                              onChange={e => changeStageMutation.mutate({ subId: sub.id, stage: e.target.value })}
                              disabled={changeStageMutation.isPending}
                            >
                              {STAGES.map(st => (
                                <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
                              ))}
                            </select>
                          </div>
                        ))
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
