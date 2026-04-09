'use client';
import React from 'react';
import Link from 'next/link';
import {
  ExternalLink, CheckCircle, Zap, Globe, Database, Mail,
  Info, ShieldCheck, Upload, FileSpreadsheet,
  Linkedin, Search, MapPin, ArrowRight,
} from 'lucide-react';

// ─── Lead / Candidate Source Card ────────────────────────────────────────────
type SourceStatus = 'active' | 'available' | 'manual' | 'coming_soon';

const STATUS_STYLES: Record<SourceStatus, { label: string; cls: string; dot: string }> = {
  active:      { label: 'Automated',    cls: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  available:   { label: 'Available',    cls: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  manual:      { label: 'Manual',       cls: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500' },
  coming_soon: { label: 'Coming Soon',  cls: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-400' },
};

function SourceCard({ icon: Icon, name, status, how, fields, action }: {
  icon: React.ElementType; name: string; status: SourceStatus;
  how: string; fields: string[]; action?: { label: string; href: string };
}) {
  const s = STATUS_STYLES[status];
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-brand-600" />
          </div>
          <span className="font-semibold text-gray-900 text-sm leading-tight">{name}</span>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${s.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </span>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{how}</p>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Data you get</p>
        <div className="flex flex-wrap gap-1.5">
          {fields.map(f => (
            <span key={f} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{f}</span>
          ))}
        </div>
      </div>
      {action && (
        <Link href={action.href}
          className="flex items-center gap-1 text-xs text-brand-600 font-medium hover:underline mt-auto">
          {action.label} <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

// ─── ATS Card ─────────────────────────────────────────────────────────────────
function AtsCard({ name, logo, how, configNote }: {
  name: string; logo: string; how: string; configNote: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-lg">{logo}</div>
        <span className="font-semibold text-gray-900 text-sm">{name}</span>
      </div>
      <p className="text-xs text-gray-500 mb-2 leading-relaxed">{how}</p>
      <p className="text-xs text-brand-600 font-medium">{configNote}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations & Data Sources</h1>
          <p className="text-gray-500 text-sm mt-1">
            AI-powered lead generation and data sources — all managed by the platform.
          </p>
        </div>
        <Link href="/leads/generate"
          className="flex items-center gap-1.5 text-sm text-white font-medium bg-brand-600 px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors">
          <Zap className="w-4 h-4" /> Generate Leads
        </Link>
      </div>

      {/* Ownership notice */}
      <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
        <ShieldCheck className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-green-700">
          <p className="font-semibold mb-0.5">Platform-Powered Lead Generation — No API Keys Required</p>
          <p className="text-green-600 text-xs">
            Our platform finds and delivers leads for you. You describe your ideal customer — industry, location, job title — and we generate verified leads directly into your pipeline.
            No third-party accounts, no API keys, no technical setup. Everything is included in your plan.
          </p>
        </div>
      </div>

      {/* ── Section 1: AI Lead Generation ── */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold text-gray-900">AI Lead Generation Sources</h2>
          <Link href="/leads/generate" className="flex items-center gap-1.5 text-sm text-brand-600 font-semibold border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors">
            <Zap className="w-3.5 h-3.5" /> Generate Leads Now
          </Link>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Tell us who your ideal customer is — we search multiple data networks and deliver verified B2B leads directly into your account. All included in your plan.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <SourceCard
            icon={Database}
            name="Apollo B2B Database"
            status="active"
            how="Access 275M+ verified B2B contacts. Our platform searches Apollo on your behalf — just define your ICP (industry, title, location) and we deliver leads with verified emails, phone numbers, and LinkedIn profiles."
            fields={['Name', 'Work email (verified)', 'Phone', 'Job title', 'LinkedIn URL', 'Company name', 'Industry', 'Employee count', 'Country']}
            action={{ label: 'Generate leads now', href: '/leads/generate' }}
          />
          <SourceCard
            icon={Search}
            name="Google Search"
            status="active"
            how="Our AI searches Google for businesses and decision-makers matching your criteria. Ideal for niche industries, local markets, and discovering prospects not in traditional databases."
            fields={['Business name', 'Email', 'Phone', 'Website', 'Address', 'Description']}
            action={{ label: 'Generate leads now', href: '/leads/generate' }}
          />
          <SourceCard
            icon={MapPin}
            name="Google Maps / Local Business"
            status="active"
            how="Discover local businesses by location and industry. We search Google Maps and deliver business names, phone numbers, addresses, websites, and ratings — perfect for location-based sales prospecting."
            fields={['Business name', 'Phone', 'Address', 'Website', 'Rating', 'Category', 'Opening hours']}
            action={{ label: 'Generate leads now', href: '/leads/generate' }}
          />
          <SourceCard
            icon={Linkedin}
            name="LinkedIn (via CSV Upload)"
            status="manual"
            how="Export your Sales Navigator search or Lead List as a CSV file and upload it here. The system auto-detects columns. No scraping — uses your own LinkedIn CSV export."
            fields={['Name', 'Email (if visible)', 'Phone', 'Title', 'Company', 'Industry', 'LinkedIn URL', 'Location']}
            action={{ label: 'Upload LinkedIn CSV', href: '/imports' }}
          />
          <SourceCard
            icon={Search}
            name="Indeed / Job Boards"
            status="available"
            how="Export applicant data from Indeed, Totaljobs, Reed, or any job board as CSV/Excel and upload it. All standard fields are auto-mapped."
            fields={['Name', 'Email', 'Phone', 'CV / Resume', 'Current title', 'Location', 'Applied role']}
            action={{ label: 'Upload job board CSV', href: '/imports' }}
          />
          <SourceCard
            icon={FileSpreadsheet}
            name="CSV / Excel Upload"
            status="available"
            how="Upload any spreadsheet from any source — CRM, old database, partner data. The system auto-detects columns. Supports CSV, XLSX, XLS. Duplicates are skipped automatically."
            fields={['Any columns you have', 'Auto-mapped to: name, email, phone, company, title, country, tags']}
            action={{ label: 'Start an import', href: '/imports' }}
          />
        </div>
      </div>

      {/* ── Section 2: Candidate Sources ── */}
      <div>
        <h2 className="text-base font-bold text-gray-900 mb-1">Candidate Sources</h2>
        <p className="text-xs text-gray-400 mb-4">
          Import candidate CVs and profiles from job boards, referrals, or your own pipeline.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <SourceCard
            icon={Upload}
            name="CV / Resume Upload (PDF, DOCX)"
            status="available"
            how="Upload a candidate's CV directly. The AI parses name, email, phone, skills, education, and work history automatically. Supports PDF and Word formats."
            fields={['Name', 'Email', 'Phone', 'Skills', 'Education', 'Work history', 'Current role']}
            action={{ label: 'Upload candidate CVs', href: '/imports' }}
          />
          <SourceCard
            icon={Search}
            name="Job Board Exports (CSV)"
            status="available"
            how="Export applicant lists from Indeed, CV-Library, Totaljobs, Reed, or LinkedIn Jobs as CSV. Upload the file and the system maps all standard fields automatically."
            fields={['Name', 'Email', 'Phone', 'Applied role', 'Location', 'Availability', 'Salary expectation']}
            action={{ label: 'Import candidate list', href: '/imports' }}
          />
          <SourceCard
            icon={Zap}
            name="AI Screening Pipeline"
            status="active"
            how="Once imported, candidates are automatically scored by the AI against your job criteria. Shortlisted candidates trigger automated outreach. Runs on every import — no extra setup needed."
            fields={['AI match score', 'Skills gap analysis', 'Outreach trigger at score ≥ 70', 'Auto-reject below threshold']}
          />
        </div>
      </div>

      {/* ── Section 3: ATS Integrations ── */}
      <div>
        <h2 className="text-base font-bold text-gray-900 mb-1">ATS & CRM Integrations</h2>
        <p className="text-xs text-gray-400 mb-4">
          Already using an ATS or CRM? Connect it to this platform via webhook or CSV export.
          We can send or receive data automatically. Configure your webhook URL in Settings.
        </p>
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-700">
            <span className="font-semibold">How ATS integration works:</span> Configure a webhook URL in{' '}
            <Link href="/settings" className="underline font-semibold">Settings → Webhook</Link>.
            When a candidate is shortlisted, hired, or a lead converts, we push that event to your ATS in real-time (JSON payload).
            Your ATS can also push new candidate records to us via our inbound webhook.
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <AtsCard name="Greenhouse" logo="🌿" how="Webhook push on stage change. Pulls candidates from Greenhouse job board." configNote="→ Set Webhook in Settings" />
          <AtsCard name="Lever" logo="🎯" how="Bidirectional sync via Lever Webhooks API. Push shortlisted candidates." configNote="→ Set Webhook in Settings" />
          <AtsCard name="Workday" logo="📋" how="Export candidates from Workday as CSV and import here. Or use SFTP sync." configNote="→ Upload CSV or SFTP" />
          <AtsCard name="BambooHR" logo="🎋" how="Use BambooHR's webhook to notify on new hires and trigger onboarding outreach." configNote="→ Set Webhook in Settings" />
          <AtsCard name="SAP SuccessFactors" logo="🔷" how="Export talent pool from SAP as CSV. Map fields on upload." configNote="→ Upload CSV" />
          <AtsCard name="SmartRecruiters" logo="🧠" how="SmartRecruiters supports webhook triggers. Push/pull candidate data." configNote="→ Set Webhook in Settings" />
          <AtsCard name="Salesforce CRM" logo="☁️" how="Use Salesforce outbound messages or Zapier to sync contacts and leads bidirectionally." configNote="→ Set Webhook in Settings" />
          <AtsCard name="Any Custom ATS" logo="🔌" how="If your ATS can send/receive webhooks or export CSV — it connects. Use the generic Webhook integration." configNote="→ Settings → Webhook" />
        </div>
      </div>

      {/* ── Section 4: Automation Engine ── */}
      <div>
        <h2 className="text-base font-bold text-gray-900 mb-1">Automation Engine</h2>
        <p className="text-xs text-gray-400 mb-4">
          All workflows run automatically in the background. Your data never leaves your server.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              icon: Zap,
              name: 'AI Lead Generation',
              how: 'On-demand lead generation from multiple data sources. Define your ICP once — the platform finds matching leads, deduplicates, and adds them to your pipeline automatically.',
            },
            {
              icon: Database,
              name: 'Lead Enrichment & Scoring',
              how: 'On every lead import, the AI scores the lead 0–100 against your Ideal Customer Profile. Leads scoring ≥ 70 automatically trigger an outreach sequence.',
            },
            {
              icon: Mail,
              name: 'Outreach Sequences',
              how: 'Multi-step personalised email sequences generated by AI. Sends via your own SMTP. Tracks opens, clicks, and replies. Fully customisable delays and copy.',
            },
            {
              icon: Upload,
              name: 'Candidate Screening',
              how: 'Triggers on every candidate import. AI parses CVs, scores skill match, flags top candidates, and emails shortlisted candidates — all automatically.',
            },
          ].map(({ icon: Icon, name, how }) => (
            <div key={name} className="bg-white border border-gray-200 rounded-xl p-4 flex gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-0.5">{name}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{how}</p>
              </div>
            </div>
          ))}
        </div>
        {process.env.NEXT_PUBLIC_N8N_URL && (
          <a href={process.env.NEXT_PUBLIC_N8N_URL} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-3 text-sm text-brand-600 font-medium hover:underline">
            Open Automation Dashboard <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
