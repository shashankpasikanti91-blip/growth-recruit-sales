'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api-client';
import { Zap, Download, FileSpreadsheet } from 'lucide-react';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold text-slate-800 mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function AiUsagePage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['report-ai-usage', from, to],
    queryFn: () => reportsApi.aiUsage({ from: from || undefined, to: to || undefined }),
  });

  const rows: any[] = data?.data ?? [];
  const totalScreens = rows.reduce((s: number, r: any) => s + r.aiScreensRun, 0);
  const totalLeads = rows.reduce((s: number, r: any) => s + r.leadsGenerated, 0);

  const exportUrl = (fmt: 'csv' | 'xlsx') =>
    reportsApi.exportUrl('ai-usage', fmt, { from: from || undefined, to: to || undefined });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-rose-600" />
            AI Usage Report
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            AI screening volume and lead generation counts per user
          </p>
        </div>
        <div className="flex gap-2">
          <a href={exportUrl('csv')} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700">
            <Download className="w-4 h-4" /> CSV
          </a>
          <a href={exportUrl('xlsx')} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-rose-600 text-white rounded-lg hover:bg-rose-700">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Active Users" value={rows.length} />
        <StatCard label="AI Screens Run" value={totalScreens} sub="in range" />
        <StatCard label="AI Leads Generated" value={totalLeads} sub="Apollo / Apify / Maps" />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No AI activity in the selected range</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['User', 'AI Screens Run', 'Leads Generated (AI)'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{row.user}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-700">
                      {row.aiScreensRun}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${row.leadsGenerated > 0 ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`}>
                      {row.leadsGenerated > 0 ? row.leadsGenerated : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
