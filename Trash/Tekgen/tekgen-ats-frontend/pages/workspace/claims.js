'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';
import {
  PlusCircle, DollarSign, Loader2, AlertCircle, CheckCircle,
} from 'lucide-react';

const CLAIM_TYPES = [
  { value: 'MEDICAL',       label: 'Medical'         },
  { value: 'TRANSPORT',     label: 'Transport'       },
  { value: 'MEAL',          label: 'Meal'            },
  { value: 'ACCOMMODATION', label: 'Accommodation'   },
  { value: 'PHONE',         label: 'Phone / Internet'},
  { value: 'OTHER',         label: 'Other'           },
];

const STATUS_BADGE = {
  SUBMITTED:    'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
  APPROVED:     'bg-green-100 text-green-700',
  REJECTED:     'bg-red-100 text-red-700',
  PAID:         'bg-teal-100 text-teal-700',
};

export default function MyClaims() {
  const [claims, setClaims]   = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]     = useState(null);

  const [form, setForm] = useState({
    claimType:   '',
    amount:      '',
    claimDate:   new Date().toISOString().split('T')[0],
    description: '',
  });

  const loadClaims = async () => {
    try {
      const res = await api.get('/api/my/claims?limit=30');
      setClaims(res.data.data.claims || []);
      setTotal(res.data.data.total || 0);
    } catch {
      setToast({ type: 'error', msg: 'Failed to load claims' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClaims(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.claimType || !form.amount || !form.claimDate) {
      setToast({ type: 'error', msg: 'Please fill in all required fields' });
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/my/claims', form);
      setToast({ type: 'success', msg: 'Claim submitted successfully!' });
      setShowForm(false);
      setForm({ claimType: '', amount: '', claimDate: new Date().toISOString().split('T')[0], description: '' });
      loadClaims();
    } catch (e) {
      setToast({ type: 'error', msg: e.response?.data?.message || 'Submission failed' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const totalPending = claims.filter(c => ['SUBMITTED', 'UNDER_REVIEW'].includes(c.status))
    .reduce((s, c) => s + c.amount, 0);

  return (
    <DashboardLayout title="My Workspace › My Claims">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">My Claims</h2>
            <p className="text-sm text-slate-500 mt-0.5">Submit &amp; track expense reimbursement requests</p>
          </div>
          <button onClick={() => setShowForm(p => !p)} className="btn-primary text-sm flex items-center gap-1.5">
            <PlusCircle size={14} /> New Claim
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg border ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
            {toast.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {toast.msg}
          </div>
        )}

        {/* Submit form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">New Claim Request</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Claim Type *</label>
                  <select
                    value={form.claimType}
                    onChange={e => setForm(p => ({ ...p, claimType: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none bg-white"
                    required
                  >
                    <option value="">— select —</option>
                    {CLAIM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Amount (MYR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.amount}
                    onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Claim Date *</label>
                  <input
                    type="date"
                    value={form.claimDate}
                    onChange={e => setForm(p => ({ ...p, claimDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
                    required
                  />
                </div>
                <div className="col-span-2 md:col-span-3">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Brief description of the expense"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost text-sm">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary text-sm flex items-center gap-2">
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : null}
                  {submitting ? 'Submitting…' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-8">
            <Loader2 size={16} className="animate-spin" /> Loading claims…
          </div>
        )}

        {!loading && (
          <>
            {/* Summary row */}
            {totalPending > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-amber-700">
                <DollarSign size={14} />
                <span>MYR <strong>{totalPending.toFixed(2)}</strong> in pending claims awaiting approval</span>
              </div>
            )}

            {/* Claims table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">Claims History</h3>
                <span className="text-xs text-slate-400">{total} claim(s)</span>
              </div>
              {claims.length === 0 ? (
                <div className="text-center py-10">
                  <DollarSign size={28} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No claims submitted yet</p>
                  <p className="text-xs text-slate-400 mt-1">Click "New Claim" to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                        <th className="px-4 py-2">Claim ID</th>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                        <th className="px-4 py-2">Status</th>
                        <th className="px-4 py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {claims.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{c.displayId || '—'}</td>
                          <td className="px-4 py-2.5 text-slate-700">{c.claimType.replace('_', ' ')}</td>
                          <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                            {new Date(c.claimDate).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                            MYR {parseFloat(c.amount).toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[c.status] || 'bg-slate-100 text-slate-600'}`}>
                              {c.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[200px] truncate">{c.description || '—'}</td>
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
