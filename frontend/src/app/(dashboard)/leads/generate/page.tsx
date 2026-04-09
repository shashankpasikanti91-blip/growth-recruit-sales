'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Sparkles, Globe, MapPin, Search, Target,
  Briefcase, Users, RefreshCw, CheckCircle2, AlertCircle,
  Info, Zap, TrendingUp, Shield, Clock, Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';

const SOURCES = [
  {
    id: 'APOLLO',
    label: 'Apollo B2B',
    icon: Target,
    color: 'border-purple-500 bg-purple-50',
    iconColor: 'text-purple-600',
    desc: '275M+ verified B2B contacts with work emails, direct dials, LinkedIn profiles, and company data. Best for targeted outreach.',
    best: 'Verified emails · Direct phones · B2B · SaaS · Enterprise',
    badge: 'Recommended',
  },
  {
    id: 'GOOGLE_MAPS',
    label: 'Google Maps',
    icon: MapPin,
    color: 'border-green-500 bg-green-50',
    iconColor: 'text-green-600',
    desc: 'Local businesses with phone numbers, addresses, websites, ratings and opening hours. Perfect for location-based prospecting.',
    best: 'Local businesses · Restaurants · Clinics · Services · Retail',
    badge: null,
  },
  {
    id: 'GOOGLE_SEARCH',
    label: 'Google Search',
    icon: Search,
    color: 'border-blue-500 bg-blue-50',
    iconColor: 'text-blue-600',
    desc: 'Find niche businesses and contacts from web search results. Great for industries not in traditional databases.',
    best: 'Niche industries · Freelancers · New markets · Startups',
    badge: null,
  },
];

const INDUSTRIES = [
  'Recruitment Agencies', 'Staffing Companies', 'IT Services', 'Software Development',
  'Digital Marketing', 'Real Estate', 'Healthcare', 'Education', 'Manufacturing',
  'Restaurants & F&B', 'Retail & E-Commerce', 'Financial Services', 'Legal Services',
  'Construction', 'Logistics', 'Consulting', 'Automotive', 'Travel & Hospitality',
  'Beauty & Wellness', 'Insurance', 'Other',
];

const TITLE_PRESETS = [
  { label: 'C-Suite', value: 'CEO,CTO,CFO,COO,CMO' },
  { label: 'Founders', value: 'Founder,Co-Founder,Owner' },
  { label: 'VP / Directors', value: 'VP,Director,Head of' },
  { label: 'HR / People', value: 'HR Manager,HR Director,Head of People,CHRO,People & Culture' },
  { label: 'Sales Leaders', value: 'VP Sales,Sales Director,Head of Sales,Business Development' },
  { label: 'Marketing', value: 'CMO,Marketing Director,Head of Marketing,Growth Lead' },
];

export default function GenerateLeadsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [source, setSource] = useState('APOLLO');
  const [industry, setIndustry] = useState('');
  const [customIndustry, setCustomIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [jobTitles, setJobTitles] = useState('');
  const [limit, setLimit] = useState(50);
  const [result, setResult] = useState<any>(null);

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['generate-usage'],
    queryFn: leadsApi.generateUsage,
  });

  const monthlyUsed = usage?.monthly?.used ?? 0;
  const monthlyLimit = usage?.monthly?.limit ?? 1000;
  const monthlyRemaining = usage?.monthly?.remaining ?? (monthlyLimit - monthlyUsed);
  const dailyUsed = usage?.daily?.used ?? 0;
  const dailyLimit = usage?.daily?.limit ?? 100;
  const dailyRemaining = usage?.daily?.remaining ?? (dailyLimit - dailyUsed);
  const maxPerRequest = usage?.perRequest ?? 200;
  const planName = usage?.plan ?? 'Free';
  const recentGenerations = usage?.recentGenerations ?? [];

  // Effective max for slider: min(maxPerRequest, dailyRemaining, monthlyRemaining)
  const effectiveMax = Math.min(maxPerRequest, Math.max(10, dailyRemaining), Math.max(10, monthlyRemaining));

  const mutation = useMutation({
    mutationFn: () => leadsApi.generate({
      source,
      industry: industry === 'Other' ? customIndustry : industry,
      location,
      jobTitles: jobTitles || undefined,
      limit: Math.min(limit, effectiveMax),
    }),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['generate-usage'] });
      toast.success(`${data.imported ?? 0} leads generated!`);
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Lead generation failed. Please try again.');
    },
  });

  const selectedSource = SOURCES.find(s => s.id === source)!;
  const canGenerate = (industry === 'Other' ? customIndustry : industry) && location && dailyRemaining > 0 && monthlyRemaining > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button onClick={() => router.push('/leads')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Leads
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-brand-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Generate Leads</h1>
            <p className="text-gray-500 text-sm">AI-powered lead generation — describe your target and we find them for you</p>
          </div>
        </div>
      </div>

      {/* Usage bars: Monthly + Daily */}
      <div className="card space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm min-w-[120px]">
            <Calendar className="w-4 h-4 text-brand-600" />
            <span className="font-medium text-gray-700">Monthly</span>
          </div>
          <div className="flex-1 bg-gray-100 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${monthlyUsed / monthlyLimit > 0.9 ? 'bg-red-500' : monthlyUsed / monthlyLimit > 0.7 ? 'bg-amber-500' : 'bg-brand-500'}`}
              style={{ width: `${Math.min((monthlyUsed / monthlyLimit) * 100, 100)}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">
            {monthlyRemaining.toLocaleString()} left
          </span>
          <span className="text-xs text-gray-400 whitespace-nowrap">{monthlyUsed.toLocaleString()} / {monthlyLimit.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm min-w-[120px]">
            <Clock className="w-4 h-4 text-purple-600" />
            <span className="font-medium text-gray-700">Today</span>
          </div>
          <div className="flex-1 bg-gray-100 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${dailyUsed / dailyLimit > 0.9 ? 'bg-red-500' : dailyUsed / dailyLimit > 0.7 ? 'bg-amber-500' : 'bg-purple-500'}`}
              style={{ width: `${Math.min((dailyUsed / dailyLimit) * 100, 100)}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">
            {dailyRemaining.toLocaleString()} left
          </span>
          <span className="text-xs text-gray-400 whitespace-nowrap">{dailyUsed} / {dailyLimit}/day</span>
        </div>
        <p className="text-xs text-gray-400">{planName} plan · Max {maxPerRequest} leads per request · Daily limit resets at midnight</p>
      </div>

      {/* How it works notice */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <Shield className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-700">
          <p className="font-semibold mb-1">How it works</p>
          <p>
            Our platform searches multiple data sources on your behalf and delivers verified leads directly into your pipeline.
            You never need API keys or third-party accounts — we handle all the data sourcing, deduplication, and compliance.
            Each lead imported counts against your monthly and daily plan credits.
          </p>
        </div>
      </div>

      {result ? (
        /* ── Results ── */
        <div className="card space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
            <div>
              <h2 className="font-bold text-gray-900 text-lg">Lead Generation Complete</h2>
              <p className="text-sm text-gray-500">Results are now in your Leads pipeline</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{result.imported ?? 0}</div>
              <div className="text-xs text-green-600 font-medium">New Leads Added</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-700">{result.skipped ?? 0}</div>
              <div className="text-xs text-amber-600 font-medium">Duplicates Skipped</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">{result.total ?? (result.imported ?? 0) + (result.skipped ?? 0)}</div>
              <div className="text-xs text-blue-600 font-medium">Total Found</div>
            </div>
          </div>

          {result.importId && (
            <p className="text-xs text-gray-400 text-center">Import ID: {result.importId}</p>
          )}

          {result.errors?.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-600">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              {result.errors.length} errors occurred during processing
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => router.push('/leads')} className="btn-primary flex-1">
              View Leads Pipeline
            </button>
            <button onClick={() => setResult(null)} className="btn-secondary">
              Generate More
            </button>
          </div>
        </div>
      ) : (
        /* ── Form ── */
        <div className="space-y-5">
          {/* Step 1: Source */}
          <div className="card space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <span className="w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
              Choose Data Source
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SOURCES.map(s => {
                const Icon = s.icon;
                const active = source === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSource(s.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all relative ${active ? s.color + ' ring-1 ring-offset-1' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                  >
                    {s.badge && (
                      <span className="absolute -top-2.5 right-3 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{s.badge}</span>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-5 h-5 ${active ? s.iconColor : 'text-gray-400'}`} />
                      <span className={`font-semibold text-sm ${active ? 'text-gray-900' : 'text-gray-600'}`}>{s.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{s.desc}</p>
                    <p className="text-xs font-medium text-gray-400">{s.best}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: ICP */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <span className="w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
              Define Your Ideal Customer Profile (ICP)
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Industry / Business Type *</label>
                <select className="input" value={industry} onChange={e => setIndustry(e.target.value)}>
                  <option value="">— Select industry —</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
                {industry === 'Other' && (
                  <input className="input mt-2" placeholder="Type your industry..." value={customIndustry} onChange={e => setCustomIndustry(e.target.value)} />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Location / City / Country *</label>
                <input className="input" placeholder="e.g. Kuala Lumpur, Malaysia" value={location} onChange={e => setLocation(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Target Job Titles <span className="text-gray-400 font-normal">(optional, comma-separated)</span>
              </label>
              <input
                className="input"
                placeholder="e.g. CEO, Founder, HR Director, VP Sales"
                value={jobTitles}
                onChange={e => setJobTitles(e.target.value)}
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {TITLE_PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setJobTitles(prev => prev ? `${prev},${p.value}` : p.value)}
                    className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full hover:bg-brand-50 hover:text-brand-700 transition-colors"
                  >
                    + {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Number of Leads</label>
              <div className="flex items-center gap-3">
                <input type="range" className="flex-1 accent-brand-600" min={10} max={effectiveMax} step={10} value={Math.min(limit, effectiveMax)} onChange={e => setLimit(Number(e.target.value))} />
                <span className="text-sm font-bold text-gray-800 bg-gray-100 px-3 py-1 rounded-lg min-w-[60px] text-center">{Math.min(limit, effectiveMax)}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Each lead = 1 credit. You have {dailyRemaining} today + {monthlyRemaining.toLocaleString()} this month.
              </p>
            </div>
          </div>

          {/* Step 3: Generate */}
          <div className="card">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-4">
              <span className="w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-xs">3</span>
              Generate
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-500 mb-2">Summary</p>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Source</p>
                  <p className="font-semibold text-gray-800">{selectedSource.label}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Industry</p>
                  <p className="font-semibold text-gray-800">{(industry === 'Other' ? customIndustry : industry) || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Location</p>
                  <p className="font-semibold text-gray-800">{location || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Leads</p>
                  <p className="font-semibold text-gray-800">{Math.min(limit, effectiveMax)}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !canGenerate}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base disabled:opacity-50"
            >
              {mutation.isPending ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Generating leads… This may take 1–3 minutes
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate {Math.min(limit, effectiveMax)} Leads via {selectedSource.label}
                </>
              )}
            </button>

            {monthlyRemaining < 1 && (
              <p className="text-xs text-red-500 text-center mt-2">
                Monthly limit reached. <a href="/billing" className="underline font-semibold">Upgrade your plan</a> to generate more.
              </p>
            )}
            {monthlyRemaining > 0 && dailyRemaining < 1 && (
              <p className="text-xs text-amber-600 text-center mt-2">
                Daily limit reached ({dailyLimit}/day on {planName} plan). Resets at midnight.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Generation History */}
      {recentGenerations.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            Recent Generations
          </h3>
          <div className="divide-y divide-gray-100">
            {recentGenerations.map((gen: any) => (
              <div key={gen.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 font-medium truncate">{gen.name}</p>
                  <p className="text-xs text-gray-400">{new Date(gen.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                    gen.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    gen.status === 'PROCESSING' ? 'bg-blue-100 text-blue-700' :
                    gen.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {gen.status}
                  </span>
                  <span className="text-gray-600 font-semibold">{gen.successRows} leads</span>
                  {gen.duplicateRows > 0 && (
                    <span className="text-amber-500">{gen.duplicateRows} dupes</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
