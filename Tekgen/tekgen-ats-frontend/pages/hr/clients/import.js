'use client';

import { useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import api from '../../../lib/api';

export default function ClientImportPage() {
  const [file, setFile] = useState(null);
  const [allowUpdateExisting, setAllowUpdateExisting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return;
    try {
      setLoading(true);
      setError('');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('allowUpdateExisting', String(allowUpdateExisting));
      const res = await api.post('/api/hrms/clients/import', formData);
      setResult(res.data.data || null);
    } catch (e2) {
      setError(e2.response?.data?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="HR › Import clients">
      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Import existing clients</h2>
          <p className="text-sm text-slate-500">
            For invoicing and deployed staff when you are not using the Sales team workflow. HR / Admin / Finance Manager can run this import.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 space-y-1">
          <p>
            <strong>Required:</strong> <code>clientName</code>
          </p>
          <p>
            <strong>Optional:</strong>{' '}
            <code>
              primaryContactEmail, primaryContactPhone, primaryContact, address, country, state, city, industry,
              paymentTerms, notes, status
            </code>
          </p>
          <p>
            <code>status</code>: ACTIVE | INACTIVE | PROSPECT | ON_HOLD (default ACTIVE). Duplicate names: enable update below to refresh contacts/address.
          </p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>}

        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={allowUpdateExisting} onChange={(e) => setAllowUpdateExisting(e.target.checked)} />
            Update existing client if name matches (case-insensitive)
          </label>
          <div className="flex gap-2">
            <button disabled={loading || !file} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">
              {loading ? 'Importing...' : 'Import CSV'}
            </button>
            <Link href="/hr/import" className="px-4 py-2 border rounded text-sm">
              Back to import hub
            </Link>
          </div>
        </form>

        {result && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2 text-sm">
            <p><strong>Created:</strong> {result.created}</p>
            <p><strong>Updated:</strong> {result.updated}</p>
            <p><strong>Skipped:</strong> {result.skipped}</p>
            {Array.isArray(result.errors) && result.errors.length > 0 && (
              <div>
                <p className="font-semibold text-red-700">Errors:</p>
                <ul className="list-disc ml-5 text-red-700">
                  {result.errors.slice(0, 30).map((er, i) => (
                    <li key={i}>{er}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
