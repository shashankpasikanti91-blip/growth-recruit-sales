'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api-client';
import { TrendingUp, Download, FileSpreadsheet } from 'lucide-react';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold text-slate-800 mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function PlacementVelocityPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [recruiterId, setRecruiterId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['report-placement-velocity', from, to, recruiterId],
    queryFn: () => reportsApi.placementVelocity({ from: from || undefined, to: to || undefined, recruiterId: recruiterId || undefined }),
  });

  const rows: any[] = data?.data ?? [];
  const avgTotal = rows.length
    ? Math.round(rows.reduce((s: number, r: any) => s + r.totalDays, 0) / rows.length)
    : 0;
  const avgSubmit = rows.length
    ? Math.round(rows.reduce((s: number, r: any) => s + r.timeToSubmitDays, 0) / rows.length)
    : 0;
  const avgOffer = rows.length
    ? Math.round(rows.reduce((s: number, r: any) => s + r.timeToOfferDays, 0) / rows.length)
    : 0;

  const exportUrl = (fmt: 'csv' | 'xlsx') =>
    reportsApi.exportUrl('placement-velocity', fmt, {
      from: from || undefined,
      to: to || undefined,
      recruiterId: recruiterId || undefined,
    });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Placement Velocity
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Time from JD creation → first submission → offer accepted
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={exportUrl('csv')}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700"
          >
            <Download className="w-4 h-4" /> CSV
          </a>
          <a
            href={exportUrl('xlsx')}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Placements" value={rows.length} sub="in range" />
        <StatCard label="Avg Days to Submit" value={avgSubmit} sub="days" />
        <StatCard label="Avg Days to Offer" value={avgOffer} sub="days" />
        <StatCard label="Avg Total Cycle" value={avgTotal} sub="days" />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No placements found for the selected range</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Date', 'Candidate', 'Job Title', 'Client', 'Recruiter', 'Time to Submit (d)', 'Time to Offer (d)', 'Total (d)'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{row.offerDate}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{row.candidate}</td>
                  <td className="px-4 py-3 text-slate-600">{row.jobTitle}</td>
                  <td className="px-4 py-3 text-slate-600">{row.client}</td>
                  <td className="px-4 py-3 text-slate-600">{row.recruiter}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${row.timeToSubmitDays <= 7 ? 'bg-emerald-100 text-emerald-700' : row.timeToSubmitDays <= 14 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {row.timeToSubmitDays}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${row.timeToOfferDays <= 14 ? 'bg-emerald-100 text-emerald-700' : row.timeToOfferDays <= 21 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {row.timeToOfferDays}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-slate-700">{row.totalDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
