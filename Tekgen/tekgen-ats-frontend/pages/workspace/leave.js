'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import FileUpload from '../../components/FileUpload';
import api from '../../lib/api';
import {
  CalendarCheck, PlusCircle, XCircle,
  Loader2, AlertCircle, CheckCircle, ChevronRight, Grid3x3, List, Download, FileText,
} from 'lucide-react';

const LEAVE_CONFIG = {
  ANNUAL:          { label: 'Annual Leave',          icon: '☀️', color: 'from-emerald-400 to-green-600' },
  MEDICAL:         { label: 'Medical Leave',          icon: '⚕️', color: 'from-purple-400 to-violet-600' },
  HOSPITALIZATION: { label: 'Hospitalization Leave',  icon: '🏥', color: 'from-red-400 to-rose-600' },
  COMPASSIONATE:   { label: 'Compassionate Leave',    icon: '💙', color: 'from-blue-400 to-indigo-600' },
  REPLACEMENT:     { label: 'Replacement Leave',      icon: '🔄', color: 'from-amber-400 to-orange-500' },
  NO_PAY:          { label: 'No Pay Leave',           icon: '📋', color: 'from-slate-400 to-slate-600' },
};

const STATUS_BADGE = {
  SUBMITTED:        'bg-blue-100 text-blue-700',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  APPROVED:         'bg-green-100 text-green-700',
  REJECTED:         'bg-red-100 text-red-700',
  CANCELLED:        'bg-slate-100 text-slate-500',
};

export default function MyLeave() {
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [applying, setApplying] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast]       = useState(null);
  const [cancelId, setCancelId] = useState(null);
  const [view, setView]         = useState('grid');
  const [attachments, setAttachments] = useState([]);

  const [form, setForm] = useState({
    leaveType: '', startDate: '', endDate: '', session: 'FULL_DAY', reason: '',
  });

  const year = new Date().getFullYear();

  const loadData = async () => {
    try {
      const [balRes, reqRes] = await Promise.all([
        api.get(`/api/my/leave/balance?year=${year}`),
        api.get('/api/my/leave'),
      ]);
      setBalances(balRes.data.data?.balances || []);
      setRequests(reqRes.data.data?.leaves || []);
      setTotal(reqRes.data.data?.total || 0);
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
      const formData = new FormData();
      formData.append('leaveType', form.leaveType);
      formData.append('startDate', form.startDate);
      formData.append('endDate', form.endDate);
      formData.append('session', form.session);
      formData.append('reason', form.reason);
      
      if (attachments.length > 0) {
        attachments.forEach((file) => formData.append('attachments', file));
      }
      
      const res = await api.post('/api/my/leave', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const warning = res.data.data?.warning;
      setToast({ type: 'success', msg: warning || 'Leave request submitted!' });
      setShowForm(false);
      setForm({ leaveType: '', startDate: '', endDate: '', session: 'FULL_DAY', reason: '' });
      setAttachments([]);
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

  // Build display cards
  const leaveCards = Object.entries(LEAVE_CONFIG).map(([key, cfg]) => {
    const bal = balances.find(b => b.leaveType === key);
    const entitled  = bal ? (bal.entitlement + (bal.carryForward || 0)) : (key === 'ANNUAL' ? 11 : key === 'MEDICAL' ? 14 : key === 'HOSPITALIZATION' ? 60 : key === 'COMPASSIONATE' ? 3 : 0);
    const taken     = bal ? bal.taken : 0;
    const pending   = bal ? (bal.pendingApproval || 0) : 0;
    const remaining = Math.max(0, entitled - taken - pending);
    return { key, ...cfg, entitled, taken, remaining, pending };
  });

  return (
    <DashboardLayout title="My Workspace › My Leave">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">My Leave</h2>
            <p className="text-sm text-slate-500 mt-0.5">Leave balance · Apply · Request history</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
              <button onClick={() => setView('grid')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Grid3x3 size={14} /> Grid
              </button>
              <button onClick={() => setView('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <List size={14} /> List
              </button>
            </div>
            <button onClick={() => setShowForm(p => !p)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors">
              <PlusCircle size={16} /> Apply Leave
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg border ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
            {toast.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {toast.msg}
          </div>
        )}

        {/* Apply Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-800 mb-5">New Leave Request</h3>
            <form onSubmit={handleApply} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Leave Type *</label>
                  <select value={form.leaveType} onChange={e => setForm(p => ({ ...p, leaveType: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none bg-white" required>
                    <option value="">— select —</option>
                    {Object.entries(LEAVE_CONFIG).map(([k, c]) => <option key={k} value={k}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Start Date *</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">End Date *</label>
                  <input type="date" value={form.endDate} min={form.startDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Session</label>
                  <select value={form.session} onChange={e => setForm(p => ({ ...p, session: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none bg-white">
                    <option value="FULL_DAY">Full Day</option>
                    <option value="MORNING">Morning (AM)</option>
                    <option value="AFTERNOON">Afternoon (PM)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Reason</label>
                  <input type="text" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="Optional reason" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none" />
                </div>
              </div>

              {/* File Attachments */}
              <FileUpload
                value={attachments}
                onChange={setAttachments}
                maxFiles={3}
                accept={['image/*', '.pdf', '.doc', '.docx']}
              />

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => { setShowForm(false); setAttachments([]); }} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium">Cancel</button>
                <button type="submit" disabled={applying} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60">
                  {applying && <Loader2 size={13} className="animate-spin" />}
                  {applying ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-12 justify-center">
            <Loader2 size={20} className="animate-spin" /> Loading leave data…
          </div>
        )}

        {!loading && (
          <>
            {/* GRID VIEW */}
            {view === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {leaveCards.map(leave => (
                  <div key={leave.key} className={`relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all transform hover:scale-[1.02] cursor-pointer bg-gradient-to-br ${leave.color} group`}>
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-all rounded-2xl" />
                    <div className="relative p-6 text-white">
                      <div className="text-3xl mb-2 opacity-90">{leave.icon}</div>
                      <h3 className="text-xl font-bold">{leave.label}</h3>
                      <div className="grid grid-cols-3 gap-2 mt-5 mb-4 text-center">
                        <div>
                          <p className="text-white/60 text-[10px] font-semibold uppercase">Entitled</p>
                          <p className="text-2xl font-bold mt-0.5">{leave.entitled}</p>
                        </div>
                        <div>
                          <p className="text-white/60 text-[10px] font-semibold uppercase">Taken</p>
                          <p className="text-2xl font-bold mt-0.5">{leave.taken}</p>
                        </div>
                        <div>
                          <p className="text-white/60 text-[10px] font-semibold uppercase">Left</p>
                          <p className="text-2xl font-bold mt-0.5">{leave.remaining}</p>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-white/30 rounded-full mb-1">
                        <div className="h-1.5 bg-white rounded-full transition-all" style={{ width: `${leave.entitled > 0 ? Math.min(100, (leave.taken / leave.entitled) * 100) : 0}%` }} />
                      </div>
                      {leave.pending > 0 && <p className="text-white/70 text-xs mb-3">{leave.pending} pending approval</p>}
                      <button
                        onClick={() => { setForm(p => ({ ...p, leaveType: leave.key })); setShowForm(true); }}
                        className="mt-3 w-full flex items-center justify-center gap-2 bg-white/20 hover:bg-white/35 text-white font-bold py-2.5 rounded-xl transition-all text-sm"
                      >
                        APPLY <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* LIST VIEW */}
            {view === 'list' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Leave Type</th>
                        <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Entitled</th>
                        <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Taken</th>
                        <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Remaining</th>
                        <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Pending</th>
                        <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leaveCards.map(leave => (
                        <tr key={leave.key} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{leave.icon}</span>
                              <span className="font-semibold text-slate-800 text-sm">{leave.label}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center font-bold text-slate-700">{leave.entitled}</td>
                          <td className="px-5 py-4 text-center font-bold text-slate-700">{leave.taken}</td>
                          <td className="px-5 py-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">{leave.remaining}</span>
                          </td>
                          <td className="px-5 py-4 text-center font-bold text-amber-600">{leave.pending || '—'}</td>
                          <td className="px-5 py-4 text-right">
                            <button onClick={() => { setForm(p => ({ ...p, leaveType: leave.key })); setShowForm(true); }} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                              Apply
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Leave History */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Leave History</h3>
                <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{total} request(s)</span>
              </div>
              {requests.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarCheck size={36} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">No leave requests yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100 bg-slate-50">
                        <th className="px-5 py-3">ID</th>
                        <th className="px-5 py-3">Type</th>
                        <th className="px-5 py-3">Dates</th>
                        <th className="px-5 py-3 text-center">Days</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Reason</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {requests.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 font-mono text-xs text-slate-500">{r.displayId || '—'}</td>
                          <td className="px-5 py-3 text-slate-700 font-medium">
                            {LEAVE_CONFIG[r.leaveType]?.icon} {r.leaveType.replace('_', ' ')}
                          </td>
                          <td className="px-5 py-3 text-slate-600 whitespace-nowrap text-xs">
                            {new Date(r.startDate).toLocaleDateString('en-MY', { day: '2-digit', month: 'short' })}
                            {r.startDate !== r.endDate && ` – ${new Date(r.endDate).toLocaleDateString('en-MY', { day: '2-digit', month: 'short' })}`}
                          </td>
                          <td className="px-5 py-3 text-center font-bold text-slate-700">{r.daysCount}</td>
                          <td className="px-5 py-3">
                            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${STATUS_BADGE[r.status] || 'bg-slate-100 text-slate-600'}`}>
                              {r.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-400 max-w-[160px] truncate">{r.reason || '—'}</td>
                          <td className="px-5 py-3">
                            {['SUBMITTED', 'PENDING_APPROVAL'].includes(r.status) && (
                              <button onClick={() => handleCancel(r.id)} disabled={cancelId === r.id} className="text-red-400 hover:text-red-600 transition-colors" title="Cancel">
                                {cancelId === r.id ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={14} />}
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
