'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '@/lib/api-client';
import Link from 'next/link';
import {
  Handshake, Search, Plus, ChevronLeft, ChevronRight,
  Building2, Globe, MapPin, ExternalLink, ArrowRightLeft,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  ACTIVE:   { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  INACTIVE: { bg: 'bg-gray-100',   text: 'text-gray-600',    dot: 'bg-gray-400' },
  PROSPECT: { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  ON_HOLD:  { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  CLOSED:   { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-400' },
};

const STATUS_OPTIONS = ['ACTIVE', 'PROSPECT', 'ON_HOLD', 'INACTIVE', 'CLOSED'];

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.INACTIVE;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status.replace('_', ' ')}
    </span>
  );
}

export default function ClientsPage() {
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [page, setPage]       = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search, status, page],
    queryFn: () => clientsApi.list({ search: search || undefined, status: status || undefined, page, limit: 20 }),
    placeholderData: (prev: any) => prev,
  });

  const { data: stats } = useQuery({
    queryKey: ['clients-stats'],
    queryFn: clientsApi.stats,
  });

  const clients: any[] = data?.items ?? [];
  const total: number  = data?.total ?? 0;
  const pages: number  = data?.pages ?? 1;

  const fmt = (d?: string | Date | null) =>
    d ? format(new Date(d), 'dd MMM yyyy') : '—';

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Handshake className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Clients</h1>
            <p className="text-sm text-gray-500">Manage client accounts and relationships</p>
          </div>
        </div>
        <Link
          href="/clients/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Client
        </Link>
      </div>

      {/* ── Stats Row ─────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Clients',  value: stats.total,        color: 'text-gray-900' },
            { label: 'Active',         value: stats.active,       color: 'text-emerald-600' },
            { label: 'New (30 days)',  value: stats.newThis30Days,color: 'text-blue-600' },
            { label: 'Prospects',      value: stats.pending,      color: 'text-amber-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search clients…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Client', 'Industry', 'Location', 'Status', 'JDs', 'Submissions', 'Created', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-gray-400">
                    <Handshake className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <div className="font-medium">No clients yet</div>
                    <div className="text-xs mt-1">Convert a lead or company to get started</div>
                  </td>
                </tr>
              ) : (
                clients.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    {/* Client */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <Link href={`/clients/${c.id}`} className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                            {c.name}
                          </Link>
                          {c.website && (
                            <a href={c.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 mt-0.5">
                              <Globe className="w-3 h-3" />{c.website.replace(/^https?:\/\//, '')}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Industry */}
                    <td className="px-4 py-3 text-gray-600">{c.industry ?? '—'}</td>
                    {/* Location */}
                    <td className="px-4 py-3">
                      {c.city || c.countryCode ? (
                        <span className="flex items-center gap-1 text-gray-600">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {[c.city, c.countryCode].filter(Boolean).join(', ')}
                        </span>
                      ) : '—'}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    {/* JDs */}
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                        {c._count?.jobs ?? 0}
                      </span>
                    </td>
                    {/* Submissions */}
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-50 text-purple-700 text-xs font-bold">
                        {c._count?.submissions ?? 0}
                      </span>
                    </td>
                    {/* Created */}
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(c.createdAt)}</td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <Link
                        href={`/clients/${c.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-700">{page} / {pages}</span>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
