'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import apiClient from '../../../lib/api';

const WORKER_TYPES = [
  { value: 'EMPLOYEE', label: 'Employee (internal)' },
  { value: 'DEPLOYED_STAFF', label: 'Deployed staff' },
  { value: 'CANDIDATE', label: 'Candidate (pre-hire)' },
];

const CATEGORIES = [
  { value: 'LOCAL_MY', label: 'Local Malaysian' },
  { value: 'EXPAT_IN_MY', label: 'Expat already in MY' },
  { value: 'EXPAT_OVERSEAS', label: 'Expat overseas hire' },
  { value: 'CONTRACTOR', label: 'Contractor' },
  { value: 'CLIENT_DEPLOYED', label: 'Client-deployed' },
  { value: 'INTERNAL', label: 'Internal' },
];

export default function NewVisaCasePage() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    workerType: 'EMPLOYEE',
    employeeProfileId: '',
    candidateId: '',
    workerName: '',
    nationality: '',
    workerCategory: 'EXPAT_IN_MY',
    permitType: 'EP',
    permitStatus: 'APPLICATION',
    applicationDate: '',
    approvalDate: '',
    expiryDate: '',
    notes: '',
    seedChecklist: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/api/hrms/employees?status=ALL&limit=500');
        setEmployees(res.data?.data?.employees || []);
      } catch {
        setEmployees([]);
      }
    })();
  }, []);

  const onEmpChange = (id) => {
    const emp = employees.find((e) => e.id === id);
    setForm((f) => ({
      ...f,
      employeeProfileId: id,
      workerName: emp?.user ? `${emp.user.firstName} ${emp.user.lastName}`.trim() : f.workerName,
      nationality: emp?.nationality || f.nationality,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = {
        workerType: form.workerType,
        workerName: form.workerName,
        nationality: form.nationality || null,
        workerCategory: form.workerCategory,
        permitType: form.permitType,
        permitStatus: form.permitStatus,
        applicationDate: form.applicationDate || null,
        approvalDate: form.approvalDate || null,
        expiryDate: form.expiryDate || null,
        notes: form.notes || null,
        seedChecklist: form.seedChecklist,
      };
      if (form.workerType === 'CANDIDATE') {
        body.candidateId = form.candidateId || null;
      } else {
        body.employeeProfileId = form.employeeProfileId || null;
      }
      const res = await apiClient.post('/api/visa/cases', body);
      const id = res.data?.data?.id;
      if (id) router.push(`/visa/cases/${id}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="HR Ops › Visa › New case">
      <div className="max-w-xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">New visa case</h2>
          <Link href="/visa/cases" className="text-sm text-brand-600">Back</Link>
        </div>
        {error && <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 text-sm">
          <div>
            <label className="text-xs font-medium text-slate-600">Worker type</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={form.workerType}
              onChange={(e) => setForm((f) => ({ ...f, workerType: e.target.value }))}
            >
              {WORKER_TYPES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          {form.workerType !== 'CANDIDATE' ? (
            <div>
              <label className="text-xs font-medium text-slate-600">Employee</label>
              <select
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={form.employeeProfileId}
                onChange={(e) => onEmpChange(e.target.value)}
              >
                <option value="">Select…</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employeeId} — {emp.user?.firstName} {emp.user?.lastName}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-slate-600">Candidate ID (internal)</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
                value={form.candidateId}
                onChange={(e) => setForm((f) => ({ ...f, candidateId: e.target.value }))}
                placeholder="Paste candidate UUID from ATS"
                required
              />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-600">Worker name (display)</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={form.workerName}
              onChange={(e) => setForm((f) => ({ ...f, workerName: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Nationality</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={form.nationality}
              onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Worker category</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              value={form.workerCategory}
              onChange={(e) => setForm((f) => ({ ...f, workerCategory: e.target.value }))}
            >
              {CATEGORIES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-slate-600">Permit type</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={form.permitType}
                onChange={(e) => setForm((f) => ({ ...f, permitType: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Status</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={form.permitStatus}
                onChange={(e) => setForm((f) => ({ ...f, permitStatus: e.target.value }))}
              >
                <option value="APPLICATION">Application</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="EXPIRED">Expired</option>
                <option value="RENEWAL_REQUIRED">Renewal required</option>
                <option value="RENEWAL_PENDING">Renewal pending</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-slate-600">Application</label>
              <input type="date" className="mt-1 w-full rounded-lg border px-2 py-1.5" value={form.applicationDate} onChange={(e) => setForm((f) => ({ ...f, applicationDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-600">Approval</label>
              <input type="date" className="mt-1 w-full rounded-lg border px-2 py-1.5" value={form.approvalDate} onChange={(e) => setForm((f) => ({ ...f, approvalDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-600">Expiry</label>
              <input type="date" className="mt-1 w-full rounded-lg border px-2 py-1.5" value={form.expiryDate} onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Notes</label>
            <textarea className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input type="checkbox" checked={form.seedChecklist} onChange={(e) => setForm((f) => ({ ...f, seedChecklist: e.target.checked }))} />
            Seed default checklist (expat overseas / local MY)
          </label>
          <button type="submit" className="btn-primary w-full" disabled={saving}>{saving ? 'Saving…' : 'Create case'}</button>
        </form>
      </div>
    </DashboardLayout>
  );
}
