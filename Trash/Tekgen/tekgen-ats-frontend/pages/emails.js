'use client';

import { useState, useRef } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import apiClient from '../lib/api';
import {
  Mail, Copy, Send, Check, Upload, FileText, X, Sparkles,
  RefreshCw, ChevronDown, ChevronUp, Wand2,
} from 'lucide-react';

const TEMPLATES = {
  INTERVIEW_SCHEDULED: {
    label: 'Interview Invitation',
    subject: 'Interview Invitation – [jobTitle] at Tekgen',
    fields: ['candidateName', 'jobTitle', 'recruiterName', 'interviewDate', 'interviewTime', 'zoomLink'],
    body: `Dear [candidateName],

We are pleased to inform you that you have been shortlisted for the position of [jobTitle] at Tekgen.

We would like to invite you for an interview on [interviewDate] at [interviewTime].

[zoomLink]

Please confirm your availability by replying to this email.

Best regards,
[recruiterName]
Tekgen Recruitment Team`,
  },
  SHORTLISTED: {
    label: 'Shortlisted Notification',
    subject: 'Congratulations! You have been shortlisted – [jobTitle]',
    fields: ['candidateName', 'jobTitle', 'score', 'recruiterName'],
    body: `Dear [candidateName],

We are happy to inform you that after reviewing your profile and resume, you have been shortlisted for the position of [jobTitle] at Tekgen.

Your application scored [score]/100 in our AI screening process.

Our team will be in touch shortly regarding the next steps.

Best regards,
[recruiterName]
Tekgen Recruitment Team`,
  },
  REJECTED: {
    label: 'Rejection Email',
    subject: 'Application Update – [jobTitle]',
    fields: ['candidateName', 'jobTitle', 'recruiterName'],
    body: `Dear [candidateName],

Thank you for your interest in the [jobTitle] position at Tekgen.

After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current requirements.

We encourage you to apply for future openings that match your skills and experience.

Best regards,
[recruiterName]
Tekgen Recruitment Team`,
  },
  OFFER_LETTER: {
    label: 'Offer Letter',
    subject: 'Job Offer – [jobTitle] at Tekgen',
    fields: ['candidateName', 'jobTitle', 'department', 'startDate', 'location', 'recruiterName'],
    body: `Dear [candidateName],

We are delighted to offer you the position of [jobTitle] at Tekgen.

Key Details:
• Position: [jobTitle]
• Department: [department]
• Start Date: [startDate]
• Location: [location]

Please review the attached offer letter and respond within 5 business days.

We look forward to welcoming you to the Tekgen team!

Best regards,
[recruiterName]
Tekgen Recruitment Team`,
  },
  APPLICATION_RECEIVED: {
    label: 'Application Received',
    subject: 'Application Received – [jobTitle]',
    fields: ['candidateName', 'jobTitle', 'applicationId'],
    body: `Dear [candidateName],

Thank you for applying for the [jobTitle] position at Tekgen.

We have received your application and our team will review it shortly. You can expect to hear from us within 5–7 business days.

Reference ID: [applicationId]

Best regards,
Tekgen Recruitment Team`,
  },
  FOLLOW_UP: {
    label: 'Follow Up',
    subject: 'Follow Up – [jobTitle] Application',
    fields: ['candidateName', 'jobTitle', 'customMessage', 'recruiterName'],
    body: `Dear [candidateName],

We wanted to follow up regarding your application for the [jobTitle] position at Tekgen.

[customMessage]

Please don't hesitate to reach out if you have any questions.

Best regards,
[recruiterName]
Tekgen Recruitment Team`,
  },
  DOC_REQUEST_LOCAL: {
    label: 'Doc Request – Local',
    subject: 'Required Documents – Joining Formalities | Tekgen',
    fields: ['candidateName', 'recruiterName'],
    body: `Dear [candidateName],

Congratulations on your selection! We are pleased to have you onboard at Tekgen.

Kindly send us the following documents at your earliest to proceed with the joining formalities:

1. Educational Documents
2. Photocopy of your last 3 Months pay slips
3. Scanned copy of your offer letters for previous employments
4. Filled Bestinet Application Form (attached)
5. IC copy

Please send all documents in PDF / scanned format to recruitment@tekgen.com.

Warm regards,
[recruiterName]
Tekgen Recruitment Team`,
  },
  DOC_REQUEST_EXPAT: {
    label: 'Doc Request – Expat',
    subject: 'Required Documents – Joining Formalities | Tekgen',
    fields: ['candidateName', 'recruiterName'],
    body: `Dear [candidateName],

Congratulations on your selection! We are pleased to have you onboard at Tekgen.

Kindly send us the following documents at your earliest to proceed with the joining formalities:

1. Educational Documents (10th, 12th, and Degree Original Scanned Copies)
2. A passport-size photograph (Blue Background)
3. Photocopy of your last 3 months' pay slips
4. Scanned copy of your experience letters for previous employments
5. Latest full copy of your passport (all pages) (Original scanned only)

Please send all documents in PDF / scanned format to recruitment@tekgen.com.

Warm regards,
[recruiterName]
Tekgen Recruitment Team`,
  },
};

const FIELD_LABELS = {
  candidateName: 'Candidate Name',
  jobTitle: 'Job Title',
  recruiterName: 'Recruiter Name',
  department: 'Department',
  location: 'Location',
  interviewDate: 'Interview Date',
  interviewTime: 'Interview Time (e.g. 3:00 PM)',
  zoomLink: 'Zoom Link (optional)',
  score: 'AI Score (0–100)',
  startDate: 'Start Date',
  applicationId: 'Application / Reference ID',
  customMessage: 'Custom Message',
};

function fillTemplate(body, vars) {
  let out = body;
  Object.entries(vars).forEach(([k, v]) => {
    out = out.replace(new RegExp(`\\[${k}\\]`, 'g'), v || `[${k}]`);
  });
  // Remove empty zoom link line if not provided
  out = out.replace(/\[zoomLink\]\n?/g, '').replace(/\n{3,}/g, '\n\n').trim();
  return out;
}

// ─── AI Writer Panel ──────────────────────────────────────────────────────────
function AIWriterPanel() {
  const [input, setInput]     = useState('');
  const [result, setResult]   = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode]       = useState('improve');
  const [copied, setCopied]   = useState(false);

  const MODES = [
    { id: 'improve',   label: 'Improve' },
    { id: 'formal',    label: 'Make Formal' },
    { id: 'shorter',   label: 'Shorten' },
    { id: 'friendly',  label: 'Friendlier' },
    { id: 'translate', label: 'Translate to English' },
  ];

  const BASE_RULES = `You are a professional recruitment email writer. Follow these rules strictly:
- Write in a natural, human tone — never robotic or AI-sounding
- Be polite, respectful and considerate at all times
- Use positive, encouraging language
- Never include any rude, offensive, vulgar, harassing or discriminatory content
- Do not pressure, threaten or demean the reader
- Keep sentences clear and concise
- Return ONLY the rewritten text — no explanations, no headings, no commentary

`;

  const prompts = {
    improve:   BASE_RULES + 'Rewrite the following recruitment text to be grammatically correct, professional, clear and human. Preserve the original meaning:\n\n',
    formal:    BASE_RULES + 'Rewrite the following text in a formal, respectful business tone suitable for professional recruitment communication:\n\n',
    shorter:   BASE_RULES + 'Shorten the following text while keeping all key information and maintaining a polite, professional tone:\n\n',
    friendly:  BASE_RULES + 'Rewrite the following text in a warm, friendly yet professional tone that makes the candidate feel valued and respected:\n\n',
    translate: BASE_RULES + 'Translate the following text into professional, polite English suitable for recruitment communication:\n\n',
  };

  const handleRun = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult('');
    try {
      const r = await apiClient.post('/api/screenings/ai-write', {
        text: input,
        instruction: prompts[mode],
      });
      setResult(r.data.data?.result || r.data.data || 'No result returned.');
    } catch (e) {
      setResult('Error: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-blue-50">
        <Wand2 size={15} className="text-violet-600" />
        <h3 className="text-sm font-semibold text-slate-800">AI Writing Assistant</h3>
        <span className="ml-auto text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">Powered by AI</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex gap-1 flex-wrap">
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                mode === m.id ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}>{m.label}</button>
          ))}
        </div>
        <textarea rows={5} value={input} onChange={e => setInput(e.target.value)}
          placeholder="Type or paste your text here..."
          className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none" />
        <button onClick={handleRun} disabled={loading || !input.trim()}
          className="w-full py-2 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors">
          {loading ? <><RefreshCw size={12} className="animate-spin" /> Processing…</> : <><Sparkles size={12} /> Rewrite</>}
        </button>
        {result && (
          <div className="relative">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {result}
            </div>
            <button onClick={copyResult}
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] flex items-center gap-1">
              {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function EmailTemplatesPage() {
  const [selectedKey, setSelectedKey] = useState('INTERVIEW_SCHEDULED');
  const [variables, setVariables]     = useState({});
  const [copied, setCopied]           = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [showAI, setShowAI]           = useState(true);
  const fileInputRef = useRef(null);

  const template = TEMPLATES[selectedKey];

  const setVar = (k, v) => setVariables(p => ({ ...p, [k]: v }));

  const previewBody    = fillTemplate(template.body,    variables);
  const previewSubject = template.subject.replace(/\[(\w+)\]/g, (_, k) => variables[k] || `[${k}]`);

  const copyAll = () => {
    navigator.clipboard.writeText(`Subject: ${previewSubject}\n\n${previewBody}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setAttachments(p => [...p, ...files]);
    e.target.value = '';
  };

  const removeAttachment = (i) => setAttachments(p => p.filter((_, idx) => idx !== i));

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50 pb-8">

        {/* Page header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-700 text-white px-6 py-6 mb-6">
          <h1 className="text-2xl font-bold mb-0.5">Email Templates</h1>
          <p className="text-orange-100 text-sm">Generate professional recruitment emails + AI writing assistant</p>
        </div>

        <div className="px-4 max-w-7xl mx-auto">

          {/* AI Writer toggle */}
          <div className="mb-4">
            <button onClick={() => setShowAI(p => !p)}
              className="flex items-center gap-2 text-xs font-semibold text-violet-700 hover:text-violet-900 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 transition-colors">
              <Wand2 size={13} />
              {showAI ? 'Hide' : 'Show'} AI Writing Assistant
              {showAI ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          {showAI && (
            <div className="mb-5">
              <AIWriterPanel />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* 1 — Template list */}
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-slate-800 mb-2">Select Template</h2>
              {Object.entries(TEMPLATES).map(([key, tmpl]) => (
                <button key={key} onClick={() => { setSelectedKey(key); setVariables({}); }}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                    selectedKey === key
                      ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-400'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}>
                  <div className="flex items-center gap-3">
                    <Mail size={16} className={selectedKey === key ? 'text-orange-600' : 'text-slate-400'} />
                    <span className="font-semibold text-sm text-slate-900">{tmpl.label}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* 2 — Fill details */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-800">Fill Details</h2>
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                {template.fields.map(field => (
                  field === 'customMessage' ? (
                    <textarea key={field} rows={3} placeholder={FIELD_LABELS[field] || field}
                      value={variables[field] || ''}
                      onChange={e => setVar(field, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-orange-400 focus:outline-none resize-none" />
                  ) : field === 'interviewDate' || field === 'startDate' ? (
                    <input key={field} type="date" placeholder={FIELD_LABELS[field]}
                      value={variables[field] || ''}
                      onChange={e => setVar(field, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-orange-400 focus:outline-none" />
                  ) : (
                    <input key={field} placeholder={FIELD_LABELS[field] || field}
                      value={variables[field] || ''}
                      onChange={e => setVar(field, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-orange-400 focus:outline-none" />
                  )
                ))}

                {/* Attachments */}
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Attachments (optional)</p>
                  <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect}
                    className="hidden" accept=".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg" />
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs text-slate-500 border border-dashed border-slate-300 rounded-lg px-3 py-2 w-full justify-center hover:bg-slate-50 transition-colors">
                    <Upload size={12} /> Attach files (PDF, DOC, images)
                  </button>
                  {attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {attachments.map((f, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-50 rounded px-2 py-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <FileText size={11} className="text-slate-400 flex-shrink-0" />
                            <span className="text-[11px] text-slate-600 truncate">{f.name}</span>
                          </div>
                          <button onClick={() => removeAttachment(i)} className="text-slate-400 hover:text-red-500 flex-shrink-0 ml-1">
                            <X size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={copyAll}
                  className="w-full py-2 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center gap-1.5 transition-colors">
                  {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy Full Email</>}
                </button>
              </div>
            </div>

            {/* 3 — Preview */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-800">Preview</h2>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">Subject</p>
                  <p className="font-semibold text-slate-900 text-sm">{previewSubject}</p>
                </div>
                <div className="px-4 py-4 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap max-h-[450px] overflow-y-auto">
                  {previewBody}
                </div>
                {attachments.length > 0 && (
                  <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Attachments</p>
                    <div className="flex flex-wrap gap-1">
                      {attachments.map((f, i) => (
                        <span key={i} className="flex items-center gap-1 text-[11px] bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-600">
                          <FileText size={10} /> {f.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
