'use client';

import { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  ShoppingCart, Users, TrendingUp, PlusCircle, Filter,
  Mail, Phone, Building2, Globe, Calendar, ChevronRight,
  Circle, CheckCircle2, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

const STAGE_CONFIG = [
  { key: 'NEW',       label: 'New',       color: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400'   },
  { key: 'CONTACTED', label: 'Contacted', color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-400'    },
  { key: 'QUALIFIED', label: 'Qualified', color: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500'  },
  { key: 'PROPOSAL',  label: 'Proposal',  color: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-400'   },
  { key: 'WON',       label: 'Won',       color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500'},
  { key: 'LOST',      label: 'Lost',      color: 'bg-red-100 text-red-700',       dot: 'bg-red-400'     },
];

const INTEGRATIONS = [
  { label: 'Apollo.io',   status: 'pending', icon: '🔍' },
  { label: 'Apify',       status: 'pending', icon: '🤖' },
  { label: 'LinkedIn',    status: 'pending', icon: '💼' },
  { label: 'Outlook',     status: 'pending', icon: '📧' },
  { label: 'Gmail',       status: 'pending', icon: '✉️' },
];

function StatCard({ label, value, icon: Icon, sub, color }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <ShoppingCart size={20} className="text-slate-400" />
      </div>
      <h3 className="text-sm font-semibold text-slate-700 mb-1">{title}</h3>
      <p className="text-xs text-slate-400 max-w-xs mb-4">{description}</p>
      {action}
    </div>
  );
}

export default function SalesPage() {
  const [activeStage, setActiveStage] = useState(null);

  return (
    <DashboardLayout title="Sales CRM">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Sales CRM</h2>
            <p className="text-sm text-slate-500 mt-0.5">Lead management · Pipeline tracking · Opportunities</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost text-sm" disabled>
              <Filter size={14} /> Filter
            </button>
            <button className="btn-primary text-sm" disabled>
              <PlusCircle size={14} /> Add Lead
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Open Leads"       value="—" sub="Coming soon" icon={Users}       color="bg-emerald-500" />
          <StatCard label="Follow-ups Due"   value="—" sub="Coming soon" icon={Calendar}     color="bg-amber-500"   />
          <StatCard label="Opportunities Won" value="—" sub="Coming soon" icon={CheckCircle2} color="bg-blue-500"    />
          <StatCard label="Pipeline Value"   value="—" sub="Coming soon" icon={TrendingUp}   color="bg-violet-500"  />
        </div>

        {/* Pipeline stages */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">Lead Pipeline</h3>
            <span className="text-xs text-slate-400">Stage view</span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {STAGE_CONFIG.map((stage, i) => (
              <div key={stage.key} className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setActiveStage(activeStage === stage.key ? null : stage.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                    activeStage === stage.key
                      ? stage.color + ' border-transparent shadow-sm'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                  {stage.label}
                  <span className="font-bold">0</span>
                </button>
                {i < STAGE_CONFIG.length - 1 && <ChevronRight size={12} className="text-slate-300" />}
              </div>
            ))}
          </div>

          <div className="mt-4">
            <EmptyState
              title="No leads yet"
              description="Sales CRM module is ready. Add your first lead or configure integrations to import leads automatically."
              action={
                <Link href="/integrations" className="btn-ghost text-xs">
                  Configure Integrations <ArrowRight size={12} />
                </Link>
              }
            />
          </div>
        </div>

        {/* Integrations ready */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800">Integration Channels</h3>
            <Link href="/integrations" className="text-xs text-brand-500 hover:text-brand-600">Configure →</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {INTEGRATIONS.map(intg => (
              <div key={intg.label} className="flex flex-col items-center gap-1.5 p-3 border border-slate-100 rounded-lg bg-slate-50 hover:bg-white hover:border-slate-200 transition-all">
                <span className="text-xl">{intg.icon}</span>
                <span className="text-xs font-medium text-slate-700">{intg.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded-full">Setup required</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
