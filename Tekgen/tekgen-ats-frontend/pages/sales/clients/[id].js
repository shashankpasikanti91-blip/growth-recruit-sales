'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Link from 'next/link';
import api from '../../../lib/api';
import { openAuthenticatedFile } from '../../../lib/secureFile';
import {
  ArrowLeft, Loader2, AlertCircle, Mail, Phone, MapPin,
  Globe, Users, FileText, Calendar, ExternalLink,
  ScrollText,
} from 'lucide-react';

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-brand-500 text-brand-500'
          : 'border-transparent text-slate-600 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  );
}

function parseSubmissionFormat(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return { _raw: raw };
  }
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
      <div className="flex items-center justify-center mb-2 text-slate-400">
        <Icon size={18} />
      </div>
      <p className="text-sm font-bold text-slate-900">{value || 0}</p>
      <p className="text-xs text-slate-600">{label}</p>
    </div>
  );
}

export default function ClientDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [docUploadBusy, setDocUploadBusy] = useState(false);
  const [docUploadMsg, setDocUploadMsg] = useState(null);

  useEffect(() => {
    if (!id) return;
    const loadClient = async () => {
      try {
        const res = await api.get(`/api/clients/${id}`);
        setClient(res.data.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load client');
      } finally {
        setLoading(false);
      }
    };
    loadClient();
  }, [id]);

  const reloadClient = async () => {
    if (!id) return;
    const res = await api.get(`/api/clients/${id}`);
    setClient(res.data.data);
  };

  const handleDocUpload = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setDocUploadBusy(true);
    setDocUploadMsg(null);
    try {
      await api.post(`/api/clients/${id}/documents/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      form.reset();
      await reloadClient();
      setDocUploadMsg({ type: 'ok', text: 'Files uploaded and linked to this client.' });
    } catch (err) {
      setDocUploadMsg({
        type: 'err',
        text: err.response?.data?.message || 'Upload failed',
      });
    } finally {
      setDocUploadBusy(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Client">
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-slate-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !client) {
    return (
      <DashboardLayout title="Client">
        <div className="max-w-4xl mx-auto">
          <Link href="/sales/clients" className="flex items-center gap-2 text-brand-500 hover:text-brand-600 mb-4">
            <ArrowLeft size={16} />
            Back to Clients
          </Link>
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-6 py-4 text-red-700">
            <AlertCircle size={20} />
            {error || 'Client not found'}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Sales › ${client.clientName}`}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link href="/sales/clients" className="flex items-center gap-2 text-brand-500 hover:text-brand-600 mb-3">
            <ArrowLeft size={16} />
            Back to Clients
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">{client.clientName}</h2>
              <div className="flex items-center gap-3 mt-2 text-sm text-slate-600">
                {client.website && (
                  <a href={client.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-brand-500 hover:text-brand-600">
                    <Globe size={14} /> {client.website}
                  </a>
                )}
                {client.country && (
                  <span className="flex items-center gap-1">
                    <MapPin size={14} /> {client.country}{client.state && `, ${client.state}`}
                  </span>
                )}
                {client.industry && <span>{client.industry}</span>}
              </div>
            </div>
            <span className={`text-sm font-semibold px-4 py-2 rounded-full ${
              client.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
              client.status === 'PROSPECT' ? 'bg-blue-100 text-blue-700' :
              'bg-slate-100 text-slate-600'
            }`}>
              {client.status}
            </span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={FileText} label="Job Openings" value={client.jobs?.length || 0} />
          <StatCard icon={Users} label="Submissions" value={client.submissions?.length || 0} />
          <StatCard icon={Users} label="Contacts" value={client.contacts?.length || 0} />
          <StatCard icon={FileText} label="Documents" value={client.documents?.length || 0} />
          <StatCard icon={ScrollText} label="Agreements" value={client.agreements?.length || 0} />
          <StatCard icon={Calendar} label="Created" value={new Date(client.createdAt).toLocaleDateString()} />
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <div className="flex gap-1 overflow-x-auto">
            <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
              Overview
            </TabButton>
            <TabButton active={activeTab === 'jobs'} onClick={() => setActiveTab('jobs')}>
              Job Openings ({client.jobs?.length || 0})
            </TabButton>
            <TabButton active={activeTab === 'submissions'} onClick={() => setActiveTab('submissions')}>
              Submissions ({client.submissions?.length || 0})
            </TabButton>
            <TabButton active={activeTab === 'contacts'} onClick={() => setActiveTab('contacts')}>
              Contacts ({client.contacts?.length || 0})
            </TabButton>
            <TabButton active={activeTab === 'documents'} onClick={() => setActiveTab('documents')}>
              Documents ({client.documents?.length || 0})
            </TabButton>
            <TabButton active={activeTab === 'agreements'} onClick={() => setActiveTab('agreements')}>
              Agreements ({client.agreements?.length || 0})
            </TabButton>
            <TabButton active={activeTab === 'submission'} onClick={() => setActiveTab('submission')}>
              Client submission format
            </TabButton>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Client Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase mb-1">Client ID</p>
                    <p className="text-sm text-slate-900">{client.displayId || client.id}</p>
                  </div>
                  {client.businessUnit && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase mb-1">Business Unit</p>
                      <p className="text-sm text-slate-900">{client.businessUnit}</p>
                    </div>
                  )}
                  {client.primaryContactEmail && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase mb-1">Contact Email</p>
                      <a href={`mailto:${client.primaryContactEmail}`} className="text-sm text-brand-500 hover:text-brand-600">
                        {client.primaryContactEmail}
                      </a>
                    </div>
                  )}
                  {client.primaryContactPhone && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase mb-1">Contact Phone</p>
                      <p className="text-sm text-slate-900">{client.primaryContactPhone}</p>
                    </div>
                  )}
                  {client.notes && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase mb-1">Notes</p>
                      <p className="text-sm text-slate-700">{client.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Metadata</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Created:</span>
                    <span className="font-medium">{new Date(client.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Last Updated:</span>
                    <span className="font-medium">{new Date(client.updatedAt).toLocaleDateString()}</span>
                  </div>
                  {client.owner && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Sales Owner:</span>
                      <span className="font-medium">{client.owner.firstName} {client.owner.lastName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Jobs */}
          {activeTab === 'jobs' && (
            <div className="space-y-3">
              {client.jobs && client.jobs.length > 0 ? (
                client.jobs.map(job => (
                  <Link key={job.id} href={`/jobs/view/${job.id}`} className="block bg-white rounded-lg border border-slate-200 p-4 hover:border-brand-300 hover:shadow-md transition-all">
                    <p className="font-semibold text-slate-900">{job.title}</p>
                    <div className="flex gap-4 mt-2 text-xs text-slate-600">
                      {job._count?.applications && <span>{job._count.applications} applications</span>}
                      {job._count?.screenings && <span>{job._count.screenings} screenings</span>}
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 bg-white rounded-lg border border-slate-200 text-slate-500">
                  No jobs assigned yet
                </div>
              )}
            </div>
          )}

          {/* Submissions */}
          {activeTab === 'submissions' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {client.submissions && client.submissions.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700">Candidate</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700">Job</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700">Stage</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-700">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.submissions.map(sub => (
                      <tr key={sub.id} className="border-t border-slate-100">
                        <td className="px-6 py-3">
                          {sub.candidate
                            ? `${sub.candidate.firstName || ''} ${sub.candidate.lastName || ''}`.trim() || sub.candidate.email
                            : '—'}
                        </td>
                        <td className="px-6 py-3">{sub.job?.title || '—'}</td>
                        <td className="px-6 py-3">
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                            {sub.stage?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-3">{sub.aiMatchScore ? `${sub.aiMatchScore}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No submissions yet
                </div>
              )}
            </div>
          )}

          {/* Contacts */}
          {activeTab === 'contacts' && (
            <div className="space-y-3">
              {client.contacts && client.contacts.length > 0 ? (
                client.contacts.map(contact => (
                  <div key={contact.id} className="bg-white rounded-lg border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{contact.contactName}</p>
                        <p className="text-xs text-slate-500 mt-1">{contact.designation} {contact.department && `• ${contact.department}`}</p>
                      </div>
                      {contact.contactType && (
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                          {contact.contactType}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-3 text-sm text-slate-600">
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-brand-500 hover:text-brand-600">
                          <Mail size={14} /> {contact.email}
                        </a>
                      )}
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="flex items-center gap-1">
                          <Phone size={14} /> {contact.phone}
                        </a>
                      )}
                      {contact.linkedinUrl && (
                        <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-brand-500 hover:text-brand-600">
                          <ExternalLink size={14} /> LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 bg-white rounded-lg border border-slate-200 text-slate-500">
                  No contacts added yet
                </div>
              )}
            </div>
          )}

          {/* Documents */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload client files</h3>
                <p className="text-sm text-slate-600 mb-4 max-w-2xl">
                  Store MSAs, NDAs, SOWs, submission samples, and spreadsheets per client. Files are saved under this client only (not shared across accounts).
                </p>
                {docUploadMsg && (
                  <div
                    className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                      docUploadMsg.type === 'ok'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    {docUploadMsg.text}
                  </div>
                )}
                <form onSubmit={handleDocUpload} className="flex flex-col gap-4 max-w-xl">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Document type</label>
                    <select
                      name="documentType"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      defaultValue="OTHER"
                    >
                      <option value="MSA">MSA</option>
                      <option value="NDA">NDA</option>
                      <option value="LOA">LOA</option>
                      <option value="MOU">MOU</option>
                      <option value="CONTRACT">Contract</option>
                      <option value="SOW">SOW</option>
                      <option value="RATE_CARD">Rate card</option>
                      <option value="SUBMISSION_FORMAT">Submission format</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Files (multi-select)</label>
                    <input
                      type="file"
                      name="files"
                      multiple
                      required
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                      className="block w-full text-sm text-slate-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={docUploadBusy}
                    className="inline-flex items-center justify-center rounded-lg bg-brand-500 text-white text-sm font-semibold px-4 py-2 hover:bg-brand-600 disabled:opacity-50"
                  >
                    {docUploadBusy ? 'Uploading…' : 'Upload to this client'}
                  </button>
                </form>
              </div>

              <div className="space-y-3">
                {client.documents && client.documents.length > 0 ? (
                  client.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-start gap-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300"
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <FileText size={18} className="text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{doc.title}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {doc.documentType} • {new Date(doc.createdAt).toLocaleDateString()}
                          {doc.fileName && ` • ${doc.fileName}`}
                        </p>
                        {doc.fileUrl && (
                          <button
                            type="button"
                            onClick={() => openAuthenticatedFile(`/api/secure-files/client-documents/${doc.id}/download`)}
                            className="text-xs text-brand-600 hover:text-brand-700 mt-2 inline-flex items-center gap-1"
                          >
                            <ExternalLink size={12} /> Open file
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 bg-white rounded-lg border border-slate-200 text-slate-500">
                    No documents yet — upload above.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'agreements' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {client.agreements && client.agreements.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Type</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Title</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Period</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Rate / commercial</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Doc</th>
                      </tr>
                    </thead>
                    <tbody>
                      {client.agreements.map((agr) => (
                        <tr key={agr.id} className="border-t border-slate-100">
                          <td className="px-4 py-3">{agr.agreementType}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{agr.title || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">{agr.status}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {agr.startDate ? new Date(agr.startDate).toLocaleDateString() : '—'}
                            {agr.endDate ? ` → ${new Date(agr.endDate).toLocaleDateString()}` : ''}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <span className="block text-xs uppercase text-slate-500">{agr.rateType}</span>
                            {agr.billRate != null
                              ? `${agr.currency || 'MYR'} ${agr.billRate} bill`
                              : 'Commercial detail restricted for your role'}
                          </td>
                          <td className="px-4 py-3">
                            {agr.documentUrl ? (
                              /^https?:\/\//i.test(agr.documentUrl.trim()) ? (
                                <a
                                  href={agr.documentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
                                >
                                  <ExternalLink size={14} /> PDF
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openAuthenticatedFile(`/api/secure-files/client-agreements/${agr.id}/download`)}
                                  className="text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
                                >
                                  <ExternalLink size={14} /> PDF
                                </button>
                              )
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 text-slate-500">No agreements linked to this client yet.</div>
              )}
              <p className="text-xs text-slate-500 px-4 py-3 border-t border-slate-100 bg-slate-50/80">
                Finance roles see full rate fields; sales sees agreement metadata without cross-client access.
              </p>
            </div>
          )}

          {activeTab === 'submission' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">How submissions are mapped to this client</h3>
                <p className="text-sm text-slate-600 max-w-3xl">
                  Aligns with your sales workflow: email subject line and spreadsheet column order recruiters should use when sending profiles to this client.
                  Job records and candidate applications stay linked in the ATS; this section is the client-facing packaging guide.
                </p>
              </div>
              {(() => {
                const fmt = parseSubmissionFormat(client.submissionFormat);
                if (!fmt) {
                  return (
                    <p className="text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg p-6">
                      No submission template saved yet. Ask an admin to set <strong>submissionFormat</strong> on the client record, or use the demo pilot client which ships with a starter template.
                    </p>
                  );
                }
                if (fmt._raw) {
                  return (
                    <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
                      {fmt._raw}
                    </pre>
                  );
                }
                return (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Email subject (merge hints)</p>
                      <p className="text-sm font-mono text-slate-900">{fmt.emailSubject || '—'}</p>
                      {fmt.emailBodyHint && (
                        <p className="text-xs text-slate-600 mt-3">{fmt.emailBodyHint}</p>
                      )}
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Excel / export column order</p>
                      <ol className="list-decimal list-inside text-sm text-slate-800 space-y-1">
                        {(fmt.excelColumnOrder || []).map((col, i) => (
                          <li key={i}>{col}</li>
                        ))}
                      </ol>
                      {(!fmt.excelColumnOrder || fmt.excelColumnOrder.length === 0) && (
                        <p className="text-sm text-slate-500">No columns listed.</p>
                      )}
                    </div>
                  </div>
                );
              })()}
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/sales/requirements"
                  className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  Open client requirements tracker →
                </Link>
                <Link
                  href="/jobs/create"
                  className="inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  New client requirement (JD) →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
