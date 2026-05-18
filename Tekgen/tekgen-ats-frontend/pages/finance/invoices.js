'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import apiClient from '../../lib/api';
import { FileText, PlusCircle, RefreshCw, X } from 'lucide-react';

function formatMYR(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(Number(n));
}

function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export default function FinanceInvoicesPage() {
  const [userRole, setUserRole] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    clientId: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    lineItems: [{ description: 'Professional services', quantity: 1, rate: 0 }],
  });

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/api/finance/invoices?limit=100');
      const payload = res.data?.data;
      setInvoices(payload?.invoices || []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load invoices');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/sales/clients?limit=200&page=1');
      const data = res.data?.data;
      setClients(data?.clients || []);
    } catch {
      setClients([]);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      setUserRole(u?.role || '');
    } catch {
      setUserRole('');
    }
  }, []);

  useEffect(() => {
    if (modalOpen) loadClients();
  }, [modalOpen, loadClients]);

  useEffect(() => {
    if (!form.dueDate && form.invoiceDate) {
      const d = new Date(form.invoiceDate);
      d.setDate(d.getDate() + 30);
      setForm((f) => ({ ...f, dueDate: d.toISOString().slice(0, 10) }));
    }
  }, [form.invoiceDate, form.dueDate]);

  const addLine = () => {
    setForm((f) => ({
      ...f,
      lineItems: [...f.lineItems, { description: '', quantity: 1, rate: 0 }],
    }));
  };

  const updateLine = (idx, field, value) => {
    setForm((f) => {
      const lineItems = f.lineItems.map((row, i) =>
        i === idx ? { ...row, [field]: field === 'description' ? value : parseFloat(value) || 0 } : row
      );
      return { ...f, lineItems };
    });
  };

  const removeLine = (idx) => {
    setForm((f) => ({
      ...f,
      lineItems: f.lineItems.length > 1 ? f.lineItems.filter((_, i) => i !== idx) : f.lineItems,
    }));
  };

  const submitInvoice = async (e) => {
    e.preventDefault();
    if (!form.clientId) {
      setError('Select a client');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiClient.post('/api/finance/invoices', {
        clientId: form.clientId,
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate,
        lineItems: form.lineItems.map((l) => ({
          description: l.description || 'Line',
          quantity: l.quantity,
          rate: l.rate,
          unit: 'ITEMS',
        })),
      });
      setModalOpen(false);
      setForm({
        clientId: '',
        invoiceDate: new Date().toISOString().slice(0, 10),
        dueDate: '',
        lineItems: [{ description: 'Professional services', quantity: 1, rate: 0 }],
      });
      await loadInvoices();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const reviewInvoice = async (invoiceId, action) => {
    try {
      if (action === 'approve') {
        await apiClient.put(`/api/finance/invoices/${invoiceId}/approve`);
      } else {
        const reason = window.prompt('Reason for rejection/cancellation');
        if (!reason) return;
        await apiClient.put(`/api/finance/invoices/${invoiceId}/reject`, { reason });
      }
      await loadInvoices();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update invoice status');
    }
  };

  return (
    <DashboardLayout title="Finance › Invoices">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Invoices</h2>
            <p className="text-sm text-slate-500 mt-0.5">Client invoices · balances · status</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-ghost text-sm" onClick={loadInvoices} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button type="button" className="btn-primary text-sm" onClick={() => setModalOpen(true)}>
              <PlusCircle size={14} /> New invoice
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-sm px-3 py-2">{error}</div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <div className="col-span-3">Invoice / Client</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-2">Due</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3 text-right">Balance</div>
          </div>
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500">Loading…</div>
          ) : invoices.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-center">
              <div>
                <FileText size={28} className="text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No invoices yet</p>
                <p className="text-xs text-slate-400 mt-1">Create an invoice to track collections</p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <li key={inv.id} className="px-4 py-3 grid grid-cols-12 gap-2 items-center text-sm">
                  <div className="col-span-3 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{inv.displayId || inv.id.slice(0, 8)}</p>
                    <p className="text-xs text-slate-500 truncate">{inv.client?.clientName || '—'}</p>
                  </div>
                  <div className="col-span-2 text-right tabular-nums">{formatMYR(inv.grandTotal)}</div>
                  <div className="col-span-2 text-slate-600">{formatDate(inv.dueDate)}</div>
                  <div className="col-span-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {inv.status || '—'}
                    </span>
                  </div>
                  <div className="col-span-3 text-right tabular-nums text-slate-700">{formatMYR(inv.balanceDue)}</div>
                  {['FINANCE_HEAD', 'ADMIN'].includes(userRole) && (
                    <div className="col-span-12 flex justify-end gap-2 pt-1">
                      {inv.status !== 'APPROVED' && inv.status !== 'CANCELLED' && (
                        <>
                          <button className="text-xs px-2 py-1 rounded bg-emerald-600 text-white" onClick={() => reviewInvoice(inv.id, 'approve')}>
                            Approve
                          </button>
                          <button className="text-xs px-2 py-1 rounded bg-rose-600 text-white" onClick={() => reviewInvoice(inv.id, 'reject')}>
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">New invoice</h3>
              <button type="button" className="p-1 rounded hover:bg-slate-100" onClick={() => setModalOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitInvoice} className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Client</label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 text-sm px-3 py-2"
                  value={form.clientId}
                  onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
                  required
                >
                  <option value="">Select client…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.clientName}
                    </option>
                  ))}
                </select>
                {clients.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">No clients loaded — ensure sales clients exist and your role can access /api/sales/clients.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-slate-600">Invoice date</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-slate-200 text-sm px-3 py-2"
                    value={form.invoiceDate}
                    onChange={(e) => setForm((f) => ({ ...f, invoiceDate: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Due date</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-slate-200 text-sm px-3 py-2"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-600">Line items</label>
                  <button type="button" className="text-xs text-brand-600 font-medium" onClick={addLine}>
                    + Add line
                  </button>
                </div>
                <div className="space-y-2">
                  {form.lineItems.map((line, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <input
                        className="flex-1 rounded-lg border border-slate-200 text-sm px-2 py-1.5"
                        placeholder="Description"
                        value={line.description}
                        onChange={(e) => updateLine(idx, 'description', e.target.value)}
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-16 rounded-lg border border-slate-200 text-sm px-2 py-1.5"
                        title="Qty"
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-24 rounded-lg border border-slate-200 text-sm px-2 py-1.5"
                        title="Rate MYR"
                        value={line.rate}
                        onChange={(e) => updateLine(idx, 'rate', e.target.value)}
                      />
                      {form.lineItems.length > 1 && (
                        <button type="button" className="text-xs text-rose-600 px-1" onClick={() => removeLine(idx)}>
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-ghost text-sm" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-sm" disabled={saving}>
                  {saving ? 'Saving…' : 'Create draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
