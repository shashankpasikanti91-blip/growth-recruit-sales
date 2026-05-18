'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import apiClient from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PayrollNavActions from '../../components/payroll/PayrollNavActions';
import { apiErrorMessage } from '../../lib/apiErrorMessage';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function PayrollApprovalsPage() {
  const router = useRouter();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState('');
  const [selectedApproval, setSelectedApproval] = useState(null);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/payroll/approvals');
      setApprovals(response.data.data || []);
      setError('');
    } catch (e) {
      setError(apiErrorMessage(e, 'Failed to load payroll approvals'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/auth/login');
      return;
    }
    fetchApprovals();
  }, []);

  const approveStep = async (approvalId) => {
    try {
      setProcessingId(approvalId);
      await apiClient.post(`/api/payroll/approvals/${approvalId}/approve`, { notes: 'Approved from payroll approvals panel' });
      await fetchApprovals();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to approve step');
    } finally {
      setProcessingId('');
    }
  };

  const rejectStep = async (approvalId) => {
    const reason = window.prompt('Rejection reason is required');
    if (!reason) return;
    try {
      setProcessingId(approvalId);
      await apiClient.post(`/api/payroll/approvals/${approvalId}/reject`, { rejectionReason: reason });
      await fetchApprovals();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to reject step');
    } finally {
      setProcessingId('');
    }
  };

  const viewDetails = async (approvalId) => {
    try {
      const response = await apiClient.get(`/api/payroll/approvals/${approvalId}`);
      setSelectedApproval(response.data.data || null);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load approval details');
    }
  };

  return (
    <>
      <Head>
        <title>Payroll Approvals - Tekgen Payroll</title>
      </Head>
      <DashboardLayout title="Payroll › Approvals">
      <div className="max-w-7xl mx-auto p-2 md:p-4 space-y-5">
        <PayrollNavActions />
        <p className="text-xs text-slate-500">Figures in <strong>RM (MYR)</strong>.</p>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Payroll Approvals</h1>
            <p className="text-sm text-slate-500">Role-based pending approval steps (Payroll Admin / Management)</p>
          </div>
          <button className="px-4 py-2 text-sm border rounded-lg" onClick={fetchApprovals}>Refresh</button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">Loading approvals...</div>
          ) : approvals.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No pending approvals for your role</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left">Run ID</th>
                  <th className="px-4 py-3 text-left">Period</th>
                  <th className="px-4 py-3 text-left">Step</th>
                  <th className="px-4 py-3 text-left">Required Role</th>
                  <th className="px-4 py-3 text-left">Run Status</th>
                  <th className="px-4 py-3 text-left">Gross Payroll</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-semibold">{a.payrollRun?.displayId || '-'}</td>
                    <td className="px-4 py-3">
                      {a.payrollRun?.month
                        ? `${MONTHS_SHORT[(a.payrollRun.month || 1) - 1]} ${a.payrollRun.year}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">{a.stepName || `Step ${a.step}`}</td>
                    <td className="px-4 py-3">{a.requiredRole}</td>
                    <td className="px-4 py-3">{a.payrollRun?.status}</td>
                    <td className="px-4 py-3">RM {Number(a.payrollRun?.grossPayroll || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button
                        onClick={() => viewDetails(a.id)}
                        className="px-2 py-1 bg-slate-600 text-white rounded text-xs"
                      >
                        View
                      </button>
                      <button
                        disabled={processingId === a.id}
                        onClick={() => approveStep(a.id)}
                        className="px-2 py-1 bg-emerald-600 text-white rounded text-xs disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        disabled={processingId === a.id}
                        onClick={() => rejectStep(a.id)}
                        className="px-2 py-1 bg-red-600 text-white rounded text-xs disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedApproval && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Approval Detail: {selectedApproval.payrollRun?.displayId}
              </h3>
              <button className="px-3 py-1 text-xs border rounded" onClick={() => setSelectedApproval(null)}>Close</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">Step:</span> {selectedApproval.stepName || selectedApproval.step}</div>
              <div><span className="text-slate-500">Required Role:</span> {selectedApproval.requiredRole}</div>
              <div><span className="text-slate-500">Run Status:</span> {selectedApproval.payrollRun?.status}</div>
              <div><span className="text-slate-500">Employees:</span> {selectedApproval.payrollRun?.totalEmployees || 0}</div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1">Exceptions</p>
              {Array.isArray(selectedApproval.payrollRun?.exceptions) && selectedApproval.payrollRun.exceptions.length > 0 ? (
                <ul className="text-xs text-slate-700 list-disc ml-5 space-y-1">
                  {selectedApproval.payrollRun.exceptions.slice(0, 8).map((ex, idx) => (
                    <li key={idx}>{ex.employeeId} - {ex.type}: {ex.message}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-emerald-700">No exceptions found</p>
              )}
            </div>
          </div>
        )}
      </div>
      </DashboardLayout>
    </>
  );
}
