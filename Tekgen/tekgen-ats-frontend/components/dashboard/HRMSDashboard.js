'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '../../lib/api';
import { isHrmsExecutiveQueueRole } from '../../lib/hrmsExecutiveQueueRoles';
import {
  Briefcase, Users, CalendarCheck, DollarSign, Plane,
  ShoppingCart, UserCheck, CreditCard, BarChart3, FileText,
  Settings, Shield, TrendingUp, ClipboardList, ScanSearch,
  ArrowRight, RefreshCw, Activity, AlertCircle, Clock, Table2,
} from 'lucide-react';

// ─── Module card definitions ──────────────────────────────────────────────────
const MODULES = [
  {
    key:         'recruitment',
    label:       'Recruitment',
    description: 'ATS · Job Openings · AI Screening · Candidate Pipeline',
    href:        '/jobs',
    icon:        Briefcase,
    color:       'bg-blue-500',
    bgLight:     'bg-blue-50',
    textLight:   'text-blue-600',
    border:      'border-blue-100',
    available:   true,
  },
  {
    key:         'sales',
    label:       'Sales CRM',
    description: 'Leads · Pipeline · Opportunities · Contacts',
    href:        '/sales',
    icon:        ShoppingCart,
    color:       'bg-emerald-500',
    bgLight:     'bg-emerald-50',
    textLight:   'text-emerald-600',
    border:      'border-emerald-100',
    available:   true,
  },
  {
    key:         'hr',
    label:       'HR Operations',
    description: 'Employees · Leave · Attendance · Performance',
    href:        '/hr',
    icon:        UserCheck,
    color:       'bg-violet-500',
    bgLight:     'bg-violet-50',
    textLight:   'text-violet-600',
    border:      'border-violet-100',
    available:   true,
  },
  {
    key:         'payroll',
    label:       'Payroll',
    description: 'Salary · Payslips · Claims · Bank Transfers',
    href:        '/payroll',
    icon:        DollarSign,
    color:       'bg-amber-500',
    bgLight:     'bg-amber-50',
    textLight:   'text-amber-600',
    border:      'border-amber-100',
    available:   true,
  },
  {
    key:         'visa',
    label:       'Visa & Permits',
    description: 'Employment Pass · Renewals · Work Permits · EP Tracking',
    href:        '/visa',
    icon:        Plane,
    color:       'bg-sky-500',
    bgLight:     'bg-sky-50',
    textLight:   'text-sky-600',
    border:      'border-sky-100',
    available:   true,
  },
  {
    key:         'finance',
    label:       'Finance & Invoices',
    description: 'Invoices · Revenue · Pending Payments',
    href:        '/finance',
    icon:        CreditCard,
    color:       'bg-rose-500',
    bgLight:     'bg-rose-50',
    textLight:   'text-rose-600',
    border:      'border-rose-100',
    available:   true,
  },
  {
    key:         'analytics',
    label:       'Analytics',
    description: 'Cross-module Reports · KPIs · Dashboards',
    href:        '/analytics',
    icon:        BarChart3,
    color:       'bg-indigo-500',
    bgLight:     'bg-indigo-50',
    textLight:   'text-indigo-600',
    border:      'border-indigo-100',
    available:   true,
  },
  {
    key:         'documents',
    label:       'Documents',
    description: 'Contracts · Policies · Signed Documents',
    href:        '/documents',
    icon:        FileText,
    color:       'bg-slate-500',
    bgLight:     'bg-slate-50',
    textLight:   'text-slate-600',
    border:      'border-slate-200',
    available:   true,
  },
  {
    key:         'admin',
    label:       'Admin Control',
    description: 'Users · Permissions · Roles · Audit Logs',
    href:        '/admin',
    icon:        Shield,
    color:       'bg-purple-500',
    bgLight:     'bg-purple-50',
    textLight:   'text-purple-600',
    border:      'border-purple-100',
    adminOnly:   true,
    available:   true,
  },
  {
    key:         'settings',
    label:       'Settings',
    description: 'Integrations · System Config · Preferences',
    href:        '/integrations',
    icon:        Settings,
    color:       'bg-slate-500',
    bgLight:     'bg-slate-50',
    textLight:   'text-slate-600',
    border:      'border-slate-200',
    available:   true,
  },
];

const SUBMISSION_STAGE_LABELS = {
  SUBMITTED_TO_SALES: 'With sales',
  SUBMITTED_TO_CLIENT: 'With client',
  CLIENT_REVIEW: 'Client review',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  JOINED: 'Joined',
  REJECTED: 'Rejected',
};

// ─── KPI row config ───────────────────────────────────────────────────────────
function buildKpiRows(kpis, user) {
  if (!kpis) return [];
  const role = user?.role;
  const isExecutiveQueueUser = isHrmsExecutiveQueueRole(role);
  const canOpenPayrollApprovals = isExecutiveQueueUser || ['FINANCE_HEAD', 'FINANCE'].includes(role);
  const canOpenTeamApprovalQueue = ['RECRUITMENT_MANAGER', 'SALES_MANAGER', 'HR_ADMIN', 'PAYROLL_ADMIN', 'FINANCE_HEAD', 'MANAGEMENT', 'ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'HEAD', 'MD', 'MANAGING_DIRECTOR', 'DEPT_HEAD', 'DEPARTMENT_HEAD', 'COMPANY_HEAD', 'ASSISTANT_MANAGER', 'MANAGER', 'DEPT_MANAGER', 'DEPARTMENT_MANAGER'].includes(role);
  const pendingPayrollCount = kpis?.payroll?.pendingApprovalsForRole ?? kpis?.payroll?.pendingRuns;
  const pendingLeaveCount = kpis?.pendingActions?.leaves ?? kpis?.hr?.leaveRequests;
  const payrollPendingHref = isExecutiveQueueUser ? '/executive/pending-center?tab=payroll' : (canOpenPayrollApprovals ? '/payroll/approvals' : '/payroll/runs');
  const leavePendingHref = isExecutiveQueueUser ? '/executive/pending-center?tab=leaves' : (canOpenTeamApprovalQueue ? '/workspace/approval-queue?tab=leaves' : '/hr/leave');
  const claimPendingHref = isExecutiveQueueUser ? '/executive/pending-center?tab=claims' : '/payroll/claims';
  return [
    {
      section: 'Recruitment',
      color: 'text-blue-600',
      bg:    'bg-blue-50',
      items: [
        { label: 'Open Jobs',          value: kpis.recruitment?.openJobs,         icon: Briefcase,     href: '/jobs' },
        { label: 'Candidates Today',   value: kpis.recruitment?.candidatesToday,  icon: Users,         href: '/candidates' },
        { label: 'Interviews Today',   value: kpis.recruitment?.interviewsScheduled, icon: CalendarCheck, href: '/interviews' },
        { label: 'Offers Pending',     value: kpis.recruitment?.offersPending,    icon: TrendingUp,    href: '/candidates' },
        { label: 'Joined This Month',  value: kpis.recruitment?.hiredThisMonth,   icon: UserCheck,     href: '/candidates' },
      ],
    },
    {
      section: 'HR',
      color: 'text-violet-600',
      bg:    'bg-violet-50',
      items: [
        { label: 'Total Employees',  value: kpis.hr?.totalEmployees,  icon: Users,         href: '/hr/employees' },
        { label: 'New Joiners',      value: kpis.hr?.newJoiners,      icon: UserCheck,     href: '/hr/employees' },
        { label: 'Leave Requests',   value: pendingLeaveCount,        icon: ClipboardList, href: leavePendingHref },
        { label: 'Attendance Today', value: kpis.hr?.attendanceToday, icon: CalendarCheck, href: '/hr/attendance' },
      ],
    },
    {
      section: 'Payroll',
      color: 'text-amber-600',
      bg:    'bg-amber-50',
      items: [
        { label: 'Pending Runs',    value: pendingPayrollCount,           icon: DollarSign, href: payrollPendingHref },
        { label: 'Claims Pending',  value: kpis.payroll?.claimsPending,   icon: FileText,   href: claimPendingHref },
      ],
    },
    {
      section: 'Sales & revenue operations',
      color: 'text-emerald-600',
      bg:    'bg-emerald-50',
      items: [
        { label: 'Interviews today', value: kpis.sales?.interviewsToday, icon: CalendarCheck, href: '/interviews' },
        { label: 'Sales meetings due today', value: kpis.sales?.salesFollowUpsToday, icon: ClipboardList, href: '/followups' },
        { label: 'New client reqs (7d)', value: kpis.sales?.newRequirementsWeek, icon: Briefcase, href: '/sales/requirements' },
        { label: 'Submissions today', value: kpis.sales?.submissionsToday, icon: Users, href: '/sales' },
        { label: 'HIGH / URGENT JDs', value: kpis.sales?.highPriorityOpenJobs, icon: AlertCircle, href: '/sales/requirements' },
        { label: 'Submission targets (≤7d)', value: kpis.sales?.submissionTargetsDue7d, icon: Clock, href: '/sales/requirements' },
        { label: 'Agreements (30d)', value: kpis.sales?.agreementsRenewal30d, icon: FileText, href: '/finance' },
        { label: 'Invoices (overdue / chase)', value: kpis.sales?.invoicesNeedAttention, icon: CreditCard, href: '/finance/invoices' },
        { label: 'Follow-ups (pipeline)', value: kpis.sales?.followUpsDue, icon: ClipboardList, href: '/followups' },
      ],
    },
    {
      section: 'Visa',
      color: 'text-sky-600',
      bg:    'bg-sky-50',
      items: [
        { label: 'Renewals Due',    value: kpis.visa?.renewalsDue,       icon: Plane,      href: '/visa/renewals' },
        { label: 'Expiring Permits',value: kpis.visa?.expiringPermits,   icon: AlertCircle,href: '/visa/renewals' },
        { label: 'New Applications',value: kpis.visa?.newApplications,   icon: FileText,   href: '/visa' },
      ],
    },
    {
      section: 'Finance',
      color: 'text-rose-600',
      bg:    'bg-rose-50',
      items: [
        { label: 'Invoices Pending', value: kpis.finance?.invoicesPending, icon: CreditCard, href: '/finance/invoices' },
        { label: 'Paid This Month',  value: kpis.finance?.paidThisMonth,   icon: TrendingUp, href: '/finance' },
      ],
    },
  ];
}

function KpiChip({ label, value, icon: Icon, href, color, bg }) {
  return (
    <Link href={href} className="group flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-100 rounded-lg hover:border-slate-200 hover:shadow-sm transition-all min-w-0">
      <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon size={13} className={color} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 uppercase tracking-wide truncate leading-tight">{label}</p>
        <p className="text-base font-bold text-slate-800 leading-tight">{value ?? <span className="text-slate-300 text-sm">—</span>}</p>
      </div>
    </Link>
  );
}

function ModuleCard({ mod, isAdmin }) {
  if (mod.adminOnly && !isAdmin) return null;
  const Icon = mod.icon;
  return (
    <Link
      href={mod.href}
      className={`group flex flex-col gap-3 p-4 bg-white rounded-xl border ${mod.border} hover:shadow-md hover:border-transparent transition-all duration-200`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mod.color} shadow-sm`}>
          <Icon size={18} className="text-white" />
        </div>
        <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-800 leading-tight">{mod.label}</h3>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{mod.description}</p>
      </div>
    </Link>
  );
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function HRMSDashboard({ user }) {
  const [kpis, setKpis]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const isAdmin = user?.role === 'ADMIN';

  const fetchKpis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/hrms/kpis');
      setKpis(res.data?.data ?? null);
    } catch (e) {
      setError('Unable to load KPI data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKpis(); }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const kpiRows = buildKpiRows(kpis, user);
  const activities = kpis?.meta?.recentActivities ?? [];
  const isExecutiveQueueUser = isHrmsExecutiveQueueRole(user?.role);
  const canSeeExecutiveMonitoring = isExecutiveQueueUser || ['FINANCE_HEAD', 'FINANCE'].includes(user?.role);

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {greeting()}, {user?.firstName}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Tekgen AI HRMS &mdash; Internal Operations Platform &bull; {new Date().toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={fetchKpis}
          disabled={loading}
          className="btn-ghost text-xs self-start sm:self-auto"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {canSeeExecutiveMonitoring && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Executive monitoring — sales first</h3>
            <span className="text-xs text-slate-400">Live counts · ref: job displayId, client displayId, invoice displayId</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Link href="/interviews" className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-emerald-800 font-bold">Interviews today</p>
              <p className="text-2xl font-bold text-emerald-950">{kpis?.sales?.interviewsToday ?? 0}</p>
            </Link>
            <Link href="/sales/requirements" className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-teal-800 font-bold">New reqs (7d)</p>
              <p className="text-2xl font-bold text-teal-950">{kpis?.sales?.newRequirementsWeek ?? 0}</p>
            </Link>
            <Link href="/sales" className="rounded-lg border border-lime-100 bg-lime-50/90 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-lime-900 font-bold">Submissions today</p>
              <p className="text-2xl font-bold text-lime-950">{kpis?.sales?.submissionsToday ?? 0}</p>
            </Link>
            <Link href="/sales/requirements" className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-amber-800 font-bold">HIGH / URGENT JDs</p>
              <p className="text-2xl font-bold text-amber-950">{kpis?.sales?.highPriorityOpenJobs ?? 0}</p>
            </Link>
            <Link href="/executive/pending-center" className="rounded-lg border border-violet-100 bg-violet-50 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-violet-800 font-bold">MD / L2 queue</p>
              <p className="text-2xl font-bold text-violet-950">{(kpis?.pendingActions?.leaves || 0) + (kpis?.pendingActions?.claims || 0)}</p>
              <p className="text-[9px] text-violet-600 mt-0.5">Leaves + claims at Director level</p>
            </Link>
            <Link href="/finance/invoices" className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-rose-800 font-bold">Invoice / cash alerts</p>
              <p className="text-2xl font-bold text-rose-950">{kpis?.sales?.invoicesNeedAttention ?? kpis?.finance?.invoicesPending ?? 0}</p>
            </Link>
          </div>
          <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/90 p-3 text-xs text-slate-600 space-y-1.5">
            <p className="font-semibold text-slate-800">Approval &amp; ownership mapping (reference)</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li><strong>HR / payroll:</strong> Level 1 — manager or department head in the leave/claim chain; Level 2 — Managing Director / Admin in Executive Pending or approval queue.</li>
              <li><strong>Sales ↔ recruitment:</strong> Clients carry <code className="text-[11px] bg-white px-1 rounded border">ownerId</code> (sales). Jobs carry <code className="text-[11px] bg-white px-1 rounded border">clientId</code>, <code className="text-[11px] bg-white px-1 rounded border">displayId</code>, <code className="text-[11px] bg-white px-1 rounded border">priority</code>, <code className="text-[11px] bg-white px-1 rounded border">targetSubmissionDate</code>, <code className="text-[11px] bg-white px-1 rounded border">assignedRecruiters</code> — recruitment manager allocates delivery.</li>
              <li><strong>Finance:</strong> Agreements and invoices link to the same <code className="text-[11px] bg-white px-1 rounded border">clientId</code>; overdue amounts surface above and under Finance.</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── KPI Summary Strips ── */}
      <div className="space-y-3">
        {kpiRows.map(row => (
          <div key={row.section}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${row.color}`}>{row.section}</span>
              <div className="flex-1 border-t border-slate-100" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {row.items.map(item => (
                <KpiChip key={item.label} {...item} color={row.color} bg={row.bg} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Module Cards + Activity Feed ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">

        {/* Module cards grid */}
        <div className="xl:col-span-2">
          {(() => {
            const rd = kpis?.recruitmentDelivery;
            const hp = rd?.highPriorityJobs || [];
            const missing = rd?.jobsMissingMandatoryDates || [];
            const pipe = rd?.submissionPipelineByStage || {};
            const pipeEntries = Object.entries(pipe).filter(([, n]) => n > 0);
            if (!rd || (hp.length === 0 && missing.length === 0 && pipeEntries.length === 0)) return null;
            return (
              <div className="mb-5 rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-amber-950 flex items-center gap-1.5">
                    <AlertCircle size={16} className="text-amber-600" />
                    Recruitment delivery / client pipeline
                  </h3>
                  <span className="text-[10px] uppercase tracking-wide text-amber-800/80 bg-white/80 px-2 py-0.5 rounded border border-amber-100">
                    scope: {rd.roleScope || '—'}
                  </span>
                </div>
                <p className="text-xs text-amber-900/80 mb-3">
                  Recruitment flags HIGH JDs and date gaps; submission stages flow{' '}
                  <strong>recruiter → sales → client</strong> and roll up for department managers and MD on this hub.
                </p>
                {hp.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-amber-900 mb-1">HIGH priority open JDs</p>
                    <ul className="space-y-1">
                      {hp.slice(0, 6).map((j) => (
                        <li key={j.id}>
                          <Link
                            href={`/jobs/view/${j.id}`}
                            className="text-xs text-amber-950 hover:underline font-medium"
                          >
                            {j.displayId || j.id.slice(0, 8)} · {j.title}
                            {j.client?.clientName ? ` · ${j.client.clientName}` : ''}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {missing.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-red-900 mb-1">Missing JD received or target date</p>
                    <ul className="space-y-1">
                      {missing.slice(0, 5).map((j) => (
                        <li key={j.id}>
                          <Link href={`/jobs/edit/${j.id}`} className="text-xs text-red-800 hover:underline">
                            {j.displayId || j.id.slice(0, 8)} · {j.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {pipeEntries.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {pipeEntries.map(([stage, n]) => (
                      <span
                        key={stage}
                        className="text-[11px] font-medium bg-white border border-amber-100 rounded-full px-2.5 py-1 text-amber-950"
                      >
                        {SUBMISSION_STAGE_LABELS[stage] || stage}: {n}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {((kpis?.recruitment?.bulkImportBatches) || []).length > 0 && (
            <div className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
              <h3 className="text-sm font-semibold text-indigo-950 mb-2 flex items-center gap-1.5">
                <Table2 size={16} className="text-indigo-600" />
                Client hiring-request batches (bulk Excel)
              </h3>
              <p className="text-xs text-indigo-900/80 mb-3">
                Each upload shares one batch ID. Recruitment Manager and MD can open the full job list and see client{' '}
                <strong>JR No</strong> + <strong>Hiring Request ID</strong> on every JD card (separate from Tekgen{' '}
                <span className="font-mono">displayId</span>).
              </p>
              <ul className="space-y-2">
                {kpis.recruitment.bulkImportBatches.map((b) => (
                  <li key={b.bulkImportBatchId} className="text-xs">
                    <Link
                      href={`/jobs?batch=${encodeURIComponent(b.bulkImportBatchId)}`}
                      className="font-medium text-indigo-900 hover:underline"
                    >
                      {b.bulkImportLabel || b.bulkImportBatchId.slice(0, 20) + '…'}
                    </Link>
                    <span className="text-slate-600">
                      {' '}
                      · {b.jobCount} jobs
                      {b.client?.clientName ? ` · ${b.client.clientName}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="/jobs/bulk-import"
                className="text-[11px] font-semibold text-indigo-700 mt-3 inline-block hover:underline"
              >
                Run new bulk import →
              </Link>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Platform Modules</h3>
            <span className="text-xs text-slate-400">Click any module to open</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {MODULES.map(mod => (
              <ModuleCard key={mod.key} mod={mod} isAdmin={isAdmin} />
            ))}
          </div>
        </div>

        {/* Activity feed + pending actions */}
        <div className="space-y-4">

          {/* Pending actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Activity size={14} className="text-brand-500" />
                Pending Actions
              </h3>
            </div>
            <div className="space-y-2">
              {kpis?.recruitment?.offersPending > 0 && (
                <Link href="/candidates" className="flex items-center justify-between px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg hover:bg-amber-100 transition-colors group">
                  <span className="text-xs text-amber-700 font-medium">Offers awaiting response</span>
                  <span className="text-xs font-bold text-amber-600 bg-white px-1.5 py-0.5 rounded border border-amber-100">{kpis.recruitment.offersPending}</span>
                </Link>
              )}
              {kpis?.sales?.followUpsDue > 0 && (
                <Link href="/followups" className="flex items-center justify-between px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors">
                  <span className="text-xs text-blue-700 font-medium">Follow-ups due</span>
                  <span className="text-xs font-bold text-blue-600 bg-white px-1.5 py-0.5 rounded border border-blue-100">{kpis.sales.followUpsDue}</span>
                </Link>
              )}
              {kpis?.visa?.renewalsDue > 0 && (
                <Link href="/visa/renewals" className="flex items-center justify-between px-3 py-2 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors">
                  <span className="text-xs text-red-700 font-medium">Visa renewals due</span>
                  <span className="text-xs font-bold text-red-600 bg-white px-1.5 py-0.5 rounded border border-red-100">{kpis.visa.renewalsDue}</span>
                </Link>
              )}
              {kpis?.visa?.newApplications > 0 && (
                <Link href="/visa/cases" className="flex items-center justify-between px-3 py-2 bg-sky-50 border border-sky-100 rounded-lg hover:bg-sky-100 transition-colors">
                  <span className="text-xs text-sky-700 font-medium">Visa cases pending review</span>
                  <span className="text-xs font-bold text-sky-600 bg-white px-1.5 py-0.5 rounded border border-sky-100">{kpis.visa.newApplications}</span>
                </Link>
              )}
              {kpis?.finance?.invoicesPending > 0 && (
                <Link href="/finance/invoices" className="flex items-center justify-between px-3 py-2 bg-rose-50 border border-rose-100 rounded-lg hover:bg-rose-100 transition-colors">
                  <span className="text-xs text-rose-700 font-medium">Finance invoices pending review</span>
                  <span className="text-xs font-bold text-rose-600 bg-white px-1.5 py-0.5 rounded border border-rose-100">{kpis.finance.invoicesPending}</span>
                </Link>
              )}
              {kpis?.pendingActions?.leaves > 0 && (
                <Link href={isExecutiveQueueUser ? '/executive/pending-center?tab=leaves' : '/workspace/approval-queue?tab=leaves'} className="flex items-center justify-between px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors">
                  <span className="text-xs text-blue-700 font-medium">Leave approvals pending</span>
                  <span className="text-xs font-bold text-blue-600 bg-white px-1.5 py-0.5 rounded border border-blue-100">{kpis.pendingActions.leaves}</span>
                </Link>
              )}
              {kpis?.pendingActions?.claims > 0 && (
                <Link href={isExecutiveQueueUser ? '/executive/pending-center?tab=claims' : '/workspace/approval-queue?tab=claims'} className="flex items-center justify-between px-3 py-2 bg-purple-50 border border-purple-100 rounded-lg hover:bg-purple-100 transition-colors">
                  <span className="text-xs text-purple-700 font-medium">Claim approvals pending</span>
                  <span className="text-xs font-bold text-purple-600 bg-white px-1.5 py-0.5 rounded border border-purple-100">{kpis.pendingActions.claims}</span>
                </Link>
              )}
              {(kpis?.pendingActions?.payrollApprovals ?? kpis?.payroll?.pendingRuns) > 0 && (
                <Link href={isExecutiveQueueUser ? '/executive/pending-center?tab=payroll' : '/payroll/runs'} className="flex items-center justify-between px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg hover:bg-amber-100 transition-colors">
                  <span className="text-xs text-amber-700 font-medium">Payroll approvals pending</span>
                  <span className="text-xs font-bold text-amber-600 bg-white px-1.5 py-0.5 rounded border border-amber-100">{kpis?.pendingActions?.payrollApprovals ?? kpis?.payroll?.pendingRuns}</span>
                </Link>
              )}
              {(kpis?.recruitmentDelivery?.highPriorityJobs || []).length > 0 && (
                <Link href="/jobs" className="flex items-center justify-between px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg hover:bg-amber-100 transition-colors">
                  <span className="text-xs text-amber-800 font-medium">HIGH / URGENT JDs (your scope)</span>
                  <span className="text-xs font-bold text-amber-700 bg-white px-1.5 py-0.5 rounded border border-amber-100">
                    {kpis.recruitmentDelivery.highPriorityJobs.length}
                  </span>
                </Link>
              )}
              {(kpis?.recruitmentDelivery?.jobsMissingMandatoryDates || []).length > 0 && (
                <Link href="/jobs" className="flex items-center justify-between px-3 py-2 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors">
                  <span className="text-xs text-red-800 font-medium">JDs missing received or target date</span>
                  <span className="text-xs font-bold text-red-700 bg-white px-1.5 py-0.5 rounded border border-red-100">
                    {kpis.recruitmentDelivery.jobsMissingMandatoryDates.length}
                  </span>
                </Link>
              )}
              {(kpis?.sales?.alerts || []).map((a) => (
                <Link
                  key={a.code}
                  href={a.href || '/sales'}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${
                    a.level === 'critical'
                      ? 'bg-red-50 border-red-100 hover:bg-red-100'
                      : 'bg-amber-50 border-amber-100 hover:bg-amber-100'
                  }`}
                >
                  <span className={`text-xs font-medium ${a.level === 'critical' ? 'text-red-800' : 'text-amber-900'}`}>
                    {a.message}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">{a.code}</span>
                </Link>
              ))}
              {(!kpis || (
                !kpis.recruitment?.offersPending &&
                !kpis.sales?.followUpsDue &&
                !((kpis?.sales?.alerts || []).length > 0) &&
                !((kpis?.recruitmentDelivery?.highPriorityJobs || []).length > 0) &&
                !((kpis?.recruitmentDelivery?.jobsMissingMandatoryDates || []).length > 0) &&
                !kpis.visa?.renewalsDue &&
                !kpis.visa?.newApplications &&
                !kpis.finance?.invoicesPending &&
                !(kpis?.pendingActions?.leaves > 0) &&
                !(kpis?.pendingActions?.claims > 0) &&
                !((kpis?.pendingActions?.payrollApprovals ?? kpis?.payroll?.pendingRuns) > 0)
              )) && (
                <p className="text-xs text-slate-400 text-center py-3">No pending actions</p>
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Activity size={14} className="text-brand-500" />
                Recent Activity
              </h3>
              <Link href="/analytics" className="text-xs text-brand-500 hover:text-brand-600">View all</Link>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
            ) : activities.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No recent activity</p>
            ) : (
              <div className="space-y-1">
                {activities.slice(0, 8).map(act => (
                  <div key={act.id} className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-600 leading-snug truncate">
                        <span className="font-medium text-slate-800">{act.user?.firstName}</span>
                        {' '}{(act.action || '').toLowerCase().replace(/_/g, ' ')}
                        {' '}<span className="text-slate-400">{act.entityType?.toLowerCase()}</span>
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(act.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick stats summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold mb-3 text-slate-800">Executive Analytics Snapshot</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-2.5">
                <p className="text-blue-700 text-[10px] uppercase tracking-wide">Recruitment</p>
                <p className="text-xl font-bold text-blue-900">{kpis?.recruitment?.totalCandidates ?? '—'}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2.5">
                <p className="text-emerald-700 text-[10px] uppercase tracking-wide">Sales Follow-ups</p>
                <p className="text-xl font-bold text-emerald-900">{kpis?.sales?.followUpsDue ?? 0}</p>
              </div>
              <div className="rounded-lg bg-violet-50 border border-violet-100 p-2.5">
                <p className="text-violet-700 text-[10px] uppercase tracking-wide">HR Leaves Pending</p>
                <p className="text-xl font-bold text-violet-900">{kpis?.pendingActions?.leaves ?? 0}</p>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-2.5">
                <p className="text-amber-700 text-[10px] uppercase tracking-wide">Payroll Pending</p>
                <p className="text-xl font-bold text-amber-900">{kpis?.pendingActions?.payrollApprovals ?? 0}</p>
              </div>
            </div>
            <Link href="/analytics" className="mt-3 flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 transition-colors">
              <ScanSearch size={12} /> View cross-department analytics
              <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
