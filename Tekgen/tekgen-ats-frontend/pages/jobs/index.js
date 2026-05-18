import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Plus, Edit2, Trash2, Eye, Download, MapPin, Briefcase, Search,
  Clock, Users, Target, AlertTriangle, CheckCircle, ChevronRight,
  Filter, SortAsc, Copy, Zap, X, Table2, LayoutGrid, RefreshCw
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';
import { useRole } from '../../lib/useRole';

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function daysAgo(date) {
  if (!date) return 0;
  return Math.floor((Date.now() - new Date(date)) / 86400000);
}

function getHealth(daysOpen, filledPct) {
  if (daysOpen > 45 || filledPct < 10) return 'stalled';
  if (daysOpen > 25 || filledPct < 40) return 'atrisk';
  return 'good';
}

function getStatusStyle(status) {
  const map = {
    OPEN:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    CLOSED:  'bg-slate-100 text-slate-600 border-slate-200',
    ON_HOLD: 'bg-amber-50 text-amber-700 border-amber-200',
    FILLED:  'bg-blue-50 text-blue-700 border-blue-200',
  };
  return map[status] || 'bg-slate-100 text-slate-600 border-slate-200';
}

function buildBooleanSearch(skills = [], title = '') {
  if (!skills.length && !title) return '';
  const skillStr = skills.length ? `(${skills.map(s => `"${s}"`).join(' AND ')})` : '';
  const titleStr = title ? `"${title}"` : '';
  return [titleStr, skillStr].filter(Boolean).join(' AND ') + ' NOT Intern';
}

// â”€â”€ Job Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function JobCard({ job, onDelete, deleteConfirmId, setDeleteConfirm, onOpenBoolean, teamMap = {} }) {
  const days = daysAgo(job.createdAt);
  const apps = job._count?.applications ?? job.applications?.length ?? 0;
  const headcount = job.headcount ?? 1;
  const filled = job.hiredCount ?? 0;
  const filledPct = Math.min(Math.round((filled / headcount) * 100), 100);
  const health = getHealth(days, filledPct);
  const healthLabel = { good: 'On Track', atrisk: 'At Risk', stalled: 'Stalled' }[health];
  const owner = job.user ? `${job.user.firstName} ${job.user.lastName}` : 'Unassigned';
  const assignees = (job.assignedRecruiters || [])
    .map((id) => teamMap[id])
    .filter(Boolean);
  const booleanStr = buildBooleanSearch(job.requiredSkills || [], job.title);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.preventDefault();
    navigator.clipboard.writeText(booleanStr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="card card-hover p-5">
      {/* Top row */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            {job.displayId && (
              <span className="text-[11px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                {job.displayId}
              </span>
            )}
            {job.clientJrNumber && (
              <span
                className="text-[11px] font-mono bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-100"
                title="Client JR number (from hiring request sheet)"
              >
                JR {job.clientJrNumber}
              </span>
            )}
            {job.clientRequestUuid && (
              <span
                className="text-[10px] font-mono text-slate-500 max-w-[120px] truncate"
                title={job.clientRequestUuid}
              >
                HR-ID {job.clientRequestUuid.slice(0, 8)}…
              </span>
            )}
            <span className={`status-badge border ${getStatusStyle(job.status)}`}>
              {job.status.replace('_', ' ')}
            </span>
            <span className={`status-badge border health-${health}`}>{healthLabel}</span>
          </div>
          <Link href={`/jobs/view/${job.id}`} className="text-base font-semibold text-slate-900 hover:text-brand-600 transition-colors block leading-snug mt-1">
            {job.title}
          </Link>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
            {job.clientName && <span className="flex items-center gap-1 font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{job.clientName}</span>}
            {job.location && <span className="flex items-center gap-1"><MapPin size={11} />{job.location}</span>}
            {job.department && <span>{job.department}</span>}
            <span className="flex items-center gap-1 text-slate-500 font-medium">Owner: {owner}</span>
            {assignees.length > 0 && (
              <span className="text-slate-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-[10px]">
                Assigned: {assignees.join(', ')}
              </span>
            )}
            {job.candidateType && job.candidateType !== 'ANY' && (
              <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide">
                {job.candidateType === 'LOCAL' ? 'Local' : job.candidateType === 'EXPAT' ? 'Expat (MY)' : 'Foreigner/Relocate'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-slate-100 mb-3">
        <div className="text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Headcount</p>
          <p className="text-lg font-bold text-slate-800">{filled}<span className="text-slate-400 font-normal text-sm">/{headcount}</span></p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Submissions</p>
          <p className="text-lg font-bold text-slate-800">{apps}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Days Open</p>
          <p className={`text-lg font-bold ${days > 45 ? 'text-red-600' : days > 25 ? 'text-amber-600' : 'text-slate-800'}`}>{days}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Experience</p>
          <p className="text-lg font-bold text-slate-800">{job.minExperience || 0}-{job.maxExperience ?? '+'}<span className="text-slate-400 font-normal text-sm">yr</span></p>
        </div>
      </div>

      {/* Salary range */}
      {(job.salaryMin || job.salaryMax) && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Salary</span>
          <span className="text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            MYR {job.salaryMin ? job.salaryMin.toLocaleString() : '—'} – {job.salaryMax ? job.salaryMax.toLocaleString() : '—'}
          </span>
        </div>
      )}

      {/* Assigned recruiters */}
      {job.assignedRecruiters?.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Recruiters</span>
          {job.assignedRecruiters.slice(0, 4).map((uid) => (
            <span key={uid} className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
              {teamMap[uid] || uid}
            </span>
          ))}
          {job.assignedRecruiters.length > 4 && (
            <span className="text-[11px] text-slate-400">+{job.assignedRecruiters.length - 4}</span>
          )}
        </div>
      )}

      {/* Headcount progress */}
      <div className="mb-3">
        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
          <span>Headcount progress</span>
          <span>{filledPct}% filled</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${filledPct}%` }} />
        </div>
      </div>

      {/* Skills */}
      {(job.requiredSkills?.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {job.requiredSkills.slice(0, 6).map((s) => (
            <span key={s} className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">{s}</span>
          ))}
          {job.requiredSkills.length > 6 && (
            <span className="text-[11px] text-slate-400 px-2 py-0.5">+{job.requiredSkills.length - 6} more</span>
          )}
        </div>
      )}

      {/* Boolean search — always available */}
      <div className="mb-3">
        <button
          onClick={(e) => { e.preventDefault(); onOpenBoolean && onOpenBoolean(job); }}
          className="flex items-center gap-1.5 text-[11px] text-amber-600 hover:text-amber-800 font-medium bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg w-fit"
        >
          <Zap size={12} /> Boolean Search
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <Link href={`/jobs/view/${job.id}`} className="btn-ghost py-1.5 px-3 text-xs gap-1.5">
            <Eye size={13} /> View
          </Link>
          <Link href={`/jobs/edit/${job.id}`} className="btn-ghost py-1.5 px-3 text-xs gap-1.5">
            <Edit2 size={13} /> Edit
          </Link>
          <button
            onClick={() => setDeleteConfirm(job.id)}
            className="btn-ghost py-1.5 px-3 text-xs gap-1.5 text-red-600 hover:bg-red-50 border-red-100"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
        <Link href={`/jobs/view/${job.id}`} className="text-xs text-brand-500 font-medium hover:underline flex items-center gap-0.5">
          Candidates <ChevronRight size={13} />
        </Link>
      </div>

      {/* Delete confirmation */}
      {deleteConfirmId === job.id && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-red-700">Remove this job opening?</span>
          <div className="flex gap-2">
            <button onClick={() => onDelete(job.id)} className="btn-danger py-1.5 px-3 text-xs">Confirm</button>
            <button onClick={() => setDeleteConfirm(null)} className="btn-ghost py-1.5 px-3 text-xs">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Boolean Search Modal ─────────────────────────────────────────────────────

function BooleanModal({ job, onClose }) {
  const [copied, setCopied] = useState(false);
  const booleanStr = buildBooleanSearch(job.requiredSkills || [], job.title);
  const handleCopy = () => {
    navigator.clipboard.writeText(booleanStr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap size={15} className="text-amber-500" /> Boolean Search String
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{job.title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="p-5">
          {booleanStr ? (
            <>
              <div className="bg-slate-900 rounded-lg p-4 mb-4 overflow-x-auto">
                <code className="text-amber-300 text-sm leading-relaxed break-all whitespace-pre-wrap font-mono">{booleanStr}</code>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleCopy} className="btn-primary py-1.5 px-4 text-xs gap-1.5">
                  <Copy size={13} />{copied ? 'Copied!' : 'Copy to clipboard'}
                </button>
                <span className="text-xs text-slate-400">{job.requiredSkills?.length || 0} skills included</span>
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-sm">No required skills defined for this job.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Job Table Row ────────────────────────────────────────────────────────────

function JobTableRow({ job, onDelete, deleteConfirmId, setDeleteConfirm, onOpenBoolean }) {
  const days = daysAgo(job.createdAt);
  const apps = job._count?.applications ?? job.applications?.length ?? 0;
  const headcount = job.headcount ?? 1;
  const filled = job.hiredCount ?? 0;
  const filledPct = Math.min(Math.round((filled / headcount) * 100), 100);
  const health = getHealth(days, filledPct);
  const owner = job.user ? `${job.user.firstName} ${job.user.lastName}` : 'Unassigned';
  const healthLabel = { good: 'On Track', atrisk: 'At Risk', stalled: 'Stalled' }[health];

  return (
    <>
      <tr className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors">
        <td className="px-3 py-2 whitespace-nowrap">
          <span className="font-mono text-[11px] text-brand-600">{job.displayId || '—'}</span>
        </td>
        <td className="px-3 py-2">
          <Link href={`/jobs/view/${job.id}`} className="text-xs font-semibold text-slate-900 hover:text-brand-600 block max-w-[200px] truncate" title={job.title}>
            {job.title}
          </Link>
        </td>
        <td className="px-3 py-2">
          {job.clientName
            ? <span className="text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded block max-w-[100px] truncate" title={job.clientName}>{job.clientName}</span>
            : <span className="text-slate-300 text-xs">—</span>}
        </td>
        <td className="px-3 py-2">
          <span className="text-xs text-slate-500 block max-w-[110px] truncate" title={job.location || ''}>{job.location || '—'}</span>
        </td>
        <td className="px-3 py-2">
          <span className="text-xs text-slate-500 block max-w-[100px] truncate" title={job.department || ''}>{job.department || '—'}</span>
        </td>
        <td className="px-3 py-2">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getStatusStyle(job.status)}`}>
            {job.status.replace('_', ' ')}
          </span>
        </td>
        <td className="px-3 py-2">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border health-${health}`}>
            {healthLabel}
          </span>
        </td>
        <td className="px-3 py-2 text-center text-xs font-bold text-slate-800">
          {filled}<span className="text-slate-400 font-normal">/{headcount}</span>
        </td>
        <td className="px-3 py-2 text-center text-xs font-bold text-slate-700">{apps}</td>
        <td className="px-3 py-2">
          <span className="text-xs text-slate-500 block max-w-[110px] truncate" title={owner}>{owner}</span>
        </td>
        <td className="px-3 py-2 whitespace-nowrap text-[11px] text-slate-400">
          {job.createdAt ? new Date(job.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-0.5">
            <Link href={`/jobs/view/${job.id}`} className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-brand-600 hover:bg-brand-50" title="View"><Eye size={13} /></Link>
            <Link href={`/jobs/edit/${job.id}`} className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50" title="Edit"><Edit2 size={13} /></Link>
            <button onClick={() => onOpenBoolean(job)} className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-amber-500 hover:bg-amber-50" title="Boolean"><Zap size={13} /></button>
            <button onClick={() => setDeleteConfirm(job.id)} className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete"><Trash2 size={13} /></button>
          </div>
        </td>
      </tr>
      {deleteConfirmId === job.id && (
        <tr>
          <td colSpan={12} className="px-3 py-2 bg-red-50 border-b border-red-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-red-700">Remove &quot;{job.title}&quot;?</span>
              <div className="flex gap-2">
                <button onClick={() => onDelete(job.id)} className="btn-danger py-1 px-3 text-xs">Confirm</button>
                <button onClick={() => setDeleteConfirm(null)} className="btn-ghost py-1 px-3 text-xs">Cancel</button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function JobsPage() {
  const router = useRouter();
  const { canManageClientJobs } = useRole();
  const canManageJobs = canManageClientJobs;
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('OPEN');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'card'
  const [booleanModalJob, setBooleanModalJob] = useState(null);
  const [teamMap, setTeamMap] = useState({});  // userId -> name

  useEffect(() => {
    api.get('/api/jobs/team-members').then(res => {
      const users = res.data.data?.users || res.data.data || [];
      const m = {};
      (Array.isArray(users) ? users : []).forEach(u => { m[u.id] = `${u.firstName} ${u.lastName}`; });
      setTeamMap(m);
    }).catch(() => {});
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const batchId =
        router.isReady && router.query.batch && typeof router.query.batch === 'string'
          ? router.query.batch
          : undefined;
      const response = await api.get('/api/jobs', {
        params: {
          status: filter,
          search,
          limit: 50,
          ...(batchId ? { bulkImportBatchId: batchId } : {}),
        },
      });
      const raw = Array.isArray(response.data.data)
        ? response.data.data
        : (response.data.data?.jobs ?? []);
      setJobs(raw);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load jobs.');
    } finally {
      setLoading(false);
    }
  }, [filter, search, router.isReady, router.query.batch]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleDelete = async (jobId) => {
    try {
      await api.delete(`/api/jobs/${jobId}`);
      setJobs(jobs.filter(j => j.id !== jobId));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete job.');
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/api/export/jobs/csv', {
        params: { status: filter },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tekgen-jobs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch {
      setError('Export failed. Please try again.');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const TABS = [
    { value: 'OPEN',    label: 'Open' },
    { value: 'ON_HOLD', label: 'On Hold' },
    { value: 'FILLED',  label: 'Filled' },
    { value: 'CLOSED',  label: 'Closed' },
  ];

  return (
    <DashboardLayout title="Job Openings">
      {/* Boolean modal */}
      {booleanModalJob && (
        <BooleanModal job={booleanModalJob} onClose={() => setBooleanModalJob(null)} />
      )}

      <div className="flex flex-col h-full" style={{ minWidth: 0 }}>
        {/* Page Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
          <div>
            <h1 className="text-sm font-bold text-slate-900">Job Openings</h1>
            <p className="text-xs text-slate-500">
              {jobs.length} roles &middot; {jobs.filter(j => j.status === 'OPEN').length} currently hiring
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded border border-slate-200 overflow-hidden">
              <button
                onClick={() => setViewMode('table')}
                className={`w-7 h-7 flex items-center justify-center text-xs transition-colors ${viewMode === 'table' ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                title="Table view"
              >
                <Table2 size={13} />
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`w-7 h-7 flex items-center justify-center text-xs transition-colors ${viewMode === 'card' ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                title="Card view"
              >
                <LayoutGrid size={13} />
              </button>
            </div>
            <button onClick={() => fetchJobs()} className="btn-ghost py-1.5 px-2 text-xs" title="Refresh">
              <RefreshCw size={13} />
            </button>
            <button onClick={handleExport} className="btn-ghost py-1.5 px-3 text-xs gap-1.5">
              <Download size={13} /> Export
            </button>
            {canManageJobs && (
              <Link href="/jobs/bulk-import" className="btn-ghost py-1.5 px-3 text-xs border border-slate-200">
                Bulk Excel
              </Link>
            )}
            {canManageJobs && (
              <Link href="/jobs/create" className="btn-primary py-1.5 px-3 text-xs gap-1.5">
                <Plus size={13} /> New JD
              </Link>
            )}
          </div>
        </div>

        {router.isReady && router.query.batch && typeof router.query.batch === 'string' && (
          <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 text-xs text-indigo-950 flex flex-wrap items-center justify-between gap-2">
            <span>
              Showing jobs from bulk import batch{' '}
              <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-100">{router.query.batch}</code>
            </span>
            <Link href="/jobs" className="font-medium text-indigo-700 underline">
              Clear filter
            </Link>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-100 flex-shrink-0 flex-wrap">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-1">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search title, ID, skill..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-7 pr-7 py-1.5 border border-slate-200 rounded text-xs w-52 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              {searchInput && (
                <button type="button" onClick={() => { setSearchInput(''); setSearch(''); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={12} />
                </button>
              )}
            </div>
            <button type="submit" className="btn-primary py-1.5 px-2.5 text-xs"><Search size={12} /></button>
          </form>

          {/* Status tabs */}
          <div className="flex gap-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                  filter === tab.value ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="ml-auto text-xs text-slate-400">{jobs.length} jobs</div>
        </div>

        {error && (
          <div className="mx-4 mt-3 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs flex items-center gap-2">
            <AlertTriangle size={13} />{error}
            <button onClick={() => setError('')} className="ml-auto"><X size={12} /></button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto" style={{ minWidth: 0 }}>
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 gap-3">
              <Briefcase size={36} className="text-slate-200" />
              <p className="text-slate-500 text-sm font-medium">No {filter.toLowerCase().replace('_', ' ')} jobs found</p>
              {filter === 'OPEN' && canManageJobs && (
                <Link href="/jobs/create" className="btn-primary py-1.5 px-4 text-xs gap-1.5">
                  <Plus size={13} /> New requirement
                </Link>
              )}
            </div>
          ) : viewMode === 'table' ? (
            /* ─── TABLE VIEW ─── */
            <table className="ats-table">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th style={{ width: 90 }}>Job ID</th>
                  <th style={{ minWidth: 180 }}>Job Title</th>
                  <th style={{ width: 110 }}>Client</th>
                  <th style={{ width: 120 }}>Location</th>
                  <th style={{ width: 100 }}>Department</th>
                  <th style={{ width: 80 }}>Status</th>
                  <th style={{ width: 80 }}>Health</th>
                  <th style={{ width: 80 }}>Openings</th>
                  <th style={{ width: 80 }}>Applicants</th>
                  <th style={{ width: 120 }}>Owner</th>
                  <th style={{ width: 90 }}>Created</th>
                  <th style={{ width: 110 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <JobTableRow
                    key={job.id}
                    job={job}
                    onDelete={handleDelete}
                    deleteConfirmId={deleteConfirm}
                    setDeleteConfirm={setDeleteConfirm}
                    onOpenBoolean={setBooleanModalJob}
                  />
                ))}
              </tbody>
            </table>
          ) : (
            /* ─── CARD VIEW ─── */
            <div className="p-4 grid gap-3">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onDelete={handleDelete}
                  deleteConfirmId={deleteConfirm}
                  setDeleteConfirm={setDeleteConfirm}
                  onOpenBoolean={setBooleanModalJob}
                  teamMap={teamMap}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

