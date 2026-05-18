'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Link from 'next/link';
import api from '../lib/api';
import { useRole } from '../lib/useRole';
import { PIPELINE_STAGES } from '../lib/submissionStages';
import {
  ShoppingCart, Users, TrendingUp, BarChart3, DollarSign,
  CheckCircle, Calendar, MapPin, Mail, Phone, Loader2, AlertCircle,
  ArrowUpRight, Building2, FileText, ExternalLink, Briefcase,
  Clock, Bell,
} from 'lucide-react';


const KPI_CARDS = [
  { key: 'totalClients', label: 'Total Clients', icon: Building2, color: 'bg-blue-500' },
  { key: 'activeClients', label: 'Active Clients', icon: CheckCircle, color: 'bg-emerald-500' },
  { key: 'newClientsThisMonth', label: 'New This Month', icon: ArrowUpRight, color: 'bg-violet-500' },
  { key: 'openJDs', label: 'Open Positions', icon: Briefcase, color: 'bg-amber-500' },
  { key: 'totalSubmissions', label: 'Total Submissions', icon: FileText, color: 'bg-indigo-500' },
  { key: 'totalOffers', label: 'Offers Made', icon: CheckCircle, color: 'bg-teal-500' },
  { key: 'totalClosures', label: 'Candidates Joined', icon: Users, color: 'bg-pink-500' },
  { key: 'pendingFeedback', label: 'Pending Feedback', icon: Mail, color: 'bg-orange-500' },
];

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-900">{value || 0}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function ClientCard({ client }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <Link href={`/sales/clients/${client.id}`} className="font-semibold text-slate-900 hover:text-brand-500 transition-colors">
            {client.clientName}
          </Link>
          {client.industry && (
            <p className="text-xs text-slate-500 mt-1">{client.industry}</p>
          )}
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
          client.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
          client.status === 'PROSPECT' ? 'bg-blue-100 text-blue-700' :
          'bg-slate-100 text-slate-600'
        }`}>
          {client.status}
        </span>
      </div>
      
      <div className="grid grid-cols-3 gap-3 text-center text-xs border-t border-slate-100 pt-3">
        <div>
          <p className="text-slate-500 mb-1">Jobs</p>
          <p className="font-bold text-slate-900">{client._count?.jobs || 0}</p>
        </div>
        <div>
          <p className="text-slate-500 mb-1">Submissions</p>
          <p className="font-bold text-slate-900">{client._count?.submissions || 0}</p>
        </div>
        <div>
          <p className="text-slate-500 mb-1">Contacts</p>
          <p className="font-bold text-slate-900">{client._count?.contacts || 0}</p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Link href={`/sales/clients/${client.id}`} className="flex-1 text-center text-xs font-medium text-brand-500 hover:text-brand-600 py-2 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors">
          View Details
        </Link>
      </div>
    </div>
  );
}

function SubmissionRow({ submission, canEdit, onUpdated }) {
  const stageColors = {
    'DRAFT': 'bg-slate-100 text-slate-700',
    'SUBMITTED_TO_SALES': 'bg-blue-100 text-blue-700',
    'SUBMITTED_TO_CLIENT': 'bg-blue-100 text-blue-700',
    'CLIENT_REVIEW': 'bg-amber-100 text-amber-700',
    'INTERVIEW': 'bg-violet-100 text-violet-700',
    'OFFER': 'bg-emerald-100 text-emerald-700',
    'JOINED': 'bg-teal-100 text-teal-700',
    'REJECTED': 'bg-red-100 text-red-700',
  };

  const [stage, setStage] = useState(submission.stage);
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState('');

  useEffect(() => {
    setStage(submission.stage);
  }, [submission.id, submission.stage]);

  const applyStage = async (next) => {
    if (next === stage) return;
    setSaving(true);
    setRowError('');
    try {
      await api.patch(`/api/submissions/${submission.id}/stage`, { stage: next });
      setStage(next);
      onUpdated?.();
    } catch (e) {
      setRowError(e.response?.data?.message || 'Could not update stage');
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-slate-900">{submission.candidate?.candidateName}</p>
        <p className="text-xs text-slate-500">{submission.job?.jobTitle}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-slate-700">{submission.client?.clientName}</p>
      </td>
      <td className="px-4 py-3 align-top">
        {canEdit ? (
          <div className="space-y-1">
            <select
              value={stage}
              disabled={saving}
              onChange={(e) => applyStage(e.target.value)}
              className="text-xs font-medium border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-800 max-w-[200px]"
              aria-label="Pipeline stage"
            >
              {PIPELINE_STAGES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {rowError && <p className="text-[11px] text-red-600">{rowError}</p>}
          </div>
        ) : (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stageColors[submission.stage] || stageColors.DRAFT}`}>
            {submission.stage?.replace(/_/g, ' ')}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <p className="text-xs text-slate-600">{submission.aiMatchScore ? `${submission.aiMatchScore}%` : '—'}</p>
      </td>
      <td className="px-4 py-3 text-right">
        {submission.submittedDate && (
          <p className="text-xs text-slate-600">
            {new Date(submission.submittedDate).toLocaleDateString()}
          </p>
        )}
      </td>
    </tr>
  );
}

export default function SalesDashboard() {
  const { canUpdateSubmissionPipeline } = useRole();
  const [kpis, setKpis] = useState(null);
  const [pulse, setPulse] = useState(null);
  const [topClients, setTopClients] = useState([]);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await api.get('/api/sales/dashboard');
      const data = res.data.data;
      setKpis(data.kpis);
      setPulse(data.pulse || null);
      setTopClients(data.topClients || []);
      setRecentSubmissions(data.recentSubmissions || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <DashboardLayout title="Sales Dashboard">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Sales Dashboard</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-3xl">
              Pipeline tied to <strong>client displayId</strong>, <strong>job displayId</strong>, <strong>dates</strong> (target submission, interviews), and finance. Pilot client <strong>Demo Client – Tekgen Pilot (rename anytime)</strong> — open from Manage Clients for documents &amp; agreements.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/sales/requirements" className="btn-primary flex items-center gap-2">
              <Briefcase size={16} />
              Client requirements
            </Link>
            <Link href="/sales/clients" className="btn-primary flex items-center gap-2">
              <ShoppingCart size={16} />
              Manage Clients
            </Link>
            <Link href="/analytics" className="btn-ghost border border-slate-200 flex items-center gap-2">
              <BarChart3 size={16} />
              Analytics
            </Link>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {pulse && (
              <>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <Calendar size={14} /> Today &amp; this week ({pulse.scope === 'portfolio' ? 'your portfolio' : 'organization'})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
                    <div className="bg-white rounded-lg border border-slate-100 py-2">
                      <p className="text-2xl font-bold text-slate-900">{pulse.interviewsToday}</p>
                      <p className="text-[10px] text-slate-500 uppercase">Interviews today</p>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-100 py-2">
                      <p className="text-2xl font-bold text-slate-900">{pulse.salesFollowUpsToday}</p>
                      <p className="text-[10px] text-slate-500 uppercase">Client follow-ups due</p>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-100 py-2">
                      <p className="text-2xl font-bold text-slate-900">{pulse.newRequirementsWeek}</p>
                      <p className="text-[10px] text-slate-500 uppercase">New reqs (7d)</p>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-100 py-2">
                      <p className="text-2xl font-bold text-slate-900">{pulse.submissionsToday}</p>
                      <p className="text-[10px] text-slate-500 uppercase">Submissions today</p>
                    </div>
                    <div className="bg-white rounded-lg border border-amber-100 py-2 bg-amber-50/50">
                      <p className="text-2xl font-bold text-amber-900">{pulse.highPriorityOpen}</p>
                      <p className="text-[10px] text-amber-800 uppercase">HIGH / URGENT</p>
                    </div>
                    <div className="bg-white rounded-lg border border-rose-100 py-2 bg-rose-50/50">
                      <p className="text-2xl font-bold text-rose-900">{pulse.invoicesAttention}</p>
                      <p className="text-[10px] text-rose-800 uppercase">Invoice alerts</p>
                    </div>
                  </div>
                </div>

                {(pulse.alerts || []).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <Bell size={16} className="text-amber-600" /> Alerts &amp; warnings
                    </h3>
                    <div className="space-y-2">
                      {pulse.alerts.map((a) => (
                        <Link
                          key={a.code}
                          href={a.href || '#'}
                          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
                            a.level === 'critical'
                              ? 'bg-red-50 border-red-200 text-red-900'
                              : 'bg-amber-50 border-amber-200 text-amber-950'
                          }`}
                        >
                          <span>{a.message}</span>
                          <span className="text-xs font-mono text-slate-500">{a.code}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {(pulse.priorityJobs || []).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <AlertCircle size={18} className="text-amber-500" />
                      Priority requirements (ref · client · dates)
                    </h3>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
                      <table className="w-full text-sm min-w-[720px]">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-slate-700">Ref</th>
                            <th className="px-4 py-2 text-left font-semibold text-slate-700">Client</th>
                            <th className="px-4 py-2 text-left font-semibold text-slate-700">Title</th>
                            <th className="px-4 py-2 text-left font-semibold text-slate-700">Priority</th>
                            <th className="px-4 py-2 text-left font-semibold text-slate-700">Target submit</th>
                            <th className="px-4 py-2 text-center font-semibold text-slate-700">HC</th>
                            <th className="px-4 py-2 text-left font-semibold text-slate-700">Recruitment lead</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pulse.priorityJobs.map((j) => (
                            <tr key={j.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                              <td className="px-4 py-2 font-mono text-xs">
                                <Link href={`/jobs/view/${j.id}`} className="text-brand-600 hover:underline">
                                  {j.displayId || j.id.slice(0, 8)}
                                </Link>
                              </td>
                              <td className="px-4 py-2 text-slate-700">
                                {j.client ? (
                                  <Link href={`/sales/clients/${j.client.id}`} className="hover:text-brand-600">
                                    {j.client.displayId ? `${j.client.displayId} · ` : ''}{j.client.clientName}
                                  </Link>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="px-4 py-2 font-medium text-slate-900">{j.title}</td>
                              <td className="px-4 py-2">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  String(j.priority || '').toUpperCase() === 'URGENT' ? 'bg-red-100 text-red-800' :
                                  String(j.priority || '').toUpperCase() === 'HIGH' ? 'bg-amber-100 text-amber-900' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {j.priority || '—'}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-slate-600 text-xs">
                                {j.targetSubmissionDate
                                  ? new Date(j.targetSubmissionDate).toLocaleDateString()
                                  : '—'}
                              </td>
                              <td className="px-4 py-2 text-center">{j.headcount ?? '—'}</td>
                              <td className="px-4 py-2 text-xs text-slate-600">
                                {j.user ? `${j.user.firstName || ''} ${j.user.lastName || ''}`.trim() : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {KPI_CARDS.map(card => (
                <StatCard
                  key={card.key}
                  label={card.label}
                  value={kpis?.[card.key] || 0}
                  icon={card.icon}
                  color={card.color}
                />
              ))}
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Clients */}
              <div className="lg:col-span-2">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Clients</h3>
                  {topClients.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {topClients.map(client => (
                        <ClientCard key={client.id} client={client} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      No clients yet
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-fit">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-widest">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-600">Revenue This Month</span>
                    <span className="font-semibold text-slate-900">Phase 06</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-600">Conversion Rate</span>
                    <span className="font-semibold text-slate-900">—</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-600">Avg Deal Size</span>
                    <span className="font-semibold text-slate-900">—</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Submissions */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Submissions</h3>
              <p className="text-xs text-slate-500 mb-3 max-w-3xl">
                If a handoff was missed, sales or recruitment can <strong>set the stage manually</strong> below. Assignees get an in-app notification when the stage changes.
              </p>
              {recentSubmissions.length > 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Candidate</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Client</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Stage</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Score</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSubmissions.slice(0, 10).map(sub => (
                        <SubmissionRow
                          key={sub.id}
                          submission={sub}
                          canEdit={canUpdateSubmissionPipeline}
                          onUpdated={loadDashboard}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 bg-white rounded-lg border border-slate-200 text-slate-500">
                  No submissions yet
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
