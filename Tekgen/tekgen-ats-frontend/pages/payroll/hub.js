'use client';

import DashboardLayout from '../../components/layout/DashboardLayout';
import Link from 'next/link';
import {
  DollarSign, CreditCard, FileText, Users, Calendar,
  PlusCircle, ArrowRight, BarChart3, Download,
} from 'lucide-react';

const PAYROLL_MONTHLY_CYCLE = '25th current month to 24th next month';

const PAYROLL_SECTIONS = [
  {
    title: 'Monthly Payroll',
    description: 'Run monthly payroll, review salary breakdown, approve and process.',
    icon: DollarSign,
    color: 'bg-amber-500',
    href: '/payroll/runs',
    badge: 'Active',
  },
  {
    title: 'Salary Structure',
    description: 'Define salary components: basic, allowances, deductions per role.',
    icon: BarChart3,
    color: 'bg-blue-500',
    href: '/payroll/structure',
    badge: 'Coming',
  },
  {
    title: 'Payslips',
    description: 'Generate and download payslips for each employee each month.',
    icon: FileText,
    color: 'bg-emerald-500',
    href: '/payroll/payslips',
    badge: 'Coming',
  },
  {
    title: 'Claims & Reimbursements',
    description: 'Employee expense claims, medical, transport and other allowances.',
    icon: CreditCard,
    color: 'bg-violet-500',
    href: '/payroll/claims',
    badge: 'Active',
  },
  {
    title: 'Tax & Statutory',
    description: 'PCB deductions, EPF, SOCSO, EIS calculations per Malaysian law.',
    icon: Calendar,
    color: 'bg-rose-500',
    href: '/payroll/tax',
    badge: 'Coming',
  },
  {
    title: 'Bank Transfer Report',
    description: 'Generate bank files for salary disbursement (Maybank, CIMB, etc.).',
    icon: Download,
    color: 'bg-sky-500',
    href: '/payroll/bank',
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

export default function PayrollHubPage() {
  const approvalSteps = [
    { step: '1', owner: 'Department Head', note: 'First approval for leave, attendance, claims, onboarding, rejection and other department actions.' },
    { step: '2', owner: 'MD / Director / Head', note: 'Second and final approval before payroll publishing or final business action.' },
  ];

  const statutorySchedule = [
    { item: 'EPF / SOCSO / EIS / PCB', frequency: 'Monthly', due: 'Calculated every payroll run period' },
    { item: 'EA Form / annual tax summary', frequency: 'Yearly', due: 'Generated at year-end for employees and compliance filing' },
  ];

  return (
    <DashboardLayout title="Payroll">
      <div className="max-w-7xl mx-auto space-y-5">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Payroll</h2>
            <p className="text-sm text-slate-500 mt-0.5">Salary processing · Claims · Statutory · Bank transfers</p>
          </div>
          <button className="btn-primary text-sm self-start" disabled>
            <PlusCircle size={14} /> Run Payroll
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Payroll Cycle', value: '25 → 24', sub: PAYROLL_MONTHLY_CYCLE, bg: 'bg-amber-50', text: 'text-amber-600' },
            { label: 'Approval Flow', value: '2 Levels', sub: 'Dept Head → MD/Director', bg: 'bg-violet-50', text: 'text-violet-600' },
            { label: 'Run Status', value: 'Draft', sub: 'Current active payroll run', bg: 'bg-emerald-50', text: 'text-emerald-600' },
          ].map(s => (
            <div key={s.label} className="stat-card flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                <p className="text-xs text-slate-400">{s.sub}</p>
              </div>
              <div className={`text-xs px-2 py-1 rounded-lg font-medium ${s.bg} ${s.text}`}>Pending</div>
            </div>
          ))}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Payroll Modules</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PAYROLL_SECTIONS.map(s => <SectionCard key={s.title} {...s} />)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-slate-800">Approval hierarchy (all departments)</h4>
          <p className="text-xs text-slate-500 mt-1">Default rule: every critical action follows two-level approval.</p>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {approvalSteps.map((item) => (
              <div key={item.step} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-700">Step {item.step}: {item.owner}</p>
                <p className="text-xs text-slate-500 mt-1">{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-slate-800">Malaysia statutory timeline</h4>
          <p className="text-xs text-slate-500 mt-1">Payroll run period uses {PAYROLL_MONTHLY_CYCLE} for monthly processing.</p>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {statutorySchedule.map((item) => (
              <div key={item.item} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-700">{item.item}</p>
                <p className="text-xs text-slate-500 mt-1">{item.frequency} · {item.due}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <DollarSign size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-amber-800">Payroll module — Malaysia configuration</h4>
            <p className="text-xs text-amber-600 mt-0.5">Salary structure, PCB, EPF, SOCSO, and EIS are processed monthly within the payroll cycle. Annual tax documents are generated separately at year-end.</p>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
