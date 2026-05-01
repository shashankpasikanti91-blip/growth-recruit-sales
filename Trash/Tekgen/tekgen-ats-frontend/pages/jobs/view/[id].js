'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Building2, MapPin, Users, Tag, User, Calendar, Edit, Search, Copy, Check, Shield, Clock, Globe, DollarSign, Briefcase, ChevronRight, X } from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import api from '../../../lib/api';
import { useRole } from '../../../lib/useRole';

// ---------------------------------------------------------------------------
// Structured JD renderer
// ---------------------------------------------------------------------------
function StructuredJD({ text }) {
  if (!text || !text.trim()) {
    return <p className="text-gray-400 italic">No description provided.</p>;
  }
  const rawLines = text.split('\n');
  const isHeader = (line) => {
    const t = line.trim();
    if (!t) return false;
    if (t === t.toUpperCase() && /[A-Z]{3,}/.test(t) && t.length < 80) return true;
    if (/^(\d{1,2}\.|\d{1,2}\)|\d{1,2}:)\s+[A-Z]/.test(t)) return true;
    if (/^[A-Z][A-Za-z\s\-/&]{2,50}:$/.test(t)) return true;
    return false;
  };
  const isBullet = (line) => {
    const t = line.trim();
    return /^[-•*·▪]\s+/.test(t) || /^\d+\.\s+/.test(t);
  };
  const sections = [];
  let currentSection = { header: null, lines: [] };
  rawLines.forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    if (isHeader(line)) {
      if (currentSection.lines.length > 0 || currentSection.header) sections.push({ ...currentSection });
      currentSection = { header: line, lines: [] };
    } else {
      currentSection.lines.push(raw);
    }
  });
  if (currentSection.lines.length > 0 || currentSection.header) sections.push(currentSection);

  return (
    <div className="space-y-5 text-gray-700 text-sm leading-relaxed">
      {sections.map((sec, si) => (
        <div key={si}>
          {sec.header && <h4 className="font-bold text-gray-900 text-base mb-2 border-b border-gray-200 pb-1">{sec.header}</h4>}
          <div className="space-y-1">
            {sec.lines.map((line, li) => {
              const trimmed = line.trim();
              if (!trimmed) return null;
              if (isBullet(trimmed)) {
                const content = trimmed.replace(/^[-•*·▪\d\.]+\s*/, '');
                return (
                  <div key={li} className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5 flex-shrink-0">•</span>
                    <span>{content}</span>
                  </div>
                );
              }
              return <p key={li} className="text-gray-700">{trimmed}</p>;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const CONTRACT_COLORS = {
  PERMANENT: 'bg-green-100 text-green-800',
  CONTRACT: 'bg-blue-100 text-blue-800',
  FREELANCE: 'bg-purple-100 text-purple-800',
  INTERNSHIP: 'bg-yellow-100 text-yellow-800',
};

function ContractBadge({ type }) {
  if (!type) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${CONTRACT_COLORS[type] || 'bg-gray-100 text-gray-700'}`}>
      <Tag size={11} />{type.charAt(0) + type.slice(1).toLowerCase()}
    </span>
  );
}

const STATUS_COLORS = {
  OPEN: 'bg-green-100 text-green-800',
  CLOSED: 'bg-red-100 text-red-800',
  DRAFT: 'bg-gray-100 text-gray-700',
  FILLED: 'bg-blue-100 text-blue-800',
};

function InfoCard({ label, value, mono = false, icon }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
        {icon && icon}{label}
      </p>
      <p className={`text-gray-900 font-semibold text-sm ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  );
}

function SkillPill({ skill, variant = 'primary' }) {
  const colors = {
    primary: 'bg-blue-50 text-blue-800 border-blue-200',
    success: 'bg-green-50 text-green-800 border-green-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
  };
  return (
    <span className={`inline-block border rounded-full px-3 py-1 text-xs font-medium ${colors[variant]}`}>
      {skill}
    </span>
  );
}

// Boolean Search Modal
function BooleanModal({ booleanString, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(booleanString || '').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">Boolean Search String</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-xs text-gray-500 mb-3">Use this string in LinkedIn, Naukri, JobStreet or any ATS search:</p>
          <div className="bg-gray-900 text-green-400 font-mono text-sm rounded-xl p-4 whitespace-pre-wrap break-words leading-relaxed">
            {booleanString || 'Boolean search not generated yet.'}
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {copied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy to Clipboard</>}
            </button>
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JobViewPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isAdmin, isSalesRole } = useRole();
  const canManageJobs = isAdmin || isSalesRole;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBoolean, setShowBoolean] = useState(false);
  const [booleanLoading, setBooleanLoading] = useState(false);
  const [booleanString, setBooleanString] = useState('');

  useEffect(() => { if (id) fetchJob(); }, [id]);

  const fetchJob = async () => {
    try {
      const res = await api.get(`/api/jobs/${id}`);
      setJob(res.data.data);
      if (res.data.data?.booleanSearchString) {
        setBooleanString(res.data.data.booleanSearchString);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleViewBoolean = async () => {
    if (booleanString) { setShowBoolean(true); return; }
    setBooleanLoading(true);
    try {
      const res = await api.get(`/api/jobs/${id}/boolean`);
      setBooleanString(res.data.data?.booleanSearchString || '');
      setShowBoolean(true);
    } catch (e) {
      setBooleanString('Failed to generate — please try again.');
      setShowBoolean(true);
    } finally {
      setBooleanLoading(false);
    }
  };

  const fmtSalary = (job) => {
    if (!job) return '—';
    const min = job.salaryMin, max = job.salaryMax;
    const currency = job.salaryCurrency || 'MYR';
    const freq = job.salaryFrequency ? ` / ${job.salaryFrequency}` : '';
    if (!min && !max) return 'Not specified';
    if (min && max) return `${currency} ${Number(min).toLocaleString()} – ${Number(max).toLocaleString()}${freq}`;
    if (min) return `From ${currency} ${Number(min).toLocaleString()}${freq}`;
    return `Up to ${currency} ${Number(max).toLocaleString()}${freq}`;
  };

  const fmtExp = (job) => {
    if (!job) return '—';
    const min = job.minExperience, max = job.maxExperience;
    if (!min && !max) return 'Not specified';
    if (min && max) return `${min} – ${max} years`;
    if (min) return `${min}+ years`;
    return `Up to ${max} years`;
  };

  return (
    <DashboardLayout>
      {showBoolean && <BooleanModal booleanString={booleanString} onClose={() => setShowBoolean(false)} />}

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium">
            <ArrowLeft size={18} /> Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Job Details</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-lg">{error}</div>
        ) : job ? (
          <div className="space-y-6">

            {/* Title card */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-gray-900 break-words">{job.title}</h2>
                  {job.clientName && (
                    <p className="mt-1 flex items-center gap-2 text-blue-700 font-semibold text-base">
                      <Building2 size={16} /> {job.clientName}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                    {job.location && <span className="flex items-center gap-1"><MapPin size={14} />{job.location}</span>}
                    {job.country && <span className="flex items-center gap-1"><Globe size={14} />{job.country}</span>}
                    {job.department && <span className="flex items-center gap-1"><Users size={14} />{job.department}</span>}
                    <ContractBadge type={job.contractType} />
                    {job.contractType === 'CONTRACT' && job.contractDuration && (
                      <span className="flex items-center gap-1 text-xs text-gray-500"><Clock size={12} />{job.contractDuration}</span>
                    )}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-700'}`}>
                      {job.status}
                    </span>
                  </div>
                  {job.user && (
                    <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                      <User size={12} />
                      Uploaded by&nbsp;<span className="font-semibold text-gray-700">{job.user.firstName} {job.user.lastName}</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0">
                  {canManageJobs && (
                  <button
                    onClick={() => router.push(`/jobs/edit/${id}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    <Edit size={15} /> Edit Job
                  </button>
                  )}
                  <button
                    onClick={handleViewBoolean}
                    disabled={booleanLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium disabled:opacity-60"
                  >
                    <Search size={15} />
                    {booleanLoading ? 'Generating…' : 'Boolean Search'}
                  </button>
                </div>
              </div>
            </div>

            {/* Key stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoCard label="Job ID" value={job.displayId} mono icon={<Briefcase size={12} />} />
              <InfoCard label="Experience" value={fmtExp(job)} icon={<Clock size={12} />} />
              <InfoCard label="Salary" value={fmtSalary(job)} icon={<DollarSign size={12} />} />
              <InfoCard label="Applications" value={job._count?.applications ?? 0} icon={<Users size={12} />} />
            </div>

            {/* Work Authorization */}
            {job.workAuthorization && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3">
                <Shield size={16} className="text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Work Authorization</p>
                  <p className="text-sm text-amber-900 font-medium">{job.workAuthorization}</p>
                </div>
              </div>
            )}

            {/* Skills */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-gray-900">Skills Requirements</h3>

              {(job.mandatorySkills || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Mandatory</p>
                  <div className="flex flex-wrap gap-2">
                    {job.mandatorySkills.map(s => <SkillPill key={s} skill={s} variant="warning" />)}
                  </div>
                </div>
              )}

              {(job.preferredSkills || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Preferred</p>
                  <div className="flex flex-wrap gap-2">
                    {job.preferredSkills.map(s => <SkillPill key={s} skill={s} variant="success" />)}
                  </div>
                </div>
              )}

              {(job.requiredSkills || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Required (All)</p>
                  <div className="flex flex-wrap gap-2">
                    {job.requiredSkills.map(s => <SkillPill key={s} skill={s} variant="primary" />)}
                  </div>
                </div>
              )}

              {!(job.mandatorySkills?.length) && !(job.preferredSkills?.length) && !(job.requiredSkills?.length) && (
                <p className="text-gray-400 text-sm italic">No skills listed.</p>
              )}
            </div>

            {/* Job Description */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar size={15} className="text-blue-600" /> Job Description
              </h3>
              <StructuredJD text={job.description} />
            </div>

            {/* Dates */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-5 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Created</p>
                <p className="text-gray-800 text-sm">{new Date(job.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              {job.closedAt && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Closed</p>
                  <p className="text-gray-800 text-sm">{new Date(job.closedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              )}
            </div>

          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
