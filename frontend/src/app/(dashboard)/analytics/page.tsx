'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api-client';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Users, Target, Briefcase, Zap, BarChart2 } from 'lucide-react';

const COLORS = {
  blue: '#2563EB', purple: '#7C3AED', green: '#059669', orange: '#D97706', slate: '#475569',
};
const STAGE_COLORS: Record<string, string> = {
  SOURCED: '#3B82F6', SCREENED: '#8B5CF6', INTERVIEWING: '#F59E0B',
  OFFERED: '#10B981', PLACED: '#059669', REJECTED: '#EF4444', WITHDRAWN: '#9CA3AF',
  NEW: '#3B82F6', CONTACTED: '#6366F1', QUALIFIED: '#8B5CF6',
  PROPOSAL: '#F59E0B', NEGOTIATION: '#EF4444', CLOSED_WON: '#10B981', CLOSED_LOST: '#DC2626',
};
const LEAD_STAGE_COLORS = ['#3B82F6', '#6366F1', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981', '#DC2626'];

function KpiCard({ label, value, sub, change, color, icon: Icon }: any) {
  const cm: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    orange: 'bg-amber-50 border-amber-200 text-amber-700',
  };
  const isPos = (change ?? 0) >= 0;
  return (
    <div className={`rounded-xl border-2 p-5 ${cm[color] ?? cm.blue} flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</span>
        {Icon && <Icon className="w-5 h-5 opacity-60" />}
      </div>
      <div className="text-3xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="flex items-center justify-between text-xs">
        <span className="opacity-70">{sub}</span>
        {change !== undefined && (
          <span className={`flex items-center gap-1 font-semibold ${isPos ? 'text-emerald-600' : 'text-red-500'}`}>
            {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  );
};

function PeriodSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
      {[{ label: '7D', value: 7 }, { label: '30D', value: 30 }, { label: '90D', value: 90 }].map(p => (
        <button key={p.value} onClick={() => onChange(p.value)}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${value === p.value ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

function RecruitmentTab({ days }: { days: number }) {
  const { data: d, isLoading } = useQuery({
    queryKey: ['analytics-recruitment', days],
    queryFn: () => analyticsApi.recruitment(days),
  });
  if (isLoading) return <div className="text-center py-20 text-gray-400">Loading…</div>;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="New Candidates" value={d?.kpis?.candidates?.value ?? 0} sub={`Past ${days} days`} change={d?.kpis?.candidates?.change} color="blue" icon={Users} />
        <KpiCard label="Applications" value={d?.kpis?.applications?.value ?? 0} sub={`Past ${days} days`} change={d?.kpis?.applications?.change} color="purple" icon={Briefcase} />
        <KpiCard label="AI Screenings" value={d?.kpis?.aiScreenings?.value ?? 0} sub={`Past ${days} days`} change={d?.kpis?.aiScreenings?.change} color="orange" icon={Zap} />
        <KpiCard label="Placements" value={d?.kpis?.placed?.value ?? 0} sub={`Past ${days} days`} change={d?.kpis?.placed?.change} color="green" icon={Target} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ChartCard title="Candidates & Applications Over Time" subtitle={`Daily trend – last ${Math.min(days, 30)} days`}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={d?.timeSeries ?? []} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gCand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.2} /><stop offset="95%" stopColor={COLORS.blue} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gApp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.2} /><stop offset="95%" stopColor={COLORS.purple} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="candidates" name="Candidates" stroke={COLORS.blue} fill="url(#gCand)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="applications" name="Applications" stroke={COLORS.purple} fill="url(#gApp)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <ChartCard title="Stage Distribution" subtitle="All applications">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={d?.stageBreakdown ?? []} dataKey="count" nameKey="stage" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3}>
                {(d?.stageBreakdown ?? []).map((item: any) => <Cell key={item.stage} fill={STAGE_COLORS[item.stage] ?? '#6B7280'} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Recruitment Funnel (Conversion)" subtitle="Candidate stage conversion rates">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={d?.funnel ?? []} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 70 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis dataKey="stage" type="category" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Count" fill={COLORS.blue} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Top Skills in Talent Pool" subtitle="Most common skills across all candidates">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={(d?.topSkills ?? []).slice(0, 10)} margin={{ top: 0, right: 10, bottom: 24, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="skill" tick={{ fontSize: 9 }} tickLine={false} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Candidates" radius={[4, 4, 0, 0]}>
                {(d?.topSkills ?? []).slice(0, 10).map((_: any, i: number) => (
                  <Cell key={i} fill={`hsl(${200 + i * 15}, 80%, ${50 + i * 2}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function SalesTab({ days }: { days: number }) {
  const { data: d, isLoading } = useQuery({
    queryKey: ['analytics-sales', days],
    queryFn: () => analyticsApi.sales(days),
  });
  if (isLoading) return <div className="text-center py-20 text-gray-400">Loading…</div>;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="New Leads" value={d?.kpis?.leads?.value ?? 0} sub={`Past ${days} days`} change={d?.kpis?.leads?.change} color="blue" icon={Target} />
        <KpiCard label="Companies" value={d?.kpis?.companies?.value ?? 0} sub="Total tracked" color="purple" icon={Briefcase} />
        <KpiCard label="Deals Won" value={d?.kpis?.wonDeals?.value ?? 0} sub={`Past ${days} days`} change={d?.kpis?.wonDeals?.change} color="green" icon={TrendingUp} />
        <KpiCard label="Avg ICP Score" value={`${d?.kpis?.avgScore?.value ?? 0}/100`} sub="AI-scored leads" color="orange" icon={Zap} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ChartCard title="Lead Volume Over Time" subtitle={`Daily new leads – last ${Math.min(days, 30)} days`}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={d?.timeSeries ?? []} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gLead" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.25} /><stop offset="95%" stopColor={COLORS.purple} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="leads" name="Leads" stroke={COLORS.purple} fill="url(#gLead)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <ChartCard title="Pipeline by Stage" subtitle="Current lead distribution">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={d?.stageBreakdown ?? []} dataKey="count" nameKey="stage" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3}>
                {(d?.stageBreakdown ?? []).map((_: any, i: number) => <Cell key={i} fill={LEAD_STAGE_COLORS[i % LEAD_STAGE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Sales Pipeline Waterfall" subtitle="Lead count by stage">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={d?.stageBreakdown ?? []} margin={{ top: 0, right: 10, bottom: 24, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="stage" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" interval={0} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Leads" radius={[4, 4, 0, 0]}>
                {(d?.stageBreakdown ?? []).map((_: any, i: number) => <Cell key={i} fill={LEAD_STAGE_COLORS[i % LEAD_STAGE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Top Industries" subtitle="Companies by industry in pipeline">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={d?.topIndustries ?? []} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis dataKey="industry" type="category" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Companies" fill={COLORS.purple} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function AiTab({ days }: { days: number }) {
  const { data: d, isLoading } = useQuery({
    queryKey: ['analytics-ai', days],
    queryFn: () => analyticsApi.aiUsage(days),
  });
  if (isLoading) return <div className="text-center py-20 text-gray-400">Loading…</div>;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Total API Calls" value={d?.summary?.totalCalls ?? 0} sub={`Past ${days} days`} color="blue" icon={Zap} />
        <KpiCard label="Total Tokens" value={(d?.summary?.totalTokens ?? 0).toLocaleString()} sub="Input + Output" color="purple" icon={BarChart2} />
        <KpiCard label="Estimated Cost" value={`$${d?.summary?.totalCost ?? '0.00'}`} sub="USD (OpenRouter)" color="orange" icon={TrendingUp} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Daily AI Calls" subtitle={`Call volume over ${Math.min(days, 30)} days`}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={d?.timeSeries ?? []} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="calls" name="Calls" fill={COLORS.blue} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Daily Cost (USD)" subtitle="Cumulative AI spend per day">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={d?.timeSeries ?? []} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="cost" name="Cost ($)" stroke={COLORS.orange} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <ChartCard title="Usage by Service & Model" subtitle="Breakdown of AI calls per service type">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Service Type', 'Model', 'Calls', 'Tokens In', 'Tokens Out', 'Cost (USD)'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(d?.byService ?? []).length === 0 ? (
                <tr><td colSpan={6} className="text-center py-6 text-gray-400 text-sm">No AI usage data for this period</td></tr>
              ) : (d?.byService ?? []).map((row: any, i: number) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2.5 px-3 font-medium text-gray-700">{row.serviceType}</td>
                  <td className="py-2.5 px-3 text-gray-500 font-mono text-xs">{row.model}</td>
                  <td className="py-2.5 px-3 text-blue-600 font-semibold">{row.calls.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-gray-600">{(row.tokensIn ?? 0).toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-gray-600">{(row.tokensOut ?? 0).toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-amber-600 font-semibold">${row.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

const TABS = [
  { id: 'recruitment', label: 'Recruitment', icon: Users },
  { id: 'sales', label: 'Sales Pipeline', icon: Target },
  { id: 'ai', label: 'AI Usage', icon: Zap },
];

export default function AnalyticsPage() {
  const [tab, setTab] = useState('recruitment');
  const [days, setDays] = useState(30);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-brand-600" /> Analytics & Reports
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Power BI-style insights across recruitment, sales, and AI operations</p>
        </div>
        <PeriodSelector value={days} onChange={setDays} />
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'recruitment' && <RecruitmentTab days={days} />}
      {tab === 'sales' && <SalesTab days={days} />}
      {tab === 'ai' && <AiTab days={days} />}
    </div>
  );
}

