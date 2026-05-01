'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '../../lib/api';
import {
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  Briefcase, Users, CheckCircle2, AlertTriangle,
  TrendingUp, ChevronRight, Shield, Activity, UserCheck,
  Building2, Eye, Search, X,
} from 'lucide-react';

const STAGE_COLORS = {
  APPLIED: '#6366f1', SCREENED: '#8b5cf6', SHORTLISTED: '#3b82f6',
  INTERVIEWED: '#f59e0b', OFFERED: '#10b981', HIRED: '#059669', REJECTED: '#ef4444',
};
const RECRUITER_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

const STATUS_BADGE = {
  APPLIED:     'bg-indigo-100 text-indigo-700',
  SCREENED:    'bg-violet-100 text-violet-700',
  SHORTLISTED: 'bg-blue-100 text-blue-700',
  INTERVIEWED: 'bg-amber-100 text-amber-700',
  OFFERED:     'bg-cyan-100 text-cyan-700',
  HIRED:       'bg-emerald-100 text-emerald-700',
  REJECTED:    'bg-red-100 text-red-700',
};

function StatCard({ label, value, sub, icon: Icon, iconBg }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-900">{value ?? '—'}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard({ user }) {
  const [monitoring, setMonitoring] = useState(null);
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedClient, setExpandedClient] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [monRes, statsRes, clientRes] = await Promise.all([
        apiClient.get('/api/admin/monitoring').catch(() => null),
        apiClient.get('/api/admin/stats').catch(() => null),
        apiClient.get('/api/admin/jobs').catch(() => null),
      ]);
      setMonitoring(monRes?.data?.data ?? null);
      setStats(statsRes?.data?.data ?? null);
      setClients(clientRes?.data?.data?.clients ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  const recruiters = monitoring?.recruiters ?? [];
  const stalledJDs = monitoring?.stalledJDs ?? [];
  const pipeline = (monitoring?.pipeline ?? [])
    .map(p => ({ name: p.status, value: p._count?.id ?? 0 }))
    .filter(p => p.value > 0);

  const filteredClients = search
    ? clients.filter(c =>
        c.clientName.toLowerCase().includes(search.toLowerCase()) ||
        c.jobs.some(j =>
          j.title.toLowerCase().includes(search.toLowerCase()) ||
          j.displayId?.toLowerCase().includes(search.toLowerCase())
        )
      )
    : clients;

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{greeting()}, {user?.firstName}</h2>
          <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
            <Shield size={13} className="text-brand-500" />
            Admin Command Center
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/monitoring" className="btn-ghost text-sm"><Activity size={15} /> Monitoring</Link>
          <Link href="/jobs/create" className="btn-primary text-sm">+ New JD</Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total JDs"     value={stats?.totalJobs}         sub="all time"          icon={Briefcase}    iconBg="bg-brand-500" />
        <StatCard label="Candidates"    value={stats?.totalCandidates}   sub="in system"         icon={Users}        iconBg="bg-violet-500" />
        <StatCard label="Applications"  value={stats?.totalApplications} sub="total submissions" icon={CheckCircle2} iconBg="bg-emerald-500" />
        <StatCard label="AI Screenings" value={stats?.totalScreenings}   sub="scored"            icon={TrendingUp}   iconBg="bg-amber-500" />
      </div>

      {/* Clients & JDs */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Building2 size={16} className="text-brand-500" />
            <h3 className="section-title">Clients &amp; Job Openings</h3>
            <span className="text-xs text-slate-400">
              {clients.length} clients &middot; {clients.reduce((a, c) => a + c.totalJDs, 0)} JDs
            </span>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search client or JD..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-input pl-8 py-1.5 text-sm w-full"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <X size={12} />
              </button>
            )}
          </div>
          <Link href="/admin/monitoring" className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 whitespace-nowrap">
            Full view <ChevronRight size={12} />
          </Link>
        </div>

        {filteredClients.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No clients yet. Add a Client Name when creating a JD.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredClients.map((client, ci) => {
              const isOpen = expandedClient === client.clientName;
              return (
                <div key={client.clientName}>
                  <button
                    onClick={() => setExpandedClient(isOpen ? null : client.clientName)}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                      style={{ background: RECRUITER_COLORS[ci % RECRUITER_COLORS.length] }}
                    >
                      {client.clientName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{client.clientName}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-500"><strong>{client.totalJDs}</strong> JD{client.totalJDs !== 1 ? 's' : ''}</span>
                      <span className="text-xs text-slate-400">|</span>
                      <span className="text-xs text-slate-500"><strong>{client.totalCVs}</strong> CVs</span>
                      <ChevronRight size={14} className={`text-slate-400 transition-transform ml-1 ${isOpen ? 'rotate-90' : ''}`} />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="bg-slate-50 border-t border-slate-100">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200">
                              {['ID', 'Job Title', 'Recruiter', 'Status', 'CVs', 'Pipeline', ''].map(h => (
                                <th key={h} className="text-left px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {client.jobs.map(job => {
                              const sb = job.statusBreakdown || {};
                              return (
                                <tr key={job.id} className="bg-white hover:bg-brand-50/30 transition-colors">
                                  <td className="px-4 py-2.5">
                                    <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{job.displayId ?? '—'}</span>
                                  </td>
                                  <td className="px-4 py-2.5 font-medium text-slate-800 max-w-[180px]">
                                    <p className="truncate">{job.title}</p>
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-500 text-xs">
                                    {job.user ? `${job.user.firstName} ${job.user.lastName}` : '—'}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className={`status-badge text-xs ${
                                      job.status === 'OPEN'    ? 'bg-emerald-50 text-emerald-700' :
                                      job.status === 'FILLED'  ? 'bg-blue-50 text-blue-700' :
                                      job.status === 'ON_HOLD' ? 'bg-amber-50 text-amber-700' :
                                      'bg-slate-100 text-slate-500'
                                    }`}>{job.status.replace('_', ' ')}</span>
                                  </td>
                                  <td className="px-4 py-2.5 font-bold text-slate-800 text-center">{job.submissionCount}</td>
                                  <td className="px-4 py-2.5">
                                    <div className="flex flex-wrap gap-1">
                                      {Object.entries(sb).map(([s, cnt]) => (
                                        <span key={s} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_BADGE[s] ?? 'bg-slate-100 text-slate-600'}`}>
                                          {s.slice(0, 3)} {cnt}
                                        </span>
                                      ))}
                                      {!Object.keys(sb).length && <span className="text-xs text-slate-400">No CVs yet</span>}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <Link href={`/jobs/view/${job.id}`} className="text-xs text-brand-500 hover:text-brand-700 flex items-center gap-1">
                                      <Eye size={11} /> View
                                    </Link>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recruiter snapshot + Pipeline donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">Recruiter Snapshot</h3>
            <Link href="/admin/monitoring" className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1">
              Workload detail <ChevronRight size={12} />
            </Link>
          </div>
          {recruiters.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No recruiters found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Recruiter', 'Active JDs', 'CVs', 'Screenings', 'Pending'].map(h => (
                      <th key={h} className="text-left pb-2 text-xs font-semibold text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recruiters.map((r, i) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: RECRUITER_COLORS[i % RECRUITER_COLORS.length] }}>
                            {r.firstName?.[0]}{r.lastName?.[0]}
                          </div>
                          <span className="font-medium text-slate-800">{r.firstName} {r.lastName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-center">
                        <span className={`text-sm font-bold ${r.activeJDs > 0 ? 'text-brand-600' : 'text-slate-400'}`}>{r.activeJDs}</span>
                      </td>
                      <td className="py-2.5 text-center font-semibold text-slate-700">{r.totalSubmissions}</td>
                      <td className="py-2.5 text-center font-semibold text-slate-700">{r.totalScreenings}</td>
                      <td className="py-2.5 text-center">
                        {r.openFollowUps > 0
                          ? <span className="status-badge health-atrisk text-xs">{r.openFollowUps}</span>
                          : <span className="text-xs text-slate-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="section-title mb-3">Pipeline Overview</h3>
          {pipeline.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={pipeline} cx="50%" cy="50%" outerRadius={65} innerRadius={35} paddingAngle={3} dataKey="value">
                    {pipeline.map(entry => (
                      <Cell key={entry.name} fill={STAGE_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {pipeline.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STAGE_COLORS[d.name] || '#94a3b8' }} />
                      <span className="text-slate-600 capitalize">{d.name.toLowerCase()}</span>
                    </div>
                    <span className="font-semibold text-slate-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 py-8 text-center">No pipeline data yet</p>
          )}
        </div>
      </div>

      {/* Stalled JDs */}
      {stalledJDs.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <h3 className="section-title">Stalled JDs &mdash; Open &gt; 30 Days</h3>
              <span className="status-badge health-atrisk">{stalledJDs.length}</span>
            </div>
            <Link href="/admin/monitoring" className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['JD ID', 'Title', 'Owner', 'Days Open', 'CVs'].map(h => (
                    <th key={h} className="table-header text-left px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stalledJDs.map(jd => {
                  const d = Math.floor((Date.now() - new Date(jd.createdAt)) / 86400000);
                  return (
                    <tr key={jd.id} className="table-row">
                      <td className="table-cell px-4">
                        <span className="status-badge bg-slate-100 text-slate-600">{jd.displayId ?? '—'}</span>
                      </td>
                      <td className="table-cell px-4 font-medium text-slate-800">
                        <Link href={`/jobs/view/${jd.id}`} className="hover:text-brand-600">{jd.title}</Link>
                      </td>
                      <td className="table-cell px-4 text-slate-600">{jd.user?.firstName} {jd.user?.lastName}</td>
                      <td className="table-cell px-4">
                        <span className={`status-badge ${d > 45 ? 'health-stalled' : 'health-atrisk'}`}>{d}d</span>
                      </td>
                      <td className="table-cell px-4 text-slate-600">{jd._count?.applications ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'User Management', href: '/admin',             icon: UserCheck, color: 'bg-brand-50 text-brand-700 border-brand-100' },
          { label: 'Monitoring',      href: '/admin/monitoring',  icon: Activity,  color: 'bg-violet-50 text-violet-700 border-violet-100' },
          { label: 'Analytics',       href: '/analytics',         icon: TrendingUp, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
          { label: 'Integrations',    href: '/integrations',      icon: Shield,    color: 'bg-amber-50 text-amber-700 border-amber-100' },
        ].map(({ label, href, icon: Icon, color }) => (
          <Link key={label} href={href} className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all hover:shadow-sm ${color}`}>
            <Icon size={15} />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
