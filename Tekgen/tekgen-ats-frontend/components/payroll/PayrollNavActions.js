'use client';

import { useRouter } from 'next/router';
import { ArrowLeft } from 'lucide-react';

/**
 * Consistent payroll navigation: hub + main app (sidebar is from DashboardLayout).
 */
export default function PayrollNavActions() {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <button
        type="button"
        onClick={() => router.push('/payroll/hub')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-sm"
      >
        <ArrowLeft size={16} aria-hidden />
        Payroll hub
      </button>
      <button
        type="button"
        onClick={() => router.push('/dashboard')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-sm"
      >
        <ArrowLeft size={16} aria-hidden />
        Main dashboard
      </button>
    </div>
  );
}
