'use client';

import DashboardLayout from '../../components/layout/DashboardLayout';
import { Users, PlusCircle, Search, Filter } from 'lucide-react';

export default function SalesLeadsPage() {
  return (
    <DashboardLayout title="Sales CRM › Leads">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Leads</h2>
            <p className="text-sm text-slate-500 mt-0.5">All sales leads and prospects</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost text-sm" disabled><Filter size={14} /> Filter</button>
            <button className="btn-primary text-sm" disabled><PlusCircle size={14} /> Add Lead</button>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 flex items-center justify-center py-20 text-center">
          <div>
            <Users size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">No leads yet</p>
            <p className="text-xs text-slate-400 mt-1">Add leads manually or connect Apollo / LinkedIn integration</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
