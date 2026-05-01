'use client';

import DashboardLayout from '../../components/layout/DashboardLayout';
import { FileText } from 'lucide-react';

export default function MyPayslips() {
  return (
    <DashboardLayout title="My Workspace › My Payslips">
      <div className="max-w-5xl mx-auto space-y-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">My Payslips</h2>
          <p className="text-sm text-slate-500 mt-0.5">Monthly salary statements &amp; CPF/EPF summaries</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <FileText size={24} className="text-slate-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700">No payslips yet</h3>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xs">
            Payslips will appear here once payroll is processed. Full payroll processing with EPF, SOCSO, PCB, and EIS deductions arrives in Phase 06 — Payroll.
          </p>
          <span className="mt-4 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full uppercase tracking-wider">
            Phase 06 Feature
          </span>
        </div>
      </div>
    </DashboardLayout>
  );
}
