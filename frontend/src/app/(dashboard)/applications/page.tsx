'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, User, Briefcase, Calendar, Search, ChevronLeft, ChevronRight, ArrowUpDown, Filter, X } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

type Application = {
  id: string;
  businessId?: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  matchScore?: number | null;
  candidate: { id: string; firstName: string; lastName: string; email: string } | null;
  job: { id: string; title: string } | null;
};

const PIPELINE_STAGES = ['APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEWING', 'OFFERED', 'REJECTED', 'WITHDRAWN'];

const STATUS_COLORS: Record<string, string> = {
  APPLIED:      'bg-blue-100 text-blue-700',
  SCREENING:    'bg-yellow-100 text-yellow-700',
  SHORTLISTED:  'bg-purple-100 text-purple-700',
  INTERVIEWING: 'bg-indigo-100 text-indigo-700',
  OFFERED:      'bg-green-100 text-green-700',
  REJECTED:     'bg-red-100 text-red-600',
  WITHDRAWN:    'bg-gray-100 text-gray-500',
  SOURCED:      'bg-gray-100 text-gray-600',
  SCREENED:     'bg-yellow-100 text-yellow-700',
  PLACED:       'bg-teal-100 text-teal-700',
};

const STATUS_LABELS: Record<string, string> = {
  APPLIED: 'Applied', SCREENING: 'Screening', SHORTLISTED: 'Shortlisted',
  INTERVIEWING: 'Interviewing', OFFERED: 'Offered', REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn', SOURCED: 'Applied', SCREENED: 'Screening', PLACED: 'Placed',
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function displayStage(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

// Normalise stage keys for filtering (SOURCED → APPLIED, SCREENED → SCREENING)
const normalise = (s: string) => ({ SOURCED: 'APPLIED', SCREENED: 'SCREENING' }[s] ?? s);

export default function ApplicationsPage() {
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const [page, setPage] = useState(1);

  // Fetch jobs for filter dropdown
  const { data: jobsData } = useQuery({
    queryKey: ['jobs-list'],
    queryFn: async () => {
      const { data } = await api.get('/jobs', { params: { limit: 100 } });
      return Array.isArray(data) ? data : data?.data ?? [];
    },
    staleTime: 60000,
  });

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    clearTimeout((window as any).__appSearchTimer);
    (window as any).__appSearchTimer = setTimeout(() => setDebouncedSearch(value), 300);
  };

  const handleStageFilter = (stage: string) => {
    setFilter(stage);
    setPage(1);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['applications', filter, debouncedSearch, jobFilter, page],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit: 20 };
      if (filter !== 'ALL') params.stage = filter;
      if (debouncedSearch) params.search = debouncedSearch;
      if (jobFilter) params.jobId = jobFilter;
      const { data } = await api.get('/applications', { params });
      // Handle both old array response and new paginated response
      if (Array.isArray(data)) {
        const items = data.filter((a: Application) => a.candidate || a.job);
        return { data: items, meta: { total: items.length, page: 1, limit: items.length, totalPages: 1 } };
      }
      return data;
    },
  });

  const applications: Application[] = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, totalPages: 1 };

  // Count all applications (without filter) for stage tabs — use total when filter is ALL
  const { data: allData } = useQuery({
    queryKey: ['applications', 'counts'],
    queryFn: async () => {
      const { data } = await api.get('/applications', { params: { limit: 1000 } });
      const items = Array.isArray(data) ? data : data?.data ?? [];
      const counts: Record<string, number> = { ALL: items.length };
      PIPELINE_STAGES.forEach(s => { counts[s] = items.filter((a: Application) => normalise(a.status) === s).length; });
      return counts;
    },
    staleTime: 30000,
  });
  const counts = allData ?? {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-500 text-sm mt-1">
            Track every candidate-job application across your pipeline stages.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <ClipboardList className="w-4 h-4" />
          <span className="font-semibold text-gray-700">{meta.total}</span> total
        </div>
      </div>

      {/* Search + Job filter */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by candidate name, email, or job title..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-[180px]"
          value={jobFilter}
          onChange={e => { setJobFilter(e.target.value); setPage(1); }}
        >
          <option value="">All jobs</option>
          {(jobsData ?? []).map((j: any) => (
            <option key={j.id} value={j.id}>{j.title}</option>
          ))}
        </select>
        {(search || jobFilter) && (
          <button
            onClick={() => { setSearch(''); setDebouncedSearch(''); setJobFilter(''); setPage(1); }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-3 py-2.5 border border-gray-200 rounded-lg"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Pipeline stage tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => handleStageFilter('ALL')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === 'ALL' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          All ({counts.ALL ?? meta.total})
        </button>
        {PIPELINE_STAGES.map((s) => (
          <button
            key={s}
            onClick={() => handleStageFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {STATUS_LABELS[s]} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      {/* Applications table */}
      {applications.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-base font-medium text-gray-500">No applications found</p>
          <p className="text-sm mt-1">
            {debouncedSearch ? 'Try adjusting your search terms.' : 'Applications will appear here as candidates move through the pipeline.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Job</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Match Score</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Applied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-gray-400">
                      {app.businessId ?? app.id.slice(0, 8) + '…'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-3.5 h-3.5 text-brand-600" />
                      </div>
                      <div>
                        {app.candidate ? (
                          <Link href={`/candidates/${app.candidate.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                            {`${app.candidate.firstName ?? ''} ${app.candidate.lastName ?? ''}`.trim() || '—'}
                          </Link>
                        ) : (
                          <div className="font-medium text-gray-900">—</div>
                        )}
                        <div className="text-xs text-gray-400">{app.candidate?.email ?? '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-700">
                      <Briefcase className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span>{app.job?.title ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[app.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {displayStage(app.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {app.matchScore != null ? (
                      <span className={`font-semibold text-sm ${app.matchScore >= 75 ? 'text-green-600' : app.matchScore >= 55 ? 'text-amber-600' : 'text-red-500'}`}>
                        {app.matchScore}
                        <span className="text-xs text-gray-400 font-normal ml-0.5">/100</span>
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300 italic">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      {formatDate(app.createdAt)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-500">
                Page {meta.page} of {meta.totalPages} ({meta.total} total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
