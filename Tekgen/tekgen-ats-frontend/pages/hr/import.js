'use client';

import Link from 'next/link';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Upload, Users, Building2, Plane } from 'lucide-react';

const cards = [
  {
    title: 'Staff & visa columns',
    description: 'Full employee CSV, or visa-only rows matched by employee_id (update existing).',
    href: '/hr/employees/import',
    icon: Users,
    color: 'bg-violet-500',
  },
  {
    title: 'Clients (no Sales UI)',
    description: 'Import existing client list for invoices and deployed staff — CSV.',
    href: '/hr/clients/import',
    icon: Building2,
    color: 'bg-emerald-500',
  },
  {
    title: 'Visa renewals view',
    description: 'After import, review expiries and buckets under Visa & Permits.',
    href: '/visa/renewals',
    icon: Plane,
    color: 'bg-sky-500',
  },
];

export default function HrImportHubPage() {
  return (
    <DashboardLayout title="HR › Bulk import">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Bulk import (HR Operations)</h2>
          <p className="text-sm text-slate-500 mt-1">
            Central place for staff CSV, visa/permit fields, dependent passes (DP), and client master — without using the Sales CRM day-to-day.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-950">
          <p className="font-medium mb-1">What is still “full Phase 04” later</p>
          <p className="text-amber-900/90 text-xs leading-relaxed">
            Dedicated visa case files, document vault linkage per case, and compliance rules engine are not in this import — data lands on the employee profile so Payroll, Visa desk, and Finance can share one employee key (e.g. TKG-EMP-xxxx).
          </p>
        </div>

        <ul className="grid gap-3">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <li key={c.href}>
                <Link
                  href={c.href}
                  className="flex items-start gap-4 bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.color}`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{c.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>
                  </div>
                  <Upload size={16} className="text-slate-300 flex-shrink-0 mt-1" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </DashboardLayout>
  );
}
