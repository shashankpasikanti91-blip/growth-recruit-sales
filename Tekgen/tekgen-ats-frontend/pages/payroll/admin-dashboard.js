'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Users, FileText, TrendingUp, AlertCircle, Clock, DollarSign,
  Calendar, ChevronRight, CheckCircle, Play, X,
  Loader2, BarChart2, ListChecks, Zap, Eye,
} from 'lucide-react';
import apiClient from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PayrollNavActions from '../../components/payroll/PayrollNavActions';

// 9-step payroll run pipeline
const PIPELINE = [
  { key: 'DRAFT',          label: 'Draft',           short: '1' },
  { key: 'VALIDATING',     label: 'Validating',      short: '2' },
  { key: 'EXCEPTIONS',     label: 'Exceptions',      short: '3' },
  { key: 'UNDER_REVIEW',   label: 'Under Review',    short: '4' },
  { key: 'FINANCE_REVIEW', label: 'Finance Review',  short: '5' },
  { key: 'APPROVED',       label: 'Approved',        short: '6' },
  { key: 'GENERATED',      label: 'Payslips Gen.',   short: '7' },
  { key: 'PUBLISHED',      label: 'Published',       short: '8' },
  { key: 'CLOSED',         label: 'Period Closed',   short: '9' },
];

const STATUS_COLOR = {
  DRAFT:          'bg-slate-100 text-slate-700 border-slate-300',
  VALIDATING:     'bg-blue-100 text-blue-700 border-blue-300',
  EXCEPTIONS:     'bg-red-100 text-red-700 border-red-300',
  REVIEW:         'bg-amber-100 text-amber-700 border-amber-300',
  UNDER_REVIEW:   'bg-amber-100 text-amber-700 border-amber-300',
  FINANCE_REVIEW: 'bg-purple-100 text-purple-700 border-purple-300',
  APPROVED:       'bg-teal-100 text-teal-700 border-teal-300',
  GENERATED:      'bg-indigo-100 text-indigo-700 border-indigo-300',
  PUBLISHED:      'bg-green-100 text-green-700 border-green-300',
  CLOSED:         'bg-slate-200 text-slate-600 border-slate-400',
};

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];
const WORKER_CATEGORY_OPTIONS = [
  { value: 'INTERNAL_STAFF', label: 'INTERNAL' },
  { value: 'DEPLOYED_STAFF', label: 'DEPLOYED' },
  { value: 'BOTH', label: 'BOTH' },
];

const WORKER_CATEGORY_LABEL = {
  INTERNAL_STAFF: 'Internal staff',
  DEPLOYED_STAFF: 'Deployed / external',
  BOTH: 'Internal + deployed',
};

function PipelineBar({ currentStatus }) {
  const idx = PIPELINE.findIndex(s => s.key === currentStatus);
  return (
    <div className="flex items-center gap-0 w-full overflow-x-auto pb-1">
      {PIPELINE.map((step, i) => {
        const done    = i < idx;
        const active  = i === idx;
        const pending = i > idx;
        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <div className={`flex flex-col items-center flex-shrink-0 ${active ? 'scale-110' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                done    ? 'bg-green-500 border-green-500 text-white' :
                active  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' :
                          'bg-slate-100 border-slate-300 text-slate-400'
              }`}>
                {done ? <CheckCircle size={14} /> : step.short}
              </div>
              <span className={`text-[9px] font-semibold mt-1 whitespace-nowrap ${active ? 'text-blue-700' : done ? 'text-green-600' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
            {i < PIPELINE.length - 1 && (
              <div className={`flex-1 h-0.5 mx-0.5 ${i < idx ? 'bg-green-400' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PayrollAdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentRuns, setRecentRuns] = useState([]);
  const [showNewRun, setShowNewRun] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState(null);
  const [newRun, setNewRun] = useState({
    month: new Date().getMonth() + 1,
    year: CURRENT_YEAR,
    workerCategory: 'BOTH',
    runType: 'MONTHLY',
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) { router.push('/auth/login'); return; }
    const parsed = JSON.parse(userData);
    setUser(parsed);
    if (!['PAYROLL_ADMIN', 'ADMIN', 'MANAGEMENT', 'FINANCE_HEAD', 'HR_ADMIN'].includes(parsed.role)) {
      router.push('/dashboard'); return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [statsRes, runsRes] = await Promise.allSettled([
        apiClient.get('/api/payroll/admin/stats', { headers }),
        apiClient.get('/api/payroll/runs?limit=5', { headers }),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data || {});
      if (runsRes.status === 'fulfilled')  setRecentRuns(runsRes.value.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRun = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const res = await apiClient.post('/api/payroll/runs', {
        month: newRun.month,
        year: newRun.year,
        workerCategory: newRun.workerCategory,
        runType: newRun.runType || 'MONTHLY',
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setToast({ type: 'success', msg: `Payroll run created for ${MONTHS[newRun.month - 1]} ${newRun.year}` });
      setShowNewRun(false);
      fetchData();
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.message || 'Failed to create payroll run' });
    } finally {
      setCreating(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleValidateRun = async (runId) => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      await apiClient.post(`/api/payroll/runs/${runId}/validate`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setToast({ type: 'success', msg: 'Payroll run validated successfully' });
      fetchData();
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.message || 'Failed to validate payroll run' });
    } finally {
      setTimeout(() => setToast(null), 4000);
    }
  };

  const activeRun = stats?.currentPayrollRun || (recentRuns.find(r => r.status !== 'CLOSED'));

  if (loading) {
    return (
      <DashboardLayout title="Payroll Administration">
        <div className="flex justify-center py-24">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Loading payroll dashboard…</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <Head><title>Payroll Admin — Tekgen ATS</title></Head>
      <DashboardLayout title="Payroll Administration">
        <div className="max-w-7xl mx-auto p-2 md:p-4 space-y-8">
          <PayrollNavActions />
          <p className="text-xs text-slate-500 -mt-2">
            Payroll is configured for <strong>Malaysia — amounts in RM (MYR)</strong>. Staff can be paid <strong>monthly</strong> or <strong>daily</strong> via salary structure pay frequency; this run&apos;s <strong>run type</strong> labels the batch (monthly vs daily-rate cycle).
          </p>

          {/* Toast */}
          {toast && (
            <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg ${toast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {toast.msg}
            </div>
          )}


          {/* Page header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
              <p className="text-slate-500 text-sm mt-1">Manage payroll runs, salary structures, and approvals</p>
            </div>
            <button
              onClick={() => setShowNewRun(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm transition-colors shadow-sm"
            >
              <Play size={15} /> New Payroll Run
            </button>
          </div>

          {/* New Payroll Run Modal */}
          {showNewRun && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900">New Payroll Run</h3>
                  <button onClick={() => setShowNewRun(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><X size={18} /></button>
                </div>
                <form onSubmit={handleCreateRun} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Month *</label>
                      <select value={newRun.month} onChange={e => setNewRun(p => ({ ...p, month: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none bg-white">
                        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Year *</label>
                      <select value={newRun.year} onChange={e => setNewRun(p => ({ ...p, year: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none bg-white">
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Employee Type *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {WORKER_CATEGORY_OPTIONS.map((opt) => (
                        <button key={opt.value} type="button" onClick={() => setNewRun(p => ({ ...p, workerCategory: opt.value }))}
                          className={`py-2 text-xs font-bold rounded-lg border-2 transition-all ${newRun.workerCategory === opt.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Run type *</label>
                    <select
                      value={newRun.runType}
                      onChange={e => setNewRun(p => ({ ...p, runType: e.target.value }))}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none bg-white"
                    >
                      <option value="MONTHLY">Monthly payroll (standard)</option>
                      <option value="DAILY">Daily-rate payroll (same month; uses daily basic × weekdays)</option>
                      <option value="BONUS">Bonus</option>
                      <option value="ADJUSTMENT">Adjustment</option>
                      <option value="FINAL_SETTLEMENT">Final settlement</option>
                    </select>
                  </div>
                  <div className="flex gap-3 justify-end pt-3">
                    <button type="button" onClick={() => setShowNewRun(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium">Cancel</button>
                    <button type="submit" disabled={creating} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
                      {creating && <Loader2 size={13} className="animate-spin" />}
                      {creating ? 'Creating…' : 'Create Run'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Period Status', value: activeRun?.status || 'NO RUN', icon: <Calendar size={18} />, color: 'blue', isStatus: true },
              { label: 'Total Employees', value: stats?.totalStaff ?? '—', icon: <Users size={18} />, color: 'indigo' },
              { label: 'Exceptions', value: stats?.exceptions ?? 0, icon: <AlertCircle size={18} />, color: 'red' },
              { label: 'Gross Payroll', value: stats?.grossPayroll ? `RM ${Number(stats.grossPayroll).toLocaleString('en-MY', { minimumFractionDigits: 0 })}` : 'RM —', icon: <BarChart2 size={18} />, color: 'green' },
              { label: 'Net Payout', value: stats?.netPayout ? `RM ${Number(stats.netPayout).toLocaleString('en-MY', { minimumFractionDigits: 0 })}` : 'RM —', icon: <DollarSign size={18} />, color: 'teal' },
              { label: 'Pending Approvals', value: stats?.pendingApprovals ?? 0, icon: <Clock size={18} />, color: 'amber' },
            ].map((kpi, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${
                  kpi.color === 'blue'   ? 'bg-blue-100 text-blue-600'   :
                  kpi.color === 'indigo' ? 'bg-indigo-100 text-indigo-600' :
                  kpi.color === 'red'    ? 'bg-red-100 text-red-600'     :
                  kpi.color === 'green'  ? 'bg-green-100 text-green-600' :
                  kpi.color === 'teal'   ? 'bg-teal-100 text-teal-600'   :
                                           'bg-amber-100 text-amber-600'
                }`}>{kpi.icon}</div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                {kpi.isStatus ? (
                  <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[kpi.value] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{kpi.value}</span>
                ) : (
                  <p className="text-xl font-bold text-slate-800 mt-1">{kpi.value}</p>
                )}
              </div>
            ))}
          </div>

          {/* Active Payroll Run - Pipeline */}
          {activeRun ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Active Payroll Run</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {MONTHS[(activeRun.month || 1) - 1]} {activeRun.year} · {WORKER_CATEGORY_LABEL[activeRun.workerCategory] || 'All categories'} · {activeRun.runType === 'DAILY' ? 'Daily-rate run' : 'Monthly run'} · RM (MYR)
                  </p>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${STATUS_COLOR[activeRun.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {activeRun.status}
                </span>
              </div>
              <PipelineBar currentStatus={activeRun.status} />
              <div className="grid grid-cols-4 gap-4 mt-6">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Employees</p>
                  <p className="text-xl font-bold text-slate-800 mt-0.5">{activeRun.employeeCount ?? '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Gross</p>
                  <p className="text-lg font-bold text-slate-800 mt-0.5">RM {activeRun.grossPayroll ? Number(activeRun.grossPayroll).toLocaleString('en-MY', { minimumFractionDigits: 0 }) : '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Deductions</p>
                  <p className="text-lg font-bold text-slate-800 mt-0.5">RM {activeRun.totalDeductions ? Number(activeRun.totalDeductions).toLocaleString('en-MY', { minimumFractionDigits: 0 }) : '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Net Pay</p>
                  <p className="text-lg font-bold text-teal-700 mt-0.5">RM {activeRun.netPayout ? Number(activeRun.netPayout).toLocaleString('en-MY', { minimumFractionDigits: 0 }) : '—'}</p>
                </div>
              </div>
              <div className="flex gap-3 mt-5 flex-wrap">
                <button onClick={() => router.push('/payroll/runs')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                  <Eye size={14} /> View Details
                </button>
                {['DRAFT','EXCEPTIONS'].includes(activeRun.status) && (
                  <button onClick={() => handleValidateRun(activeRun.id)} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 transition-colors">
                    <Zap size={14} /> Run Validation
                  </button>
                )}
                {['UNDER_REVIEW', 'REVIEW'].includes(activeRun.status) && (
                  <button onClick={() => router.push('/payroll/runs')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                    <ListChecks size={14} /> Review Items
                  </button>
                )}
                {activeRun.status === 'APPROVED' && (
                  <button onClick={() => router.push('/payroll/runs')} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors">
                    <FileText size={14} /> Generate Payslips
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar size={28} className="text-blue-400" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">No Active Payroll Run</h3>
              <p className="text-slate-500 text-sm mt-2 mb-5">Start a new payroll processing cycle for the current period</p>
              <button onClick={() => setShowNewRun(true)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors mx-auto">
                <Play size={15} /> Create First Payroll Run
              </button>
            </div>
          )}

          {/* Recent Runs */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Recent Payroll Runs</h3>
                <button onClick={() => router.push('/payroll/runs')} className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
                  View All <ChevronRight size={13} />
                </button>
              </div>
              {recentRuns.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">No payroll runs yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[11px] font-semibold text-slate-400 uppercase bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-3 text-left">Period</th>
                        <th className="px-5 py-3 text-left">Type</th>
                        <th className="px-5 py-3 text-center">Employees</th>
                        <th className="px-5 py-3 text-right">Net Pay</th>
                        <th className="px-5 py-3 text-center">Status</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentRuns.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 font-semibold text-slate-800">
                            {MONTHS[(r.month || 1) - 1].slice(0, 3)} {r.year}
                          </td>
                          <td className="px-5 py-3 text-slate-500 text-xs">{r.entityType || 'ALL'}</td>
                          <td className="px-5 py-3 text-center text-slate-700">{r.employeeCount ?? '—'}</td>
                          <td className="px-5 py-3 text-right font-semibold text-slate-800">
                            {r.netPayout ? `RM ${Number(r.netPayout).toLocaleString('en-MY', { minimumFractionDigits: 0 })}` : '—'}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[r.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <button onClick={() => router.push('/payroll/runs')} className="text-slate-400 hover:text-blue-600">
                              <Eye size={14} />
                            </button>
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
