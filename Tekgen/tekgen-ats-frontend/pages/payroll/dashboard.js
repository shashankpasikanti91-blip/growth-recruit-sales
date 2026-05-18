'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Users, BarChart2, TrendingUp, Calendar,
  RefreshCw, AlertCircle, Shield, Building2, ListChecks,
} from 'lucide-react';
import apiClient from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PayrollNavActions from '../../components/payroll/PayrollNavActions';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const STATUS_COLOR = {
  DRAFT:          'bg-slate-100 text-slate-600',
  VALIDATING:     'bg-blue-100 text-blue-700',
  EXCEPTIONS:     'bg-red-100 text-red-700',
  UNDER_REVIEW:   'bg-amber-100 text-amber-700',
  FINANCE_REVIEW: 'bg-purple-100 text-purple-700',
  APPROVED:       'bg-teal-100 text-teal-700',
  GENERATED:      'bg-indigo-100 text-indigo-700',
  PUBLISHED:      'bg-green-100 text-green-700',
  CLOSED:         'bg-slate-200 text-slate-600',
};

const ALLOWED_ROLES = ['ADMIN', 'SUPER_ADMIN', 'FINANCE', 'FINANCE_HEAD', 'MANAGEMENT', 'HR_ADMIN', 'PAYROLL_ADMIN'];

export default function PayrollDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [runs, setRuns]   = useState([]);
  const [monitoring, setMonitoring] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) { router.push('/auth/login'); return; }
    const parsed = JSON.parse(userData);
    if (!ALLOWED_ROLES.includes(parsed.role)) {
      router.push('/dashboard'); return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [statsRes, runsRes, monitoringRes] = await Promise.allSettled([
        apiClient.get('/api/payroll/dashboard', { headers }),
        apiClient.get('/api/payroll/runs?limit=10', { headers }),
        apiClient.get('/api/payroll/dashboard/monitoring/approvals-summary', { headers }),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data || null);
      if (runsRes.status === 'fulfilled')  setRuns(runsRes.value.data.data || []);
      if (monitoringRes.status === 'fulfilled') setMonitoring(monitoringRes.value.data.data || null);
    } catch (e) {
      setToast({ type: 'error', msg: 'Failed to load payroll data' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Payroll › Finance overview">
        <div className="flex justify-center py-24">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Loading payroll overview…</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const totalGross = Number(stats?.aggregatedData?.totalGross || 0);
  const totalNet   = Number(stats?.aggregatedData?.totalNetPayout || 0);
  const closedRuns = runs.filter(r => r.status === 'CLOSED').length;

  return (
    <>
      <Head><title>Payroll Overview — Tekgen ATS</title></Head>

      <DashboardLayout title="Payroll › Finance overview">
        <div className="max-w-7xl mx-auto p-2 md:p-4 space-y-8">
          <PayrollNavActions />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Leadership monitoring · amounts in <strong>RM (MYR)</strong> · payroll period <strong>25th current month to 24th next month</strong>.
            </p>
            <button type="button" onClick={fetchData} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50" title="Refresh">
              <RefreshCw size={16} /> Refresh
            </button>
          </div>

          {/* Toast */}
          {toast && (
            <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
              <AlertCircle size={16} /> {toast.msg}
            </div>
          )}

          {/* Read-only notice */}
          <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl px-5 py-3">
            <Shield size={16} className="text-teal-600 flex-shrink-0" />
            <p className="text-sm text-teal-800 font-medium">
              You have read-only access to payroll data. To make changes, contact the Payroll Administrator.
            </p>
          </div>

          {/* Page header */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Payroll Summary</h2>
            <p className="text-slate-500 text-sm mt-1">Consolidated payroll view for reporting and finance review</p>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { label: 'Total Employees',  value: stats?.kpis?.totalEmployees ?? '—',          icon: <Users size={20} />,     color: 'blue' },
              { label: 'Total Gross (YTD)', value: `RM ${totalGross.toLocaleString('en-MY', { minimumFractionDigits: 0 })}`, icon: <BarChart2 size={20} />, color: 'green' },
              { label: 'Total Net (YTD)',   value: `RM ${totalNet.toLocaleString('en-MY',   { minimumFractionDigits: 0 })}`, icon: <TrendingUp size={20} />, color: 'teal' },
              { label: 'Completed Runs',   value: closedRuns,                         icon: <Calendar size={20} />,  color: 'indigo' },
            ].map((kpi, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                  kpi.color === 'blue'   ? 'bg-blue-100 text-blue-600'   :
                  kpi.color === 'green'  ? 'bg-green-100 text-green-600' :
                  kpi.color === 'teal'   ? 'bg-teal-100 text-teal-600'   :
                                           'bg-indigo-100 text-indigo-600'
                }`}>{kpi.icon}</div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{kpi.label}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Building2 size={16} className="text-slate-500" />
                <h3 className="font-bold text-slate-800">Pending By Department</h3>
              </div>
              {!monitoring?.byDepartment?.length ? (
                <div className="p-5 text-sm text-slate-500">No pending department approvals.</div>
              ) : (
                <div className="p-4 space-y-2">
                  {monitoring.byDepartment.slice(0, 8).map((row) => (
                    <div key={row.department} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{row.department}</p>
                        <p className="text-xs text-slate-500">Leave {row.leavePending} · Claims {row.claimPending}</p>
                      </div>
                      <span className="text-sm font-bold text-amber-700">{row.totalPending}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <ListChecks size={16} className="text-slate-500" />
                <h3 className="font-bold text-slate-800">Pending By Payroll Approval Role</h3>
              </div>
              <div className="p-4 space-y-2">
                {Object.entries(monitoring?.payrollPendingByRequiredRole || {}).length === 0 ? (
                  <p className="text-sm text-slate-500">No pending payroll approval steps.</p>
                ) : (
                  Object.entries(monitoring.payrollPendingByRequiredRole).map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                      <p className="text-sm font-semibold text-slate-800">{role}</p>
                      <span className="text-sm font-bold text-purple-700">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Payroll Runs History */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Payroll Run History</h3>
              <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{runs.length} run(s)</span>
            </div>
            {runs.length === 0 ? (
              <div className="text-center py-12">
                <Calendar size={36} className="text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No payroll runs on record</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] font-semibold text-slate-400 uppercase bg-slate-50 border-b border-slate-100">
                      <th className="px-5 py-3 text-left">Period</th>
                      <th className="px-5 py-3 text-left">Type</th>
                      <th className="px-5 py-3 text-center">Employees</th>
                      <th className="px-5 py-3 text-right">Gross Pay</th>
                      <th className="px-5 py-3 text-right">Deductions</th>
                      <th className="px-5 py-3 text-right">Net Pay</th>
                      <th className="px-5 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {runs.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-slate-800">
                          {MONTHS[(r.month || 1) - 1]} {r.year}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 text-xs">{r.runType || '—'}</td>
                        <td className="px-5 py-3.5 text-center text-slate-700">{r.employeeCount ?? '—'}</td>
                        <td className="px-5 py-3.5 text-right text-slate-700">
                          {r.grossPayroll ? `RM ${Number(r.grossPayroll).toLocaleString('en-MY', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right text-red-600">
                          {r.totalDeductions ? `RM ${Number(r.totalDeductions).toLocaleString('en-MY', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-teal-700">
                          {r.netPayout ? `RM ${Number(r.netPayout).toLocaleString('en-MY', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${STATUS_COLOR[r.status] || 'bg-slate-100 text-slate-600'}`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </DashboardLayout>
    </>
  );
}
