'use client';
import { useState, useCallback, useEffect, Suspense } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { aiApi, jobsApi, candidatesApi } from '@/lib/api-client';
import {
  AlertTriangle, Upload, FileText, Briefcase, User,
  ChevronDown, ChevronUp, CheckCircle, XCircle, ShieldAlert,
  TrendingUp, TrendingDown, Award, Target, ClipboardCheck,
  BookOpen, AlertCircle, ListChecks, GraduationCap, Clock,
  BarChart3, Search, Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Classification + decision styles ────────────────────────────────────────

const CLASS_STYLES: Record<string, { bg: string; text: string; border: string; badge: string; icon: React.ElementType }> = {
  STRONG:      { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300', badge: 'bg-green-100 text-green-800', icon: CheckCircle },
  KAV:         { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', badge: 'bg-amber-100 text-amber-800', icon: ShieldAlert },
  REJECT:      { bg: 'bg-red-50',   text: 'text-red-700',   border: 'border-red-300',   badge: 'bg-red-100 text-red-800',    icon: XCircle },
  Shortlisted: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300', badge: 'bg-green-100 text-green-800', icon: CheckCircle },
  KIV:         { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', badge: 'bg-amber-100 text-amber-800', icon: ShieldAlert },
  Rejected:    { bg: 'bg-red-50',   text: 'text-red-700',   border: 'border-red-300',   badge: 'bg-red-100 text-red-800',    icon: XCircle },
};

const REC_STYLES: Record<string, { bg: string; text: string }> = {
  Hire:   { bg: 'bg-green-600', text: 'text-white' },
  Hold:   { bg: 'bg-amber-500', text: 'text-white' },
  Reject: { bg: 'bg-red-600',   text: 'text-white' },
};

const RISK_COLOR: Record<string, string> = {
  Low: 'text-green-600', Medium: 'text-amber-600', High: 'text-red-500', 'Very High': 'text-red-700',
};

const ACCEPT_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
};

// ─── Collapsible tag list ────────────────────────────────────────────────────

function TagList({ items, limit = 8, badgeClass }: { items: string[]; limit?: number; badgeClass: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!items?.length) return <span className="text-xs text-gray-400 italic">None</span>;
  const visible = expanded ? items : items.slice(0, limit);
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((s, i) => <span key={i} className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${badgeClass}`}>{s}</span>)}
      </div>
      {items.length > limit && (
        <button onClick={() => setExpanded(!expanded)} className="mt-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium">
          {expanded ? 'Show less' : `+${items.length - limit} more`}
        </button>
      )}
    </div>
  );
}

// ─── Collapsible bullet list ─────────────────────────────────────────────────

function BulletList({ items, limit = 5, bullet = '•', bulletClass = 'text-gray-400' }: {
  items: string[]; limit?: number; bullet?: string; bulletClass?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!items?.length) return <p className="text-xs text-gray-400 italic">None identified</p>;
  const visible = expanded ? items : items.slice(0, limit);
  return (
    <div>
      <ul className="space-y-1.5">
        {visible.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className={`mt-0.5 font-bold flex-shrink-0 ${bulletClass}`}>{bullet}</span>
            <span className="leading-snug">{item}</span>
          </li>
        ))}
      </ul>
      {items.length > limit && (
        <button onClick={() => setExpanded(!expanded)} className="mt-2 text-xs text-brand-600 hover:text-brand-700 font-medium">
          {expanded ? 'Show less ↑' : `View ${items.length - limit} more ↓`}
        </button>
      )}
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, accent = 'brand' }: {
  title: string; icon: React.ElementType; children: React.ReactNode; accent?: string;
}) {
  const accentMap: Record<string, string> = {
    brand: 'text-brand-600', green: 'text-green-600', amber: 'text-amber-600',
    red: 'text-red-500', blue: 'text-blue-600', purple: 'text-purple-600',
    gray: 'text-gray-500', teal: 'text-teal-600',
  };
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
        <Icon className={`w-4 h-4 flex-shrink-0 ${accentMap[accent] ?? 'text-brand-600'}`} />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</span>
      </div>
      {children}
    </div>
  );
}

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className={`font-semibold ${color}`}>{value}<span className="text-gray-400 font-normal">/{max}</span></span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color.replace('text-', 'bg-')}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Audit yes/no row ────────────────────────────────────────────────────────

function AuditRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      {ok
        ? <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle className="w-3.5 h-3.5" /> Yes</span>
        : <span className="flex items-center gap-1 text-red-500 text-xs font-medium"><XCircle className="w-3.5 h-3.5" /> No — Flag</span>}
    </div>
  );
}

export default function AiScreenPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>}>
      <AiScreenContent />
    </Suspense>
  );
}

function AiScreenContent() {
  const searchParams = useSearchParams();
  const [resumeText, setResumeText] = useState('');
  const [jdText, setJdText] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [jobId, setJobId] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [jdFileName, setJdFileName] = useState<string | null>(null);
  const [showLinkSection, setShowLinkSection] = useState(false);

  useEffect(() => {
    const qJob = searchParams.get('jobId');
    const qCandidate = searchParams.get('candidateId');
    if (qJob) { setJobId(qJob); setShowLinkSection(true); }
    if (qCandidate) { setCandidateId(qCandidate); setShowLinkSection(true); }
  }, [searchParams]);

  const { data: jobInfo } = useQuery({
    queryKey: ['job-lookup', jobId],
    queryFn: () => jobsApi.get(jobId),
    enabled: !!jobId && jobId.length > 2,
    retry: false,
  });

  const { data: candidateInfo } = useQuery({
    queryKey: ['candidate-lookup', candidateId],
    queryFn: () => candidatesApi.get(candidateId),
    enabled: !!candidateId && candidateId.length > 2,
    retry: false,
  });

  useEffect(() => {
    if (candidateInfo && !resumeText) {
      const resume = candidateInfo.resumes?.[0]?.rawText;
      if (resume) setResumeText(resume);
    }
  }, [candidateInfo]);

  useEffect(() => {
    if (jobInfo && !jdText) {
      const desc = jobInfo.description;
      if (desc) setJdText(desc);
    }
  }, [jobInfo]);

  const parseJdFileMutation = useMutation({
    mutationFn: (file: File) => aiApi.parseResume(file),
    onSuccess: (data) => {
      const text = data?.resumeText ?? data?.text ?? '';
      if (text) { setJdText(text); toast.success('JD text extracted'); }
      else toast.error('Could not extract text from file');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'JD parse failed'),
  });

  const parseResumeMutation = useMutation({
    mutationFn: (file: File) => aiApi.parseResume(file),
    onSuccess: (data) => {
      const text = data?.resumeText ?? data?.text ?? '';
      if (text) { setResumeText(text); toast.success('Resume parsed'); }
      else toast.error('Could not extract text from file');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Resume parse failed'),
  });

  const screenMutation = useMutation({
    mutationFn: () =>
      aiApi.screenResume({
        resumeText,
        jobDescription: jdText,
        ...(candidateId ? { candidateId } : {}),
        ...(jobId ? { jobId } : {}),
      }),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Screening failed'),
  });

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) { setUploadedFileName(accepted[0].name); parseResumeMutation.mutate(accepted[0]); }
  }, []);
  const onDropJd = useCallback((accepted: File[]) => {
    if (accepted[0]) { setJdFileName(accepted[0].name); parseJdFileMutation.mutate(accepted[0]); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: ACCEPT_TYPES, maxFiles: 1, disabled: parseResumeMutation.isPending });
  const { getRootProps: getJdRootProps, getInputProps: getJdInputProps, isDragActive: isJdDragActive } = useDropzone({ onDrop: onDropJd, accept: ACCEPT_TYPES, maxFiles: 1, disabled: parseJdFileMutation.isPending });

  const r = screenMutation.data;
  const canScreen = !!resumeText && !!jdText;

  // Resolve classification (v2 preferred, v1 compat)
  const classKey = r?.classification ?? (r?.decision === 'Shortlisted' ? 'STRONG' : r?.decision === 'KIV' ? 'KAV' : r?.decision === 'Rejected' ? 'REJECT' : null);
  const cs = classKey ? CLASS_STYLES[classKey] : null;
  const ClassIcon = cs?.icon;
  const finalScore = r?.final_score ?? r?.score ?? 0;

  return (
    <div className="space-y-6 pb-10">

      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-purple-500" /> AI Recruitment Auditor
        </h1>
        <p className="text-gray-500 mt-1">
          Senior-level screening across all industries — Technology, Executive, Finance, Blue-Collar, Medical, BPO
        </p>
      </div>

      {/* Score legend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div><p className="text-xs font-bold text-green-800">STRONG &gt;70</p><p className="text-xs text-green-700">Hire-ready candidate</p></div>
        </div>
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div><p className="text-xs font-bold text-amber-800">KAV 55–70</p><p className="text-xs text-amber-700">Keep / clarify before proceeding</p></div>
        </div>
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div><p className="text-xs font-bold text-red-800">REJECT &lt;55</p><p className="text-xs text-red-700">High risk / low fit</p></div>
        </div>
      </div>

      {/* Resume + JD inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-500" /> Candidate Resume
          </h2>
          <div {...getRootProps()} className={`flex items-center justify-center gap-2 py-4 px-4 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${isDragActive ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400'}`}>
            <input {...getInputProps()} />
            {parseResumeMutation.isPending ? (
              <span className="text-sm text-gray-500">Extracting text…</span>
            ) : uploadedFileName ? (
              <><FileText className="w-4 h-4 text-brand-500" /><span className="text-sm text-gray-700">{uploadedFileName}</span></>
            ) : (
              <><Upload className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-500">{isDragActive ? 'Drop here' : 'Upload resume (PDF / Word)'}</span></>
            )}
          </div>
          <textarea className="input resize-y" rows={10} placeholder="Or paste resume text here…" value={resumeText} onChange={e => setResumeText(e.target.value)} />
          {resumeText && <div className="text-xs text-gray-400">{resumeText.length.toLocaleString()} characters</div>}
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-green-500" /> Job Description
          </h2>
          <div {...getJdRootProps()} className={`flex items-center justify-center gap-2 py-4 px-4 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${isJdDragActive ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400'}`}>
            <input {...getJdInputProps()} />
            {parseJdFileMutation.isPending ? (
              <span className="text-sm text-gray-500">Extracting text…</span>
            ) : jdFileName ? (
              <><FileText className="w-4 h-4 text-brand-500" /><span className="text-sm text-gray-700">{jdFileName}</span></>
            ) : (
              <><Upload className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-500">{isJdDragActive ? 'Drop here' : 'Upload JD (PDF / Word)'}</span></>
            )}
          </div>
          <textarea className="input resize-y" rows={10} placeholder="Or paste job description here…" value={jdText} onChange={e => setJdText(e.target.value)} />
          {jdText && <div className="text-xs text-gray-400">{jdText.length.toLocaleString()} characters</div>}
        </div>
      </div>

      {/* Link to system records */}
      <div className="card">
        <button type="button" onClick={() => setShowLinkSection(!showLinkSection)} className="flex items-center justify-between w-full text-left">
          <span className="text-sm font-medium text-gray-600">Link to System Records <span className="text-gray-400 font-normal">(optional — saves result to candidate/job)</span></span>
          {showLinkSection ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {showLinkSection && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Candidate ID</label>
              <input className="input" placeholder="Paste candidate ID" value={candidateId} onChange={e => setCandidateId(e.target.value)} />
              {candidateInfo && (
                <Link href={`/candidates/${candidateId}`} className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 mt-1">
                  <User className="w-3 h-3" /> {candidateInfo.firstName} {candidateInfo.lastName}{candidateInfo.currentTitle ? ` — ${candidateInfo.currentTitle}` : ''}
                </Link>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job ID</label>
              <input className="input" placeholder="Paste job ID" value={jobId} onChange={e => setJobId(e.target.value)} />
              {jobInfo && (
                <Link href={`/jobs/${jobId}`} className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 mt-1">
                  <Briefcase className="w-3 h-3" /> {jobInfo.title}{jobInfo.department ? ` — ${jobInfo.department}` : ''}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Run button */}
      <button
        onClick={() => screenMutation.mutate()}
        disabled={screenMutation.isPending || !canScreen}
        className="btn-primary w-full justify-center py-3.5 text-base font-semibold"
      >
        {screenMutation.isPending
          ? <><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block mr-2" />Running AI Audit…</>
          : canScreen
            ? <><ClipboardCheck className="w-5 h-5 mr-2 inline" />Run AI Screening Audit</>
            : 'Upload resume + JD to screen'}
      </button>

      {/* ══════════════════════════ AUDIT RESULT ══════════════════════════ */}
      {r && (
        <div className="space-y-4">

          {/* 1. Header — Classification + Score + Recommendation */}
          <div className={`rounded-2xl border-2 p-6 ${cs?.bg ?? 'bg-gray-50'} ${cs?.border ?? 'border-gray-200'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {ClassIcon && <ClassIcon className={`w-10 h-10 flex-shrink-0 ${cs?.text}`} />}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-3xl font-black ${cs?.text}`}>{classKey ?? r.decision}</span>
                    {r.hiring_recommendation && (
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${REC_STYLES[r.hiring_recommendation]?.bg ?? 'bg-gray-400'} ${REC_STYLES[r.hiring_recommendation]?.text ?? 'text-white'}`}>
                        {r.hiring_recommendation.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap text-sm">
                    <span className="text-gray-500">Final Score:</span>
                    <span className={`text-2xl font-bold ${finalScore >= 70 ? 'text-green-700' : finalScore >= 55 ? 'text-amber-600' : 'text-red-600'}`}>
                      {finalScore}<span className="text-base font-normal text-gray-400">/100</span>
                    </span>
                    {r.role_category && <span className="text-gray-400 text-xs">• {r.role_category}</span>}
                    {r.evaluation?.overall_fit_rating != null && (
                      <span className="text-gray-400 text-xs">• Fit: {r.evaluation.overall_fit_rating}/10</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {candidateId && <Link href={`/candidates/${candidateId}`} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1"><User className="w-3 h-3" /> Candidate</Link>}
                {jobId && <Link href={`/jobs/${jobId}`} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1"><Briefcase className="w-3 h-3" /> Job</Link>}
              </div>
            </div>
          </div>

          {/* 2. Executive Summary */}
          {r.executive_summary && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Executive Summary</span>
              </div>
              <p className="text-sm text-blue-900 leading-relaxed">{r.executive_summary}</p>
            </div>
          )}

          {/* 3. Candidate Details + Score Breakdown side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            <Section title="Candidate Details" icon={User} accent="blue">
              <div className="space-y-1.5 text-sm">
                {([
                  ['Name', r.name],
                  ['Email', r.email],
                  ['Phone', r.contact_number],
                  ['Company', r.current_company],
                  ['Role', r.candidate_profile?.current_role],
                  ['Total Exp', r.candidate_profile?.total_experience_years ? `${r.candidate_profile.total_experience_years} yrs` : null],
                  ['Relevant Exp', r.candidate_profile?.relevant_experience_years ? `${r.candidate_profile.relevant_experience_years} yrs` : null],
                  ['Location', r.candidate_profile?.current_location],
                  ['Notice Period', r.candidate_profile?.notice_period],
                  ['Nationality', r.candidate_profile?.nationality],
                  ['Visa', r.candidate_profile?.visa_type && r.candidate_profile.visa_type !== 'Not Found'
                    ? `${r.candidate_profile.visa_type}${r.candidate_profile.visa_expiry && r.candidate_profile.visa_expiry !== 'Not Found' ? ` (exp: ${r.candidate_profile.visa_expiry})` : ''}` : null],
                ] as [string, string | null | undefined][])
                  .filter(([, v]) => v && v !== 'Not Found')
                  .map(([label, value]) => (
                    <div key={label} className="flex gap-2 py-1 border-b border-gray-50 last:border-0">
                      <span className="text-gray-400 w-24 flex-shrink-0 text-xs">{label}</span>
                      <span className="font-medium text-gray-800 text-sm break-all">{value}</span>
                    </div>
                  ))
                }
              </div>
              {(r.candidate_profile?.key_skills?.length ?? 0) > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-1.5">Key Skills</p>
                  <TagList items={r.candidate_profile!.key_skills} badgeClass="bg-gray-100 text-gray-700" />
                </div>
              )}
            </Section>

            {r.evaluation?.score_breakdown && (
              <Section title="Score Breakdown" icon={BarChart3} accent="purple">
                <div className="space-y-3">
                  {r.evaluation.score_breakdown.jd_relevance != null ? (
                    <>
                      <ScoreBar label="JD Relevance" value={r.evaluation.score_breakdown.jd_relevance} max={25} color="text-blue-600" />
                      <ScoreBar label="Recent Role Strength" value={r.evaluation.score_breakdown.recent_role_strength ?? 0} max={20} color="text-purple-600" />
                      <ScoreBar label="Experience Consistency" value={r.evaluation.score_breakdown.experience_consistency ?? 0} max={20} color="text-teal-600" />
                      <ScoreBar label="Skill Authenticity" value={r.evaluation.score_breakdown.skill_authenticity_score ?? 0} max={10} color="text-indigo-600" />
                      <ScoreBar label="Education Completeness" value={r.evaluation.score_breakdown.education_completeness ?? 0} max={10} color="text-pink-600" />
                      <ScoreBar label="Resume Structure" value={r.evaluation.score_breakdown.resume_structure ?? 0} max={15} color="text-orange-600" />
                    </>
                  ) : (
                    <>
                      <ScoreBar label="Skill Match" value={r.evaluation.score_breakdown.skill_match ?? 0} max={35} color="text-blue-600" />
                      <ScoreBar label="Experience" value={r.evaluation.score_breakdown.experience_relevance ?? 0} max={30} color="text-purple-600" />
                      <ScoreBar label="Role Alignment" value={r.evaluation.score_breakdown.role_alignment ?? 0} max={20} color="text-teal-600" />
                      <ScoreBar label="Stability" value={r.evaluation.score_breakdown.stability ?? 0} max={15} color="text-orange-600" />
                    </>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-100 font-bold text-sm">
                    <span className="text-gray-600">Final Score</span>
                    <span className={finalScore >= 70 ? 'text-green-700' : finalScore >= 55 ? 'text-amber-600' : 'text-red-600'}>{finalScore}/100</span>
                  </div>
                </div>
              </Section>
            )}
          </div>

          {/* 4. JD Match Analysis */}
          {r.jd_match_analysis && (
            <Section title="JD Match Analysis" icon={Search} accent="brand">
              <div className="mb-4 flex items-center gap-3">
                <div className={`text-3xl font-black ${(r.jd_match_analysis.match_percent ?? 0) >= 70 ? 'text-green-600' : (r.jd_match_analysis.match_percent ?? 0) >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                  {r.jd_match_analysis.match_percent ?? 0}%
                </div>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${(r.jd_match_analysis.match_percent ?? 0) >= 70 ? 'bg-green-500' : (r.jd_match_analysis.match_percent ?? 0) >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${r.jd_match_analysis.match_percent ?? 0}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 font-medium">JD Match</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Matching Skills</p>
                  <TagList items={r.jd_match_analysis.matching_skills ?? []} badgeClass="bg-green-100 text-green-800" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Missing Skills</p>
                  <TagList items={r.jd_match_analysis.missing_skills ?? []} badgeClass="bg-red-100 text-red-700" />
                </div>
              </div>
            </Section>
          )}

          {/* 5. Experience Audit */}
          {r.experience_audit && (
            <Section title="Experience Audit" icon={Clock} accent="teal">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {([
                  { label: 'Claimed', value: r.experience_audit.claimed_experience, color: 'text-gray-700' },
                  { label: 'Calculated', value: r.experience_audit.calculated_experience, color: 'text-blue-600' },
                  { label: 'Difference', value: r.experience_audit.difference, color: 'text-amber-600' },
                  { label: 'Verdict', value: r.experience_audit.verdict,
                    color: r.experience_audit.verdict === 'Match' ? 'text-green-600' : r.experience_audit.verdict === 'Inflation' ? 'text-red-600' : 'text-amber-600' },
                ] as { label: string; value: string; color: string }[]).map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">{label}</p>
                    <p className={`font-bold text-base ${color}`}>{value || '—'}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 6–8. Audit checks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {r.date_format_check && (
              <Section title="Date Format Check" icon={Target} accent="gray">
                <AuditRow label="Month + Year format used" ok={r.date_format_check.month_year_used} />
                {!r.date_format_check.month_year_used && (r.date_format_check.year_only_entries?.length ?? 0) > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-amber-600 font-medium mb-1">Year-only entries:</p>
                    <BulletList items={r.date_format_check.year_only_entries} limit={3} bullet="⚠" bulletClass="text-amber-500" />
                  </div>
                )}
              </Section>
            )}
            {r.experience_order_check && (
              <Section title="Experience Order" icon={TrendingDown} accent="gray">
                <AuditRow label="Descending order (latest first)" ok={r.experience_order_check.proper_descending_order} />
                {!r.experience_order_check.proper_descending_order && (
                  <p className="text-xs text-red-500 mt-2">Latest role must appear at the top of the resume.</p>
                )}
              </Section>
            )}
            {r.education_check && (
              <Section title="Education Check" icon={GraduationCap} accent="gray">
                <AuditRow label="Passout year present" ok={r.education_check.passout_year_present} />
                <AuditRow label="Month available" ok={r.education_check.month_available} />
              </Section>
            )}
          </div>

          {/* 9. Gap Analysis */}
          {((r.gap_analysis?.exact_gaps?.length ?? 0) > 0 || (r.evaluation?.career_gaps?.length ?? 0) > 0) && (
            <Section title="Gap Analysis" icon={AlertCircle} accent="amber">
              {r.gap_analysis?.total_missing_duration && (
                <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
                  <Clock className="w-3.5 h-3.5" /> Total Unaccounted: {r.gap_analysis.total_missing_duration}
                </div>
              )}
              <BulletList
                items={(r.gap_analysis?.exact_gaps?.length ?? 0) > 0 ? r.gap_analysis!.exact_gaps : (r.evaluation?.career_gaps ?? [])}
                limit={5}
                bullet="▸"
                bulletClass="text-amber-500"
              />
            </Section>
          )}

          {/* 10. Skill Authenticity */}
          {r.skill_authenticity && (
            <Section title="Skill Authenticity" icon={Shield} accent="blue">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Verified (Recent)</p>
                  <TagList items={r.skill_authenticity.verified ?? []} badgeClass="bg-green-100 text-green-800" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-600 mb-2 flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" /> Unverified</p>
                  <TagList items={r.skill_authenticity.unverified ?? []} badgeClass="bg-amber-100 text-amber-800" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5" /> Outdated (&gt;8 mo)</p>
                  <TagList items={r.skill_authenticity.outdated ?? []} badgeClass="bg-gray-100 text-gray-600" />
                </div>
              </div>
            </Section>
          )}

          {/* Strengths + Weaknesses */}
          {((r.evaluation?.candidate_strengths?.length ?? 0) > 0 || (r.evaluation?.candidate_weaknesses?.length ?? 0) > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(r.evaluation?.candidate_strengths?.length ?? 0) > 0 && (
                <Section title="Strengths" icon={TrendingUp} accent="green">
                  <BulletList items={r.evaluation!.candidate_strengths} bullet="✓" bulletClass="text-green-500" />
                </Section>
              )}
              {(r.evaluation?.candidate_weaknesses?.length ?? 0) > 0 && (
                <Section title="Weaknesses" icon={TrendingDown} accent="red">
                  <BulletList items={r.evaluation!.candidate_weaknesses} bullet="✗" bulletClass="text-red-400" />
                </Section>
              )}
            </div>
          )}

          {/* Risk + Reward */}
          {(r.evaluation?.risk_level || r.evaluation?.reward_level) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {r.evaluation?.risk_level && (
                <div className="card border-l-4 border-red-300">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldAlert className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase">Risk Level</span>
                    <span className={`ml-auto font-bold text-sm ${RISK_COLOR[r.evaluation.risk_level] ?? 'text-gray-600'}`}>{r.evaluation.risk_level}</span>
                  </div>
                  {r.evaluation.risk_explanation && <p className="text-xs text-gray-600">{r.evaluation.risk_explanation}</p>}
                </div>
              )}
              {r.evaluation?.reward_level && (
                <div className="card border-l-4 border-indigo-300">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase">Reward Level</span>
                    <span className="ml-auto font-bold text-sm text-indigo-600">{r.evaluation.reward_level}</span>
                  </div>
                  {r.evaluation.reward_explanation && <p className="text-xs text-gray-600">{r.evaluation.reward_explanation}</p>}
                </div>
              )}
            </div>
          )}

          {/* 11. Red Flags */}
          {((r.red_flags?.length ?? 0) > 0 || (r.evaluation?.red_flags?.length ?? 0) > 0) && (
            <Section title="Red Flags" icon={AlertTriangle} accent="amber">
              <BulletList
                items={(r.red_flags?.length ?? 0) > 0 ? r.red_flags : (r.evaluation?.red_flags ?? [])}
                limit={5}
                bullet="⚠"
                bulletClass="text-amber-500"
              />
            </Section>
          )}

          {/* 12. Required Actions */}
          {(r.required_actions?.length ?? 0) > 0 && (
            <div className="rounded-xl border-2 border-red-200 bg-red-50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="w-5 h-5 text-red-600" />
                <span className="text-sm font-bold text-red-700 uppercase tracking-wide">Required Actions</span>
                <span className="ml-auto text-xs bg-red-200 text-red-800 px-2.5 py-0.5 rounded-full font-semibold">
                  {r.required_actions!.length} action{r.required_actions!.length !== 1 ? 's' : ''}
                </span>
              </div>
              <ol className="space-y-2">
                {r.required_actions!.map((action: string, i: number) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-red-800">
                    <span className="flex-shrink-0 w-5 h-5 bg-red-200 text-red-700 rounded-full text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* 13. Recruiter Justification */}
          {r.evaluation?.justification && (
            <Section title="Recruiter Justification" icon={BookOpen} accent="blue">
              <p className="text-sm text-gray-700 leading-relaxed">{r.evaluation.justification}</p>
            </Section>
          )}

        </div>
      )}
    </div>
  );
}
