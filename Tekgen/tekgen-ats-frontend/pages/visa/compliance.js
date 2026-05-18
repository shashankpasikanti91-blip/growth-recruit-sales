'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../components/layout/DashboardLayout';
import apiClient from '../../lib/api';
import { getUser } from '../../lib/auth';

export default function VisaCompliancePage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const canEdit = user && ['ADMIN', 'VISA_ADMIN'].includes(user.role);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/visa/compliance/rules');
      setRules(res.data?.data?.rules || []);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createRule = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await apiClient.post('/api/visa/compliance/rules', {
        country: fd.get('country') || 'MY',
        workerCategory: fd.get('workerCategory') || null,
        year: fd.get('year') ? parseInt(fd.get('year'), 10) : null,
        ruleType: fd.get('ruleType'),
        ruleValue: fd.get('ruleValue') ? JSON.parse(fd.get('ruleValue')) : null,
        effectiveDate: fd.get('effectiveDate'),
      });
      e.target.reset();
      load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid JSON in rule value?');
    }
  };

  const del = async (id) => {
    if (!confirm('Delete this rule?')) return;
    try {
      await apiClient.delete(`/api/visa/compliance/rules/${id}`);
      load();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
  };

  return (
    <DashboardLayout title="HR Ops › Visa › Compliance">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Compliance rules</h2>
            <p className="text-sm text-slate-500">Country, worker category, tax/statutory/document checklist (Phase 4.6)</p>
          </div>
          <Link href="/visa" className="text-sm text-brand-600">Desk</Link>
        </div>
        {error && <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        {canEdit && (
          <form onSubmit={createRule} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
            <p className="font-semibold text-slate-800">New rule</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <input name="country" placeholder="Country (MY)" className="rounded border px-2 py-1" defaultValue="MY" />
              <input name="workerCategory" placeholder="Worker category" className="rounded border px-2 py-1" />
              <input name="year" type="number" placeholder="Year" className="rounded border px-2 py-1" />
              <input name="ruleType" placeholder="ruleType: TAX | STATUTORY | DOCUMENT_CHECKLIST" className="rounded border px-2 py-1 col-span-2" required />
              <input name="effectiveDate" type="date" className="rounded border px-2 py-1" required />
            </div>
            <textarea name="ruleValue" placeholder='ruleValue JSON e.g. {"documents":["NRIC","EPF"]}' className="w-full rounded border px-2 py-1 font-mono" rows={2} />
            <button type="submit" className="btn-primary text-xs">Add rule</button>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="p-2">Country</th>
                  <th className="p-2">Category</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Effective</th>
                  <th className="p-2">Value</th>
                  {canEdit && <th className="p-2" />}
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="p-2">{r.country}</td>
                    <td className="p-2">{r.workerCategory || '—'}</td>
                    <td className="p-2">{r.ruleType}</td>
                    <td className="p-2">{r.effectiveDate?.slice(0, 10)}</td>
                    <td className="p-2 font-mono max-w-xs truncate">{r.ruleValue ? JSON.stringify(r.ruleValue) : '—'}</td>
                    {canEdit && (
                      <td className="p-2">
                        <button type="button" className="text-red-600" onClick={() => del(r.id)}>Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {rules.length === 0 && <p className="p-4 text-sm text-slate-500">No rules yet.</p>}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
