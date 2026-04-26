'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { candidatesApi } from '@/lib/api-client';
import Link from 'next/link';
import { UserPlus, Search, Briefcase, Copy, Check, X, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { BulkScreenModal } from '@/components/candidates/BulkScreenModal';

const STAGE_BADGE: Record<string, string> = {
  SOURCED: 'badge-gray', SCREENED: 'badge-purple', INTERVIEWING: 'badge-blue',
  OFFERED: 'badge-green', PLACED: 'badge-green', REJECTED: 'badge-red', WITHDRAWN: 'badge-yellow',
};

const ROLE_FILTERS = [
  'Engineer / Developer',
  'Manager / Director',
  'Analyst',
  'Sales / BD',
  'HR / Recruitment',
  'Marketing',
  'Finance / Accounting',
  'Operations',
  'Designer / Creative',
  'Executive / C-Suite',
  'Other',
];

export default function CandidatesPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkScreen, setShowBulkScreen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['candidates', search, roleFilter, page],
    queryFn: () => candidatesApi.list({ search: search || undefined, page, limit: 20 }),
    placeholderData: (prev: any) => prev,
  });

  // Client-side role filter applied on top of search results
  const ROLE_KEYWORDS: Record<string, string[]> = {
    'Engineer / Developer': ['engineer', 'developer', 'dev', 'software', 'programmer', 'architect', 'devops', 'sre', 'fullstack', 'frontend', 'backend'],
    'Manager / Director': ['manager', 'director', 'head of', 'lead', 'supervisor'],
    'Analyst': ['analyst', 'analysis', 'data', 'business analyst', 'research'],
    'Sales / BD': ['sales', 'business development', 'account executive', 'bd', 'revenue'],
    'HR / Recruitment': ['hr', 'human resource', 'recruiter', 'talent', 'people'],
    'Marketing': ['marketing', 'growth', 'seo', 'content', 'brand', 'digital'],
    'Finance / Accounting': ['finance', 'accounting', 'accountant', 'cfo', 'financial', 'audit'],
    'Operations': ['operations', 'ops', 'logistics', 'supply chain', 'procurement'],
    'Designer / Creative': ['designer', 'design', 'ux', 'ui', 'creative', 'graphic'],
    'Executive / C-Suite': ['ceo', 'cto', 'coo', 'cmo', 'chief', 'president', 'founder', 'executive'],
    'Other': [],
  };

  const filteredData = (() => {
    if (!roleFilter || !data?.data) return data?.data ?? [];
    const keywords = ROLE_KEYWORDS[roleFilter] ?? [];
    if (keywords.length === 0) {
      // "Other" = doesn't match any known keyword set
      const allKeywords = Object.values(ROLE_KEYWORDS).flat();
      return data.data.filter((c: any) => {
        const title = (c.currentTitle ?? '').toLowerCase();
        return !allKeywords.some(k => title.includes(k));
      });
    }
    return data.data.filter((c: any) => {
      const title = (c.currentTitle ?? '').toLowerCase();
      return keywords.some(k => title.includes(k));
    });
  })();

  return (
    <div className="space-y-6">
      {showBulkScreen && (
        <BulkScreenModal
          selectedCandidates={filteredData.filter((c: any) => selectedIds.has(c.id))}
          onClose={() => setShowBulkScreen(false)}
        />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
          <p className="text-gray-500 mt-1">{data?.meta?.total ?? 0} total candidates</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowBulkScreen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Screen {selectedIds.size} against JD
            </button>
          )}
          <Link href="/candidates/new" className="btn-secondary">
            <UserPlus className="w-4 h-4" /> Add Candidate
          </Link>
        </div>
      </div>

      {/* Search + Role Filter */}
      <div className="card p-4 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Search by name, email, title, company..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="input w-52"
            value={roleFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setRoleFilter(e.target.value); setPage(1); }}
          >
            <option value="">All roles / titles</option>
            {ROLE_FILTERS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {(search || roleFilter) && (
            <button
              onClick={() => { setSearch(''); setRoleFilter(''); setPage(1); }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-3 py-2 border border-gray-200 rounded-lg"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
        {roleFilter && (
          <div className="flex flex-wrap gap-2">
            {ROLE_FILTERS.map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(roleFilter === r ? '' : r)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${roleFilter === r ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-200 text-gray-600 hover:border-brand-400 hover:text-brand-600'}`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
        {!roleFilter && (
          <div className="flex flex-wrap gap-2">
            {ROLE_FILTERS.map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-brand-400 hover:text-brand-600 transition-colors"
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {roleFilter && (
          <div className="px-6 py-2 bg-brand-50 border-b border-brand-100 text-xs text-brand-700 font-medium">
            Showing {filteredData.length} candidate{filteredData.length !== 1 ? 's' : ''} matching &ldquo;{roleFilter}&rdquo;
          </div>
        )}
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  checked={filteredData.length > 0 && filteredData.every((c: any) => selectedIds.has(c.id))}
                  onChange={e => {
                    if (e.target.checked) setSelectedIds(new Set(filteredData.map((c: any) => c.id)));
                    else setSelectedIds(new Set());
                  }}
                  title="Select all"
                />
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[160px]">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[160px]">Title / Company</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Phone</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Nationality / Visa</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Source</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Applications</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap" title="Match Score — candidate fit for a specific role (0–100). Analyzes skill match, experience relevance, role alignment, and stability.">Match Score</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Date Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={11} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : filteredData.length === 0 ? (
              <tr><td colSpan={11} className="px-6 py-12 text-center text-gray-400">No candidates found{roleFilter ? ` for "${roleFilter}"` : ''}</td></tr>
            ) : (
              filteredData.map((c: any) => (
                <tr key={c.id} className={`hover:bg-brand-50/40 transition-colors group ${selectedIds.has(c.id) ? 'bg-brand-50/60' : ''}`}>
                  {/* Checkbox */}
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      checked={selectedIds.has(c.id)}
                      onChange={e => {
                        const next = new Set(selectedIds);
                        e.target.checked ? next.add(c.id) : next.delete(c.id);
                        setSelectedIds(next);
                      }}
                    />
                  </td>
                  {/* ID */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { navigator.clipboard.writeText(c.businessId ?? c.id); setCopiedId(c.id); setTimeout(() => setCopiedId(null), 2000); }}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-600 font-mono group/btn"
                      title="Click to copy ID"
                    >
                      <span className="whitespace-nowrap">{c.businessId ?? c.id.slice(0, 12) + '…'}</span>
                      {copiedId === c.id
                        ? <Check className="w-3 h-3 text-green-500 shrink-0" />
                        : <Copy className="w-3 h-3 opacity-0 group-hover/btn:opacity-100 transition-opacity shrink-0" />}
                    </button>
                  </td>
                  {/* Name */}
                  <td className="px-4 py-3">
                    <Link href={`/candidates/${c.id}`} className="font-medium text-gray-900 hover:text-brand-600 transition-colors">
                      {c.firstName} {c.lastName}
                    </Link>
                    <div className="text-xs text-gray-400 mt-0.5">{c.email ?? '—'}</div>
                  </td>
                  {/* Title / Company */}
                  <td className="px-4 py-3 text-gray-600">
                    <div className="text-sm">{c.currentTitle ?? <span className="text-gray-300">—</span>}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{c.currentCompany ?? '—'}</div>
                  </td>
                  {/* Phone */}
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {c.phone ?? <span className="text-gray-300">—</span>}
                  </td>
                  {/* Location */}
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {c.location ?? <span className="text-gray-300">—</span>}
                  </td>
                  {/* Nationality / Visa */}
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600">{c.nationality ?? <span className="text-gray-300">—</span>}</div>
                    {c.visaStatus && (
                      <span className={`inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        c.visaStatus === 'CITIZEN' || c.visaStatus === 'PR'
                          ? 'bg-emerald-50 text-emerald-700'
                          : c.visaStatus === 'VALID'
                          ? 'bg-blue-50 text-blue-700'
                          : c.visaStatus === 'EXPIRING_SOON'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {c.visaType ? `${c.visaType} · ` : ''}{c.visaStatus.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  {/* Source */}
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {c.sourceName ?? <span className="text-gray-300">—</span>}
                  </td>
                  {/* Applications */}
                  <td className="px-4 py-3">
                    <Link href={`/candidates/${c.id}`} className="flex items-center gap-1 text-sm text-gray-600 hover:text-brand-600">
                      <Briefcase className="w-3.5 h-3.5" />
                      {c._count?.applications ?? 0}
                    </Link>
                  </td>
                  {/* Match Score */}
                  <td className="px-4 py-3">
                    {c.scorecards?.[0]?.score != null ? (
                      <div>
                        <span className={`font-semibold text-sm ${c.scorecards[0].score >= 75 ? 'text-green-600' : c.scorecards[0].score >= 55 ? 'text-amber-600' : 'text-red-500'}`}>
                          {c.scorecards[0].score}<span className="text-xs font-normal text-gray-400">/100</span>
                        </span>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {c.scorecards[0].score >= 75 ? 'Shortlisted' : c.scorecards[0].score >= 55 ? 'KIV' : 'Rejected'}
                        </div>
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  {/* Date Added */}
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap"
                    title={c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }) : ''}>
                    {c.createdAt ? format(new Date(c.createdAt), 'dd MMM yyyy') : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        {/* Pagination */}
        {data?.meta && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-500">
              Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, data.meta.total)} of {data.meta.total} candidates
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
