'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api-client';
import { Building2, Download, FileSpreadsheet } from 'lucide-react';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold text-slate-800 mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function ClientActivityPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['report-client-activity', from, to],
    queryFn: () => reportsApi.clientActivity({ from: from || undefined, to: to || undefined }),
  });

  const rows: any[] = data?.data ?? [];
  const totalClients = rows.length;
  const totalPlacements = rows.reduce((s: number, r: any) => s + r.placements, 0);
  const totalSubs = rows.reduce((s: number, r: any) => s + r.submissions, 0);
  const activeClients = rows.filter((r: any) => r.openJds > 0).length;

  const exportUrl = (fmt: 'csv' | 'xlsx') =>
    reportsApi.exportUrl('client-activity', fmt, { from: from || undefined, to: to || undefined });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-amber-600" />
            Client Activity Report
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Open JDs, submissions, interviews, offers and placements per client
          </p>
        </div>
        <div className="flex gap-2">
          <a href={exportUrl('csv')} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700">
            <Download className="w-4 h-4" /> CSV
          </a>
          <a href={exportUrl('xlsx')} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Clients" value={totalClients} />
        <StatCard label="Active (Open JDs)" value={activeClients} />
        <StatCard label="Total Submissions" value={totalSubs} sub="in range" />
        <StatCard label="Total Placements" value={totalPlacements} sub="in range" />
      </div>

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
                {['Client', 'Open JDs', 'Submissions', 'Interviews', 'Offers', 'Placements', 'Last Activity'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{row.client}</td>
                  <td className="px-4 py-3 text-slate-600">{row.openJds}</td>
                  <td className="px-4 py-3 text-slate-600">{row.submissions}</td>
                  <td className="px-4 py-3 text-slate-600">{row.interviews}</td>
                  <td className="px-4 py-3 text-slate-600">{row.offers}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${row.placements > 0 ? 'bg-emerald-100 text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                      {row.placements > 0 ? row.placements : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{row.lastActivity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
