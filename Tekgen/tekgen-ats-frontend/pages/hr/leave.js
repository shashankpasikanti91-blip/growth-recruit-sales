'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';
import { CalendarCheck, Loader2 } from 'lucide-react';

export default function HRLeavePage() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLeaves();
  }, []);

  const loadLeaves = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/hrms/leaves/pending?limit=100');
      setLeaves(res.data.data?.leaves || []);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="HR › Leave Management">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Leave Management</h2>
            <p className="text-sm text-slate-500 mt-0.5">Leave requests · Approvals · Balances</p>
          </div>
          <button className="btn-ghost text-sm" onClick={loadLeaves}>Refresh</button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Pending</p>
            <p className="text-2xl font-bold text-amber-600">{leaves.length}</p>
            <p className="text-xs text-slate-400">Requests</p>
          </div>
          <div className="stat-card">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Department Managers</p>
            <p className="text-2xl font-bold text-blue-600">L1</p>
            <p className="text-xs text-slate-400">First Approval</p>
          </div>
          <div className="stat-card">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Assistant MD / MD</p>
            <p className="text-2xl font-bold text-purple-600">L2</p>
            <p className="text-xs text-slate-400">Final Approval</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading leave requests...
            </div>
          ) : leaves.length === 0 ? (
            <div className="py-16 text-center">
              <CalendarCheck size={28} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No pending leave requests</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left">Leave ID</th>
                  <th className="px-4 py-3 text-left">Employee</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Dates</th>
                  <th className="px-4 py-3 text-left">Policy Warnings</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">{l.displayId || '-'}</td>
                    <td className="px-4 py-3">{l.employee?.user?.firstName} {l.employee?.user?.lastName}</td>
                    <td className="px-4 py-3">{l.employee?.department || '-'}</td>
                    <td className="px-4 py-3">{l.leaveType}</td>
                    <td className="px-4 py-3">{new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {Array.isArray(l.policyWarnings) && l.policyWarnings.length > 0 ? (
                        <div className="space-y-1">
                          {l.policyWarnings.slice(0, 2).map((w, idx) => (
                            <div key={idx} className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              {w}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-emerald-600">No warning</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{l.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
