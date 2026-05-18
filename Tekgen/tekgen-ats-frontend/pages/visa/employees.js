'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import apiClient from '../../lib/api';
import { Users, RefreshCw } from 'lucide-react';

function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export default function VisaEmployeesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/api/hrms/employees?status=ALL&limit=500&offset=0');
      const data = res.data?.data;
      const employees = data?.employees || [];
      setRows(employees);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Could not load employees (HR access required).');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardLayout title="HR Ops › Visa › Employee Passes">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Employee Passes</h2>
            <p className="text-sm text-slate-500 mt-0.5">Work pass type and expiry from HR employee master</p>
          </div>
          <button type="button" className="btn-ghost text-sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm px-3 py-2">{error}</div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <div className="col-span-3">Employee</div>
            <div className="col-span-2">Pass / case</div>
            <div className="col-span-2">Permit / passport exp.</div>
            <div className="col-span-3">ID / dependents</div>
            <div className="col-span-2">Status</div>
          </div>
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-center">
              <div>
                <Users size={28} className="text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No rows to show</p>
                <p className="text-xs text-slate-400 mt-1">Use an account with HR Operations access, or add employees in HR master</p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
              {rows.map((emp) => {
                const name = emp.user ? `${emp.user.firstName || ''} ${emp.user.lastName || ''}`.trim() : '—';
                const deps = Array.isArray(emp.visaDependents)
                  ? emp.visaDependents.map((d) => d?.name).filter(Boolean).join(', ')
                  : '';
                const caseLine = [emp.permitType, emp.visaCaseType].filter(Boolean).join(' · ') || emp.visaStatus || '—';
                const expLine = [formatDate(emp.visaExpiryDate), formatDate(emp.passportExpiryDate)]
                  .filter((x) => x !== '—')
                  .join(' / ') || '—';
                return (
                  <li key={emp.id} className="px-4 py-3 grid grid-cols-12 gap-2 items-center text-sm">
                    <div className="col-span-3 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{name}</p>
                      <p className="text-xs text-slate-500 truncate">{emp.employeeId}</p>
                    </div>
                    <div className="col-span-2 text-slate-700 text-xs leading-snug">{caseLine}</div>
                    <div className="col-span-2 text-slate-600 text-xs">{expLine}</div>
                    <div className="col-span-3 text-xs text-slate-600 min-w-0">
                      <p className="font-mono truncate">{emp.nricPassport || '—'}</p>
                      {deps && <p className="text-[10px] text-slate-400 mt-0.5 truncate" title={deps}>DP: {deps}</p>}
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {emp.status || '—'}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
