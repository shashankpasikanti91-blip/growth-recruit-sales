import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../components/layout/DashboardLayout';
import api from '../lib/api';
import {
  Upload, FileText, Type, X, ChevronLeft, ChevronRight,
  Search, RefreshCw, Users, Briefcase, AlertTriangle,
  CheckCircle2, Zap, Loader2, Trash2, Eye, FileUp, List,
  History, Clock, ChevronRight as Caret, RotateCcw,
} from 'lucide-react';

// ── constants ─────────────────────────────────────────────────────────────────
const REC_STYLES = {
  STRONG_MATCH:   'bg-green-100 text-green-800',
  GOOD_MATCH:     'bg-blue-100 text-blue-800',
  MODERATE_MATCH: 'bg-yellow-100 text-yellow-800',
  WEAK_MATCH:     'bg-orange-100 text-orange-800',
  NOT_SUITABLE:   'bg-red-100 text-red-800',
};

function scoreColor(s) {
  if (s == null) return 'text-slate-400';
  if (s >= 70) return 'text-emerald-700 font-bold';
  if (s >= 50) return 'text-amber-700 font-bold';
  return 'text-red-600 font-bold';
}

function scoreBorder(s) {
  if (s == null) return 'border-slate-200 bg-white';
  if (s >= 70) return 'border-emerald-200 bg-emerald-50';
  if (s >= 50) return 'border-amber-200 bg-amber-50';
  return 'border-red-200 bg-red-50';
}

const ACCEPTED = '.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx';
const PAGE_LIMIT = 50;

// ── DragDropZone ───────────────────────────────────────────────────────────────
function DragDropZone({ onFiles, multiple = false, selectedFiles = [] }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef();

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDrag(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(multiple ? files : [files[0]]);
  }, [multiple, onFiles]);

  const handleChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length) onFiles(multiple ? files : [files[0]]);
    e.target.value = '';
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg cursor-pointer transition-all px-4 py-6
        ${drag ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-slate-50 hover:border-brand-300 hover:bg-slate-100'}`}
    >
      <input ref={inputRef} type="file" accept={ACCEPTED} multiple={multiple} className="hidden" onChange={handleChange} />
      <Upload size={22} className={drag ? 'text-brand-500' : 'text-slate-400'} />
      <div className="text-center pointer-events-none">
        <p className="text-xs font-semibold text-slate-600">
          {multiple ? 'Drop resume files here' : 'Drop file here'}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">or click to browse</p>
        <p className="text-[10px] text-slate-300 mt-1">PDF · DOCX · DOC · TXT · CSV · XLS · XLSX</p>
      </div>
      {!multiple && selectedFiles.length > 0 && (
        <div className="w-full mt-1 space-y-1 pointer-events-none">
          {selectedFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded px-2 py-1">
              <FileText size={11} className="text-brand-500 shrink-0" />
              <span className="text-[11px] text-slate-700 truncate flex-1">{f.name}</span>
              <span className="text-[10px] text-slate-400 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── InputPanel — file upload OR manual text ────────────────────────────────────
function InputPanel({ label, accentClass, mode, onModeChange, file, onFile, text, onText, placeholder }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FileUp size={13} className={accentClass} />
          <span className="text-xs font-semibold text-slate-700">{label}</span>
        </div>
        <div className="flex items-center bg-slate-100 rounded-md p-0.5 gap-0.5">
          <button
            type="button"
            onClick={() => onModeChange('file')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-all
              ${mode === 'file' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Upload size={10} /> Upload
          </button>
          <button
            type="button"
            onClick={() => onModeChange('text')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-all
              ${mode === 'text' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Type size={10} /> Paste Text
          </button>
        </div>
      </div>
      {mode === 'file' ? (
        <DragDropZone
          onFiles={(files) => onFile(files[0])}
          multiple={false}
          selectedFiles={file ? [file] : []}
        />
      ) : (
        <textarea
          value={text}
          onChange={(e) => onText(e.target.value)}
          placeholder={placeholder}
          rows={7}
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-mono text-slate-700 resize-y focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-400 placeholder-slate-300 leading-relaxed"
        />
      )}
    </div>
  );
}

// ── Single Result Card ─────────────────────────────────────────────────────────
function SingleResultCard({ result, onClose }) {
  if (!result) return null;
  const recKey = (result.recommendation || '').toUpperCase().replace(/[\s-]+/g, '_');
  return (
    <div className={`mt-4 border-2 rounded-xl p-5 ${scoreBorder(result.score)}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div>
            <span className={`text-4xl font-extrabold ${scoreColor(result.score)}`}>{result.score}</span>
            <span className="text-sm text-slate-400 font-normal"> / 100</span>
          </div>
          <div>
            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${REC_STYLES[recKey] || 'bg-slate-100 text-slate-600'}`}>
              {recKey.replace(/_/g, ' ')}
            </span>
            <p className="text-xs text-slate-500 mt-1">{result.jobTitle || 'Direct Screening'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {result.candidateId && (
            <Link href={`/candidates/${result.candidateId}`} className="btn-primary py-1.5 px-3 text-xs gap-1.5">
              <Eye size={12} /> View Candidate
            </Link>
          )}
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={16} />
          </button>
        </div>
      </div>
      {result.summary && (
        <p className="text-xs text-slate-700 mb-4 border-l-2 border-brand-400 pl-3 bg-white/60 rounded-r py-1.5">
          {result.summary}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
        {result.strengths?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Strengths</p>
            <ul className="space-y-1.5">
              {result.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                  <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />{s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {result.weaknesses && (
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Gaps / Weaknesses</p>
            <p className="text-xs text-slate-700 leading-relaxed">
              {Array.isArray(result.weaknesses) ? result.weaknesses.join('; ') : result.weaknesses}
            </p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
        {result.matchedSkills?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Matched Skills</p>
            <div className="flex flex-wrap gap-1">
              {result.matchedSkills.map((s, i) => (
                <span key={i} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[11px] font-medium rounded-full">{s}</span>
              ))}
            </div>
          </div>
        )}
        {result.missingSkills?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Missing Skills</p>
            <div className="flex flex-wrap gap-1">
              {result.missingSkills.map((s, i) => (
                <span key={i} className="px-2 py-0.5 bg-red-100 text-red-700 text-[11px] font-medium rounded-full">{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>
      {result.reasoning && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Reasoning</p>
          <p className="text-xs text-slate-600 leading-relaxed">{result.reasoning}</p>
        </div>
      )}
    </div>
  );
}

// ── Bulk Results Table ─────────────────────────────────────────────────────────
function BulkResultsTable({ results, jobTitle }) {
  if (!results || results.length === 0) return null;
  const sorted = [...results].sort((a, b) => (b.score || 0) - (a.score || 0));
  return (
    <div className="mt-5 border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={13} className="text-emerald-500" />
          <span className="text-xs font-semibold text-slate-700">{results.length} Candidates Screened</span>
          {jobTitle && <span className="text-xs text-slate-400">— {jobTitle}</span>}
        </div>
        <span className="text-[11px] text-slate-400">Sorted by score</span>
      </div>
      <div className="overflow-x-auto">
        <table className="ats-table">
          <thead>
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th style={{ minWidth: 180 }}>Candidate / File</th>
              <th style={{ width: 75 }}>Score</th>
              <th style={{ width: 145 }}>Recommendation</th>
              <th style={{ minWidth: 160 }}>Matched Skills</th>
              <th style={{ minWidth: 140 }}>Missing Skills</th>
              <th style={{ width: 80 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const recKey = (r.recommendation || '').toUpperCase().replace(/[\s-]+/g, '_');
              return (
                <tr key={i} className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors">
                  <td className="px-3 py-2 text-center text-[11px] text-slate-400 font-mono">{i + 1}</td>
                  <td className="px-3 py-2">
                    <p className="text-xs font-semibold text-slate-800 truncate max-w-[180px]" title={r.candidateName || r.fileName}>
                      {r.candidateName || r.fileName}
                    </p>
                    {r.candidateName && r.candidateName !== r.fileName && (
                      <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{r.fileName}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-sm ${scoreColor(r.score)}`}>{r.score ?? '—'}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${REC_STYLES[recKey] || 'bg-slate-100 text-slate-600'}`}>
                      {recKey.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-0.5">
                      {(r.matchedSkills || []).slice(0, 4).map((s, j) => (
                        <span key={j} className="px-1.5 py-0 bg-emerald-100 text-emerald-700 text-[10px] rounded-full">{s}</span>
                      ))}
                      {(r.matchedSkills || []).length > 4 && (
                        <span className="text-[10px] text-slate-400">+{r.matchedSkills.length - 4}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-0.5">
                      {(r.missingSkills || []).slice(0, 3).map((s, j) => (
                        <span key={j} className="px-1.5 py-0 bg-red-100 text-red-700 text-[10px] rounded-full">{s}</span>
                      ))}
                      {(r.missingSkills || []).length > 3 && (
                        <span className="text-[10px] text-slate-400">+{r.missingSkills.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {r.candidateId && (
                      <Link
                        href={`/candidates/${r.candidateId}`}
                        className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                        title="Open Candidate"
                      >
                        <Eye size={13} />
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ScreeningPage() {
  const [activeTab, setActiveTab] = useState('single');

  // ── Single state
  const [sResumeMode, setSResumeMode] = useState('file');
  const [sResumeFile, setSResumeFile] = useState(null);
  const [sResumeText, setSResumeText] = useState('');
  const [sJdMode, setSJdMode] = useState('text');
  const [sJdFile, setSJdFile] = useState(null);
  const [sJdText, setSJdText] = useState('');
  const [sJobTitle, setSJobTitle] = useState('');
  const [sSkills, setSSkills] = useState('');
  const [sLoading, setSLoading] = useState(false);
  const [sResult, setSResult] = useState(null);
  const [sError, setSError] = useState('');

  // ── Bulk state
  const [bResumeFiles, setBResumeFiles] = useState([]);
  const [bJdMode, setBJdMode] = useState('text');
  const [bJdFile, setBJdFile] = useState(null);
  const [bJdText, setBJdText] = useState('');
  const [bJobTitle, setBJobTitle] = useState('');
  const [bSkills, setBSkills] = useState('');
  const [bLoading, setBLoading] = useState(false);
  const [bResults, setBResults] = useState([]);
  const [bFailed, setBFailed] = useState([]);
  const [bError, setBError] = useState('');
  const [bProgress, setBProgress] = useState(0);

  // ── History state
  const [screenings, setScreenings] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histError, setHistError] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // ── Sessions state
  const [sessions, setSessions] = useState([]);
  const [sessLoading, setSessLoading] = useState(false);
  const [sessError, setSessError] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessResults, setSessResults] = useState([]);
  const [sessResultsLoading, setSessResultsLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      setHistLoading(true);
      const res = await api.get('/api/screenings', {
        params: { page, limit: PAGE_LIMIT, search: search || undefined },
      });
      const d = res.data.data;
      setScreenings(d.screenings || []);
      setTotal(d.total || 0);
      setHistError('');
    } catch (err) {
      setHistError(err.response?.data?.message || 'Failed to load history.');
    } finally {
      setHistLoading(false);
    }
  }, [page, search]);

  const fetchSessions = useCallback(async () => {
    try {
      setSessLoading(true);
      setSessError('');
      const res = await api.get('/api/screenings/sessions', { params: { limit: 20 } });
      const list = res.data.data?.sessions || res.data.data || [];
      setSessions(list);
      // Auto-select latest session
      if (list.length > 0 && !selectedSession) {
        loadSessionResults(list[0]);
      }
    } catch (err) {
      setSessError(err.response?.data?.message || 'Failed to load sessions.');
    } finally {
      setSessLoading(false);
    }
  }, []);  // eslint-disable-line

  const loadSessionResults = async (session) => {
    setSelectedSession(session);
    setSessResults([]);
    setSessResultsLoading(true);
    try {
      const res = await api.get(`/api/screenings/sessions/${session.id}`);
      const d = res.data.data;
      setSessResults(d.screenings || d.results || []);
    } catch (err) {
      setSessResults([]);
    } finally {
      setSessResultsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
    if (activeTab === 'sessions') fetchSessions();
  }, [activeTab, fetchHistory, fetchSessions]);

  // Extract text from uploaded JD file via backend
  const extractJdText = async (file) => {
    const fd = new FormData();
    fd.append('jdFile', file);
    const res = await api.post('/api/screenings/extract-jd', fd);
    return res.data.data?.text || '';
  };

  // ── Run single ─────────────────────────────────────────────────────────────
  const runSingle = async () => {
    setSError('');
    setSResult(null);
    if (sResumeMode === 'file' && !sResumeFile) return setSError('Please upload a resume file.');
    if (sResumeMode === 'text' && !sResumeText.trim()) return setSError('Please paste the resume text.');
    if (sJdMode === 'file' && !sJdFile) return setSError('Please upload a JD file.');
    if (sJdMode === 'text' && !sJdText.trim()) return setSError('Please enter the job description.');

    setSLoading(true);
    try {
      let jdText = sJdText;
      if (sJdMode === 'file') {
        jdText = await extractJdText(sJdFile);
        if (!jdText.trim()) throw new Error('Could not extract text from the JD file.');
      }
      const skills = sSkills.split(',').map(s => s.trim()).filter(Boolean);

      if (sResumeMode === 'file') {
        const fd = new FormData();
        fd.append('files', sResumeFile);
        fd.append('jobDescription', jdText);
        if (sJobTitle) fd.append('jobTitle', sJobTitle);
        if (skills.length) fd.append('requiredSkills', JSON.stringify(skills));
        const res = await api.post('/api/screenings/direct-file', fd);
        // direct-file returns results array; single file → results[0]
        const d = res.data.data;
        setSResult(d.results?.[0] || d);
      } else {
        const res = await api.post('/api/screenings/direct-text', {
          resumeText: sResumeText,
          jobDescription: jdText,
          jobTitle: sJobTitle || undefined,
          requiredSkills: skills,
        });
        setSResult(res.data.data);
      }
    } catch (err) {
      setSError(err.response?.data?.message || err.message || 'Screening failed.');
    } finally {
      setSLoading(false);
    }
  };

  // ── Run bulk ───────────────────────────────────────────────────────────────
  const runBulk = async () => {
    setBError('');
    setBResults([]);
    setBFailed([]);
    if (bResumeFiles.length === 0) return setBError('Please upload at least one resume file.');
    if (bJdMode === 'file' && !bJdFile) return setBError('Please upload a JD file.');
    if (bJdMode === 'text' && !bJdText.trim()) return setBError('Please enter the job description.');

    setBLoading(true);
    setBProgress(5);
    try {
      let jdText = bJdText;
      if (bJdMode === 'file') {
        jdText = await extractJdText(bJdFile);
        if (!jdText.trim()) throw new Error('Could not extract text from the JD file.');
      }
      setBProgress(15);

      const skills = bSkills.split(',').map(s => s.trim()).filter(Boolean);
      const fd = new FormData();
      bResumeFiles.forEach(f => fd.append('files', f));
      fd.append('jobDescription', jdText);
      if (bJobTitle) fd.append('jobTitle', bJobTitle);
      if (skills.length) fd.append('requiredSkills', JSON.stringify(skills));

      const res = await api.post('/api/screenings/direct-file', fd, {
        onUploadProgress: (e) => {
          if (e.total) setBProgress(15 + Math.round((e.loaded / e.total) * 50));
        },
      });
      setBProgress(90);

      const d = res.data.data;
      setBResults(d.results || []);
      setBFailed(d.errors || []);
      setBProgress(100);
    } catch (err) {
      setBError(err.response?.data?.message || err.message || 'Bulk screening failed.');
    } finally {
      setBLoading(false);
    }
  };

  const addBulkFiles = useCallback((incoming) => {
    setBResumeFiles(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...incoming.filter(f => !names.has(f.name))];
    });
  }, []);

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout title="AI Screening">
      <div className="flex flex-col h-full" style={{ minWidth: 0 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
          <div>
            <h1 className="text-sm font-bold text-slate-900">AI Screening</h1>
            <p className="text-xs text-slate-500">Screen candidates against job descriptions · All file types supported</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/candidates" className="btn-ghost py-1.5 px-3 text-xs gap-1.5">
              <Users size={13} /> Candidates
            </Link>
            <Link href="/jobs" className="btn-ghost py-1.5 px-3 text-xs gap-1.5">
              <Briefcase size={13} /> Jobs
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center px-4 pt-3 bg-white border-b border-slate-100 flex-shrink-0">
          {[
            { id: 'single',   label: 'Single Screen', icon: <FileText size={12} /> },
            { id: 'bulk',     label: 'Bulk Screen',   icon: <Users size={12} /> },
            { id: 'sessions', label: 'Sessions',      icon: <History size={12} /> },
            { id: 'history',  label: 'All Records',   icon: <List size={12} /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all
                ${activeTab === t.id
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4">

          {/* ═══ SINGLE SCREEN ═══ */}
          {activeTab === 'single' && (
            <div className="max-w-5xl mx-auto space-y-4">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Resume panel */}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <InputPanel
                    label="Resume / CV"
                    accentClass="text-brand-500"
                    mode={sResumeMode}
                    onModeChange={setSResumeMode}
                    file={sResumeFile}
                    onFile={f => setSResumeFile(f)}
                    text={sResumeText}
                    onText={setSResumeText}
                    placeholder="Paste the full resume / CV text here…"
                  />
                  {sResumeMode === 'file' && sResumeFile && (
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 bg-brand-50 border border-brand-100 rounded px-2.5 py-1.5">
                      <span className="flex items-center gap-1.5 truncate">
                        <FileText size={11} className="text-brand-500 shrink-0" />
                        <span className="truncate">{sResumeFile.name}</span>
                      </span>
                      <button type="button" onClick={() => setSResumeFile(null)} className="text-slate-400 hover:text-red-500 ml-2 shrink-0">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {/* JD panel */}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <InputPanel
                    label="Job Description (JD)"
                    accentClass="text-purple-500"
                    mode={sJdMode}
                    onModeChange={setSJdMode}
                    file={sJdFile}
                    onFile={f => setSJdFile(f)}
                    text={sJdText}
                    onText={setSJdText}
                    placeholder="Paste the full job description here…"
                  />
                  {sJdMode === 'file' && sJdFile && (
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 bg-purple-50 border border-purple-100 rounded px-2.5 py-1.5">
                      <span className="flex items-center gap-1.5 truncate">
                        <FileText size={11} className="text-purple-500 shrink-0" />
                        <span className="truncate">{sJdFile.name}</span>
                      </span>
                      <button type="button" onClick={() => setSJdFile(null)} className="text-slate-400 hover:text-red-500 ml-2 shrink-0">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Meta + submit */}
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                      Job Title <span className="text-slate-300 font-normal normal-case">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={sJobTitle}
                      onChange={e => setSJobTitle(e.target.value)}
                      placeholder="e.g. Senior Software Engineer"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                      Required Skills <span className="text-slate-300 font-normal normal-case">(optional · comma-separated)</span>
                    </label>
                    <input
                      type="text"
                      value={sSkills}
                      onChange={e => setSSkills(e.target.value)}
                      placeholder="e.g. React, Node.js, PostgreSQL"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                </div>
                {sError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                    <AlertTriangle size={13} /> {sError}
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={runSingle}
                    disabled={sLoading}
                    className="btn-primary px-6 py-2 text-xs gap-2 disabled:opacity-60"
                  >
                    {sLoading
                      ? <><Loader2 size={13} className="animate-spin" /> Screening…</>
                      : <><Zap size={13} /> Run AI Screen</>}
                  </button>
                </div>
              </div>

              {sResult && <SingleResultCard result={sResult} onClose={() => setSResult(null)} />}
            </div>
          )}

          {/* ═══ BULK SCREEN ═══ */}
          {activeTab === 'bulk' && (
            <div className="max-w-5xl mx-auto space-y-4">

              {/* Resume files */}
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileUp size={13} className="text-brand-500" />
                    <span className="text-xs font-semibold text-slate-700">Resume Files</span>
                    {bResumeFiles.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-brand-100 text-brand-700 text-[11px] font-bold rounded-full">
                        {bResumeFiles.length}
                      </span>
                    )}
                  </div>
                  {bResumeFiles.length > 0 && (
                    <button
                      onClick={() => setBResumeFiles([])}
                      className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={11} /> Clear all
                    </button>
                  )}
                </div>
                <DragDropZone onFiles={addBulkFiles} multiple />
                {bResumeFiles.length > 0 && (
                  <div className="mt-3 space-y-1 max-h-52 overflow-y-auto pr-1">
                    {bResumeFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded px-2.5 py-1.5">
                        <FileText size={11} className="text-brand-500 shrink-0" />
                        <span className="text-[11px] text-slate-700 flex-1 truncate" title={f.name}>{f.name}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                        <button
                          onClick={() => setBResumeFiles(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-slate-300 hover:text-red-500 shrink-0"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* JD for bulk */}
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <InputPanel
                  label="Job Description (JD)"
                  accentClass="text-purple-500"
                  mode={bJdMode}
                  onModeChange={setBJdMode}
                  file={bJdFile}
                  onFile={f => setBJdFile(f)}
                  text={bJdText}
                  onText={setBJdText}
                  placeholder="Paste the full job description here…"
                />
                {bJdMode === 'file' && bJdFile && (
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 bg-purple-50 border border-purple-100 rounded px-2.5 py-1.5">
                    <span className="flex items-center gap-1.5 truncate">
                      <FileText size={11} className="text-purple-500 shrink-0" />
                      <span className="truncate">{bJdFile.name}</span>
                    </span>
                    <button type="button" onClick={() => setBJdFile(null)} className="text-slate-400 hover:text-red-500 ml-2 shrink-0">
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Meta + submit */}
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                      Job Title <span className="text-slate-300 font-normal normal-case">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={bJobTitle}
                      onChange={e => setBJobTitle(e.target.value)}
                      placeholder="e.g. Senior Software Engineer"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                      Required Skills <span className="text-slate-300 font-normal normal-case">(optional · comma-separated)</span>
                    </label>
                    <input
                      type="text"
                      value={bSkills}
                      onChange={e => setBSkills(e.target.value)}
                      placeholder="e.g. React, Node.js, PostgreSQL"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {bError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                    <AlertTriangle size={13} /> {bError}
                  </div>
                )}

                {bLoading && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span>Processing {bResumeFiles.length} file{bResumeFiles.length !== 1 ? 's' : ''}…</span>
                      <span>{bProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-brand-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${bProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={runBulk}
                    disabled={bLoading}
                    className="btn-primary px-6 py-2 text-xs gap-2 disabled:opacity-60"
                  >
                    {bLoading
                      ? <><Loader2 size={13} className="animate-spin" /> Processing…</>
                      : <><Zap size={13} /> Run Bulk Screen{bResumeFiles.length > 0 ? ` (${bResumeFiles.length})` : ''}</>}
                  </button>
                </div>
              </div>

              {/* Failed files */}
              {bFailed.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={13} /> {bFailed.length} file{bFailed.length !== 1 ? 's' : ''} failed
                  </p>
                  <ul className="space-y-1">
                    {bFailed.map((e, i) => (
                      <li key={i} className="text-[11px] text-red-600">
                        <span className="font-medium">{e.file}</span> — {e.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {bResults.length > 0 && <BulkResultsTable results={bResults} jobTitle={bJobTitle} />}
            </div>
          )}

          {/* ═══ SESSIONS ═══ */}
          {activeTab === 'sessions' && (
            <div className="max-w-6xl mx-auto">
              <div className="flex gap-4 h-full" style={{ minHeight: 500 }}>
                {/* Sessions sidebar */}
                <div className="w-64 flex-shrink-0">
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 bg-slate-50">
                      <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <History size={12} /> Recent Sessions
                      </span>
                      <button onClick={fetchSessions} className="text-slate-400 hover:text-slate-600" title="Refresh sessions">
                        <RefreshCw size={12} />
                      </button>
                    </div>
                    {sessLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="w-5 h-5 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
                      </div>
                    ) : sessError ? (
                      <p className="text-xs text-red-500 p-3">{sessError}</p>
                    ) : sessions.length === 0 ? (
                      <p className="text-xs text-slate-400 p-3 text-center">No sessions yet.</p>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                        {sessions.map((sess) => (
                          <button
                            key={sess.id}
                            onClick={() => loadSessionResults(sess)}
                            className={`w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors ${selectedSession?.id === sess.id ? 'bg-blue-50 border-l-2 border-brand-500' : ''}`}
                          >
                            <p className="text-[11px] font-semibold text-slate-800 truncate">
                              Session #{(sess.id || '').slice(-6).toUpperCase()}
                            </p>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Clock size={9} />
                              {sess.createdAt ? new Date(sess.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {sess._count?.screenings ?? sess.screenings?.length ?? 0} screenings
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="px-3 py-2 border-t border-slate-100">
                      <button
                        onClick={() => setActiveTab('single')}
                        className="w-full btn-primary py-1.5 text-xs gap-1.5"
                      >
                        <Zap size={11} /> New Screening
                      </button>
                    </div>
                  </div>
                </div>

                {/* Session results */}
                <div className="flex-1 min-w-0">
                  {!selectedSession ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                      <History size={32} />
                      <p className="text-sm">Select a session to view results</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                        <div>
                          <p className="text-xs font-bold text-slate-700">
                            Session #{(selectedSession.id || '').slice(-6).toUpperCase()}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {selectedSession.createdAt ? new Date(selectedSession.createdAt).toLocaleString('en-GB') : ''}
                          </p>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {sessResultsLoading ? 'Loading…' : `${sessResults.length} result${sessResults.length !== 1 ? 's' : ''}`}
                        </span>
                      </div>
                      {sessResultsLoading ? (
                        <div className="flex justify-center py-10">
                          <div className="w-6 h-6 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
                        </div>
                      ) : sessResults.length === 0 ? (
                        <p className="text-center text-slate-400 text-sm py-10">No results in this session.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="ats-table">
                            <thead>
                              <tr>
                                <th style={{ width: 30 }}>#</th>
                                <th style={{ minWidth: 150 }}>Candidate</th>
                                <th style={{ minWidth: 150 }}>Job Title</th>
                                <th style={{ width: 75 }}>Score</th>
                                <th style={{ width: 140 }}>Recommendation</th>
                                <th style={{ minWidth: 140 }}>Matched Skills</th>
                                <th style={{ width: 70 }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...sessResults]
                                .sort((a, b) => (b.score || 0) - (a.score || 0))
                                .map((r, i) => {
                                  const candName = r.candidate
                                    ? `${r.candidate.firstName || ''} ${r.candidate.lastName || ''}`.trim()
                                    : r.candidateName || '—';
                                  const recKey = (r.recommendation || '').toUpperCase().replace(/[\s-]+/g, '_');
                                  return (
                                    <tr key={r.id || i} className="border-b border-slate-100 hover:bg-blue-50/30">
                                      <td className="px-3 py-2 text-center text-[11px] text-slate-400 font-mono">{i + 1}</td>
                                      <td className="px-3 py-2">
                                        <p className="text-xs font-medium text-slate-800 truncate max-w-[150px]">{candName}</p>
                                        {r.candidate?.displayId && (
                                          <p className="text-[10px] text-slate-400 font-mono">{r.candidate.displayId}</p>
                                        )}
                                      </td>
                                      <td className="px-3 py-2">
                                        <span className="text-xs text-slate-700 truncate max-w-[150px] block">{r.job?.title || r.jobTitle || '—'}</span>
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        <span className={`text-sm ${scoreColor(r.score)}`}>{r.score ?? '—'}</span>
                                      </td>
                                      <td className="px-3 py-2">
                                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${REC_STYLES[recKey] || 'bg-slate-100 text-slate-600'}`}>
                                          {recKey.replace(/_/g, ' ')}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2">
                                        <div className="flex flex-wrap gap-0.5">
                                          {(r.matchedSkills || []).slice(0, 4).map((s, j) => (
                                            <span key={j} className="px-1.5 py-0 bg-emerald-100 text-emerald-700 text-[10px] rounded-full">{s}</span>
                                          ))}
                                          {(r.matchedSkills || []).length > 4 && (
                                            <span className="text-[10px] text-slate-400">+{r.matchedSkills.length - 4}</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-3 py-2">
                                        {r.candidate?.id && (
                                          <Link href={`/candidates/${r.candidate.id}`} className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-brand-600 hover:bg-brand-50" title="View Candidate">
                                            <Eye size={13} />
                                          </Link>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ HISTORY ═══ */}
          {activeTab === 'history' && (
            <div className="max-w-6xl mx-auto space-y-3">
              <div className="flex items-center gap-3">
                <form
                  onSubmit={e => { e.preventDefault(); setSearch(searchInput); setPage(1); }}
                  className="flex items-center gap-1"
                >
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search candidate, job…"
                      value={searchInput}
                      onChange={e => setSearchInput(e.target.value)}
                      className="pl-7 pr-7 py-1.5 border border-slate-200 rounded text-xs w-52 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    {searchInput && (
                      <button
                        type="button"
                        onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <button type="submit" className="btn-primary py-1.5 px-2.5 text-xs">
                    <Search size={12} />
                  </button>
                </form>
                <button onClick={fetchHistory} className="btn-ghost py-1.5 px-2 text-xs">
                  <RefreshCw size={13} />
                </button>
                <span className="ml-auto text-xs text-slate-400">{total} records</span>
              </div>

              {histError && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle size={13} /> {histError}
                </div>
              )}

              {histLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-6 h-6 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
                </div>
              ) : screenings.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-60 gap-3">
                  <p className="text-slate-400 text-sm">No screening records found.</p>
                  <button onClick={() => setActiveTab('single')} className="btn-primary py-1.5 px-4 text-xs gap-1.5">
                    <Zap size={13} /> Run a Screening
                  </button>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="ats-table">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        <th style={{ width: 140 }}>Candidate</th>
                        <th style={{ width: 105 }}>Cand. ID</th>
                        <th style={{ minWidth: 160 }}>Job Title</th>
                        <th style={{ width: 90 }}>Job ID</th>
                        <th style={{ width: 80 }}>Score</th>
                        <th style={{ width: 135 }}>Recommendation</th>
                        <th style={{ width: 115 }}>Recruiter</th>
                        <th style={{ width: 100 }}>Date</th>
                        <th style={{ width: 80 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {screenings.map(s => {
                        const candName = s.candidate
                          ? `${s.candidate.firstName} ${s.candidate.lastName}`.trim()
                          : '—';
                        const recruiter = s.user
                          ? `${s.user.firstName} ${s.user.lastName}`.trim()
                          : '—';
                        return (
                          <tr key={s.id} className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors">
                            <td className="px-3 py-2">
                              <span className="text-xs font-medium text-slate-900 block max-w-[140px] truncate" title={candName}>
                                {candName}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span className="font-mono text-[11px] text-brand-600">{s.candidate?.displayId || '—'}</span>
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-xs text-slate-700 block max-w-[160px] truncate">{s.job?.title || '—'}</span>
                            </td>
                            <td className="px-3 py-2">
                              <span className="font-mono text-[11px] text-slate-500">{s.job?.displayId || '—'}</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`text-xs ${scoreColor(s.score)}`}>{s.score}/100</span>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${REC_STYLES[s.recommendation] || 'bg-slate-100 text-slate-600'}`}>
                                {(s.recommendation || '').replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-xs text-slate-500 block max-w-[115px] truncate">{recruiter}</span>
                            </td>
                            <td className="px-3 py-2 text-[11px] text-slate-400 whitespace-nowrap">
                              {s.screenedAt
                                ? new Date(s.screenedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                                : '—'}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                {s.candidate?.id && (
                                  <Link
                                    href={`/candidates/${s.candidate.id}`}
                                    className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                                    title="Candidate"
                                  >
                                    <Users size={13} />
                                  </Link>
                                )}
                                {s.job?.id && (
                                  <Link
                                    href={`/jobs/view/${s.job.id}`}
                                    className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                                    title="Job"
                                  >
                                    <Briefcase size={13} />
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}

