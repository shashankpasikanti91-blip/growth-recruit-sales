'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Link from 'next/link';
import api from '../../lib/api';
import {
  Building2, Plus, Search, Filter, MoreVertical, Edit2, Trash2,
  Loader2, AlertCircle, Globe, MapPin, Users, FileText,
} from 'lucide-react';

const STATUS_COLORS = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  PROSPECT: 'bg-blue-100 text-blue-700',
  INACTIVE: 'bg-slate-100 text-slate-600',
};

function ClientRow({ client, onDelete, onEdit }) {
  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="px-6 py-4">
        <Link href={`/sales/clients/${client.id}`} className="font-semibold text-slate-900 hover:text-brand-500">
          {client.clientName}
        </Link>
        {client.website && (
          <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
            <Globe size={12} /> {client.website}
          </div>
        )}
      </td>
      <td className="px-6 py-4">
        <div className="text-sm">
          <p className="text-slate-700">{client.industry || '—'}</p>
          {client.country && (
            <p className="text-xs text-slate-500">{client.country}</p>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1 text-sm text-slate-600">
          <Users size={14} /> {client._count?.jobs || 0} jobs
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1 text-sm text-slate-600">
          <FileText size={14} /> {client._count?.submissions || 0} subs
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[client.status] || STATUS_COLORS.ACTIVE}`}>
          {client.status}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <Link href={`/sales/clients/${client.id}`} className="p-1 text-slate-400 hover:text-brand-500 transition-colors">
            <Edit2 size={16} />
          </Link>
          <button onClick={() => onDelete(client.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function ClientsListPage() {
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClient, setNewClient] = useState({
    clientName: '',
    industry: '',
    country: '',
    website: '',
    status: 'ACTIVE',
  });
  const [creating, setCreating] = useState(false);

  const loadClients = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page,
        limit: 20,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
      });
      const res = await api.get(`/api/clients?${query}`);
      const data = res.data.data;
      setClients(data.clients || []);
      setTotal(data.total || 0);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [page, searchTerm, statusFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newClient.clientName) {
      alert('Client name is required');
      return;
    }
    setCreating(true);
    try {
      await api.post('/api/clients', newClient);
      setNewClient({
        clientName: '',
        industry: '',
        country: '',
        website: '',
        status: 'ACTIVE',
      });
      setShowCreateForm(false);
      loadClients();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create client');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (clientId) => {
    if (!confirm('Delete this client? This cannot be undone.')) return;
    try {
      await api.delete(`/api/clients/${clientId}`);
      loadClients();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete client');
    }
  };

  return (
    <DashboardLayout title="Sales › Clients">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Clients</h2>
            <p className="text-sm text-slate-500 mt-1">{total} total clients</p>
          </div>
          <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            New Client
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">New Client</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Client Name *</label>
                  <input
                    type="text"
                    value={newClient.clientName}
                    onChange={e => setNewClient({ ...newClient, clientName: e.target.value })}
                    placeholder="e.g., Tech Solutions Inc"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Industry</label>
                  <input
                    type="text"
                    value={newClient.industry}
                    onChange={e => setNewClient({ ...newClient, industry: e.target.value })}
                    placeholder="e.g., Technology"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={newClient.country}
                    onChange={e => setNewClient({ ...newClient, country: e.target.value })}
                    placeholder="e.g., Malaysia"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={newClient.website}
                    onChange={e => setNewClient({ ...newClient, website: e.target.value })}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={newClient.status}
                    onChange={e => setNewClient({ ...newClient, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none bg-white"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="PROSPECT">Prospect</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowCreateForm(false)} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="btn-primary flex items-center gap-2">
                  {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search clients…"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none bg-white"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PROSPECT">Prospect</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : clients.length > 0 ? (
          <>
            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700">Client Name</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700">Industry</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700">Jobs</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700">Submissions</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700">Status</th>
                    <th className="px-6 py-3 text-right font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map(client => (
                    <ClientRow key={client.id} client={client} onDelete={handleDelete} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {Math.ceil(total / 20) > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 rounded border border-slate-300 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <span className="text-sm text-slate-600">Page {page} of {Math.ceil(total / 20)}</span>
                <button
                  onClick={() => setPage(p => Math.min(Math.ceil(total / 20), p + 1))}
                  disabled={page >= Math.ceil(total / 20)}
                  className="px-3 py-1 rounded border border-slate-300 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200 text-slate-500">
            <Building2 size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No clients yet</p>
            <p className="text-xs">Create your first client to get started</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
