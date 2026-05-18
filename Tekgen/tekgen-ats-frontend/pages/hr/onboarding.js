'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Link from 'next/link';
import api from '../../lib/api';

export default function HROnboardingPage() {
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/hrms/onboarding?status=${status}&limit=300`);
      const list = res.data.data?.records || [];
      const q = search.trim().toLowerCase();
      const filtered = q
        ? list.filter((r) =>
            [r.employeeId, r.department, r.user?.firstName, r.user?.lastName, r.user?.email]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes(q)
          )
        : list;
      setRecords(filtered);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load onboarding tracker');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status, search]);

  const markComplete = async (id) => {
    try {
      await api.post(`/api/hrms/onboarding/${id}/complete`, {});
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to complete onboarding');
    }
  };

  return (
    <DashboardLayout title="HR › Onboarding">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Onboarding Tracker</h2>
            <p className="text-sm text-slate-500">Operational tracking for joiners and probation movement</p>
          </div>
          <select className="border rounded px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ALL">All</option>
            <option value="PROBATION">Probation</option>
            <option value="ACTIVE">Active</option>
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
            placeholder="Search employee"
          />
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">Loading onboarding records...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left">Employee</th>
                  <th className="px-4 py-3 text-left">Employee ID</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Join Date</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">{r.user?.firstName} {r.user?.lastName}</td>
                    <td className="px-4 py-3">{r.employeeId}</td>
                    <td className="px-4 py-3">{r.department || '-'}</td>
                    <td className="px-4 py-3">{r.joinDate ? new Date(r.joinDate).toISOString().split('T')[0] : '-'}</td>
                    <td className="px-4 py-3">{r.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/hr/employees/${r.id}`} className="text-blue-600 hover:underline text-xs">View</Link>
                        <Link href={`/hr/employees/${r.id}`} className="text-slate-600 hover:underline text-xs">Edit</Link>
                        <button
                          onClick={() => markComplete(r.id)}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs disabled:opacity-50"
                          disabled={r.status !== 'PROBATION'}
                        >
                          Mark Complete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>No onboarding records found</td>
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
