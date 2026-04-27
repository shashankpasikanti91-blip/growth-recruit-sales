'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { proposalsApi } from '@/lib/api-client';
import Link from 'next/link';
import { TableWrapper } from '@/components/ui/table-wrapper';
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <ScrollText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Proposals</h1>
            <p className="text-sm text-gray-500">Manage client proposals and contracts</p>
          </div>
        </div>
        <Link
          href="/proposals/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> New Proposal
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{total}</div>
          <div className="text-sm text-gray-500 mt-0.5">Total Proposals</div>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
          <div className="text-2xl font-bold text-emerald-700">
            {stats.find((s: any) => s.status === 'ACCEPTED')?.count ?? 0}
          </div>
          <div className="text-sm text-emerald-600 mt-0.5">Accepted</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-1 text-2xl font-bold text-gray-900">
            <DollarSign className="w-5 h-5 text-gray-400" />
            {totalValue.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 mt-0.5">Total Pipeline Value</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-1 text-2xl font-bold text-emerald-700">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            {(stats.find((s: any) => s.status === 'ACCEPTED')?.totalValue ?? 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 mt-0.5">Accepted Value</div>
        </div>
      </div>

      {/* Status Filter Strips */}
      {stats.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {stats.map((s: any) => (
            <button
              key={s.status}
              onClick={() => setStatus(status === s.status ? '' : s.status)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                status === s.status ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
              }`}
            >
              {s.status} ({s.count})
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <TableWrapper>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Title', 'Client / Lead', 'Status', 'Value', 'Sent', 'Valid Until', 'Actions'].map(h => (
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
                    <ScrollText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <div>No proposals found</div>
                  </td>
                </tr>
              ) : (
                items.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50">
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
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">Total: {total} proposals</span>
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
    </div>
  );
}
