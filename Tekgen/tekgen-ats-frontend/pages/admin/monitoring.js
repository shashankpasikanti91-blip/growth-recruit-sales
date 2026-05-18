'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../components/layout/DashboardLayout';
import RoleGuard from '../../components/layout/RoleGuard';
import apiClient from '../../lib/api';
import {
  Activity, Users, Briefcase, AlertTriangle, Shield,
  ChevronRight, RefreshCw, Search, CheckCircle2, Building2, Eye
} from 'lucide-react';

function daysAgo(date) {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date)) / 86400000);
}

const STATUS_BADGE = {
  APPLIED:     'bg-blue-100 text-blue-700',
  SCREENED:    'bg-violet-100 text-violet-700',
  SHORTLISTED: 'bg-indigo-100 text-indigo-700',
  INTERVIEWED: 'bg-amber-100 text-amber-700',
  OFFERED:     'bg-cyan-100 text-cyan-700',
  HIRED:       'bg-emerald-100 text-emerald-700',
  REJECTED:    'bg-red-100 text-red-700',
};

function RecruiterWorkloadRow({ r }) {
  const lastSeen = r.lastLoginAt ? daysAgo(r.lastLoginAt) : null;
  const activityStatus = lastSeen === null ? 'Never' : lastSeen === 0 ? 'Today' : `${lastSeen}d ago`;
  return (
    <tr className="table-row">
      <td className="table-cell px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {r.firstName?.[0]}{r.lastName?.[0]}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{r.firstName} {r.lastName}</p>
            <p className="text-xs text-slate-400">{r.email}</p>
          </div>
        </div>
      </td>
      <td className="table-cell px-4 text-center">
        <span className={`status-badge ${r.activeJDs > 0 ? 'bg-brand-50 text-brand-700 border-brand-200' : 'bg-slate-50 text-slate-400 border-slate-100'} border`}>
          {r.activeJDs} active
        </span>
      </td>
      <td className="table-cell px-4 text-center font-semibold text-slate-700">{r.totalSubmissions}</td>
      <td className="table-cell px-4 text-center font-semibold text-slate-700">{r.totalScreenings}</td>
      <td className="table-cell px-4 text-center">
        {r.openFollowUps > 0
          ? <span className="status-badge health-atrisk">{r.openFollowUps} pending</span>
          : <span className="text-xs text-slate-400">â€”</span>}
      </td>
      <td className="table-cell px-4 text-center">
        <span className={`text-xs font-medium ${lastSeen === 0 ? 'text-emerald-600' : lastSeen === null ? 'text-slate-400' : 'text-slate-500'}`}>
          {activityStatus}
        </span>
      </td>
    </tr>
  );
}

const TABS = [
  { key: 'workload', label: 'Recruiter Workload' },
  { key: 'clients',  label: 'Clients & JDs' },
  { key: 'stalled',  label: 'Stalled JDs' },
];

export default function MonitoringPage() {
  const [data, setData] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clientLoading, setClientLoading] = useState(false);
  const [tab, setTab] = useState('workload');
  const [search, setSearch] = useState('');
  const [expandedClient, setExpandedClient] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/admin/monitoring');
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    setClientLoading(true);
    try {
      const res = await apiClient.get(`/api/admin/jobs?search=${encodeURIComponent(search)}`);
      setClientData(res.data.data);
    } catch {
      setClientData(null);
    } finally {
      setClientLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (tab === 'clients') fetchClients(); }, [tab, fetchClients]);

  const recruiters = data?.recruiters ?? [];
  const stalledJDs = data?.stalledJDs ?? [];
  const jdStatus   = data?.jdStatus   ?? [];

  const filteredRecruiters = search
    ? recruiters.filter(r =>
        `${r.firstName} ${r.lastName} ${r.email}`.toLowerCase().includes(search.toLowerCase()))
    : recruiters;

  const filteredStalled = search
    ? stalledJDs.filter(j =>
        `${j.title} ${j.displayId} ${j.user?.firstName} ${j.user?.lastName}`.toLowerCase().includes(search.toLowerCase()))
    : stalledJDs;

  return (
    <DashboardLayout title="Monitoring">
      <RoleGuard allow="ADMIN" fallback={
        <div className="card p-12 text-center max-w-md mx-auto mt-20">
          <Shield size={36} className="text-slate-300 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-700 mb-2">Admin Access Required</h3>
          <p className="text-sm text-slate-400">This page is only available to administrators.</p>
          <Link href="/dashboard" className="btn-primary mt-4 text-sm inline-flex">Back to Dashboard</Link>
        </div>
      }>
        <div className="max-w-7xl mx-auto space-y-5">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Activity size={20} className="text-brand-500" />
                Monitoring &amp; Control
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">Recruiter workload, client JDs, stalled pipelines</p>
            </div>
            <button onClick={fetchData} className="btn-ghost text-sm" disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Summary KPIs */}
          {!loading && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Active Recruiters</p>
                    <p className="text-3xl font-bold text-slate-900">{recruiters.length}</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-brand-500 flex items-center justify-center">
                    <Users size={20} className="text-white" />
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Open JDs</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {jdStatus.find(j => j.status === 'OPEN')?._count?.id ?? 0}
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-violet-500 flex items-center justify-center">
                    <Briefcase size={20} className="text-white" />
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Stalled &gt;30d</p>
                    <p className="text-3xl font-bold text-slate-900">{stalledJDs.length}</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center">
                    <AlertTriangle size={20} className="text-white" />
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Hired (Pipeline)</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {data?.pipeline?.find(p => p.status === 'HIRED' || p.status === 'OFFERED')?._count?.id ?? 0}
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-emerald-500 flex items-center justify-center">
                    <CheckCircle2 size={20} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="form-input pl-9"
              placeholder={tab === 'clients' ? 'Search client, JD title, ID...' : 'Search recruiters...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setSearch(''); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-7 h-7 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* RECRUITER WORKLOAD */}
              {tab === 'workload' && (
                <div className="card overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="section-title">Recruiter Workload Overview</h3>
                    <Link href="/admin" className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1">
                      Manage users <ChevronRight size={12} />
                    </Link>
                  </div>
                  {filteredRecruiters.length === 0 ? (
                    <div className="p-10 text-center">
                      <Users size={32} className="text-slate-200 mx-auto mb-3" />
                      <p className="text-sm text-slate-400">No recruiters found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            {['Recruiter', 'Active JDs', 'Submissions', 'Screenings', 'Follow-ups', 'Last Active'].map(h => (
                              <th key={h} className="table-header text-left px-4 py-3">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRecruiters.map(r => (
                            <RecruiterWorkloadRow key={r.id} r={r} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* CLIENTS & JDs */}
              {tab === 'clients' && (
                <div className="space-y-4">
                  {clientLoading ? (
                    <div className="flex items-center justify-center h-48">
                      <div className="w-7 h-7 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
                    </div>
                  ) : !clientData?.clients?.length ? (
                    <div className="card p-12 text-center">
                      <Building2 size={36} className="text-slate-200 mx-auto mb-3" />
                      <p className="text-sm text-slate-400">No JDs found. Add a client name to your job openings.</p>
                    </div>
                  ) : (
                    clientData.clients.map(client => (
                      <div key={client.clientName} className="card overflow-hidden">
                        {/* Client header */}
                        <button
                          onClick={() => setExpandedClient(expandedClient === client.clientName ? null : client.clientName)}
                          className="w-full flex items-center gap-3 px-5 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors text-left"
                        >
                          <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                            <Building2 size={16} className="text-brand-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-slate-800">{client.clientName}</p>
                            <p className="text-xs text-slate-400">{client.totalJDs} JD{client.totalJDs !== 1 ? 's' : ''} &middot; {client.totalCVs} CVs submitted</p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="status-badge bg-brand-50 text-brand-700 border border-brand-200">{client.totalJDs} JDs</span>
                            <span className="status-badge bg-violet-50 text-violet-700 border border-violet-200">{client.totalCVs} CVs</span>
                            <ChevronRight size={14} className={`text-slate-400 transition-transform ${expandedClient === client.clientName ? 'rotate-90' : ''}`} />
                          </div>
                        </button>

                        {/* JDs under client */}
                        {expandedClient === client.clientName && (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                  {['JD ID', 'Title', 'Owner', 'Status', 'CVs', 'Pipeline', 'Days Open', ''].map(h => (
                                    <th key={h} className="table-header text-left px-4 py-2.5 text-xs">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {client.jobs.map(job => {
                                  const d = job.createdAt ? Math.floor((Date.now() - new Date(job.createdAt)) / 86400000) : 0;
                                  const sb = job.statusBreakdown || {};
                                  return (
                                    <tr key={job.id} className="table-row">
                                      <td className="table-cell px-4">
                                        <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{job.displayId ?? 'â€”'}</span>
                                      </td>
                                      <td className="table-cell px-4 font-medium text-slate-800 max-w-[200px] truncate">{job.title}</td>
                                      <td className="table-cell px-4 text-slate-500 text-xs">
                                        {job.user ? `${job.user.firstName} ${job.user.lastName}` : 'Unassigned'}
                                      </td>
                                      <td className="table-cell px-4">
                                        <span className={`status-badge text-xs ${
                                          job.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700' :
                                          job.status === 'FILLED' ? 'bg-blue-50 text-blue-700' :
                                          job.status === 'ON_HOLD' ? 'bg-amber-50 text-amber-700' :
                                          'bg-slate-100 text-slate-600'
                                        }`}>{job.status.replace('_', ' ')}</span>
                                      </td>
                                      <td className="table-cell px-4 text-center font-semibold text-slate-800">{job.submissionCount}</td>
                                      <td className="table-cell px-4">
                                        <div className="flex flex-wrap gap-1">
                                          {Object.entries(sb).map(([s, cnt]) => (
                                            <span key={s} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_BADGE[s] ?? 'bg-slate-100 text-slate-600'}`}>
                                              {s.slice(0, 3)} {cnt}
                                            </span>
                                          ))}
                                          {!Object.keys(sb).length && <span className="text-xs text-slate-400">â€”</span>}
                                        </div>
                                      </td>
                                      <td className="table-cell px-4">
                                        <span className={`text-xs font-medium ${d > 45 ? 'text-red-600' : d > 25 ? 'text-amber-600' : 'text-slate-600'}`}>{d}d</span>
                                      </td>
                                      <td className="table-cell px-4">
                                        <Link href={`/jobs/view/${job.id}`} className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1">
                                          <Eye size={12} /> View
                                        </Link>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* STALLED JDs */}
              {tab === 'stalled' && (
                <div className="card overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-500" />
                    <h3 className="section-title">JDs Open &gt; 30 Days</h3>
                    <span className="status-badge health-atrisk ml-2">{filteredStalled.length}</span>
                  </div>
                  {filteredStalled.length === 0 ? (
                    <div className="p-10 text-center">
                      <CheckCircle2 size={32} className="text-emerald-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-400">No stalled JDs â€” great job!</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            {['JD ID', 'Title', 'Client', 'Owner', 'Days Open', 'Submissions', 'Action'].map(h => (
                              <th key={h} className="table-header text-left px-4 py-3">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStalled.map(jd => {
                            const d = daysAgo(jd.createdAt);
                            return (
                              <tr key={jd.id} className="table-row">
                                <td className="table-cell px-4">
                                  <span className="status-badge bg-slate-100 text-slate-600">{jd.displayId ?? 'â€”'}</span>
                                </td>
                                <td className="table-cell px-4 font-medium text-slate-800">{jd.title}</td>
                                <td className="table-cell px-4 text-slate-500 text-xs">{jd.clientName || 'â€”'}</td>
                                <td className="table-cell px-4 text-slate-600">{jd.user?.firstName} {jd.user?.lastName}</td>
                                <td className="table-cell px-4">
                                  <span className={`status-badge ${d > 45 ? 'health-stalled' : 'health-atrisk'}`}>{d}d</span>
                                </td>
                                <td className="table-cell px-4 text-slate-600">{jd._count?.applications ?? 0}</td>
                                <td className="table-cell px-4">
                                  <Link href={`/jobs/view/${jd.id}`} className="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
                                    View <ChevronRight size={12} />
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </RoleGuard>
    </DashboardLayout>
  );
}
