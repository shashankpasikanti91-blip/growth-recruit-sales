'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import apiClient from '../../lib/api';
import { Bell, AlertCircle, Clock, CheckCircle2, RefreshCw } from 'lucide-react';

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / (24 * 60 * 60 * 1000));
}

export default function VisaRenewalsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/api/hrms/employees?status=ACTIVE&limit=500&offset=0');
      const employees = res.data?.data?.employees || [];
      const withExpiry = employees.filter((e) => e.visaExpiryDate && e.visaStatus && e.visaStatus !== 'CITIZEN');
      setRows(withExpiry);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Could not load employees.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    let d7 = 0;
    let d2 = 0;
    let d30 = 0;
    let exp = 0;
    for (const r of rows) {
      const d = daysUntil(r.visaExpiryDate);
      if (d == null) continue;
      if (d < 0) exp += 1;
      else if (d <= 2) d2 += 1;
      else if (d <= 7) d7 += 1;
      else if (d <= 30) d30 += 1;
    }
    return { d7, d2, d30, exp };
  }, [rows]);

  const REMINDER_PERIODS = [
    { label: '30 Days', key: 'd30', count: counts.d30, description: 'Early warning — start renewal process', icon: Bell, color: 'text-blue-500 bg-blue-50' },
    { label: '7 Days', key: 'd7', count: counts.d7, description: 'Urgent warning — team must contact employee', icon: Clock, color: 'text-amber-500 bg-amber-50' },
    { label: '2 Days', key: 'd2', count: counts.d2, description: 'Critical warning — immediate immigration action', icon: AlertCircle, color: 'text-red-500 bg-red-50' },
    { label: 'Expired', key: 'exp', count: counts.exp, description: 'Immediate action required', icon: AlertCircle, color: 'text-red-600 bg-red-100' },
  ];

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => new Date(a.visaExpiryDate) - new Date(b.visaExpiryDate));
  }, [rows]);

  return (
    <DashboardLayout title="HR Ops › Visa › Renewals Due">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Renewals Due</h2>
            <p className="text-sm text-slate-500 mt-0.5">Based on visa expiry on employee profiles (non-citizen)</p>
          </div>
          <button type="button" className="btn-ghost text-sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm px-3 py-2">{error}</div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {REMINDER_PERIODS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.label} className="stat-card flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${p.color}`}>
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">Due in {p.label}</p>
                  <p className="text-2xl font-bold text-slate-800">{p.count}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{p.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 flex items-center justify-center py-16 text-center">
            <div>
              <CheckCircle2 size={28} className="text-emerald-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-500">No visa expiry dates on file</p>
              <p className="text-xs text-slate-400 mt-1">Set visa expiry on HR employee master for non-citizen staff</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <div className="col-span-3">Employee</div>
              <div className="col-span-2">Visa / permit</div>
              <div className="col-span-2">Case</div>
              <div className="col-span-3">Expiry</div>
              <div className="col-span-2">Days</div>
            </div>
            <ul className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
              {sorted.map((emp) => {
                const name = emp.user ? `${emp.user.firstName || ''} ${emp.user.lastName || ''}`.trim() : '—';
                const d = daysUntil(emp.visaExpiryDate);
                return (
                  <li key={emp.id} className="px-4 py-2.5 grid grid-cols-12 gap-2 items-center text-sm">
                    <div className="col-span-3 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{name}</p>
                      <p className="text-xs text-slate-500">{emp.employeeId}</p>
                    </div>
                    <div className="col-span-2 text-slate-700 text-xs">{emp.visaStatus || '—'}</div>
                    <div className="col-span-2 text-xs text-slate-600">{emp.visaCaseType || emp.permitType || '—'}</div>
                    <div className="col-span-3 text-slate-600 text-xs">
                      {emp.visaExpiryDate ? new Date(emp.visaExpiryDate).toLocaleDateString('en-MY') : '—'}
                    </div>
                    <div className="col-span-2">
                      <span className={`text-xs font-semibold ${d != null && d < 0 ? 'text-red-600' : d != null && d <= 30 ? 'text-amber-600' : 'text-slate-600'}`}>
                        {d == null ? '—' : d < 0 ? `+${Math.abs(d)} overdue` : `${d} left`}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
