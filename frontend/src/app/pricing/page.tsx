import Link from 'next/link';
import { Check, Zap, ArrowLeft, ArrowRight } from 'lucide-react';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthly: 49,
    annual: 39,
    description: 'Perfect for small teams just getting started with AI recruitment.',
    color: 'border-gray-200',
    highlight: false,
    features: [
      '3 team members',
      '500 candidates',
      '250 leads',
      '200 AI calls / month',
      'CSV & Excel imports',
      'Basic analytics',
      'Email outreach',
      'Community support',
    ],
    notIncluded: ['PDF/Word resume parsing', 'Advanced analytics', 'n8n workflows', 'SSO / SAML'],
  },
  {
    id: 'growth',
    name: 'Growth',
    monthly: 129,
    annual: 103,
    description: 'For growing teams that need more power and automation.',
    color: 'border-blue-200',
    highlight: false,
    features: [
      '10 team members',
      '5,000 candidates',
      '2,500 leads',
      '1,000 AI calls / month',
      'All file formats (PDF, Word, Excel, CSV)',
      'Advanced analytics',
      'n8n workflow automation',
      'Priority email support',
    ],
    notIncluded: ['Custom AI prompts', 'SSO / SAML', 'Dedicated account manager'],
  },
  {
    id: 'professional',
    name: 'Professional',
    monthly: 299,
    annual: 239,
    description: 'The complete platform for high-volume recruiting and sales teams.',
    color: 'border-brand-500 ring-2 ring-brand-500',
    highlight: true,
    features: [
      '30 team members',
      '25,000 candidates',
      '10,000 leads',
      '5,000 AI calls / month',
      'All file formats + bulk upload',
      'Power BI-style analytics',
      'Custom AI prompts',
      '5 n8n workflow templates',
      'Priority chat support',
    ],
    notIncluded: ['SSO / SAML', 'Dedicated account manager'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthly: 799,
    annual: 639,
    description: 'Unlimited scale with enterprise-grade security and support.',
    color: 'border-gray-800',
    highlight: false,
    features: [
      'Unlimited team members',
      'Unlimited candidates',
      'Unlimited leads',
      'Unlimited AI calls',
      'All file formats + API',
      'Custom analytics & reporting',
      'Custom AI models',
      'Unlimited n8n workflows',
      'SSO / SAML',
      'Dedicated account manager',
      'SLA guarantee',
    ],
    notIncluded: [],
  },
];

const COMPARISON = [
  { feature: 'Team members', starter: '3', growth: '10', professional: '30', enterprise: 'Unlimited' },
  { feature: 'Candidates', starter: '500', growth: '5,000', professional: '25,000', enterprise: 'Unlimited' },
  { feature: 'Leads', starter: '250', growth: '2,500', professional: '10,000', enterprise: 'Unlimited' },
  { feature: 'AI calls/month', starter: '200', growth: '1,000', professional: '5,000', enterprise: 'Unlimited' },
  { feature: 'CSV/Excel imports', starter: '✓', growth: '✓', professional: '✓', enterprise: '✓' },
  { feature: 'PDF/Word resume parsing', starter: '—', growth: '✓', professional: '✓', enterprise: '✓' },
  { feature: 'n8n automation', starter: '—', growth: '✓', professional: '✓', enterprise: '✓' },
  { feature: 'Power BI analytics', starter: '—', growth: '—', professional: '✓', enterprise: '✓' },
  { feature: 'Custom AI prompts', starter: '—', growth: '—', professional: '✓', enterprise: '✓' },
  { feature: 'SSO / SAML', starter: '—', growth: '—', professional: '—', enterprise: '✓' },
  { feature: 'SLA guarantee', starter: '—', growth: '—', professional: '—', enterprise: '✓' },
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
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Simple, transparent pricing</h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto mb-3">
          Start free for 14 days. No credit card required. Scale as you grow.
        </p>
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-green-200">
          <Check className="w-3 h-3" /> Annual billing saves up to 20%
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-24 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-5">
          {PLANS.map((plan) => (
            <div key={plan.id} className={`relative rounded-2xl border-2 p-6 bg-white shadow-sm flex flex-col ${plan.color}`}>
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                  Most Popular
                </div>
              )}
              <div className="mb-5">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{plan.name}</div>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-3xl font-extrabold text-gray-900">${plan.monthly}</span>
                  <span className="text-gray-400 text-sm mb-1">/mo</span>
                </div>
                <div className="text-xs text-green-600 font-medium mb-2">${plan.annual}/mo billed annually</div>
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
                href="/login"
                className={`block text-center text-sm font-semibold py-2.5 rounded-xl transition-colors ${
                  plan.highlight
                    ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-md'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {plan.id === 'enterprise' ? 'Contact sales' : 'Start free trial'}
              </Link>
            </div>
          ))}
        </div>

        {/* Trial note */}
        <p className="text-center text-gray-400 text-xs mt-8">
          All plans include a 14-day free trial. No credit card required. Cancel anytime.
        </p>
      </section>

      {/* Comparison Table */}
      <section className="pb-24 px-4">
        <div className="max-w-5xl mx-auto">
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
                    {(['starter', 'growth', 'professional', 'enterprise'] as const).map(k => (
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
              { q: 'What is an AI call?', a: 'An AI call is any request to the AI model — resume screening, lead scoring, JD parsing, or outreach generation. Each action uses one or more credits depending on complexity.' },
              { q: 'Is there a free trial?', a: 'Yes! Every plan includes a 14-day free trial with full access. No credit card required.' },
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
        <h2 className="text-2xl font-bold text-white mb-3">Start your free trial today</h2>
        <p className="text-brand-100 mb-8 text-sm">No credit card. Full access. Cancel anytime.</p>
        <Link href="/login" className="inline-flex items-center gap-2 bg-white text-brand-700 font-bold px-8 py-3 rounded-xl hover:bg-brand-50 transition-colors shadow-lg text-sm">
          Create free account <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
