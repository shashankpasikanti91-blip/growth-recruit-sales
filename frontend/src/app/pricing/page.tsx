import Link from 'next/link';
import { Check, Zap, ArrowLeft, ArrowRight } from 'lucide-react';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    badge: null,
    monthly: 0,
    annual: 0,
    description: 'Try the platform with limited usage — no credit card required.',
    color: 'border-gray-200',
    highlight: false,
    features: [
      'Up to 3 users',
      '500 candidates',
      '250 leads',
      '200 AI screenings / month',
      'CSV / Excel imports',
      'Basic analytics',
      'Email outreach',
      'Community support',
    ],
    notIncluded: ['PDF/Word resume parsing', 'n8n workflows', 'Advanced analytics'],
  },
  {
    id: 'starter',
    name: 'Starter',
    badge: 'Popular',
    monthly: 29,
    annual: 23,
    description: 'For individuals and small teams starting to scale their pipeline.',
    color: 'border-brand-500 ring-2 ring-brand-500',
    highlight: true,
    features: [
      'Up to 5 users',
      '2,000 candidates',
      '1,000 leads',
      '500 AI screenings / month',
      'All file formats (PDF, Word, CSV)',
      'Basic analytics',
      'n8n workflow automation',
      'Email support',
    ],
    notIncluded: ['Custom AI prompts', 'SSO / SAML'],
  },
  {
    id: 'growth',
    name: 'Growth',
    badge: null,
    monthly: 69,
    annual: 55,
    description: 'For growing teams that need more capacity and advanced features.',
    color: 'border-blue-200',
    highlight: false,
    features: [
      'Up to 15 users',
      '10,000 candidates',
      '2,500 leads',
      '1,000 AI screenings / month',
      'All file formats + bulk upload',
      'Advanced analytics',
      'Custom AI prompts',
      'Priority support',
    ],
    notIncluded: ['SSO / SAML', 'Dedicated account manager'],
  },
  {
    id: 'professional',
    name: 'Professional',
    badge: null,
    monthly: 149,
    annual: 119,
    description: 'Full-featured platform for established recruitment & sales teams.',
    color: 'border-purple-200',
    highlight: false,
    features: [
      'Up to 30 users',
      '25,000 candidates',
      '10,000 leads',
      '5,000 AI screenings / month',
      'All file formats + API access',
      'Power BI analytics',
      'Custom AI prompts',
      'Unlimited imports',
      'Phone + priority support',
    ],
    notIncluded: ['SSO / SAML', 'Dedicated account manager'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    badge: null,
    monthly: null,
    annual: null,
    description: 'Custom pricing for large teams. White-label, SSO & dedicated support.',
    color: 'border-gray-800',
    highlight: false,
    features: [
      'Unlimited users',
      'Unlimited candidates & leads',
      'Unlimited AI screenings',
      'Unlimited imports',
      'Custom AI models (BYO key)',
      'SSO / SAML',
      'Dedicated account manager',
      'SLA guarantee',
      'White-label option',
    ],
    notIncluded: [],
  },
];

const COMPARISON = [
  { feature: 'Users', free: 'Up to 3', starter: 'Up to 5', growth: 'Up to 15', professional: 'Up to 30', enterprise: 'Unlimited' },
  { feature: 'Candidates', free: '500', starter: '2,000', growth: '10,000', professional: '25,000', enterprise: 'Unlimited' },
  { feature: 'Leads', free: '250', starter: '1,000', growth: '2,500', professional: '10,000', enterprise: 'Unlimited' },
  { feature: 'AI screenings / month', free: '200', starter: '500', growth: '1,000', professional: '5,000', enterprise: 'Unlimited' },
  { feature: 'CSV/Excel imports', free: '✓', starter: '✓', growth: '✓', professional: '✓', enterprise: '✓' },
  { feature: 'PDF/Word resume parsing', free: '—', starter: '✓', growth: '✓', professional: '✓', enterprise: '✓' },
  { feature: 'n8n automation', free: '—', starter: '✓', growth: '✓', professional: '✓', enterprise: '✓' },
  { feature: 'Advanced analytics', free: '—', starter: '—', growth: '✓', professional: '✓', enterprise: '✓' },
  { feature: 'Custom AI prompts', free: '—', starter: '—', growth: '✓', professional: '✓', enterprise: '✓' },
  { feature: 'API access', free: '—', starter: '—', growth: '—', professional: '✓', enterprise: '✓' },
  { feature: 'SSO / SAML', free: '—', starter: '—', growth: '—', professional: '—', enterprise: '✓' },
  { feature: 'SLA guarantee', free: '—', starter: '—', growth: '—', professional: '—', enterprise: '✓' },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">RecruiSales <span className="text-brand-600">AI</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-brand-600">Sign in</Link>
            <Link href="/login" className="inline-flex items-center gap-1.5 bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors">
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 px-4 bg-gradient-to-b from-gray-50 to-white text-center">
        <Link href="/" className="inline-flex items-center gap-1 text-gray-400 text-xs hover:text-gray-600 mb-6 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Back to home
        </Link>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Early access pricing</h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto mb-3">
          We&apos;re just getting started. Lock in the lowest prices — they&apos;ll never be this low again.
        </p>
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-green-200">
          <Zap className="w-3 h-3" /> Launch pricing — save up to 80% vs future rates
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-24 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-5 gap-5">
          {PLANS.map((plan) => (
            <div key={plan.id} className={`relative rounded-2xl border-2 p-6 bg-white shadow-sm flex flex-col ${plan.color}`}>
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                  Most Popular
                </div>
              )}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{plan.name}</span>
                  {plan.badge && (
                    <span className="text-[10px] font-bold bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">{plan.badge}</span>
                  )}
                </div>
                {plan.monthly !== null ? (
                  <>
                    <div className="flex items-end gap-1 mb-1">
                      <span className="text-3xl font-extrabold text-gray-900">{plan.monthly === 0 ? 'Free' : `$${plan.monthly}`}</span>
                      {plan.monthly > 0 && <span className="text-gray-400 text-sm mb-1">/mo</span>}
                    </div>
                    {plan.annual > 0 && <div className="text-xs text-green-600 font-medium mb-2">${plan.annual}/mo billed annually</div>}
                    {plan.monthly === 0 && <div className="text-xs text-green-600 font-medium mb-2">No credit card required</div>}
                  </>
                ) : (
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-3xl font-extrabold text-gray-900">Custom</span>
                  </div>
                )}
                <p className="text-xs text-gray-500 leading-relaxed">{plan.description}</p>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
                {plan.notIncluded.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-400">
                    <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5 text-gray-300">—</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={`block text-center text-sm font-semibold py-2.5 rounded-xl transition-colors ${
                  plan.highlight
                    ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-md'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {plan.id === 'enterprise' ? 'Contact us' : plan.monthly === 0 ? 'Get started free' : 'Start 14-day trial'}
              </Link>
            </div>
          ))}
        </div>

        {/* Trial note */}
        <p className="text-center text-gray-400 text-xs mt-8">
          Early access pricing — lock in these rates forever. All paid plans include a 14-day free trial. Cancel anytime.
        </p>
      </section>

      {/* Comparison Table */}
      <section className="pb-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Full feature comparison</h2>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Feature</th>
                  {PLANS.map(p => (
                    <th key={p.id} className={`py-3 px-4 font-semibold text-center ${p.highlight ? 'text-brand-600' : 'text-gray-600'}`}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                    <td className="py-2.5 px-4 text-gray-700 font-medium">{row.feature}</td>
                    {(['free', 'starter', 'growth', 'professional', 'enterprise'] as const).map(k => (
                      <td key={k} className="py-2.5 px-4 text-center text-gray-600">
                        {row[k] === '✓' ? (
                          <Check className="w-4 h-4 text-green-500 mx-auto" />
                        ) : row[k] === '—' ? (
                          <span className="text-gray-300">—</span>
                        ) : (
                          row[k]
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="pb-24 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto pt-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-4">
            {[
              { q: 'Can I switch plans anytime?', a: 'Yes — upgrade or downgrade at any time. Charges are prorated automatically.' },
              { q: 'What file formats are supported for imports?', a: 'CSV, Excel (.xlsx), PDF resumes, and Word documents (.docx) are all supported. The AI automatically extracts and maps candidate or lead data.' },
              { q: 'How does the AI resume screening work?', a: 'Upload a resume (any format) and select a job. Our AI compares the candidate against the job requirements and returns a score, decision, and detailed breakdown.' },
              { q: 'What is an AI processing credit?', a: 'An AI processing credit is consumed each time you use AI features — resume screening, lead scoring, JD parsing, or outreach generation. Each action uses one or more credits depending on complexity.' },
              { q: 'Is there a free plan?', a: 'Yes! The Free plan gives you 500 candidates, 250 leads, and 200 AI screenings per month — no credit card required. Upgrade anytime for more capacity.' },
              { q: 'Will prices go up?', a: 'Yes — these are early access launch prices. If you sign up now, your rate is locked in forever.' },
            ].map(faq => (
              <details key={faq.q} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm group">
                <summary className="font-semibold text-gray-800 text-sm cursor-pointer list-none flex justify-between items-center">
                  {faq.q}
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-3 text-gray-500 text-sm leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-brand-700 to-brand-500 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Get early access now</h2>
        <p className="text-brand-100 mb-8 text-sm">Free to start. Lock in launch pricing forever.</p>
        <Link href="/login" className="inline-flex items-center gap-2 bg-white text-brand-700 font-bold px-8 py-3 rounded-xl hover:bg-brand-50 transition-colors shadow-lg text-sm">
          Create free account <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
