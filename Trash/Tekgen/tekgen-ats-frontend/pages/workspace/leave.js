'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';
import {
  CalendarCheck, PlusCircle, XCircle,
  Loader2, AlertCircle, CheckCircle, ChevronDown,
} from 'lucide-react';

const LEAVE_TYPES = [
  { value: 'ANNUAL',          label: 'Annual Leave'           },
  { value: 'MEDICAL',         label: 'Medical Leave'          },
  { value: 'HOSPITALIZATION', label: 'Hospitalisation Leave'  },
  { value: 'COMPASSIONATE',   label: 'Compassionate Leave'    },
  { value: 'REPLACEMENT',     label: 'Replacement Leave'      },
  { value: 'NO_PAY',          label: 'No-Pay Leave'           },
];

const STATUS_BADGE = {
  SUBMITTED:        'bg-blue-100 text-blue-700',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  APPROVED:         'bg-green-100 text-green-700',
  REJECTED:         'bg-red-100 text-red-700',
  CANCELLED:        'bg-slate-100 text-slate-500',
};

export default function MyLeave() {
  const [balances, setBalances]   = useState([]);
  const [requests, setRequests]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [applying, setApplying]   = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [toast, setToast]         = useState(null);
  const [cancelId, setCancelId]   = useState(null);

  const [form, setForm] = useState({
    leaveType: '',
    startDate: '',
    endDate:   '',
    session:   'FULL_DAY',
    reason:    '',
  });

  const year = new Date().getFullYear();

  const loadData = async () => {
    try {
      const [balRes, reqRes] = await Promise.all([
        api.get(`/api/my/leave/balance?year=${year}`),
        api.get('/api/my/leave?limit=30'),
      ]);
      setBalances(balRes.data.data.balances || []);
      setRequests(reqRes.data.data.requests || []);
      setTotal(reqRes.data.data.total || 0);
    } catch {
      setToast({ type: 'error', msg: 'Failed to load leave data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!form.leaveType || !form.startDate || !form.endDate) {
      setToast({ type: 'error', msg: 'Please fill in all required fields' });
      return;
    }
    setApplying(true);
    try {
      const res = await api.post('/api/my/leave', form);
      const warning = res.data.data?.warning;
      setToast({ type: 'success', msg: warning || 'Leave request submitted!' });
      setShowForm(false);
      setForm({ leaveType: '', startDate: '', endDate: '', session: 'FULL_DAY', reason: '' });
      loadData();
    } catch (e) {
      setToast({ type: 'error', msg: e.response?.data?.message || 'Submission failed' });
    } finally {
      setApplying(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleCancel = async (id) => {
    setCancelId(id);
    try {
      await api.put(`/api/my/leave/${id}/cancel`);
      setToast({ type: 'success', msg: 'Leave request cancelled' });
      loadData();
    } catch (e) {
      setToast({ type: 'error', msg: e.response?.data?.message || 'Cancel failed' });
    } finally {
      setCancelId(null);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <DashboardLayout title="My Workspace › My Leave">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">My Leave</h2>
            <p className="text-sm text-slate-500 mt-0.5">Leave balance · Apply · Request history</p>
          </div>
          <button onClick={() => setShowForm(p => !p)} className="btn-primary text-sm flex items-center gap-1.5">
            <PlusCircle size={14} /> Apply Leave
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg border ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
            {toast.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {toast.msg}
          </div>
        )}

        {/* Apply form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">New Leave Request</h3>
            <form onSubmit={handleApply} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Leave Type *</label>
                  <select
                    value={form.leaveType}
                    onChange={e => setForm(p => ({ ...p, leaveType: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none bg-white"
                    required
                  >
                    <option value="">— select —</option>
                    {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">End Date *</label>
                  <input
                    type="date"
                    value={form.endDate}
                    min={form.startDate}
                    onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Session</label>
                  <select
                    value={form.session}
                    onChange={e => setForm(p => ({ ...p, session: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none bg-white"
                  >
                    <option value="FULL_DAY">Full Day</option>
                    <option value="MORNING">Morning (AM)</option>
                    <option value="AFTERNOON">Afternoon (PM)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Reason</label>
                  <input
                    type="text"
                    value={form.reason}
                    onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                    placeholder="Optional reason"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost text-sm">Cancel</button>
                <button type="submit" disabled={applying} className="btn-primary text-sm flex items-center gap-2">
                  {applying ? <Loader2 size={13} className="animate-spin" /> : null}
                  {applying ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-8">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        )}

        {!loading && (
          <>
            {/* Leave balance cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {balances.map(b => {
                const remaining = Math.max(0, b.entitlement + b.carryForward - b.taken - b.pendingApproval);
                const pct = b.entitlement > 0 ? Math.min(100, Math.round(remaining / b.entitlement * 100)) : 0;
                return (
                  <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      {b.leaveType.replace('_', ' ')}
                    </p>
                    <p className="text-2xl font-bold text-slate-800">{remaining}</p>
                    <p className="text-xs text-slate-400 mt-0.5">of {b.entitlement} days</p>
                    <div className="h-1 bg-slate-100 rounded-full mt-2">
                      <div className="h-1 bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    {b.pendingApproval > 0 && (
                      <p className="text-[10px] text-yellow-600 mt-1">{b.pendingApproval} pending</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Request history */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">Leave History</h3>
                <span className="text-xs text-slate-400">{total} request(s)</span>
              </div>
              {requests.length === 0 ? (
                <div className="text-center py-10">
                  <CalendarCheck size={28} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No leave requests yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                        <th className="px-4 py-2">ID</th>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2">Dates</th>
                        <th className="px-4 py-2 text-center">Days</th>
                        <th className="px-4 py-2">Status</th>
                        <th className="px-4 py-2">Reason</th>
                        <th className="px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {requests.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{r.displayId || '—'}</td>
                          <td className="px-4 py-2.5 text-slate-700">{r.leaveType.replace('_', ' ')}</td>
                          <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                            {new Date(r.startDate).toLocaleDateString('en-MY', { day: '2-digit', month: 'short' })}
                            {r.startDate !== r.endDate && ` – ${new Date(r.endDate).toLocaleDateString('en-MY', { day: '2-digit', month: 'short' })}`}
                          </td>
                          <td className="px-4 py-2.5 text-center font-semibold text-slate-700">{r.daysCount}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status] || 'bg-slate-100 text-slate-600'}`}>
                              {r.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[160px] truncate">{r.reason || '—'}</td>
                          <td className="px-4 py-2.5">
                            {['SUBMITTED', 'PENDING_APPROVAL'].includes(r.status) && (
                              <button
                                onClick={() => handleCancel(r.id)}
                                disabled={cancelId === r.id}
                                className="text-red-500 hover:text-red-700 transition-colors"
                                title="Cancel request"
                              >
                                {cancelId === r.id
                                  ? <Loader2 size={13} className="animate-spin" />
                                  : <XCircle size={14} />}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
