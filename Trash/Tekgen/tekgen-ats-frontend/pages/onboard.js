'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../components/layout/DashboardLayout';
import apiClient from '../lib/api';
import {
  UserPlus, CheckCircle, Clock, AlertCircle, Search, RefreshCw,
  ChevronLeft, ChevronRight, FileText, Send, Download, Check,
} from 'lucide-react';
import Link from 'next/link';

// Documents required per candidate type
const LOCAL_DOCS = [
  { id: 'edu',     label: 'Educational Documents' },
  { id: 'payslip', label: 'Last 3 Months Pay Slips' },
  { id: 'offer',   label: 'Previous Employment Offer Letters' },
  { id: 'bestinet',label: 'Filled Bestinet Application Form' },
  { id: 'ic',      label: 'IC Copy' },
];

const EXPAT_DOCS = [
  { id: 'edu',      label: 'Educational Documents (10th, 12th, Degree)' },
  { id: 'photo',    label: 'Passport-size Photo (Blue Background)' },
  { id: 'payslip',  label: 'Last 3 Months Pay Slips' },
  { id: 'exp_letter', label: 'Experience Letters (Previous Employments)' },
  { id: 'passport', label: 'Full Passport Copy (All Pages)' },
];

const ONBOARD_STAGES = [
  { id: 'doc_requested', label: 'Docs Requested',   color: 'text-amber-600',   bg: 'bg-amber-50' },
  { id: 'doc_received',  label: 'Docs Received',    color: 'text-blue-600',    bg: 'bg-blue-50'  },
  { id: 'bgv',           label: 'BGV In Progress',  color: 'text-violet-600',  bg: 'bg-violet-50'},
  { id: 'clearance',     label: 'Clearance Done',   color: 'text-teal-600',    bg: 'bg-teal-50'  },
  { id: 'joined',        label: 'Joined',           color: 'text-emerald-600', bg: 'bg-emerald-50'},
];

function DocRequestModal({ candidate, onClose }) {
  const [type, setType]       = useState('LOCAL');
  const [checkedDocs, setCheckedDocs] = useState({});
  const [sent, setSent]       = useState(false);
  const [sending, setSending] = useState(false);
  const [note, setNote]       = useState('');

  const docs = type === 'LOCAL' ? LOCAL_DOCS : EXPAT_DOCS;
  const fullName = `${candidate?.firstName || ''} ${candidate?.lastName || ''}`.trim();

  const toggleDoc = (id) => setCheckedDocs(p => ({ ...p, [id]: !p[id] }));
  const selectAll = () => { const m = {}; docs.forEach(d => { m[d.id] = true; }); setCheckedDocs(m); };

  const handleSend = async () => {
    setSending(true);
    const selectedDocs = docs.filter(d => checkedDocs[d.id]);
    const docList = selectedDocs.map((d, i) => `${i + 1}. ${d.label}`).join('\n');
    const subject = `Required Documents — Joining Formalities | Tekgen`;
    const body = `Dear ${fullName},\n\nCongratulations on your selection! We are pleased to have you onboard.\n\nKindly send us the following documents at your earliest to proceed with the joining formalities:\n\n${docList}${note ? `\n\nAdditional Note:\n${note}` : ''}\n\nPlease send all documents in PDF/scanned format to recruitment@tekgen.com.\n\nWarm regards,\nTekgen Recruitment Team`;

    // Copy to clipboard as fallback (no backend email yet)
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    } catch (_) {}

    setSending(false);
    setSent(true);
    setTimeout(() => { setSent(false); }, 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">Request Documents</h2>
            <p className="text-xs text-slate-500">{fullName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg leading-none">×</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Candidate type */}
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-2">Candidate Type</p>
            <div className="flex gap-2">
              {['LOCAL', 'EXPAT'].map(t => (
                <button key={t} onClick={() => { setType(t); setCheckedDocs({}); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    type === t ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}>{t === 'LOCAL' ? 'Local (Malaysian)' : 'Expat (Foreign)'}</button>
              ))}
            </div>
          </div>

          {/* Document checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-700">Required Documents</p>
              <button onClick={selectAll} className="text-[11px] text-brand-600 hover:underline">Select All</button>
            </div>
            <div className="space-y-2">
              {docs.map(d => (
                <label key={d.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={!!checkedDocs[d.id]} onChange={() => toggleDoc(d.id)}
                    className="w-4 h-4 rounded text-brand-500" />
                  <span className="text-xs text-slate-700">{d.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional note */}
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-1">Additional Note (optional)</p>
            <textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Any specific instructions..."
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none" />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost py-1.5 px-4 text-xs">Cancel</button>
          <button onClick={handleSend} disabled={sending || Object.values(checkedDocs).every(v => !v)}
            className="btn-primary py-1.5 px-4 text-xs gap-1.5 disabled:opacity-50">
            {sent ? <><Check size={12} /> Copied!</> : <><Send size={12} /> {sending ? 'Preparing...' : 'Copy Email'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OnboardPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [docModalCandidate, setDocModalCandidate] = useState(null);
  const [stages, setStages] = useState({});  // candidateId -> stage

  const PAGE_LIMIT = 50;

  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await apiClient.get('/api/candidates', {
        params: { status: 'SCREENED', search: search || undefined, limit: PAGE_LIMIT, page },
      });
      const payload = r.data.data;
      const list = payload?.candidates ?? (Array.isArray(payload) ? payload : []);
      const tot  = payload?.total ?? list.length;
      // Only show candidates who are SHORTLISTED or OFFERED (actually selected)
      const filtered = list.filter(c => {
        const appStatus = c.applications?.[0]?.status;
        return appStatus === 'SHORTLISTED' || appStatus === 'OFFERED';
      });
      setCandidates(filtered);
      setTotal(tot);
    } catch (e) {
      if (e.response?.status !== 401) setError('Failed to load. Retry?');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  const handleSearchSubmit = (e) => { e.preventDefault(); setSearch(searchInput); setPage(1); };
  const setStage = (id, stage) => setStages(p => ({ ...p, [id]: stage }));
  const totalPages = Math.ceil(total / PAGE_LIMIT) || 1;

  return (
    <DashboardLayout>
      {docModalCandidate && (
        <DocRequestModal candidate={docModalCandidate} onClose={() => setDocModalCandidate(null)} />
      )}

      <div className="flex flex-col" style={{ height: 'calc(100vh - 3rem)', minWidth: 0 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
          <div>
            <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserPlus size={15} className="text-brand-500" /> Onboarding
            </h1>
            <p className="text-xs text-slate-500">Manage joining formalities and document collection</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchCandidates} className="btn-ghost py-1.5 px-2 text-xs" title="Refresh">
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-100 flex-shrink-0">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-1">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="text" placeholder="Search candidates..." value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="pl-7 pr-3 py-1.5 border border-slate-200 rounded text-xs w-44 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
          </form>

          {/* Stage legend */}
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {ONBOARD_STAGES.map(s => (
              <span key={s.id} className={`text-[10px] font-medium px-2 py-0.5 rounded ${s.bg} ${s.color}`}>{s.label}</span>
            ))}
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
              <p className="text-red-500 text-sm">{error}</p>
              <button onClick={fetchCandidates} className="btn-primary py-1.5 px-4 text-xs">Retry</button>
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 gap-3">
              <UserPlus size={36} className="text-slate-200" />
              <p className="text-slate-500 text-sm font-medium">No candidates for onboarding yet</p>
              <p className="text-slate-400 text-xs">Screened candidates with score ≥50 appear here</p>
            </div>
          ) : (
            <table className="ats-table w-full">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th style={{ width: 105 }}>Cand. ID</th>
                  <th style={{ minWidth: 150 }}>Name</th>
                  <th style={{ minWidth: 160 }}>Email</th>
                  <th style={{ width: 115 }}>Phone</th>
                  <th style={{ width: 80 }}>AI Score</th>
                  <th style={{ minWidth: 140 }}>Job Title</th>
                  <th style={{ width: 140 }}>Onboard Stage</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map(c => {
                  const topS = c.screenings?.[0];
                  const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim();
                  const stage = stages[c.id] || 'pending';
                  const stageObj = ONBOARD_STAGES.find(s => s.id === stage);
                  return (
                    <tr key={c.id} className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors">
                      <td className="px-3 py-2">
                        <span className="font-mono text-[11px] text-brand-600">{c.displayId || '--'}</span>
                      </td>
                      <td className="px-3 py-2">
                        <Link href={`/candidates/${c.id}`}>
                          <span className="font-medium text-xs text-slate-900 hover:text-brand-600 cursor-pointer block max-w-[150px] truncate">{fullName}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-slate-600 block max-w-[160px] truncate">{c.email}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-slate-500">{c.phone || '--'}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {topS ? (
                          <span className={`text-xs font-bold ${topS.score >= 70 ? 'text-emerald-700' : 'text-amber-700'}`}>{topS.score}/100</span>
                        ) : <span className="text-slate-300 text-xs">--</span>}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-slate-600 block max-w-[140px] truncate">{topS?.job?.title || '--'}</span>
                      </td>
                      <td className="px-3 py-2">
                        <select value={stage} onChange={e => setStage(c.id, e.target.value)}
                          onClick={e => e.stopPropagation()}
                          className={`text-[11px] font-semibold border-0 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer ${stageObj?.bg || 'bg-slate-50'} ${stageObj?.color || 'text-slate-600'}`}>
                          <option value="pending">-- Set Stage --</option>
                          {ONBOARD_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setDocModalCandidate(c)}
                            className="flex items-center gap-1 text-[11px] text-brand-600 hover:text-brand-800 font-medium border border-brand-200 rounded px-2 py-1 hover:bg-brand-50 transition-colors"
                            title="Request Documents">
                            <FileText size={11} /> Docs
                          </button>
                          <Link href={`/candidates/${c.id}`}
                            className="text-[11px] text-slate-500 hover:text-slate-800 font-medium border border-slate-200 rounded px-2 py-1 hover:bg-slate-50 transition-colors">
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-white border-t border-slate-200 flex-shrink-0">
            <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
