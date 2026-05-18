'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';
import {
  Building2, Plus, Search, RefreshCw, X, ChevronLeft, ChevronRight,
  AlertCircle, Globe, Phone, Mail, MapPin, Users, Pencil, Eye,
} from 'lucide-react';

const PAGE_LIMIT = 30;

function CreateClientModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', industry: '', contactName: '', contactEmail: '', contactPhone: '',
    website: '', address: '', country: '', notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Client name is required.');
    setLoading(true);
    setError('');
    try {
      await api.post('/api/clients', form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create client.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Building2 size={16} className="text-teal-600" /> New Client
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle size={13} /> {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Company Name *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Acme Corp"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Industry</label>
              <input
                value={form.industry}
                onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                placeholder="e.g. Technology"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Country</label>
              <input
                value={form.country}
                onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                placeholder="e.g. Malaysia"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Contact Name</label>
              <input
                value={form.contactName}
                onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                placeholder="Hiring Manager"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Contact Email</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                placeholder="hr@company.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Contact Phone</label>
              <input
                value={form.contactPhone}
                onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))}
                placeholder="+60 12 345 6789"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Website</label>
              <input
                value={form.website}
                onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                placeholder="https://company.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Any notes about this client..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Create Client'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreate, setShowCreate] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/clients', {
        params: { search: search || undefined, page, limit: PAGE_LIMIT },
      });
      const d = res.data.data;
      setClients(Array.isArray(d) ? d : (d.clients || []));
      setTotal(d.total || (Array.isArray(d) ? d.length : 0));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load clients.');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const totalPages = Math.ceil(total / PAGE_LIMIT) || 1;

  return (
    <DashboardLayout>
      {showCreate && (
        <CreateClientModal
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); fetchClients(); }}
        />
      )}

      <div className="flex flex-col h-full" style={{ minWidth: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
          <div>
            <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 size={15} className="text-teal-600" /> Clients
            </h1>
            <p className="text-xs text-slate-500">{total} total</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchClients} className="p-1.5 text-slate-400 hover:text-slate-600 rounded" title="Refresh">
              <RefreshCw size={13} />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
            >
              <Plus size={13} /> New Client
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-100 flex-shrink-0">
          <form
            onSubmit={e => { e.preventDefault(); setSearch(searchInput); setPage(1); }}
            className="flex items-center gap-1"
          >
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, industry…"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="pl-7 pr-7 py-1.5 border border-slate-200 rounded text-xs w-56 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              {searchInput && (
                <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={12} />
                </button>
              )}
            </div>
            <button type="submit" className="flex items-center justify-center w-7 h-7 bg-teal-600 text-white rounded text-xs">
              <Search size={12} />
            </button>
          </form>
          <span className="ml-auto text-xs text-slate-400">
            {total > 0 && `${(page - 1) * PAGE_LIMIT + 1}–${Math.min(page * PAGE_LIMIT, total)} of ${total}`}
          </span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-60 gap-3">
              <p className="text-red-500 text-sm">{error}</p>
              <button onClick={fetchClients} className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 font-medium">
                <RefreshCw size={13} /> Retry
              </button>
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 gap-3">
              <Building2 size={36} className="text-slate-200" />
              <p className="text-slate-500 text-sm">No clients yet.</p>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 bg-teal-600 text-white text-xs font-semibold px-4 py-2 rounded-lg"
              >
                <Plus size={13} /> Create First Client
              </button>
            </div>
          ) : (
            <table className="ats-table w-full">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th style={{ width: 105 }}>Client ID</th>
                  <th style={{ minWidth: 180 }}>Company</th>
                  <th style={{ width: 120 }}>Industry</th>
                  <th style={{ width: 130 }}>Contact</th>
                  <th style={{ width: 160 }}>Email</th>
                  <th style={{ width: 115 }}>Phone</th>
                  <th style={{ width: 90 }}>Country</th>
                  <th style={{ width: 65 }}>Jobs</th>
                  <th style={{ width: 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/clients/${c.id}`)}
                    className="border-b border-slate-100 hover:bg-teal-50/40 transition-colors cursor-pointer"
                  >
                    <td className="px-3 py-2">
                      <span className="font-mono text-[11px] text-teal-600">{c.displayId || '--'}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs font-medium text-slate-900 block max-w-[180px] truncate flex items-center gap-1">
                        <Building2 size={11} className="text-slate-400 flex-shrink-0" />
                        {c.name}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-slate-500 block max-w-[120px] truncate">{c.industry || '—'}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-slate-600 block max-w-[130px] truncate">{c.contactName || '—'}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-slate-500 block max-w-[160px] truncate">{c.contactEmail || '—'}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-slate-500 block max-w-[115px] truncate">{c.contactPhone || '—'}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-slate-500">{c.country || '—'}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-xs text-slate-600 font-medium">{c._count?.jobs ?? c.jobs?.length ?? '—'}</span>
                    </td>
                    <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => router.push(`/clients/${c.id}`)}
                        className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-white border-t border-slate-200 flex-shrink-0">
            <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
