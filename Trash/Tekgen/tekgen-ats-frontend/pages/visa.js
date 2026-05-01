'use client';

import { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Link from 'next/link';
import {
  Plane, Users, Bell, FileText, Shield, Calendar,
  PlusCircle, ArrowRight, AlertTriangle, CheckCircle2,
  Clock, AlertCircle,
} from 'lucide-react';

const PASS_TYPES = [
  { label: 'Employment Pass',       short: 'EP',   color: 'bg-blue-100 text-blue-700',     border: 'border-blue-200'   },
  { label: 'Professional Visit Pass', short: 'PVP', color: 'bg-violet-100 text-violet-700', border: 'border-violet-200' },
  { label: 'Dependant Pass',        short: 'DP',   color: 'bg-sky-100 text-sky-700',       border: 'border-sky-200'    },
  { label: 'Long Term Visit Pass',  short: 'LTVP', color: 'bg-indigo-100 text-indigo-700', border: 'border-indigo-200' },
  { label: 'Malaysian Citizen',     short: 'MC',   color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' },
];

const STATUS_CONFIG = {
  VALID:    { label: 'Valid',    icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  EXPIRING: { label: 'Expiring', icon: Clock,        color: 'text-amber-600 bg-amber-50 border-amber-200'      },
  EXPIRED:  { label: 'Expired',  icon: AlertCircle,  color: 'text-red-600 bg-red-50 border-red-200'            },
  PENDING:  { label: 'Pending',  icon: Clock,        color: 'text-blue-600 bg-blue-50 border-blue-200'         },
};

const VISA_MODULES = [
  {
    title: 'Employee Passes',
    description: 'View all employment passes, passport details, and status by employee.',
    icon: Users,
    color: 'bg-sky-500',
    href: '/visa/employees',
    badge: 'Active',
  },
  {
    title: 'Renewals Due',
    description: 'Track upcoming EP and permit renewals with automated reminders.',
    icon: Bell,
    color: 'bg-amber-500',
    href: '/visa/renewals',
    badge: 'Active',
  },
  {
    title: 'New Applications',
    description: 'Submit and track new employment pass and work permit applications.',
    icon: PlusCircle,
    color: 'bg-emerald-500',
    href: '/visa/applications',
    badge: 'Coming',
  },
  {
    title: 'Document Vault',
    description: 'Upload and store passport copies, approval letters, endorsements.',
    icon: FileText,
    color: 'bg-violet-500',
    href: '/visa/documents',
    badge: 'Coming',
  },
  {
    title: 'Compliance Rules',
    description: 'Malaysia MDEC, JTK, Immigration rules reference and updates.',
    icon: Shield,
    color: 'bg-blue-500',
    href: '/visa/compliance',
    badge: 'Coming',
  },
  {
    title: 'Reminder Schedule',
    description: 'Configure auto-reminders at 90, 60, 30 days before expiry.',
    icon: Calendar,
    color: 'bg-rose-500',
    href: '/visa/reminders',
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

export default function VisaPage() {
  return (
    <DashboardLayout title="Visa & Permits">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Visa & Permits Desk</h2>
            <p className="text-sm text-slate-500 mt-0.5">Employment Pass · Work Permits · Renewals · Malaysia compliance</p>
          </div>
          <button className="btn-primary text-sm self-start" disabled>
            <PlusCircle size={14} /> Add Employee Pass
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Renewals Due (30d)',   value: '—', icon: Bell,        sub: 'Urgent',          bg: 'bg-amber-50',  text: 'text-amber-600'  },
            { label: 'Expiring Permits',      value: '—', icon: AlertTriangle, sub: 'Within 60 days', bg: 'bg-red-50',   text: 'text-red-600'    },
            { label: 'New Applications',      value: '—', icon: PlusCircle,  sub: 'In progress',     bg: 'bg-blue-50',   text: 'text-blue-600'   },
            { label: 'Valid Passes',          value: '—', icon: CheckCircle2,sub: 'Active',          bg: 'bg-emerald-50',text: 'text-emerald-600'},
          ].map(s => {
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

        {/* Pass type legend */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Pass Types Tracked (Malaysia)</h3>
          <div className="flex flex-wrap gap-2">
            {PASS_TYPES.map(pt => (
              <div key={pt.short} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${pt.border} ${pt.color}`}>
                <span className="text-xs font-bold">{pt.short}</span>
                <span className="text-xs">— {pt.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Module cards */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Visa Desk Modules</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {VISA_MODULES.map(m => <SectionCard key={m.title} {...m} />)}
          </div>
        </div>

        {/* Malaysia note */}
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex items-start gap-3">
          <Plane size={18} className="text-sky-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-sky-800">Malaysia Visa Desk — Tekgen Operations</h4>
            <p className="text-xs text-sky-700 mt-0.5">
              This module tracks all work authorisation documents for Tekgen employees operating in Malaysia. 
              Employment Pass (EP), Professional Visit Pass, and Dependant Pass renewals are monitored. 
              Admin can manually update Malaysia immigration rules or configure future API sync.
            </p>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
