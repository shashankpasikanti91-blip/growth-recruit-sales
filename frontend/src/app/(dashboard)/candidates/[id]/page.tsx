'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidatesApi, applicationsApi, outreachApi } from '@/lib/api-client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Zap, Mail, FileText, ChevronRight, AlertTriangle, X, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

const STAGE_BADGE: Record<string, string> = {
  SOURCED: 'badge-gray', SCREENED: 'badge-purple', SHORTLISTED: 'badge-yellow',
  INTERVIEWING: 'badge-blue', OFFERED: 'badge-green', PLACED: 'badge-green', REJECTED: 'badge-red',
};

const APP_STAGES = ['SOURCED', 'SCREENED', 'SHORTLISTED', 'INTERVIEWING', 'OFFERED', 'PLACED', 'REJECTED'];

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [outreachModal, setOutreachModal] = useState(false);
  const [outreachResult, setOutreachResult] = useState<any>(null);

  const { data: candidate, isLoading } = useQuery({
    queryKey: ['candidate', id],
    queryFn: () => candidatesApi.get(id),
  });

  const screenMutation = useMutation({
    mutationFn: (appId: string) => applicationsApi.screen(appId),
    onSuccess: () => {
      toast.success('AI screening complete!');
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Screening failed'),
  });

  const stageMutation = useMutation({
    mutationFn: ({ appId, stage }: { appId: string; stage: string }) =>
      applicationsApi.updateStage(appId, stage),
    onSuccess: () => {
      toast.success('Stage updated');
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Stage update failed'),
  });

  const outreachMutation = useMutation({
    mutationFn: () =>
      outreachApi.generate({ targetType: 'CANDIDATE', targetId: id, channel: 'EMAIL' }),
    onSuccess: (data) => {
      setOutreachResult(data);
      setOutreachModal(true);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to generate outreach'),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  if (!candidate) return <div className="text-red-500">Candidate not found</div>;

  const latestScore = candidate.scorecards?.[0];

  return (
    <div className="space-y-6">
      {/* AI Outreach Modal */}
      {outreachModal && outreachResult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><Mail className="w-4 h-4 text-brand-600" /> AI-Generated Outreach Email</h3>
              <button onClick={() => setOutreachModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              {outreachResult.subject && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Subject</div>
                  <div className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg px-3 py-2">{outreachResult.subject}</div>
                </div>
              )}
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Message</div>
                <div className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-3 whitespace-pre-wrap max-h-64 overflow-auto leading-relaxed">
                  {outreachResult.message ?? outreachResult.content ?? JSON.stringify(outreachResult)}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button
                onClick={() => {
                  const text = outreachResult.message ?? outreachResult.content ?? '';
                  navigator.clipboard.writeText(text);
                  toast.success('Copied to clipboard!');
                }}
                className="btn-secondary flex-1 flex items-center justify-center gap-1.5"
              >
                <Copy className="w-4 h-4" /> Copy message
              </button>
              {candidate.email && (
                <a
                  href={`mailto:${candidate.email}?subject=${encodeURIComponent(outreachResult.subject ?? '')}&body=${encodeURIComponent(outreachResult.message ?? outreachResult.content ?? '')}`}
                  className="btn-primary flex-1 flex items-center justify-center gap-1.5"
                >
                  <Mail className="w-4 h-4" /> Open in email client
                </a>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xl font-bold">
              {candidate.firstName?.[0]}{candidate.lastName?.[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{candidate.firstName} {candidate.lastName}</h1>
              <div className="text-gray-500">{candidate.currentTitle} {candidate.currentCompany ? `@ ${candidate.currentCompany}` : ''}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className={STAGE_BADGE[candidate.stage] ?? 'badge-gray'}>{candidate.stage}</span>
                {candidate.overallScore != null && (
                  <span className={`text-sm font-semibold ${candidate.overallScore >= 70 ? 'text-green-600' : candidate.overallScore >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                    Score: {candidate.overallScore}/100
                  </span>
                )}
                {candidate.countryCode && <span className="badge-gray">{candidate.countryCode}</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => outreachMutation.mutate()}
              disabled={outreachMutation.isPending}
              className="btn-primary flex items-center gap-1.5"
              title="Generate AI outreach email for this candidate"
            >
              <Mail className="w-4 h-4" />
              {outreachMutation.isPending ? 'Generating...' : 'AI Email'}
            </button>
            {candidate.email && (
              <a href={`mailto:${candidate.email}`} className="btn-secondary" title="Open native email client">
                Direct Email
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Applications */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" /> Applications ({candidate.applications?.length ?? 0})
            </h2>
            {candidate.applications?.length === 0 ? (
              <p className="text-gray-400 text-sm">No applications yet</p>
            ) : (
              <div className="space-y-3">
                {candidate.applications?.map((app: any) => (
                  <div key={app.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50">
                    <div>
                      <Link href={`/jobs/${app.jobId}`} className="font-medium text-sm text-gray-900 hover:text-brand-600 flex items-center gap-1">
                        {app.job?.title}
                        <ChevronRight className="w-3 h-3 text-gray-400" />
                      </Link>
                      <div className="text-xs text-gray-400">{app.job?.department}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                        value={app.stage}
                        onChange={e => stageMutation.mutate({ appId: app.id, stage: e.target.value })}
                        disabled={stageMutation.isPending}
                      >
                        {APP_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button
                        onClick={() => screenMutation.mutate(app.id)}
                        disabled={screenMutation.isPending}
                        className="btn-secondary py-1 px-2 text-xs"
                        title="Run AI Screening"
                      >
                        <Zap className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Analyses */}
          {candidate.aiAnalyses?.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Latest AI Screening Result</h2>
              {(() => {
                const analysis = candidate.aiAnalyses[0];
                const result = analysis?.result as any;
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`text-3xl font-bold ${result?.score >= 70 ? 'text-green-600' : result?.score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                        {result?.score ?? '—'}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{result?.decision}</div>
                        <div className="text-xs text-gray-400">AI Decision</div>
                      </div>
                    </div>
                    {result?.summary && (
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{result.summary}</p>
                    )}
                    {result?.redFlags?.length > 0 && (
                      <div className="flex items-start gap-2 text-amber-600 bg-amber-50 rounded-lg p-3">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <p className="text-xs">{result.redFlags.join(', ')}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-3">Details</h2>
            <dl className="space-y-2 text-sm">
              {[
                { label: 'Email', value: candidate.email },
                { label: 'Phone', value: candidate.phone },
                { label: 'Experience', value: candidate.yearsExperience ? `${candidate.yearsExperience} yrs` : null },
                { label: 'Location', value: candidate.location },
                { label: 'Source', value: candidate.source },
                { label: 'Added', value: candidate.createdAt ? formatDistanceToNow(new Date(candidate.createdAt), { addSuffix: true }) : null },
              ].filter(d => d.value).map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-900 text-right max-w-[60%] truncate">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Visa & Immigration Info */}
          {(candidate.nationality || candidate.visaType || candidate.isForeigner) && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-3">Visa & Immigration</h2>
              <dl className="space-y-2 text-sm">
                {candidate.nationality && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Nationality</dt>
                    <dd className="font-medium text-gray-900">{candidate.nationality}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-500">Status</dt>
                  <dd>
                    {candidate.isForeigner ? (
                      <span className="badge-yellow text-xs">Foreign Worker</span>
                    ) : (
                      <span className="badge-green text-xs">{candidate.visaStatus === 'PR' ? 'PR' : 'Citizen / Local'}</span>
                    )}
                  </dd>
                </div>
                {candidate.visaType && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Visa Type</dt>
                    <dd className="font-medium text-gray-900">{candidate.visaType}</dd>
                  </div>
                )}
                {candidate.visaExpiry && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Visa Expiry</dt>
                    <dd className={`font-medium ${new Date(candidate.visaExpiry) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) ? 'text-red-600' : 'text-gray-900'}`}>
                      {new Date(candidate.visaExpiry).toLocaleDateString()}
                      {new Date(candidate.visaExpiry) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) && (
                        <span className="text-xs text-red-500 block">Expiring soon!</span>
                      )}
                    </dd>
                  </div>
                )}
                {candidate.visaStatus && candidate.visaStatus !== 'CITIZEN' && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Visa Status</dt>
                    <dd>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        candidate.visaStatus === 'VALID' ? 'bg-green-100 text-green-700' :
                        candidate.visaStatus === 'EXPIRING_SOON' ? 'bg-amber-100 text-amber-700' :
                        candidate.visaStatus === 'EXPIRED' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {candidate.visaStatus}
                      </span>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {candidate.skills?.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-3">Skills</h2>
              <div className="flex flex-wrap gap-1">
                {candidate.skills.map((skill: string) => (
                  <span key={skill} className="badge-blue text-xs">{skill}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
