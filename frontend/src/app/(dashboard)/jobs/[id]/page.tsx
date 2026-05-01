'use client';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi, applicationsApi, candidatesApi, submissionsApi, usersApi } from '@/lib/api-client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Briefcase, MapPin, DollarSign, Users, Clock, ArrowLeft,
  Zap, ChevronRight, CheckCircle, XCircle, ChevronDown, ChevronUp, X,
  UserPlus, Calendar, Search, Loader2, MessageSquare, UserCheck,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';
import { BusinessIdBadge } from '@/components/layout/business-id-badge';
import { useAuthStore } from '@/store/auth.store';

function dualDate(d: string | Date | null | undefined): { abs: string; rel: string } {
  if (!d) return { abs: '—', rel: '' };
  const dt = new Date(d);
  return {
    abs: format(dt, 'dd MMM yyyy, HH:mm'),
    rel: formatDistanceToNow(dt, { addSuffix: true }),
  };
}

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

const SUB_STAGE_COLORS: Record<string, string> = {
  DRAFT:               'bg-gray-100 text-gray-600',
  INTERNAL_REVIEW:     'bg-violet-100 text-violet-700',
  SUBMITTED_TO_SALES:  'bg-blue-100 text-blue-700',
  SUBMITTED_TO_CLIENT: 'bg-cyan-100 text-cyan-700',
  CLIENT_REVIEW:       'bg-yellow-100 text-yellow-700',
  INTERVIEW:           'bg-orange-100 text-orange-700',
  OFFER:               'bg-emerald-100 text-emerald-700',
  JOINED:              'bg-green-100 text-green-700',
  REJECTED:            'bg-red-100 text-red-700',
  WITHDRAWN:           'bg-gray-200 text-gray-600',
};

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);
  const canAssignRecruiter = user?.role === 'TENANT_ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'SALES';
  const [showFullJD, setShowFullJD] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [linkSearch, setLinkSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'pipeline' | 'submissions'>('pipeline');
  const [feedbackTarget, setFeedbackTarget] = useState<any>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackStage, setFeedbackStage] = useState('');

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsApi.get(id),
  });

  const { data: applicationsData } = useQuery({
    queryKey: ['applications', 'job', id],
    queryFn: () => applicationsApi.list({ jobId: id, limit: 50 }),
    enabled: !!id,
  });

  const { data: submissionsData } = useQuery({
    queryKey: ['submissions', 'job', id],
    queryFn: () => submissionsApi.list({ jobId: id, limit: 100 }),
    enabled: !!id && activeTab === 'submissions',
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

  const clientFeedbackMutation = useMutation({
    mutationFn: ({ subId, feedback, stage }: { subId: string; feedback: string; stage: string }) =>
      submissionsApi.clientFeedback(subId, { feedback, stage: stage || undefined }),
    onSuccess: () => {
      toast.success('Feedback saved');
      queryClient.invalidateQueries({ queryKey: ['submissions', 'job', id] });
      setFeedbackTarget(null);
      setFeedbackText('');
      setFeedbackStage('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to save feedback'),
  });

  const linkCandidateMutation = useMutation({
    mutationFn: (candidateId: string) => applicationsApi.create({ candidateId, jobId: id, stage: 'SOURCED' }),
    onSuccess: () => {
      toast.success('Candidate linked to job');
      queryClient.invalidateQueries({ queryKey: ['applications', 'job', id] });
      setShowLinkModal(false);
      setLinkSearch('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to link candidate'),
  });

  const { data: candidateSearchData } = useQuery({
    queryKey: ['candidates', 'search', linkSearch],
    queryFn: () => candidatesApi.list({ search: linkSearch, limit: 10 }),
    enabled: showLinkModal && linkSearch.length >= 2,
  });

  const { data: recruiters } = useQuery({
    queryKey: ['team', 'recruiters'],
    queryFn: () => usersApi.listRecruiters(),
    enabled: showAssignModal,
  });

  const assignRecruiterMutation = useMutation({
    mutationFn: (recruiterId: string | null) => jobsApi.update(id, { assignedRecruiterId: recruiterId }),
    onSuccess: () => {
      toast.success(assignRecruiterMutation.variables ? 'Recruiter assigned' : 'Recruiter unassigned');
      queryClient.invalidateQueries({ queryKey: ['job', id] });
      setShowAssignModal(false);
      setAssignSearch('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to assign recruiter'),
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
                    {dualDate(job.createdAt).abs} · {dualDate(job.createdAt).rel}
                  </span>
                </div>
                {/* Assigned Recruiter */}
                <div className="flex items-center gap-2 mt-3">
                  {job.assignedRecruiterId ? (
                    <div className="flex items-center gap-2 text-sm">
                      <UserCheck className="w-4 h-4 text-green-500" />
                      <span className="text-gray-600">Assigned to:</span>
                      <span className="font-semibold text-gray-900">
                        {job.assignedRecruiter?.firstName ?? ''} {job.assignedRecruiter?.lastName ?? job.assignedRecruiterId}
                      </span>
                      {canAssignRecruiter && (
                        <button
                          onClick={() => setShowAssignModal(true)}
                          className="text-xs text-brand-600 hover:text-brand-700 font-medium underline underline-offset-2"
                        >
                          Change
                        </button>
                      )}
                    </div>
                  ) : (
                    canAssignRecruiter && (
                      <button
                        onClick={() => setShowAssignModal(true)}
                        className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 font-medium"
                      >
                        <UserPlus className="w-4 h-4" /> Assign Recruiter
                      </button>
                    )
                  )}
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

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['pipeline', 'submissions'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
              activeTab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'pipeline'
              ? `Pipeline (${applications.length})`
              : `Submissions (${(submissionsData?.data ?? []).length})`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column – Pipeline tab / Submissions tab */}
        <div className="lg:col-span-2 space-y-4">
          {activeTab === 'pipeline' && <>
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
              <button
                onClick={() => setShowLinkModal(true)}
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" /> Link Candidate
              </button>
            </div>
            {applications.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm mb-3">No candidates linked to this job yet</p>
                <button
                  onClick={() => setShowLinkModal(true)}
                  className="btn-primary text-sm inline-flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" /> Link First Candidate
                </button>
              </div>
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
                      <td className="px-4 py-3 text-xs">
                        {app.appliedAt ? (
                          <div>
                            <div className="text-gray-700">{dualDate(app.appliedAt).abs}</div>
                            <div className="text-gray-400">{dualDate(app.appliedAt).rel}</div>
                          </div>
                        ) : <span className="text-gray-300">—</span>}
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
          </>}

          {activeTab === 'submissions' && (
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  Client Submissions ({(submissionsData?.data ?? []).length})
                </h2>
              </div>
              {(submissionsData?.data ?? []).length === 0 ? (
                <div className="py-12 text-center">
                  <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No submissions for this job yet</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Candidate</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stage</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Submitted</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Client Feedback</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(submissionsData?.data ?? []).map((sub: any) => (
                      <tr key={sub.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/candidates/${sub.candidateId}`}
                            className="font-medium text-gray-900 hover:text-brand-600 flex items-center gap-1"
                          >
                            {sub.candidate?.firstName} {sub.candidate?.lastName}
                            <ChevronRight className="w-3 h-3 text-gray-400" />
                          </Link>
                          {sub.candidate?.currentTitle && (
                            <div className="text-xs text-gray-400">{sub.candidate.currentTitle}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${SUB_STAGE_COLORS[sub.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                            {sub.stage?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {sub.submittedAt ? dualDate(sub.submittedAt).abs : dualDate(sub.createdAt).abs}
                        </td>
                        <td className="px-4 py-3">
                          {sub.clientFeedback ? (
                            <p className="text-xs text-gray-700 max-w-xs line-clamp-2">{sub.clientFeedback}</p>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              setFeedbackTarget(sub);
                              setFeedbackText(sub.clientFeedback ?? '');
                              setFeedbackStage(sub.stage ?? '');
                            }}
                            className="btn-secondary py-1 px-2 text-xs flex items-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3" /> Feedback
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Job details sidebar */}
        <div className="space-y-4">
          {/* Description */}
          {job.description && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">Description</h2>
                <button
                  onClick={() => setShowFullJD(true)}
                  className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                >
                  View Full JD <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Preview — max 4 lines */}
              <div className="relative">
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-4 whitespace-pre-wrap">{job.description}</p>
                <button
                  onClick={() => setShowFullJD(true)}
                  className="mt-2 flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                >
                  <ChevronDown className="w-3.5 h-3.5" /> Show more
                </button>
              </div>
            </div>
          )}

          {/* Full JD Modal */}
          {showFullJD && job.description && (
            <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{job.title}</h2>
                    {job.department && <p className="text-sm text-gray-500">{job.department}</p>}
                  </div>
                  <button
                    onClick={() => setShowFullJD(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="px-6 py-5">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {job.location && (
                      <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        <MapPin className="w-3 h-3" /> {job.location}
                      </span>
                    )}
                    {job.workMode && <span className="badge-blue text-xs">{job.workMode}</span>}
                    {job.employmentType && <span className="badge-gray text-xs">{job.employmentType}</span>}
                    {(job.salaryMin || job.salaryMax) && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                        <DollarSign className="w-3 h-3" />
                        {job.salaryCurrency ?? 'USD'} {job.salaryMin?.toLocaleString()} – {job.salaryMax?.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">{job.description}</pre>
                  {job.requirements?.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-semibold text-gray-900 mb-3">Requirements</h3>
                      <ul className="space-y-1.5">
                        {job.requirements.map((r: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />{r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {job.skills?.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-semibold text-gray-900 mb-3">Required Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {job.skills.map((s: string, i: number) => (
                          <span key={i} className="badge-blue text-xs">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="px-6 pb-5">
                  <button
                    onClick={() => setShowFullJD(false)}
                    className="btn-secondary w-full"
                  >
                    <ChevronUp className="w-4 h-4" /> Close
                  </button>
                </div>
              </div>
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
                { label: 'Openings', value: job.openings ?? 1 },
              ].filter(d => d.value != null && d.value !== '').map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-900">{value}</dd>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-2 space-y-2">
                <div className="flex justify-between">
                  <dt className="text-gray-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Created</dt>
                  <dd className="text-right">
                    <div className="font-medium text-gray-900 text-xs">{dualDate(job.createdAt).abs}</div>
                    <div className="text-gray-400 text-xs">{dualDate(job.createdAt).rel}</div>
                  </dd>
                </div>
                {job.updatedAt && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Updated</dt>
                    <dd className="text-right">
                      <div className="font-medium text-gray-900 text-xs">{dualDate(job.updatedAt).abs}</div>
                      <div className="text-gray-400 text-xs">{dualDate(job.updatedAt).rel}</div>
                    </dd>
                  </div>
                )}
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Assign Recruiter Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-16">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-brand-600" /> Assign Recruiter
              </h2>
              <button onClick={() => { setShowAssignModal(false); setAssignSearch(''); }} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search recruiters…"
                  value={assignSearch}
                  onChange={e => setAssignSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  autoFocus
                />
              </div>
              {!recruiters ? (
                <div className="py-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></div>
              ) : (recruiters as any[]).length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-6">No recruiters found in your team</p>
              ) : (
                <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                  {(recruiters as any[])
                    .filter((r: any) => {
                      const q = assignSearch.toLowerCase();
                      return !q || `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q);
                    })
                    .map((r: any) => {
                      const isAssigned = job.assignedRecruiterId === r.id;
                      return (
                        <li key={r.id} className="flex items-center justify-between py-3 px-1 hover:bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{r.firstName} {r.lastName}</div>
                            <div className="text-xs text-gray-400">{r.email}</div>
                          </div>
                          {isAssigned ? (
                            <span className="text-xs text-green-600 font-medium px-2 py-1 bg-green-50 rounded-full flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Assigned
                            </span>
                          ) : (
                            <button
                              onClick={() => assignRecruiterMutation.mutate(r.id)}
                              disabled={assignRecruiterMutation.isPending}
                              className="btn-primary text-xs py-1 px-3"
                            >
                              {assignRecruiterMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Assign'}
                            </button>
                          )}
                        </li>
                      );
                    })}
                </ul>
              )}
              {job.assignedRecruiterId && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => assignRecruiterMutation.mutate(null)}
                    disabled={assignRecruiterMutation.isPending}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Remove assignment
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Link Candidate Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-16">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-brand-600" /> Link Candidate to Job
              </h2>
              <button onClick={() => { setShowLinkModal(false); setLinkSearch(''); }} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or title…"
                  value={linkSearch}
                  onChange={e => setLinkSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  autoFocus
                />
              </div>
              {linkSearch.length < 2 ? (
                <p className="text-center text-gray-400 text-sm py-6">Type at least 2 characters to search candidates</p>
              ) : (candidateSearchData?.data ?? []).length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-6">No candidates found</p>
              ) : (
                <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                  {(candidateSearchData?.data ?? []).map((c: any) => {
                    const alreadyLinked = applications.some((a: any) => a.candidateId === c.id);
                    return (
                      <li key={c.id} className="flex items-center justify-between py-3 px-1 hover:bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{c.firstName} {c.lastName}</div>
                          {c.currentTitle && <div className="text-xs text-gray-400">{c.currentTitle}</div>}
                          {c.email && <div className="text-xs text-gray-400">{c.email}</div>}
                        </div>
                        {alreadyLinked ? (
                          <span className="text-xs text-green-600 font-medium px-2 py-1 bg-green-50 rounded-full">Linked</span>
                        ) : (
                          <button
                            onClick={() => linkCandidateMutation.mutate(c.id)}
                            disabled={linkCandidateMutation.isPending}
                            className="btn-primary text-xs py-1 px-3"
                          >
                            {linkCandidateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Link'}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Client Feedback Modal */}
      {feedbackTarget && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-16">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">Client Feedback</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {feedbackTarget.candidate?.firstName} {feedbackTarget.candidate?.lastName}
                </p>
              </div>
              <button onClick={() => setFeedbackTarget(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Stage</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={feedbackStage}
                  onChange={e => setFeedbackStage(e.target.value)}
                >
                  {Object.keys(SUB_STAGE_COLORS).map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Feedback</label>
                <textarea
                  rows={5}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  placeholder="Enter client feedback..."
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 pb-4">
              <button onClick={() => setFeedbackTarget(null)} className="btn-secondary text-sm">Cancel</button>
              <button
                onClick={() => clientFeedbackMutation.mutate({ subId: feedbackTarget.id, feedback: feedbackText, stage: feedbackStage })}
                disabled={clientFeedbackMutation.isPending || !feedbackText.trim()}
                className="btn-primary text-sm"
              >
                {clientFeedbackMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
