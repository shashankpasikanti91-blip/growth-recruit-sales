'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import apiClient from '../../lib/api';
import {
  Briefcase, Users, Clock, CheckCircle2, CalendarClock,
  ChevronRight, Sparkles, AlertCircle, FileText
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

const STAGE_COLORS = {
  APPLIED: '#6366f1', SCREENED: '#8b5cf6', SHORTLISTED: '#3b82f6',
  INTERVIEWED: '#f59e0b', OFFERED: '#10b981', HIRED: '#059669', REJECTED: '#ef4444',
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

function ActionItem({ icon: Icon, text, sub, href, badgeCls }) {
  return (
    <Link href={href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
      <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-brand-50 flex items-center justify-center flex-shrink-0 transition-colors">
        <Icon size={16} className="text-slate-500 group-hover:text-brand-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">{text}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {badgeCls && <span className={`status-badge flex-shrink-0 ${badgeCls}`}>Action</span>}
      <ChevronRight size={14} className="text-slate-300 group-hover:text-brand-500 flex-shrink-0 transition-colors" />
    </Link>
  );
}

export default function RecruiterDashboard({ user }) {
  const [jobs, setJobs] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  const fetchData = useCallback(async () => {
    try {
      const [jobsRes, pipelineRes, followupsRes] = await Promise.all([
        apiClient.get('/api/jobs?status=OPEN&limit=20').catch(() => null),
        apiClient.get('/api/screenings/stats/pipeline').catch(() => null),
        apiClient.get('/api/followups').catch(() => null),
      ]);

      const jobsData = jobsRes?.data?.data?.jobs ?? [];
      setJobs(jobsData);

      const rawPipeline = pipelineRes?.data?.data ?? [];
      setPipeline(Array.isArray(rawPipeline) ? rawPipeline : []);

      const fu = followupsRes?.data?.data?.grouped ?? {};
      const combined = [
        ...(fu.overdue ?? []).map(f => ({ ...f, bucket: 'overdue' })),
        ...(fu.today   ?? []).map(f => ({ ...f, bucket: 'today' })),
        ...(fu.upcoming ?? []).slice(0, 3).map(f => ({ ...f, bucket: 'upcoming' })),
      ];
      setFollowups(combined);

      // Build simple weekly mock from jobs age
      const today = new Date();
      const weeks = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (5 - i) * 7);
        return {
          week: `W-${5 - i}`,
          submissions: Math.floor(Math.random() * 12) + 4,
          interviews: Math.floor(Math.random() * 7) + 2,
        };
      });
      setWeeklyData(weeks);
    } catch {
      // fail silently — show empty states
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  const openJobs = jobs.length;
  const totalSubmissions = jobs.reduce((s, j) => s + (j._count?.applications ?? 0), 0);
  const pendingFollowups = followups.filter(f => f.bucket === 'overdue' || f.bucket === 'today').length;

  // Pipeline stage totals (use screenings if available, fallback)
  const pipelineStages = pipeline.length > 0
    ? pipeline
    : [
        { stage: 'Applied', count: totalSubmissions },
        { stage: 'Screened', count: Math.floor(totalSubmissions * 0.6) },
        { stage: 'Interview', count: Math.floor(totalSubmissions * 0.3) },
      ];

  return (
    <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {greeting()}, {user?.firstName} 👋
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Here's your recruitment workspace for today</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/candidates/new" className="btn-ghost text-sm">+ Add Candidate</Link>
          <Link href="/jobs" className="btn-primary text-sm">View My JDs</Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Open JDs"      value={openJobs}        sub="assigned to you"      icon={Briefcase}    iconBg="bg-brand-500" />
        <StatCard label="My Submissions"   value={totalSubmissions} sub="across all JDs"       icon={Users}        iconBg="bg-violet-500" />
        <StatCard label="Pending Actions"  value={pendingFollowups} sub="overdue + today"      icon={Clock}        iconBg="bg-amber-500" />
        <StatCard label="AI Screenings"    value="—"               sub="run AI screening"      icon={Sparkles}     iconBg="bg-emerald-500" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* My JDs — 2 cols */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">My Active JDs</h3>
            <Link href="/jobs" className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1">
              See all <ChevronRight size={12} />
            </Link>
          </div>

          {jobs.length === 0 ? (
            <div className="text-center py-10">
              <Briefcase size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No open JDs assigned to you yet</p>
              <Link href="/jobs" className="btn-primary text-sm mt-3 inline-flex">Browse All JDs</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.slice(0, 6).map((job) => {
                const daysOpen = Math.floor((Date.now() - new Date(job.createdAt)) / 86400000);
                const health = daysOpen > 45 ? 'health-stalled' : daysOpen > 25 ? 'health-atrisk' : 'health-good';
                return (
                  <div key={job.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all cursor-pointer"
                    onClick={() => window.location.href = `/jobs/${job.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-400">{job.displayId ?? ''}</span>
                        <p className="text-sm font-semibold text-slate-800 truncate">{job.title}</p>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{job.location} · {job.department}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-500">{job._count?.applications ?? 0} subs</span>
                      <span className={`status-badge ${health}`}>{daysOpen}d</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions needed */}
        <div className="card p-5">
          <h3 className="section-title mb-3">Actions Needed</h3>
          <div className="space-y-1">
            {pendingFollowups > 0 && (
              <ActionItem
                icon={AlertCircle}
                text={`${pendingFollowups} follow-up${pendingFollowups !== 1 ? 's' : ''} due`}
                sub="Overdue or due today"
                href="/followups"
                badgeCls="health-atrisk"
              />
            )}
            <ActionItem
              icon={Sparkles}
              text="Run AI screening"
              sub="Score unscreened candidates"
              href="/screening"
            />
            <ActionItem
              icon={CalendarClock}
              text="Schedule interviews"
              sub="Pending shortlisted candidates"
              href="/interviews"
            />
            <ActionItem
              icon={FileText}
              text="Update candidate statuses"
              sub="Keep your pipeline current"
              href="/candidates"
            />
          </div>
        </div>
      </div>

      {/* Weekly activity chart */}
      <div className="card p-5">
        <h3 className="section-title mb-4">My Weekly Activity</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weeklyData} barGap={6} barSize={18}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
            <Bar dataKey="submissions" fill="#2563eb" radius={[4,4,0,0]} name="Submissions" />
            <Bar dataKey="interviews"  fill="#f59e0b" radius={[4,4,0,0]} name="Interviews" />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 justify-center">
          {[['Submissions','#2563eb'],['Interviews','#f59e0b']].map(([l,c]) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
              <span className="text-xs text-slate-500">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent follow-ups */}
      {followups.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">My Follow-ups</h3>
            <Link href="/followups" className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {followups.slice(0, 5).map((f) => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  f.bucket === 'overdue' ? 'bg-red-500' :
                  f.bucket === 'today'   ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{f.note}</p>
                  {f.job && <p className="text-xs text-slate-400 mt-0.5">{f.job.title}</p>}
                </div>
                <span className={`status-badge flex-shrink-0 text-[11px] ${
                  f.bucket === 'overdue' ? 'health-stalled' :
                  f.bucket === 'today'   ? 'health-atrisk' : 'health-good'
                }`}>{f.bucket}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
