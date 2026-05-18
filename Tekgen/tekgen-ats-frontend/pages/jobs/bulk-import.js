'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft, Upload, Table2, Users, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';
import { useRole } from '../../lib/useRole';

function todayISODate() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

export default function BulkHiringImportPage() {
  const router = useRouter();
  const { canManageClientJobs, user } = useRole();
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [clientId, setClientId] = useState('');
  const [clientNameHint, setClientNameHint] = useState('');
  const [jobReceivedDate, setJobReceivedDate] = useState(todayISODate());
  const [targetSubmissionDate, setTargetSubmissionDate] = useState('');
  const [batchLabel, setBatchLabel] = useState('');
  const [priority, setPriority] = useState('MEDIUM');

  const [file, setFile] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [rowState, setRowState] = useState([]);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (user && !canManageClientJobs) {
      router.replace('/jobs');
    }
  }, [user, canManageClientJobs, router]);

  useEffect(() => {
    const loadClients = async () => {
      try {
        const res = await api.get('/api/sales/clients?limit=300&page=1');
        const list = res.data.data?.clients || [];
        setClients(Array.isArray(list) ? list : []);
      } catch {
        setClients([]);
      }
    };
    const loadTeam = async () => {
      try {
        const res = await api.get('/api/jobs/team-members');
        const users = res.data.data?.users || res.data.data || [];
        setTeamMembers(Array.isArray(users) ? users : []);
      } catch {
        setTeamMembers([]);
      }
    };
    loadClients();
    loadTeam();
  }, []);

  const recruiterPool = useMemo(
    () => teamMembers.filter((u) => ['RECRUITER', 'RECRUITMENT_MANAGER'].includes(u.role)),
    [teamMembers]
  );

  const syncRowStateFromPreview = useCallback((rows) => {
    setRowState(
      (rows || []).map((r) => ({
        rowIndex: r.rowIndex,
        import: true,
        assignedRecruiterIds: [],
        _row: r,
      }))
    );
  }, []);

  const handlePreview = async (e) => {
    e?.preventDefault();
    setError('');
    setResult(null);
    if (!file) {
      setError('Choose an Excel file (.xlsx / .xls) first.');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    try {
      setPreviewLoading(true);
      const res = await api.post('/api/jobs/bulk-hiring-request/preview', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = res.data.data;
      setPreview(data);
      syncRowStateFromPreview(data.rows);
    } catch (err) {
      setPreview(null);
      setRowState([]);
      setError(err.response?.data?.message || 'Could not parse file.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const setRowImport = (rowIndex, on) => {
    setRowState((prev) =>
      prev.map((x) => (x.rowIndex === rowIndex ? { ...x, import: on } : x))
    );
  };

  const toggleRecruiter = (rowIndex, userId) => {
    setRowState((prev) =>
      prev.map((x) => {
        if (x.rowIndex !== rowIndex) return x;
        const set = new Set(x.assignedRecruiterIds);
        if (set.has(userId)) set.delete(userId);
        else set.add(userId);
        return { ...x, assignedRecruiterIds: [...set] };
      })
    );
  };

  const selectByKeyword = (keyword) => {
    const low = keyword.toLowerCase();
    setRowState((prev) =>
      prev.map((x) => {
        const title = String(x._row?.position || '').toLowerCase();
        const match = title.includes(low);
        return { ...x, import: match };
      })
    );
  };

  const handleCommit = async () => {
    setError('');
    setResult(null);
    if (!clientId) {
      setError('Select the CRM client (e.g. CIMB).');
      return;
    }
    if (!jobReceivedDate || !targetSubmissionDate) {
      setError('JD received date and target submission date are required.');
      return;
    }
    if (!preview?.rows?.length) {
      setError('Run preview first.');
      return;
    }
    const selected = rowState.filter((x) => x.import);
    if (!selected.length) {
      setError('Select at least one row to import (checkbox Import).');
      return;
    }
    const resolvedName =
      clients.find((c) => c.id === clientId)?.clientName || clientNameHint || '';

    try {
      setCommitLoading(true);
      const res = await api.post('/api/jobs/bulk-hiring-request/commit', {
        clientId,
        clientName: resolvedName,
        jobReceivedDate,
        targetSubmissionDate,
        batchLabel: batchLabel || preview.fileName || `Hiring batch ${todayISODate()}`,
        priority,
        rows: selected.map((x) => ({
          import: true,
          assignedRecruiters: x.assignedRecruiterIds,
          row: x._row,
        })),
      });
      setResult(res.data.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Commit failed.');
    } finally {
      setCommitLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout title="Bulk hiring import">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-start gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm mt-1"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Table2 className="text-indigo-600" size={26} />
              Client hiring-request import (Excel)
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-3xl">
              Matches templates like <strong>Hiring Request</strong> with columns: Hiring Request ID, JR No, Position,
              Contract Duration, Work Location, Competencies, Key Responsibilities, Job Specification, Billing Rate.
              <span className="block mt-1 text-indigo-900">
                If the client only sends <strong>one JD</strong> (no spreadsheet), use{' '}
                <Link href="/jobs/create" className="underline font-semibold">New client requirement</Link>
                — Tekgen still assigns a <span className="font-mono">TKG-J-…</span> job id and the CRM client keeps its own display id.
              </span>
              Import <strong>all</strong> rows or only some: uncheck rows, or use quick filters (e.g. Business Analyst). Assign{' '}
              <strong>only selected rows</strong> to Shashank, Jerry, Savitha — others can stay unassigned or go to other
              recruiters. Tekgen <span className="font-mono text-xs">displayId</span> is separate from client JR / request UUID.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-4 py-3">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {result && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
            <p className="font-semibold text-emerald-900 flex items-center gap-2">
              <CheckCircle2 size={18} /> Imported {result.createdCount} job(s)
            </p>
            <p className="text-xs text-emerald-800 font-mono">
              Batch ID: {result.batchId}
              {result.batchLabel ? ` · ${result.batchLabel}` : ''}
            </p>
            {result.skipped?.length > 0 && (
              <p className="text-xs text-amber-800">
                Skipped {result.skipped.length} duplicate(s) (same JR + request ID already in system).
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <Link
                href={`/jobs?batch=${encodeURIComponent(result.batchId)}`}
                className="text-sm font-medium text-emerald-800 underline"
              >
                View these jobs in Job Openings
              </Link>
              <Link href="/sales/requirements" className="text-sm font-medium text-emerald-800 underline">
                Sales — client requirements
              </Link>
              <Link href="/dashboard" className="text-sm font-medium text-emerald-800 underline">
                Operations Hub (batch summary on KPI)
              </Link>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">1. Client & dates (shared)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Client *</label>
              <select
                value={clientId}
                onChange={(e) => {
                  const id = e.target.value;
                  setClientId(id);
                  const c = clients.find((x) => x.id === id);
                  setClientNameHint(c?.clientName || '');
                }}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">— Select —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.clientName}
                    {c.displayId ? ` · ${c.displayId}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Batch label (for RM / MD reports)</label>
              <input
                value={batchLabel}
                onChange={(e) => setBatchLabel(e.target.value)}
                placeholder="e.g. CIMB Hiring Request 2026-04-17"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">JD received date *</label>
              <input
                type="date"
                value={jobReceivedDate}
                onChange={(e) => setJobReceivedDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Target submission date *</label>
              <input
                type="date"
                value={targetSubmissionDate}
                onChange={(e) => setTargetSubmissionDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">2. Upload Excel</h2>
          <form onSubmit={handlePreview} className="flex flex-wrap items-end gap-3">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setPreview(null);
                setRowState([]);
                setResult(null);
              }}
              className="text-sm"
            />
            <button
              type="submit"
              disabled={previewLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {previewLoading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
              Preview
            </button>
          </form>
          {preview && (
            <p className="text-xs text-slate-500">
              Sheet: <strong>{preview.sheetName}</strong> · Rows parsed: <strong>{preview.rowCount}</strong> · File:{' '}
              {preview.fileName}
            </p>
          )}
        </div>

        {preview?.rows?.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <Users size={16} /> 3. Allocate to team (per row)
              </h2>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="text-slate-500">Quick select by title:</span>
                {['business analyst', 'l2 support', 'software developer', 'murex'].map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => selectByKeyword(kw)}
                    className="px-2 py-1 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 capitalize"
                  >
                    {kw}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setRowState((prev) => prev.map((x) => ({ ...x, import: true })))}
                  className="px-2 py-1 rounded border border-emerald-200 bg-emerald-50 text-emerald-800"
                >
                  Import all
                </button>
                <button
                  type="button"
                  onClick={() => setRowState((prev) => prev.map((x) => ({ ...x, import: false })))}
                  className="px-2 py-1 rounded border border-slate-200 bg-white"
                >
                  Clear all
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-lg max-h-[480px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr className="text-left text-slate-600">
                    <th className="p-2 w-10">Import</th>
                    <th className="p-2">JR No</th>
                    <th className="p-2">Hiring Request ID</th>
                    <th className="p-2 min-w-[180px]">Position</th>
                    <th className="p-2">Location</th>
                    <th className="p-2 min-w-[220px]">Assign recruiters</th>
                  </tr>
                </thead>
                <tbody>
                  {rowState.map((rs) => {
                    const r = rs._row;
                    return (
                      <tr key={r.rowIndex} className="border-t border-slate-100 align-top">
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={rs.import}
                            onChange={(e) => setRowImport(r.rowIndex, e.target.checked)}
                          />
                        </td>
                        <td className="p-2 font-mono text-slate-800">{r.clientJrNumber || '—'}</td>
                        <td className="p-2 font-mono text-[10px] text-slate-600 max-w-[140px] break-all">
                          {r.clientRequestUuid || '—'}
                        </td>
                        <td className="p-2 text-slate-900 font-medium">{r.position}</td>
                        <td className="p-2 text-slate-600">{r.location}</td>
                        <td className="p-2">
                          <div className="flex flex-wrap gap-1">
                            {recruiterPool.map((u) => {
                              const on = rs.assignedRecruiterIds.includes(u.id);
                              return (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => toggleRecruiter(r.rowIndex, u.id)}
                                  className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${
                                    on
                                      ? 'bg-indigo-600 text-white border-indigo-600'
                                      : 'bg-white text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {u.firstName} {u.lastName}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleCommit}
              disabled={commitLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
            >
              {commitLoading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              Create jobs in Tekgen
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
