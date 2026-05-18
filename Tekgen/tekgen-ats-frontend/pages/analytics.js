'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import DashboardLayout from '../components/layout/DashboardLayout';
import apiClient from '../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  Users, Briefcase, CheckCircle2, Clock,
  ArrowUp, ArrowDown, Minus
} from 'lucide-react';

// ── Color tokens ──────────────────────────────────────────────────────────────

const RECRUITER_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const PIPELINE_COLORS = {
  Applied: '#6366f1', Screened: '#8b5cf6', Interview: '#f59e0b',
  Offer: '#10b981', Hired: '#059669', Rejected: '#ef4444',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function Trend({ value }) {
  if (value > 0) return <span className="flex items-center gap-0.5 text-emerald-600 text-xs font-medium"><ArrowUp size={12} />+{value}%</span>;
  if (value < 0) return <span className="flex items-center gap-0.5 text-red-500 text-xs font-medium"><ArrowDown size={12} />{value}%</span>;
  return <span className="flex items-center gap-0.5 text-slate-400 text-xs"><Minus size={12} />0%</span>;
}

function KpiCard({ label, value, sub, icon: Icon, iconBg, trend }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-900">{value ?? '—'}</p>
          <div className="flex items-center gap-2 mt-1">
            {sub && <span className="text-xs text-slate-400">{sub}</span>}
            {trend !== undefined && <Trend value={trend} />}
          </div>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function RecruiterRow({ recruiter, index, maxSubmissions }) {
  const barWidth = maxSubmissions > 0 ? Math.round((recruiter.submissions / maxSubmissions) * 100) : 0;
  const conversionRate = recruiter.submissions > 0
    ? Math.round((recruiter.hired / recruiter.submissions) * 100)
    : 0;
  const color = RECRUITER_COLORS[index % RECRUITER_COLORS.length];

  const healthStyle = conversionRate >= 20
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : conversionRate >= 10
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-red-50 text-red-700 border-red-200';
  const healthLabel = conversionRate >= 20 ? 'High' : conversionRate >= 10 ? 'Avg' : 'Low';

  return (
    <tr className="table-row">
      <td className="table-cell px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: color }}>
            {recruiter.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{recruiter.name}</p>
            <p className="text-xs text-slate-400">{recruiter.activeJDs} active JD{recruiter.activeJDs !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </td>
      <td className="table-cell px-4 text-center font-semibold text-slate-800">{recruiter.submissions}</td>
      <td className="table-cell px-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${barWidth}%`, background: color }} />
          </div>
          <span className="text-xs text-slate-500 w-6 flex-shrink-0">{barWidth}%</span>
        </div>
      </td>
      <td className="table-cell px-4 text-center font-semibold text-emerald-600">{recruiter.hired}</td>
      <td className="table-cell px-4 text-center">
        <span className={`status-badge border ${healthStyle}`}>{conversionRate}% · {healthLabel}</span>
      </td>
      <td className="table-cell px-4 text-center text-slate-600">{recruiter.interviews}</td>
      <td className="table-cell px-4 text-center">
        <span className="text-sm font-semibold text-slate-700">{recruiter.closureRatio}%</span>
      </td>
    </tr>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'overview',   label: 'Overview' },
  { key: 'recruiters', label: 'Recruiter Performance' },
  { key: 'pipeline',   label: 'Pipeline Trends' },
  { key: 'sla',        label: 'SLA & Timelines' },
];
const PERIOD_OPTIONS = ['daily', 'weekly', 'monthly', 'yearly'];

// ── Mock data ─────────────────────────────────────────────────────────────────

function getMockData() {
  return {
    totals: { totalCandidates: 124, totalJobs: 18, totalHired: 14, totalApplications: 87 },
    kpis: { avgTimeToHire: 32, avgTimeToSubmit: 4, offerAcceptRate: 78, activeJDs: 12 },
    recruiters: [
      { name: 'Shashank P.', submissions: 28, hired: 7, interviews: 15, activeJDs: 4, closureRatio: 25 },
      { name: 'Savitha M.',  submissions: 22, hired: 5, interviews: 11, activeJDs: 3, closureRatio: 23 },
      { name: 'Jerry K.',    submissions: 19, hired: 4, interviews:  9, activeJDs: 3, closureRatio: 21 },
      { name: 'Demo User',   submissions:  8, hired: 1, interviews:  3, activeJDs: 2, closureRatio: 13 },
    ],
    weeklyTrend: [
      { week: 'W-6', submissions: 12, hires: 2, interviews: 6 },
      { week: 'W-5', submissions: 18, hires: 3, interviews: 9 },
      { week: 'W-4', submissions: 15, hires: 2, interviews: 8 },
      { week: 'W-3', submissions: 22, hires: 4, interviews: 11 },
      { week: 'W-2', submissions: 19, hires: 3, interviews: 10 },
      { week: 'W-1', submissions: 26, hires: 5, interviews: 14 },
    ],
    pipeline: [
      { name: 'Applied',   value: 52 },
      { name: 'Screened',  value: 38 },
      { name: 'Interview', value: 22 },
      { name: 'Offer',     value: 16 },
      { name: 'Hired',     value: 14 },
      { name: 'Rejected',  value: 18 },
    ],
    sla: [
      { metric: 'Avg Days to First Submit', target: 5,  actual: 4,  status: 'good' },
      { metric: 'Avg Days to Interview',    target: 14, actual: 11, status: 'good' },
      { metric: 'Avg Days to Offer',        target: 21, actual: 26, status: 'atrisk' },
      { metric: 'Avg Time to Hire',         target: 30, actual: 32, status: 'atrisk' },
      { metric: 'Offer Accept Rate',        target: 80, actual: 78, status: 'atrisk', unit: '%' },
      { metric: 'JDs Closed within SLA',    target: 90, actual: 72, status: 'stalled', unit: '%' },
    ],
    past: [
      { month: 'Nov', candidates: 18, jobs: 4, hired: 2, applications: 14 },
      { month: 'Dec', candidates: 22, jobs: 3, hired: 3, applications: 18 },
      { month: 'Jan', candidates: 19, jobs: 5, hired: 2, applications: 15 },
      { month: 'Feb', candidates: 28, jobs: 6, hired: 4, applications: 22 },
      { month: 'Mar', candidates: 24, jobs: 4, hired: 3, applications: 19 },
      { month: 'Apr', candidates: 31, jobs: 7, hired: 5, applications: 26 },
    ],
  };
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [enterpriseKpis, setEnterpriseKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [period, setPeriod] = useState('monthly');

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    if (!router.isReady) return;
    const requestedTab = Array.isArray(router.query.tab) ? router.query.tab[0] : router.query.tab;
    if (requestedTab && TABS.some((t) => t.key === requestedTab)) {
      setTab(requestedTab);
    }
  }, [router.isReady, router.query.tab]);

  const fetchData = async () => {
    try {
      const [res, kpiRes] = await Promise.all([
        apiClient.get('/api/analytics/timeline').catch(() => null),
        apiClient.get('/api/hrms/kpis').catch(() => null),
      ]);
      const raw = res?.data?.data ?? null;
      const mock = getMockData();
      setData(raw ? {
        totals:      raw.totals      ?? mock.totals,
        kpis:        raw.kpis        ?? mock.kpis,
        recruiters:  raw.recruiters  ?? mock.recruiters,
        weeklyTrend: raw.weeklyTrend ?? mock.weeklyTrend,
        pipeline:    raw.pipeline    ?? mock.pipeline,
        sla:         raw.sla         ?? mock.sla,
        past:        raw.past        ?? mock.past,
      } : mock);
      setEnterpriseKpis(kpiRes?.data?.data || null);
    } catch {
      setData(getMockData());
    } finally {
      setLoading(false);
    }
  };

  const maxSubmissions = Math.max(...(data?.recruiters?.map(r => r.submissions) ?? [1]));
  const timeline = useMemo(() => data?.past ?? [], [data?.past]);
  const periodKpis = useMemo(() => {
    const latest = timeline[timeline.length - 1] || { candidates: 0, jobs: 0, hired: 0 };
    const monthCandidates = latest.candidates || 0;
    const monthJobs = latest.jobs || 0;
    const monthHired = latest.hired || 0;
    const monthTimeToHire = data?.kpis?.avgTimeToHire || 0;

    if (period === 'daily') {
      return {
        candidates: Math.round(monthCandidates / 22),
        jobs: Math.round(monthJobs / 22),
        hired: Math.round(monthHired / 22),
        timeToHire: Math.max(1, Math.round(monthTimeToHire / 22)),
      };
    }
    if (period === 'weekly') {
      return {
        candidates: Math.round(monthCandidates / 4),
        jobs: Math.round(monthJobs / 4),
        hired: Math.round(monthHired / 4),
        timeToHire: Math.max(1, Math.round(monthTimeToHire / 4)),
      };
    }
    if (period === 'yearly') {
      return {
        candidates: monthCandidates * 12,
        jobs: monthJobs * 12,
        hired: monthHired * 12,
        timeToHire: monthTimeToHire * 12,
      };
    }
    return {
      candidates: monthCandidates,
      jobs: monthJobs,
      hired: monthHired,
      timeToHire: monthTimeToHire,
    };
  }, [timeline, data?.kpis?.avgTimeToHire, period]);
  const recruiterPeriodData = useMemo(() => {
    const base = data?.recruiters ?? [];
    const factor = period === 'daily' ? 1 / 22 : period === 'weekly' ? 1 / 4 : period === 'yearly' ? 12 : 1;
    return base.map((r) => {
      const submissions = Math.max(0, Math.round((r.submissions || 0) * factor));
      const interviews = Math.max(0, Math.round((r.interviews || 0) * factor));
      const hired = Math.max(0, Math.round((r.hired || 0) * factor));
      const activeJDs = Math.max(0, Math.round((r.activeJDs || 0) * factor));
      const closureRatio = submissions > 0 ? Math.round((hired / submissions) * 100) : 0;
      return { ...r, submissions, interviews, hired, activeJDs, closureRatio };
    });
  }, [data?.recruiters, period]);
  const maxPeriodSubmissions = Math.max(...(recruiterPeriodData.map((r) => r.submissions) ?? [1]));

  const operationsBarData = useMemo(() => {
    const k = enterpriseKpis;
    if (!k) {
      return [
        { name: 'Visa (applications)', value: 0 },
        { name: 'Offers pending', value: 0 },
        { name: 'Onboarding in progress', value: 0 },
        { name: 'Offboarding records', value: 0 },
        { name: 'Invoices pending', value: 0 },
        { name: 'Leave pipeline', value: 0 },
        { name: 'Claims pipeline', value: 0 },
      ];
    }
    const op = k.operations || {};
    const s = k.sales || {};
    return [
      { name: 'Interviews today', value: Number(s.interviewsToday ?? 0) },
      { name: 'Submissions today', value: Number(s.submissionsToday ?? 0) },
      { name: 'New reqs (7d)', value: Number(s.newRequirementsWeek ?? 0) },
      { name: 'HIGH / URGENT JDs', value: Number(s.highPriorityOpenJobs ?? 0) },
      { name: 'Targets ≤7d', value: Number(s.submissionTargetsDue7d ?? 0) },
      { name: 'Agreements (30d)', value: Number(s.agreementsRenewal30d ?? 0) },
      { name: 'Visa (applications)', value: Number(k.visa?.newApplications ?? op.visaApplicationsPending ?? 0) },
      { name: 'Offers pending', value: Number(op.offerLettersPending ?? 0) },
      { name: 'Onboarding in progress', value: Number(op.onboardingInProgress ?? 0) },
      { name: 'Offboarding records', value: Number(op.offboardingRecords ?? 0) },
      { name: 'Invoices pending', value: Number(op.invoicesPendingApproval ?? k.finance?.invoicesPending ?? 0) },
      { name: 'Leave pipeline', value: Number(op.pendingLeavePipeline ?? k.pendingActions?.leaves ?? 0) },
      { name: 'Claims pipeline', value: Number(op.pendingClaimPipeline ?? k.pendingActions?.claims ?? 0) },
    ];
  }, [enterpriseKpis]);

  if (loading) {
    return (
      <DashboardLayout title="Analytics">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Loading analytics…</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
      <DashboardLayout title="Analytics & KPIs">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Analytics & KPIs</h2>
            <p className="text-sm text-slate-500 mt-0.5">Recruitment trends plus live sales, finance, and operations counts (job/client displayIds and dates align with Sales Dashboard pulse)</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${
                  period === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          Current reporting period: <span className="font-semibold text-slate-700 capitalize">{period}</span>.
          Charts under Recruitment use hiring timeline data; the operations bar mixes live Sales pulse (meetings, reqs submissions, priorities) with visa, onboarding, invoices, and leave/claim pipelines from <code className="text-[11px] bg-white px-1 rounded border">/api/hrms/kpis</code>.
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Interviews today"
            value={enterpriseKpis?.sales?.interviewsToday ?? 0}
            sub="scheduled interviews"
            icon={Clock}
            iconBg="bg-emerald-500"
          />
          <KpiCard
            label="New client reqs (7d)"
            value={enterpriseKpis?.sales?.newRequirementsWeek ?? 0}
            sub="with clientId"
            icon={Briefcase}
            iconBg="bg-teal-500"
          />
          <KpiCard
            label="HIGH / URGENT JDs"
            value={enterpriseKpis?.sales?.highPriorityOpenJobs ?? 0}
            sub="open positions"
            icon={Users}
            iconBg="bg-amber-500"
          />
          <KpiCard
            label="Submissions today"
            value={enterpriseKpis?.sales?.submissionsToday ?? 0}
            sub="to clients"
            icon={CheckCircle2}
            iconBg="bg-lime-600"
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="HR Pending Leaves"
            value={enterpriseKpis?.pendingActions?.leaves ?? 0}
            sub={enterpriseKpis?.operations?.pendingLeavePipeline != null ? `pipeline ${enterpriseKpis.operations.pendingLeavePipeline}` : 'all departments'}
            icon={Clock}
            iconBg="bg-violet-500"
          />
          <KpiCard
            label="Claims pipeline"
            value={enterpriseKpis?.operations?.pendingClaimPipeline ?? enterpriseKpis?.pendingActions?.claims ?? 0}
            sub="pending expense claims"
            icon={Users}
            iconBg="bg-sky-500"
          />
          <KpiCard label="Payroll Pending" value={enterpriseKpis?.pendingActions?.payrollApprovals ?? 0} sub="approval steps" icon={Briefcase} iconBg="bg-amber-500" />
          <KpiCard label="Sales Follow-ups" value={enterpriseKpis?.sales?.followUpsDue ?? 0} sub="due in pipeline" icon={Users} iconBg="bg-emerald-500" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Invoice / cash alerts"
            value={enterpriseKpis?.sales?.invoicesNeedAttention ?? 0}
            sub="overdue or chase"
            icon={CheckCircle2}
            iconBg="bg-rose-600"
          />
          <KpiCard label="Visa (applications)" value={enterpriseKpis?.visa?.newApplications ?? 0} sub="permits desk" icon={Briefcase} iconBg="bg-indigo-500" />
          <KpiCard label="Offers pending" value={enterpriseKpis?.operations?.offerLettersPending ?? 0} sub="onboarding queue" icon={CheckCircle2} iconBg="bg-teal-500" />
          <KpiCard label="Onboarding in progress" value={enterpriseKpis?.operations?.onboardingInProgress ?? 0} sub="HR operations" icon={Users} iconBg="bg-cyan-500" />
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-600">
          <span className="font-medium text-slate-700">Drill-down:</span>
          <Link href="/executive/pending-center" className="text-brand-600 hover:underline">Executive Pending</Link>
          <Link href="/sales" className="text-brand-600 hover:underline">Sales</Link>
          <Link href="/sales/requirements" className="text-brand-600 hover:underline">Requirements</Link>
          <Link href="/visa" className="text-brand-600 hover:underline">Visa</Link>
          <Link href="/hr/onboarding" className="text-brand-600 hover:underline">Onboarding</Link>
          <Link href="/finance/invoices" className="text-brand-600 hover:underline">Invoices</Link>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Candidates"   value={periodKpis.candidates}          sub={`${period} pipeline`} icon={Users}        iconBg="bg-brand-500"   trend={12} />
          <KpiCard label="Active JDs"         value={periodKpis.jobs}                sub={`${period} open`}     icon={Briefcase}    iconBg="bg-violet-500"  trend={-5} />
          <KpiCard label="Hired"              value={periodKpis.hired}               sub={`${period} outcomes`} icon={CheckCircle2} iconBg="bg-emerald-500" trend={8} />
          <KpiCard label="Avg Time to Hire"   value={`${periodKpis.timeToHire}d`}    sub={`period: ${period}`}  icon={Clock}        iconBg="bg-amber-500"   trend={-3} />
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                tab === t.key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ────────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Recruitment</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Monthly trends area chart */}
              <div className="card p-5">
                <h3 className="section-title mb-4">Monthly Hiring Trend</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
                    <Area type="monotone" dataKey="candidates" stroke="#2563eb" fill="#dbeafe" strokeWidth={2} name="Candidates" />
                    <Area type="monotone" dataKey="hired"      stroke="#10b981" fill="#d1fae5" strokeWidth={2} name="Hired" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Pipeline donut */}
              <div className="card p-5">
                <h3 className="section-title mb-4">Pipeline Distribution</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={data.pipeline} cx="50%" cy="50%" outerRadius={80} innerRadius={42} paddingAngle={3} dataKey="value">
                      {data.pipeline.map((entry) => (
                        <Cell key={entry.name} fill={PIPELINE_COLORS[entry.name] || '#3b82f6'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {data.pipeline.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIPELINE_COLORS[d.name] }} />
                      <span className="text-[11px] text-slate-600 truncate">{d.name}</span>
                      <span className="text-[11px] font-bold text-slate-800 ml-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Weekly activity bar chart */}
            <div className="card p-5">
              <h3 className="section-title mb-4">Weekly Activity</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.weeklyTrend} barGap={6} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="submissions" fill="#2563eb" radius={[4,4,0,0]} name="Submissions" />
                  <Bar dataKey="interviews"  fill="#f59e0b" radius={[4,4,0,0]} name="Interviews" />
                  <Bar dataKey="hires"       fill="#10b981" radius={[4,4,0,0]} name="Hires" />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2 justify-center">
                {[['Submissions','#2563eb'],['Interviews','#f59e0b'],['Hires','#10b981']].map(([l,c]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
                    <span className="text-xs text-slate-500">{l}</span>
                  </div>
                ))}
              </div>
            </div>
            </div>

            <div className="pt-6 border-t border-slate-200">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">HR and operations</h3>
              <p className="text-xs text-slate-500 mb-3">
                Counts align with <Link href="/executive/pending-center" className="text-brand-600 hover:underline">Executive Pending Center</Link> and HR routes (visa, onboarding, offboarding, invoices).
              </p>
              <div className="card p-5">
                <h3 className="section-title mb-4">Cross-department pending (live)</h3>
                <ResponsiveContainer width="100%" height={Math.max(220, operationsBarData.length * 36)}>
                  <BarChart data={operationsBarData} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }} barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={168} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} formatter={(v) => [v, 'Count']} />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 6, 6, 0]} name="Pending / pipeline" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── RECRUITER PERFORMANCE ───────────────────────────────────────── */}
        {tab === 'recruiters' && (
          <div className="space-y-5">

            {/* Per-recruiter summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {recruiterPeriodData.map((r, i) => {
                const rate = r.submissions > 0 ? Math.round((r.hired / r.submissions) * 100) : 0;
                return (
                  <div key={r.name} className="card p-4">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ background: RECRUITER_COLORS[i % RECRUITER_COLORS.length] }}>
                        {r.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{r.name}</p>
                        <p className="text-xs text-slate-400">{r.activeJDs} active JDs</p>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between"><span>Submissions</span><span className="font-semibold text-slate-800">{r.submissions}</span></div>
                      <div className="flex justify-between"><span>Interviews</span><span className="font-semibold text-slate-800">{r.interviews}</span></div>
                      <div className="flex justify-between"><span>Hired</span><span className="font-semibold text-emerald-600">{r.hired}</span></div>
                      <div className="flex justify-between"><span>Conversion</span>
                        <span className={`font-semibold ${rate >= 20 ? 'text-emerald-600' : rate >= 10 ? 'text-amber-600' : 'text-red-500'}`}>{rate}%</span>
                      </div>
                    </div>
                    <div className="mt-2.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${rate}%`, background: RECRUITER_COLORS[i % RECRUITER_COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comparison bar chart */}
            <div className="card p-5">
              <h3 className="section-title mb-1">Submission Comparison</h3>
              <p className="text-xs text-slate-500 mb-3 capitalize">Based on {period} period</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={recruiterPeriodData} barGap={6} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="submissions" fill="#2563eb" radius={[4,4,0,0]} name="Submissions" />
                  <Bar dataKey="interviews"  fill="#f59e0b" radius={[4,4,0,0]} name="Interviews" />
                  <Bar dataKey="hired"       fill="#10b981" radius={[4,4,0,0]} name="Hired" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed leaderboard table */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="section-title">Detailed Leaderboard</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="table-header text-left px-4 py-3">Recruiter</th>
                      <th className="table-header text-center px-4 py-3">Submissions</th>
                      <th className="table-header px-4 py-3">Volume</th>
                      <th className="table-header text-center px-4 py-3">Hired</th>
                      <th className="table-header text-center px-4 py-3">Conversion</th>
                      <th className="table-header text-center px-4 py-3">Interviews</th>
                      <th className="table-header text-center px-4 py-3">Closure %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recruiterPeriodData.map((r, i) => (
                      <RecruiterRow key={r.name} recruiter={r} index={i} maxSubmissions={maxPeriodSubmissions} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── PIPELINE TRENDS ─────────────────────────────────────────────── */}
        {tab === 'pipeline' && (
          <div className="space-y-5">
            <div className="card p-5">
              <h3 className="section-title mb-4">6-Month Candidate Activity</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={timeline} barGap={4} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="candidates"   fill="#2563eb" radius={[3,3,0,0]} name="Candidates" />
                  <Bar dataKey="applications" fill="#8b5cf6" radius={[3,3,0,0]} name="Applications" />
                  <Bar dataKey="hired"        fill="#10b981" radius={[3,3,0,0]} name="Hired" />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2 justify-center">
                {[['Candidates','#2563eb'],['Applications','#8b5cf6'],['Hired','#10b981']].map(([l,c]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
                    <span className="text-xs text-slate-500">{l}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="section-title">Monthly Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Month','Candidates','Applications','Jobs Posted','Hired'].map(h => (
                        <th key={h} className="table-header text-left px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeline.map((row) => (
                      <tr key={row.month} className="table-row">
                        <td className="table-cell px-4 font-semibold text-slate-800">{row.month}</td>
                        <td className="table-cell px-4">{row.candidates}</td>
                        <td className="table-cell px-4">{row.applications}</td>
                        <td className="table-cell px-4">{row.jobs}</td>
                        <td className="table-cell px-4 font-semibold text-emerald-600">{row.hired}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── SLA & TIMELINES ─────────────────────────────────────────────── */}
        {tab === 'sla' && (
          <div className="space-y-5">
            <div className="card p-5">
              <h3 className="section-title mb-1">SLA Performance</h3>
              <p className="text-sm text-slate-500 mb-5">How the team is tracking against defined hiring timelines</p>
              <div className="space-y-4">
                {data.sla?.map((item) => {
                  const isPercent = item.unit === '%';
                  const pct = isPercent
                    ? Math.min(item.actual, 100)
                    : Math.min(Math.round((item.target / Math.max(item.actual, 1)) * 100), 100);
                  const healthColor = item.status === 'good' ? '#10b981'
                    : item.status === 'atrisk' ? '#f59e0b' : '#ef4444';
                  const statusLabel = item.status === 'good' ? 'On Target'
                    : item.status === 'atrisk' ? 'At Risk' : 'Off Track';

                  return (
                    <div key={item.metric} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="text-sm font-medium text-slate-700">{item.metric}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400">
                            Target: <strong>{item.target}{item.unit ?? 'd'}</strong>
                          </span>
                          <span className="text-xs font-semibold" style={{ color: healthColor }}>
                            Actual: {item.actual}{item.unit ?? 'd'}
                          </span>
                          <span className={`status-badge text-[11px] border ${
                            item.status === 'good' ? 'health-good' :
                            item.status === 'atrisk' ? 'health-atrisk' : 'health-stalled'
                          }`}>{statusLabel}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: healthColor }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card p-5 text-center">
                <p className="text-3xl font-bold text-slate-900">{data.kpis?.avgTimeToSubmit}d</p>
                <p className="text-sm text-slate-500 mt-1">Avg Time to First Submit</p>
                <span className="status-badge health-good mt-2 inline-flex">Under target</span>
              </div>
              <div className="card p-5 text-center">
                <p className="text-3xl font-bold text-slate-900">{data.kpis?.avgTimeToHire}d</p>
                <p className="text-sm text-slate-500 mt-1">Avg Time to Hire</p>
                <span className="status-badge health-atrisk mt-2 inline-flex">2d over target</span>
              </div>
              <div className="card p-5 text-center">
                <p className="text-3xl font-bold text-slate-900">{data.kpis?.offerAcceptRate}%</p>
                <p className="text-sm text-slate-500 mt-1">Offer Accept Rate</p>
                <span className="status-badge health-atrisk mt-2 inline-flex">2% below target</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

