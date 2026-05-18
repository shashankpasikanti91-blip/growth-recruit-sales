'use client';

import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import apiClient from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PayrollNavActions from '../../components/payroll/PayrollNavActions';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function PayrollStatutoryPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [forms, setForms] = useState([]);
  const [settings, setSettings] = useState([]);
  const [yearClose, setYearClose] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, formsRes, settingsRes, yearCloseRes] = await Promise.all([
        apiClient.get(`/api/payroll/dashboard/statutory/summary/${month}/${year}`),
        apiClient.get(`/api/payroll/statutory-forms?financialYear=${year}&formType=EA`),
        apiClient.get(`/api/payroll/settings?taxYear=${year}`),
        apiClient.post(`/api/payroll/statutory-forms/year-close/${year}`)
      ]);
      setData(summaryRes.data.data || null);
      setForms(formsRes.data.data || []);
      setSettings(settingsRes.data.data || []);
      setYearClose(yearCloseRes.data.data || null);
      setError('');
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load statutory summary');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  const generateEAForms = async () => {
    try {
      await apiClient.post(`/api/payroll/statutory-forms/generate-ea/${year}`);
      fetchSummary();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to generate EA forms');
    }
  };

  const generateMonthlyBatch = async () => {
    try {
      await apiClient.post(`/api/payroll/statutory-forms/generate-monthly/${month}/${year}`);
      fetchSummary();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to generate monthly statutory batch');
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const rows = [
    { label: 'EPF (Employee)', key: 'epfEmployee' },
    { label: 'EPF (Employer)', key: 'epfEmployer' },
    { label: 'SOCSO (Employee)', key: 'socsoEmployee' },
    { label: 'SOCSO (Employer)', key: 'socsoEmployer' },
    { label: 'EIS (Employee)', key: 'eisEmployee' },
    { label: 'EIS (Employer)', key: 'eisEmployer' },
    { label: 'PCB / Income Tax', key: 'pcb' },
    { label: 'HRDF', key: 'hrdf' }
  ];

  return (
    <>
      <Head>
        <title>Payroll Statutory Contributions</title>
      </Head>
      <DashboardLayout title="Payroll › Statutory Contributions">
        <div className="max-w-5xl mx-auto p-2 md:p-4 space-y-4">
          <PayrollNavActions />
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-slate-900">Statutory Contributions</h1>
            <div className="flex items-center gap-2">
              <select value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10))} className="px-2 py-1.5 border border-slate-300 rounded text-sm">
                {MONTHS.map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}
              </select>
              <input value={year} onChange={(e) => setYear(parseInt(e.target.value || now.getFullYear(), 10))} className="w-24 px-2 py-1.5 border border-slate-300 rounded text-sm" type="number" />
              <button onClick={generateMonthlyBatch} className="px-3 py-1.5 border border-slate-300 rounded text-sm hover:bg-slate-50">Generate Monthly</button>
              <button onClick={generateEAForms} className="px-3 py-1.5 border border-slate-300 rounded text-sm hover:bg-slate-50">Generate EA</button>
            </div>
          </div>
          <p className="text-xs text-slate-500">Monthly payroll statutory totals in <strong>RM (MYR)</strong>. Payroll cycle is 25th current month to 24th next month.</p>

          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading statutory summary...</div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">{MONTHS[(month || 1) - 1]} {year}</span>
                  <span className="text-xs text-slate-500">Payslips: {data?.payslipCount || 0}</span>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Contribution Type</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.key} className="border-b border-slate-50">
                        <td className="px-4 py-2 text-slate-700">{row.label}</td>
                        <td className="px-4 py-2 text-right font-semibold text-slate-900">
                          RM {Number(data?.totals?.[row.key] || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Year Filing Readiness</h2>
              <span className={`text-xs font-semibold px-2 py-1 rounded ${yearClose?.status === 'READY_FOR_FILING' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {yearClose?.status || 'UNKNOWN'}
              </span>
            </div>
            <div className="px-4 py-3 text-xs text-slate-600 border-b border-slate-100">
              Monthly Forms: {yearClose?.monthlyForms || 0} | EA Forms: {yearClose?.eaForms || 0}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">EA Forms ({year})</h2>
            </div>
            {forms.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">No EA forms generated yet for this year.</div>
            ) : (
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Employee</th>
                      <th className="px-4 py-2 text-left">Due Date</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forms.map((f) => (
                      <tr key={f.id} className="border-b border-slate-50">
                        <td className="px-4 py-2">{f.employee?.employeeId} - {f.employee?.user?.firstName} {f.employee?.user?.lastName}</td>
                        <td className="px-4 py-2">{f.dueDate ? new Date(f.dueDate).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-2">{f.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Effective Statutory Rate Versions</h2>
            </div>
            {settings.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">No payroll settings versions found for this year.</div>
            ) : (
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Effective</th>
                      <th className="px-4 py-2 text-left">Category</th>
                      <th className="px-4 py-2 text-left">Residency</th>
                      <th className="px-4 py-2 text-right">EPF Emp %</th>
                      <th className="px-4 py-2 text-right">SOCSO Emp %</th>
                      <th className="px-4 py-2 text-right">EIS Emp %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.map((s) => (
                      <tr key={s.id} className="border-b border-slate-50">
                        <td className="px-4 py-2">{new Date(s.effectiveDate).toLocaleDateString()}</td>
                        <td className="px-4 py-2">{s.workerCategory}</td>
                        <td className="px-4 py-2">{s.residencyStatus || '-'}</td>
                        <td className="px-4 py-2 text-right">{Number(s.epfEmployeeRate || 0).toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">{Number(s.socsoEmployeeRate || 0).toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">{Number(s.eisEmployeeRate || 0).toFixed(2)}</td>
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

