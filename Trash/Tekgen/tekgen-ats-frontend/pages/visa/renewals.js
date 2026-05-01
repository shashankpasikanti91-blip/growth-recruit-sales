'use client';

import DashboardLayout from '../../components/layout/DashboardLayout';
import { Bell, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

const REMINDER_PERIODS = [
  { label: '90 Days',  description: 'Early notification — start preparing documents', icon: Bell,         color: 'text-blue-500 bg-blue-50' },
  { label: '60 Days',  description: 'Urgent — submit renewal application now',         icon: Clock,        color: 'text-amber-500 bg-amber-50' },
  { label: '30 Days',  description: 'Critical — pass expiry imminent',                 icon: AlertCircle,  color: 'text-red-500 bg-red-50' },
  { label: 'Expired',  description: 'Immediate action required',                       icon: AlertCircle,  color: 'text-red-600 bg-red-100' },
];

export default function VisaRenewalsPage() {
  return (
    <DashboardLayout title="Visa & Permits › Renewals Due">
      <div className="max-w-7xl mx-auto space-y-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Renewals Due</h2>
          <p className="text-sm text-slate-500 mt-0.5">Employment passes and work permits requiring renewal action</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {REMINDER_PERIODS.map(p => {
            const Icon = p.icon;
            return (
              <div key={p.label} className="stat-card flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${p.color}`}>
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">Due in {p.label}</p>
                  <p className="text-2xl font-bold text-slate-800">0</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{p.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 flex items-center justify-center py-16 text-center">
          <div>
            <CheckCircle2 size={28} className="text-emerald-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-500">No renewals due</p>
            <p className="text-xs text-slate-400 mt-1">Add employee pass records to enable renewal tracking</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
