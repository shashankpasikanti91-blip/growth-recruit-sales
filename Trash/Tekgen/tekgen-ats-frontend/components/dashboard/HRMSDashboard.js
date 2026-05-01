'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '../../lib/api';
import {
  Briefcase, Users, CalendarCheck, DollarSign, Plane,
  ShoppingCart, UserCheck, CreditCard, BarChart3, FileText,
  Settings, Shield, TrendingUp, ClipboardList, ScanSearch,
  ArrowRight, RefreshCw, Activity, AlertCircle,
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

// ─── KPI row config ───────────────────────────────────────────────────────────
function buildKpiRows(kpis) {
  if (!kpis) return [];
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
        { label: 'Leave Requests',   value: kpis.hr?.leaveRequests,   icon: ClipboardList, href: '/hr/leave' },
        { label: 'Attendance Today', value: kpis.hr?.attendanceToday, icon: CalendarCheck, href: '/hr/attendance' },
      ],
    },
    {
      section: 'Payroll',
      color: 'text-amber-600',
      bg:    'bg-amber-50',
      items: [
        { label: 'Pending Runs',    value: kpis.payroll?.pendingRuns,     icon: DollarSign, href: '/payroll/runs' },
        { label: 'Claims Pending',  value: kpis.payroll?.claimsPending,   icon: FileText,   href: '/payroll/claims' },
      ],
    },
    {
      section: 'Sales',
      color: 'text-emerald-600',
      bg:    'bg-emerald-50',
      items: [
        { label: 'Open Leads',       value: kpis.sales?.leadsOpen,        icon: ShoppingCart, href: '/sales/leads' },
        { label: 'Follow-ups Due',   value: kpis.sales?.followUpsDue,     icon: ClipboardList,href: '/followups' },
        { label: 'Opportunities Won',value: kpis.sales?.opportunitiesWon, icon: TrendingUp,   href: '/sales/pipeline' },
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

  const kpiRows = buildKpiRows(kpis);
  const activities = kpis?.meta?.recentActivities ?? [];

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
              {(!kpis || (
                !kpis.recruitment?.offersPending &&
                !kpis.sales?.followUpsDue &&
                !kpis.visa?.renewalsDue
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
          <div className="bg-gradient-to-br from-brand-500 to-blue-600 rounded-xl p-4 text-white">
            <h3 className="text-sm font-semibold mb-3">Recruitment Summary</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/10 rounded-lg p-2.5">
                <p className="text-white/70 text-[10px] uppercase tracking-wide">Total Candidates</p>
                <p className="text-2xl font-bold">{kpis?.recruitment?.totalCandidates ?? '—'}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-2.5">
                <p className="text-white/70 text-[10px] uppercase tracking-wide">Total Jobs</p>
                <p className="text-2xl font-bold">{kpis?.recruitment?.totalJobs ?? '—'}</p>
              </div>
            </div>
            <Link href="/analytics" className="mt-3 flex items-center gap-1.5 text-xs text-white/80 hover:text-white transition-colors">
              <ScanSearch size={12} /> View full analytics report
              <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
