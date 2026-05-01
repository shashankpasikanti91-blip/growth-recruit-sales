'use client';

import DashboardLayout from '../../components/layout/DashboardLayout';
import { CalendarCheck, PlusCircle } from 'lucide-react';

export default function HRLeavePage() {
  return (
    <DashboardLayout title="HR › Leave Management">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Leave Management</h2>
            <p className="text-sm text-slate-500 mt-0.5">Leave requests · Approvals · Balances</p>
          </div>
          <button className="btn-primary text-sm" disabled><PlusCircle size={14} /> New Request</button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {['Annual Leave', 'Medical Leave', 'Emergency Leave'].map(t => (
            <div key={t} className="stat-card">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{t}</p>
              <p className="text-2xl font-bold text-slate-800">—</p>
              <p className="text-xs text-slate-400">Days available</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 flex items-center justify-center py-16 text-center">
          <div>
            <CalendarCheck size={28} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No leave requests</p>
            <p className="text-xs text-slate-400 mt-1">Leave management module is being configured</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
