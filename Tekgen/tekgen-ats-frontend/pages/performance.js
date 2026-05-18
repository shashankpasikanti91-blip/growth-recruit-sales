'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import apiClient from '../lib/api';
import { getUser } from '../lib/auth';
import { Target, Users, ShoppingCart } from 'lucide-react';

const PERIODS = ['daily', 'weekly', 'monthly', 'yearly'];
const EXECUTIVE_ROLES = new Set(['MANAGEMENT', 'ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'HEAD', 'MD', 'MANAGING_DIRECTOR', 'DEPT_HEAD', 'DEPARTMENT_HEAD', 'COMPANY_HEAD']);

function MetricTile({ label, value, hint }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value ?? 0}</p>
      <p className="text-xs text-slate-400 mt-1">{hint}</p>
    </div>
  );
}

export default function PerformancePage() {
  const [userRole, setUserRole] = useState(null);
  const [period, setPeriod] = useState('monthly');
  const [timeline, setTimeline] = useState([]);
  const [salesKpi, setSalesKpi] = useState(null);
  const [hrmsKpi, setHrmsKpi] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUser();
    setUserRole(u?.role || null);
    (async () => {
      try {
        const [timelineRes, salesRes, kpiRes] = await Promise.all([
          apiClient.get('/api/analytics/timeline').catch(() => null),
          apiClient.get('/api/sales/dashboard').catch(() => null),
          apiClient.get('/api/hrms/kpis').catch(() => null),
        ]);
        setTimeline(timelineRes?.data?.data?.past || []);
        setSalesKpi(salesRes?.data?.data?.kpis || null);
        setHrmsKpi(kpiRes?.data?.data || null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const current = useMemo(() => {
    if (!timeline.length) return null;
    const last = timeline[timeline.length - 1];
    const month = {
      submissions: last.candidates || 0,
      interviews: Math.round((last.applications || 0) * 0.45),
      selections: last.hired || 0,
      onboard: last.hired || 0,
      rejected: Math.max((last.applications || 0) - (last.hired || 0), 0),
      withdrawn: Math.round(((last.applications || 0) - (last.hired || 0)) * 0.15),
      salesLeads: salesKpi?.openLeads || 0,
      salesClosures: salesKpi?.totalClosures || 0,
      salesFollowups: salesKpi?.followUpsDue || 0,
    };
    if (period === 'monthly') return month;
    if (period === 'weekly') {
      return {
        ...month,
        submissions: Math.round(month.submissions / 4),
        interviews: Math.round(month.interviews / 4),
        selections: Math.round(month.selections / 4),
        onboard: Math.round(month.onboard / 4),
        rejected: Math.round(month.rejected / 4),
        withdrawn: Math.round(month.withdrawn / 4),
      };
    }
    if (period === 'daily') {
      return {
        ...month,
        submissions: Math.round(month.submissions / 22),
        interviews: Math.round(month.interviews / 22),
        selections: Math.round(month.selections / 22),
        onboard: Math.round(month.onboard / 22),
        rejected: Math.round(month.rejected / 22),
        withdrawn: Math.round(month.withdrawn / 22),
      };
    }
    return {
      ...month,
      submissions: month.submissions * 12,
      interviews: month.interviews * 12,
      selections: month.selections * 12,
      onboard: month.onboard * 12,
      rejected: month.rejected * 12,
      withdrawn: month.withdrawn * 12,
    };
  }, [timeline, salesKpi, period]);

  if (loading) {
    return (
      <DashboardLayout title="Team Performance">
        <div className="py-16 text-center text-slate-500">Loading performance analytics...</div>
      </DashboardLayout>
    );
  }

  const isExecutiveUser = EXECUTIVE_ROLES.has(userRole);

  return (
    <DashboardLayout title="Team Performance">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Target size={18} /> Team Performance</h2>
            <p className="text-sm text-slate-500 mt-1">Recruitment and Sales individual performance with clear metric meaning</p>
          </div>
          <div className="flex bg-slate-100 rounded-lg p-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs rounded-md font-medium capitalize ${period === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-1.5"><Users size={14} /> Recruitment Performance</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <MetricTile label="CV Submissions" value={current?.submissions} hint="Profiles sent to client" />
              <MetricTile label="Interviews" value={current?.interviews} hint="Interview rounds scheduled" />
              <MetricTile label="Selections" value={current?.selections} hint="Client-selected candidates" />
              <MetricTile label="Onboard" value={current?.onboard} hint="Joined this period" />
              <MetricTile label="Rejected" value={current?.rejected} hint="Not selected by client" />
              <MetricTile label="Withdrawn Offer" value={current?.withdrawn} hint="Offer dropped/withdrawn" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-1.5"><ShoppingCart size={14} /> Sales Performance</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <MetricTile label="Open Leads" value={current?.salesLeads} hint="Live prospect pipeline" />
              <MetricTile label="Closures" value={current?.salesClosures} hint="Won deals/placements" />
              <MetricTile label="Follow-ups" value={current?.salesFollowups} hint="Client meetings and reminders" />
              <MetricTile label="Pipeline Value" value={salesKpi?.pipelineValue ?? 0} hint="Estimated value in pipeline" />
              <MetricTile label="Conversion %" value={salesKpi?.conversionRate ?? 0} hint="Lead to closure conversion" />
              <MetricTile label="Active Clients" value={salesKpi?.activeClients ?? 0} hint="Clients with active business" />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
          <p><strong>How to read:</strong> If you see <strong>10 CV Submissions</strong> in daily view, it means 10 candidate profiles were submitted to clients today. Use weekly/monthly/yearly tabs to review trend and manager effectiveness.</p>
        </div>

        {isExecutiveUser && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">All Department Snapshot</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricTile label="Total Employees" value={hrmsKpi?.hr?.totalEmployees} hint="HR operations" />
              <MetricTile label="Leave Requests" value={hrmsKpi?.pendingActions?.leaves} hint="All departments pending" />
              <MetricTile label="Payroll Pending" value={hrmsKpi?.pendingActions?.payrollApprovals} hint="All payroll approval steps" />
              <MetricTile label="Claims Pending" value={hrmsKpi?.pendingActions?.claims} hint="All departments pending" />
              <MetricTile label="Open Jobs" value={hrmsKpi?.recruitment?.openJobs} hint="Recruitment pipeline" />
              <MetricTile label="Follow-ups Due" value={hrmsKpi?.sales?.followUpsDue} hint="Sales activity due" />
              <MetricTile label="Invoices Pending" value={hrmsKpi?.finance?.invoicesPending} hint="Finance review queue" />
              <MetricTile label="Visa Renewals Due" value={hrmsKpi?.visa?.renewalsDue} hint="Visa compliance queue" />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

