'use client';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '@/lib/api-client';
import {
  ArrowLeft, Zap, Mail, Phone, Globe, Building2, Clock,
  MapPin, Linkedin, User, Briefcase, Hash, Star, Tag,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';
import { BusinessIdBadge } from '@/components/layout/business-id-badge';

const STAGE_ACTIONS: Record<string, string> = {
  NEW: '🆕 New',
  CONTACTED: '📧 Contacted',
  QUALIFIED: '✅ Qualified',
  PROPOSAL: '📄 Proposal',
  NEGOTIATION: '🤝 Negotiation',
  CLOSED_WON: '🏆 Won',
  CLOSED_LOST: '❌ Lost',
};
const STAGES = Object.keys(STAGE_ACTIONS);

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  apollo: { label: 'Apollo B2B', color: 'bg-purple-100 text-purple-700' },
  google_maps: { label: 'Google Maps', color: 'bg-green-100 text-green-700' },
  google_search: { label: 'Google Search', color: 'bg-blue-100 text-blue-700' },
  apify: { label: 'Apify', color: 'bg-orange-100 text-orange-700' },
  manual: { label: 'Manual', color: 'bg-gray-100 text-gray-600' },
  csv: { label: 'CSV Import', color: 'bg-teal-100 text-teal-700' },
};

function InfoRow({ icon: Icon, label, value, href }: { icon: React.ElementType; label: string; value?: string | null; href?: string }) {
  if (!value) return null;
  const content = (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-900 font-medium break-words">{value}</p>
      </div>
    </div>
  );
  if (href) {
    return (
      <a href={href.startsWith('http') ? href : `https://${href}`} target="_blank" rel="noopener noreferrer" className="hover:bg-gray-50 rounded-lg -mx-2 px-2 transition-colors">
        {content}
      </a>
    );
  }
  return content;
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: lead, isLoading, error } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadsApi.get(id),
  });

  const stageMutation = useMutation({
    mutationFn: (stage: string) => leadsApi.updateStage(id, stage),
    onSuccess: () => {
      toast.success('Stage updated');
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Update failed'),
  });

  const scoreMutation = useMutation({
    mutationFn: () => leadsApi.score(id),
    onSuccess: (result: any) => {
      toast.success(`ICP Score: ${result.score}/100`, { duration: 6000 });
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'AI scoring failed'),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading lead…</div>;
  if (error || !lead) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16 space-y-4">
        <p className="text-gray-400 text-lg">Lead not found or failed to load.</p>
        <button onClick={() => router.push('/leads')} className="btn-primary">Back to Leads</button>
      </div>
    );
  }

  const raw = lead.rawData ?? {};
  const src = SOURCE_LABELS[lead.sourceName] ?? { label: lead.sourceName ?? 'Unknown', color: 'bg-gray-100 text-gray-600' };
  const fullName = `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim() || 'Unknown';

  // Parse score details — handles nested icpScore structure
  const scoreData = lead.scoreDetails?.icpScore ?? lead.scoreDetails;
  const scoreValue = lead.score ?? scoreData?.score ?? null;
  const scoreExplanation = scoreData?.explanation ?? null;
  const scoreBreakdown = scoreData?.breakdown ?? null;
  const scoreNextAction = scoreData?.nextBestAction ?? null;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Back */}
      <button onClick={() => router.push('/leads')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to Leads
      </button>

      {/* ── Header Card ── */}
      <div className="card">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-brand-100 flex items-center justify-center text-2xl font-bold text-brand-600">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{fullName}</h1>
                <BusinessIdBadge businessId={lead.businessId} />
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${src.color}`}>{src.label}</span>
              </div>
              {lead.title && <p className="text-gray-500 text-sm mt-0.5">{lead.title}</p>}
              {(lead.company?.name || raw.companyName) && (
                <p className="text-gray-400 text-sm flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3.5 h-3.5" />
                  {lead.company?.name ?? raw.companyName}
                  {(lead.company?.industry || raw.companyIndustry) && (
                    <span className="text-xs text-gray-300 ml-1">· {lead.company?.industry ?? raw.companyIndustry}</span>
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <select
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={lead.stage}
              onChange={e => stageMutation.mutate(e.target.value)}
              disabled={stageMutation.isPending}
            >
              {STAGES.map(s => <option key={s} value={s}>{STAGE_ACTIONS[s]}</option>)}
            </select>
            <button
              onClick={() => scoreMutation.mutate()}
              disabled={scoreMutation.isPending}
              className="inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 font-medium"
            >
              <Zap className="w-4 h-4" />
              {scoreMutation.isPending ? 'Scoring…' : 'Run AI Score'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Contact Information ── */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-2 text-sm">Contact Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <InfoRow icon={Mail} label="Email" value={lead.email} href={lead.email ? `mailto:${lead.email}` : undefined} />
          <InfoRow icon={Phone} label="Phone" value={lead.phone} href={lead.phone ? `tel:${lead.phone}` : undefined} />
          <InfoRow icon={Linkedin} label="LinkedIn" value={lead.linkedinUrl ? 'View Profile' : null} href={lead.linkedinUrl} />
          <InfoRow icon={Globe} label="Website" value={lead.company?.website || raw.website || raw.companyWebsite} href={lead.company?.website || raw.website || raw.companyWebsite} />
          <InfoRow icon={MapPin} label="Location" value={[raw.city, raw.state, raw.country, raw.address].filter(Boolean).join(', ') || null} />
          <InfoRow icon={Briefcase} label="Seniority" value={raw.seniority} />
          <InfoRow icon={Tag} label="Headline" value={raw.headline} />
          <InfoRow icon={Hash} label="Departments" value={raw.departments?.length ? raw.departments.join(', ') : null} />
        </div>
      </div>

      {/* ── Company Details ── */}
      {(lead.company || raw.companyName) && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-2 text-sm">Company Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <InfoRow icon={Building2} label="Company Name" value={lead.company?.name ?? raw.companyName} />
            <InfoRow icon={Globe} label="Domain" value={lead.company?.domain} />
            <InfoRow icon={Briefcase} label="Industry" value={lead.company?.industry ?? raw.companyIndustry} />
            <InfoRow icon={User} label="Company Size" value={lead.company?.size ?? (raw.companySize ? `~${raw.companySize} employees` : null)} />
            <InfoRow icon={Globe} label="Website" value={lead.company?.website ?? raw.companyWebsite} href={lead.company?.website ?? raw.companyWebsite} />
          </div>
        </div>
      )}

      {/* ── Google Maps Details ── */}
      {lead.sourceName === 'google_maps' && raw.rating && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-2 text-sm">Google Maps Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <InfoRow icon={Star} label="Rating" value={raw.rating ? `${raw.rating} / 5 (${raw.totalRatings ?? 0} reviews)` : null} />
            <InfoRow icon={MapPin} label="Address" value={raw.address} />
            <InfoRow icon={Globe} label="Website" value={raw.website} href={raw.website} />
            <InfoRow icon={Hash} label="Place ID" value={raw.placeId} />
          </div>
        </div>
      )}

      {/* ── AI ICP Score ── */}
      {scoreValue != null && (
        <div className="card bg-purple-50 border-purple-100">
          <h2 className="font-semibold text-purple-900 mb-3 text-sm">AI ICP Score</h2>
          <div className="flex items-start gap-4">
            <div className={`text-4xl font-extrabold ${scoreValue >= 70 ? 'text-green-600' : scoreValue >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
              {scoreValue}<span className="text-lg text-gray-400 font-normal">/100</span>
            </div>
            {scoreBreakdown && typeof scoreBreakdown === 'object' && (
              <div className="flex-1 grid grid-cols-2 gap-2 text-xs text-purple-800">
                {Object.entries(scoreBreakdown).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="capitalize">{k.replace(/_/g, ' ')}</span>
                    <span className="font-semibold">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {scoreExplanation && (
            <p className="text-sm text-purple-700 mt-3 leading-relaxed">{scoreExplanation}</p>
          )}
          {scoreNextAction && (
            <div className="mt-3 bg-white/60 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold text-purple-800 mb-0.5">Suggested Next Action</p>
              <p className="text-sm text-purple-700">{scoreNextAction}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Lead Meta Details ── */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-3 text-sm">Lead Details</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <dt className="text-gray-500">Source</dt>
          <dd><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${src.color}`}>{src.label}</span></dd>
          <dt className="text-gray-500">Stage</dt>
          <dd className="text-gray-900 font-medium">{STAGE_ACTIONS[lead.stage] ?? lead.stage}</dd>
          <dt className="text-gray-500">Added</dt>
          <dd className="text-gray-900 font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            {format(new Date(lead.createdAt), 'dd MMM yyyy')} ({formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })})
          </dd>
          {lead.sourceImportId && (
            <>
              <dt className="text-gray-500">Import ID</dt>
              <dd className="text-gray-600 font-mono text-xs">{lead.sourceImportId}</dd>
            </>
          )}
        </dl>
        {lead.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{lead.notes}</p>
          </div>
        )}
      </div>

      {/* ── Outreach Messages ── */}
      {lead.outreachMessages?.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm">Outreach Messages</h2>
          <div className="divide-y divide-gray-100">
            {lead.outreachMessages.map((msg: any) => (
              <div key={msg.id} className="py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800">{msg.subject ?? 'Outreach'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    msg.status === 'SENT' ? 'bg-green-100 text-green-700' :
                    msg.status === 'REPLIED' ? 'bg-blue-100 text-blue-700' :
                    msg.status === 'BOUNCED' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{msg.status}</span>
                </div>
                {msg.body && <p className="text-xs text-gray-500 line-clamp-2">{msg.body}</p>}
                <p className="text-xs text-gray-400 mt-1">{format(new Date(msg.createdAt), 'dd MMM yyyy HH:mm')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Activity Timeline ── */}
      {lead.activities?.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm">Activity Timeline</h2>
          <div className="space-y-3">
            {lead.activities.map((act: any) => (
              <div key={act.id} className="flex gap-3 text-sm">
                <div className="w-2 h-2 bg-brand-400 rounded-full mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-800">{act.action ?? act.type}</p>
                  {act.details && <p className="text-xs text-gray-400">{typeof act.details === 'string' ? act.details : JSON.stringify(act.details)}</p>}
                  <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
