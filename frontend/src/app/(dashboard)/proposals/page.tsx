'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { proposalsApi } from '@/lib/api-client';
import Link from 'next/link';
import { TableWrapper } from '@/components/ui/table-wrapper';
import { DeskShell, DeskTableSection, zebraRow, DESK_TH, DeskPageHeader } from '@/components/ui/desk-shell';
import {
  ScrollText, Plus, ChevronLeft, ChevronRight, ExternalLink, DollarSign,
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
  DRAFT:        { bg: 'bg-gray-100',   text: 'text-gray-600' },
  SENT:         { bg: 'bg-blue-50',    text: 'text-blue-700' },
  UNDER_REVIEW: { bg: 'bg-indigo-50',  text: 'text-indigo-700' },
  ACCEPTED:     { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  REJECTED:     { bg: 'bg-red-50',     text: 'text-red-700' },
  REVISED:      { bg: 'bg-amber-50',   text: 'text-amber-700' },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{status}</span>;
}

export default function ProposalsPage() {
  const [status, setStatus] = useState('');
  const [page, setPage]     = useState(1);

  const { data: statsData } = useQuery({
    queryKey: ['proposals-stats'],
    queryFn: () => proposalsApi.stats(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['proposals', status, page],
    queryFn: () => proposalsApi.list({ status: status || undefined, page, limit: 20 }),
    placeholderData: (prev: any) => prev,
  });

  const items: any[] = data?.items ?? [];
  const total: number = data?.total ?? 0;
  const pages: number = data?.pages ?? 1;
  const stats: any[] = (statsData as any[]) ?? [];

  const totalValue = stats.reduce((sum: number, s: any) => sum + s.totalValue, 0);

  const fmt = (d?: string | null) => d ? format(new Date(d), 'dd MMM yyyy') : '—';

  return (
    <div className="space-y-6">
      <DeskPageHeader
        icon={ScrollText}
        title="Proposals"
        subtitle="Commercial documents — statuses, values, and dates behave as before."
        accentClassName="bg-indigo-700"
        actions={
          <Link href="/proposals/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Proposal
          </Link>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-2xl font-bold text-slate-900">{total}</div>
          <div className="text-sm text-slate-500 mt-0.5 font-medium">Total proposals</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">
          <div className="text-2xl font-bold text-emerald-700">
            {stats.find((s: any) => s.status === 'ACCEPTED')?.count ?? 0}
          </div>
          <div className="text-sm text-emerald-800 mt-0.5 font-medium">Accepted</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1 text-2xl font-bold text-slate-900">
            <DollarSign className="w-5 h-5 text-slate-400" />
            {totalValue.toLocaleString()}
          </div>
          <div className="text-sm text-slate-500 mt-0.5 font-medium">Pipeline value</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1 text-2xl font-bold text-emerald-700">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            {(stats.find((s: any) => s.status === 'ACCEPTED')?.totalValue ?? 0).toLocaleString()}
          </div>
          <div className="text-sm text-slate-500 mt-0.5 font-medium">Accepted value</div>
        </div>
      </div>

      {/* Status Filter Strips */}
      {stats.length > 0 && (
        <div className="flex gap-2 flex-wrap rounded-xl border border-slate-200 bg-slate-50/50 p-2">
          {stats.map((s: any) => (
            <button
              key={s.status}
              onClick={() => setStatus(status === s.status ? '' : s.status)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all shadow-sm ${
                status === s.status ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
              }`}
            >
              {s.status} ({s.count})
            </button>
          ))}
        </div>
      )}

      <DeskShell
        title="Proposal register"
        subtitle="Dense list with horizontal scroll when needed — detail routes unchanged."
      >
        <DeskTableSection>
        <TableWrapper>
          <table className="w-full text-sm min-w-[900px]">
            <thead className="sticky top-0 z-20 shadow-sm">
              <tr>
                {['Title', 'Client / Lead', 'Status', 'Value', 'Sent', 'Valid Until', 'Actions'].map(h => (
                  <th key={h} className={DESK_TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                    <ScrollText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <div>No proposals found</div>
                  </td>
                </tr>
              ) : (
                items.map((p: any, rowIdx: number) => (
                  <tr key={p.id} className={zebraRow(rowIdx) + ' hover:bg-blue-50/50 transition-colors'}>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{p.title}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.client?.name ?? (p.lead ? `${p.lead.firstName} ${p.lead.lastName}` : '—')}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {p.value ? `${p.currency ?? 'USD'} ${Number(p.value).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmt(p.sentAt)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmt(p.validUntil)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/proposals/${p.id}`} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">
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
            <span className="text-sm text-slate-500">Total: {total} proposals</span>
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
