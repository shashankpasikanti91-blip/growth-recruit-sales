'use client';
import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { aiApi, jobsApi, candidatesApi } from '@/lib/api-client';
import { Zap, AlertTriangle, Upload, FileText, Briefcase, User } from 'lucide-react';
import toast from 'react-hot-toast';

const DECISION_COLOR: Record<string, string> = {
  'Strong Shortlist': 'text-green-600',
  'Shortlist': 'text-blue-600',
  'KIV': 'text-amber-600',
  'Rejected': 'text-red-600',
};

export default function AiScreenPage() {
  const searchParams = useSearchParams();
  const [resumeText, setResumeText] = useState('');
  const [jdText, setJdText] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [jobId, setJobId] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  useEffect(() => {
    const qJob = searchParams.get('jobId');
    const qCandidate = searchParams.get('candidateId');
    if (qJob) setJobId(qJob);
    if (qCandidate) setCandidateId(qCandidate);
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

  const parseMutation = useMutation({
    mutationFn: () => aiApi.parseJd(jdText),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'JD parsing failed'),
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
    mutationFn: () => aiApi.screenResume(candidateId, jobId, resumeText),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Screening failed'),
  });

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setUploadedFileName(accepted[0].name);
      parseResumeMutation.mutate(accepted[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
    },
    maxFiles: 1,
    disabled: parseResumeMutation.isPending,
  });

  const result = screenMutation.data;
  const screening = result?.screening;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Screening</h1>
        <p className="text-gray-500 mt-1">Run the 6-step AI resume screening pipeline</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resume Screening */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-500" /> Resume Screening
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Candidate ID</label>
            <input className="input" placeholder="ID of candidate" value={candidateId} onChange={e => setCandidateId(e.target.value)} />
            {candidateInfo && (
              <Link href={`/candidates/${candidateId}`} className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 mt-1">
                <User className="w-3 h-3" /> {candidateInfo.firstName} {candidateInfo.lastName}
                {candidateInfo.currentTitle ? ` — ${candidateInfo.currentTitle}` : ''}
              </Link>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job ID</label>
            <input className="input" placeholder="ID of job" value={jobId} onChange={e => setJobId(e.target.value)} />
            {jobInfo && (
              <Link href={`/jobs/${jobId}`} className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 mt-1">
                <Briefcase className="w-3 h-3" /> {jobInfo.title}
                {jobInfo.department ? ` — ${jobInfo.department}` : ''}
              </Link>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resume Text</label>
            {/* File upload dropzone */}
            <div
              {...getRootProps()}
              className={`mb-2 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                isDragActive ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400'
              }`}
            >
              <input {...getInputProps()} />
              {parseResumeMutation.isPending ? (
                <span className="text-sm text-gray-500">Parsing resume…</span>
              ) : (
                <>
                  {uploadedFileName ? (
                    <><FileText className="w-4 h-4 text-brand-500" /><span className="text-sm text-gray-700">{uploadedFileName}</span></>
                  ) : (
                    <><Upload className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-500">{isDragActive ? 'Drop here' : 'Upload PDF or Word to auto-extract text'}</span></>
                  )}
                </>
              )}
            </div>
            <textarea className="input resize-y" rows={8} placeholder="Or paste resume text here..." value={resumeText} onChange={e => setResumeText(e.target.value)} />
          </div>
          <button
            onClick={() => screenMutation.mutate()}
            disabled={screenMutation.isPending || !resumeText || !candidateId || !jobId}
            className="btn-primary w-full justify-center"
          >
            {screenMutation.isPending ? 'Screening...' : 'Run AI Screening'}
          </button>
        </div>

        {/* JD Parser */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">JD Parser</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Description Text</label>
            <textarea className="input resize-y" rows={8} placeholder="Paste raw JD text here..." value={jdText} onChange={e => setJdText(e.target.value)} />
          </div>
          <button onClick={() => parseMutation.mutate()} disabled={parseMutation.isPending || !jdText} className="btn-secondary w-full justify-center">
            {parseMutation.isPending ? 'Parsing...' : 'Parse JD'}
          </button>
          {parseMutation.data && (
            <div className="bg-gray-50 rounded-lg p-4 text-xs font-mono overflow-auto max-h-40">
              <pre>{JSON.stringify(parseMutation.data, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>

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
              <div className="text-xl font-bold text-blue-600">{screening.matchAnalysis?.skillMatchScore ?? '—'}</div>
              <div className="text-xs text-gray-400 mt-1">Skill Match</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600">{screening.matchAnalysis?.experienceScore ?? '—'}</div>
              <div className="text-xs text-gray-400 mt-1">Experience Score</div>
            </div>
          </div>

          {screening.summary && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <p className="text-sm text-blue-800">{screening.summary}</p>
            </div>
          )}

          {screening.matchedSkills?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Matched Skills</div>
              <div className="flex flex-wrap gap-1">
                {screening.matchedSkills.map((s: any) => (
                  <span key={s.skill} className={`badge text-xs ${s.proficiency === 'Expert' ? 'badge-green' : 'badge-blue'}`}>
                    {s.skill} {s.yearsUsed ? `${s.yearsUsed}y` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          {screening.redFlags?.length > 0 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-amber-700 mb-1">Red Flags</div>
                <ul className="text-xs text-amber-700 space-y-1">
                  {screening.redFlags.map((f: string) => <li key={f}>• {f}</li>)}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
