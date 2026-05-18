import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  ArrowLeft, Mail, Phone, MapPin, Briefcase, Award, Download, Send,
  FileText, Zap, CheckCircle, XCircle, AlertTriangle, BookOpen, AlertCircle, Edit2, Save, X as XIcon, Loader,
  MessageCircle, Calendar, Clock, ExternalLink,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DocRequestModal from '../../components/candidates/DocRequestModal';
import SubmissionModal from '../../components/candidates/SubmissionModal';
import api from '../../lib/api';

// Dev-only logger — stripped in production builds
const devLog = (...args) => {
  if (process.env.NODE_ENV === 'development') console.log('[CandidatePage]', ...args);
};

// Lightweight Toast — no external dependency
function Toast({ message, type, onClose }) {
  if (!message) return null;
  const colors = {
    error:   'bg-red-600',
    success: 'bg-green-600',
    info:    'bg-blue-600',
  };
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-lg text-white shadow-lg text-sm font-medium max-w-sm ${colors[type] || colors.info}`}>
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="text-white/70 hover:text-white flex-shrink-0" aria-label="Dismiss">
        <XIcon size={14} />
      </button>
    </div>
  );
}

function scoreBadge(score) {
  if (score >= 70) return 'bg-green-100 text-green-800 border border-green-300';
  if (score >= 55) return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
  return 'bg-red-100 text-red-800 border border-red-300';
}

function recBadge(rec) {
  const m = {
    STRONG_MATCH:   'bg-green-100 text-green-800',
    GOOD_MATCH:     'bg-blue-100 text-blue-800',
    MODERATE_MATCH: 'bg-yellow-100 text-yellow-800',
    WEAK_MATCH:     'bg-orange-100 text-orange-800',
    NOT_SUITABLE:   'bg-red-100 text-red-800',
  };
  return m[rec] || 'bg-gray-100 text-gray-700';
}

function clsBadge(cls) {
  const m = { Strong: 'bg-green-600', KIV: 'bg-yellow-500', Rejected: 'bg-red-600' };
  return m[cls] || 'bg-gray-500';
}

function BulletList({ items, color }) {
  const c = color || 'blue';
  if (!items || items.length === 0) return <p className="text-xs text-gray-400">None</p>;
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
          <span className={`text-${c}-500 mt-0.5 flex-shrink-0`}>&#8226;</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ScreeningResultPanel({ data }) {
  const fr = (data && data.fullResult) || data || {};
  const score           = data.score != null ? data.score : (fr.finalScore || 0);
  const recommendation  = data.recommendation || '';
  const reasoning       = data.reasoning || '';

  const strengths       = Array.isArray(fr.strengths)            ? fr.strengths            : [];
  const weaknesses      = Array.isArray(fr.weaknesses)           ? fr.weaknesses
    : typeof fr.weaknesses === 'string'
    ? fr.weaknesses.split(/;\s*/).filter(Boolean)
    : typeof data.gap === 'string'
    ? data.gap.split(/;\s*/).filter(Boolean) : [];
  const missingSkills   = Array.isArray(fr.missingSkills)        ? fr.missingSkills
    : (fr.jdMatchAnalysis && fr.jdMatchAnalysis.missingSkills) || [];
  const redFlags        = Array.isArray(fr.redFlags)             ? fr.redFlags             : [];
  const improvements    = Array.isArray(fr.requiredImprovements) ? fr.requiredImprovements : [];
  const matchedSkills   = Array.isArray(data.matchedSkills)      ? data.matchedSkills
    : Array.isArray(fr.matchedSkills)                            ? fr.matchedSkills        : [];
  const jdMatch         = fr.jdMatchAnalysis || {};

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-xl font-bold px-4 py-1.5 rounded-lg ${scoreBadge(score)}`}>{score}/100</span>
        {fr.classification && (
          <span className={`px-3 py-1 rounded-full text-white text-xs font-semibold ${clsBadge(fr.classification)}`}>
            {fr.classification}
          </span>
        )}
        {recommendation && (
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${recBadge(recommendation)}`}>
            {recommendation.replace(/_/g, ' ')}
          </span>
        )}
        {jdMatch.matchPercent && (
          <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold">
            JD Match: {jdMatch.matchPercent}
          </span>
        )}
      </div>

      {fr.summary && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-sm text-blue-900">{fr.summary}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-green-50 rounded-lg p-4">
          <h5 className="text-xs font-bold text-green-800 mb-2 flex items-center gap-1">
            <CheckCircle size={13} /> Matched Skills
          </h5>
          {matchedSkills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {matchedSkills.map((s, i) => (
                <span key={i} className="px-2 py-0.5 bg-green-200 text-green-900 text-xs rounded">{s}</span>
              ))}
            </div>
          ) : <p className="text-xs text-gray-400">None identified</p>}
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <h5 className="text-xs font-bold text-orange-800 mb-2 flex items-center gap-1">
            <XCircle size={13} /> Missing Skills
          </h5>
          {missingSkills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {missingSkills.map((s, i) => (
                <span key={i} className="px-2 py-0.5 bg-orange-200 text-orange-900 text-xs rounded">{s}</span>
              ))}
            </div>
          ) : <p className="text-xs text-gray-400">None</p>}
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <h5 className="text-xs font-bold text-red-800 mb-2 flex items-center gap-1">
            <AlertTriangle size={13} /> Red Flags
          </h5>
          <BulletList items={redFlags} color="red" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h5 className="text-xs font-bold text-gray-900 mb-2">Strengths</h5>
          <BulletList items={strengths} color="green" />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h5 className="text-xs font-bold text-gray-900 mb-2">Gaps / Weaknesses</h5>
          <BulletList items={weaknesses} color="orange" />
        </div>
      </div>

      {(fr.experienceValidation || fr.educationCheck || improvements.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {fr.experienceValidation && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h5 className="text-xs font-bold text-gray-900 mb-2">Experience Validation</h5>
              <dl className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <dt>Recent:</dt>
                  <dd className={fr.experienceValidation.isRecent === 'Yes' ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                    {fr.experienceValidation.isRecent}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Chronological:</dt>
                  <dd className={fr.experienceValidation.chronologicalOrder === 'Yes' ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                    {fr.experienceValidation.chronologicalOrder}
                  </dd>
                </div>
                {fr.experienceValidation.gaps && (
                  <div className="mt-1">
                    <dt className="font-medium">Gaps:</dt>
                    <dd className="text-gray-700">{fr.experienceValidation.gaps}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
          {fr.educationCheck && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h5 className="text-xs font-bold text-gray-900 mb-2">Education Check</h5>
              <dl className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <dt>Degree Present:</dt>
                  <dd className={fr.educationCheck.degreePresent === 'Yes' ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                    {fr.educationCheck.degreePresent}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Passout Year:</dt>
                  <dd className={fr.educationCheck.passoutYearPresent === 'Yes' ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                    {fr.educationCheck.passoutYearPresent}
                  </dd>
                </div>
              </dl>
            </div>
          )}
          {improvements.length > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <h5 className="text-xs font-bold text-blue-900 mb-2">Required Improvements</h5>
              <BulletList items={improvements} color="blue" />
            </div>
          )}
        </div>
      )}

      {reasoning && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h5 className="text-xs font-bold text-gray-900 mb-1">AI Reasoning</h5>
          <p className="text-sm text-gray-700 leading-relaxed">{reasoning}</p>
        </div>
      )}
    </div>
  );
}

export default function CandidateDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [candidate, setCandidate]         = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [activeTab, setActiveTab]         = useState('overview');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [jobs, setJobs]                   = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [screening, setScreening]         = useState(false);
  const [screenResult, setScreenResult]   = useState(null);
  const [screenError, setScreenError]     = useState('');
  const [identityEdit, setIdentityEdit]   = useState(false);
  const [identitySaving, setIdentitySaving] = useState(false);
  const [identitySaved, setIdentitySaved] = useState(false);
  const [identityForm, setIdentityForm]   = useState({ icNumber: '', passportNumber: '', nationality: '', dob: '', gender: '', maritalStatus: '' });
  const [toast, setToast]                 = useState(null);
  const [showDocModal, setShowDocModal]   = useState(false);
  const [showSubModal, setShowSubModal]   = useState(false);
  const [candidateInterviews, setCandidateInterviews] = useState([]);
  const [interviewsLoading, setInterviewsLoading] = useState(false);
  const [waMessage, setWaMessage] = useState('');
  const [waSending, setWaSending] = useState(false);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchCandidate = useCallback(async () => {
    try {
      const res = await api.get(`/api/candidates/${id}`);
      const c = res.data.data;
      setCandidate(c);
      setIdentityForm({
        icNumber: c.icNumber || '',
        passportNumber: c.passportNumber || '',
        nationality: c.nationality || '',
        dob: c.dob ? c.dob.substring(0, 10) : '',
        gender: c.gender || '',
        maritalStatus: c.maritalStatus || '',
      });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load candidate');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleIdentityChange = (e) => {
    const { name, value } = e.target;
    if (name === 'icNumber') {
      const digits = value.replace(/[^0-9]/g, '');
      let fmt = digits;
      if (digits.length > 6) fmt = digits.substring(0,6) + '-' + digits.substring(6);
      if (digits.length > 8) fmt = digits.substring(0,6) + '-' + digits.substring(6,8) + '-' + digits.substring(8,12);
      setIdentityForm(prev => {
        const next = { ...prev, icNumber: fmt };
        if (digits.length === 12) {
          const yy = parseInt(digits.substring(0,2));
          const mm = parseInt(digits.substring(2,4));
          const dd = parseInt(digits.substring(4,6));
          const year = yy <= 25 ? 2000 + yy : 1900 + yy;
          if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
            next.dob = `${year}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
          }
          next.gender = parseInt(digits.charAt(11)) % 2 === 0 ? 'FEMALE' : 'MALE';
        }
        return next;
      });
      return;
    }
    setIdentityForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveIdentity = async () => {
    setIdentitySaving(true);
    try {
      const payload = { ...identityForm };
      if (payload.dob) payload.dob = new Date(payload.dob).toISOString();
      else delete payload.dob;
      await api.put(`/api/candidates/${id}`, payload);
      setCandidate(prev => ({ ...prev, ...identityForm, dob: payload.dob || null }));
      setIdentityEdit(false);
      setIdentitySaved(true);
      setTimeout(() => setIdentitySaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save identity details');
    } finally {
      setIdentitySaving(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCandidate();
      api.get('/api/jobs?limit=200').then(r => {
        const d = r.data.data;
        setJobs(Array.isArray(d) ? d : (d?.jobs || []));
      }).catch(() => {});
    }
  }, [id, fetchCandidate]);

  useEffect(() => {
    if (activeTab !== 'interviews' || !id) return;
    let cancelled = false;
    (async () => {
      setInterviewsLoading(true);
      try {
        const res = await api.get(`/api/analytics/interview/list?candidateId=${id}`);
        if (!cancelled) setCandidateInterviews(res.data.data || []);
      } catch {
        if (!cancelled) setCandidateInterviews([]);
      } finally {
        if (!cancelled) setInterviewsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, id]);

  const handleStatusChange = async (newStatus) => {
    setStatusUpdating(true);
    try {
      await api.patch(`/api/candidates/${id}/status`, { status: newStatus });
      setCandidate(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      setError(err.response?.data?.message || 'Status update failed');
    } finally {
      setStatusUpdating(false);
    }
  };

  const sendWhatsAppToCandidate = async () => {
    if (!waMessage.trim()) {
      showToast('Enter a message to send.', 'error');
      return;
    }
    setWaSending(true);
    try {
      await api.post(`/api/candidates/${id}/whatsapp-message`, { message: waMessage.trim() });
      showToast('WhatsApp message sent.', 'success');
      setWaMessage('');
      fetchCandidate();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not send WhatsApp. Check Integrations and candidate phone.', 'error');
    } finally {
      setWaSending(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const res = await api.get(`/api/export/candidates/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${candidate.firstName}-${candidate.lastName}-profile.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download PDF');
    }
  };

  const handleScreenCandidate = async () => {
    if (!selectedJobId) {
      showToast('Please select a job before running AI screening.', 'error');
      return;
    }
    if (!candidate?.resumeText) {
      showToast('No resume text found. Upload a resume first.', 'error');
      return;
    }
    devLog('Screening candidate', id, 'against job', selectedJobId);
    setScreening(true);
    setScreenResult(null);
    setScreenError('');
    try {
      // /screenings/single links result to THIS candidate by candidateId, not re-parsed copy
      const res = await api.post('/api/screenings/single', {
        candidateId: id,
        jobId: selectedJobId,
      });
      devLog('Screening result', res.data.data);
      setScreenResult(res.data.data);
      setActiveTab('screenings');
      showToast('AI screening complete. Scroll to Screenings tab to view the full result.', 'success');

      // Auto-fill client name, hire type, and applying-for role from the selected job
      // Only fill if candidate hasn't already manually set these
      const selectedJob = jobs.find(j => j.id === selectedJobId);
      if (selectedJob) {
        const autoFill = {};
        if (!candidate.applyingForRole && selectedJob.title) autoFill.applyingForRole = selectedJob.title;
        if (!candidate.hireType && selectedJob.contractType) autoFill.hireType = selectedJob.contractType;
        if (!candidate.applyingClientName && selectedJob.clientName) autoFill.applyingClientName = selectedJob.clientName;
        if (Object.keys(autoFill).length > 0) {
          await api.put(`/api/candidates/${id}`, autoFill);
          devLog('Auto-filled from job:', autoFill);
        }
      }

      fetchCandidate();
    } catch (err) {
      const msg = err.response?.data?.message || 'Screening failed. Please try again.';
      setScreenError(msg);
      showToast(msg, 'error');
      devLog('Screening error', err);
    } finally {
      setScreening(false);
    }
  };

  const statusOptions = ['NEW', 'APPLIED', 'SCREENED', 'INTERVIEW', 'REJECTED', 'HIRED', 'ON_HOLD'];
  const statusColor = {
    NEW: 'bg-gray-100 text-gray-800',
    APPLIED: 'bg-blue-100 text-blue-800',
    SCREENED: 'bg-yellow-100 text-yellow-800',
    INTERVIEW: 'bg-purple-100 text-purple-800',
    REJECTED: 'bg-red-100 text-red-800',
    HIRED: 'bg-green-100 text-green-800',
    ON_HOLD: 'bg-orange-100 text-orange-800',
  };

  if (loading) {
    return (
      <DashboardLayout>
      {showDocModal && <DocRequestModal candidate={candidate} onClose={() => setShowDocModal(false)} />}
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!candidate) {
    return (
      <DashboardLayout>
      {showDocModal && <DocRequestModal candidate={candidate} onClose={() => setShowDocModal(false)} />}
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Candidate not found'}
        </div>
      </DashboardLayout>
    );
  }

  const educationLines = (candidate.education || '').split(/\|/).map(s => s.trim()).filter(Boolean);

  return (
    <DashboardLayout>
      {showDocModal && <DocRequestModal candidate={candidate} onClose={() => setShowDocModal(false)} />}
      {showSubModal && (
        <SubmissionModal
          candidate={candidate}
          onClose={() => setShowSubModal(false)}
          onSaved={() => { setShowSubModal(false); fetchCandidate(); }}
        />
      )}
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
      <div className="max-w-5xl mx-auto space-y-6 pb-12">

        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-900 mt-1">
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {candidate.firstName} {candidate.lastName}
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">{candidate.currentRole || 'Job Seeker'}</p>
            </div>
          </div>
          <button onClick={() => setShowDocModal(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 text-sm font-medium mr-2"><Send size={14} /> Request Docs</button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium"
          >
            <Download size={16} /> Download PDF
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-1.5 text-gray-500 mb-1 text-xs"><Mail size={15} />Email</div>
            <p className="font-semibold text-gray-900 text-sm truncate" title={candidate.email}>{candidate.email}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-1.5 text-gray-500 mb-1 text-xs"><Phone size={15} />Phone</div>
            <p className="font-semibold text-gray-900 text-sm">{candidate.phone || 'N/A'}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-1.5 text-gray-500 mb-1 text-xs"><MapPin size={15} />Location</div>
            <p className="font-semibold text-gray-900 text-sm">{candidate.location || 'N/A'}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-1.5 text-gray-500 mb-1 text-xs"><Briefcase size={15} />Experience</div>
            <p className="font-semibold text-gray-900 text-sm">
              {candidate.experience != null ? `${candidate.experience} yr${candidate.experience !== 1 ? 's' : ''}` : 'N/A'}
            </p>
          </div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-lg p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
            <MessageCircle size={16} className="text-emerald-600" /> WhatsApp (Cloud API)
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Uses your verified WhatsApp integration. The candidate must have a mobile number on file. Business rules (templates, 24h window) apply per Meta.
          </p>
          <textarea
            value={waMessage}
            onChange={e => setWaMessage(e.target.value)}
            placeholder="Type your message to the candidate..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={sendWhatsAppToCandidate}
              disabled={waSending || !candidate.phone}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {waSending ? 'Sending…' : 'Send WhatsApp'}
            </button>
          </div>
          {!candidate.phone && (
            <p className="text-xs text-amber-700 mt-2">Add a phone number to this candidate to enable WhatsApp.</p>
          )}
        </div>

        {candidate.skills && candidate.skills.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Award size={16} className="text-blue-600" /> Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.map((skill, i) => (
                <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">{skill}</span>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white border border-blue-200 rounded-lg p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Zap size={16} className="text-blue-600" /> AI Screen Against a Job
          </h3>
          {!candidate.resumeText ? (
            <p className="text-sm text-gray-400">No resume text on file. Upload a resume to enable AI screening.</p>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={selectedJobId}
                onChange={e => setSelectedJobId(e.target.value)}
                className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a Job to Screen Against...</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>
                    {j.displayId ? `[${j.displayId}] ` : ''}{j.title} - {j.department || 'General'}
                  </option>
                ))}
              </select>
              <div title={!selectedJobId ? 'Select a job first' : screening ? 'Screening in progress…' : ''}>
                <button
                  onClick={handleScreenCandidate}
                  disabled={!selectedJobId || screening}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold whitespace-nowrap"
                >
                  {screening
                    ? <><Loader size={15} className="animate-spin" /> Screening…</>
                    : <><Zap size={15} /> Screen Now</>}
                </button>
              </div>
            </div>
          )}
          {screenError && <p className="mt-3 text-sm text-red-600">{screenError}</p>}
          {screenResult && (
            <div className="mt-5 border-t border-gray-100 pt-5">
              <p className="text-xs text-gray-500 mb-3">Latest result</p>
              <ScreeningResultPanel data={screenResult} />
            </div>
          )}
        </div>

        <div className="border-b border-gray-200">
          <div className="flex gap-6">
            {['overview', 'applications', 'screenings', 'resume', 'interviews'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'screenings' && candidate.screenings && candidate.screenings.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                    {candidate.screenings.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            <div className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor[candidate.status] || 'bg-gray-100 text-gray-700'}`}>
                  {candidate.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Change:</label>
                <select
                  value={candidate.status}
                  onChange={e => handleStatusChange(e.target.value)}
                  disabled={statusUpdating}
                  className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {statusUpdating && <span className="text-xs text-blue-600">Saving...</span>}
              </div>
            </div>

            <div className="p-5">
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Briefcase size={13} /> Experience</p>
              <p className="text-gray-900 font-semibold">
                {candidate.experience != null
                  ? `${candidate.experience} year${candidate.experience !== 1 ? 's' : ''}`
                  : 'Not specified'}
              </p>
              {candidate.currentRole && (
                <p className="text-sm text-gray-500 mt-0.5">Current: {candidate.currentRole}</p>
              )}
            </div>

            {candidate.skills && candidate.skills.length > 0 && (
              <div className="p-5">
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1"><Award size={13} /> Skills</p>
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((s, i) => (
                    <span key={i} className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">{s}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="p-5">
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1"><BookOpen size={13} /> Education</p>
              {educationLines.length > 0 ? (
                <ul className="space-y-1.5">
                  {educationLines.map((edu, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-blue-500 mt-0.5 flex-shrink-0">&#x1F393;</span>
                      <span>{edu}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">No education data available</p>
              )}
            </div>

            {candidate.resumeUrl && (
              <div className="p-5">
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><FileText size={13} /> Resume</p>
                <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                  <FileText size={15} /> View Resume File
                </a>
              </div>
            )}

            {candidate.linkedinUrl && (
              <div className="p-5">
                <p className="text-xs text-gray-500 mb-1">LinkedIn</p>
                <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 break-all">{candidate.linkedinUrl}</a>
              </div>
            )}

            {candidate.portfolio && (
              <div className="p-5">
                <p className="text-xs text-gray-500 mb-1">Portfolio</p>
                <a href={candidate.portfolio} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 break-all">{candidate.portfolio}</a>
              </div>
            )}

            {/* ── Submission & Call Details — always visible ── */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded text-xs flex items-center justify-center font-bold">S</span>
                  Submission &amp; Call Details
                </p>
                <button
                  onClick={() => setShowSubModal(true)}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  <Edit2 size={12} /> Edit Submission
                </button>
              </div>

              {/* Applying-for highlight box */}
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-blue-500 font-semibold">Client Name</p>
                  <p className="text-sm font-bold text-blue-900">
                    {candidate.applyingClientName || candidate.latestClientName ||
                     candidate.screenings?.[0]?.job?.clientName ||
                     <span className="text-gray-400 font-normal italic text-xs">Not set — fill in submission</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-500 font-semibold">Title of Role</p>
                  <p className="text-sm font-bold text-blue-900">
                    {candidate.applyingForRole || candidate.latestScreenedJobTitle ||
                     candidate.screenings?.[0]?.job?.title ||
                     <span className="text-gray-400 font-normal italic text-xs">Not set</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-500 font-semibold">Hire Type</p>
                  {(() => {
                    const ht = candidate.hireType || candidate.screenings?.[0]?.job?.contractType;
                    return ht ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                        ht === 'PERMANENT'  ? 'bg-emerald-100 text-emerald-700' :
                        ht === 'CONTRACT'   ? 'bg-blue-100 text-blue-700' :
                        ht === 'FREELANCE'  ? 'bg-purple-100 text-purple-700' :
                        ht === 'INTERNSHIP' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{ht.charAt(0) + ht.slice(1).toLowerCase()}</span>
                    ) : <span className="text-gray-400 font-normal italic text-xs">Not set</span>;
                  })()}
                </div>
              </div>

              {/* Call Status */}
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-1">Call Status</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                  candidate.callStatus === 'REACHED'            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  candidate.callStatus === 'INTERESTED'         ? 'bg-teal-50 text-teal-700 border-teal-200' :
                  candidate.callStatus === 'NOT_ANSWERED'       ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  candidate.callStatus === 'WHATSAPP_SENT'      ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  candidate.callStatus === 'EMAIL_SENT'         ? 'bg-violet-50 text-violet-700 border-violet-200' :
                  candidate.callStatus === 'NOT_INTERESTED'     ? 'bg-red-50 text-red-700 border-red-200' :
                  candidate.callStatus === 'CALLBACK_REQUESTED' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                  'bg-gray-50 text-gray-500 border-gray-200'
                }`}>
                  {candidate.callStatus === 'NOT_CALLED'          ? 'Not Called Yet' :
                   candidate.callStatus === 'REACHED'             ? 'Reached — Interested' :
                   candidate.callStatus === 'INTERESTED'          ? 'Interested (Callback)' :
                   candidate.callStatus === 'NOT_ANSWERED'        ? 'Not Answered / No Reply' :
                   candidate.callStatus === 'WHATSAPP_SENT'       ? 'WhatsApp Message Sent' :
                   candidate.callStatus === 'EMAIL_SENT'          ? 'Email Sent' :
                   candidate.callStatus === 'NOT_INTERESTED'      ? 'Not Interested' :
                   candidate.callStatus === 'CALLBACK_REQUESTED'  ? 'Callback Requested' :
                   'Not Called Yet'}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                <div>
                  <p className="text-xs text-gray-400">Visa Type</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {candidate.visaType === 'CITIZEN'         ? 'Citizen (Malaysian)' :
                     candidate.visaType === 'PR'              ? 'Permanent Resident (PR)' :
                     candidate.visaType === 'EMPLOYMENT_PASS' ? 'Employment Pass (EP)' :
                     candidate.visaType === 'WORK_PERMIT'     ? 'Work Permit' :
                     candidate.visaType === 'STUDENT'         ? 'Student Pass' :
                     candidate.visaType === 'DEPENDENT'       ? 'Dependent Pass' :
                     candidate.visaType === 'NOT_APPLICABLE'  ? 'Not Applicable' :
                     candidate.visaType || <span className="text-gray-400 font-normal">Not set</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Visa Validity</p>
                  <p className="text-sm font-semibold text-gray-900">{candidate.visaValidity || <span className="text-gray-400 font-normal">Not set</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Current Employer</p>
                  <p className="text-sm font-semibold text-gray-900">{candidate.currentEmployer || <span className="text-gray-400 font-normal">Not set</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Current Salary (RM)</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {candidate.currentSalary != null ? `RM ${Number(candidate.currentSalary).toLocaleString()}` : <span className="text-gray-400 font-normal">Not set</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Expected Salary (RM)</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {candidate.expectedSalary != null ? `RM ${Number(candidate.expectedSalary).toLocaleString()}` : <span className="text-gray-400 font-normal">Not set</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Notice Period</p>
                  <p className="text-sm font-semibold text-gray-900">{candidate.noticePeriod || <span className="text-gray-400 font-normal">Not set</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Interview Mode</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {candidate.interviewMode === 'VIDEO'     ? 'Video Call' :
                     candidate.interviewMode === 'PHONE'     ? 'Phone Call' :
                     candidate.interviewMode === 'IN_PERSON' ? 'In Person' :
                     candidate.interviewMode === 'ANY'       ? 'Any Mode' :
                     candidate.interviewMode || <span className="text-gray-400 font-normal">Not set</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Relevant Experience</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {candidate.relevantExperience != null ? `${candidate.relevantExperience} yr${candidate.relevantExperience !== 1 ? 's' : ''}` : <span className="text-gray-400 font-normal">Not set</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Preferred Location</p>
                  <p className="text-sm font-semibold text-gray-900">{candidate.preferredLocation || <span className="text-gray-400 font-normal">Not set</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Offers in Hand</p>
                  <p className="text-sm font-semibold text-gray-900">{candidate.offersInHand || <span className="text-gray-400 font-normal">None</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Source</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {(candidate.sourceChannel || '').replace(/_/g, ' ') || <span className="text-gray-400 font-normal">Not set</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Submission Date</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {candidate.submissionDate
                      ? new Date(candidate.submissionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : <span className="text-gray-400 font-normal">Not set</span>}
                  </p>
                </div>
              </div>

              {candidate.recruiterNotes && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-yellow-800 mb-1">Recruiter Notes</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{candidate.recruiterNotes}</p>
                </div>
              )}
            </div>

            {/* Identity & Personal Details — always visible, editable */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-5 h-5 bg-orange-100 text-orange-700 rounded text-xs flex items-center justify-center font-bold">ID</span>
                  Identity &amp; Personal Details
                  {!candidate.icNumber && !candidate.passportNumber && !identityEdit && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded font-medium">
                      <AlertCircle size={11} /> Pending — please fill in
                    </span>
                  )}
                  {identitySaved && (
                    <span className="text-green-600 text-xs font-medium">✓ Saved</span>
                  )}
                </p>
                {!identityEdit ? (
                  <button onClick={() => setIdentityEdit(true)}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium">
                    <Edit2 size={12} /> Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={handleSaveIdentity} disabled={identitySaving}
                      className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
                      <Save size={12} /> {identitySaving ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => { setIdentityEdit(false); setIdentityForm({ icNumber: candidate.icNumber||'', passportNumber: candidate.passportNumber||'', nationality: candidate.nationality||'', dob: candidate.dob ? candidate.dob.substring(0,10) : '', gender: candidate.gender||'', maritalStatus: candidate.maritalStatus||'' }); }}
                      className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg">
                      <XIcon size={12} /> Cancel
                    </button>
                  </div>
                )}
              </div>

              {identityEdit ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">IC Number <span className="text-gray-400">(Malaysian)</span></label>
                      <input type="text" name="icNumber" value={identityForm.icNumber} onChange={handleIdentityChange}
                        placeholder="901231-10-5678" maxLength={14}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <p className="text-xs text-gray-400 mt-0.5">Auto-fills DOB &amp; Gender</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Passport No. <span className="text-gray-400">(Expat)</span></label>
                      <input type="text" name="passportNumber" value={identityForm.passportNumber} onChange={handleIdentityChange}
                        placeholder="A12345678"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Nationality</label>
                      <input type="text" name="nationality" value={identityForm.nationality} onChange={handleIdentityChange}
                        placeholder="Malaysian"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
                      <input type="date" name="dob" value={identityForm.dob} onChange={handleIdentityChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
                      <select name="gender" value={identityForm.gender} onChange={handleIdentityChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Select gender</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Marital Status</label>
                      <select name="maritalStatus" value={identityForm.maritalStatus} onChange={handleIdentityChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Select status</option>
                        <option value="SINGLE">Single</option>
                        <option value="MARRIED">Married</option>
                        <option value="DIVORCED">Divorced</option>
                        <option value="WIDOWED">Widowed</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                  <div>
                    <p className="text-xs text-gray-400">IC Number</p>
                    <p className="text-sm font-semibold text-gray-900 font-mono">
                      {candidate.icNumber || <span className="text-gray-400 font-sans font-normal">Not filled</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Passport No.</p>
                    <p className="text-sm font-semibold text-gray-900 font-mono">
                      {candidate.passportNumber || <span className="text-gray-400 font-sans font-normal">Not filled</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Nationality</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {candidate.nationality || <span className="text-gray-400 font-normal">Not filled</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Date of Birth</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {candidate.dob ? (
                        <>{new Date(candidate.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
                          <span className="text-xs text-gray-400 font-normal">(Age {new Date().getFullYear() - new Date(candidate.dob).getFullYear()})</span></>
                      ) : <span className="text-gray-400 font-normal">Not filled</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Gender</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {candidate.gender ? candidate.gender.charAt(0) + candidate.gender.slice(1).toLowerCase() : <span className="text-gray-400 font-normal">Not filled</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Marital Status</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {candidate.maritalStatus ? candidate.maritalStatus.charAt(0) + candidate.maritalStatus.slice(1).toLowerCase() : <span className="text-gray-400 font-normal">Not filled</span>}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'applications' && (
          <div className="space-y-3">
            {candidate.applications && candidate.applications.length > 0 ? (
              candidate.applications.map(app => (
                <div key={app.id} className="bg-white border border-gray-200 rounded-lg p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-gray-900">{app.job ? app.job.title : 'Unknown Job'}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {app.job ? app.job.department : ''} {app.job && app.job.location ? ' - ' + app.job.location : ''}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      app.status === 'SHORTLISTED' ? 'bg-green-100 text-green-800' :
                      app.status === 'SCREENED'    ? 'bg-yellow-100 text-yellow-800' :
                      app.status === 'APPLIED'     ? 'bg-blue-100 text-blue-800' :
                      app.status === 'REJECTED'    ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-700'
                    }`}>{app.status}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Applied: {new Date(app.createdAt).toLocaleDateString()}</p>
                </div>
              ))
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500 text-sm space-y-2">
                <p>No applications on record yet.</p>
                <p className="text-xs text-gray-400">This tab shows job applications after submission/shortlisting from the recruitment flow.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'screenings' && (
          <div className="space-y-5">
            {candidate.screenings && candidate.screenings.length > 0 ? (
              candidate.screenings.map(scr => (
                <div key={scr.id} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                    <div>
                      <h4 className="font-bold text-gray-900">{scr.job ? scr.job.title : 'Direct Screening'}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Screened: {new Date(scr.screenedAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
                      </p>
                    </div>
                  </div>
                  <ScreeningResultPanel data={{
                    score: scr.score,
                    recommendation: scr.recommendation,
                    reasoning: scr.reasoning,
                    matchedSkills: scr.matchedSkills,
                    gap: scr.gap,
                    fullResult: scr.fullResult,
                  }} />
                </div>
              ))
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500 text-sm">
                No screenings yet. Use the AI Screen section above to screen this candidate.
              </div>
            )}
          </div>
        )}

        {activeTab === 'resume' && (
          <div className="bg-white border border-gray-200 rounded-lg">
            {candidate.resumeUrl && (
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
                <FileText size={14} className="text-brand-600" />
                <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-brand-600 hover:text-brand-800 font-medium">
                  Download Original Resume File
                </a>
              </div>
            )}
            {candidate.resumeText ? (
              <pre className="p-5 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto max-h-[70vh] overflow-y-auto">
                {candidate.resumeText}
              </pre>
            ) : (
              <div className="p-8 text-center text-gray-400 text-sm">
                No resume text on file. Upload a resume to populate this.
              </div>
            )}
          </div>
        )}

        {activeTab === 'interviews' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-gray-600">
                Interviews linked to this candidate appear here. Schedule new ones from the <strong>Interviews</strong> page.
              </p>
              <button
                type="button"
                onClick={() => router.push('/interviews')}
                className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-1"
              >
                <Calendar size={14} /> Open Interviews
              </button>
            </div>
            {interviewsLoading ? (
              <div className="flex justify-center py-12 text-gray-500 text-sm">Loading interviews…</div>
            ) : candidateInterviews.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500 text-sm">
                No interviews scheduled for this candidate yet.
              </div>
            ) : (
              <div className="space-y-3">
                {candidateInterviews.map((inv) => (
                  <div key={inv.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-wrap justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{inv.jobTitle || 'Interview'}</p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                          <span className="inline-flex items-center gap-1"><Calendar size={12} />
                            {new Date(inv.interviewDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span className="inline-flex items-center gap-1"><Clock size={12} />{inv.time || inv.interviewTime}</span>
                          <span className="uppercase text-[10px] bg-slate-100 px-2 py-0.5 rounded">{inv.interviewType || inv.type}</span>
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        {inv.icsSentAt && <span className="bg-green-50 text-green-800 px-2 py-0.5 rounded">Calendar</span>}
                        {inv.teamsNotifiedAt && <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded">Teams</span>}
                        {inv.whatsappNotifiedAt && <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded">WhatsApp</span>}
                      </div>
                    </div>
                    {(inv.meetLink || inv.location) && (
                      <p className="text-sm text-gray-700 mt-2">
                        {inv.meetLink ? (
                          <a href={inv.meetLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                            <ExternalLink size={14} /> Meeting link
                          </a>
                        ) : (
                          inv.location
                        )}
                      </p>
                    )}
                    {inv.notes && <p className="text-xs text-gray-500 mt-2 border-t border-gray-100 pt-2">{inv.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}