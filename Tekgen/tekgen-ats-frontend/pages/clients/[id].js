'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';
import {
  ArrowLeft, Building2, Globe, Phone, Mail, MapPin, Users,
  Pencil, Save, X, AlertCircle, Briefcase, Calendar, RefreshCw,
  Trash2, ChevronRight,
} from 'lucide-react';

function InfoRow({ label, value, icon }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-1.5 text-gray-400 flex-shrink-0 w-32">
        {icon}
        <span className="text-xs font-semibold text-gray-500">{label}</span>
      </div>
      <span className="text-sm text-gray-800">{value || '—'}</span>
    </div>
  );
}

export default function ClientDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => { if (id) fetchClient(); }, [id]);

  const fetchClient = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/clients/${id}`);
      const c = res.data.data;
      setClient(c);
      setForm({
        name: c.name || '',
        industry: c.industry || '',
        contactName: c.contactName || '',
        contactEmail: c.contactEmail || '',
        contactPhone: c.contactPhone || '',
        website: c.website || '',
        address: c.address || '',
        country: c.country || '',
        notes: c.notes || '',
        isActive: c.isActive ?? true,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load client.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name?.trim()) return setSaveError('Client name is required.');
    setSaveLoading(true);
    setSaveError('');
    try {
      const res = await api.put(`/api/clients/${id}`, form);
      setClient(res.data.data);
      setEditing(false);
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete client "${client?.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/clients/${id}`);
      router.push('/clients');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete client.');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Back */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push('/clients')} className="flex items-center gap-2 text-teal-600 hover:text-teal-800 text-sm font-medium">
            <ArrowLeft size={16} /> Clients
          </button>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">{client?.name || 'Loading…'}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-lg">{error}</div>
        ) : client ? (
          <div className="space-y-5">

            {/* Header card */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center">
                    <Building2 size={26} className="text-teal-700" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span className="font-mono text-xs text-teal-600">{client.displayId}</span>
                      {client.industry && <span>{client.industry}</span>}
                      {client.country && <span className="flex items-center gap-1"><MapPin size={12} />{client.country}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {editing ? (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={saveLoading}
                        className="flex items-center gap-1.5 bg-teal-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-60"
                      >
                        <Save size={13} /> {saveLoading ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => { setEditing(false); setSaveError(''); }}
                        className="flex items-center gap-1.5 border border-gray-300 text-gray-600 text-xs px-3 py-2 rounded-lg hover:bg-gray-50"
                      >
                        <X size={13} /> Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditing(true)}
                        className="flex items-center gap-1.5 border border-gray-300 text-gray-600 text-xs font-medium px-3 py-2 rounded-lg hover:bg-gray-50"
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex items-center gap-1.5 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Status badges */}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${client.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  {client.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                  <Briefcase size={10} /> {client._count?.jobs ?? client.jobs?.length ?? 0} Jobs
                </span>
              </div>
            </div>

            {/* Edit form or details */}
            {editing ? (
              <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Edit Client Details</h3>
                {saveError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle size={13} /> {saveError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Company Name *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </div>
                  {[
                    { key: 'industry', label: 'Industry' },
                    { key: 'country', label: 'Country' },
                    { key: 'contactName', label: 'Contact Name' },
                    { key: 'contactEmail', label: 'Contact Email', type: 'email' },
                    { key: 'contactPhone', label: 'Contact Phone' },
                    { key: 'website', label: 'Website' },
                  ].map(({ key, label, type }) => (
                    <div key={key}>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">{label}</label>
                      <input
                        type={type || 'text'}
                        value={form[key] || ''}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Notes</label>
                    <textarea
                      rows={3}
                      value={form.notes || ''}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={form.isActive}
                        onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                      Active Client
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Contact & Details</h3>
                <InfoRow label="Contact" value={client.contactName} icon={<Users size={13} />} />
                <InfoRow label="Email" value={client.contactEmail} icon={<Mail size={13} />} />
                <InfoRow label="Phone" value={client.contactPhone} icon={<Phone size={13} />} />
                <InfoRow label="Website" value={client.website} icon={<Globe size={13} />} />
                <InfoRow label="Address" value={client.address} icon={<MapPin size={13} />} />
                <InfoRow label="Country" value={client.country} icon={<MapPin size={13} />} />
                {client.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Notes</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Linked Jobs */}
            {(client.jobs || []).length > 0 && (
              <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                  <Briefcase size={14} className="text-teal-600" />
                  <h3 className="text-sm font-bold text-gray-900">Linked Jobs ({client.jobs.length})</h3>
                </div>
                <table className="ats-table w-full">
                  <thead>
                    <tr>
                      <th style={{ width: 100 }}>Job ID</th>
                      <th style={{ minWidth: 200 }}>Title</th>
                      <th style={{ width: 90 }}>Status</th>
                      <th style={{ width: 85 }}>Applications</th>
                      <th style={{ width: 70 }}>View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.jobs.map(job => (
                      <tr key={job.id} className="border-b border-slate-100 hover:bg-teal-50/30">
                        <td className="px-3 py-2">
                          <span className="font-mono text-[11px] text-teal-600">{job.displayId}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs font-medium text-gray-900">{job.title}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            job.status === 'OPEN' ? 'bg-green-100 text-green-700'
                            : job.status === 'CLOSED' ? 'bg-red-100 text-red-600'
                            : 'bg-gray-100 text-gray-600'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center text-xs text-gray-600">
                          {job._count?.applications ?? '—'}
                        </td>
                        <td className="px-3 py-2">
                          <a href={`/jobs/view/${job.id}`} className="text-xs text-teal-600 hover:text-teal-800 font-medium">
                            View
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Dates */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-5 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1"><Calendar size={11} /> Created</p>
                <p className="text-sm text-gray-700">{new Date(client.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              {client.updatedAt && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1"><Calendar size={11} /> Last Updated</p>
                  <p className="text-sm text-gray-700">{new Date(client.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              )}
            </div>

          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
