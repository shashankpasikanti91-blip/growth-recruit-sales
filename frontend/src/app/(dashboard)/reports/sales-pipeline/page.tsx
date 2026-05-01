'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api-client';
import { BarChart2, Download, FileSpreadsheet, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold text-slate-800 mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function SalesPipelinePage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['report-sales-pipeline', from, to],
    queryFn: () => reportsApi.salesPipeline({ from: from || undefined, to: to || undefined }),
  });

  const rows: any[] = data?.data ?? [];
  const totalLeads = rows.reduce((s: number, r: any) => s + r.leadsThisPeriod, 0);
  const totalConverted = rows.reduce((s: number, r: any) => s + r.leadsConverted, 0);
  const totalPipeline = rows.reduce((s: number, r: any) => s + r.pipelineValue, 0);
  const avgConversion = totalLeads > 0 ? Math.round((totalConverted / totalLeads) * 100) : 0;

  const exportUrl = (fmt: 'csv' | 'xlsx') =>
    reportsApi.exportUrl('sales-pipeline', fmt, { from: from || undefined, to: to || undefined });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-purple-600" />
            Sales Pipeline Report
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Leads, conversions and pipeline value per sales representative
          </p>
        </div>
        <div className="flex gap-2">
          <a href={exportUrl('csv')} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700">
            <Download className="w-4 h-4" /> CSV
          </a>
          <a href={exportUrl('xlsx')} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Leads" value={totalLeads} sub="in range" />
        <StatCard label="Converted" value={totalConverted} sub="leads" />
        <StatCard label="Avg Conversion" value={`${avgConversion}%`} />
        <StatCard label="Total Pipeline" value={`$${totalPipeline.toLocaleString()}`} />
      </div>

      {/* Bar chart */}
      {rows.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-sm font-semibold text-slate-700 mb-4">Pipeline Value by Rep</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={rows} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="user" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => `$${Number(v).toLocaleString()}`} />
              <Bar dataKey="pipelineValue" fill="#7C3AED" radius={[4, 4, 0, 0]} name="Pipeline $" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No data found for the selected range</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Sales Rep', 'Leads', 'Converted', 'Conversion %', 'Pipeline Value', 'Overdue Follow-ups'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{row.user}</td>
                  <td className="px-4 py-3 text-slate-600">{row.leadsThisPeriod}</td>
                  <td className="px-4 py-3 text-slate-600">{row.leadsConverted}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${row.conversionRatePct >= 30 ? 'bg-emerald-100 text-emerald-700' : row.conversionRatePct >= 15 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                      {row.conversionRatePct}%
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700">
                    ${Number(row.pipelineValue).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {row.overdueFollowUps > 0 ? (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                        {row.overdueFollowUps} overdue
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
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
