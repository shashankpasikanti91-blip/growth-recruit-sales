'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidatesApi, applicationsApi, outreachApi, aiApi, jobsApi, submissionsApi, talentPoolsApi } from '@/lib/api-client';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Zap, Mail, FileText, ChevronRight, AlertTriangle, X, Copy,
  Plus, Calendar, Briefcase, CheckCircle, Loader2, ChevronDown, ChevronUp,
  Star, Clock, MessageSquare, Activity, MapPin, Phone, Globe,
  Upload, Download, FileCheck, File, Trash2, ArrowRight, ClipboardList, Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { useState, useRef, useCallback } from 'react';
import { BusinessIdBadge } from '@/components/layout/business-id-badge';
import { useAuthStore } from '@/store/auth.store';

const STAGE_COLORS: Record<string, string> = {
  // Legacy 7-stage colours
  SOURCED:             'bg-gray-100 text-gray-700',
  SCREENED:            'bg-purple-100 text-purple-700',
  INTERVIEWING:        'bg-blue-100 text-blue-700',
  OFFERED:             'bg-emerald-100 text-emerald-700',
  PLACED:              'bg-green-100 text-green-700',
  REJECTED:            'bg-red-100 text-red-700',
  WITHDRAWN:           'bg-amber-100 text-amber-700',
  // 19-status lifecycle colours
  CONTACTED:           'bg-sky-100 text-sky-700',
  INTERESTED:          'bg-teal-100 text-teal-700',
  NOT_INTERESTED:      'bg-rose-100 text-rose-700',
  PROFILE_RECEIVED:    'bg-indigo-100 text-indigo-700',
  SCREENING:           'bg-violet-100 text-violet-700',
  SHORTLISTED:         'bg-cyan-100 text-cyan-700',
  SUBMITTED:           'bg-blue-100 text-blue-700',
  CLIENT_REVIEW:       'bg-yellow-100 text-yellow-700',
  INTERVIEW_SCHEDULED: 'bg-orange-100 text-orange-700',
  INTERVIEW_COMPLETED: 'bg-amber-100 text-amber-700',
  OFFER_PENDING:       'bg-lime-100 text-lime-700',
  OFFER_ACCEPTED:      'bg-emerald-100 text-emerald-700',
  OFFER_DECLINED:      'bg-red-100 text-red-700',
  JOINED:              'bg-green-100 text-green-700',
  ON_HOLD:             'bg-gray-100 text-gray-600',
};

// Allowed transitions client-side mirror (for UI hints only — server enforces)
const STATUS_TRANSITIONS: Record<string, string[]> = {
  SOURCED:             ['CONTACTED', 'ON_HOLD', 'REJECTED', 'WITHDRAWN'],
  CONTACTED:           ['INTERESTED', 'NOT_INTERESTED', 'ON_HOLD', 'WITHDRAWN'],
  INTERESTED:          ['PROFILE_RECEIVED', 'ON_HOLD', 'WITHDRAWN'],
  NOT_INTERESTED:      ['CONTACTED', 'WITHDRAWN'],
  PROFILE_RECEIVED:    ['SCREENING', 'ON_HOLD', 'REJECTED', 'WITHDRAWN'],
  SCREENING:           ['SHORTLISTED', 'ON_HOLD', 'REJECTED', 'WITHDRAWN'],
  SHORTLISTED:         ['SUBMITTED', 'ON_HOLD', 'REJECTED', 'WITHDRAWN'],
  SUBMITTED:           ['CLIENT_REVIEW', 'REJECTED', 'WITHDRAWN'],
  CLIENT_REVIEW:       ['INTERVIEW_SCHEDULED', 'REJECTED', 'WITHDRAWN'],
  INTERVIEW_SCHEDULED: ['INTERVIEW_COMPLETED', 'ON_HOLD', 'WITHDRAWN'],
  INTERVIEW_COMPLETED: ['OFFER_PENDING', 'REJECTED', 'WITHDRAWN'],
  OFFER_PENDING:       ['OFFERED', 'ON_HOLD', 'REJECTED', 'WITHDRAWN'],
  OFFERED:             ['OFFER_ACCEPTED', 'OFFER_DECLINED', 'WITHDRAWN'],
  OFFER_ACCEPTED:      ['JOINED', 'WITHDRAWN'],
  OFFER_DECLINED:      ['SHORTLISTED', 'WITHDRAWN'],
  JOINED:              [],
  ON_HOLD:             ['SOURCED', 'CONTACTED', 'INTERESTED', 'PROFILE_RECEIVED', 'SCREENING', 'SHORTLISTED', 'SUBMITTED'],
  REJECTED:            [],
  WITHDRAWN:           [],
};

const DOC_STATUS_CYCLE: Record<string, string> = { MISSING: 'UPLOADED', UPLOADED: 'VERIFIED', VERIFIED: 'MISSING' };
const DOC_STATUS_STYLE: Record<string, string> = {
  MISSING:  'bg-red-50 text-red-600 border-red-200',
  UPLOADED: 'bg-amber-50 text-amber-700 border-amber-200',
  VERIFIED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const ONBOARDING_DOCS = [
  { key: 'passportStatus',    label: 'Passport' },
  { key: 'visaDocStatus',     label: 'Visa Document' },
  { key: 'offerLetterStatus', label: 'Offer Letter' },
  { key: 'contractStatus',    label: 'Contract' },
  { key: 'bankDetailsStatus', label: 'Bank Details' },
];

const APP_STAGES = ['SOURCED', 'SCREENED', 'INTERVIEWING', 'OFFERED', 'PLACED', 'REJECTED', 'WITHDRAWN'];

const SCORE_TIER = (score: number) =>
  score >= 75 ? { label: 'Hire-Ready', bg: 'bg-green-100 text-green-700', color: 'text-green-600' }
  : score >= 55 ? { label: 'KIV', bg: 'bg-amber-100 text-amber-700', color: 'text-amber-600' }
  : { label: 'Reject', bg: 'bg-red-100 text-red-700', color: 'text-red-500' };

function StarRating({ rating }: { rating: number }) {
  if (!rating) return <span className="text-gray-300 text-xs">No rating</span>;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={"w-4 h-4 " + (i <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />
      ))}
    </div>
  );
}

type TabId = 'overview' | 'resume' | 'applications' | 'screening' | 'notes' | 'timeline' | 'submissions' | 'onboarding';

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'overview',     label: 'Overview',     icon: FileText },
  { id: 'resume',       label: 'Resume',       icon: FileCheck },
  { id: 'applications', label: 'Applications', icon: Briefcase },
  { id: 'submissions',  label: 'Submissions',  icon: CheckCircle },
  { id: 'screening',    label: 'AI Screening', icon: Zap },
  { id: 'notes',        label: 'Notes',        icon: MessageSquare },
  { id: 'timeline',     label: 'Timeline',     icon: Activity },
  { id: 'onboarding',   label: 'Onboarding',   icon: ClipboardList },
];

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>((searchParams.get('tab') as TabId) || 'overview');
  const [outreachModal, setOutreachModal] = useState(false);
  const [outreachResult, setOutreachResult] = useState<any>(null);
  const [linkJobModal, setLinkJobModal] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [linkJobId, setLinkJobId] = useState('');
  const [screenJdModal, setScreenJdModal] = useState(false);
  const [screenJdText, setScreenJdText] = useState('');
  const [screenJobId, setScreenJobId] = useState('');
  const [screenJdSource, setScreenJdSource] = useState<'paste' | 'job'>('job');
  const [screenResult, setScreenResult] = useState<any>(null);
  const [screenLoading, setScreenLoading] = useState(false);
  const [expandedScorecard, setExpandedScorecard] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  // Phase 4 — Status lifecycle
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  // Phase 4 — Onboarding
  const [onboardingEdits, setOnboardingEdits] = useState<Record<string, string>>({});
  const [onboardingDates, setOnboardingDates] = useState<{ expected: string; actual: string }>({ expected: '', actual: '' });
  const [onboardingNotes, setOnboardingNotes] = useState('');
  const [onboardingDirty, setOnboardingDirty] = useState(false);
  // Phase 5 — Talent Pool
  const [showPoolModal, setShowPoolModal] = useState(false);

  const { data: candidate, isLoading } = useQuery<any>({
    queryKey: ['candidate', id],
    queryFn: () => candidatesApi.get(id),
  });

  const { data: resumes, refetch: refetchResumes } = useQuery<any>({
    queryKey: ['candidate-resumes', id],
    queryFn: () => candidatesApi.listResumes(id),
    enabled: !!id,
  });

  const { data: submissionsData } = useQuery<any>({
    queryKey: ['candidate-submissions', id],
    queryFn: () => submissionsApi.list({ candidateId: id, limit: 50 }),
    enabled: activeTab === 'submissions' && !!id,
  });

  const handleResumeUpload = useCallback(async (file: File) => {
    setResumeUploading(true);
    try {
      const result = await candidatesApi.uploadResume(id, file);
      if (result.duplicate) {
        toast('Resume already exists — using existing version', { icon: 'ℹ️' });
      } else {
        toast.success('Resume uploaded successfully');
      }
      refetchResumes();
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Upload failed');
    } finally {
      setResumeUploading(false);
    }
  }, [id, queryClient, refetchResumes]);

  const handleResumeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleResumeUpload(file);
    e.target.value = '';
  };

  const handleResumeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleResumeUpload(file);
  };

  const { data: jobsData } = useQuery<any>({
    queryKey: ['jobs-for-link'],
    queryFn: () => jobsApi.list({ limit: 100, isActive: true }),
    enabled: linkJobModal || screenJdModal,
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

  const linkJobMutation = useMutation({
    mutationFn: (jobId: string) => applicationsApi.create({ candidateId: id, jobId }),
    onSuccess: () => {
      toast.success('Linked to job successfully');
      setLinkJobModal(false);
      setLinkJobId('');
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to link job'),
  });

  const outreachMutation = useMutation({
    mutationFn: () => outreachApi.generate({ targetType: 'CANDIDATE', targetId: id, channel: 'EMAIL' }),
    onSuccess: (data) => { setOutreachResult(data); setOutreachModal(true); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to generate outreach'),
  });

  const addNoteMutation = useMutation({
    mutationFn: (note: string) => candidatesApi.addNote(id, note),
    onSuccess: () => {
      toast.success('Note added');
      setNoteText('');
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to add note'),
  });

  const statusMutation = useMutation({
    mutationFn: (dto: { toStatus: string; notes?: string }) => candidatesApi.updateStatus(id, dto),
    onSuccess: () => {
      toast.success('Status updated');
      setShowStatusModal(false);
      setNewStatus('');
      setStatusNotes('');
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Status update failed'),
  });

  const { data: onboardingData, refetch: refetchOnboarding } = useQuery<any>({
    queryKey: ['candidate-onboarding', id],
    queryFn: () => candidatesApi.getOnboarding(id),
    enabled: activeTab === 'onboarding' && !!id,
    onSuccess: (data: any) => {
      setOnboardingEdits({
        passportStatus:    data.passportStatus    ?? 'MISSING',
        visaDocStatus:     data.visaDocStatus     ?? 'MISSING',
        offerLetterStatus: data.offerLetterStatus ?? 'MISSING',
        contractStatus:    data.contractStatus    ?? 'MISSING',
        bankDetailsStatus: data.bankDetailsStatus ?? 'MISSING',
      });
      setOnboardingDates({
        expected: data.expectedJoiningDate ? data.expectedJoiningDate.slice(0, 10) : '',
        actual:   data.actualJoiningDate   ? data.actualJoiningDate.slice(0, 10)   : '',
      });
      setOnboardingNotes(data.notes ?? '');
      setOnboardingDirty(false);
    },
  } as any);

  const onboardingMutation = useMutation({
    mutationFn: (dto: Record<string, any>) => candidatesApi.updateOnboarding(id, dto),
    onSuccess: () => {
      toast.success('Onboarding checklist saved');
      setOnboardingDirty(false);
      refetchOnboarding();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Save failed'),
  });

  // Phase 5 — Talent Pool
  const { data: allPools } = useQuery<any>({
    queryKey: ['talent-pools'],
    queryFn: () => talentPoolsApi.list(),
    enabled: showPoolModal,
  });

  const addToPoolMutation = useMutation({
    mutationFn: (poolId: string) => talentPoolsApi.addMember(poolId, { candidateId: id }),
    onSuccess: () => {
      toast.success('Added to pool');
      setShowPoolModal(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to add to pool'),
  });

  const runScreenAgainstJd = async () => {
    if (!candidate) return;
    setScreenLoading(true);
    setScreenResult(null);
    try {
      const resumeText = [
        `Candidate: ${candidate.firstName} ${candidate.lastName}`,
        candidate.currentTitle && `Title: ${candidate.currentTitle}`,
        candidate.currentCompany && `Company: ${candidate.currentCompany}`,
        candidate.location && `Location: ${candidate.location}`,
        candidate.yearsExperience != null && `Experience: ${candidate.yearsExperience} years`,
        candidate.skills?.length && `Skills: ${candidate.skills.join(', ')}`,
        candidate.summary && `Summary: ${candidate.summary}`,
      ].filter(Boolean).join('\n');

      const res = await aiApi.screenResume({
        resumeText,
        jobDescription: screenJdSource === 'paste' ? screenJdText : undefined,
        jobId: screenJdSource === 'job' ? screenJobId : undefined,
        candidateId: id,
      });
      setScreenResult(res);
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Screening failed');
    } finally {
      setScreenLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading profile...
      </div>
    );
  }
  if (!candidate) return <div className="text-red-500 p-6">Candidate not found</div>;

  const linkedJobIds = new Set((candidate.applications ?? []).map((a: any) => a.jobId));
  const notes = (candidate.activities ?? []).filter((a: any) => a.type === 'NOTE');
  const allActivities = [...(candidate.activities ?? [])].sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-5">

      {/* Change Status Modal */}
      {showStatusModal && (() => {
        const currentStatus = candidate.stage ?? 'SOURCED';
        const allowed = STATUS_TRANSITIONS[currentStatus] ?? [];
        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-5 border-b">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-brand-600" /> Change Candidate Status
                </h3>
                <button onClick={() => setShowStatusModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STAGE_COLORS[currentStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                    {currentStatus}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  {newStatus
                    ? <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STAGE_COLORS[newStatus] ?? 'bg-gray-100 text-gray-600'}`}>{newStatus}</span>
                    : <span className="text-xs text-gray-400">select next status</span>
                  }
                </div>
                {allowed.length === 0 ? (
                  <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                    This status is terminal — no further transitions available.
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Move to</label>
                    <div className="grid grid-cols-2 gap-2">
                      {allowed.map(s => (
                        <button
                          key={s}
                          onClick={() => setNewStatus(s)}
                          className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-all ${
                            newStatus === s
                              ? 'border-brand-600 bg-brand-50 text-brand-700 ring-1 ring-brand-400'
                              : 'border-gray-200 text-gray-700 hover:border-brand-300'
                          }`}
                        >
                          {s.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
                  <textarea
                    className="input w-full h-20 text-sm resize-none"
                    placeholder="Reason for status change..."
                    value={statusNotes}
                    onChange={e => setStatusNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-3 p-5 border-t">
                <button onClick={() => setShowStatusModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button
                  disabled={!newStatus || statusMutation.isPending || allowed.length === 0}
                  onClick={() => statusMutation.mutate({ toStatus: newStatus, notes: statusNotes || undefined })}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {statusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Move to {newStatus ? newStatus.replace(/_/g, ' ') : '…'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add to Pool Modal */}
      {showPoolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900">Add to Talent Pool</h3>
              <button onClick={() => setShowPoolModal(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {!(allPools as any)?.length ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No talent pools yet.{' '}
                  <Link href="/talent-pools" className="text-brand-600 underline">Create a pool</Link> first.
                </div>
              ) : (
                <div className="space-y-2">
                  {((allPools as any) ?? []).map((pool: any) => (
                    <button
                      key={pool.id}
                      onClick={() => addToPoolMutation.mutate(pool.id)}
                      disabled={addToPoolMutation.isPending}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-colors text-left group"
                    >
                      <div>
                        <div className="font-medium text-sm text-gray-900 group-hover:text-brand-700">{pool.name}</div>
                        {pool.description && <div className="text-xs text-gray-400 mt-0.5">{pool.description}</div>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 shrink-0">
                        <span>{pool._count?.members ?? 0} members</span>
                        <Plus className="w-3.5 h-3.5 group-hover:text-brand-600" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t flex justify-end">
              <Link href="/talent-pools" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                Manage Pools <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Outreach Modal */}
      {outreachModal && outreachResult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand-600" /> AI-Generated Outreach Email
              </h3>
              <button onClick={() => setOutreachModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {outreachResult.subject && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Subject</div>
                  <div className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg px-3 py-2">
                    {outreachResult.subject}
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Message</div>
                <div className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-3 whitespace-pre-wrap max-h-64 overflow-auto">
                  {outreachResult.body ?? outreachResult.message ?? outreachResult.content ?? ''}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(outreachResult.body ?? outreachResult.message ?? outreachResult.content ?? '');
                  toast.success('Copied!');
                }}
                className="btn-secondary flex-1 flex items-center justify-center gap-1.5"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
              {candidate.email && (
                <a
                  href={`mailto:${candidate.email}?subject=${encodeURIComponent(outreachResult.subject ?? '')}&body=${encodeURIComponent(outreachResult.body ?? outreachResult.message ?? outreachResult.content ?? '')}`}
                  className="btn-primary flex-1 flex items-center justify-center gap-1.5"
                >
                  <Mail className="w-4 h-4" /> Open in Mail
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Link to Job Modal */}
      {linkJobModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-brand-600" /> Link to a Job
              </h3>
              <button onClick={() => setLinkJobModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Job</label>
              <select className="input w-full" value={linkJobId} onChange={e => setLinkJobId(e.target.value)}>
                <option value="">— Choose a job —</option>
                {jobsData?.data
                  ?.filter((j: any) => !linkedJobIds.has(j.id))
                  .map((j: any) => (
                    <option key={j.id} value={j.id}>
                      {j.title}{j.department ? ` · ${j.department}` : ''}{j.location ? ` · ${j.location}` : ''}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setLinkJobModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                disabled={!linkJobId || linkJobMutation.isPending}
                onClick={() => linkJobMutation.mutate(linkJobId)}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {linkJobMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Link &amp; Track
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screen vs JD Modal */}
      {screenJdModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-brand-600" /> Screen Against JD
              </h3>
              <button onClick={() => { setScreenJdModal(false); setScreenResult(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="flex border border-gray-200 rounded-xl overflow-hidden w-fit">
                <button
                  onClick={() => setScreenJdSource('job')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${screenJdSource === 'job' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >Select Job</button>
                <button
                  onClick={() => setScreenJdSource('paste')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${screenJdSource === 'paste' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >Paste JD</button>
              </div>
              {screenJdSource === 'job' && (
                <select className="input w-full" value={screenJobId} onChange={e => setScreenJobId(e.target.value)}>
                  <option value="">— Choose a job —</option>
                  {jobsData?.data?.map((j: any) => (
                    <option key={j.id} value={j.id}>{j.title}{j.department ? ` · ${j.department}` : ''}</option>
                  ))}
                </select>
              )}
              {screenJdSource === 'paste' && (
                <textarea
                  className="input w-full h-36 text-sm resize-none"
                  placeholder="Paste job description here..."
                  value={screenJdText}
                  onChange={e => setScreenJdText(e.target.value)}
                />
              )}
              {screenLoading && (
                <div className="flex items-center gap-2 text-brand-600 text-sm py-4">
                  <Loader2 className="w-5 h-5 animate-spin" /> Analysing...
                </div>
              )}
              {screenResult && !screenLoading && (
                <div className="space-y-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className={`text-4xl font-bold ${SCORE_TIER(screenResult.score ?? 0).color}`}>
                      {screenResult.score}<span className="text-base font-normal text-gray-400">/100</span>
                    </div>
                    <div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${SCORE_TIER(screenResult.score ?? 0).bg}`}>
                        {SCORE_TIER(screenResult.score ?? 0).label}
                      </span>
                      {screenResult.decision && <div className="text-sm text-gray-500 mt-1">{screenResult.decision}</div>}
                    </div>
                  </div>
                  {screenResult.summary && <p className="text-sm text-gray-600 leading-relaxed">{screenResult.summary}</p>}
                  {screenResult.strengths?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-700 uppercase mb-1">Strengths</p>
                      <ul className="space-y-0.5">
                        {screenResult.strengths.map((s: string, i: number) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                            <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(screenResult.red_flags ?? screenResult.redFlags)?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-700 uppercase mb-1">Red Flags</p>
                      <ul className="space-y-0.5">
                        {(screenResult.red_flags ?? screenResult.redFlags).map((f: string, i: number) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                            <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />{f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {screenResult.recommendation && (
                    <div className="text-xs bg-white border border-gray-200 rounded-lg p-3 text-gray-600">
                      <span className="font-semibold text-gray-700">Recommendation: </span>{screenResult.recommendation}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t flex-shrink-0">
              <button onClick={() => { setScreenJdModal(false); setScreenResult(null); }} className="btn-secondary flex-1">Close</button>
              <button
                onClick={runScreenAgainstJd}
                disabled={
                  screenLoading ||
                  (screenJdSource === 'paste' && screenJdText.trim().length < 30) ||
                  (screenJdSource === 'job' && !screenJobId)
                }
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {screenLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {screenResult ? 'Re-Screen' : 'Screen Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div className="card">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xl font-bold shrink-0">
              {candidate.firstName?.[0]}{candidate.lastName?.[0]}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{candidate.firstName} {candidate.lastName}</h1>
                <BusinessIdBadge businessId={candidate.businessId} />
              </div>
              <div className="text-gray-500 text-sm">
                {candidate.currentTitle}{candidate.currentCompany ? ` @ ${candidate.currentCompany}` : ''}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {candidate.stage && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STAGE_COLORS[candidate.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                    {candidate.stage}
                  </span>
                )}
                {candidate.overallScore != null && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${SCORE_TIER(candidate.overallScore).bg}`}>
                    Score: {candidate.overallScore}/100
                  </span>
                )}
                {candidate.starRating > 0 && <StarRating rating={candidate.starRating} />}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {['SUPER_ADMIN', 'TENANT_ADMIN', 'RECRUITER'].includes(authUser?.role ?? '') && (
              <button
                onClick={() => { setNewStatus(''); setStatusNotes(''); setShowStatusModal(true); }}
                className="btn-secondary flex items-center gap-1.5 text-sm"
              >
                <ArrowRight className="w-4 h-4 text-brand-600" /> Change Status
              </button>
            )}
            {['SUPER_ADMIN', 'TENANT_ADMIN', 'RECRUITER'].includes(authUser?.role ?? '') && (
              <button
                onClick={() => setShowPoolModal(true)}
                className="btn-secondary flex items-center gap-1.5 text-sm"
              >
                <Layers className="w-4 h-4 text-brand-600" /> Add to Pool
              </button>
            )}
            <button onClick={() => setScreenJdModal(true)} className="btn-secondary flex items-center gap-1.5 text-sm">
              <Zap className="w-4 h-4 text-brand-600" /> Screen vs JD
            </button>
            <button
              onClick={() => outreachMutation.mutate()}
              disabled={outreachMutation.isPending}
              className="btn-primary flex items-center gap-1.5 text-sm"
            >
              <Mail className="w-4 h-4" />
              {outreachMutation.isPending ? 'Generating…' : 'AI Email'}
            </button>
            {candidate.email && (
              <a href={`mailto:${candidate.email}`} className="btn-secondary text-sm">Email</a>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const count =
              tab.id === 'resume' ? ((resumes as any[])?.length ?? candidate.resumes?.length ?? 0)
              : tab.id === 'applications' ? (candidate.applications?.length ?? 0)
              : tab.id === 'screening' ? (candidate.scorecards?.length ?? 0)
              : tab.id === 'notes' ? notes.length
              : tab.id === 'timeline' ? allActivities.length
              : null;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {count != null && count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {candidate.summary && (
              <div className="card">
                <h2 className="font-semibold text-gray-900 mb-2">Summary</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{candidate.summary}</p>
              </div>
            )}
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Professional Details</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: 'Experience', value: candidate.yearsExperience != null ? `${candidate.yearsExperience} years` : null },
                  { label: 'Location', value: candidate.location },
                  { label: 'Source', value: candidate.sourceName ?? candidate.source },
                  {
                    label: 'Notice Period',
                    value: candidate.noticePeriodDays != null
                      ? candidate.noticePeriodDays === 0 ? 'Immediate'
                        : candidate.noticePeriodDays <= 14 ? `${candidate.noticePeriodDays} days`
                        : candidate.noticePeriodDays <= 60 ? `${Math.round(candidate.noticePeriodDays / 7)} weeks`
                        : `${Math.round(candidate.noticePeriodDays / 30)} months`
                      : null,
                  },
                  {
                    label: 'Expected Salary',
                    value: candidate.expectedSalary != null
                      ? `${candidate.salaryCurrency ?? ''} ${candidate.expectedSalary.toLocaleString()}`.trim()
                      : null,
                  },
                  {
                    label: 'Current Salary',
                    value: candidate.currentSalary != null
                      ? `${candidate.salaryCurrency ?? ''} ${candidate.currentSalary.toLocaleString()}`.trim()
                      : null,
                  },
                  { label: 'Added', value: candidate.createdAt ? format(new Date(candidate.createdAt), 'dd MMM yyyy') : null },
                  { label: 'Last Activity', value: candidate.lastActivityAt ? format(new Date(candidate.lastActivityAt), 'dd MMM yyyy') : null },
                ]
                  .filter(d => d.value)
                  .map(({ label, value }) => (
                    <div key={label}>
                      <div className="text-xs font-medium text-gray-500 mb-0.5">{label}</div>
                      <div className="font-medium text-gray-900">{value}</div>
                    </div>
                  ))}
              </div>
            </div>
            {candidate.skills?.length > 0 && (
              <div className="card">
                <h2 className="font-semibold text-gray-900 mb-3">Skills</h2>
                <div className="flex flex-wrap gap-1.5">
                  {candidate.skills.map((skill: string) => (
                    <span key={skill} className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {candidate.recruiterNotes && (
              <div className="card">
                <h2 className="font-semibold text-gray-900 mb-2">Recruiter Notes</h2>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{candidate.recruiterNotes}</p>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-3">Contact</h2>
              <div className="space-y-3 text-sm">
                {candidate.email && (
                  <a href={`mailto:${candidate.email}`} className="flex items-center gap-2 text-brand-600 hover:underline">
                    <Mail className="w-4 h-4 text-gray-400" /> {candidate.email}
                  </a>
                )}
                {candidate.phone && (
                  <a href={`tel:${candidate.phone}`} className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4 text-gray-400" /> {candidate.phone}
                  </a>
                )}
                {candidate.linkedinUrl && (
                  <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-brand-600 hover:underline">
                    <Globe className="w-4 h-4 text-gray-400" /> LinkedIn Profile
                  </a>
                )}
                {candidate.location && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400" /> {candidate.location}
                  </div>
                )}
              </div>
            </div>
            {(candidate.nationality || candidate.visaType || candidate.isForeigner) && (
              <div className="card">
                <h2 className="font-semibold text-gray-900 mb-3">Visa &amp; Immigration</h2>
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
                      {candidate.isForeigner
                        ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Foreign Worker</span>
                        : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">{candidate.visaStatus === 'PR' ? 'PR' : 'Citizen / Local'}</span>
                      }
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
                      <dd className={`font-medium ${new Date(candidate.visaExpiry) < new Date(Date.now() + 90 * 86400000) ? 'text-red-600' : 'text-gray-900'}`}>
                        {format(new Date(candidate.visaExpiry), 'dd MMM yyyy')}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Resume */}
      {activeTab === 'resume' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Resumes ({(resumes as any[])?.length ?? 0})</h2>
            <div>
              <input
                ref={resumeInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={handleResumeFileSelect}
              />
              <button
                onClick={() => resumeInputRef.current?.click()}
                disabled={resumeUploading}
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                {resumeUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {resumeUploading ? 'Uploading…' : 'Upload Resume'}
              </button>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleResumeDrop}
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-brand-300 transition-colors"
          >
            <File className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">Drag &amp; drop a resume here, or click <button onClick={() => resumeInputRef.current?.click()} className="text-brand-600 font-medium">browse</button></p>
            <p className="text-xs text-gray-400 mt-1">PDF, Word, or TXT · Max 10 MB</p>
          </div>

          {/* Resume list */}
          {!((resumes as any[])?.length) ? (
            <div className="card text-center py-10">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-400">No resumes uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(resumes as any[]).map((r: any) => (
                <div key={r.id} className="card flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{r.fileName}</div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      {r.isPrimary && <span className="text-emerald-600 font-semibold">Primary</span>}
                      {r.fileSize && <span>{(r.fileSize / 1024).toFixed(0)} KB</span>}
                      {r.mimeType && <span>{r.mimeType.split('/')[1]?.toUpperCase()}</span>}
                      <span>{format(new Date(r.createdAt), 'dd MMM yyyy, HH:mm')}</span>
                      <span className="text-gray-300">·</span>
                      <span>{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const { url } = await candidatesApi.getResumeDownloadUrl(id, r.id);
                        window.open(url, '_blank');
                      } catch {
                        toast.error('Failed to get download link');
                      }
                    }}
                    className="btn-secondary text-xs flex items-center gap-1.5 flex-shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Applications */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Applications ({candidate.applications?.length ?? 0})</h2>
            <button onClick={() => setLinkJobModal(true)} className="btn-secondary text-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Link to Job
            </button>
          </div>
          {!candidate.applications?.length ? (
            <div className="card text-center py-12">
              <Briefcase className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-500">No applications yet</p>
              <p className="text-sm text-gray-400 mt-1">Link this candidate to a job to start tracking</p>
              <button onClick={() => setLinkJobModal(true)} className="mt-4 btn-primary text-sm">Link to a Job</button>
            </div>
          ) : (
            <div className="space-y-3">
              {candidate.applications.map((app: any) => (
                <div key={app.id} className="card p-0 overflow-hidden">
                  <div className="flex items-start gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <Link href={`/jobs/${app.jobId}`} className="font-semibold text-sm text-gray-900 hover:text-brand-600 flex items-center gap-1 w-fit">
                        {app.job?.title ?? 'Unknown Job'}<ChevronRight className="w-3 h-3 text-gray-400" />
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-gray-400">
                        {app.job?.department && <span>{app.job.department}</span>}
                        {app.job?.location && <span>· {app.job.location}</span>}
                        {app.job?.jobType && <span>· {app.job.jobType}</span>}
                      </div>
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        Applied {app.appliedAt ? format(new Date(app.appliedAt), 'dd MMM yyyy') : '—'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STAGE_COLORS[app.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                        {app.stage}
                      </span>
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
                        className="p-1.5 rounded-lg border border-gray-200 hover:bg-brand-50 text-gray-500 hover:text-brand-600"
                        title="AI Screen"
                      >
                        {screenMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: AI Screening */}
      {activeTab === 'screening' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">AI Screening History ({candidate.scorecards?.length ?? 0})</h2>
            <button onClick={() => setScreenJdModal(true)} className="btn-primary text-sm flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> Screen vs JD
            </button>
          </div>
          {!candidate.scorecards?.length ? (
            <div className="card text-center py-12">
              <Zap className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-500">No screening results yet</p>
              <p className="text-sm text-gray-400 mt-1">Run an AI screening to evaluate this candidate against a job</p>
              <button onClick={() => setScreenJdModal(true)} className="mt-4 btn-primary text-sm">Screen Now</button>
            </div>
          ) : (
            <div className="space-y-3">
              {candidate.scorecards.map((sc: any, idx: number) => {
                const tier = SCORE_TIER(sc.score ?? 0);
                const isExpanded = expandedScorecard === (sc.id ?? idx.toString());
                const result = sc.result as any;
                return (
                  <div key={sc.id ?? idx} className="card p-0 overflow-hidden">
                    <div
                      className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedScorecard(isExpanded ? null : (sc.id ?? idx.toString()))}
                    >
                      <div className={`text-2xl font-bold ${tier.color}`}>{sc.score ?? '—'}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tier.bg}`}>{tier.label}</span>
                          {result?.decision && <span className="text-xs text-gray-500">{result.decision}</span>}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {sc.createdAt ? format(new Date(sc.createdAt), 'dd MMM yyyy · HH:mm') : '—'}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                    {isExpanded && result && (
                      <div className="border-t bg-gray-50 px-4 py-4 space-y-3 text-sm">
                        {result.summary && <p className="text-gray-600 leading-relaxed">{result.summary}</p>}
                        {result.strengths?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-green-700 uppercase mb-1">Strengths</p>
                            <ul className="space-y-1">
                              {result.strengths.map((s: string, i: number) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                                  <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />{s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {(result.red_flags ?? result.redFlags)?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-red-700 uppercase mb-1">Red Flags</p>
                            <ul className="space-y-1">
                              {(result.red_flags ?? result.redFlags).map((f: string, i: number) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                                  <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />{f}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {result.recommendation && (
                          <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs text-gray-600">
                            <span className="font-semibold text-gray-700">Recommendation: </span>{result.recommendation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Notes */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900">Recruiter Notes</h2>
          <div className="card">
            <textarea
              className="input w-full h-24 text-sm resize-none"
              placeholder="Add a note about this candidate..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
            />
            <div className="flex justify-end mt-2">
              <button
                disabled={noteText.trim().length < 3 || addNoteMutation.isPending}
                onClick={() => addNoteMutation.mutate(noteText.trim())}
                className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {addNoteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Note
              </button>
            </div>
          </div>
          {notes.length === 0 ? (
            <div className="card text-center py-10">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-400">No notes yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((n: any) => (
                <div key={n.id} className="card">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{n.description ?? n.title}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {n.createdAt ? `${format(new Date(n.createdAt), 'dd MMM yyyy, HH:mm')} · ${formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Timeline */}
      {activeTab === 'timeline' && (() => {
        const statusEntries = (candidate.statusHistory ?? []).map((h: any) => ({
          ...h,
          _type: 'status',
        }));
        const activityEntries = allActivities.map((a: any) => ({ ...a, _type: 'activity' }));
        const merged = [...statusEntries, ...activityEntries].sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        return (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Activity Timeline ({merged.length})</h2>
            {merged.length === 0 ? (
              <div className="card text-center py-10">
                <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-400">No activity recorded yet</p>
              </div>
            ) : (
              <div className="card p-0 divide-y divide-gray-50">
                {merged.map((item: any) => (
                  <div key={item.id} className="flex items-start gap-3 px-5 py-4">
                    {item._type === 'status' ? (
                      <div className="w-7 h-7 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center mt-0.5 shrink-0">
                        <ArrowRight className="w-3.5 h-3.5 text-brand-600" />
                      </div>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-brand-400 mt-2 shrink-0" />
                    )}
                    <div className="flex-1">
                      {item._type === 'status' ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-800">Status changed</span>
                          {item.fromStatus && (
                            <>
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STAGE_COLORS[item.fromStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                                {item.fromStatus.replace(/_/g, ' ')}
                              </span>
                              <ArrowRight className="w-3 h-3 text-gray-400" />
                            </>
                          )}
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STAGE_COLORS[item.toStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                            {item.toStatus.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm font-medium text-gray-800">{item.title ?? item.type}</div>
                      )}
                      {item.notes && <p className="text-xs text-gray-500 mt-0.5">{item.notes}</p>}
                      {item.description && item._type !== 'status' && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                    </div>
                    <div className="text-xs text-gray-400 shrink-0 text-right">
                      {item.createdAt ? (
                        <>
                          <div>{format(new Date(item.createdAt), 'dd MMM yyyy, HH:mm')}</div>
                          <div className="text-[10px]">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</div>
                        </>
                      ) : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Tab: Submissions */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900">Submissions ({(submissionsData as any)?.total ?? 0})</h2>
          {!(submissionsData as any)?.items?.length ? (
            <div className="card text-center py-10">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-400">No submissions yet</p>
              <p className="text-xs text-gray-300 mt-1">This candidate has not been submitted to any client JD</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(submissionsData as any).items.map((sub: any) => {
                const stageColors: Record<string, string> = {
                  DRAFT: 'bg-gray-100 text-gray-600',
                  INTERNAL_REVIEW: 'bg-purple-100 text-purple-700',
                  SUBMITTED_TO_SALES: 'bg-blue-100 text-blue-700',
                  SUBMITTED_TO_CLIENT: 'bg-indigo-100 text-indigo-700',
                  CLIENT_REVIEW: 'bg-cyan-100 text-cyan-700',
                  INTERVIEW: 'bg-amber-100 text-amber-700',
                  OFFER: 'bg-emerald-100 text-emerald-700',
                  JOINED: 'bg-green-100 text-green-700',
                  REJECTED: 'bg-red-100 text-red-700',
                  WITHDRAWN: 'bg-gray-100 text-gray-500',
                };
                return (
                  <div key={sub.id} className="card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/jobs/${sub.jobId}`} className="font-medium text-gray-900 hover:text-brand-600 text-sm">
                            {sub.businessId}
                          </Link>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stageColors[sub.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                            {sub.stage.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          <span className="font-medium">{sub.client?.name}</span>
                          {sub.job?.title && <span className="text-gray-400"> · {sub.job.title}</span>}
                          {sub.job?.location && <span className="text-gray-400"> · {sub.job.location}</span>}
                        </div>
                        {sub.clientFeedback && (
                          <p className="mt-2 text-xs text-gray-500 italic line-clamp-2">
                            Client: &ldquo;{sub.clientFeedback}&rdquo;
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 shrink-0 text-right">
                        {sub.createdAt && (
                          <div>{format(new Date(sub.createdAt), 'dd MMM yyyy')}</div>
                        )}
                        {sub.interviewDate && (
                          <div className="text-amber-600 font-medium mt-1">
                            <Calendar className="w-3 h-3 inline mr-0.5" />
                            {format(new Date(sub.interviewDate), 'dd MMM yyyy')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Onboarding */}
      {activeTab === 'onboarding' && (
        <div className="space-y-4">
          {/* Post-offer warning */}
          {(['OFFER_PENDING', 'OFFER_ACCEPTED', 'JOINED'] as string[]).includes(candidate.stage) ? null : (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
              Onboarding checklist is most relevant after an offer is extended. Current status:{' '}
              <span className="font-semibold">{String(candidate.stage ?? '').replace(/_/g, ' ')}</span>
            </div>
          )}

          {/* Progress bar */}
          {onboardingData && (
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Onboarding Progress</span>
                <span className="text-sm font-bold text-brand-700">{(onboardingData as any).completionPct ?? 0}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-brand-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${(onboardingData as any).completionPct ?? 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Document checklist */}
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Document Checklist</h3>
            {ONBOARDING_DOCS.map((doc) => {
              const current = onboardingEdits[doc.key] ?? 'MISSING';
              const style = DOC_STATUS_STYLE[current] ?? DOC_STATUS_STYLE['MISSING'];
              return (
                <div key={doc.key} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-700">{doc.label}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = DOC_STATUS_CYCLE[current] ?? 'MISSING';
                      setOnboardingEdits((prev: any) => ({ ...prev, [doc.key]: next }));
                      setOnboardingDirty(true);
                    }}
                    className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${style}`}
                  >
                    {current}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Joining dates */}
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Joining Dates</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Expected Joining Date</label>
                <input
                  type="date"
                  className="input text-sm w-full"
                  value={onboardingDates.expected ?? ''}
                  onChange={(e) => {
                    setOnboardingDates((p: any) => ({ ...p, expected: e.target.value }));
                    setOnboardingDirty(true);
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Actual Joining Date</label>
                <input
                  type="date"
                  className="input text-sm w-full"
                  value={onboardingDates.actual ?? ''}
                  onChange={(e) => {
                    setOnboardingDates((p: any) => ({ ...p, actual: e.target.value }));
                    setOnboardingDirty(true);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="card space-y-2">
            <h3 className="text-sm font-semibold text-gray-800">Onboarding Notes</h3>
            <textarea
              rows={3}
              className="input text-sm w-full resize-none"
              placeholder="Any notes about onboarding process..."
              value={onboardingNotes}
              onChange={(e) => { setOnboardingNotes(e.target.value); setOnboardingDirty(true); }}
            />
          </div>

          {/* Save / Discard */}
          {onboardingDirty && (
            <div className="flex gap-3">
              <button
                type="button"
                className="btn-primary text-sm px-4 py-2"
                disabled={onboardingMutation.isPending}
                onClick={() => {
                  onboardingMutation.mutate({
                    ...onboardingEdits,
                    expectedJoiningDate: onboardingDates.expected || undefined,
                    actualJoiningDate: onboardingDates.actual || undefined,
                    notes: onboardingNotes || undefined,
                  });
                }}
              >
                {onboardingMutation.isPending ? 'Saving…' : 'Save Onboarding'}
              </button>
              <button
                type="button"
                className="btn-secondary text-sm px-4 py-2"
                onClick={() => {
                  if (onboardingData) {
                    const d = onboardingData as any;
                    setOnboardingEdits({
                      passportStatus: d.passportStatus ?? 'MISSING',
                      visaDocStatus: d.visaDocStatus ?? 'MISSING',
                      offerLetterStatus: d.offerLetterStatus ?? 'MISSING',
                      contractStatus: d.contractStatus ?? 'MISSING',
                      bankDetailsStatus: d.bankDetailsStatus ?? 'MISSING',
                    });
                    setOnboardingDates({ expected: d.expectedJoiningDate?.slice(0, 10) ?? '', actual: d.actualJoiningDate?.slice(0, 10) ?? '' });
                    setOnboardingNotes(d.notes ?? '');
                  }
                  setOnboardingDirty(false);
                }}
              >
                Discard
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
