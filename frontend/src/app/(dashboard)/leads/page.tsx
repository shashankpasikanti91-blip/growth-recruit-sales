'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '@/lib/api-client';
import Link from 'next/link';
import { TableWrapper } from '@/components/ui/table-wrapper';
import { Users, Search, Zap, Info, ChevronLeft, ChevronRight, Copy, Check, X, AlertCircle, Clock } from 'lucide-react';
import { format, formatDistanceToNow, isAfter } from 'date-fns';
import toast from 'react-hot-toast';

const STAGE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  NEW:         { bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400' },
  CONTACTED:   { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500' },
  QUALIFIED:   { bg: 'bg-purple-50',  text: 'text-purple-700', dot: 'bg-purple-500' },
  PROPOSAL:    { bg: 'bg-yellow-50',  text: 'text-yellow-700', dot: 'bg-yellow-500' },
  NEGOTIATION: { bg: 'bg-orange-50',  text: 'text-orange-700', dot: 'bg-orange-500' },
  CLOSED_WON:  { bg: 'bg-emerald-50', text: 'text-emerald-700',dot: 'bg-emerald-500' },
  CLOSED_LOST: { bg: 'bg-red-50',     text: 'text-red-600',    dot: 'bg-red-400' },
};

const STAGE_LABELS: Record<string, string> = {
  NEW: 'New', CONTACTED: 'Contacted', QUALIFIED: 'Qualified',
  PROPOSAL: 'Proposal', NEGOTIATION: 'Negotiation',
  CLOSED_WON: 'Won', CLOSED_LOST: 'Lost',
};

const STAGE_ACTIONS: Record<string, string> = {
  NEW: 'New', CONTACTED: 'Contacted', QUALIFIED: 'Qualified',
  PROPOSAL: 'Proposal', NEGOTIATION: 'Negotiation',
  CLOSED_WON: 'Closed – Won', CLOSED_LOST: 'Closed – Lost',
};

const STAGES = Object.keys(STAGE_LABELS);

const SOURCES = [
  { value: 'apollo',        label: 'Apollo B2B' },
  { value: 'google_search', label: 'Google Search' },
  { value: 'google_maps',   label: 'Google Maps' },
  { value: 'manual',        label: 'Manual' },
  { value: 'csv',           label: 'CSV Import' },
];

const SCORE_RANGES = [
  { value: '',        label: 'All scores' },
  { value: '70-100',  label: 'High (70+)' },
  { value: '50-69',   label: 'Medium (50–69)' },
  { value: '0-49',    label: 'Low (<50)' },
  { value: 'unscored',label: 'Not scored' },
];

const ROLE_KEYWORDS: Record<string, string[]> = {
  'CEO / Founder':  ['ceo', 'founder', 'co-founder', 'owner', 'president', 'managing director', 'md'],
  'C-Suite':        ['cto', 'coo', 'cmo', 'cfo', 'chief', 'executive'],
  'VP / Director':  ['vp', 'vice president', 'director', 'head of'],
  'Manager':        ['manager', 'lead', 'supervisor'],
  'HR / People':    ['hr', 'human resource', 'recruiter', 'talent', 'people'],
  'Sales / BD':     ['sales', 'business development', 'account', 'revenue', 'bd'],
  'Marketing':      ['marketing', 'growth', 'content', 'brand', 'digital', 'seo'],
  'IT / Tech':      ['it', 'tech', 'engineer', 'developer', 'software'],
  'Finance':        ['finance', 'cfo', 'accountant', 'financial', 'audit'],
};
const ROLE_OPTIONS = Object.keys(ROLE_KEYWORDS);

const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  HIGH:   { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
  MEDIUM: { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  LOW:    { bg: 'bg-gray-100',  text: 'text-gray-600',   border: 'border-gray-200' },
};

export default function LeadsPage() {
  const [search, setSearch]           = useState('');
  const [stage, setStage]             = useState('');
  const [source, setSource]           = useState('');
  const [scoreRange, setScoreRange]   = useState('');
  const [roleFilter, setRoleFilter]   = useState('');
  const [page, setPage]               = useState(1);
  const [copiedId, setCopiedId]       = useState<string | null>(null);
  const queryClient = useQueryClient();

  const scoreParams = (() => {
    if (!scoreRange || scoreRange === 'unscored') return {};
    const [min, max] = scoreRange.split('-').map(Number);
    return { minScore: min, maxScore: max };
  })();

  const { data, isLoading } = useQuery({
    queryKey: ['leads', search, stage, source, scoreRange, roleFilter, page],
    queryFn: () => leadsApi.list({
      search:  search  || undefined,
      stage:   stage   || undefined,
      source:  source  || undefined,
      ...scoreParams,
      page,
      limit: 25,
    }),
    placeholderData: (prev: any) => prev,
  });

  const allLeads: any[] = (data?.data ?? []).filter((l: any) => {
    if (scoreRange === 'unscored') return l.score == null;
    if (roleFilter) {
      const keywords = ROLE_KEYWORDS[roleFilter] ?? [];
      const title = (l.title ?? '').toLowerCase();
      return keywords.some(k => title.includes(k));
    }
    return true;
  });

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => leadsApi.updateStage(id, stage),
    onSuccess: (_: any, vars: any) => {
      toast.success(`Moved to ${STAGE_LABELS[vars.stage] ?? vars.stage}`);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Stage update failed'),
  });

  const scoreMutation = useMutation({
    mutationFn: (id: string) => leadsApi.score(id),
    onSuccess:  (result: any) =>
      toast.success(`ICP Score: ${result.score ?? result.icpFitScore ?? 0}/100 — ${result.nextBestAction ?? result.recommendation ?? 'Score saved'}`, { duration: 5000 }),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'AI scoring failed'),
  });

  const hasFilters = !!(search || stage || source || scoreRange || roleFilter);

  const clearFilters = () => {
    setSearch(''); setStage(''); setSource('');
    setScoreRange(''); setRoleFilter(''); setPage(1);
  };

  const handleCopy = (id: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.meta?.total ?? 0} total leads · client acquisition pipeline
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/leads/generate" className="btn-primary flex items-center gap-1.5">
            <Zap className="w-4 h-4" /> Generate Leads
          </Link>
          <Link href="/leads/new" className="btn-secondary flex items-center gap-1.5">
            <Users className="w-4 h-4" /> Add Lead
          </Link>
        </div>
      </div>

      {/* ── ICP Score info ── */}
      <div className="flex items-start gap-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 text-sm text-purple-800">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-purple-500" />
        <div>
          <span className="font-semibold">ICP Fit Score</span> — Each lead scored 0–100 against your Ideal Customer Profile based on company size, industry, title seniority & engagement.{' '}
          <strong>70+</strong> = strong fit · <strong>50–69</strong> = moderate · <strong>&lt;50</strong> = low priority.
          Click <span className="font-semibold">Score</span> on any row to generate or refresh.
        </div>
      </div>

      {/* ── Pipeline stage summary bar ── */}
      <div className="grid grid-cols-4 lg:grid-cols-7 gap-2">
        {STAGES.map(s => {
          const count = (data?.data ?? []).filter((l: any) => l.stage === s).length;
          const isActive = stage === s;
          const clr = STAGE_COLORS[s];
          return (
            <button
              key={s}
              onClick={() => { setStage(isActive ? '' : s); setPage(1); }}
              className={`rounded-xl border p-3 text-center transition-all cursor-pointer ${
                isActive
                  ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-400 ring-offset-1'
                  : 'border-gray-100 bg-white shadow-sm hover:shadow-md hover:border-gray-200'
              }`}
            >
              <div className={`text-xl font-bold ${isActive ? 'text-brand-700' : 'text-gray-800'}`}>{count}</div>
              <div className={`text-[11px] font-medium mt-0.5 ${isActive ? 'text-brand-600' : 'text-gray-500'}`}>{STAGE_LABELS[s]}</div>
            </button>
          );
        })}
      </div>

      {/* ── Filters ── */}
      <div className="card p-3">
        <div className="flex gap-2.5 flex-wrap items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Search name, email, title, company..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          {/* Stage filter */}
          <select className="input w-40" value={stage} onChange={e => { setStage(e.target.value); setPage(1); }}>
            <option value="">All stages</option>
            {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>
          {/* Source filter */}
          <select className="input w-40" value={source} onChange={e => { setSource(e.target.value); setPage(1); }}>
            <option value="">All sources</option>
            {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {/* Score filter */}
          <select className="input w-40" value={scoreRange} onChange={e => { setScoreRange(e.target.value); setPage(1); }}>
            {SCORE_RANGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {/* Role/Title filter */}
          <select className="input w-44" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
            <option value="">All titles</option>
            {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-3 py-2 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
        {hasFilters && (
          <div className="mt-2 text-xs text-gray-500">
            Showing <span className="font-semibold text-gray-700">{allLeads.length}</span> result{allLeads.length !== 1 ? 's' : ''}
            {stage ? <span> · Stage: <span className="font-medium text-brand-600">{STAGE_LABELS[stage]}</span></span> : null}
            {source ? <span> · Source: <span className="font-medium text-brand-600">{SOURCES.find(s => s.value === source)?.label ?? source}</span></span> : null}
            {scoreRange ? <span> · Score: <span className="font-medium text-brand-600">{SCORE_RANGES.find(s => s.value === scoreRange)?.label}</span></span> : null}
            {roleFilter ? <span> · Role: <span className="font-medium text-brand-600">{roleFilter}</span></span> : null}
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="card p-0 overflow-hidden">
        <TableWrapper>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Lead ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[160px]">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[170px]">Title / Company</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Pipeline Stage</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  <span className="flex items-center gap-1" title="ICP Fit Score — 0–100 match against your Ideal Customer Profile">
                    ICP Score <Info className="w-3 h-3 text-gray-400" />
                  </span>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Source</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Last Contacted</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Next Follow-up</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Date Added</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Last Updated</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={12} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
              ) : allLeads.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center">
                        <Users className="w-7 h-7 text-purple-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">No leads found</p>
                        <p className="text-xs text-gray-400 mt-1">Try adjusting filters or generate new leads</p>
                      </div>
                      <Link href="/leads/generate" className="btn-primary text-xs">
                        <Zap className="w-3.5 h-3.5" /> Generate Leads
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                allLeads.map((lead: any) => {
                  const sc = STAGE_COLORS[lead.stage] ?? STAGE_COLORS['NEW'];
                  return (
                    <tr key={lead.id} className="hover:bg-brand-50/40 transition-colors group">
                      {/* Lead ID */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono text-gray-500 whitespace-nowrap">
                            {lead.businessId ?? lead.id.slice(0, 10)}
                          </span>
                          <button
                            onClick={() => handleCopy(lead.id, lead.businessId ?? lead.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-brand-600 transition-all"
                            title="Copy ID"
                          >
                            {copiedId === lead.id
                              ? <Check className="w-3 h-3 text-green-500" />
                              : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      {/* Name */}
                      <td className="px-4 py-3">
                        <Link href={`/leads/${lead.id}`} className="font-medium text-gray-900 hover:text-brand-600 transition-colors">
                          {lead.firstName} {lead.lastName}
                        </Link>
                        {lead.email && (
                          <div className="text-xs text-gray-400 mt-0.5">{lead.email}</div>
                        )}
                      </td>
                      {/* Title / Company */}
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700">{lead.title ?? <span className="text-gray-300">—</span>}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{lead.company?.name ?? lead.companyName ?? '—'}</div>
                        {lead.industry && <div className="text-xs text-purple-500 mt-0.5 capitalize">{lead.industry.replace(/_/g, ' ')}</div>}
                      </td>
                      {/* Phone */}
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {lead.phone ?? <span className="text-gray-300">—</span>}
                      </td>
                      {/* Priority */}
                      <td className="px-4 py-3">
                        {lead.priority ? (() => {
                          const pc = PRIORITY_COLORS[lead.priority] ?? PRIORITY_COLORS['MEDIUM'];
                          return (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${pc.bg} ${pc.text} ${pc.border}`}>
                              {lead.priority === 'HIGH' && <AlertCircle className="w-3 h-3" />}
                              {lead.priority.charAt(0) + lead.priority.slice(1).toLowerCase()}
                            </span>
                          );
                        })() : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      {/* Pipeline Stage — inline select */}
                      <td className="px-4 py-3">
                        <div className="relative inline-block">
                          <span className={`inline-flex items-center gap-1.5 pr-1 pl-2 py-1 rounded-full text-xs font-medium border ${sc.bg} ${sc.text}`}
                            style={{ borderColor: 'transparent' }}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {STAGE_LABELS[lead.stage]}
                          </span>
                          <select
                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                            value={lead.stage}
                            title="Change pipeline stage"
                            onChange={e => stageMutation.mutate({ id: lead.id, stage: e.target.value })}
                            disabled={stageMutation.isPending}
                          >
                            {STAGES.map(s => (
                              <option key={s} value={s}>{STAGE_ACTIONS[s]}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      {/* ICP Score */}
                      <td className="px-4 py-3">
                        {lead.score != null ? (
                          <div>
                            <span className={`font-bold text-sm ${lead.score >= 70 ? 'text-emerald-600' : lead.score >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                              {lead.score}
                            </span>
                            <span className="text-xs text-gray-400">/100</span>
                            <div className={`text-[10px] mt-0.5 font-medium ${lead.score >= 70 ? 'text-emerald-600' : lead.score >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                              {lead.score >= 70 ? 'High Fit' : lead.score >= 50 ? 'Moderate' : 'Low Fit'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">Not scored</span>
                        )}
                      </td>
                      {/* Source */}
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap capitalize">
                        {(lead.sourceName ?? '—').replace(/_/g, ' ')}
                      </td>
                      {/* Last Contacted */}
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {lead.lastContactedAt ? (
                          <span title={format(new Date(lead.lastContactedAt), 'dd MMM yyyy HH:mm')}>
                            {formatDistanceToNow(new Date(lead.lastContactedAt), { addSuffix: true })}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      {/* Next Follow-up */}
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {lead.nextFollowUpAt ? (() => {
                          const isOverdue = isAfter(new Date(), new Date(lead.nextFollowUpAt));
                          return (
                            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}
                              title={format(new Date(lead.nextFollowUpAt), 'dd MMM yyyy HH:mm')}>
                              {isOverdue && <Clock className="w-3.5 h-3.5 text-red-500" />}
                              {format(new Date(lead.nextFollowUpAt), 'dd MMM yyyy')}
                            </span>
                          );
                        })() : <span className="text-gray-300">—</span>}
                      </td>
                      {/* Date Added */}
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap"
                        title={lead.createdAt ? formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true }) : ''}>
                        {lead.createdAt ? format(new Date(lead.createdAt), 'dd MMM yyyy') : '—'}
                      </td>
                      {/* Last Updated */}
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap"
                        title={lead.updatedAt ? format(new Date(lead.updatedAt), 'dd MMM yyyy HH:mm') : ''}>
                        {lead.updatedAt ? formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true }) : '—'}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => scoreMutation.mutate(lead.id)}
                          disabled={scoreMutation.isPending}
                          title="Run ICP Fit Score using AI"
                          className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium whitespace-nowrap px-2 py-1 rounded-lg hover:bg-purple-50 transition-colors"
                        >
                          <Zap className="w-3 h-3" /> Score
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </TableWrapper>

        {/* Pagination */}
        {data?.meta && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-500">
              Showing {((page - 1) * 25) + 1}–{Math.min(page * 25, data.meta.total)} of {data.meta.total} leads
            </span>
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-brand-400 hover:text-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <span className="text-xs text-gray-500 px-1">Page {page} of {data.meta.totalPages}</span>
              <button
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-brand-400 hover:text-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                disabled={page >= data.meta.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
