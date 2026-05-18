'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import apiClient from '../../../lib/api';
import { PlusCircle, RefreshCw, Search } from 'lucide-react';

function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export default function VisaCasesListPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [permitStatus, setPermitStatus] = useState('');
  const [workerCategory, setWorkerCategory] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (search.trim()) params.set('search', search.trim());
      if (permitStatus) params.set('permitStatus', permitStatus);
      if (workerCategory) params.set('workerCategory', workerCategory);
      const res = await apiClient.get(`/api/visa/cases?${params}`);
      setCases(res.data?.data?.cases || []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load cases');
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, [search, permitStatus, workerCategory]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardLayout title="HR Ops › Visa › Cases">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Visa cases</h2>
            <p className="text-sm text-slate-500">TKG-VISA records · permits · renewals</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost text-sm" onClick={load} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <Link href="/visa/cases/new" className="btn-primary text-sm inline-flex items-center gap-1">
              <PlusCircle size={14} /> New case
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1">
            <Search size={14} className="text-slate-400" />
            <input
              className="text-sm border-0 outline-none w-48"
              placeholder="Search name / ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
          </div>
          <select
            className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
            value={permitStatus}
            onChange={(e) => setPermitStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="APPLICATION">Application</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired</option>
            <option value="RENEWAL_REQUIRED">Renewal required</option>
            <option value="RENEWAL_PENDING">Renewal pending</option>
            <option value="RENEWAL_SUBMITTED">Renewal submitted</option>
          </select>
          <select
            className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
            value={workerCategory}
            onChange={(e) => setWorkerCategory(e.target.value)}
          >
            <option value="">All worker categories</option>
            <option value="LOCAL_MY">Local Malaysian</option>
            <option value="EXPAT_IN_MY">Expat in Malaysia</option>
            <option value="EXPAT_OVERSEAS">Expat overseas hire</option>
            <option value="CONTRACTOR">Contractor</option>
            <option value="CLIENT_DEPLOYED">Client-deployed</option>
            <option value="INTERNAL">Internal</option>
          </select>
          <button type="button" className="btn-ghost text-xs" onClick={load}>Apply</button>
        </div>

        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
            <div className="col-span-2">Case</div>
            <div className="col-span-3">Worker</div>
            <div className="col-span-2">Permit</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Expiry</div>
            <div className="col-span-1" />
          </div>
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Loading…</div>
          ) : cases.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">No cases. Create one from New case.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {cases.map((c) => (
                <li key={c.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center text-sm">
                  <div className="col-span-2 font-mono text-xs font-semibold text-brand-600">{c.displayId}</div>
                  <div className="col-span-3 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{c.workerName}</p>
                    <p className="text-[10px] text-slate-500">{c.workerDisplayId || c.workerCategory}</p>
                  </div>
                  <div className="col-span-2 text-xs">{c.permitType}</div>
                  <div className="col-span-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{c.permitStatus}</span>
                  </div>
                  <div className="col-span-2 text-xs text-slate-600">{formatDate(c.expiryDate)}</div>
                  <div className="col-span-1 text-right">
                    <Link href={`/visa/cases/${c.id}`} className="text-xs text-brand-600 font-medium">Open</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
