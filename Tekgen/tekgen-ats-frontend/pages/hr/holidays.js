'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';

export default function HRHolidaysPage() {
  const [holidays, setHolidays] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    holidayName: '',
    holidayDate: '',
    state: '',
    isNational: true,
  });

  useEffect(() => {
    load();
  }, [year]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/holidays?year=${year}`);
      setHolidays(res.data.data?.holidays || []);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

  const addHoliday = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/holidays', form);
      setForm({ holidayName: '', holidayDate: '', state: '', isNational: true });
      await load();
    } catch (e2) {
      setError(e2.response?.data?.message || 'Failed to create holiday');
    }
  };

  const removeHoliday = async (id) => {
    try {
      await api.delete(`/api/holidays/${id}`);
      await load();
    } catch (e3) {
      setError(e3.response?.data?.message || 'Failed to delete holiday');
    }
  };

  return (
    <DashboardLayout title="HR › Holidays">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Holiday Calendar</h2>
            <p className="text-sm text-slate-500">Malaysia national/state holiday management</p>
          </div>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} className="px-3 py-2 border border-slate-300 rounded text-sm">
            {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-700">{error}</div>}

        <form onSubmit={addHoliday} className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-4 gap-3">
          <input className="border rounded px-3 py-2 text-sm" placeholder="Holiday name" value={form.holidayName} onChange={(e) => setForm({ ...form, holidayName: e.target.value })} required />
          <input className="border rounded px-3 py-2 text-sm" type="date" value={form.holidayDate} onChange={(e) => setForm({ ...form, holidayDate: e.target.value })} required />
          <input className="border rounded px-3 py-2 text-sm" placeholder="State (optional)" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs text-slate-600 flex items-center gap-1">
              <input type="checkbox" checked={form.isNational} onChange={(e) => setForm({ ...form, isNational: e.target.checked })} />
              National
            </label>
            <button className="px-3 py-2 bg-blue-600 text-white rounded text-sm">Add</button>
          </div>
        </form>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">Loading holidays...</div>
          ) : holidays.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No holidays for selected year</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">State</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {holidays.map((h) => (
                  <tr key={h.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">{h.date}</td>
                    <td className="px-4 py-3">{h.name}</td>
                    <td className="px-4 py-3">{h.isNational ? 'NATIONAL' : 'STATE'}</td>
                    <td className="px-4 py-3">{h.state || '-'}</td>
                    <td className="px-4 py-3">
                      {String(h.id).startsWith('202') ? '-' : (
                        <button onClick={() => removeHoliday(h.id)} className="px-2 py-1 bg-red-600 text-white rounded text-xs">Delete</button>
                      )}
                    </td>
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
