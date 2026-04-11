'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api-client';
import { ComposedChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Briefcase, CalendarCheck, Gift, Zap, ArrowRight, Sparkles, ChevronRight, Star } from 'lucide-react';
import Link from 'next/link';

const STAGE_COLORS: Record<string, string> = {
  SOURCED: '#3b82f6',
  SCREENED: '#8b5cf6',
  INTERVIEWING: '#f59e0b',
  OFFERED: '#10b981',
  PLACED: '#06b6d4',
  REJECTED: '#ef4444',
  WITHDRAWN: '#9ca3af',
};

const LEAD_COLORS: Record<string, string> = {
  NEW: '#6b7280',
  CONTACTED: '#3b82f6',
  QUALIFIED: '#8b5cf6',
  PROPOSAL: '#f59e0b',
  NEGOTIATION: '#10b981',
  CLOSED_WON: '#22c55e',
  CLOSED_LOST: '#ef4444',
};

// ─── Colour palettes ──────────────────────────────────────────────────────────
const FUNNEL_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#e879f9'];
const SOURCE_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const sourceBg = [
  'bg-indigo-100 text-indigo-700', 'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700', 'bg-purple-100 text-purple-700',
];

function KpiCard({ label, value, sub, icon: Icon, gradient, href }: {
  label: string; value: number | string; sub?: string;
  icon: React.ElementType; gradient: string; href?: string;
}) {
  const inner = (
    <div className={`rounded-2xl p-5 text-white shadow-md ${gradient} flex items-center gap-4 hover:shadow-lg transition-shadow cursor-pointer`}>
      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="min-w-0">
        <div className="text-3xl font-extrabold leading-none">{value}</div>
        <div className="text-sm font-medium text-white/90 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-white/70 mt-1">{sub}</div>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function DashboardPage() {
  const { data: dash, isLoading: dashLoading, isError: dashError } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => analyticsApi.dashboard(),
  });
  const { data: recruitment } = useQuery({
    queryKey: ['analytics', 'recruitment'],
    queryFn: () => analyticsApi.recruitment(30),
  });
  const { data: aiUsage } = useQuery({
    queryKey: ['analytics', 'ai-usage'],
    queryFn: () => analyticsApi.aiUsage(30),
  });

  // ── KPI values ────────────────────────────────────────────────────────────
  const openPositions: number = dash?.openJobs ?? 0;
  const candidatesInPipeline: number = dash?.openApplications ?? 0;
  const interviewsScheduled: number = dash?.interviewsScheduled ?? 0;
  const offersReleased: number = dash?.offersReleased ?? 0;

  // ── Hiring funnel ─────────────────────────────────────────────────────────
  const stageLabels: Record<string, string> = {
    SOURCED: 'Applied', SCREENED: 'Shortlisted', INTERVIEWING: 'Interview', OFFERED: 'Offer', PLACED: 'Hired',
  };
  const funnelData = (recruitment?.funnel ?? []).map((f: any, i: number) => ({
    name: stageLabels[f.stage] ?? f.stage,
    value: f.count,
    rate: f.rate,
    fill: FUNNEL_COLORS[i] ?? '#6366f1',
  }));

  // ── Source performance ────────────────────────────────────────────────────
  const sourceData: { source: string; count: number; pct: number }[] = dash?.sourcePipeline ?? [];
  const maxSourceCount = sourceData.reduce((m: number, s: any) => Math.max(m, s.count), 1);

  // ── AI Suggestions (derived from live data) ───────────────────────────────
  const aiSuggestions: { priority: 'high' | 'medium' | 'low'; text: string; action: string; href: string }[] = [];
  const topSkill = recruitment?.topSkills?.[0];
  if (topSkill) aiSuggestions.push({ priority: 'high', text: `${topSkill.count} candidates with "${topSkill.skill}" in talent pool`, action: 'View candidates', href: '/candidates' });
  if (interviewsScheduled > 0) aiSuggestions.push({ priority: 'high', text: `${interviewsScheduled} interview${interviewsScheduled > 1 ? 's' : ''} in progress — follow-up recommended`, action: 'View pipeline', href: '/applications' });
  if (offersReleased > 0) aiSuggestions.push({ priority: 'medium', text: `${offersReleased} offer${offersReleased > 1 ? 's' : ''} pending candidate response`, action: 'Check offers', href: '/applications' });
  if ((aiUsage?.summary?.totalCalls ?? 0) === 0 && candidatesInPipeline > 0) aiSuggestions.push({ priority: 'medium', text: `${candidatesInPipeline} candidates not yet AI-screened`, action: 'AI Screen now', href: '/ai/screen' });
  if (openPositions > 0) aiSuggestions.push({ priority: 'low', text: `${openPositions} open position${openPositions > 1 ? 's' : ''} — attract more applicants`, action: 'Manage jobs', href: '/jobs' });
  if (aiSuggestions.length === 0) {
    aiSuggestions.push({ priority: 'low', text: 'Import candidates via CSV or LinkedIn to get AI match scores', action: 'Import now', href: '/imports' });
    aiSuggestions.push({ priority: 'low', text: 'Create your first job and let AI rank candidates by fit', action: 'Create job', href: '/jobs/new' });
  }

  const priorityDot: Record<string, string> = { high: 'bg-rose-500', medium: 'bg-amber-400', low: 'bg-blue-400' };

  const timeSeries = (recruitment?.timeSeries ?? []).slice(-14);
  const isEmpty = openPositions === 0 && candidatesInPipeline === 0 && interviewsScheduled === 0 && offersReleased === 0;

  if (dashLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-400 text-sm mt-0.5">Loading your overview…</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl p-5 bg-gray-100 animate-pulse h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-100 rounded-2xl animate-pulse h-64" />
          <div className="bg-gray-100 rounded-2xl animate-pulse h-64" />
        </div>
      </div>
    );
  }

  if (dashError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Live recruitment overview</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">Failed to load dashboard data</p>
          <p className="text-sm text-red-500 mt-1">Please check your connection and try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Live recruitment overview</p>
        </div>
        <Link href="/analytics" className="flex items-center gap-1 text-sm text-brand-600 font-medium hover:underline">
          Full analytics <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Quick-start only when empty */}
      {isEmpty && (
        <div className="card border-brand-200 bg-gradient-to-br from-brand-50 to-white">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Welcome — get started in 3 steps</h2>
          <p className="text-sm text-gray-500 mb-5">Your dashboard will fill with live data as soon as you add candidates or jobs.</p>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { step: '1', title: 'Import candidates', desc: 'Upload CSV, Excel, PDF, or Word files.', href: '/imports', label: 'Go to Imports' },
              { step: '2', title: 'Post a job', desc: 'Create a job posting so candidates can be linked.', href: '/jobs/new', label: 'Post a Job' },
              { step: '3', title: 'Run AI screening', desc: 'Match candidates to jobs with AI in seconds.', href: '/ai/screen', label: 'AI Screen' },
            ].map((s) => (
              <div key={s.step} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="w-7 h-7 rounded-lg bg-brand-600 text-white text-xs font-bold flex items-center justify-center mb-3">{s.step}</div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{s.title}</h3>
                <p className="text-xs text-gray-500 mb-3">{s.desc}</p>
                <Link href={s.href} className="inline-flex items-center gap-1 text-xs text-brand-600 font-semibold hover:text-brand-800">
                  {s.label} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Top KPI cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Open Positions" value={openPositions} sub="Active job postings" icon={Briefcase} gradient="bg-gradient-to-br from-brand-500 to-brand-700" href="/jobs" />
        <KpiCard label="Candidates in Pipeline" value={candidatesInPipeline} sub="Across all open roles" icon={Users} gradient="bg-gradient-to-br from-violet-500 to-purple-700" href="/applications" />
        <KpiCard label="Interviews Scheduled" value={interviewsScheduled} sub="Active interview stage" icon={CalendarCheck} gradient="bg-gradient-to-br from-emerald-500 to-teal-600" href="/applications" />
        <KpiCard label="Offers Released" value={offersReleased} sub="Awaiting acceptance" icon={Gift} gradient="bg-gradient-to-br from-amber-400 to-orange-500" href="/applications" />
      </div>

      {/* ── Main 2/3 + 1/3 layout ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: Funnel + Source + Trend */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Hiring Funnel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Hiring Funnel</h2>
              <Link href="/applications" className="text-xs text-brand-600 font-medium hover:underline flex items-center gap-1">
                View pipeline <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {funnelData.some((f: any) => f.value > 0) ? (
              <div className="space-y-2">
                {funnelData.map((stage: any, i: number) => {
                  const maxVal = funnelData[0]?.value || 1;
                  const barPct = Math.max(4, Math.round((stage.value / maxVal) * 100));
                  return (
                    <div key={stage.name} className="flex items-center gap-3">
                      <div className="w-20 text-xs font-medium text-gray-500 text-right flex-shrink-0">{stage.name}</div>
                      <div className="flex-1 h-8 bg-gray-50 rounded-lg overflow-hidden">
                        <div
                          className="h-full rounded-lg flex items-center px-3 transition-all duration-500"
                          style={{ width: `${barPct}%`, backgroundColor: FUNNEL_COLORS[i] ?? '#6366f1' }}
                        >
                          <span className="text-xs font-bold text-white">{stage.value}</span>
                        </div>
                      </div>
                      <div className="w-10 text-xs text-gray-400 flex-shrink-0">{stage.rate}%</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-40 flex flex-col items-center justify-center gap-2">
                <Users className="w-8 h-8 text-gray-200" />
                <p className="text-sm text-gray-400">No pipeline data yet</p>
                <Link href="/imports" className="text-xs text-brand-600 font-medium hover:underline">Import candidates →</Link>
              </div>
            )}
          </div>

          {/* Source Performance */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Source Performance</h2>
              <span className="text-xs text-gray-400">By candidate source tag</span>
            </div>
            {sourceData.length > 0 ? (
              <div className="space-y-3">
                {sourceData.map((src: any, i: number) => (
                  <div key={src.source} className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 w-28 text-center ${sourceBg[i] ?? 'bg-gray-100 text-gray-600'}`}>
                      {src.source}
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((src.count / maxSourceCount) * 100)}%`, backgroundColor: SOURCE_COLORS[i] ?? '#6366f1' }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 w-16 text-right flex-shrink-0">
                      {src.count} <span className="font-normal text-gray-400">({src.pct}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {['LinkedIn', 'Email / Referral', 'CSV Import'].map((name) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 w-28 text-center">{name}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full" />
                    <span className="text-xs text-gray-300 w-16 text-right">—</span>
                  </div>
                ))}
                <p className="text-xs text-gray-400 mt-1">Appears after candidates are imported with a source tag.</p>
              </div>
            )}
          </div>

          {/* Activity trend */}
          {timeSeries.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">Activity Trend (14 days)</h2>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Candidates</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500 inline-block" /> Applications</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <ComposedChart data={timeSeries} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="candidates" fill="#ede9fe" stroke="#6366f1" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="applications" fill="#f3e8ff" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* RIGHT: AI Suggestions + AI Usage + Top Skills */}
        <div className="flex flex-col gap-4">
          {/* AI Suggestions */}
          <div className="bg-gradient-to-b from-indigo-50 to-white rounded-2xl border border-indigo-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">AI Suggestions</h2>
                <p className="text-xs text-gray-400">Smart recommendations</p>
              </div>
            </div>
            <div className="space-y-3">
              {aiSuggestions.slice(0, 5).map((s, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-2">
                    <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[s.priority]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-700 leading-relaxed">{s.text}</p>
                      <Link href={s.href} className="inline-flex items-center gap-0.5 text-xs text-brand-600 font-semibold mt-1.5 hover:text-brand-800">
                        {s.action} <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Usage */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-gray-900">AI Usage (30d)</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center bg-amber-50 rounded-xl py-3">
                <div className="text-xl font-extrabold text-amber-600">{aiUsage?.summary?.totalCalls ?? 0}</div>
                <div className="text-xs text-gray-400 mt-0.5">AI Calls</div>
              </div>
              <div className="text-center bg-purple-50 rounded-xl py-3">
                <div className="text-xl font-extrabold text-purple-600">${(aiUsage?.summary?.totalCost ?? 0).toFixed(2)}</div>
                <div className="text-xs text-gray-400 mt-0.5">Est. Cost</div>
              </div>
            </div>
            {(aiUsage?.byService ?? []).slice(0, 2).map((u: any) => (
              <div key={u.serviceType} className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span className="truncate">{u.serviceType.replace(/_/g, ' ')}</span>
                <span className="font-semibold text-gray-700 ml-2">{u.calls}</span>
              </div>
            ))}
            <Link href="/ai" className="inline-flex items-center gap-1 text-xs text-brand-600 font-medium mt-3 hover:underline">
              AI tools <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Top Skills */}
          {(recruitment?.topSkills?.length ?? 0) > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-brand-500" />
                <h2 className="text-sm font-semibold text-gray-900">Top Skills in Pool</h2>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recruitment.topSkills.slice(0, 10).map(({ skill, count }: { skill: string; count: number }) => (
                  <span key={skill} className="text-xs bg-brand-50 text-brand-700 font-medium px-2 py-0.5 rounded-full">
                    {skill} <span className="text-brand-400">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
