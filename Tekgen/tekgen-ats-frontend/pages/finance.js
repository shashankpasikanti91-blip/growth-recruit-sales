'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Link from 'next/link';
import apiClient from '../lib/api';
import { FileText, TrendingUp, DollarSign, PlusCircle, ArrowRight } from 'lucide-react';

function formatMYR(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 }).format(Number(n));
}

const FINANCE_SECTIONS = [
  {
    title: 'Invoices',
    description: 'Create, track and manage client invoices. Pending and paid status.',
    icon: FileText,
    color: 'bg-rose-500',
    href: '/finance/invoices',
    badge: 'Active',
  },
  {
    title: 'Revenue Overview',
    description: 'Monthly and quarterly revenue summary with collection status.',
    icon: TrendingUp,
    color: 'bg-emerald-500',
    href: '/finance/revenue',
    badge: 'Coming',
  },
  {
    title: 'Payments Received',
    description: 'Track inbound payments, reconciliation and bank entries.',
    icon: DollarSign,
    color: 'bg-blue-500',
    href: '/finance/payments',
    badge: 'Coming',
  },
];

function SectionCard({ title, description, icon: Icon, color, href, badge }) {
  const isComingSoon = badge === 'Coming';
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3 ${isComingSoon ? 'opacity-70' : 'hover:shadow-md hover:border-slate-300 transition-all'}`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isComingSoon ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>
          {badge}
        </span>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</p>
      </div>
      {!isComingSoon
        ? <Link href={href} className="mt-auto flex items-center gap-1.5 text-xs text-brand-500 font-medium hover:text-brand-600">Open <ArrowRight size={12} /></Link>
        : <span className="mt-auto text-xs text-slate-400">Module in development</span>
      }
    </div>
  );
}

export default function FinancePage() {
  const [kpis, setKpis] = useState(null);
  const [loadError, setLoadError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoadError('');
    try {
      const res = await apiClient.get('/api/finance/dashboard');
      const d = res.data?.data;
      if (d?.kpis) setKpis(d.kpis);
    } catch (e) {
      setLoadError(e.response?.data?.message || e.message || 'Could not load finance KPIs');
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const stats = kpis
    ? [
        { label: 'Outstanding', value: formatMYR(kpis.pendingAmount), sub: 'Balance due (open)' },
        { label: 'Collected (paid inv.)', value: formatMYR(kpis.totalRevenue), sub: 'Sum of paid invoices' },
        { label: 'Overdue (count)', value: String(kpis.overdueInvoices ?? '—'), sub: 'Past due, unpaid' },
      ]
    : [
        { label: 'Outstanding', value: '—', sub: 'Balance due' },
        { label: 'Collected', value: '—', sub: 'Paid invoices' },
        { label: 'Overdue', value: '—', sub: 'Action needed' },
      ];

  return (
    <DashboardLayout title="Finance & Invoices">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Finance & Invoices</h2>
            <p className="text-sm text-slate-500 mt-0.5">Invoice management · Revenue tracking · Payments</p>
          </div>
          <Link href="/finance/invoices" className="btn-primary text-sm self-start inline-flex items-center gap-1.5">
            <PlusCircle size={14} /> New invoice
          </Link>
        </div>

        {loadError && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{loadError}</p>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-400">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FINANCE_SECTIONS.map((s) => <SectionCard key={s.title} {...s} />)}
        </div>
      </div>
    </DashboardLayout>
  );
}
