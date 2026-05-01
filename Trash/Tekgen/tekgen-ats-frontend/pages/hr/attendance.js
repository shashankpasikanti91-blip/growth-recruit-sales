'use client';

import DashboardLayout from '../../components/layout/DashboardLayout';
import { ClipboardList } from 'lucide-react';

export default function HRAttendancePage() {
  return (
    <DashboardLayout title="HR › Attendance">
      <div className="max-w-7xl mx-auto space-y-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Attendance</h2>
          <p className="text-sm text-slate-500 mt-0.5">Daily attendance · Late arrivals · Exceptions</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 flex items-center justify-center py-16 text-center">
          <div>
            <ClipboardList size={28} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Attendance module coming soon</p>
            <p className="text-xs text-slate-400 mt-1">Daily check-in / check-out tracking will be available here</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
