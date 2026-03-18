'use client';
import { useState, useCallback, useEffect, Suspense } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { aiApi, jobsApi, candidatesApi } from '@/lib/api-client';
import { Zap, AlertTriangle, Upload, FileText, Briefcase, User, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

const DECISION_COLOR: Record<string, string> = {
  'Shortlisted': 'text-green-600',
  'KIV': 'text-amber-600',
  'Rejected': 'text-red-600',
};

export default function AiScreenPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>}>
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

  // Load candidate resume text if linked
  useEffect(() => {
    if (candidateInfo && !resumeText) {
      const resume = candidateInfo.resumes?.[0]?.rawText;
      if (resume) setResumeText(resume);
    }
  }, [candidateInfo]);

  // Load job description text if linked
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
      if (text) {
        setJdText(text);
        toast.success('JD text extracted from file');
      } else {
        toast.error('Could not extract text from file');
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'JD file parse failed'),
  });

  const parseResumeMutation = useMutation({
    mutationFn: (file: File) => aiApi.parseResume(file),
    onSuccess: (data) => {
      if (data?.resumeText) {
        setResumeText(data.resumeText);
        toast.success('Resume parsed — text extracted');
      } else if (data?.text) {
        setResumeText(data.text);
        toast.success('Resume parsed — text extracted');
      } else {
        toast.error('Could not extract text from file');
      }
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
    if (accepted[0]) {
      setUploadedFileName(accepted[0].name);
      parseResumeMutation.mutate(accepted[0]);
    }
  }, []);

  const onDropJd = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setJdFileName(accepted[0].name);
      parseJdFileMutation.mutate(accepted[0]);
    }
  }, []);

  const ACCEPT_TYPES = {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/msword': ['.doc'],
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT_TYPES,
    maxFiles: 1,
    disabled: parseResumeMutation.isPending,
  });

  const { getRootProps: getJdRootProps, getInputProps: getJdInputProps, isDragActive: isJdDragActive } = useDropzone({
    onDrop: onDropJd,
    accept: ACCEPT_TYPES,
    maxFiles: 1,
    disabled: parseJdFileMutation.isPending,
  });

  const screening = screenMutation.data;
  const canScreen = !!resumeText && !!jdText;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Zap className="w-6 h-6 text-purple-500" /> AI Quick Screening
        </h1>
        <p className="text-gray-500 mt-1">Upload a resume and job description to instantly screen the candidate — no system records needed</p>
      </div>

      {/* Two-column: Resume + JD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resume */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-500" /> Resume
          </h2>
          <div
            {...getRootProps()}
            className={`flex items-center justify-center gap-2 py-4 px-4 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
              isDragActive ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400'
            }`}
          >
            <input {...getInputProps()} />
            {parseResumeMutation.isPending ? (
              <span className="text-sm text-gray-500">Extracting text from resume…</span>
            ) : uploadedFileName ? (
              <><FileText className="w-4 h-4 text-brand-500" /><span className="text-sm text-gray-700">{uploadedFileName}</span></>
            ) : (
              <><Upload className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-500">{isDragActive ? 'Drop resume here' : 'Upload resume (PDF / Word)'}</span></>
            )}
          </div>
          <textarea
            className="input resize-y"
            rows={10}
            placeholder="Or paste resume text here..."
            value={resumeText}
            onChange={e => setResumeText(e.target.value)}
          />
          {resumeText && <div className="text-xs text-gray-400">{resumeText.length.toLocaleString()} characters</div>}
        </div>

        {/* Job Description */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-green-500" /> Job Description
          </h2>
          <div
            {...getJdRootProps()}
            className={`flex items-center justify-center gap-2 py-4 px-4 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
              isJdDragActive ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400'
            }`}
          >
            <input {...getJdInputProps()} />
            {parseJdFileMutation.isPending ? (
              <span className="text-sm text-gray-500">Extracting text from JD…</span>
            ) : jdFileName ? (
              <><FileText className="w-4 h-4 text-brand-500" /><span className="text-sm text-gray-700">{jdFileName}</span></>
            ) : (
              <><Upload className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-500">{isJdDragActive ? 'Drop JD here' : 'Upload JD (PDF / Word)'}</span></>
            )}
          </div>
          <textarea
            className="input resize-y"
            rows={10}
            placeholder="Or paste job description text here..."
            value={jdText}
            onChange={e => setJdText(e.target.value)}
          />
          {jdText && <div className="text-xs text-gray-400">{jdText.length.toLocaleString()} characters</div>}
        </div>
      </div>

      {/* Optional: Link to System Records */}
      <div className="card">
        <button
          type="button"
          onClick={() => setShowLinkSection(!showLinkSection)}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="text-sm font-medium text-gray-600">
            Link to System Records (optional — saves screening result to candidate/job)
          </span>
          {showLinkSection ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {showLinkSection && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Candidate ID</label>
              <input className="input" placeholder="Paste candidate ID to link result" value={candidateId} onChange={e => setCandidateId(e.target.value)} />
              {candidateInfo && (
                <Link href={`/candidates/${candidateId}`} className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 mt-1">
                  <User className="w-3 h-3" /> {candidateInfo.firstName} {candidateInfo.lastName}
                  {candidateInfo.currentTitle ? ` — ${candidateInfo.currentTitle}` : ''}
                </Link>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job ID</label>
              <input className="input" placeholder="Paste job ID to link result" value={jobId} onChange={e => setJobId(e.target.value)} />
              {jobInfo && (
                <Link href={`/jobs/${jobId}`} className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 mt-1">
                  <Briefcase className="w-3 h-3" /> {jobInfo.title}
                  {jobInfo.department ? ` — ${jobInfo.department}` : ''}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Screen Button */}
      <button
        onClick={() => screenMutation.mutate()}
        disabled={screenMutation.isPending || !canScreen}
        className="btn-primary w-full justify-center py-3 text-base"
      >
        {screenMutation.isPending ? 'Running AI Screening…' : canScreen ? 'Run AI Screening' : 'Upload resume + JD to screen'}
      </button>

      {/* Screening Result */}
      {screening && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-semibold text-gray-900">Screening Result</h2>
            <div className="flex gap-3">
              {candidateId && (
                <Link href={`/candidates/${candidateId}`} className="btn-secondary py-1 px-3 text-xs flex items-center gap-1">
                  <User className="w-3 h-3" /> View Candidate
                </Link>
              )}
              {jobId && (
                <Link href={`/jobs/${jobId}`} className="btn-secondary py-1 px-3 text-xs flex items-center gap-1">
                  <Briefcase className="w-3 h-3" /> View Job
                </Link>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-4xl font-bold ${screening.score >= 70 ? 'text-green-600' : screening.score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {screening.score}
              </div>
              <div className="text-xs text-gray-400 mt-1">Overall Score</div>
            </div>
            <div className="text-center">
              <div className={`text-xl font-bold ${DECISION_COLOR[screening.decision] ?? 'text-gray-800'}`}>{screening.decision}</div>
              <div className="text-xs text-gray-400 mt-1">Decision</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">{screening.score_breakdown?.skill_match ?? '—'}</div>
              <div className="text-xs text-gray-400 mt-1">Skill Match</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600">{screening.score_breakdown?.experience_relevance ?? '—'}</div>
              <div className="text-xs text-gray-400 mt-1">Experience Score</div>
            </div>
          </div>

          {screening.summary && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <p className="text-sm text-blue-800">{screening.summary}</p>
            </div>
          )}

          {/* Candidate Profile extracted by AI */}
          {screening.candidate_profile && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Candidate Profile</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {screening.candidate_profile.full_name && <div><span className="text-gray-400">Name:</span> {screening.candidate_profile.full_name}</div>}
                {screening.candidate_profile.email && <div><span className="text-gray-400">Email:</span> {screening.candidate_profile.email}</div>}
                {screening.candidate_profile.current_role && <div><span className="text-gray-400">Role:</span> {screening.candidate_profile.current_role}</div>}
                {screening.candidate_profile.current_company && <div><span className="text-gray-400">Company:</span> {screening.candidate_profile.current_company}</div>}
                {screening.candidate_profile.total_experience_years && <div><span className="text-gray-400">Total Exp:</span> {screening.candidate_profile.total_experience_years} yrs</div>}
                {screening.candidate_profile.relevant_experience_years && <div><span className="text-gray-400">Relevant Exp:</span> {screening.candidate_profile.relevant_experience_years} yrs</div>}
                {screening.candidate_profile.current_location && <div><span className="text-gray-400">Location:</span> {screening.candidate_profile.current_location}</div>}
                {screening.candidate_profile.nationality && screening.candidate_profile.nationality !== 'Not Found' && <div><span className="text-gray-400">Nationality:</span> {screening.candidate_profile.nationality}</div>}
                {screening.candidate_profile.visa_type && screening.candidate_profile.visa_type !== 'Not Found' && <div><span className="text-gray-400">Visa:</span> {screening.candidate_profile.visa_type}</div>}
              </div>
            </div>
          )}

          {screening.match_analysis?.skill_match?.matched_skills?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Matched Skills</div>
              <div className="flex flex-wrap gap-1">
                {screening.match_analysis.skill_match.matched_skills.map((s: string) => (
                  <span key={s} className="badge text-xs badge-green">{s}</span>
                ))}
              </div>
            </div>
          )}

          {screening.match_analysis?.skill_match?.missing_skills?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Missing Skills</div>
              <div className="flex flex-wrap gap-1">
                {screening.match_analysis.skill_match.missing_skills.map((s: string) => (
                  <span key={s} className="badge text-xs badge-red">{s}</span>
                ))}
              </div>
            </div>
          )}

          {screening.match_analysis?.red_flags?.length > 0 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-amber-700 mb-1">Red Flags</div>
                <ul className="text-xs text-amber-700 space-y-1">
                  {screening.match_analysis.red_flags.map((f: string) => <li key={f}>• {f}</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* Score Breakdown */}
          {screening.score_breakdown && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Score Breakdown</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-blue-600">{screening.score_breakdown.skill_match}/35</div>
                  <div className="text-xs text-gray-400">Skill Match</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-purple-600">{screening.score_breakdown.experience_relevance}/30</div>
                  <div className="text-xs text-gray-400">Experience</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-teal-600">{screening.score_breakdown.role_alignment}/20</div>
                  <div className="text-xs text-gray-400">Role Alignment</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-orange-600">{screening.score_breakdown.stability}/15</div>
                  <div className="text-xs text-gray-400">Stability</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
