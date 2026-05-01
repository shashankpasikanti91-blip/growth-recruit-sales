'use client';

import DashboardLayout from '../../components/layout/DashboardLayout';
import { TrendingUp } from 'lucide-react';

const STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];

export default function SalesPipelinePage() {
  return (
    <DashboardLayout title="Sales CRM › Pipeline">
      <div className="max-w-7xl mx-auto space-y-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Sales Pipeline</h2>
          <p className="text-sm text-slate-500 mt-0.5">Visual kanban view of all opportunities by stage</p>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {STAGES.map(stage => (
            <div key={stage} className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="text-xs font-semibold text-slate-700 mb-2">{stage}</div>
              <div className="text-2xl font-bold text-slate-800">0</div>
              <div className="text-[10px] text-slate-400 mt-1">leads</div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 flex items-center justify-center py-16 text-center">
          <div>
            <TrendingUp size={28} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Pipeline is empty</p>
            <p className="text-xs text-slate-400 mt-1">Add leads to start tracking your sales pipeline</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
