'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import apiClient from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PayrollNavActions from '../../components/payroll/PayrollNavActions';

export default function PayrollAuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/payroll/dashboard/audit/logs?limit=200');
      setLogs(res.data.data || []);
      setError('');
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load payroll audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <>
      <Head>
        <title>Payroll Audit Logs</title>
      </Head>
      <DashboardLayout title="Payroll › Audit Logs">
        <div className="max-w-7xl mx-auto p-2 md:p-4 space-y-4">
          <PayrollNavActions />
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900">Payroll Audit Logs</h1>
            <button onClick={fetchLogs} className="text-sm px-3 py-1.5 border border-slate-300 rounded hover:bg-slate-50">Refresh</button>
          </div>
          <p className="text-xs text-slate-500">Enterprise audit trail for payroll operations (create/update/approve/reject/publish).</p>
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading audit logs...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No payroll audit logs found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Time</th>
                      <th className="px-4 py-2 text-left">Run</th>
                      <th className="px-4 py-2 text-left">Entity</th>
                      <th className="px-4 py-2 text-left">Action</th>
                      <th className="px-4 py-2 text-left">Reason</th>
                      <th className="px-4 py-2 text-left">Changed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-50">
                        <td className="px-4 py-2 text-slate-700">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-2 text-slate-800 font-medium">{log.payrollRun?.displayId || '-'}</td>
                        <td className="px-4 py-2 text-slate-700">{log.entityType}</td>
                        <td className="px-4 py-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{log.action}</span>
                        </td>
                        <td className="px-4 py-2 text-slate-600">{log.reason || '-'}</td>
                        <td className="px-4 py-2 text-slate-600">{log.changedBy || '-'}</td>
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

