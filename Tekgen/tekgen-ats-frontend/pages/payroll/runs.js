import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import apiClient from '../../lib/api';
import styles from '@/styles/payroll.module.css';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PayrollNavActions from '../../components/payroll/PayrollNavActions';
import { apiErrorMessage } from '../../lib/apiErrorMessage';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PayrollRuns = () => {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    runType: 'MONTHLY',
    workerCategory: 'BOTH'
  });

  const fetchRuns = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (categoryFilter !== 'ALL') params.set('workerCategory', categoryFilter);
      const query = params.toString();
      const response = await apiClient.get(`/api/payroll/runs${query ? `?${query}` : ''}`);
      setRuns(response.data.data || []);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to fetch payroll runs'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const handleCreateRun = async (e) => {
    e.preventDefault();
    try {
      const response = await apiClient.post('/api/payroll/runs', formData);
      setToast({ type: 'success', msg: 'Payroll run created successfully.' });
      fetchRuns();
      setShowForm(false);
      setFormData({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        runType: 'MONTHLY',
        workerCategory: 'BOTH'
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create payroll run');
    }
  };

  const handleValidate = async (runId) => {
    try {
      const response = await apiClient.post(`/api/payroll/runs/${runId}/validate`);
      setToast({ type: 'success', msg: 'Payroll run validated.' });
      fetchRuns();
    } catch (err) {
      setError(err.response?.data?.message || 'Validation failed');
    }
  };

  const handleView = async (runId) => {
    try {
      setDetailLoading(true);
      const response = await apiClient.get(`/api/payroll/runs/${runId}`);
      setSelectedRun(response.data.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch payroll run details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleMoveToReview = async (runId) => {
    try {
      await apiClient.put(`/api/payroll/runs/${runId}/review`, { corrections: [] });
      setToast({ type: 'success', msg: 'Payroll run moved to review.' });
      fetchRuns();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to move payroll run to review');
    }
  };

  const handleApprovalAction = async (approvalId, action) => {
    try {
      if (action === 'approve') {
        await apiClient.post(`/api/payroll/approvals/${approvalId}/approve`, { notes: 'Approved from payroll runs detail' });
      } else {
        const reason = window.prompt('Rejection reason is required');
        if (!reason) return;
        await apiClient.post(`/api/payroll/approvals/${approvalId}/reject`, { rejectionReason: reason });
      }
      if (selectedRun?.id) {
        await handleView(selectedRun.id);
      }
      fetchRuns();
    } catch (err) {
      setError(err.response?.data?.message || 'Approval action failed');
    }
  };

  const handleGeneratePayslips = async (runId) => {
    try {
      await apiClient.post(`/api/payroll/runs/${runId}/generate-payslips`);
      setToast({ type: 'success', msg: 'Payslips generated.' });
      fetchRuns();
      if (selectedRun?.id === runId) await handleView(runId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate payslips');
    }
  };

  const handlePublishPayslips = async (runId) => {
    try {
      await apiClient.post(`/api/payroll/runs/${runId}/publish`);
      setToast({ type: 'success', msg: 'Payslips published to workspace.' });
      fetchRuns();
      if (selectedRun?.id === runId) await handleView(runId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish payslips');
    }
  };

  const handleDownloadBankFile = async (runId) => {
    try {
      window.open(`/api/payroll/runs/${runId}/bank-file?download=true`, '_blank');
    } catch (err) {
      setError('Failed to download bank file');
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Payroll › Runs">
        <div className={styles.loading}>Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Payroll Runs - Tekgen Payroll</title>
      </Head>
      <DashboardLayout title="Payroll › Runs">
        <PayrollNavActions />
        <p className="text-xs text-slate-500 mb-3">All amounts in <strong>RM (MYR)</strong>. Runs are by calendar month; daily-paid staff use a <strong>daily rate</strong> on the salary structure (converted by working days in that month).</p>
        <div className={styles.container}>
        <div className={styles.header}>
          <h1>Payroll Runs</h1>
          <button
            className={styles.createBtn}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : '+ New Payroll Run'}
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {toast && (
          <div className={`mb-4 p-3 rounded border ${toast.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            {toast.msg}
          </div>
        )}

        <div className={styles.formContainer}>
          <h2>Filters</h2>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="ALL">All</option>
                <option value="DRAFT">Draft</option>
                <option value="EXCEPTIONS">Exceptions</option>
                <option value="READY">Ready</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="FINANCE_REVIEW">Finance Review</option>
                <option value="APPROVED">Approved</option>
                <option value="GENERATED">Generated</option>
                <option value="PUBLISHED">Published</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Worker Category</label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="ALL">All</option>
                <option value="INTERNAL_STAFF">Internal Staff</option>
                <option value="DEPLOYED_STAFF">Deployed Staff</option>
                <option value="BOTH">Both</option>
              </select>
            </div>
          </div>
        </div>

        {showForm && (
          <div className={styles.formContainer}>
            <h2>Create New Payroll Run</h2>
            <form onSubmit={handleCreateRun} className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Month *</label>
                  <select
                    value={formData.month}
                    onChange={e => setFormData({ ...formData, month: parseInt(e.target.value) })}
                    required
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                      <option key={m} value={m}>
                        {new Date(2020, m - 1).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Year *</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    required
                    min="2020"
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Run Type</label>
                  <select
                    value={formData.runType}
                    onChange={e => setFormData({ ...formData, runType: e.target.value })}
                  >
                    <option value="MONTHLY">Monthly cycle (standard)</option>
                    <option value="DAILY">Daily-rate cycle (same month bucket; staff paid by day)</option>
                    <option value="BONUS">Bonus</option>
                    <option value="ADJUSTMENT">Adjustment</option>
                    <option value="FINAL_SETTLEMENT">Final Settlement</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Worker Category</label>
                  <select
                    value={formData.workerCategory}
                    onChange={e => setFormData({ ...formData, workerCategory: e.target.value })}
                  >
                    <option value="INTERNAL_STAFF">Internal Staff</option>
                    <option value="DEPLOYED_STAFF">Deployed Staff</option>
                    <option value="BOTH">Both</option>
                  </select>
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.submitBtn}>Create Payroll Run</button>
              </div>
            </form>
          </div>
        )}

        <div className={styles.table}>
          <table>
            <thead>
              <tr>
                <th>Run ID</th>
                <th>Period</th>
                <th>Type</th>
                <th>Employees</th>
                <th>Gross Payroll</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(run => (
                <tr key={run.id}>
                  <td>
                    <strong>{run.displayId}</strong>
                  </td>
                  <td>{MONTH_NAMES[(run.month || 1) - 1]} {run.year}</td>
                  <td>{run.runType}</td>
                  <td>{run.totalEmployees}</td>
                  <td>RM {Number(run.grossPayroll || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[run.status?.toLowerCase()]}`}>
                      {run.status}
                    </span>
                  </td>
                  <td>
                    <button className={styles.linkBtn} onClick={() => handleView(run.id)}>
                      View
                    </button>
                    {run.status === 'DRAFT' && (
                      <button
                        className={styles.actionBtn}
                        onClick={() => handleValidate(run.id)}
                      >
                        Validate
                      </button>
                    )}
                    {['READY', 'EXCEPTIONS'].includes(run.status) && (
                      <button
                        className={styles.actionBtn}
                        onClick={() => handleMoveToReview(run.id)}
                      >
                        Send Review
                      </button>
                    )}
                    {['UNDER_REVIEW', 'FINANCE_REVIEW', 'REVIEW'].includes(run.status) && (
                      <button className={styles.linkBtn} onClick={() => window.location.assign('/payroll/approvals')}>
                        Go Approvals
                      </button>
                    )}
                    {run.status === 'APPROVED' && (
                      <button className={styles.actionBtn} onClick={() => handleGeneratePayslips(run.id)}>
                        Generate Payslips
                      </button>
                    )}
                    {run.status === 'GENERATED' && (
                      <button className={styles.actionBtn} onClick={() => handlePublishPayslips(run.id)}>
                        Publish
                      </button>
                    )}
                    {['GENERATED', 'PUBLISHED', 'CLOSED'].includes(run.status) && (
                      <button className={styles.linkBtn} onClick={() => handleDownloadBankFile(run.id)}>
                        Bank File
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {detailLoading && <div className={styles.loading}>Loading run details...</div>}

        {selectedRun && (
          <div className={styles.formContainer}>
            <div className={styles.header}>
              <h2>Run Details: {selectedRun.displayId}</h2>
              <button className={styles.createBtn} onClick={() => setSelectedRun(null)}>Close</button>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}><label>Status</label><div>{selectedRun.status}</div></div>
              <div className={styles.formGroup}><label>Employees</label><div>{selectedRun.totalEmployees || 0}</div></div>
              <div className={styles.formGroup}><label>Gross Payroll</label><div>RM {Number(selectedRun.grossPayroll || 0).toFixed(2)}</div></div>
              <div className={styles.formGroup}><label>Deductions</label><div>RM {Number(selectedRun.totalDeductions || 0).toFixed(2)}</div></div>
            </div>
            <div className={styles.formActions}>
              {selectedRun.status === 'APPROVED' && (
                <button className={styles.submitBtn} onClick={() => handleGeneratePayslips(selectedRun.id)}>Generate Payslips</button>
              )}
              {selectedRun.status === 'GENERATED' && (
                <button className={styles.submitBtn} onClick={() => handlePublishPayslips(selectedRun.id)}>Publish Payslips</button>
              )}
              {['GENERATED', 'PUBLISHED', 'CLOSED'].includes(selectedRun.status) && (
                <button className={styles.linkBtn} onClick={() => handleDownloadBankFile(selectedRun.id)}>Download Bank File</button>
              )}
            </div>
            <div className={styles.formGroup}>
              <label>Pending Approvals</label>
              {Array.isArray(selectedRun.approvals) && selectedRun.approvals.filter((a) => a.status === 'PENDING').length > 0 ? (
                <div className={styles.approvalsList}>
                  {selectedRun.approvals
                    .filter((a) => a.status === 'PENDING')
                    .map((a) => (
                      <div key={a.id} className={styles.approvalItem}>
                        <div>
                          <strong>{a.stepName || `Step ${a.step}`}</strong>
                          <div>{a.requiredRole}</div>
                        </div>
                        <div>
                          <button className={styles.approveBtn} onClick={() => handleApprovalAction(a.id, 'approve')}>Approve</button>
                          <button className={styles.cancelBtn} onClick={() => handleApprovalAction(a.id, 'reject')}>Reject</button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div>No pending approvals</div>
              )}
            </div>
            <div className={styles.formGroup}>
              <label>Validation Exceptions</label>
              {Array.isArray(selectedRun.exceptions) && selectedRun.exceptions.length > 0 ? (
                <ul>
                  {selectedRun.exceptions.slice(0, 10).map((ex, idx) => (
                    <li key={idx}>{ex.employeeId} - {ex.type}: {ex.message}</li>
                  ))}
                </ul>
              ) : (
                <div>No exceptions</div>
              )}
            </div>
          </div>
        )}
        </div>
      </DashboardLayout>
    </>
  );
};

export default PayrollRuns;
