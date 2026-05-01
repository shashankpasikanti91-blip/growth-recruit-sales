'use client';

import DashboardLayout from '../../components/layout/DashboardLayout';
import { Users, PlusCircle } from 'lucide-react';

export default function VisaEmployeesPage() {
  return (
    <DashboardLayout title="Visa & Permits › Employee Passes">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Employee Passes</h2>
            <p className="text-sm text-slate-500 mt-0.5">Employment Pass · Work Permit · Status per employee</p>
          </div>
          <button className="btn-primary text-sm" disabled><PlusCircle size={14} /> Add Employee Pass</button>
        </div>

        {/* Table header */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 grid grid-cols-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <div className="col-span-2">Employee</div>
            <div>Pass Type</div>
            <div>Expiry Date</div>
            <div>Passport Expiry</div>
            <div>Status</div>
          </div>
          <div className="flex items-center justify-center py-16 text-center">
            <div>
              <Users size={28} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No records yet</p>
              <p className="text-xs text-slate-400 mt-1">Add employee visa and pass records to start tracking</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
