'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';
import { ClipboardList, Loader2 } from 'lucide-react';

export default function HRAttendancePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [editing, setEditing] = useState({});

  useEffect(() => {
    loadSummary();
  }, [month, year]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/hrms/attendance/summary?month=${month}&year=${year}`);
      setData(res.data.data);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const saveStatus = async (row) => {
    try {
      const next = editing[row.id];
      if (!next || next === row.status) return;
      await api.post('/api/payroll/attendance', {
        employeeId: row.employeeId,
        date: row.date,
        status: next,
        reason: 'HR attendance correction',
      });
      await loadSummary();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update attendance status');
    }
  };

  return (
    <DashboardLayout title="HR › Attendance">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Attendance</h2>
          <div className="flex gap-2">
            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="px-3 py-2 border border-slate-300 rounded text-sm">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="px-3 py-2 border border-slate-300 rounded text-sm">
              {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <p className="text-sm text-slate-500 -mt-3">Daily attendance · Late arrivals · Exceptions</p>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm px-3 py-2">{error}</div>}

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 flex items-center justify-center py-16 text-center">
            <div className="text-sm text-slate-500 flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading attendance summary...</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-lg p-4"><p className="text-xs text-slate-500">Present</p><p className="text-xl font-bold text-emerald-600">{data?.summary?.present || 0}</p></div>
              <div className="bg-white border border-slate-200 rounded-lg p-4"><p className="text-xs text-slate-500">Absent</p><p className="text-xl font-bold text-red-600">{data?.summary?.absent || 0}</p></div>
              <div className="bg-white border border-slate-200 rounded-lg p-4"><p className="text-xs text-slate-500">Leave</p><p className="text-xl font-bold text-amber-600">{data?.summary?.leave || 0}</p></div>
              <div className="bg-white border border-slate-200 rounded-lg p-4"><p className="text-xs text-slate-500">Total Records</p><p className="text-xl font-bold text-slate-700">{data?.summary?.total || 0}</p></div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {(data?.records || []).length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">No attendance records found for this period</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Employee</th>
                      <th className="px-4 py-3 text-left">Employee ID</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.records || []).slice(0, 200).map((r) => (
                      <tr key={r.id} className="border-b border-slate-100">
                        <td className="px-4 py-3">{new Date(r.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">{r.employee?.user?.firstName} {r.employee?.user?.lastName}</td>
                        <td className="px-4 py-3">{r.employee?.employeeId}</td>
                        <td className="px-4 py-3">
                          <select
                            value={editing[r.id] || r.status}
                            onChange={(e) => setEditing((prev) => ({ ...prev, [r.id]: e.target.value }))}
                            className="px-2 py-1 border border-slate-300 rounded text-xs"
                          >
                            {['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'SICK', 'UNPAID_LEAVE', 'ON_DUTY'].map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => saveStatus(r)} className="px-2 py-1 bg-blue-600 text-white text-xs rounded">Save</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
