'use client';

import DashboardLayout from '../components/layout/DashboardLayout';
import { FileText, PlusCircle, Search, Download } from 'lucide-react';

export default function DocumentsPage() {
  return (
    <DashboardLayout title="Document Vault">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Document Vault</h2>
            <p className="text-sm text-slate-500 mt-0.5">Policies · Contracts · Signed documents · Templates</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost text-sm" disabled><Search size={14} /> Search</button>
            <button className="btn-primary text-sm" disabled><PlusCircle size={14} /> Upload</button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-20 text-center gap-3">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center">
            <FileText size={24} className="text-slate-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700">Document Vault coming soon</h3>
          <p className="text-xs text-slate-400 max-w-sm">Upload contracts, policies, offer letters, and onboarding documents. All files are stored securely with version control and access permissions.</p>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
            <span className="px-2 py-1 bg-slate-100 rounded">Contracts</span>
            <span className="px-2 py-1 bg-slate-100 rounded">HR Policies</span>
            <span className="px-2 py-1 bg-slate-100 rounded">Offer Letters</span>
            <span className="px-2 py-1 bg-slate-100 rounded">Visa Documents</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
