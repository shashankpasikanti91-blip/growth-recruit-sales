'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Link from 'next/link';
import apiClient from '../lib/api';
import {
  Plane, Users, Bell, FileText, Shield, Calendar,
  PlusCircle, ArrowRight, AlertTriangle, CheckCircle2, Clock3, XCircle, CheckCircle,
} from 'lucide-react';

const PASS_TYPES = [
  { label: 'Employment Pass',       short: 'EP',   color: 'bg-blue-100 text-blue-700',     border: 'border-blue-200'   },
  { label: 'Professional Visit Pass', short: 'PVP', color: 'bg-violet-100 text-violet-700', border: 'border-violet-200' },
  { label: 'Dependant Pass',        short: 'DP',   color: 'bg-sky-100 text-sky-700',       border: 'border-sky-200'    },
  { label: 'Long Term Visit Pass',  short: 'LTVP', color: 'bg-indigo-100 text-indigo-700', border: 'border-indigo-200' },
  { label: 'Malaysian Citizen',     short: 'MC',   color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' },
];

const VISA_MODULES = [
  {
    title: 'Visa cases',
    description: 'TKG-VISA case master, permits, and worker categories.',
    icon: FileText,
    color: 'bg-violet-500',
    href: '/visa/cases',
    badge: 'Active',
  },
  {
    title: 'New case',
    description: 'Link an employee or candidate to a new permit / renewal file.',
    icon: PlusCircle,
    color: 'bg-emerald-500',
    href: '/visa/cases/new',
    badge: 'Active',
  },
  {
    title: 'Employee Passes',
    description: 'HR employee master — pass and expiry (legacy list).',
    icon: Users,
    color: 'bg-sky-500',
    href: '/visa/employees',
    badge: 'Active',
  },
  {
    title: 'Renewals Due',
    description: 'Cases and employee renewals by expiry.',
    icon: Bell,
    color: 'bg-amber-500',
    href: '/visa/renewals',
    badge: 'Active',
  },
  {
    title: 'Compliance rules',
    description: 'Configurable rules by country and worker category.',
    icon: Shield,
    color: 'bg-blue-500',
    href: '/visa/compliance',
    badge: 'Active',
  },
  {
    title: 'Reminder schedule',
    description: 'Permit expiry alerts are generated at 90 / 60 / 30 days per case.',
    icon: Calendar,
    color: 'bg-rose-500',
    href: '/visa/cases',
    badge: 'Auto',
  },
];

function SectionCard({ title, description, icon: Icon, color, href, badge }) {
  const isAuto = badge === 'Auto';
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3 ${isAuto ? 'opacity-90' : 'hover:shadow-md hover:border-slate-300 transition-all'}`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isAuto ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>
          {badge}
        </span>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</p>
      </div>
      <Link href={href} className="mt-auto flex items-center gap-1.5 text-xs text-brand-500 font-medium hover:text-brand-600">
        Open <ArrowRight size={12} />
      </Link>
    </div>
  );
}

export default function VisaPage() {
  const [kpis, setKpis] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/api/visa/dashboard');
        setKpis(res.data?.data || null);
      } catch (e) {
        setErr(e.response?.data?.message || e.message || '');
      }
    })();
  }, []);

  const exp = kpis?.expiringPermits || {};
  const stats = kpis
    ? [
        { label: 'Renewals due (month)', value: String(kpis.renewalsThisMonth ?? 0), icon: Bell, sub: 'Renewal window', bg: 'bg-amber-50', text: 'text-amber-600' },
        { label: 'Expiring ≤30d', value: String(exp.d30 ?? 0), icon: AlertTriangle, sub: 'Early alerts', bg: 'bg-red-50', text: 'text-red-600' },
        { label: 'Expiring ≤7d', value: String(exp.d7 ?? 0), icon: AlertTriangle, sub: 'Warning alerts', bg: 'bg-rose-50', text: 'text-rose-600' },
        { label: 'Expiring ≤2d', value: String(exp.d2 ?? 0), icon: AlertTriangle, sub: 'Critical alerts', bg: 'bg-red-100', text: 'text-red-700' },
        { label: 'Applications in progress', value: String(kpis.newApplicationsInProgress ?? 0), icon: Clock3, sub: 'Open pipeline', bg: 'bg-blue-50', text: 'text-blue-600' },
        { label: 'Docs pending verify', value: String(kpis.missingDocumentsPendingVerification ?? 0), icon: CheckCircle2, sub: 'Uploads', bg: 'bg-emerald-50', text: 'text-emerald-600' },
      ]
    : [
        { label: 'Renewals due (month)', value: '—', icon: Bell, sub: '—', bg: 'bg-amber-50', text: 'text-amber-600' },
        { label: 'Expiring ≤30d', value: '—', icon: AlertTriangle, sub: '—', bg: 'bg-red-50', text: 'text-red-600' },
        { label: 'Expiring ≤7d', value: '—', icon: AlertTriangle, sub: '—', bg: 'bg-rose-50', text: 'text-rose-600' },
        { label: 'Expiring ≤2d', value: '—', icon: AlertTriangle, sub: '—', bg: 'bg-red-100', text: 'text-red-700' },
        { label: 'Applications', value: '—', icon: Clock3, sub: '—', bg: 'bg-blue-50', text: 'text-blue-600' },
        { label: 'Docs pending', value: '—', icon: CheckCircle2, sub: '—', bg: 'bg-emerald-50', text: 'text-emerald-600' },
      ];

  const statusBoard = [
    {
      label: 'Pending',
      value: kpis?.statusBreakdown?.pending ?? 0,
      icon: Clock3,
      chip: 'bg-amber-100 text-amber-700',
      ring: 'from-amber-500 to-orange-500',
    },
    {
      label: 'High priority',
      value: kpis?.highPriorityCases?.length ?? 0,
      icon: AlertTriangle,
      chip: 'bg-rose-100 text-rose-700',
      ring: 'from-rose-500 to-red-500',
    },
    {
      label: 'Approved',
      value: kpis?.statusBreakdown?.approved ?? 0,
      icon: CheckCircle,
      chip: 'bg-emerald-100 text-emerald-700',
      ring: 'from-emerald-500 to-teal-500',
    },
    {
      label: 'Rejected',
      value: kpis?.statusBreakdown?.rejected ?? 0,
      icon: XCircle,
      chip: 'bg-slate-200 text-slate-700',
      ring: 'from-slate-500 to-slate-700',
    },
  ];

  const fmt = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  return (
    <DashboardLayout title="HR Ops › Visa & Permits">
      <div className="max-w-7xl mx-auto space-y-5">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">HR Ops Visa & Permits Desk</h2>
            <p className="text-sm text-slate-500 mt-0.5">Power-BI style board: case health, priority queue, permits, compliance, and document control</p>
          </div>
          <Link href="/visa/cases/new" className="btn-primary text-sm self-start inline-flex items-center gap-1">
            <PlusCircle size={14} /> New visa case
          </Link>
        </div>

        {err && (
          <div className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            {err} (Ensure you are logged in as Admin, Visa Admin, or HR Ops.)
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="stat-card flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                  <Icon size={16} className={s.text} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">{s.label}</p>
                  <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                  <p className="text-xs text-slate-400">{s.sub}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Status board</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {statusBoard.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="rounded-xl border border-slate-100 p-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${s.chip}`}>{s.label}</span>
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${s.ring} flex items-center justify-center`}>
                          <Icon size={13} className="text-white" />
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-slate-800 mt-2">{s.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {kpis?.casesByWorkerCategory?.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">Cases by worker category</h3>
                <div className="flex flex-wrap gap-2">
                  {kpis.casesByWorkerCategory.map((row) => (
                    <span key={row.category} className="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-700">
                      {row.category}: <strong>{row.count}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800">High-priority applications</h3>
            <p className="text-xs text-slate-500 mt-1 mb-3">Right-now list for HR Ops action (expiry pressure, rejected, or renewal risk)</p>
            {kpis?.highPriorityCases?.length ? (
              <ul className="space-y-2">
                {kpis.highPriorityCases.map((c) => (
                  <li key={c.id} className="border border-slate-100 rounded-lg p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-mono text-brand-600">{c.displayId}</p>
                        <p className="text-sm font-semibold text-slate-800">{c.workerName}</p>
                        <p className="text-[11px] text-slate-500">{c.permitType} · {c.permitStatus}</p>
                        <p className="text-[11px] text-slate-500">Expiry: {fmt(c.expiryDate)}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold">
                        P{c.priorityScore}
                      </span>
                    </div>
                    <Link href={`/visa/cases/${c.id}`} className="text-[11px] text-brand-600 font-medium mt-2 inline-flex">
                      Open case
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">No high-priority cases right now.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Pass types tracked (Malaysia)</h3>
          <div className="flex flex-wrap gap-2">
            {PASS_TYPES.map((pt) => (
              <div key={pt.short} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${pt.border} ${pt.color}`}>
                <span className="text-xs font-bold">{pt.short}</span>
                <span className="text-xs">— {pt.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Visa desk modules</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {VISA_MODULES.map((m) => <SectionCard key={m.title} {...m} />)}
          </div>
        </div>

        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex items-start gap-3">
          <Plane size={18} className="text-sky-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-sky-800">Malaysia visa desk</h4>
            <p className="text-xs text-sky-700 mt-0.5">
              Sensitive data: access is limited to Visa Admin, HR Admin, and Managing Director. Dependent passes and documents are stored per TKG-VISA case.
            </p>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
