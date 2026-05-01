'use client';

import DashboardLayout from '../components/layout/DashboardLayout';
import Link from 'next/link';
import { CreditCard, FileText, TrendingUp, DollarSign, PlusCircle, ArrowRight } from 'lucide-react';

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
  return (
    <DashboardLayout title="Finance & Invoices">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Finance & Invoices</h2>
            <p className="text-sm text-slate-500 mt-0.5">Invoice management · Revenue tracking · Payments</p>
          </div>
          <button className="btn-primary text-sm self-start" disabled>
            <PlusCircle size={14} /> New Invoice
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Invoices Pending', value: '—', sub: 'Awaiting payment' },
            { label: 'Paid This Month',  value: '—', sub: 'Collected'        },
            { label: 'Overdue',          value: '—', sub: 'Action needed'    },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-400">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FINANCE_SECTIONS.map(s => <SectionCard key={s.title} {...s} />)}
        </div>
      </div>
    </DashboardLayout>
  );
}
