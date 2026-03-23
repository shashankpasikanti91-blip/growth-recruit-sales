'use client';
import { ExternalLink, CheckCircle, XCircle, Settings, Zap, Globe, Database, Mail } from 'lucide-react';

type Integration = {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  status: 'connected' | 'not_connected' | 'coming_soon';
  configUrl?: string;
};

const INTEGRATIONS: Integration[] = [
  {
    id: 'n8n',
    name: 'n8n Automation',
    description: 'Visual workflow automation for imports, screening, and outreach sequences.',
    icon: Zap,
    status: 'connected',
    configUrl: process.env.NEXT_PUBLIC_N8N_URL,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter / OpenAI',
    description: 'AI provider for resume screening, lead scoring, and outreach generation.',
    icon: Database,
    status: 'connected',
  },
  {
    id: 'smtp',
    name: 'SMTP Email',
    description: 'Send outreach emails directly via your configured SMTP server.',
    icon: Mail,
    status: 'not_connected',
  },
  {
    id: 'google-maps',
    name: 'Google Maps Places',
    description: 'Discover local businesses and import them as sales leads automatically.',
    icon: Globe,
    status: 'coming_soon',
  },
  {
    id: 'apify',
    name: 'Apify Web Scraping',
    description: 'Scrape and enrich lead data from public web sources via Apify actors.',
    icon: Globe,
    status: 'coming_soon',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn AI Assistant',
    description: 'AI-powered content generation for LinkedIn posts and connection messages.',
    icon: Globe,
    status: 'connected',
    configUrl: '/linkedin',
  },
];

const STATUS_BADGE = {
  connected: { label: 'Connected', className: 'bg-green-100 text-green-700', icon: CheckCircle },
  not_connected: { label: 'Not Connected', className: 'bg-gray-100 text-gray-500', icon: XCircle },
  coming_soon: { label: 'Coming Soon', className: 'bg-yellow-100 text-yellow-700', icon: Settings },
};

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-500 text-sm mt-1">Manage connected services and tools</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {INTEGRATIONS.map((integration) => {
          const badge = STATUS_BADGE[integration.status];
          const BadgeIcon = badge.icon;
          const IntIcon = integration.icon;
          return (
            <div
              key={integration.id}
              className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
                    <IntIcon className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{integration.name}</div>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
                      <BadgeIcon className="w-3 h-3" />
                      {badge.label}
                    </span>
                  </div>
                </div>
                {integration.configUrl && (
                  <a
                    href={integration.configUrl}
                    target={integration.configUrl.startsWith('http') ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-brand-600 hover:underline flex-shrink-0"
                  >
                    Configure
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <p className="text-sm text-gray-500">{integration.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
