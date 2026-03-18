'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiApi } from '@/lib/api-client';
import { Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const DECISION_COLOR: Record<string, string> = {
  'Strong Shortlist': 'text-green-600',
  'Shortlist': 'text-blue-600',
  'KIV': 'text-amber-600',
  'Rejected': 'text-red-600',
};

export default function AiScreenPage() {
  const [resumeText, setResumeText] = useState('');
  const [jdText, setJdText] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [jobId, setJobId] = useState('');

  const screenMutation = useMutation({
    mutationFn: () => aiApi.screenResume(candidateId, jobId, resumeText),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Screening failed'),
  });

  const parseMutation = useMutation({
    mutationFn: () => aiApi.parseJd(jdText),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'JD parsing failed'),
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
            <input className="input" placeholder="UUID of candidate" value={candidateId} onChange={e => setCandidateId(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job ID</label>
            <input className="input" placeholder="UUID of job" value={jobId} onChange={e => setJobId(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resume Text</label>
            <textarea className="input resize-y" rows={8} placeholder="Paste resume text here..." value={resumeText} onChange={e => setResumeText(e.target.value)} />
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
          <h2 className="font-semibold text-gray-900">Screening Result</h2>
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
