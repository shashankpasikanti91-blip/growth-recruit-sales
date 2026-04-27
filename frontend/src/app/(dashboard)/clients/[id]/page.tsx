'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clientsApi } from '@/lib/api-client';
import Link from 'next/link';
import {
  Building2, Globe, MapPin,
  ChevronLeft, Briefcase, TrendingUp,
  CalendarClock, Clock, Edit2, Plus,
  SendHorizonal,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const TABS = ['Overview', 'JDs', 'Submissions', 'Opportunities', 'Notes', 'Timeline'] as const;
type Tab = (typeof TABS)[number];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:   'bg-emerald-100 text-emerald-700',
  INACTIVE: 'bg-gray-100 text-gray-600',
  PROSPECT: 'bg-blue-100 text-blue-700',
  ON_HOLD:  'bg-amber-100 text-amber-700',
  CLOSED:   'bg-red-100 text-red-700',
};

const fmtDate = (d?: string | Date | null) =>
  d ? format(new Date(d), 'dd MMM yyyy, hh:mm a') : '—';
const fmtShort = (d?: string | Date | null) =>
  d ? format(new Date(d), 'dd MMM yyyy') : '—';
const fmtAgo = (d?: string | Date | null) =>
  d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : '';

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [tab, setTab] = useState<Tab>('Overview');

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientsApi.get(id),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-40 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!client) return <div className="text-center py-20 text-gray-500">Client not found</div>;

  return (
    <div className="space-y-6">
      {/* ── Back ──────────────────────────────────────────────────────────── */}
      <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeft className="w-4 h-4" /> Back to Clients
      </Link>

      {/* ── Header Card ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[client.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {client.status?.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                {client.industry && <span>{client.industry}</span>}
                {(client.city || client.countryCode) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {[client.city, client.countryCode].filter(Boolean).join(', ')}
                  </span>
                )}
                {client.website && (
                  <a href={client.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-blue-600">
                    <Globe className="w-3.5 h-3.5" />
                    {client.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/clients/${id}/edit`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </Link>
            <Link
              href={`/jobs/new?clientId=${id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add JD
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          {[
            { label: 'Total JDs',      value: client._count?.jobs ?? 0,          icon: Briefcase,    color: 'text-blue-600 bg-blue-50' },
            { label: 'Submissions',    value: client._count?.submissions ?? 0,    icon: SendHorizonal,color: 'text-purple-600 bg-purple-50' },
            { label: 'Opportunities',  value: client._count?.opportunities ?? 0,  icon: TrendingUp,   color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Follow Ups',     value: client._count?.followUps ?? 0,      icon: CalendarClock,color: 'text-amber-600 bg-amber-50' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color.split(' ')[1]}`}>
                <Icon className={`w-5 h-5 ${color.split(' ')[0]}`} />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{value}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab Content ───────────────────────────────────────────────────── */}
      {tab === 'Overview' && (
        <div className="grid grid-cols-3 gap-6">
          {/* Details */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Client Details</h3>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: 'Payment Terms',     value: client.paymentTerms },
                { label: 'Submission Format', value: client.submissionFormat },
                { label: 'Billing Contact',   value: client.billingContactName },
                { label: 'Billing Email',     value: client.billingContactEmail },
                { label: 'Address',           value: client.address },
                { label: 'State',             value: client.state },
                { label: 'Created',           value: fmtDate(client.createdAt) },
                { label: 'Last Updated',      value: fmtDate(client.updatedAt) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</dt>
                  <dd className="mt-0.5 text-gray-900">{value ?? '—'}</dd>
                </div>
              ))}
            </dl>
            {client.notes && (
              <div className="pt-4 border-t border-gray-100">
                <dt className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Notes</dt>
                <dd className="text-sm text-gray-700 whitespace-pre-line">{client.notes}</dd>
              </div>
            )}
          </div>

          {/* Upcoming Follow-ups */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-sm">Upcoming Follow Ups</h3>
              <Link href={`/follow-ups?clientId=${id}`} className="text-xs text-blue-600 hover:text-blue-700">View all</Link>
            </div>
            {client.followUps?.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs">No pending follow-ups</div>
            ) : (
              <div className="space-y-3">
                {client.followUps?.map((fu: any) => (
                  <div key={fu.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{fu.subject ?? fu.type}</div>
                      <div className="text-xs text-gray-500">{fmtShort(fu.scheduledAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'JDs' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Job Requirements</h3>
            <Link
              href={`/jobs/new?clientId=${id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              <Plus className="w-3.5 h-3.5" /> New JD
            </Link>
          </div>
          {client.jobs?.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <div>No job requirements yet</div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Job Title', 'Location', 'Priority', 'Openings', 'Applications', 'Target Date', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {client.jobs.map((j: any) => (
                  <tr key={j.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{j.title}</td>
                    <td className="px-4 py-3 text-gray-500">{j.location ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        j.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                        j.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{j.priority}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">{j.openings}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{j._count?.applications ?? 0}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmtShort(j.targetSubmissionDate)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/jobs/${j.id}`} className="text-xs text-blue-600 hover:text-blue-700">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'Submissions' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Candidate Submissions</h3>
          </div>
          {client.submissions?.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <SendHorizonal className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <div>No submissions yet</div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Candidate', 'Job Title', 'Stage', 'AI Score', 'Submitted', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {client.submissions.map((s: any) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {s.candidate?.firstName} {s.candidate?.lastName}
                      {s.candidate?.currentTitle && <div className="text-xs text-gray-500">{s.candidate.currentTitle}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.job?.title}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                        {s.stage?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.aiScore != null ? (
                        <span className={`font-semibold text-sm ${s.aiScore >= 70 ? 'text-emerald-600' : s.aiScore >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                          {s.aiScore.toFixed(0)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmtShort(s.submittedAt ?? s.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/submissions/${s.id}`} className="text-xs text-blue-600 hover:text-blue-700">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'Opportunities' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Opportunities</h3>
            <Link href={`/opportunities?clientId=${id}`} className="text-xs text-blue-600 hover:text-blue-700">View all →</Link>
          </div>
          {client.opportunities?.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No opportunities yet</div>
          ) : (
            <div className="space-y-3">
              {client.opportunities.map((o: any) => (
                <div key={o.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <div className="font-medium text-gray-900">{o.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{o.stage?.replace('_', ' ')}</div>
                  </div>
                  <div className="text-right">
                    {o.value && <div className="font-semibold text-gray-900">{o.currency} {o.value.toLocaleString()}</div>}
                    <div className="text-xs text-gray-500">{o.probability}% probability</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'Notes' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Notes</h3>
          {client.notes ? (
            <p className="text-sm text-gray-700 whitespace-pre-line">{client.notes}</p>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">No notes yet</div>
          )}
        </div>
      )}

      {tab === 'Timeline' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Activity Timeline</h3>
          {client.activities?.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No activity yet</div>
          ) : (
            <div className="space-y-4">
              {client.activities.map((a: any) => (
                <div key={a.id} className="flex gap-4">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{a.title}</div>
                    {a.description && <div className="text-xs text-gray-500 mt-0.5">{a.description}</div>}
                    <div className="text-xs text-gray-400 mt-1">
                      {fmtDate(a.createdAt)} · {fmtAgo(a.createdAt)}
                      {a.user && ` · ${a.user.firstName} ${a.user.lastName}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
