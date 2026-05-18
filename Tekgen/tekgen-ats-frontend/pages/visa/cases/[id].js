'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import apiClient from '../../../lib/api';
import { openAuthenticatedFile } from '../../../lib/secureFile';
import { getUser } from '../../../lib/auth';
import { RefreshCw, Upload } from 'lucide-react';

const TABS = ['Overview', 'Checklist', 'Documents', 'Dependents', 'Alerts'];

const BASE_REQUIRED_DOCS = [
  'PASSPORT',
  'PHOTO',
  'EMPLOYMENT_CONTRACT',
];

const REQUIRED_DOCS_BY_PERMIT = {
  EP: ['APPROVAL_LETTER', 'EDUCATION_CERT', 'CV', 'MEDICAL'],
  PVP: ['APPROVAL_LETTER', 'ASSIGNMENT_LETTER'],
  DP: ['MARRIAGE_CERT', 'BIRTH_CERT'],
  LTVP: ['SPONSOR_LETTER', 'BANK_STATEMENT'],
};

const ADDON_DOCS_BY_CASE_TYPE = {
  RENEWAL: ['PREVIOUS_PASS_COPY', 'RENEWAL_FORM'],
  TRANSFER: ['RELEASE_LETTER', 'NEW_SPONSOR_LETTER'],
};

function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export default function VisaCaseDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [tab, setTab] = useState('Overview');
  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [docFiles, setDocFiles] = useState([]);
  const [docType, setDocType] = useState('PASSPORT');
  const [requestingDocs, setRequestingDocs] = useState(false);
  const user = typeof window !== 'undefined' ? getUser() : null;
  const canWrite = user && ['ADMIN', 'VISA_ADMIN'].includes(user.role);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get(`/api/visa/cases/${id}`);
      setC(res.data?.data || null);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
      setC(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const patchCase = async (payload) => {
    setSaving(true);
    try {
      await apiClient.patch(`/api/visa/cases/${id}`, payload);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  const uploadDoc = async (e) => {
    e.preventDefault();
    if (!docFiles.length) return;
    const fd = new FormData();
    fd.append('documentType', docType);
    docFiles.forEach((f) => fd.append('files', f));
    setSaving(true);
    try {
      await apiClient.post(`/api/visa/cases/${id}/documents/bulk`, fd);
      setDocFiles([]);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const requiredDocs = (() => {
    const permit = (c?.permitType || '').toUpperCase();
    const caseType = (c?.permitStatus || '').includes('RENEWAL') ? 'RENEWAL' : (c?.employeeProfile?.visaCaseType || null);
    const docs = [
      ...BASE_REQUIRED_DOCS,
      ...(REQUIRED_DOCS_BY_PERMIT[permit] || ['APPROVAL_LETTER']),
      ...(caseType && ADDON_DOCS_BY_CASE_TYPE[caseType] ? ADDON_DOCS_BY_CASE_TYPE[caseType] : []),
    ];
    if ((c?.dependents || []).length > 0) {
      docs.push('DEPENDENT_PASSPORT', 'DEPENDENT_SUPPORTING_DOC');
    }
    return [...new Set(docs)];
  })();

  const uploadedDocTypes = new Set((c?.documents || []).map((d) => d.documentType));
  const missingRequiredDocs = requiredDocs.filter((d) => !uploadedDocTypes.has(d));

  const requestMissingDocs = async () => {
    if (!missingRequiredDocs.length) return;
    setRequestingDocs(true);
    try {
      await apiClient.post(`/api/visa/cases/${id}/onboarding-items`, {
        items: missingRequiredDocs.map((doc) => ({
          itemName: `Employee to upload: ${doc}`,
          itemPhase: 'DOC_REQUEST',
        })),
      });
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setRequestingDocs(false);
    }
  };

  const verifyDoc = async (docId, verifiedStatus) => {
    try {
      await apiClient.patch(`/api/visa/documents/${docId}/verify`, { verifiedStatus });
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
  };

  const patchItem = async (itemId, body) => {
    try {
      await apiClient.patch(`/api/visa/onboarding/${itemId}`, body);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
  };

  const ackAlert = async (alertId) => {
    try {
      await apiClient.post(`/api/visa/alerts/${alertId}/ack`, {});
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
  };

  const addDependent = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = fd.get('name');
    if (!name) return;
    try {
      await apiClient.post(`/api/visa/cases/${id}/dependents`, {
        name,
        relationship: fd.get('relationship') || null,
        passportNo: fd.get('passportNo') || null,
        passStatus: fd.get('passStatus') || null,
        expiryDate: fd.get('expiryDate') || null,
      });
      e.target.reset();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  if (loading && !c) {
    return (
      <DashboardLayout title="Visa › Case">
        <div className="p-8 text-center text-slate-500 text-sm">Loading…</div>
      </DashboardLayout>
    );
  }
  if (!c) {
    return (
      <DashboardLayout title="Visa › Case">
        <div className="p-8 text-center text-red-600 text-sm">{error || 'Not found'}</div>
        <Link href="/visa/cases" className="block text-center text-brand-600 text-sm">Back to list</Link>
      </DashboardLayout>
    );
  }

  return (
      <DashboardLayout title={`HR Ops › Visa › ${c.displayId}`}>
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs text-slate-500 font-mono">{c.displayId}</p>
            <h2 className="text-xl font-bold text-slate-900">{c.workerName}</h2>
            <p className="text-sm text-slate-500">{c.permitType} · {c.workerCategory} · {c.permitStatus}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost text-sm" onClick={load}><RefreshCw size={14} /> Refresh</button>
            <Link href="/visa/cases" className="btn-ghost text-sm">All cases</Link>
          </div>
        </div>

        {error && <div className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex gap-1 border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={`px-3 py-2 text-xs font-medium rounded-t-lg ${tab === t ? 'bg-white border border-b-0 border-slate-200 text-slate-900' : 'text-slate-500'}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl rounded-tl-none p-4 min-h-[280px]">
          {tab === 'Overview' && (
            <div className="space-y-3 text-sm max-w-md">
              <p><span className="text-slate-500">Expiry:</span> {formatDate(c.expiryDate)}</p>
              <p><span className="text-slate-500">Renewal due:</span> {formatDate(c.renewalDueDate)}</p>
              <p><span className="text-slate-500">Nationality:</span> {c.nationality || '—'}</p>
              <p className="text-slate-600 text-xs whitespace-pre-wrap">{c.notes || '—'}</p>
              {canWrite && (
                <form
                  className="space-y-2 pt-2 border-t border-slate-100"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.target);
                    patchCase({
                      permitStatus: fd.get('permitStatus'),
                      expiryDate: fd.get('expiryDate') || null,
                      notes: fd.get('notes'),
                    });
                  }}
                >
                  <label className="text-xs font-medium">Status</label>
                  <select name="permitStatus" className="w-full rounded border px-2 py-1.5 text-sm" defaultValue={c.permitStatus}>
                    <option value="APPLICATION">APPLICATION</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="REJECTED">REJECTED</option>
                    <option value="EXPIRED">EXPIRED</option>
                    <option value="RENEWAL_REQUIRED">RENEWAL_REQUIRED</option>
                    <option value="RENEWAL_PENDING">RENEWAL_PENDING</option>
                    <option value="RENEWAL_SUBMITTED">RENEWAL_SUBMITTED</option>
                  </select>
                  <label className="text-xs font-medium">Expiry date</label>
                  <input type="date" name="expiryDate" className="w-full rounded border px-2 py-1.5 text-sm" defaultValue={c.expiryDate ? c.expiryDate.slice(0, 10) : ''} />
                  <label className="text-xs font-medium">Notes</label>
                  <textarea name="notes" className="w-full rounded border px-2 py-1.5 text-xs" rows={3} defaultValue={c.notes || ''} />
                  <button type="submit" className="btn-primary text-xs" disabled={saving}>Save</button>
                </form>
              )}
            </div>
          )}

          {tab === 'Checklist' && (
            <ul className="space-y-2">
              {(c.onboardingItems || []).map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-2 border border-slate-100 rounded-lg p-2 text-xs">
                  <span className="font-medium text-slate-800 flex-1 min-w-[200px]">{item.itemName}</span>
                  <span className="text-slate-400">{item.itemPhase}</span>
                  <select
                    className="rounded border px-1 py-0.5"
                    value={item.status}
                    onChange={(e) => patchItem(item.id, { status: e.target.value })}
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="SUBMITTED">SUBMITTED</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                  <button
                    type="button"
                    className="text-[10px] text-brand-600"
                    onClick={() => patchItem(item.id, { completedAt: new Date().toISOString() })}
                  >
                    Mark done
                  </button>
                </li>
              ))}
              {(!c.onboardingItems || c.onboardingItems.length === 0) && (
                <p className="text-sm text-slate-500">No checklist items (category may not use auto-seed).</p>
              )}
            </ul>
          )}

          {tab === 'Documents' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">Required document matrix ({c.permitType || 'General'})</p>
                <div className="flex flex-wrap gap-1.5">
                  {requiredDocs.map((doc) => {
                    const hasDoc = uploadedDocTypes.has(doc);
                    return (
                      <span
                        key={doc}
                        className={`text-[10px] px-2 py-1 rounded-full ${
                          hasDoc ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {doc}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-slate-500">Missing: {missingRequiredDocs.length}</span>
                  {canWrite && missingRequiredDocs.length > 0 && (
                    <button
                      type="button"
                      className="text-[11px] text-brand-600 font-medium"
                      onClick={requestMissingDocs}
                      disabled={requestingDocs}
                    >
                      {requestingDocs ? 'Requesting…' : 'Request missing docs from employee'}
                    </button>
                  )}
                </div>
              </div>

              {canWrite && (
                <form onSubmit={uploadDoc} className="flex flex-wrap gap-2 items-end border-b border-slate-100 pb-3">
                  <div>
                    <label className="text-[10px] text-slate-500">Type</label>
                    <select className="block rounded border text-xs px-2 py-1" value={docType} onChange={(e) => setDocType(e.target.value)}>
                      <option value="PASSPORT">PASSPORT</option>
                      <option value="APPROVAL_LETTER">APPROVAL_LETTER</option>
                      <option value="MEDICAL">MEDICAL</option>
                      <option value="EMPLOYMENT_CONTRACT">EMPLOYMENT_CONTRACT</option>
                      <option value="PHOTO">PHOTO</option>
                      <option value="EDUCATION_CERT">EDUCATION_CERT</option>
                      <option value="CV">CV</option>
                      <option value="MARRIAGE_CERT">MARRIAGE_CERT</option>
                      <option value="BIRTH_CERT">BIRTH_CERT</option>
                      <option value="DEPENDENT_PASSPORT">DEPENDENT_PASSPORT</option>
                      <option value="DEPENDENT_SUPPORTING_DOC">DEPENDENT_SUPPORTING_DOC</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>
                  <input type="file" multiple onChange={(e) => setDocFiles(Array.from(e.target.files || []))} />
                  <button type="submit" className="btn-primary text-xs inline-flex items-center gap-1" disabled={saving}>
                    <Upload size={12} /> Upload files
                  </button>
                  {docFiles.length > 0 && <span className="text-[10px] text-slate-500">{docFiles.length} file(s) selected</span>}
                </form>
              )}
              <ul className="space-y-2">
                {(c.documents || []).map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-2 text-xs border rounded-lg p-2">
                    <span className="font-medium">{d.documentType}</span>
                    <span className="text-slate-500 truncate max-w-[180px]">{d.fileName}</span>
                    <span className={`px-1.5 py-0.5 rounded ${d.verifiedStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100'}`}>{d.verifiedStatus}</span>
                    {d.fileUrl && id && (
                      <button
                        type="button"
                        onClick={() => openAuthenticatedFile(`/api/visa/cases/${id}/documents/${d.id}/download`)}
                        className="text-brand-600"
                      >
                        Open
                      </button>
                    )}
                    {canWrite && (
                      <>
                        <button type="button" className="text-emerald-600" onClick={() => verifyDoc(d.id, 'VERIFIED')}>Verify</button>
                        <button type="button" className="text-red-600" onClick={() => verifyDoc(d.id, 'REJECTED')}>Reject</button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === 'Dependents' && (
            <div className="space-y-4">
              {canWrite && (
                <form onSubmit={addDependent} className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs border-b pb-3">
                  <input name="name" placeholder="Name" className="rounded border px-2 py-1" required />
                  <input name="relationship" placeholder="Relationship" className="rounded border px-2 py-1" />
                  <input name="passportNo" placeholder="Passport" className="rounded border px-2 py-1" />
                  <input name="passStatus" placeholder="Pass status" className="rounded border px-2 py-1" />
                  <input name="expiryDate" type="date" className="rounded border px-2 py-1" />
                  <button type="submit" className="btn-primary text-xs col-span-2 md:col-span-1">Add dependent</button>
                </form>
              )}
              <ul className="space-y-2">
                {(c.dependents || []).map((d) => (
                  <li key={d.id} className="text-xs border rounded p-2">
                    <strong>{d.name}</strong> {d.relationship && `· ${d.relationship}`}
                    <br />
                    Passport: {d.passportNo || '—'} · Expiry: {formatDate(d.expiryDate)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === 'Alerts' && (
            <ul className="space-y-2">
              {(c.expiryAlerts || []).map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-2 text-xs border rounded-lg p-2">
                  <span>{a.alertType}</span>
                  <span className="text-slate-600">{a.alertDays}d window</span>
                  <span>{formatDate(a.expiryDate)}</span>
                  {a.triggeredAt && <span className="text-amber-600">Triggered</span>}
                  {a.acknowledgedAt ? (
                    <span className="text-emerald-600">Acknowledged</span>
                  ) : (
                    <button type="button" className="text-brand-600" onClick={() => ackAlert(a.id)}>Acknowledge</button>
                  )}
                </li>
              ))}
              {(!c.expiryAlerts || c.expiryAlerts.length === 0) && (
                <p className="text-sm text-slate-500">No alerts (set permit expiry to generate 90/60/30 day permit alerts).</p>
              )}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
