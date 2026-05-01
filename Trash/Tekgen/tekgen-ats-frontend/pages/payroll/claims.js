'use client';

import DashboardLayout from '../../components/layout/DashboardLayout';
import { CreditCard, PlusCircle } from 'lucide-react';

export default function PayrollClaimsPage() {
  return (
    <DashboardLayout title="Payroll › Claims">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Claims & Reimbursements</h2>
            <p className="text-sm text-slate-500 mt-0.5">Employee expense claims · Medical · Transport · Other</p>
          </div>
          <button className="btn-primary text-sm" disabled><PlusCircle size={14} /> Submit Claim</button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {['Pending Approval', 'Approved', 'Rejected'].map(s => (
            <div key={s} className="stat-card">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{s}</p>
              <p className="text-2xl font-bold text-slate-800">0</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 flex items-center justify-center py-14 text-center">
          <div>
            <CreditCard size={28} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No claims submitted</p>
            <p className="text-xs text-slate-400 mt-1">Claims will appear here once employees submit expense requests</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
