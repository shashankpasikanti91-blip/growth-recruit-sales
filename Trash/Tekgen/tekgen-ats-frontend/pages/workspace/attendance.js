'use client';

import DashboardLayout from '../../components/layout/DashboardLayout';
import { ClipboardList } from 'lucide-react';

export default function MyAttendance() {
  return (
    <DashboardLayout title="My Workspace › My Attendance">
      <div className="max-w-5xl mx-auto space-y-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">My Attendance</h2>
          <p className="text-sm text-slate-500 mt-0.5">Daily clock-in/out records &amp; timesheet</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <ClipboardList size={24} className="text-slate-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700">Attendance module coming soon</h3>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xs">
            Attendance tracking with clock-in/out, biometric sync, and late/absent reports will be available in Phase 03 — HR Operations.
          </p>
          <span className="mt-4 text-[10px] font-semibold text-teal-600 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full uppercase tracking-wider">
            Phase 03 Feature
          </span>
        </div>
      </div>
    </DashboardLayout>
  );
}
