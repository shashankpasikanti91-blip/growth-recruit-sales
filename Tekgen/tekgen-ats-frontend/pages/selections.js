'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../components/layout/DashboardLayout';
import apiClient from '../lib/api';
import {
  CheckSquare, Search, Users, FileText, Send, RefreshCw,
  ChevronLeft, ChevronRight, Filter, Download, Mail, UserCheck,
  Clock, AlertCircle, Eye,
} from 'lucide-react';
import Link from 'next/link';

const STATUS_STYLES = {
  SCREENED:   'bg-violet-100 text-violet-700',
  INTERVIEW:  'bg-amber-100 text-amber-700',
  HIRED:      'bg-emerald-100 text-emerald-700',
  SHORTLISTED:'bg-blue-100 text-blue-700',
  OFFERED:    'bg-teal-100 text-teal-700',
};

const APP_STATUS_STYLES = {
  SHORTLISTED: 'bg-blue-100 text-blue-700',
  INTERVIEWED: 'bg-amber-100 text-amber-700',
  OFFERED:     'bg-teal-100 text-teal-700',
  SCREENED:    'bg-violet-100 text-violet-700',
  REJECTED:    'bg-red-100 text-red-700',
  REJECTED_AFTER_INTERVIEW: 'bg-red-100 text-red-700',
};

const SCORE_TABS = [
  { label: 'All Suitable (50+)', minScore: 50, status: '' },
  { label: 'Strong (70+)',       minScore: 70, status: '' },
  { label: 'Good (50–69)',       minScore: 50, maxScore: 69, status: '' },
  { label: 'Shortlisted',        minScore: 0, appStatus: 'SHORTLISTED' },
  { label: 'Offered',            minScore: 0, appStatus: 'OFFERED'     },
];

const PAGE_LIMIT = 50;

function scoreColor(s) {
  if (s >= 70) return 'text-emerald-700 font-bold';
  if (s >= 50) return 'text-amber-700 font-bold';
  return 'text-red-500 font-bold';
}

export default function SelectionsPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(new Set());

  const fetchSelections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        status: 'SCREENED',
        search: search || undefined,
        limit: PAGE_LIMIT,
        page,
      };
      const r = await apiClient.get('/api/candidates', { params });
      const payload = r.data.data;
      let list = payload?.candidates ?? (Array.isArray(payload) ? payload : []);
      const tot = payload?.total ?? list.length;

      // Selections should show only SCREENED pipeline (pre-interview)
      // Client-side score + app-status filter
      const cfg = SCORE_TABS[tab];
      if (cfg.appStatus) {
        list = list.filter(c => {
          const topAppStatus = c.applications?.[0]?.status ?? '';
          return topAppStatus === cfg.appStatus;
        });
      } else {
        list = list.filter(c => {
          const topScore     = c.screenings?.[0]?.score ?? 0;
          const topAppStatus = c.applications?.[0]?.status ?? '';
          // Exclude explicitly rejected candidates
          const notRejected  = topAppStatus !== 'REJECTED' && topAppStatus !== 'REJECTED_AFTER_INTERVIEW';
          const scoreOk      = cfg.maxScore != null
            ? topScore >= cfg.minScore && topScore <= cfg.maxScore
            : topScore >= (cfg.minScore || 50);  // default minimum 50
          return scoreOk && notRejected;
        });
      }

      setCandidates(list);
      setTotal(tot);
    } catch (e) {
      console.error(e);
      if (e.response?.status !== 401) setError('Failed to load selections. Retry?');
    } finally {
      setLoading(false);
    }
  }, [search, tab, page]);

  useEffect(() => { fetchSelections(); }, [fetchSelections]);

  const handleSearchSubmit = (e) => { e.preventDefault(); setSearch(searchInput); setPage(1); };
  const toggleSelect = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const totalPages = Math.ceil(total / PAGE_LIMIT) || 1;

  return (
    <DashboardLayout>
      <div className="flex flex-col" style={{ height: 'calc(100vh - 3rem)', minWidth: 0 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
          <div>
            <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare size={15} className="text-brand-500" /> Selections
            </h1>
            <p className="text-xs text-slate-500">Good-fit screened candidates (score ≥ 50) ready for client submission</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchSelections} className="btn-ghost py-1.5 px-2 text-xs" title="Refresh">
              <RefreshCw size={13} />
            </button>
            {selected.size > 0 && (
              <button className="btn-primary py-1.5 px-3 text-xs gap-1.5">
                <Send size={12} /> Submit {selected.size} to Client
              </button>
            )}
          </div>
        </div>

        {/* Score tabs */}
        <div className="flex items-center gap-1 px-4 py-2 bg-white border-b border-slate-100 flex-shrink-0 overflow-x-auto">
          {SCORE_TABS.map((t, i) => (
            <button key={i} onClick={() => { setTab(i); setPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-md font-medium whitespace-nowrap transition-colors ${
                tab === i ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}>
              {t.label}
            </button>
          ))}
          <div className="ml-auto flex-shrink-0">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-1">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input type="text" placeholder="Search candidates..." value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="pl-7 pr-3 py-1.5 border border-slate-200 rounded text-xs w-44 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
            </form>
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
              <button onClick={fetchSelections} className="btn-primary py-1.5 px-4 text-xs">Retry</button>
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 gap-3">
              <UserCheck size={36} className="text-slate-200" />
              <p className="text-slate-500 text-sm font-medium">No selections found</p>
              <Link href="/screening" className="btn-primary py-1.5 px-4 text-xs gap-1.5">
                Run AI Screening
              </Link>
            </div>
          ) : (
            <table className="ats-table w-full">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th style={{ width: 105 }}>Cand. ID</th>
                  <th style={{ minWidth: 150 }}>Name</th>
                  <th style={{ minWidth: 170 }}>Email</th>
                  <th style={{ width: 115 }}>Phone</th>
                  <th style={{ width: 80 }}>AI Score</th>
                  <th style={{ minWidth: 140 }}>Job Applied</th>
                  <th style={{ width: 85 }}>App Status</th>
                  <th style={{ width: 85 }}>Screened</th>
                  <th style={{ width: 80 }}>View</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map(c => {
                  const topS = c.screenings?.[0];
                  const topA = c.applications?.[0];
                  const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim();
                  const isChecked = selected.has(c.id);
                  return (
                    <tr key={c.id}
                      className="border-b border-slate-100 hover:bg-blue-50/40 cursor-pointer transition-colors"
                      onClick={() => router.push(`/candidates/${c.id}`)}>
                      <td className="px-2 py-2 text-center" onClick={e => { e.stopPropagation(); toggleSelect(c.id); }}>
                        <input type="checkbox" checked={isChecked} onChange={() => {}} className="cursor-pointer" />
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono text-[11px] text-brand-600 whitespace-nowrap">{c.displayId || '--'}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-medium text-xs text-slate-900 block max-w-[150px] truncate" title={fullName}>{fullName || '--'}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-slate-600 block max-w-[170px] truncate">{c.email}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-slate-500">{c.phone || '--'}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {topS ? <span className={`text-xs ${scoreColor(topS.score)}`}>{topS.score}/100</span>
                          : <span className="text-slate-300 text-xs">--</span>}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-slate-600 block max-w-[140px] truncate">
                          {topS?.job?.title || topA?.job?.title || '--'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {topA ? (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${APP_STATUS_STYLES[topA.status] || 'bg-slate-100 text-slate-600'}`}>
                            {topA.status}
                          </span>
                        ) : <span className="text-slate-300 text-xs">--</span>}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-400 whitespace-nowrap">
                        {topS?.screenedAt
                          ? new Date(topS.screenedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                          : c.createdAt
                          ? new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                          : '--'}
                      </td>
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        <Link href={`/candidates/${c.id}`} className="text-xs text-brand-600 hover:text-brand-800 font-medium">View</Link>
                      </td>
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
