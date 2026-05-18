'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import apiClient from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PayrollNavActions from '../../components/payroll/PayrollNavActions';

export default function PayrollBankPage() {
  const templates = ['STANDARD', 'MAYBANK', 'CIMB'];
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [template, setTemplate] = useState('STANDARD');
  const [bankData, setBankData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/api/payroll/runs?limit=50');
        const list = res.data.data || [];
        setRuns(list);
        const first = list.find((r) => ['GENERATED', 'PUBLISHED', 'CLOSED'].includes(r.status));
        if (first) setSelectedRunId(first.id);
      } catch (e) {
        setError('Failed to load payroll runs');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedRunId) return;
    (async () => {
      try {
        const res = await apiClient.get(`/api/payroll/runs/${selectedRunId}/bank-file?template=${template}`);
        setBankData(res.data.data || null);
        setError('');
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to load bank transfer file');
      }
    })();
  }, [selectedRunId, template]);

  const downloadFile = () => {
    if (!selectedRunId) return;
    window.open(`/api/payroll/runs/${selectedRunId}/bank-file?download=true&template=${template}`, '_blank');
  };

  return (
    <>
      <Head><title>Payroll Bank Transfer</title></Head>
      <DashboardLayout title="Payroll › Bank Transfer File">
        <div className="max-w-6xl mx-auto p-2 md:p-4 space-y-4">
          <PayrollNavActions />
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900">Bank Transfer File</h1>
            <button onClick={downloadFile} disabled={!selectedRunId} className="px-3 py-1.5 border border-slate-300 rounded text-sm hover:bg-slate-50 disabled:opacity-50">Download CSV</button>
          </div>
          <p className="text-xs text-slate-500">Preview salary disbursement rows and export bank file for payout execution.</p>

          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>}

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <label className="text-xs font-semibold text-slate-600">Payroll Run</label>
            <select value={selectedRunId} onChange={(e) => setSelectedRunId(e.target.value)} className="mt-1 w-full border border-slate-300 rounded px-2 py-2 text-sm">
              <option value="">Select run</option>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>{r.displayId} - {r.month}/{r.year} - {r.status}</option>
              ))}
            </select>
            <label className="mt-3 block text-xs font-semibold text-slate-600">Bank Template</label>
            <select value={template} onChange={(e) => setTemplate(e.target.value)} className="mt-1 w-full border border-slate-300 rounded px-2 py-2 text-sm">
              {templates.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-6 text-sm text-slate-500">Loading...</div>
            ) : !bankData?.rows?.length ? (
              <div className="p-6 text-sm text-slate-500">No bank transfer rows available for selected run.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Employee</th>
                      <th className="px-4 py-2 text-left">Bank</th>
                      <th className="px-4 py-2 text-left">Account</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bankData.rows.map((r, idx) => (
                      <tr key={`${r.employeeId}-${idx}`} className="border-b border-slate-50">
                        <td className="px-4 py-2">{r.employeeId} - {r.employeeName}</td>
                        <td className="px-4 py-2">{r.bankName || '-'}</td>
                        <td className="px-4 py-2">{r.bankAccountNo || '-'}</td>
                        <td className="px-4 py-2 text-right font-semibold">RM {Number(r.amount || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</td>
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

