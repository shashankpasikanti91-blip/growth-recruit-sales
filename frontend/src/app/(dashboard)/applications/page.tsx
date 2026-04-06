'use client';
import { useEffect, useState } from 'react';
import { ClipboardList, User, Briefcase, Calendar, ChevronRight, ArrowUpDown } from 'lucide-react';
import api from '@/lib/api';

type Application = {
  id: string;
  businessId?: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  matchScore?: number | null;
  candidate: { firstName: string; lastName: string; email: string } | null;
  job: { title: string } | null;
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
  // Legacy stage names from DB (Prisma enum)
  SOURCED:      'bg-gray-100 text-gray-600',
  SCREENED:     'bg-yellow-100 text-yellow-700',
  PLACED:       'bg-teal-100 text-teal-700',
};

const STATUS_LABELS: Record<string, string> = {
  APPLIED: 'Applied', SCREENING: 'Screening', SHORTLISTED: 'Shortlisted',
  INTERVIEWING: 'Interviewing', OFFERED: 'Offered', REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn', SOURCED: 'Applied', SCREENED: 'Screening', PLACED: 'Placed',
};

// Safe date formatter — never returns "Invalid Date"
function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Normalise DB-side stage names to display labels
function displayStage(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    api.get('/applications').then(({ data }) => {
      const raw = Array.isArray(data) ? data : data?.data ?? [];
      // Guard: skip rows without a valid candidate+job reference
      setApplications(raw.filter((a: Application) => a.candidate || a.job));
    }).finally(() => setLoading(false));
  }, []);

  // Normalise stage keys for filtering (SOURCED → APPLIED, SCREENED → SCREENING, etc.)
  const normalise = (s: string) => ({ SOURCED: 'APPLIED', SCREENED: 'SCREENING' }[s] ?? s);

  const filtered = filter === 'ALL'
    ? applications
    : applications.filter((a) => normalise(a.status) === filter);

  const countFor = (s: string) => applications.filter(a => normalise(a.status) === s).length;

  if (loading) {
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
          <span className="font-semibold text-gray-700">{applications.length}</span> total
        </div>
      </div>

      {/* Pipeline stage tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === 'ALL' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          All ({applications.length})
        </button>
        {PIPELINE_STAGES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {STATUS_LABELS[s]} ({countFor(s)})
          </button>
        ))}
      </div>

      {/* Applications table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-base font-medium text-gray-500">No applications in this stage</p>
          <p className="text-sm mt-1">Applications will appear here as candidates move through the pipeline.</p>
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
              {filtered.map((app) => (
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
                        <div className="font-medium text-gray-900">
                          {app.candidate
                            ? `${app.candidate.firstName ?? ''} ${app.candidate.lastName ?? ''}`.trim() || '—'
                            : '—'}
                        </div>
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
        </div>
      )}
    </div>
  );
}
