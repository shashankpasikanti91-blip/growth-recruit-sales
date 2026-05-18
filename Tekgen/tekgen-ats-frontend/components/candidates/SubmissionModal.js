'use client';
/**
 * SubmissionModal — Recruiter fills post-call submission details for a candidate.
 * All data saves via PUT /api/candidates/:id using the existing update endpoint.
 */

import { useState, useEffect } from 'react';
import apiClient from '../../lib/api';
import {
  X, Save, Phone, Mail, MapPin, Briefcase, DollarSign,
  Clock, Video, AlertCircle, CheckCircle, FileText, User,
  Calendar, Globe, CreditCard, Building2,
} from 'lucide-react';

// ── Lookup tables ────────────────────────────────────────────────────────────

const VISA_TYPES = [
  { value: '', label: '— Select —' },
  { value: 'CITIZEN', label: 'Citizen (Malaysian)' },
  { value: 'PR', label: 'Permanent Resident (PR)' },
  { value: 'EMPLOYMENT_PASS', label: 'Employment Pass (EP)' },
  { value: 'WORK_PERMIT', label: 'Work Permit' },
  { value: 'STUDENT', label: 'Student Pass' },
  { value: 'DEPENDENT', label: 'Dependent Pass' },
  { value: 'NOT_APPLICABLE', label: 'Not Applicable / Awaiting' },
];

const NOTICE_PERIODS = [
  { value: '', label: '— Select —' },
  { value: 'Immediate', label: 'Immediate' },
  { value: '1 Week', label: '1 Week' },
  { value: '2 Weeks', label: '2 Weeks' },
  { value: '1 Month', label: '1 Month' },
  { value: '2 Months', label: '2 Months' },
  { value: '3 Months', label: '3 Months' },
  { value: '>3 Months', label: '>3 Months' },
];

const INTERVIEW_MODES = [
  { value: '', label: '— Select —' },
  { value: 'VIDEO', label: 'Video Call' },
  { value: 'PHONE', label: 'Phone Call' },
  { value: 'IN_PERSON', label: 'In Person' },
  { value: 'ANY', label: 'Any Mode' },
];

const CALL_STATUSES = [
  { value: 'NOT_CALLED',          label: 'Not Called Yet',           color: 'text-slate-500'  },
  { value: 'REACHED',             label: 'Reached — Interested',     color: 'text-emerald-600'},
  { value: 'INTERESTED',          label: 'Interested (Callback)',     color: 'text-teal-600'   },
  { value: 'NOT_ANSWERED',        label: 'Not Answered / No Reply',  color: 'text-amber-600'  },
  { value: 'WHATSAPP_SENT',       label: 'WhatsApp Message Sent',    color: 'text-blue-600'   },
  { value: 'EMAIL_SENT',          label: 'Email Sent',               color: 'text-violet-600' },
  { value: 'NOT_INTERESTED',      label: 'Not Interested',           color: 'text-red-600'    },
  { value: 'CALLBACK_REQUESTED',  label: 'Callback Requested',       color: 'text-orange-600' },
];

const TABS = ['Contact & Profile', 'Salary & Logistics', 'Recruiter Notes'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function Label({ children, required }) {
  return (
    <label className="block text-xs font-bold text-slate-700 mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function Input({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      {Icon && <Icon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />}
      <input
        {...props}
        className={`w-full border border-slate-200 rounded-lg text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 ${Icon ? 'pl-7' : ''} ${props.className || ''}`}
      />
    </div>
  );
}

function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className={`w-full border border-slate-200 rounded-lg text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white ${props.className || ''}`}
    >
      {children}
    </select>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function SubmissionModal({ candidate, jobTitle, clientName, onClose, onSaved }) {
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    // Contact
    firstName:          candidate.firstName || '',
    lastName:           candidate.lastName  || '',
    phone:              candidate.phone     || '',
    email:              candidate.email     || '',
    location:           candidate.location  || '',
    preferredLocation:  candidate.preferredLocation || '',
    currentEmployer:    candidate.currentEmployer   || '',
    currentRole:        candidate.currentRole       || '',
    nationality:        candidate.nationality        || '',
    // Visa
    visaType:           candidate.visaType     || '',
    visaValidity:       candidate.visaValidity || '',
    // Experience
    experience:         candidate.experience         != null ? String(candidate.experience)         : '',
    relevantExperience: candidate.relevantExperience != null ? String(candidate.relevantExperience) : '',
    // Salary
    currentSalary:      candidate.currentSalary  != null ? String(candidate.currentSalary)  : '',
    expectedSalary:     candidate.expectedSalary != null ? String(candidate.expectedSalary) : '',
    noticePeriod:       candidate.noticePeriod   || '',
    interviewMode:      candidate.interviewMode  || '',
    offersInHand:       candidate.offersInHand   || '',
    // Applying-for (new)
    applyingClientName: candidate.applyingClientName || '',
    hireType:           candidate.hireType           || '',
    applyingForRole:    candidate.applyingForRole    || '',
    // Recruiter
    callStatus:         candidate.callStatus    || 'NOT_CALLED',
    recruiterNotes:     candidate.recruiterNotes || '',
    sourceChannel:      candidate.sourceChannel  || 'MANUAL_UPLOAD',
    address:            candidate.address        || '',
    submissionDate:     candidate.submissionDate
      ? new Date(candidate.submissionDate).toISOString().split('T')[0]
      : today,
  });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      await apiClient.put(`/api/candidates/${candidate.id}`, {
        ...form,
        experience:         form.experience         !== '' ? Number(form.experience)         : null,
        relevantExperience: form.relevantExperience !== '' ? Number(form.relevantExperience) : null,
        currentSalary:      form.currentSalary      !== '' ? Number(form.currentSalary)      : null,
        expectedSalary:     form.expectedSalary     !== '' ? Number(form.expectedSalary)     : null,
        submissionDate:     form.submissionDate || null,
      });
      setSaved(true);
      setTimeout(() => {
        onSaved?.();
        onClose();
      }, 800);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save. Please retry.');
    } finally {
      setSaving(false);
    }
  };

  const callStatusObj = CALL_STATUSES.find(s => s.value === form.callStatus);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText size={15} className="text-brand-500" />
              Submission Details
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {candidate.displayId} · {candidate.firstName} {candidate.lastName}
              {jobTitle && <> · <span className="text-brand-600">{jobTitle}</span></>}
              {clientName && <> · <span className="font-semibold text-slate-700">{clientName}</span></>}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 mt-0.5">
            <X size={18} />
          </button>
        </div>

        {/* Call Status banner */}
        <div className="px-6 pt-3">
          <Label>Candidate Status</Label>
          <div className="flex flex-wrap gap-1.5">
            {CALL_STATUSES.map(s => (
              <button
                key={s.value}
                onClick={() => setForm(f => ({ ...f, callStatus: s.value }))}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                  form.callStatus === s.value
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6 mt-3">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors -mb-px ${
                tab === i
                  ? 'border-brand-500 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Form body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* ── TAB 0: Contact & Profile ── */}
          {tab === 0 && (
            <div className="space-y-4">

              {/* ── Applying-for section (prominent, top) ── */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-3">
                <p className="text-xs font-bold text-blue-800">Applying For (Client &amp; Role)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label required>Client Name</Label>
                    <Input icon={Building2} value={form.applyingClientName} onChange={set('applyingClientName')}
                      placeholder="e.g. Petronas, CIMB, TechCorp Sdn Bhd" />
                    <p className="text-[10px] text-blue-500 mt-0.5">Auto-filled from JD if AI screened. Fill manually if no JD exists.</p>
                  </div>
                  <div>
                    <Label required>Title of the Role</Label>
                    <Input icon={Briefcase} value={form.applyingForRole} onChange={set('applyingForRole')}
                      placeholder="e.g. Senior Network Engineer" />
                  </div>
                  <div>
                    <Label required>Hire Type</Label>
                    <Select value={form.hireType} onChange={set('hireType')}>
                      <option value="">— Select —</option>
                      <option value="PERMANENT">Permanent</option>
                      <option value="CONTRACT">Contract</option>
                      <option value="FREELANCE">Freelance</option>
                      <option value="INTERNSHIP">Internship</option>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>First Name</Label>
                  <Input icon={User} value={form.firstName} onChange={set('firstName')} placeholder="First name" />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input value={form.lastName} onChange={set('lastName')} placeholder="Last name" />
                </div>
                <div>
                  <Label>Contact Number</Label>
                  <Input icon={Phone} value={form.phone} onChange={set('phone')} placeholder="+60 12 345 6789" type="tel" />
                </div>
                <div>
                  <Label>Email ID</Label>
                  <Input icon={Mail} value={form.email} onChange={set('email')} placeholder="candidate@email.com" type="email" />
                </div>
                <div>
                  <Label>Nationality</Label>
                  <Input icon={Globe} value={form.nationality} onChange={set('nationality')} placeholder="e.g. Malaysian" />
                </div>
                <div>
                  <Label>VISA Type</Label>
                  <Select value={form.visaType} onChange={set('visaType')}>
                    {VISA_TYPES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </Select>
                </div>
                <div>
                  <Label>VISA Validity</Label>
                  <Input icon={CreditCard} value={form.visaValidity} onChange={set('visaValidity')} placeholder="e.g. Dec 2026 or Indefinite" />
                </div>
                <div>
                  <Label>Current / Previous Employer</Label>
                  <Input icon={Building2} value={form.currentEmployer} onChange={set('currentEmployer')} placeholder="Company name" />
                </div>
                <div>
                  <Label>Current Location</Label>
                  <Input icon={MapPin} value={form.location} onChange={set('location')} placeholder="City, Country" />
                </div>
                <div>
                  <Label>Preferred Location</Label>
                  <Input icon={MapPin} value={form.preferredLocation} onChange={set('preferredLocation')} placeholder="Preferred city" />
                </div>
                <div>
                  <Label>Current Role</Label>
                  <Input icon={Briefcase} value={form.currentRole} onChange={set('currentRole')} placeholder="Job title" />
                </div>
                <div>
                  <Label>Submission Date</Label>
                  <Input icon={Calendar} value={form.submissionDate} onChange={set('submissionDate')} type="date" />
                </div>
                <div className="col-span-2">
                  <Label>Source Channel</Label>
                  <Select value={form.sourceChannel} onChange={set('sourceChannel')}>
                    <option value="MANUAL_UPLOAD">Manual Upload / Direct</option>
                    <option value="JOB_PORTAL_MONSTER">Job Portal — Monster</option>
                    <option value="JOB_PORTAL_NAUKRI">Job Portal — Naukri</option>
                    <option value="JOB_PORTAL_JOBSTREET">Job Portal — JobStreet</option>
                    <option value="JOB_PORTAL_FUTUREJOBS">Job Portal — Future Jobs</option>
                    <option value="JOB_PORTAL_OTHERS">Job Portal — Others</option>
                    <option value="REFERRAL">Referral</option>
                    <option value="LINKEDIN">LinkedIn</option>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Full Address <span className="text-xs font-normal text-gray-400">(optional — recruiter fills)</span></Label>
                  <textarea
                    value={form.address}
                    onChange={set('address')}
                    rows={2}
                    placeholder="e.g. No. 12, Jalan Bukit Bintang, 50450 Kuala Lumpur"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-gray-50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 1: Salary & Logistics ── */}
          {tab === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Total Experience (yrs)</Label>
                  <Input value={form.experience} onChange={set('experience')} type="number" min="0" max="50" placeholder="e.g. 8" />
                </div>
                <div>
                  <Label>Relevant Experience (yrs)</Label>
                  <Input value={form.relevantExperience} onChange={set('relevantExperience')} type="number" min="0" max="50" placeholder="e.g. 4" />
                </div>
                <div>
                  <Label>Current Salary (MYR/month)</Label>
                  <Input icon={DollarSign} value={form.currentSalary} onChange={set('currentSalary')} type="number" min="0" placeholder="e.g. 8000" />
                </div>
                <div>
                  <Label>Expected Salary (MYR/month)</Label>
                  <Input icon={DollarSign} value={form.expectedSalary} onChange={set('expectedSalary')} type="number" min="0" placeholder="e.g. 10000" />
                </div>
                <div>
                  <Label>Notice Period</Label>
                  <Select value={form.noticePeriod} onChange={set('noticePeriod')}>
                    {NOTICE_PERIODS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                  </Select>
                </div>
                <div>
                  <Label>Interview Mode</Label>
                  <Select value={form.interviewMode} onChange={set('interviewMode')}>
                    {INTERVIEW_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </Select>
                </div>
              </div>
              <div>
                <Label>Offers in Hand / Pipeline</Label>
                <textarea
                  value={form.offersInHand}
                  onChange={set('offersInHand')}
                  rows={3}
                  placeholder="Describe any competing offers, timelines, expected decisions..."
                  className="w-full border border-slate-200 rounded-lg text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* ── TAB 2: Recruiter Notes ── */}
          {tab === 2 && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-xs font-bold text-slate-700 mb-1">Current Status</p>
                <span className={`text-xs font-semibold ${callStatusObj?.color || 'text-slate-500'}`}>
                  {callStatusObj?.label || 'Not set'}
                </span>
              </div>
              <div>
                <Label>Recruiter Inputs / Notes</Label>
                <textarea
                  value={form.recruiterNotes}
                  onChange={set('recruiterNotes')}
                  rows={8}
                  placeholder="Add any additional context here:&#10;— Candidate response&#10;— Key concerns or requirements&#10;— Action items / next steps&#10;— Reasons if not proceeding"
                  className="w-full border border-slate-200 rounded-lg text-xs px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none font-[inherit]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          {error ? (
            <span className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle size={13} /> {error}
            </span>
          ) : saved ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
              <CheckCircle size={13} /> Saved successfully
            </span>
          ) : (
            <span className="text-xs text-slate-400">Tab {tab + 1} of {TABS.length}</span>
          )}
          <div className="flex items-center gap-2">
            {tab > 0 && (
              <button onClick={() => setTab(t => t - 1)} className="btn-ghost py-1.5 px-3 text-xs">
                ← Back
              </button>
            )}
            {tab < TABS.length - 1 && (
              <button onClick={() => setTab(t => t + 1)} className="btn-primary py-1.5 px-3 text-xs">
                Next →
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className="btn-primary py-1.5 px-4 text-xs gap-1.5 disabled:opacity-60"
            >
              <Save size={13} />
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Details'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
