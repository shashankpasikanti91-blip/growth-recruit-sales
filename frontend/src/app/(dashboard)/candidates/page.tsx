'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { candidatesApi } from '@/lib/api-client';
import Link from 'next/link';
import { UserPlus, Search, Briefcase, Copy, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

  const { data, isLoading } = useQuery({
    queryKey: ['candidates', search, roleFilter, page],
    queryFn: () => candidatesApi.list({ search: search || undefined, page, limit: 20 }),
    placeholderData: (prev) => prev,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
          <p className="text-gray-500 mt-1">{data?.meta?.total ?? 0} total candidates</p>
        </div>
        <Link href="/candidates/new" className="btn-primary">
          <UserPlus className="w-4 h-4" /> Add Candidate
        </Link>
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
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="input w-52"
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
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
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Title / Company</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Applications</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider" title="Match Score — candidate fit for a specific role (0–100). Analyzes skill match, experience relevance, role alignment, and stability. Different from ICP Fit Score used for leads.">Match Score</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : filteredData.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No candidates found{roleFilter ? ` for "${roleFilter}"` : ''}</td></tr>
            ) : (
              filteredData.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <button
                      onClick={() => { navigator.clipboard.writeText(c.businessId ?? c.id); setCopiedId(c.id); setTimeout(() => setCopiedId(null), 2000); }}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand-600 font-mono"
                      title="Click to copy Business ID"
                    >
                      {c.businessId ?? c.id.slice(0, 8) + '…'}
                      {copiedId === c.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/candidates/${c.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                      {c.firstName} {c.lastName}
                    </Link>
                    <div className="text-xs text-gray-400">{c.email ?? '—'}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    <div>{c.currentTitle ?? '—'}</div>
                    <div className="text-xs text-gray-400">{c.currentCompany ?? '—'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/candidates/${c.id}`} className="flex items-center gap-1 text-sm text-gray-600 hover:text-brand-600">
                      <Briefcase className="w-3.5 h-3.5" />
                      {c._count?.applications ?? 0} job{(c._count?.applications ?? 0) !== 1 ? 's' : ''}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    {c.scorecards?.[0]?.score != null ? (
                      <div>
                        <span className={`font-semibold ${c.scorecards[0].score >= 75 ? 'text-green-600' : c.scorecards[0].score >= 55 ? 'text-amber-600' : 'text-red-500'}`}>
                          {c.scorecards[0].score}<span className="text-xs font-normal text-gray-400">/100</span>
                        </span>
                        <div className="text-xs text-gray-400">{c.scorecards[0].score >= 75 ? 'Shortlisted' : c.scorecards[0].score >= 55 ? 'KIV' : 'Rejected'}</div>
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {data?.meta && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50">
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
