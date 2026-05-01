'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api-client';
import { Users, Download, FileSpreadsheet, Trophy } from 'lucide-react';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold text-slate-800 mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function RecruiterPerformancePage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['report-recruiter-performance', from, to],
    queryFn: () => reportsApi.recruiterPerformance({ from: from || undefined, to: to || undefined }),
  });

  const rows: any[] = data?.data ?? [];
  const totalSubs = rows.reduce((s: number, r: any) => s + r.submissionsMade, 0);
  const totalPlacements = rows.reduce((s: number, r: any) => s + r.offersAccepted, 0);
  const bestRecruiter = rows.length ? rows[0].recruiter : '—';

  const exportUrl = (fmt: 'csv' | 'xlsx') =>
    reportsApi.exportUrl('recruiter-performance', fmt, { from: from || undefined, to: to || undefined });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            Recruiter Performance
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Leaderboard: submissions, interviews, offers and placement rate per recruiter
          </p>
        </div>
        <div className="flex gap-2">
          <a href={exportUrl('csv')} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700">
            <Download className="w-4 h-4" /> CSV
          </a>
          <a href={exportUrl('xlsx')} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Recruiters" value={rows.length} />
        <StatCard label="Total Submissions" value={totalSubs} sub="in range" />
        <StatCard label="Total Placements" value={totalPlacements} sub="offers accepted" />
        <StatCard label="Top Recruiter" value={bestRecruiter} sub="most placements" />
      </div>

      {/* Leaderboard table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No data found for the selected range</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['#', 'Recruiter', 'JDs Assigned', 'Candidates', 'Submissions', 'Interviews', 'Offers Accepted', 'Placement Rate'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row: any, i: number) => (
                <tr key={i} className={`hover:bg-slate-50 ${i === 0 ? 'bg-emerald-50/40' : ''}`}>
                  <td className="px-4 py-3 text-slate-500">
                    {i === 0 ? <Trophy className="w-4 h-4 text-amber-500" /> : i + 1}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{row.recruiter}</td>
                  <td className="px-4 py-3 text-slate-600">{row.jdsAssigned}</td>
                  <td className="px-4 py-3 text-slate-600">{row.candidatesSourced}</td>
                  <td className="px-4 py-3 text-slate-600">{row.submissionsMade}</td>
                  <td className="px-4 py-3 text-slate-600">{row.interviewsArranged}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">{row.offersAccepted}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${row.placementRatePct >= 20 ? 'bg-emerald-100 text-emerald-700' : row.placementRatePct >= 10 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                      {row.placementRatePct}%
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
