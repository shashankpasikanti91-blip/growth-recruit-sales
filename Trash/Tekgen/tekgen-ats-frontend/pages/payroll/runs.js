'use client';

import DashboardLayout from '../../components/layout/DashboardLayout';
import { DollarSign, PlusCircle } from 'lucide-react';

export default function PayrollRunsPage() {
  return (
    <DashboardLayout title="Payroll › Runs">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Payroll Runs</h2>
            <p className="text-sm text-slate-500 mt-0.5">Monthly payroll processing and approval</p>
          </div>
          <button className="btn-primary text-sm" disabled><PlusCircle size={14} /> Run Payroll</button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 flex items-center justify-center py-16 text-center">
          <div>
            <DollarSign size={28} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No payroll runs yet</p>
            <p className="text-xs text-slate-400 mt-1">Configure employee salary structure first to run payroll</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
