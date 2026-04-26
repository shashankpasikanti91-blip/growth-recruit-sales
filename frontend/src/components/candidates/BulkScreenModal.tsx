'use client';
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { aiApi, jobsApi } from '@/lib/api-client';
import { X, Zap, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface CandidateMeta {
  id: string;
  firstName: string;
  lastName: string;
  currentTitle?: string;
  currentCompany?: string;
  location?: string;
  skills?: string[];
  yearsExperience?: number;
  summary?: string;
  businessId?: string;
  scorecards?: Array<{ score: number }>;
}

interface BulkScreenResult {
  candidateId: string;
  name: string;
  status: 'pending' | 'running' | 'done' | 'error' | 'skipped';
  score?: number;
  decision?: string;
  summary?: string;
  redFlags?: string[];
  strengths?: string[];
  fullResult?: any;
  expanded?: boolean;
  cached?: boolean;
}

interface Props {
  selectedCandidates: CandidateMeta[];
  onClose: () => void;
}

const TIER = (score: number) =>
  score >= 70 ? { label: 'Hire-Ready', color: 'bg-green-100 text-green-700 border border-green-200' }
  : score >= 55 ? { label: 'KIV', color: 'bg-amber-100 text-amber-700 border border-amber-200' }
  : { label: 'Reject', color: 'bg-red-100 text-red-700 border border-red-200' };

function buildResumeFromProfile(c: CandidateMeta): string {
  return [
    `Candidate: ${c.firstName} ${c.lastName}`,
    c.currentTitle && `Current Title: ${c.currentTitle}`,
    c.currentCompany && `Current Company: ${c.currentCompany}`,
    c.location && `Location: ${c.location}`,
    c.yearsExperience != null && `Years of Experience: ${c.yearsExperience}`,
    c.skills?.length && `Skills: ${c.skills.join(', ')}`,
    c.summary && `Professional Summary: ${c.summary}`,
  ].filter(Boolean).join('\n');
}

export function BulkScreenModal({ selectedCandidates, onClose }: Props) {
  const [jdSource, setJdSource] = useState<'paste' | 'job'>('paste');
  const [jdText, setJdText] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [results, setResults] = useState<BulkScreenResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [done, setDone] = useState(false);

  const { data: jobsData } = useQuery({
    queryKey: ['jobs-list-bulk'],
    queryFn: () => jobsApi.list({ limit: 100, isActive: true }),
    enabled: jdSource === 'job',
  });

  const selectedJob = jobsData?.data?.find((j: any) => j.id === selectedJobId);

  const canRun = (jdSource === 'paste' && jdText.trim().length > 30)
    || (jdSource === 'job' && selectedJobId);

  const runScreening = useCallback(async () => {
    const jobDescription = jdSource === 'paste' ? jdText.trim()
      : selectedJob
        ? `${selectedJob.title} — ${selectedJob.department ?? ''} at ${selectedJob.location ?? ''}.\n${selectedJob.description ?? ''}\nRequirements: ${(selectedJob.requirements ?? []).join(', ')}\nSkills: ${(selectedJob.skills ?? []).join(', ')}`
        : '';

    if (!jobDescription) return;

    setIsRunning(true);
    setDone(false);

    const initial: BulkScreenResult[] = selectedCandidates.map(c => ({
      candidateId: c.id,
      name: `${c.firstName} ${c.lastName}`,
      status: jdSource === 'job' && c.scorecards?.[0]?.score != null ? 'pending' : 'pending',
      expanded: false,
      cached: false,
    }));
    setResults(initial);

    for (let i = 0; i < selectedCandidates.length; i++) {
      const c = selectedCandidates[i];

      setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'running' } : r));

      try {
        const resumeText = buildResumeFromProfile(c);
        const res = await aiApi.screenResume({
          resumeText,
          jobDescription,
          candidateId: c.id,
          jobId: jdSource === 'job' ? selectedJobId : undefined,
        });

        setResults(prev => prev.map((r, idx) => idx === i ? {
          ...r,
          status: 'done',
          score: res.score,
          decision: res.decision,
          summary: res.summary,
          redFlags: res.red_flags ?? res.redFlags ?? [],
          strengths: res.strengths ?? [],
          fullResult: res,
        } : r));
      } catch (err: any) {
        setResults(prev => prev.map((r, idx) => idx === i ? {
          ...r,
          status: 'error',
          summary: err?.response?.data?.message ?? 'Screening failed',
        } : r));
      }
    }

    setIsRunning(false);
    setDone(true);
  }, [jdSource, jdText, selectedJob, selectedJobId, selectedCandidates]);

  const toggleExpand = (idx: number) => {
    setResults(prev => prev.map((r, i) => i === idx ? { ...r, expanded: !r.expanded } : r));
  };

  const passCount = results.filter(r => r.score != null && r.score >= 70).length;
  const kivCount = results.filter(r => r.score != null && r.score >= 55 && r.score < 70).length;
  const rejectCount = results.filter(r => r.score != null && r.score < 55).length;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-brand-600" /> Bulk AI Screening
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {selectedCandidates.length} candidate{selectedCandidates.length !== 1 ? 's' : ''} selected
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* JD Config (hide once running) */}
          {!isRunning && !done && (
            <div className="p-6 space-y-4 border-b">
              {/* Source tabs */}
              <div className="flex border border-gray-200 rounded-xl overflow-hidden w-fit">
                <button
                  onClick={() => setJdSource('paste')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${jdSource === 'paste' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  Paste JD
                </button>
                <button
                  onClick={() => setJdSource('job')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${jdSource === 'job' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  Select Job
                </button>
              </div>

              {jdSource === 'paste' && (
                <textarea
                  className="input w-full h-40 text-sm resize-none"
                  placeholder="Paste full job description here (minimum 30 characters)..."
                  value={jdText}
                  onChange={e => setJdText(e.target.value)}
                />
              )}

              {jdSource === 'job' && (
                <select
                  className="input w-full"
                  value={selectedJobId}
                  onChange={e => setSelectedJobId(e.target.value)}
                >
                  <option value="">— Select a job —</option>
                  {jobsData?.data?.map((j: any) => (
                    <option key={j.id} value={j.id}>
                      {j.title} {j.department ? `· ${j.department}` : ''} {j.location ? `· ${j.location}` : ''}
                    </option>
                  ))}
                </select>
              )}

              {/* Selected candidates preview */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Candidates</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCandidates.map(c => (
                    <span key={c.id} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1">
                      <span className="w-5 h-5 rounded-full bg-brand-200 text-brand-800 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {c.firstName?.[0]}{c.lastName?.[0]}
                      </span>
                      {c.firstName} {c.lastName}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {(isRunning || done || results.length > 0) && (
            <div className="p-6 space-y-3">
              {/* Summary bar (shown after completion) */}
              {done && (
                <div className="flex gap-4 p-3 bg-gray-50 rounded-xl text-sm mb-4">
                  <span className="flex items-center gap-1.5 text-green-700 font-medium">
                    <CheckCircle className="w-4 h-4" /> {passCount} Hire-Ready
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                    <AlertTriangle className="w-4 h-4" /> {kivCount} KIV
                  </span>
                  <span className="flex items-center gap-1.5 text-red-600 font-medium">
                    <XCircle className="w-4 h-4" /> {rejectCount} Reject
                  </span>
                </div>
              )}

              {/* Result rows */}
              {results.map((r, idx) => (
                <div key={r.candidateId} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Row */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {r.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    {/* Name + title */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{r.name}</div>
                      {r.status === 'running' && (
                        <div className="flex items-center gap-1 text-xs text-brand-600 mt-0.5">
                          <Loader2 className="w-3 h-3 animate-spin" /> Screening...
                        </div>
                      )}
                      {r.status === 'done' && r.summary && (
                        <div className="text-xs text-gray-500 mt-0.5 truncate">{r.summary.slice(0, 90)}{r.summary.length > 90 ? '…' : ''}</div>
                      )}
                      {r.status === 'error' && (
                        <div className="text-xs text-red-500 mt-0.5">{r.summary}</div>
                      )}
                    </div>
                    {/* Score */}
                    {r.status === 'done' && r.score != null && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-lg font-bold text-gray-900">{r.score}<span className="text-xs font-normal text-gray-400">/100</span></span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIER(r.score).color}`}>
                          {TIER(r.score).label}
                        </span>
                        <button
                          onClick={() => toggleExpand(idx)}
                          className="ml-1 p-1 text-gray-400 hover:text-brand-600 rounded-lg hover:bg-brand-50"
                          title={r.expanded ? 'Collapse' : 'View Full Details'}
                        >
                          {r.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                    {r.status === 'pending' && !isRunning && (
                      <span className="text-xs text-gray-400">Waiting</span>
                    )}
                    {r.status === 'error' && (
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                  </div>

                  {/* Expanded full details */}
                  {r.expanded && r.fullResult && (
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 space-y-3 text-sm">
                      {r.fullResult.summary && (
                        <p className="text-gray-700 leading-relaxed">{r.fullResult.summary}</p>
                      )}
                      {r.strengths && r.strengths.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-green-700 uppercase mb-1">Strengths</p>
                          <ul className="space-y-0.5">
                            {r.strengths.map((s, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                                <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" /> {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {r.redFlags && r.redFlags.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-red-700 uppercase mb-1">Red Flags</p>
                          <ul className="space-y-0.5">
                            {r.redFlags.map((f, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                                <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" /> {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {r.fullResult.recommendation && (
                        <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs text-gray-600">
                          <span className="font-semibold text-gray-700">Recommendation: </span>{r.fullResult.recommendation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t bg-gray-50 flex-shrink-0 rounded-b-2xl">
          <div className="text-xs text-gray-400">
            {done
              ? `Screened ${results.filter(r => r.status === 'done').length} of ${results.length} candidates`
              : 'Scores are saved to candidate profiles for reuse across JDs'}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary text-sm">
              {done ? 'Close' : 'Cancel'}
            </button>
            {!done && (
              <button
                onClick={runScreening}
                disabled={!canRun || isRunning}
                className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {isRunning ? 'Screening...' : 'Start Screening'}
              </button>
            )}
            {done && (
              <button
                onClick={() => { setResults([]); setDone(false); }}
                className="btn-primary text-sm flex items-center gap-2"
              >
                <Zap className="w-4 h-4" /> Screen Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
