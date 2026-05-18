import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import apiClient from '../../lib/api';
import styles from '@/styles/payroll.module.css';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PayrollNavActions from '../../components/payroll/PayrollNavActions';
import { apiErrorMessage } from '../../lib/apiErrorMessage';

const SalaryStructures = () => {
  const router = useRouter();
  const [structures, setStructures] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    basicSalary: '',
    payFrequency: 'MONTHLY',
    allowances: {},
    deductions: {},
    overtimeRate: '',
    effectiveFrom: '',
    effectiveUntil: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [structuresRes, employeesRes] = await Promise.all([
        apiClient.get('/api/payroll/salary-structures'),
        apiClient.get('/api/hrms/employees')
      ]);
      setStructures(structuresRes.data.data || []);
      setEmployees(employeesRes.data.data || []);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to fetch data'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddAllowance = () => {
    setFormData({
      ...formData,
      allowances: { ...formData.allowances, ['']: 0 }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiClient.put(`/api/payroll/salary-structures/${editingId}`, formData);
      } else {
        await apiClient.post('/api/payroll/salary-structures', formData);
      }
      fetchData();
      setShowForm(false);
      setFormData({
        employeeId: '',
        basicSalary: '',
        payFrequency: 'MONTHLY',
        allowances: {},
        deductions: {},
        overtimeRate: '',
        effectiveFrom: '',
        effectiveUntil: ''
      });
      setEditingId(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save salary structure');
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Payroll › Salary structures">
        <div className={styles.loading}>Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Salary Structures - Tekgen Payroll</title>
      </Head>
      <DashboardLayout title="Payroll › Salary structures">
        <PayrollNavActions />
        <p className="text-xs text-slate-600 mb-3">
          <strong>Malaysia (MYR):</strong> amounts are in <strong>RM</strong>. Choose <em>Monthly</em> for a monthly basic salary, or <em>Daily</em> when basic is the rate per working day (payroll validation multiplies by weekdays in that month).
        </p>
        <div className={styles.container}>
        <div className={styles.header}>
          <h1>Salary Structures</h1>
          <button
            className={styles.createBtn}
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData({
                employeeId: '',
                basicSalary: '',
                payFrequency: 'MONTHLY',
                allowances: {},
                deductions: {},
                overtimeRate: '',
                effectiveFrom: '',
                effectiveUntil: ''
              });
            }}
          >
            + New Structure
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {showForm && (
          <div className={styles.formContainer}>
            <h2>{editingId ? 'Edit' : 'Create'} Salary Structure</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Employee *</label>
                <select
                  value={formData.employeeId}
                  onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employeeId} - {emp.user?.firstName} {emp.user?.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Pay frequency *</label>
                <select
                  value={formData.payFrequency || 'MONTHLY'}
                  onChange={e => setFormData({ ...formData, payFrequency: e.target.value })}
                >
                  <option value="MONTHLY">Monthly — basic salary is total RM per month</option>
                  <option value="DAILY">Daily — basic salary is RM per working day</option>
                </select>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Basic salary (RM) *</label>
                  <input
                    type="number"
                    value={formData.basicSalary}
                    onChange={e => setFormData({ ...formData, basicSalary: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    required
                    step="0.01"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Overtime rate (RM)</label>
                  <input
                    type="number"
                    value={formData.overtimeRate}
                    onChange={e => setFormData({ ...formData, overtimeRate: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    step="0.01"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Effective From *</label>
                <input
                  type="date"
                  value={formData.effectiveFrom}
                  onChange={e => setFormData({ ...formData, effectiveFrom: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Effective Until</label>
                <input
                  type="date"
                  value={formData.effectiveUntil}
                  onChange={e => setFormData({ ...formData, effectiveUntil: e.target.value })}
                />
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.submitBtn}>Save</button>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className={styles.table}>
          <table>
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Employee Name</th>
                <th>Basic (RM)</th>
                <th>Frequency</th>
                <th>Effective From</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {structures.map(structure => (
                <tr key={structure.id}>
                  <td>{structure.employee?.employeeId}</td>
                  <td>{structure.employee?.user?.firstName} {structure.employee?.user?.lastName}</td>
                  <td>RM {Number(structure.basicSalary || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</td>
                  <td>{structure.payFrequency === 'DAILY' ? 'Daily' : 'Monthly'}</td>
                  <td>{new Date(structure.effectiveFrom).toLocaleDateString()}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[structure.status?.toLowerCase()]}`}>
                      {structure.status}
                    </span>
                  </td>
                  <td>
                    {structure.status === 'DRAFT' && (
                      <>
                        <button
                          className={styles.linkBtn}
                          onClick={() => {
                            setEditingId(structure.id);
                            setFormData({
                              ...structure,
                              payFrequency: structure.payFrequency || 'MONTHLY',
                              effectiveFrom: structure.effectiveFrom?.split('T')[0],
                              effectiveUntil: structure.effectiveUntil?.split('T')[0] || '',
                            });
                            setShowForm(true);
                          }}
                        >
                          Edit
                        </button>
                      </>
                    )}
                    {structure.status === 'DRAFT' && (
                      <button
                        className={styles.approveBtn}
                        onClick={async () => {
                          try {
                            await apiClient.put(`/api/payroll/salary-structures/${structure.id}/approve`);
                            fetchData();
                          } catch (err) {
                            setError(err.response?.data?.message);
                          }
                        }}
                      >
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      </DashboardLayout>
    </>
  );
};

export default SalaryStructures;
