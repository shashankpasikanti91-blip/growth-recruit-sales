'use client';

import DashboardLayout from '../../components/layout/DashboardLayout';
import { FileText, PlusCircle, Download } from 'lucide-react';

export default function FinanceInvoicesPage() {
  return (
    <DashboardLayout title="Finance › Invoices">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Invoices</h2>
            <p className="text-sm text-slate-500 mt-0.5">Client invoices · Pending · Paid · Overdue</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost text-sm" disabled><Download size={14} /> Export</button>
            <button className="btn-primary text-sm" disabled><PlusCircle size={14} /> New Invoice</button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 grid grid-cols-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <div className="col-span-2">Invoice / Client</div>
            <div>Amount</div>
            <div>Due Date</div>
            <div>Status</div>
          </div>
          <div className="flex items-center justify-center py-16 text-center">
            <div>
              <FileText size={28} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No invoices yet</p>
              <p className="text-xs text-slate-400 mt-1">Create your first invoice to start tracking payments</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
