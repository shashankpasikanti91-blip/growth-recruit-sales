'use client';

import { useState, useEffect, useRef } from 'react';
import { Zap, Users, Upload, FileText, X, TrendingUp, AlertCircle, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import apiClient from '../../lib/api';

// ─── AI result panel helpers ──────────────────────────────────────────────────
function scoreBadge(score) {
  if (score >= 70) return 'bg-green-100 text-green-800 border border-green-300';
  if (score >= 55) return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
  return 'bg-red-100 text-red-800 border border-red-300';
}
function recBadge(rec) {
  const m = { STRONG_MATCH:'bg-green-100 text-green-800', GOOD_MATCH:'bg-blue-100 text-blue-800', MODERATE_MATCH:'bg-yellow-100 text-yellow-800', WEAK_MATCH:'bg-orange-100 text-orange-800', NOT_SUITABLE:'bg-red-100 text-red-800' };
  return m[rec] || 'bg-gray-100 text-gray-700';
}
function clsBadge(cls) {
  const m = { Strong:'bg-green-600', KIV:'bg-yellow-500', Rejected:'bg-red-600' };
  return m[cls] || 'bg-gray-500';
}
function BulletList({ items, color }) {
  const c = color || 'blue';
  if (!items || items.length === 0) return <p className="text-xs text-gray-400">None</p>;
  return <ul className="space-y-1">{items.map((item, i) => <li key={i} className="flex items-start gap-2 text-sm text-gray-700"><span className={`text-${c}-500 mt-0.5 flex-shrink-0`}>&#8226;</span><span>{item}</span></li>)}</ul>;
}
function RichScreeningPanel({ data }) {
  const fr = (data && data.fullResult) || data || {};
  const score = data.score != null ? data.score : (fr.finalScore || 0);
  const recommendation = data.recommendation || '';
  const reasoning = data.reasoning || '';
  const strengths = Array.isArray(fr.strengths) ? fr.strengths : [];
  const weaknesses = Array.isArray(fr.weaknesses) ? fr.weaknesses : typeof fr.weaknesses === 'string' ? fr.weaknesses.split(/;\s*/).filter(Boolean) : typeof data.gap === 'string' ? data.gap.split(/;\s*/).filter(Boolean) : [];
  const missingSkills = Array.isArray(fr.missingSkills) ? fr.missingSkills : (fr.jdMatchAnalysis && fr.jdMatchAnalysis.missingSkills) || [];
  const redFlags = Array.isArray(fr.redFlags) ? fr.redFlags : [];
  const improvements = Array.isArray(fr.requiredImprovements) ? fr.requiredImprovements : [];
  const matchedSkills = Array.isArray(data.matchedSkills) ? data.matchedSkills : Array.isArray(fr.matchedSkills) ? fr.matchedSkills : [];
  const jdMatch = fr.jdMatchAnalysis || {};
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-2xl font-bold px-4 py-1.5 rounded-lg ${scoreBadge(score)}`}>{score}/100</span>
        {fr.classification && <span className={`px-3 py-1 rounded-full text-white text-xs font-semibold ${clsBadge(fr.classification)}`}>{fr.classification}</span>}
        {recommendation && <span className={`px-3 py-1 rounded-full text-xs font-semibold ${recBadge(recommendation)}`}>{recommendation.replace(/_/g,' ')}</span>}
        {jdMatch.matchPercent && <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold">JD Match: {jdMatch.matchPercent}</span>}
      </div>
      {fr.summary && <div className="bg-blue-50 border border-blue-100 rounded-lg p-3"><p className="text-sm text-blue-900">{fr.summary}</p></div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-green-50 rounded-lg p-4">
          <h5 className="text-xs font-bold text-green-800 mb-2 flex items-center gap-1"><CheckCircle size={13} /> Matched Skills</h5>
          {matchedSkills.length > 0 ? <div className="flex flex-wrap gap-1.5">{matchedSkills.map((s,i)=><span key={i} className="px-2 py-0.5 bg-green-200 text-green-900 text-xs rounded">{s}</span>)}</div> : <p className="text-xs text-gray-400">None identified</p>}
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <h5 className="text-xs font-bold text-orange-800 mb-2 flex items-center gap-1"><XCircle size={13} /> Missing Skills</h5>
          {missingSkills.length > 0 ? <div className="flex flex-wrap gap-1.5">{missingSkills.map((s,i)=><span key={i} className="px-2 py-0.5 bg-orange-200 text-orange-900 text-xs rounded">{s}</span>)}</div> : <p className="text-xs text-gray-400">None</p>}
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <h5 className="text-xs font-bold text-red-800 mb-2 flex items-center gap-1"><AlertTriangle size={13} /> Red Flags</h5>
          <BulletList items={redFlags} color="red" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-4"><h5 className="text-xs font-bold text-gray-900 mb-2">Strengths</h5><BulletList items={strengths} color="green" /></div>
        <div className="bg-white border border-gray-200 rounded-lg p-4"><h5 className="text-xs font-bold text-gray-900 mb-2">Gaps / Weaknesses</h5><BulletList items={weaknesses} color="orange" /></div>
      </div>
      {(fr.experienceValidation || fr.educationCheck || improvements.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {fr.experienceValidation && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h5 className="text-xs font-bold text-gray-900 mb-2">Experience Validation</h5>
              <dl className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between"><dt>Recent:</dt><dd className={fr.experienceValidation.isRecent==='Yes'?'text-green-700 font-semibold':'text-red-700 font-semibold'}>{fr.experienceValidation.isRecent}</dd></div>
                <div className="flex justify-between"><dt>Chronological:</dt><dd className={fr.experienceValidation.chronologicalOrder==='Yes'?'text-green-700 font-semibold':'text-red-700 font-semibold'}>{fr.experienceValidation.chronologicalOrder}</dd></div>
                {fr.experienceValidation.gaps && <div className="mt-1"><dt className="font-medium">Gaps:</dt><dd>{fr.experienceValidation.gaps}</dd></div>}
              </dl>
            </div>
          )}
          {fr.educationCheck && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h5 className="text-xs font-bold text-gray-900 mb-2">Education Check</h5>
              <dl className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between"><dt>Degree Present:</dt><dd className={fr.educationCheck.degreePresent==='Yes'?'text-green-700 font-semibold':'text-red-700 font-semibold'}>{fr.educationCheck.degreePresent}</dd></div>
                <div className="flex justify-between"><dt>Passout Year:</dt><dd className={fr.educationCheck.passoutYearPresent==='Yes'?'text-green-700 font-semibold':'text-red-700 font-semibold'}>{fr.educationCheck.passoutYearPresent}</dd></div>
              </dl>
            </div>
          )}
          {improvements.length > 0 && <div className="bg-blue-50 border border-blue-100 rounded-lg p-4"><h5 className="text-xs font-bold text-blue-900 mb-2">Required Improvements</h5><BulletList items={improvements} color="blue" /></div>}
        </div>
      )}
      {reasoning && <div className="bg-gray-50 border border-gray-200 rounded-lg p-4"><h5 className="text-xs font-bold text-gray-900 mb-1">AI Reasoning</h5><p className="text-sm text-gray-700 leading-relaxed">{reasoning}</p></div>}
    </div>
  );
}

export default function AIScreening() {
  const [mode, setMode] = useState('single'); // 'single' or 'bulk'

  // Job Description input
  const [jdMode, setJdMode] = useState('text'); // 'text', 'file', 'existing'
  const [jdText, setJdText] = useState('');
  const [jdFile, setJdFile] = useState(null);
  const [jdJobId, setJdJobId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const jdFileRef = useRef(null);

  // CV input (single)
  const [cvMode, setCvMode] = useState('text'); // 'text' or 'file'
  const [cvText, setCvText] = useState('');
  const [cvFile, setCvFile] = useState(null);
  const cvFileRef = useRef(null);

  // CV input (bulk)
  const [bulkFiles, setBulkFiles] = useState([]);
  const bulkFileRef = useRef(null);

  // Existing data
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState([]);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [parsingJd, setParsingJd] = useState(false);
  const [parsedJdText, setParsedJdText] = useState('');

  useEffect(() => {
    fetchJobs();
    fetchCandidates();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await apiClient.get('/api/jobs?limit=100');
      setJobs(response.data.data.jobs || response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch jobs');
    }
  };

  const fetchCandidates = async () => {
    try {
      const response = await apiClient.get('/api/candidates?limit=100');
      setCandidates(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch candidates');
    }
  };

  // Parse JD file to extract text
  const handleJdFileParse = async (file) => {
    setJdFile(file);
    setParsingJd(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/api/jobs/parse-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { description, details } = response.data.data;
      setParsedJdText(description);
      setJdText(description);
      if (details?.requiredSkills?.length > 0) {
        setRequiredSkills(details.requiredSkills.join(', '));
      } else if (details?.keywords?.length > 0) {
        setRequiredSkills(details.keywords.join(', '));
      }
    } catch (err) {
      setError('Failed to parse JD file: ' + (err.response?.data?.message || err.message));
    } finally {
      setParsingJd(false);
    }
  };

  // Single screening handler
  const handleSingleScreen = async () => {
    setError('');

    let jobDescription = '';
    let skills = [];
    let title = jobTitle || 'Screening';
    let useExistingJob = false;
    let existingJobId = '';

    if (jdMode === 'existing') {
      if (!jdJobId) { setError('Please select a job'); return; }
      useExistingJob = true;
      existingJobId = jdJobId;
    } else {
      jobDescription = jdText;
      if (!jobDescription.trim()) { setError('Please provide a job description'); return; }
      skills = requiredSkills ? requiredSkills.split(',').map(s => s.trim()).filter(Boolean) : [];
    }

    if (cvMode === 'text') {
      if (!cvText.trim()) { setError('Please provide resume/CV text'); return; }
    } else if (cvMode === 'file') {
      if (!cvFile) { setError('Please upload a CV file'); return; }
    }

    setLoading(true);
    try {
      if (cvMode === 'text') {
        if (useExistingJob) {
          const jobResponse = await apiClient.get(`/api/jobs/${existingJobId}`);
          const job = jobResponse.data.data;
          jobDescription = job.description;
          skills = job.requiredSkills || [];
          title = job.title;
        }
        const response = await apiClient.post('/api/screenings/direct-text', {
          resumeText: cvText,
          jobDescription,
          jobTitle: title,
          requiredSkills: skills,
        });
        setResults({ type: 'SINGLE', data: response.data.data });
      } else {
        const formData = new FormData();
        formData.append('files', cvFile);
        if (useExistingJob) {
          formData.append('jobId', existingJobId);
        } else {
          formData.append('jobDescription', jobDescription);
          formData.append('jobTitle', title);
          formData.append('requiredSkills', requiredSkills);
        }
        const response = await apiClient.post('/api/screenings/direct-file', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const fileResults = response.data.data.results;
        if (fileResults && fileResults.length > 0) {
          setResults({ type: 'SINGLE', data: fileResults[0] });
        } else {
          setError('No results returned. Check if the file could be parsed.');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Screening failed');
    } finally {
      setLoading(false);
    }
  };

  // Bulk screening handler
  const handleBulkScreen = async () => {
    setError('');

    let jobDescription = '';
    let skills = [];
    let title = jobTitle || 'Bulk Screening';
    let useExistingJob = false;
    let existingJobId = '';

    if (jdMode === 'existing') {
      if (!jdJobId) { setError('Please select a job'); return; }
      useExistingJob = true;
      existingJobId = jdJobId;
    } else {
      jobDescription = jdText;
      if (!jobDescription.trim()) { setError('Please provide a job description'); return; }
      skills = requiredSkills ? requiredSkills.split(',').map(s => s.trim()).filter(Boolean) : [];
    }

    if (bulkFiles.length === 0 && selectedCandidates.length === 0) {
      setError('Please upload CV files or select candidates');
      return;
    }

    setLoading(true);
    try {
      if (bulkFiles.length > 0) {
        const formData = new FormData();
        bulkFiles.forEach(f => formData.append('files', f));
        if (useExistingJob) {
          formData.append('jobId', existingJobId);
        } else {
          formData.append('jobDescription', jobDescription);
          formData.append('jobTitle', title);
          formData.append('requiredSkills', requiredSkills);
        }
        const response = await apiClient.post('/api/screenings/direct-file', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setResults({ type: 'BULK_FILE', data: response.data.data });
      } else {
        const response = await apiClient.post('/api/screenings/bulk', {
          jobId: existingJobId || undefined,
          candidateIds: selectedCandidates,
        });
        setResults({ type: 'BULK_DB', data: response.data.data });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk screening failed');
    } finally {
      setLoading(false);
    }
  };

  const removeBulkFile = (index) => {
    setBulkFiles(prev => prev.filter((_, i) => i !== index));
  };

  const toggleCandidate = (candidateId) => {
    setSelectedCandidates(prev =>
      prev.includes(candidateId) ? prev.filter(id => id !== candidateId) : [...prev, candidateId]
    );
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'bg-green-100 text-green-800';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const resetAll = () => {
    setResults(null);
    setError('');
    setBulkFiles([]);
    setCvFile(null);
    setCvText('');
  };

  // ======= RESULTS VIEW =======
  if (results) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp size={28} className="text-green-600" />
          <h1 className="text-3xl font-bold text-gray-900">Screening Results</h1>
        </div>

        {/* Single Result */}
        {results.type === 'SINGLE' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            {results.data.fileName && (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <FileText size={13} /> File: {results.data.fileName}
              </p>
            )}
            <RichScreeningPanel data={results.data} />
          </div>
        )}

        {/* Bulk File Results */}
        {results.type === 'BULK_FILE' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              {results.data.screened} screened, {results.data.failed} failed out of {results.data.totalFiles} files
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">File</th>
                    <th className="text-left py-3 px-4 font-semibold">Score</th>
                    <th className="text-left py-3 px-4 font-semibold">Recommendation</th>
                    <th className="text-left py-3 px-4 font-semibold">Matched Skills</th>
                    <th className="text-left py-3 px-4 font-semibold">Screened</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {results.data.results.map((r, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-3 px-4 flex items-center gap-2">
                        <FileText size={16} className="text-blue-500" /> {r.fileName}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded font-bold ${getScoreColor(r.score)}`}>{r.score}</span>
                      </td>
                      <td className="py-3 px-4 text-xs">{r.recommendation}</td>
                      <td className="py-3 px-4 text-xs">{r.matchedSkills?.slice(0, 4).join(', ')}</td>
                      <td className="py-3 px-4 text-xs text-gray-500">{new Date().toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {results.data.errors?.length > 0 && (
              <div className="bg-red-50 p-4 rounded-lg mt-4">
                <h3 className="font-semibold text-red-800 mb-2">Failed Files</h3>
                {results.data.errors.map((err, idx) => (
                  <p key={idx} className="text-sm text-red-700">{err.file}: {err.error}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bulk DB Results */}
        {results.type === 'BULK_DB' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              {results.data.screened} screened, {results.data.skipped} skipped
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Candidate</th>
                    <th className="text-left py-3 px-4 font-semibold">Score</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Skills</th>
                    <th className="text-left py-3 px-4 font-semibold">Screened</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {results.data.results.map((r, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-3 px-4">{r.candidate?.firstName} {r.candidate?.lastName}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded font-bold ${getScoreColor(r.score)}`}>{r.score}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${r.score >= 70 ? 'bg-green-100 text-green-800' : r.score >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {r.score >= 70 ? 'Shortlisted' : r.score >= 50 ? 'Screened' : 'Rejected'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs">{r.matchedSkills?.slice(0, 3).join(', ')}</td>
                      <td className="py-3 px-4 text-xs text-gray-500">{r.screenedAt ? new Date(r.screenedAt).toLocaleDateString() : new Date().toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button onClick={resetAll}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
          New Screening
        </button>
      </div>
    );
  }

  // ======= MAIN FORM VIEW =======
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Zap size={28} className="text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900">AI Screening</h1>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => { setMode('single'); setError(''); }}
          className={`px-5 py-3 rounded-lg font-semibold transition flex items-center gap-2 ${
            mode === 'single' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}>
          <Zap size={18} /> Single Screening
        </button>
        <button
          onClick={() => { setMode('bulk'); setError(''); }}
          className={`px-5 py-3 rounded-lg font-semibold transition flex items-center gap-2 ${
            mode === 'bulk' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}>
          <Users size={18} /> Bulk Screening
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ===== SINGLE SCREENING ===== */}
      {mode === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Job Description */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Job Description</h2>
            <div className="flex gap-2">
              <button onClick={() => setJdMode('text')}
                className={`px-3 py-1.5 rounded text-sm font-medium ${jdMode === 'text' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                Text
              </button>
              <button onClick={() => setJdMode('file')}
                className={`px-3 py-1.5 rounded text-sm font-medium ${jdMode === 'file' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                Upload File
              </button>
              <button onClick={() => setJdMode('existing')}
                className={`px-3 py-1.5 rounded text-sm font-medium ${jdMode === 'existing' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                Existing Job
              </button>
            </div>

            {jdMode === 'text' && (
              <>
                <textarea value={jdText} onChange={(e) => setJdText(e.target.value)}
                  rows={10} placeholder="Paste job description here..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Job Title (optional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <input value={requiredSkills} onChange={(e) => setRequiredSkills(e.target.value)}
                  placeholder="Required skills (comma-separated, optional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </>
            )}

            {jdMode === 'file' && (
              <>
                <div onClick={() => jdFileRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
                  <Upload size={28} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-blue-600 font-medium">Click to upload JD file</p>
                  <p className="text-xs text-gray-400 mt-1">PDF or DOCX (up to 10MB)</p>
                  {jdFile && <p className="text-sm text-green-600 mt-2">{'\u2713'} {jdFile.name}</p>}
                </div>
                <input ref={jdFileRef} type="file" accept=".pdf,.docx"
                  onChange={(e) => { if (e.target.files[0]) handleJdFileParse(e.target.files[0]); }}
                  className="hidden" />
                {parsingJd && <p className="text-sm text-blue-600">Parsing JD file...</p>}
                {parsedJdText && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Extracted JD Preview:</p>
                    <p className="text-xs text-gray-600 max-h-32 overflow-y-auto whitespace-pre-wrap">{parsedJdText.substring(0, 500)}...</p>
                  </div>
                )}
                <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Job Title (optional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <input value={requiredSkills} onChange={(e) => setRequiredSkills(e.target.value)}
                  placeholder="Required skills (auto-extracted, editable)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </>
            )}

            {jdMode === 'existing' && (
              <select value={jdJobId} onChange={(e) => setJdJobId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Select existing job --</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.displayId ? `[${j.displayId}] ` : ''}{j.title} ({j.department})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* RIGHT: CV/Resume */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">CV / Resume</h2>
            <div className="flex gap-2">
              <button onClick={() => setCvMode('text')}
                className={`px-3 py-1.5 rounded text-sm font-medium ${cvMode === 'text' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                Paste Text
              </button>
              <button onClick={() => setCvMode('file')}
                className={`px-3 py-1.5 rounded text-sm font-medium ${cvMode === 'file' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                Upload File
              </button>
            </div>

            {cvMode === 'text' && (
              <textarea value={cvText} onChange={(e) => setCvText(e.target.value)}
                rows={14} placeholder="Paste resume/CV text here..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            )}

            {cvMode === 'file' && (
              <>
                <div onClick={() => cvFileRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
                  <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-blue-600 font-medium">Click to upload CV</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, TXT</p>
                  {cvFile && <p className="text-sm text-green-600 mt-2">{'\u2713'} {cvFile.name}</p>}
                </div>
                <input ref={cvFileRef} type="file" accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => { if (e.target.files[0]) setCvFile(e.target.files[0]); }}
                  className="hidden" />
              </>
            )}
          </div>

          {/* Screen Button - full width */}
          <div className="lg:col-span-2">
            <button onClick={handleSingleScreen} disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-lg transition duration-200 disabled:opacity-50 flex items-center justify-center gap-2 text-lg">
              <Zap size={22} /> {loading ? 'Screening...' : 'Screen Candidate'}
            </button>
          </div>
        </div>
      )}

      {/* ===== BULK SCREENING ===== */}
      {mode === 'bulk' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT: Job Description */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Job Description</h2>
              <div className="flex gap-2">
                <button onClick={() => setJdMode('text')}
                  className={`px-3 py-1.5 rounded text-sm font-medium ${jdMode === 'text' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                  Text
                </button>
                <button onClick={() => setJdMode('file')}
                  className={`px-3 py-1.5 rounded text-sm font-medium ${jdMode === 'file' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                  Upload File
                </button>
                <button onClick={() => setJdMode('existing')}
                  className={`px-3 py-1.5 rounded text-sm font-medium ${jdMode === 'existing' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                  Existing Job
                </button>
              </div>

              {jdMode === 'text' && (
                <>
                  <textarea value={jdText} onChange={(e) => setJdText(e.target.value)}
                    rows={8} placeholder="Paste job description here..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Job Title (optional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  <input value={requiredSkills} onChange={(e) => setRequiredSkills(e.target.value)}
                    placeholder="Required skills (comma-separated, optional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </>
              )}

              {jdMode === 'file' && (
                <>
                  <div onClick={() => jdFileRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
                    <Upload size={28} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-blue-600 font-medium">Click to upload JD file</p>
                    <p className="text-xs text-gray-400 mt-1">PDF or DOCX</p>
                    {jdFile && <p className="text-sm text-green-600 mt-2">{'\u2713'} {jdFile.name}</p>}
                  </div>
                  <input ref={jdFileRef} type="file" accept=".pdf,.docx"
                    onChange={(e) => { if (e.target.files[0]) handleJdFileParse(e.target.files[0]); }}
                    className="hidden" />
                  {parsingJd && <p className="text-sm text-blue-600">Parsing JD file...</p>}
                  {parsedJdText && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Extracted JD Preview:</p>
                      <p className="text-xs text-gray-600 max-h-24 overflow-y-auto whitespace-pre-wrap">{parsedJdText.substring(0, 300)}...</p>
                    </div>
                  )}
                  <input value={requiredSkills} onChange={(e) => setRequiredSkills(e.target.value)}
                    placeholder="Required skills (auto-extracted, editable)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </>
              )}

              {jdMode === 'existing' && (
                <select value={jdJobId} onChange={(e) => setJdJobId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Select existing job --</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>
                      {j.displayId ? `[${j.displayId}] ` : ''}{j.title} ({j.department})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* RIGHT: Bulk CVs */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <h2 className="text-lg font-bold text-gray-900">CVs / Resumes ({bulkFiles.length} files)</h2>

              <div
                onClick={() => bulkFileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const droppedFiles = Array.from(e.dataTransfer.files);
                  setBulkFiles(prev => [...prev, ...droppedFiles]);
                }}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
                <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-blue-600 font-medium">Click or drag & drop CV files</p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, TXT (multiple files)</p>
              </div>
              <input ref={bulkFileRef} type="file" multiple accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => setBulkFiles(prev => [...prev, ...Array.from(e.target.files)])}
                className="hidden" />

              {bulkFiles.length > 0 && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {bulkFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-blue-500" />
                        <span className="text-sm text-gray-700 truncate">{file.name}</span>
                        <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(0)} KB)</span>
                      </div>
                      <button onClick={() => removeBulkFile(idx)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}

              {jdMode === 'existing' && bulkFiles.length === 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Or select existing candidates:</p>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-500">{selectedCandidates.length} selected</span>
                    <button onClick={() => setSelectedCandidates(candidates.map(c => c.id))}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium">Select All</button>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {candidates.map(c => (
                      <label key={c.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                        <input type="checkbox" checked={selectedCandidates.includes(c.id)}
                          onChange={() => toggleCandidate(c.id)} className="w-3.5 h-3.5 text-blue-600 rounded" />
                        <span className="text-sm text-gray-900">{c.firstName} {c.lastName}</span>
                        <span className="text-xs text-gray-400">{c.email}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button onClick={handleBulkScreen} disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-lg transition duration-200 disabled:opacity-50 flex items-center justify-center gap-2 text-lg">
            <Zap size={22} /> {loading ? `Screening ${bulkFiles.length || selectedCandidates.length} items...` : 'Start Bulk Screening'}
          </button>
        </div>
      )}
    </div>
  );
}
