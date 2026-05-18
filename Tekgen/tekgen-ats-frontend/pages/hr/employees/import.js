'use client';

import { useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import api from '../../../lib/api';

export default function EmployeeImportPage() {
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
      const res = await api.post('/api/hrms/employees/import', formData);
      setResult(res.data.data || null);
    } catch (e2) {
      setError(e2.response?.data?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="HR › Import Employees">
      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Import Existing Staff Records</h2>
          <p className="text-sm text-slate-500">
            Upload CSV for internal/deployed staff. Existing users can be updated safely.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-2">
          <p>
            <strong>Full row:</strong> <code>firstName</code>, <code>lastName</code>, <code>email</code> (required). Optional:{' '}
            <code>role, department, designation, employmentType, staffType, phone, managerEmail, joinDate, tempPassword, clientId, nationality, workCountry, workState</code>.
          </p>
          <p>
            <strong>Visa / permit (same file):</strong>{' '}
            <code>visa_status, visa_expiry, passport_expiry, nric_passport, permit_type, visa_case_type</code> — values like{' '}
            <code>NEW</code>, <code>RENEWAL</code> for <code>visa_case_type</code>.
          </p>
          <p>
            <strong>Dependents (DP):</strong> up to three blocks:{' '}
            <code>dependent_1_name, dependent_1_relationship, dependent_1_pass_type, dependent_1_expiry, dependent_1_passport</code> (and{' '}
            <code>dependent_2_*</code>, <code>dependent_3_*</code>). Short aliases: <code>dep1_name</code>, <code>dp1_name</code>, etc.
          </p>
          <p>
            <strong>Visa-only rows:</strong> leave <code>email</code> empty; set <code>employee_id</code> to <code>TKG-EMP-xxxx</code> and include visa columns. Requires <strong>Update existing</strong> checked.
          </p>
          <p>
            Note: <code>clientId</code> is mandatory when <code>employmentType=DEPLOYED</code>.
          </p>
          <p>
            <Link href="/hr/import" className="text-blue-700 underline font-medium">← Back to HR bulk import hub</Link>
          </p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>}

        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={allowUpdateExisting} onChange={(e) => setAllowUpdateExisting(e.target.checked)} />
            Update existing users if email already exists
          </label>
          <div className="flex gap-2">
            <button disabled={loading || !file} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">
              {loading ? 'Importing...' : 'Import CSV'}
            </button>
            <Link href="/hr/employees" className="px-4 py-2 border rounded text-sm">Back</Link>
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
                  {result.errors.slice(0, 20).map((er, i) => <li key={i}>{er}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
