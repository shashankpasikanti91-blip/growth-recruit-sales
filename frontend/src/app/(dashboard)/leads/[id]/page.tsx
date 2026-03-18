'use client';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '@/lib/api-client';
import { ArrowLeft, Zap, Mail, Phone, Globe, Building2, Clock } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

const STAGE_ACTIONS: Record<string, string> = {
  NEW: '🆕 New',
  CONTACTED: '📧 Contacted',
  QUALIFIED: '✅ Qualified',
  PROPOSAL: '📄 Proposal',
  NEGOTIATION: '🤝 Negotiation',
  WON: '🏆 Won',
  LOST: '❌ Lost',
  DORMANT: '💤 Dormant',
};

const STAGES = Object.keys(STAGE_ACTIONS);

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: lead, isLoading } = useQuery({
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
      toast.success(`ICP Score: ${result.score}/100 — ${result.recommendation}`, { duration: 6000 });
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'AI scoring failed'),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  if (!lead) return <div className="text-center py-16 text-gray-400">Lead not found</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Leads
        </button>
      </div>

      {/* Header card */}
      <div className="card">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-brand-100 flex items-center justify-center text-2xl font-bold text-brand-600">
              {lead.fullName?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{lead.fullName}</h1>
              {lead.title && <p className="text-gray-500 text-sm">{lead.title}</p>}
              {(lead.company?.name || lead.companyName) && (
                <p className="text-gray-400 text-sm flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {lead.company?.name ?? lead.companyName}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 flex-wrap text-sm text-gray-500">
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-brand-600">
                    <Mail className="w-3.5 h-3.5" /> {lead.email}
                  </a>
                )}
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-brand-600">
                    <Phone className="w-3.5 h-3.5" /> {lead.phone}
                  </a>
                )}
                {lead.linkedinUrl && (
                  <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-brand-600">
                    <Globe className="w-3.5 h-3.5" /> LinkedIn
                  </a>
                )}
              </div>
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
              {scoreMutation.isPending ? 'Scoring...' : 'Run AI Score'}
            </button>
          </div>
        </div>
      </div>

      {/* AI Score card */}
      {lead.aiScore != null && (
        <div className="card bg-purple-50 border-purple-100">
          <h2 className="font-semibold text-purple-900 mb-3 text-sm">AI ICP Score</h2>
          <div className="flex items-center gap-4">
            <div className={`text-4xl font-extrabold ${lead.aiScore >= 70 ? 'text-green-600' : lead.aiScore >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
              {lead.aiScore}<span className="text-lg text-gray-400 font-normal">/100</span>
            </div>
            {lead.aiScoreBreakdown && (
              <div className="flex-1 grid grid-cols-2 gap-2 text-xs text-purple-800">
                {Object.entries(lead.aiScoreBreakdown).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="capitalize">{k.replace(/_/g, ' ')}</span>
                    <span className="font-semibold">{v as number}/100</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {lead.aiRecommendation && (
            <p className="text-sm text-purple-700 mt-3 leading-relaxed">{lead.aiRecommendation}</p>
          )}
        </div>
      )}

      {/* Details */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-3 text-sm">Details</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {lead.source && (
            <>
              <dt className="text-gray-500">Source</dt>
              <dd className="text-gray-900 font-medium">{lead.source.replace(/_/g, ' ')}</dd>
            </>
          )}
          {lead.country && (
            <>
              <dt className="text-gray-500">Country</dt>
              <dd className="text-gray-900 font-medium">{lead.country}</dd>
            </>
          )}
          <dt className="text-gray-500">Added</dt>
          <dd className="text-gray-900 font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            {format(new Date(lead.createdAt), 'dd MMM yyyy')} ({formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })})
          </dd>
        </dl>
        {lead.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
            <p className="text-sm text-gray-700 leading-relaxed">{lead.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
