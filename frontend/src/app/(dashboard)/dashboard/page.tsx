'use client';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api-client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Briefcase, UserPlus, TrendingUp, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const STAGE_COLORS: Record<string, string> = {
  SOURCED: '#3b82f6',
  SCREENED: '#8b5cf6',
  INTERVIEWING: '#f59e0b',
  OFFERED: '#10b981',
  PLACED: '#06b6d4',
  REJECTED: '#ef4444',
  WITHDRAWN: '#9ca3af',
};

const LEAD_COLORS: Record<string, string> = {
  NEW: '#6b7280',
  CONTACTED: '#3b82f6',
  QUALIFIED: '#8b5cf6',
  PROPOSAL: '#f59e0b',
  NEGOTIATION: '#10b981',
  CLOSED_WON: '#22c55e',
  CLOSED_LOST: '#ef4444',
};

interface StatCardProps { label: string; value: string | number; icon: React.ElementType; color: string; }
function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: recruitment } = useQuery({
    queryKey: ['analytics', 'recruitment'],
    queryFn: () => analyticsApi.recruitment(30),
  });

  const { data: sales } = useQuery({
    queryKey: ['analytics', 'sales'],
    queryFn: () => analyticsApi.sales(30),
  });

  const { data: aiUsage } = useQuery({
    queryKey: ['analytics', 'ai-usage'],
    queryFn: () => analyticsApi.aiUsage(30),
  });

  const stageData = recruitment?.stageBreakdown?.map((s: any) => ({
    name: s.stage,
    count: s.count,
    fill: STAGE_COLORS[s.stage] ?? '#6b7280',
  })) ?? [];

  const leadStageData = sales?.stageBreakdown?.map((s: any) => ({
    name: s.stage,
    count: s.count,
    fill: LEAD_COLORS[s.stage] ?? '#6b7280',
  })) ?? [];

  const totalAiCost = aiUsage?.summary?.totalCost ?? 0;
  const totalAiCalls = aiUsage?.summary?.totalCalls ?? 0;

  const totalKpiValue =
    (recruitment?.kpis?.candidates?.value ?? 0) +
    (recruitment?.kpis?.applications?.value ?? 0) +
    (sales?.kpis?.leads?.value ?? 0);
  const isEmpty = totalKpiValue === 0 && stageData.length === 0 && leadStageData.length === 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Last 30 days overview</p>
      </div>

      {/* Quick start — only shown when no activity yet */}
      {isEmpty && (
        <div className="card border-brand-200 bg-gradient-to-br from-brand-50 to-white">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Welcome — get started in 3 steps</h2>
          <p className="text-sm text-gray-500 mb-5">Your dashboard will show live data as soon as you add candidates, leads, or run AI screenings.</p>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { step: '1', title: 'Import candidates', desc: 'Upload a CSV, Excel, PDF, or Word file with your candidates.', href: '/imports', label: 'Go to Imports' },
              { step: '2', title: 'Post a job', desc: 'Create a job posting so candidates can be linked to positions.', href: '/jobs/new', label: 'Post a Job' },
              { step: '3', title: 'Run AI screening', desc: 'Match candidates to jobs with an AI score in seconds.', href: '/ai/screen', label: 'AI Screen' },
            ].map(s => (
              <div key={s.step} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="w-7 h-7 rounded-lg bg-brand-600 text-white text-xs font-bold flex items-center justify-center mb-3">{s.step}</div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{s.title}</h3>
                <p className="text-xs text-gray-500 mb-3">{s.desc}</p>
                <Link href={s.href} className="inline-flex items-center gap-1 text-xs text-brand-600 font-semibold hover:text-brand-800">
                  {s.label} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="New Candidates" value={recruitment?.kpis?.candidates?.value ?? 0} icon={UserPlus} color="bg-blue-500" />
        <StatCard label="Applications" value={recruitment?.kpis?.applications?.value ?? 0} icon={Briefcase} color="bg-purple-500" />
        <StatCard label="New Leads" value={sales?.kpis?.leads?.value ?? 0} icon={Users} color="bg-amber-500" />
        <StatCard label="AI Screenings" value={recruitment?.kpis?.aiScreenings?.value ?? 0} icon={Zap} color="bg-green-500" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recruitment pipeline */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recruitment Pipeline</h2>
          {stageData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stageData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {stageData.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          )}
        </div>

        {/* Sales pipeline */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Sales Pipeline</h2>
          {leadStageData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={leadStageData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {leadStageData.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* AI Usage */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">AI Usage (30 days)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{totalAiCalls}</div>
            <div className="text-xs text-gray-500 mt-1">Total AI Calls</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">${totalAiCost.toFixed(4)}</div>
            <div className="text-xs text-gray-500 mt-1">Estimated Cost</div>
          </div>
          {aiUsage?.byService?.slice(0, 2).map((u: any, i: number) => (
            <div key={i} className="text-center">
              <div className="text-xl font-bold text-gray-700">{u.calls}</div>
              <div className="text-xs text-gray-500 mt-1">{u.serviceType}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Skills */}
      {recruitment?.topSkills?.length > 0 && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Top Skills in Talent Pool</h2>
          <div className="flex flex-wrap gap-2">
            {recruitment.topSkills.map(({ skill, count }: { skill: string; count: number }) => (
              <span key={skill} className="badge-blue">
                {skill} <span className="ml-1 text-blue-500 font-semibold">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
