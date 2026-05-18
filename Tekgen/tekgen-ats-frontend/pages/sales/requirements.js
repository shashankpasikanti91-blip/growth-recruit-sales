'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';
import { useRole } from '../../lib/useRole';
import { useRouter } from 'next/router';
import {
  Briefcase, Building2, Loader2, AlertCircle, PlusCircle, Pencil, Target,
} from 'lucide-react';

const CANDIDATE_TYPE_LABEL = {
  LOCAL: 'Local',
  EXPAT: 'Expat',
  FOREIGNER_RELOCATE: 'Expat relocate',
  ANY: 'Any',
};

export default function SalesRequirementsPage() {
  const router = useRouter();
  const { canManageClientJobs, canAccessSalesCRM, user } = useRole();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user && !canAccessSalesCRM) {
      router.replace('/dashboard');
    }
  }, [user, canAccessSalesCRM, router]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/api/sales/requisitions?limit=120');
        setRows(res.data.data?.requisitions || []);
        setError(null);
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load requirements');
      } finally {
        setLoading(false);
      }
    };
    if (canAccessSalesCRM) load();
  }, [canAccessSalesCRM]);

  return (
    <DashboardLayout title="Client requirements">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Target className="text-emerald-600" size={24} />
              Client requirements tracker
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Open JDs with client link, contract type, CV target, and pipeline counts. Recruiters attach candidates via screening against each job.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManageClientJobs && (
              <Link
                href="/jobs/bulk-import"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                <Briefcase size={16} />
                Bulk Excel
              </Link>
            )}
            {canManageClientJobs && (
              <Link
                href="/jobs/create"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
              >
                <PlusCircle size={16} />
                New requirement
              </Link>
            )}
            <Link
              href="/sales"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Sales home
            </Link>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-4 py-3">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-slate-400" size={28} />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Client JR / HR ID</th>
                    <th className="px-4 py-3 font-semibold">Role / ID</th>
                    <th className="px-4 py-3 font-semibold">Client</th>
                    <th className="px-4 py-3 font-semibold">Contract</th>
                    <th className="px-4 py-3 font-semibold">Candidate</th>
                    <th className="px-4 py-3 font-semibold text-center">CV target</th>
                    <th className="px-4 py-3 font-semibold text-center">Apps</th>
                    <th className="px-4 py-3 font-semibold">Due</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                        No open requirements. {canManageClientJobs && 'Create one from New requirement.'}
                      </td>
                    </tr>
                  )}
                  {rows.map((j) => {
                    const clientLabel =
                      j.client?.clientName || j.clientName || '—';
                    const target = j.targetCvSubmissions;
                    const apps = j._count?.applications ?? 0;
                    const due = j.targetSubmissionDate
                      ? new Date(j.targetSubmissionDate).toLocaleDateString()
                      : '—';
                    return (
                      <tr key={j.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                        <td className="px-4 py-3 align-top">
                          <div className="text-xs font-mono text-amber-900 font-semibold">
                            {j.clientJrNumber ? `JR ${j.clientJrNumber}` : '—'}
                          </div>
                          {j.clientRequestUuid ? (
                            <div
                              className="text-[10px] font-mono text-slate-500 mt-1 max-w-[160px] break-all"
                              title={j.clientRequestUuid}
                            >
                              HR {j.clientRequestUuid}
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 mt-1">No client HR ID</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{j.title}</div>
                          <div className="text-xs text-slate-500 font-mono">
                            Tekgen {j.displayId || j.id.slice(0, 8)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-slate-800">
                            <Building2 size={14} className="text-slate-400 flex-shrink-0" />
                            {j.client?.id ? (
                              <Link
                                href={`/sales/clients/${j.client.id}`}
                                className="text-brand-600 hover:underline"
                              >
                                {clientLabel}
                              </Link>
                            ) : (
                              <span>{clientLabel}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <span className="text-xs font-semibold uppercase">{j.contractType || '—'}</span>
                          {j.contractDuration && (
                            <div className="text-xs text-slate-500">{j.contractDuration}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {CANDIDATE_TYPE_LABEL[j.candidateType] || j.candidateType || '—'}
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums">
                          {target != null ? target : '—'}
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums font-medium text-slate-900">
                          {apps}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{due}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2 flex-wrap">
                            <Link
                              href={`/jobs/view/${j.id}`}
                              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                            >
                              <Briefcase size={14} />
                              View
                            </Link>
                            {canManageClientJobs && (
                              <Link
                                href={`/jobs/create?id=${j.id}`}
                                className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                              >
                                <Pencil size={14} />
                                Edit
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
