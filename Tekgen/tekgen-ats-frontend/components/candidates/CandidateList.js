'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import apiClient from '../../lib/api';
import { getUser } from '../../lib/auth';
import {
  Upload, Plus, AlertCircle, Search, ChevronLeft, ChevronRight,
  FileText, RefreshCw, Users, X, ClipboardEdit, Building2, Brain, Trash2
} from 'lucide-react';
import SubmissionModal from './SubmissionModal';

const STATUS_STYLES = {
  NEW:       'bg-slate-100 text-slate-600',
  APPLIED:   'bg-blue-100 text-blue-700',
  SCREENED:  'bg-violet-100 text-violet-700',
  INTERVIEW: 'bg-amber-100 text-amber-700',
  HIRED:     'bg-emerald-100 text-emerald-700',
  REJECTED:  'bg-red-100 text-red-700',
  ON_HOLD:   'bg-gray-100 text-gray-600',
};

function scoreColor(score) {
  if (score == null) return 'text-slate-400';
  if (score >= 70) return 'text-emerald-700 font-bold';
  if (score >= 50) return 'text-amber-700 font-bold';
  return 'text-red-600 font-bold';
}

const SOURCE_LABELS = {
  MANUAL_UPLOAD:        'Direct / Manual',
  JOB_PORTAL_MONSTER:   'Monster',
  JOB_PORTAL_NAUKRI:    'Naukri',
  JOB_PORTAL_JOBSTREET: 'JobStreet',
  JOB_PORTAL_FUTUREJOBS:'Future Jobs',
  JOB_PORTAL_OTHERS:    'Job Portal',
  REFERRAL:             'Referral',
  LINKEDIN:             'LinkedIn',
};
function fmtSource(raw) {
  return SOURCE_LABELS[raw] || raw || '--';
}

const PAGE_LIMIT = 50;

export default function CandidateList() {
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [contractFilter, setContractFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [density, setDensity] = useState('compact');
  const [submissionCandidate, setSubmissionCandidate] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [mineOnly, setMineOnly] = useState(false);

  const currentUser = getUser();
  const canDelete = currentUser?.role === 'ADMIN' || currentUser?.canDeleteCandidates === true;

  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/api/candidates', {
        params: {
          status: filter || undefined,
          search: search || undefined,
          contractType: contractFilter || undefined,
          limit: PAGE_LIMIT,
          page,
          ...(mineOnly ? { mine: '1' } : {}),
        },
      });
      const payload = response.data.data;
      // Handle both { candidates, total } and plain array responses
      if (payload && Array.isArray(payload.candidates)) {
        setCandidates(payload.candidates);
        setTotal(payload.total || payload.candidates.length);
      } else if (Array.isArray(payload)) {
        setCandidates(payload);
        setTotal(response.data.total || payload.length);
      } else {
        setCandidates([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
      if (error.response?.status !== 401) {
        const detail =
          error.response?.data?.message ||
          (error.response?.status ? `HTTP ${error.response.status}` : '') ||
          (error.code === 'ERR_NETWORK' || !error.response
            ? 'Cannot reach API. Check NEXT_PUBLIC_API_BASE_URL and that the backend is running.'
            : '');
        setError(
          detail
            ? `Failed to load candidates: ${detail}`
            : 'Failed to load candidates. Click refresh to retry.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [filter, search, contractFilter, page, mineOnly]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  useEffect(() => {
    if (router.query.search) {
      setSearchInput(router.query.search);
      setSearch(router.query.search);
    }
  }, [router.query.search]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleDelete = async (e, candidate) => {
    e.stopPropagation();
    if (!confirm(`Delete ${candidate.firstName} ${candidate.lastName} (${candidate.displayId})?\n\nThis will permanently remove the candidate and all screening history. This cannot be undone.`)) return;
    try {
      setDeletingId(candidate.id);
      await apiClient.delete(`/api/candidates/${candidate.id}`);
      fetchCandidates();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete candidate');
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil((total || candidates.length) / PAGE_LIMIT) || 1;

  const TABS = [
    { label: 'All', value: '' },
    { label: 'New', value: 'NEW' },
    { label: 'Screened', value: 'SCREENED' },
    { label: 'Interview', value: 'INTERVIEW' },
    { label: 'Hired', value: 'HIRED' },
    { label: 'Rejected', value: 'REJECTED' },
  ];

  return (
    <div className="flex flex-col" style={{ minWidth: 0, height: 'calc(100vh - 3rem)' }}>
      {submissionCandidate && (
        <SubmissionModal
          candidate={submissionCandidate}
          jobTitle={submissionCandidate.screenings?.[0]?.job?.title}
          clientName={submissionCandidate.screenings?.[0]?.job?.clientName}
          onClose={() => setSubmissionCandidate(null)}
          onSaved={() => { setSubmissionCandidate(null); fetchCandidates(); }}
        />
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div>
          <h1 className="text-sm font-bold text-slate-900">Candidates</h1>
          <p className="text-xs text-slate-500">
            {total || candidates.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDensity(d => d === 'compact' ? 'comfortable' : 'compact')}
            className="btn-ghost py-1.5 px-3 text-xs"
          >
            {density === 'compact' ? 'Comfortable' : 'Compact'}
          </button>
          <button onClick={fetchCandidates} className="btn-ghost py-1.5 px-2 text-xs" title="Refresh">
            <RefreshCw size={13} />
          </button>
          <Link href="/candidates/upload" className="btn-primary py-1.5 px-3 text-xs gap-1.5">
            <Upload size={13} /> Upload Resume
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-100 flex-shrink-0 flex-wrap">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-1">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search name, email, skills..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-7 pr-7 py-1.5 border border-slate-200 rounded text-xs w-52 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {searchInput && (
              <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>
          <button type="submit" className="btn-primary py-1.5 px-2.5 text-xs">
            <Search size={12} />
          </button>
        </form>

        {/* Contract type filter */}
        <select
          value={contractFilter}
          onChange={(e) => { setContractFilter(e.target.value); setPage(1); }}
          className="py-1.5 px-2 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All Contract Types</option>
          <option value="PERMANENT">Permanent</option>
          <option value="CONTRACT">Contract</option>
          <option value="FREELANCE">Freelance</option>
          <option value="INTERNSHIP">Internship</option>
        </select>

        {/* Only admins see the toggle — recruiters always see only their own */}
        {currentUser?.role === 'ADMIN' && (
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none whitespace-nowrap">
            <input
              type="checkbox"
              checked={mineOnly}
              onChange={(e) => { setMineOnly(e.target.checked); setPage(1); }}
              className="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
            />
            My uploads only
          </label>
        )}

        <div className="flex gap-0.5">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => { setFilter(t.value); setPage(1); }}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                filter === t.value ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="ml-auto text-xs text-slate-400">
          {total > 0 && `${(page - 1) * PAGE_LIMIT + 1}–${Math.min(page * PAGE_LIMIT, total)} of ${total}`}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto" style={{ minWidth: 0 }}>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-60 gap-3">
            <p className="text-red-500 text-sm font-medium">{error}</p>
            <button onClick={fetchCandidates} className="btn-primary py-1.5 px-4 text-xs gap-1.5">
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        ) : candidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 gap-3">
            <Users size={36} className="text-slate-200" />
            <p className="text-slate-500 text-sm font-medium">No candidates found</p>
            <Link href="/candidates/upload" className="btn-primary py-1.5 px-4 text-xs gap-1.5">
              <Plus size={13} /> Add Candidate
            </Link>
          </div>
        ) : (
          <table className="ats-table w-full">
            <thead className="sticky top-0 z-10">
              <tr>
                <th style={{ width: 105 }}>Cand. ID</th>
                <th style={{ minWidth: 150 }}>Name</th>
                <th style={{ minWidth: 170 }}>Email</th>
                <th style={{ width: 115 }}>Phone</th>
                <th style={{ minWidth: 110 }}>Client Name</th>
                <th style={{ width: 90 }}>Hire Type</th>
                <th style={{ minWidth: 130 }}>Applying For</th>
                <th style={{ width: 55 }}>Exp</th>
                <th style={{ width: 80 }}>Source</th>
                <th style={{ width: 80 }}>AI Score</th>
                <th style={{ minWidth: 120 }}>Job Screened</th>
                <th style={{ width: 105 }}>Location</th>
                <th style={{ width: 120 }}>Current Role</th>
                <th style={{ width: 90 }}>Parse Status</th>
                <th style={{ width: 85 }}>Status</th>
                <th style={{ width: 85 }}>Uploaded</th>
                <th style={{ minWidth: 100 }}>Recruiter</th>
                <th style={{ width: 50 }}>CV</th>
                <th style={{ width: 80 }}>Details</th>
                <th style={{ width: 50 }}>View</th>
                {canDelete && <th style={{ width: 44 }}></th>}
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => {
                const topScreening = c.screenings?.[0];
                const incomplete = !c.icNumber && !c.passportNumber;
                const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim();
                const rowPy = density === 'comfortable' ? 'py-2.5' : 'py-1.5';
                return (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/candidates/${c.id}`)}
                    className={`border-b border-slate-100 hover:bg-blue-50/40 transition-colors cursor-pointer`}
                  >
                    <td className={`px-3 ${rowPy}`}>
                      <span className="font-mono text-[11px] text-brand-600 whitespace-nowrap">{c.displayId || '--'}</span>
                      {incomplete && (
                        <span className="ml-1 inline-flex items-center gap-0.5 px-1 py-0.5 bg-orange-100 text-orange-700 text-[9px] rounded" title="ID Pending">
                          <AlertCircle size={8} />ID
                        </span>
                      )}
                    </td>
                    <td className={`px-3 ${rowPy}`}>
                      <span className="font-medium text-xs text-slate-900 block max-w-[150px] truncate" title={fullName}>{fullName || '--'}</span>
                    </td>
                    <td className={`px-3 ${rowPy}`}>
                      <span className="text-xs text-slate-600 block max-w-[170px] truncate" title={c.email}>{c.email}</span>
                    </td>
                    <td className={`px-3 ${rowPy}`}>
                      <span className="text-xs text-slate-500 block max-w-[115px] truncate" title={c.phone || ''}>{c.phone || '--'}</span>
                    </td>
                    {/* Client Name — auto from screening or manually set */}
                    <td className={`px-3 ${rowPy}`}>
                      {(() => {
                        const cn = c.applyingClientName || c.latestClientName || topScreening?.job?.clientName;
                        return cn ? (
                          <span className="flex items-center gap-1 text-xs text-blue-700 max-w-[110px] truncate" title={cn}>
                            <Building2 size={10} className="flex-shrink-0" />{cn}
                          </span>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSubmissionCandidate(c); }}
                            className="text-[10px] text-slate-400 hover:text-brand-600 underline underline-offset-2"
                            title="Fill client name in submission details"
                          >+ Add</button>
                        );
                      })()}
                    </td>
                    {/* Hire Type */}
                    <td className={`px-3 ${rowPy}`}>
                      {(() => {
                        const ht = c.hireType || topScreening?.job?.contractType;
                        return ht ? (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            ht === 'PERMANENT'  ? 'bg-emerald-100 text-emerald-700' :
                            ht === 'CONTRACT'   ? 'bg-blue-100 text-blue-700' :
                            ht === 'FREELANCE'  ? 'bg-purple-100 text-purple-700' :
                            ht === 'INTERNSHIP' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>{ht.charAt(0) + ht.slice(1).toLowerCase()}</span>
                        ) : <span className="text-slate-300 text-xs">--</span>;
                      })()}
                    </td>
                    {/* Applying For (role title) */}
                    <td className={`px-3 ${rowPy}`}>
                      {(() => {
                        const role = c.applyingForRole || topScreening?.job?.title;
                        return role ? (
                          <span className="text-xs text-slate-700 font-medium block max-w-[130px] truncate" title={role}>{role}</span>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSubmissionCandidate(c); }}
                            className="text-[10px] text-slate-400 hover:text-brand-600 underline underline-offset-2"
                            title="Fill applying-for role in submission details"
                          >+ Add</button>
                        );
                      })()}
                    </td>
                    <td className={`px-3 ${rowPy} text-center text-xs text-slate-600`}>
                      {c.experience != null ? `${c.experience}y` : '--'}
                    </td>
                    <td className={`px-3 ${rowPy}`}>
                      <span className="text-xs text-slate-500 block max-w-[80px] truncate" title={fmtSource(c.sourceChannel)}>{fmtSource(c.sourceChannel)}</span>
                    </td>
                    <td className={`px-3 ${rowPy} text-center`}>
                      {topScreening ? (
                        <span className={`text-xs ${scoreColor(topScreening.score)}`}>{topScreening.score}/100</span>
                      ) : (
                        <span className="text-slate-300 text-xs">--</span>
                      )}
                    </td>
                    <td className={`px-3 ${rowPy}`}>
                      {topScreening?.job?.title ? (
                        <span className="text-xs text-slate-600 block max-w-[120px] truncate" title={topScreening.job.title}>{topScreening.job.title}</span>
                      ) : (
                        <span className="text-slate-300 text-xs">--</span>
                      )}
                    </td>
                    {/* Location — moved after Job Screened */}
                    <td className={`px-3 ${rowPy}`}>
                      <span className="text-xs text-slate-500 block max-w-[105px] truncate" title={c.location || ''}>{c.location || '--'}</span>
                    </td>
                    {/* Current Role — moved after Location */}
                    <td className={`px-3 ${rowPy}`}>
                      <span className="text-xs text-slate-600 block max-w-[120px] truncate" title={c.currentRole || ''}>{c.currentRole || '--'}</span>
                    </td>
                    {/* Parse Status column */}
                    <td className={`px-3 ${rowPy}`}>
                      {c.parsingStatus === 'NEEDS_REVIEW' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700">
                          <Brain size={8} /> Needs Review
                        </span>
                      ) : c.parsingStatus === 'COMPLETE' ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">
                          Complete
                        </span>
                      ) : c.parsingStatus ? (
                        <span className="text-xs text-slate-400">{c.parsingStatus}</span>
                      ) : (
                        <span className="text-slate-300 text-xs">--</span>
                      )}
                    </td>
                    <td className={`px-3 ${rowPy}`}>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${STATUS_STYLES[c.status] || 'bg-slate-100 text-slate-600'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className={`px-3 ${rowPy} text-[11px] text-slate-400 whitespace-nowrap`}>
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '--'}
                    </td>
                    <td className={`px-3 ${rowPy}`}>
                      {c.user ? (
                        <span className="text-xs text-slate-600 block max-w-[100px] truncate" title={`${c.user.firstName} ${c.user.lastName}`}>
                          {c.user.firstName} {c.user.lastName}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className={`px-3 ${rowPy} text-center`}>
                      {c.resumeUrl ? (
                        <a href={c.resumeUrl} target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()} className="text-brand-500 hover:text-brand-700" title="Download CV">
                          <FileText size={13} />
                        </a>
                      ) : (
                        <span className="text-slate-200"><FileText size={13} /></span>
                      )}
                    </td>
                    <td className={`px-3 ${rowPy} text-center`} onClick={(e) => e.stopPropagation()}>
                      <button
                        title={c.callStatus ? c.callStatus.replace(/_/g, ' ') : 'Fill Submission Details'}
                        onClick={(e) => { e.stopPropagation(); setSubmissionCandidate(c); }}
                        className={`rounded p-1 ${
                          !c.callStatus || c.callStatus === 'NOT_CALLED'
                            ? 'text-slate-300 hover:text-violet-600 hover:bg-violet-50'
                            : c.callStatus === 'REACHED' || c.callStatus === 'INTERESTED'
                            ? 'text-emerald-600 hover:bg-emerald-50'
                            : c.callStatus === 'NOT_INTERESTED'
                            ? 'text-red-500 hover:bg-red-50'
                            : 'text-amber-500 hover:bg-amber-50'
                        }`}
                      >
                        <ClipboardEdit size={13} />
                      </button>
                    </td>
                    <td className={`px-3 ${rowPy}`} onClick={(e) => e.stopPropagation()}>
                      <Link href={`/candidates/${c.id}`} className="text-xs text-brand-600 hover:text-brand-800 font-medium whitespace-nowrap">
                        View
                      </Link>
                    </td>
                    {canDelete && (
                      <td className={`px-2 ${rowPy} text-center`} onClick={(e) => e.stopPropagation()}>
                        <button
                          title="Delete candidate"
                          onClick={(e) => handleDelete(e, c)}
                          disabled={deletingId === c.id}
                          className="rounded p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
                        >
                          {deletingId === c.id
                            ? <span className="block w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                            : <Trash2 size={12} />}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-white border-t border-slate-200 flex-shrink-0">
          <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
