'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi, applicationsApi, candidatesApi } from '@/lib/api-client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Briefcase, MapPin, DollarSign, Users, Clock, ArrowLeft,
  Zap, ChevronRight, CheckCircle, XCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { BusinessIdBadge } from '@/components/layout/business-id-badge';

const STAGE_COLORS: Record<string, string> = {
  SOURCED: 'bg-gray-100 text-gray-700',
  SCREENED: 'bg-purple-100 text-purple-700',
  INTERVIEWING: 'bg-blue-100 text-blue-700',
  OFFERED: 'bg-cyan-100 text-cyan-700',
  PLACED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  WITHDRAWN: 'bg-yellow-100 text-yellow-700',
};

const APP_STAGES = ['SOURCED', 'SCREENED', 'INTERVIEWING', 'OFFERED', 'PLACED', 'REJECTED', 'WITHDRAWN'];

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsApi.get(id),
  });

  const { data: applicationsData } = useQuery({
    queryKey: ['applications', 'job', id],
    queryFn: () => applicationsApi.list({ jobId: id, limit: 50 }),
    enabled: !!id,
  });

  const screenMutation = useMutation({
    mutationFn: (appId: string) => applicationsApi.screen(appId),
    onSuccess: () => {
      toast.success('AI screening complete!');
      queryClient.invalidateQueries({ queryKey: ['applications', 'job', id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Screening failed'),
  });

  const stageMutation = useMutation({
    mutationFn: ({ appId, stage }: { appId: string; stage: string }) =>
      applicationsApi.updateStage(appId, stage),
    onSuccess: () => {
      toast.success('Stage updated');
      queryClient.invalidateQueries({ queryKey: ['applications', 'job', id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Stage update failed'),
  });

  const closeMutation = useMutation({
    mutationFn: () => jobsApi.close(id),
    onSuccess: () => {
      toast.success('Job closed');
      queryClient.invalidateQueries({ queryKey: ['job', id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to close job'),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  if (!job) return <div className="text-center py-16 text-gray-400">Job not found</div>;

  const applications = applicationsData?.data ?? [];

  const stageCounts = APP_STAGES.reduce((acc, s) => {
    acc[s] = applications.filter((a: any) => a.stage === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Jobs
        </button>
        <div className="card">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-brand-100 flex items-center justify-center">
                <Briefcase className="w-7 h-7 text-brand-600" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
                  <BusinessIdBadge businessId={job.businessId} />
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${job.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {job.isActive ? 'Open' : 'Closed'}
                  </span>
                </div>
                <div className="text-gray-500 text-sm mt-1">{job.department}</div>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                  {job.location && (
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>
                  )}
                  {job.workMode && <span className="badge-blue text-xs">{job.workMode}</span>}
                  {job.employmentType && <span className="badge-gray text-xs">{job.employmentType}</span>}
                  {(job.salaryMin || job.salaryMax) && (
                    <span className="flex items-center gap-1 text-green-600 font-medium">
                      <DollarSign className="w-3.5 h-3.5" />
                      {job.salaryCurrency ?? 'USD'} {job.salaryMin?.toLocaleString()} – {job.salaryMax?.toLocaleString()}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-gray-400">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {job.isActive && (
                <button
                  onClick={() => { if (confirm('Close this job?')) closeMutation.mutate(); }}
                  className="btn-secondary text-sm"
                  disabled={closeMutation.isPending}
                >
                  <XCircle className="w-4 h-4" /> Close Job
                </button>
              )}
              <Link href={`/ai/screen?jobId=${id}`} className="btn-primary text-sm">
                <Zap className="w-4 h-4" /> AI Screen
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Applications pipeline */}
        <div className="lg:col-span-2 space-y-4">
          {/* Pipeline summary */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {APP_STAGES.map(s => (
              <div key={s} className="card p-3 text-center">
                <div className="text-lg font-bold text-gray-800">{stageCounts[s]}</div>
                <div className="text-xs text-gray-500 mt-1 truncate">{s}</div>
              </div>
            ))}
          </div>

          {/* Applications table */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" /> Candidates ({applications.length})
              </h2>
            </div>
            {applications.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No applications yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Candidate</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stage</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">AI Score</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Applied</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {applications.map((app: any) => (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/candidates/${app.candidateId}`} className="font-medium text-gray-900 hover:text-brand-600 flex items-center gap-1">
                          {app.candidate?.firstName} {app.candidate?.lastName}
                          <ChevronRight className="w-3 h-3 text-gray-400" />
                        </Link>
                        {app.candidate?.currentTitle && (
                          <div className="text-xs text-gray-400">{app.candidate.currentTitle}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                          value={app.stage}
                          onChange={e => stageMutation.mutate({ appId: app.id, stage: e.target.value })}
                          disabled={stageMutation.isPending}
                        >
                          {APP_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {app.aiScore != null ? (
                          <span className={`font-semibold ${app.aiScore >= 70 ? 'text-green-600' : app.aiScore >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                            {app.aiScore}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {app.appliedAt ? formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => screenMutation.mutate(app.id)}
                          disabled={screenMutation.isPending}
                          className="btn-secondary py-1 px-2 text-xs"
                          title="Run AI Screening"
                        >
                          <Zap className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Job details sidebar */}
        <div className="space-y-4">
          {/* Description */}
          {job.description && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-3">Description</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{job.description}</p>
            </div>
          )}

          {/* Requirements */}
          {job.requirements?.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-3">Requirements</h2>
              <ul className="space-y-1.5">
                {job.requirements.map((r: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Skills */}
          {job.skills?.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-3">Required Skills</h2>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((s: string) => (
                  <span key={s} className="badge-blue text-xs">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-3">Details</h2>
            <dl className="space-y-2 text-sm">
              {[
                { label: 'Department', value: job.department },
                { label: 'Location', value: job.location },
                { label: 'Work Mode', value: job.workMode },
                { label: 'Employment', value: job.employmentType },
                { label: 'Experience', value: job.experienceMin != null ? `${job.experienceMin}+ yrs` : null },
                { label: 'Headcount', value: job.headcount },
              ].filter(d => d.value).map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
