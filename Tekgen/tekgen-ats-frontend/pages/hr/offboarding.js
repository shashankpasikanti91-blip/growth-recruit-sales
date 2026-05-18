'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';

export default function HROffboardingPage() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [offboardingRes, activeRes] = await Promise.all([
        api.get('/api/hrms/offboarding'),
        api.get('/api/hrms/employees?status=ACTIVE&limit=200'),
      ]);
      setRecords(offboardingRes.data.data?.records || []);
      setEmployees(activeRes.data.data?.employees || []);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load offboarding tracker');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const initiate = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    try {
      await api.post(`/api/hrms/offboarding/${selectedEmployee}/initiate`, { reason });
      setSelectedEmployee('');
      setReason('');
      await load();
    } catch (e2) {
      setError(e2.response?.data?.message || 'Failed to initiate offboarding');
    }
  };

  const complete = async (id, finalStatus) => {
    try {
      await api.post(`/api/hrms/offboarding/${id}/complete`, { finalStatus });
      await load();
    } catch (e3) {
      setError(e3.response?.data?.message || 'Failed to complete offboarding');
    }
  };

  return (
    <DashboardLayout title="HR › Offboarding">
      <div className="max-w-7xl mx-auto space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Offboarding Tracker</h2>
          <p className="text-sm text-slate-500">Notice period, resignation, and termination lifecycle actions</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-700">{error}</div>}

        <form onSubmit={initiate} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-3">
          <select className="border rounded px-3 py-2 text-sm flex-1" value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} required>
            <option value="">Select active employee</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.user?.firstName} {emp.user?.lastName} ({emp.employeeId})
              </option>
            ))}
          </select>
          <input className="border rounded px-3 py-2 text-sm flex-1" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button className="px-4 py-2 bg-amber-600 text-white rounded text-sm">Initiate</button>
        </form>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">Loading offboarding records...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left">Employee</th>
                  <th className="px-4 py-3 text-left">Employee ID</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Current Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">{r.user?.firstName} {r.user?.lastName}</td>
                    <td className="px-4 py-3">{r.employeeId}</td>
                    <td className="px-4 py-3">{r.department || '-'}</td>
                    <td className="px-4 py-3">{r.status}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => complete(r.id, 'RESIGNED')} className="px-2 py-1 bg-blue-600 text-white rounded text-xs" disabled={r.status !== 'ON_NOTICE'}>
                        Complete as Resigned
                      </button>
                      <button onClick={() => complete(r.id, 'TERMINATED')} className="px-2 py-1 bg-red-600 text-white rounded text-xs" disabled={r.status !== 'ON_NOTICE'}>
                        Complete as Terminated
                      </button>
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>No offboarding records found</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
