'use client';
import { useState, useCallback, useEffect, Suspense } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { aiApi, jobsApi, candidatesApi } from '@/lib/api-client';
import {
  Zap, AlertTriangle, Upload, FileText, Briefcase, User,
  ChevronDown, ChevronUp, CheckCircle, XCircle, ShieldAlert,
  TrendingUp, TrendingDown, Award, Target,
} from 'lucide-react';
import toast from 'react-hot-toast';

const DECISION_STYLES: Record<string, { bg: string; text: string; border: string; icon: React.ElementType }> = {
  'Shortlisted': { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200', icon: CheckCircle },
  'KIV':         { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200', icon: ShieldAlert },
  'Rejected':    { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    icon: XCircle },
};

const RISK_COLOR: Record<string, string> = {
  Low: 'text-green-600', Medium: 'text-amber-600', High: 'text-red-500', 'Very High': 'text-red-700',
};
const REWARD_COLOR: Record<string, string> = {
  Low: 'text-gray-500', Medium: 'text-blue-600', High: 'text-indigo-600', 'Very High': 'text-purple-600',
};

const ACCEPT_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
};

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
  const ds = r ? (DECISION_STYLES[r.decision] ?? DECISION_STYLES['KIV']) : null;
  const DecisionIcon = ds?.icon;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Zap className="w-6 h-6 text-purple-500" /> AI Resume Screening
        </h1>
        <p className="text-gray-500 mt-1">
          Multi-industry screening — Technology, Executive, Business, Finance, Operations, Blue-Collar
        </p>
      </div>

      {/* Two-column: Resume + JD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-500" /> Resume
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
          <span className="text-sm font-medium text-gray-600">Link to System Records (optional — saves result to candidate/job)</span>
          {showLinkSection ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {showLinkSection && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Candidate ID</label>
              <input className="input" placeholder="Paste candidate ID to link result" value={candidateId} onChange={e => setCandidateId(e.target.value)} />
              {candidateInfo && (
                <Link href={`/candidates/${candidateId}`} className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 mt-1">
                  <User className="w-3 h-3" /> {candidateInfo.firstName} {candidateInfo.lastName}{candidateInfo.currentTitle ? ` — ${candidateInfo.currentTitle}` : ''}
                </Link>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job ID</label>
              <input className="input" placeholder="Paste job ID to link result" value={jobId} onChange={e => setJobId(e.target.value)} />
              {jobInfo && (
                <Link href={`/jobs/${jobId}`} className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 mt-1">
                  <Briefcase className="w-3 h-3" /> {jobInfo.title}{jobInfo.department ? ` — ${jobInfo.department}` : ''}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      <button onClick={() => screenMutation.mutate()} disabled={screenMutation.isPending || !canScreen} className="btn-primary w-full justify-center py-3 text-base">
        {screenMutation.isPending ? 'Running AI Screening…' : canScreen ? 'Run AI Screening' : 'Upload resume + JD to screen'}
      </button>

      {/* ── Screening Result ─────────────────────────────────────────────── */}
      {r && (
        <div className="space-y-5">

          {/* Header: decision + score */}
          <div className={`rounded-xl border-2 p-5 ${ds?.bg} ${ds?.border}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {DecisionIcon && <DecisionIcon className={`w-8 h-8 ${ds?.text}`} />}
                <div>
                  <div className={`text-2xl font-bold ${ds?.text}`}>{r.decision}</div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    {r.role_category && <span className="font-medium">{r.role_category} • </span>}
                    Score: <span className={`font-bold ${r.score >= 70 ? 'text-green-700' : r.score >= 55 ? 'text-amber-600' : 'text-red-600'}`}>{r.score} / 100</span>
                    {r.evaluation?.overall_fit_rating ? ` • Fit Rating: ${r.evaluation.overall_fit_rating}/10` : ''}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {candidateId && <Link href={`/candidates/${candidateId}`} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1"><User className="w-3 h-3" /> View Candidate</Link>}
                {jobId && <Link href={`/jobs/${jobId}`} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1"><Briefcase className="w-3 h-3" /> View Job</Link>}
              </div>
            </div>
          </div>

          {/* Candidate summary bar */}
          <div className="card">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Candidate Details</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm">
              {r.name && r.name !== 'Not Found' && <div><span className="text-gray-400">Name: </span><span className="font-medium">{r.name}</span></div>}
              {r.email && r.email !== 'Not Found' && <div><span className="text-gray-400">Email: </span><span>{r.email}</span></div>}
              {r.contact_number && r.contact_number !== 'Not Found' && <div><span className="text-gray-400">Phone: </span><span>{r.contact_number}</span></div>}
              {r.current_company && r.current_company !== 'Not Found' && <div><span className="text-gray-400">Company: </span><span className="font-medium">{r.current_company}</span></div>}
              {r.candidate_profile?.current_role && r.candidate_profile.current_role !== 'Not Found' && <div><span className="text-gray-400">Role: </span><span>{r.candidate_profile.current_role}</span></div>}
              {r.candidate_profile?.total_experience_years && r.candidate_profile.total_experience_years !== 'Not Found' && <div><span className="text-gray-400">Total Exp: </span><span>{r.candidate_profile.total_experience_years} yrs</span></div>}
              {r.candidate_profile?.relevant_experience_years && r.candidate_profile.relevant_experience_years !== 'Not Found' && <div><span className="text-gray-400">Relevant Exp: </span><span>{r.candidate_profile.relevant_experience_years} yrs</span></div>}
              {r.candidate_profile?.current_location && r.candidate_profile.current_location !== 'Not Found' && <div><span className="text-gray-400">Location: </span><span>{r.candidate_profile.current_location}</span></div>}
              {r.candidate_profile?.notice_period && r.candidate_profile.notice_period !== 'Not Found' && <div><span className="text-gray-400">Notice: </span><span>{r.candidate_profile.notice_period}</span></div>}
              {r.candidate_profile?.nationality && r.candidate_profile.nationality !== 'Not Found' && <div><span className="text-gray-400">Nationality: </span><span>{r.candidate_profile.nationality}</span></div>}
              {r.candidate_profile?.visa_type && r.candidate_profile.visa_type !== 'Not Found' && <div><span className="text-gray-400">Visa: </span><span>{r.candidate_profile.visa_type}{r.candidate_profile.visa_expiry && r.candidate_profile.visa_expiry !== 'Not Found' ? ` (exp: ${r.candidate_profile.visa_expiry})` : ''}</span></div>}
            </div>
            {r.candidate_profile?.key_skills?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400 mr-2">Key Skills:</span>
                {r.candidate_profile.key_skills.map((s: string) => (
                  <span key={s} className="inline-block bg-gray-100 text-gray-700 text-xs rounded px-2 py-0.5 mr-1 mb-1">{s}</span>
                ))}
              </div>
            )}
          </div>

          {/* Score breakdown */}
          {r.evaluation?.score_breakdown && (
            <div className="card">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Score Breakdown</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-blue-600">{r.evaluation.score_breakdown.skill_match}<span className="text-sm text-blue-400">/35</span></div>
                  <div className="text-xs text-gray-500 mt-1">Skill Match</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-purple-600">{r.evaluation.score_breakdown.experience_relevance}<span className="text-sm text-purple-400">/30</span></div>
                  <div className="text-xs text-gray-500 mt-1">Experience</div>
                </div>
                <div className="bg-teal-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-teal-600">{r.evaluation.score_breakdown.role_alignment}<span className="text-sm text-teal-400">/20</span></div>
                  <div className="text-xs text-gray-500 mt-1">Role Alignment</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-orange-600">{r.evaluation.score_breakdown.stability}<span className="text-sm text-orange-400">/15</span></div>
                  <div className="text-xs text-gray-500 mt-1">Stability</div>
                </div>
              </div>
            </div>
          )}

          {/* Skills grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {r.evaluation?.high_match_skills?.length > 0 && (
              <div className="card">
                <div className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> High Match Skills</div>
                <div className="flex flex-wrap gap-1">
                  {r.evaluation.high_match_skills.map((s: string) => (
                    <span key={s} className="bg-green-100 text-green-700 text-xs rounded px-2 py-0.5">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {r.evaluation?.medium_match_skills?.length > 0 && (
              <div className="card">
                <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1"><Target className="w-3 h-3" /> Partial Match</div>
                <div className="flex flex-wrap gap-1">
                  {r.evaluation.medium_match_skills.map((s: string) => (
                    <span key={s} className="bg-amber-100 text-amber-700 text-xs rounded px-2 py-0.5">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {r.evaluation?.low_or_missing_match_skills?.length > 0 && (
              <div className="card">
                <div className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1"><XCircle className="w-3 h-3" /> Missing / Low Match</div>
                <div className="flex flex-wrap gap-1">
                  {r.evaluation.low_or_missing_match_skills.map((s: string) => (
                    <span key={s} className="bg-red-100 text-red-600 text-xs rounded px-2 py-0.5">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {r.evaluation?.candidate_strengths?.length > 0 && (
              <div className="card">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-500" /> Strengths
                </div>
                <ul className="space-y-1">
                  {r.evaluation.candidate_strengths.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-green-500 mt-0.5">✓</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {r.evaluation?.candidate_weaknesses?.length > 0 && (
              <div className="card">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-red-400" /> Weaknesses
                </div>
                <ul className="space-y-1">
                  {r.evaluation.candidate_weaknesses.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-red-400 mt-0.5">✗</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Risk & Reward */}
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
                    <span className={`ml-auto font-bold text-sm ${REWARD_COLOR[r.evaluation.reward_level] ?? 'text-gray-600'}`}>{r.evaluation.reward_level}</span>
                  </div>
                  {r.evaluation.reward_explanation && <p className="text-xs text-gray-600">{r.evaluation.reward_explanation}</p>}
                </div>
              )}
            </div>
          )}

          {/* Red flags & career gaps */}
          {(r.evaluation?.red_flags?.length > 0 || r.evaluation?.career_gaps?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {r.evaluation?.red_flags?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-semibold text-amber-700 uppercase">Red Flags</span>
                  </div>
                  <ul className="space-y-1">
                    {r.evaluation.red_flags.map((f: string, i: number) => <li key={i} className="text-xs text-amber-700">• {f}</li>)}
                  </ul>
                </div>
              )}
              {r.evaluation?.career_gaps?.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase">Career Gaps</span>
                  </div>
                  <ul className="space-y-1">
                    {r.evaluation.career_gaps.map((g: string, i: number) => <li key={i} className="text-xs text-gray-600">• {g}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Justification */}
          {r.evaluation?.justification && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Recruiter Justification</div>
              <p className="text-sm text-blue-800 leading-relaxed">{r.evaluation.justification}</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

