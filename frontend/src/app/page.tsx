import Link from 'next/link';
import { Zap, Users, Target, BarChart3, Upload, Mail, ArrowRight, Check, Star, Shield, Clock, TrendingUp, Linkedin, MapPin, Lock, FileText, Eye, Server } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">SRP AI <span className="text-brand-600">Labs</span></span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <Link href="#features" className="hover:text-brand-600 transition-colors">Features</Link>
            <Link href="#security" className="hover:text-brand-600 transition-colors">Security</Link>
            <Link href="#how-it-works" className="hover:text-brand-600 transition-colors">How it works</Link>
            <Link href="/pricing" className="hover:text-brand-600 transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-brand-600 transition-colors">
              Sign in
            </Link>
            <Link href="/login" className="inline-flex items-center gap-1.5 bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors">
              Get Started Free <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 py-24 px-4">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMwLTkuOTQtOC4wNi0xOC0xOC0xOHY2YzYuNjMgMCAxMiA1LjM3IDEyIDEyaC02eiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-brand-500/30 text-brand-100 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-brand-400/40">
            <Zap className="w-3 h-3" /> AI-Powered · OpenRouter GPT-4.1 Mini · Multi-Tenant SaaS
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
            Hire Faster.<br />
            <span className="text-brand-200">Close More Deals.</span>
          </h1>
          <p className="text-lg md:text-xl text-brand-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            The unified AI platform that automates recruitment screening, lead scoring,
            and sales outreach — so your team focuses on what matters.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-bold px-8 py-3.5 rounded-xl hover:bg-brand-50 transition-colors shadow-lg text-sm"
            >
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors text-sm"
            >
              View Pricing
            </Link>
          </div>
          <p className="mt-5 text-brand-200 text-xs">No credit card required · 14-day free trial · Cancel anytime</p>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-2xl mx-auto">
            {[
              { value: '10x', label: 'Faster screening' },
              { value: '45%', label: 'More placements' },
              { value: '3x', label: 'More deals closed' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-xl p-4">
                <div className="text-3xl font-extrabold text-white">{s.value}</div>
                <div className="text-brand-200 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Everything in one platform</h2>
            <p className="text-gray-500 max-w-xl mx-auto">From resume parsing to deal closing — AI handles the heavy lifting so your team can focus on relationships.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Users, color: 'bg-blue-100 text-blue-600', title: 'AI Resume Screening', desc: 'Upload PDF, Word, or Excel. Our AI scores and ranks candidates against job requirements in seconds, not hours.', bullets: ['Multi-format file support', '6-step screening pipeline', 'Auto-stage candidates'] },
              { icon: Target, color: 'bg-purple-100 text-purple-600', title: 'Lead Scoring & CRM', desc: 'AI-powered ICP scoring for every lead. Identify your best prospects and prioritise your sales pipeline automatically.', bullets: ['Auto ICP score 0-100', 'Company intelligence', 'Activity timeline'] },
              { icon: Mail, color: 'bg-green-100 text-green-600', title: 'Outreach Automation', desc: 'Generate personalised emails for candidates and leads. Sequence-based campaigns via n8n integration.', bullets: ['AI-written messages', 'Multi-step sequences', 'Open/reply tracking'] },
              { icon: Upload, color: 'bg-orange-100 text-orange-600', title: 'Smart Imports', desc: 'Import candidates or leads from CSV, Excel, PDF or Word. Plus Google Maps business search — find and import leads in seconds.', bullets: ['CSV, XLSX, PDF, DOCX', 'Google Maps lead finder', 'Apify dataset import'] },
              { icon: BarChart3, color: 'bg-pink-100 text-pink-600', title: 'Real-Time Analytics', desc: 'Live dashboards for recruitment funnel, sales pipeline, and AI usage. All queries cached for instant load.', bullets: ['Conversion funnels', 'Period comparison', 'Redis-cached KPIs'] },
              { icon: Zap, color: 'bg-yellow-100 text-yellow-600', title: 'n8n Workflow Engine', desc: 'Pre-built automation workflows for onboarding sequences, follow-ups, and integrations with your existing tools.', bullets: ['5 pre-built workflows', 'Webhook triggers', 'Slack / email alerts'] },
              { icon: Linkedin, color: 'bg-blue-100 text-blue-600', title: 'LinkedIn AI Writer', desc: 'Generate posts, connection requests, InMails, and profile content with one click. 6 content types, all AI-powered.', bullets: ['Posts & connection notes', 'Recruiter & sales InMails', 'Profile About rewrite'] },
              { icon: MapPin, color: 'bg-green-100 text-green-600', title: 'Google Maps Lead Finder', desc: 'Search any business type in any city and automatically import matching companies as qualified leads.', bullets: ['Business type search', 'Auto company creation', 'Duplicate detection'] },
              { icon: FileText, color: 'bg-red-100 text-red-600', title: 'Secure Document Vault', desc: 'Upload resumes, proposals, and contracts with AES-256 encryption, tenant isolation, and full audit trail.', bullets: ['S3-encrypted storage', 'Signed URL downloads', 'Duplicate detection via checksum'] },
            ].map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-sm mb-4 leading-relaxed">{f.desc}</p>
                  <ul className="space-y-1.5">
                    {f.bullets.map(b => (
                      <li key={b} className="flex items-center gap-2 text-xs text-gray-500">
                        <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> {b}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Up and running in 4 steps</h2>
            <p className="text-gray-500">From sign-up to first AI-screened candidate or scored lead in under 10 minutes.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { step: '01', icon: Shield, title: 'Create your workspace', desc: 'Sign up, invite your team, and configure your tenant settings in minutes.' },
              { step: '02', icon: Upload, title: 'Import your data', desc: 'Upload candidates via PDF/Excel or import leads from CSV. AI maps columns automatically.' },
              { step: '03', icon: Zap, title: 'Let AI do the work', desc: 'Resume screening, ICP scoring, and outreach generation run automatically in the background.' },
              { step: '04', icon: TrendingUp, title: 'Close faster', desc: 'Your dashboard shows ranked candidates and hot leads, so every action has maximum impact.' },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.step} className="flex gap-4 p-6 rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <div className="flex-shrink-0 w-10 h-10 bg-brand-600 text-white rounded-xl flex items-center justify-center font-bold text-sm">
                    {s.step}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-brand-600" />
                      <h3 className="font-bold text-gray-900 text-sm">{s.title}</h3>
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Social proof ── */}
      <section className="py-16 px-4 bg-brand-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />)}
          </div>
          <blockquote className="text-xl font-medium text-gray-900 mb-4 max-w-2xl mx-auto">
            "We cut our time-to-hire by 60% in the first month. The AI screening is scarily accurate."
          </blockquote>
          <p className="text-gray-500 text-sm">Sarah Chen, Head of Talent · Nexus Ventures</p>
        </div>
      </section>

      {/* ── Security & Compliance ── */}
      <section id="security" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              <Shield className="w-3.5 h-3.5" /> Enterprise-Grade Security
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Your data is safe with us</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Resumes, lead details, and company documents contain sensitive information. We treat security as a first-class feature, not an afterthought.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Lock, color: 'bg-blue-100 text-blue-600', title: 'AES-256 Encryption at Rest', desc: 'All uploaded documents are encrypted with AES-256 server-side encryption in our S3-compatible object storage.' },
              { icon: Shield, color: 'bg-green-100 text-green-600', title: 'Tenant Isolation', desc: 'Complete data separation per tenant. No cross-tenant access is architecturally possible — enforced at database and API level.' },
              { icon: Eye, color: 'bg-purple-100 text-purple-600', title: 'Signed URL Downloads', desc: 'Document downloads use time-limited signed URLs (15 min expiry). No permanent public links. Backend proxy available for extra security.' },
              { icon: FileText, color: 'bg-orange-100 text-orange-600', title: 'Full Audit Trail', desc: 'Every document upload, download, and deletion is logged with user identity, timestamp, and IP address for complete traceability.' },
              { icon: Server, color: 'bg-red-100 text-red-600', title: 'HTTPS + HSTS', desc: 'All traffic encrypted in transit with TLS 1.3. HSTS headers enforced with preload. No plain HTTP access in production.' },
              { icon: Lock, color: 'bg-yellow-100 text-yellow-600', title: 'File Validation', desc: 'Strict MIME type and file size validation. Only approved document types accepted. SHA-256 checksum for duplicate and integrity detection.' },
              { icon: Shield, color: 'bg-pink-100 text-pink-600', title: 'RBAC + JWT Auth', desc: 'Role-based access control with JWT access tokens (15 min) and secure refresh token rotation. Google OAuth2 SSO support.' },
              { icon: Eye, color: 'bg-cyan-100 text-cyan-600', title: 'Security Headers', desc: 'CSP, X-Frame-Options DENY, nosniff, strict referrer policy, and permission policy. Powered by Helmet.js with custom hardening.' },
            ].map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Pricing teaser ── */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-gray-500">Start free, scale as you grow. No hidden fees.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { name: 'Starter', badge: 'Beta', price: 'Free', period: '', color: 'border-gray-200', highlight: false, features: ['2 team members', '100 candidates', '50 AI calls/mo', 'Basic analytics'] },
              { name: 'Growth', badge: 'Early Access', price: '$19', period: '/mo', color: 'border-brand-500 ring-2 ring-brand-500', highlight: true, features: ['5 team members', '1,000 candidates', '500 AI calls/mo', 'Advanced analytics'] },
              { name: 'Pro', badge: 'Early Access', price: '$49', period: '/mo', color: 'border-blue-200', highlight: false, features: ['15 team members', '10,000 candidates', '2,000 AI calls/mo', 'Power BI reports'] },
              { name: 'Enterprise', price: 'Custom', period: '', color: 'border-gray-200', highlight: false, features: ['Unlimited users', 'Unlimited data', 'Unlimited AI', 'Dedicated support'] },
            ].map(p => (
              <div key={p.name} className={`relative rounded-2xl border-2 p-6 bg-white shadow-sm ${p.color}`}>
                {p.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-full">Most Popular</div>}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-500">{p.name}</span>
                    {(p as any).badge && <span className="text-[10px] font-bold bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded">{(p as any).badge}</span>}
                  </div>
                  <div className="text-3xl font-extrabold text-gray-900">{p.price}{p.period && <span className="text-sm text-gray-400 font-normal">{p.period}</span>}</div>
                </div>
                <ul className="space-y-2 mb-6">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className={`block text-center text-sm font-semibold py-2 rounded-lg transition-colors ${p.highlight ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  Get started
                </Link>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/pricing" className="text-brand-600 text-sm font-semibold hover:underline">
              See full comparison table →
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-4 bg-gradient-to-r from-brand-700 to-brand-500">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to transform your hiring?</h2>
          <p className="text-brand-100 mb-8">Join teams already using SRP AI Labs to place better candidates and close more deals.</p>
          <Link href="/login" className="inline-flex items-center gap-2 bg-white text-brand-700 font-bold px-8 py-3.5 rounded-xl hover:bg-brand-50 transition-colors shadow-lg">
            Start your free trial <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-4 bg-gray-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-600 rounded flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-bold text-sm">SRP AI Labs</span>
          </div>
          <div className="flex items-center gap-6 text-gray-400 text-xs">
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/login" className="hover:text-white transition-colors">Login</Link>
            <span>© 2026 SRP AI Labs. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

