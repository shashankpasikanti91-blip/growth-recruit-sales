'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Settings, Key, User, Building2, ShieldCheck, ExternalLink, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const PROVIDERS = ['LINKEDIN','INDEED','APOLLO','HUNTER','CLEARBIT','SMTP','SLACK','WEBHOOK'];

const PROVIDER_HELP: Record<string, { description: string; keyLabel: string; getKeyUrl: string; getKeyLabel: string }> = {
  APOLLO: {
    description: 'Apollo.io — B2B contact & company enrichment, lead generation.',
    keyLabel: 'API Key',
    getKeyUrl: 'https://app.apollo.io/settings/integrations/api',
    getKeyLabel: 'Get key → app.apollo.io › Settings › API',
  },
  LINKEDIN: {
    description: 'LinkedIn — Profile lookup and Sales Navigator integration.',
    keyLabel: 'Access Token',
    getKeyUrl: 'https://www.linkedin.com/developers/apps',
    getKeyLabel: 'Create app → developers.linkedin.com',
  },
  HUNTER: {
    description: 'Hunter.io — Find and verify professional email addresses by domain.',
    keyLabel: 'API Key',
    getKeyUrl: 'https://hunter.io/api-keys',
    getKeyLabel: 'Get key → hunter.io › Account › API',
  },
  CLEARBIT: {
    description: 'Clearbit — Company and person enrichment data.',
    keyLabel: 'Secret Key',
    getKeyUrl: 'https://dashboard.clearbit.com/api',
    getKeyLabel: 'Get key → dashboard.clearbit.com › API',
  },
  SMTP: {
    description: 'SMTP — Send outreach emails. Use Gmail App Password or SendGrid API key.',
    keyLabel: 'Password / API Key',
    getKeyUrl: 'https://myaccount.google.com/apppasswords',
    getKeyLabel: 'Gmail App Password → myaccount.google.com/apppasswords',
  },
  SLACK: {
    description: 'Slack — Get notifications for new leads, placements, and pipeline updates.',
    keyLabel: 'Bot Token (xoxb-...)',
    getKeyUrl: 'https://api.slack.com/apps',
    getKeyLabel: 'Create app → api.slack.com/apps',
  },
  WEBHOOK: {
    description: 'Webhook — Push events to your own URL (Zapier, Make, custom backend).',
    keyLabel: 'Webhook URL',
    getKeyUrl: 'https://zapier.com/app/editor',
    getKeyLabel: 'Create webhook URL via Zapier / Make / n8n',
  },
  INDEED: {
    description: 'Indeed — Post jobs and import applicants from Indeed.',
    keyLabel: 'Publisher ID / API Key',
    getKeyUrl: 'https://ads.indeed.com/jobroll/xmlfeed',
    getKeyLabel: 'Get Publisher ID → Indeed Advertiser portal',
  },
};

function IntegrationsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => api.get('/integrations').then(r => r.data),
  });

  const [newProvider, setNewProvider] = useState('APOLLO');
  const [apiKey, setApiKey] = useState('');

  const help = PROVIDER_HELP[newProvider];

  const save = useMutation({
    mutationFn: () => api.post('/integrations', { provider: newProvider, encryptedCredentials: { apiKey } }),
    onSuccess: () => { toast.success('Integration saved'); queryClient.invalidateQueries({ queryKey: ['integrations'] }); setApiKey(''); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Save failed'),
  });

  const integrations: any[] = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-1">Add / Update Integration</h3>
        <p className="text-sm text-gray-500 mb-4">
          Connect external services to enrich leads, send outreach emails, and post jobs.
          You need to provide your <strong>own API key</strong> from each provider — the system does not generate these for you.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Provider</label>
            <select className="input" value={newProvider} onChange={e => { setNewProvider(e.target.value); setApiKey(''); }}>
              {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{help?.keyLabel ?? 'API Key / Credential'}</label>
            <input className="input" type="password" placeholder="Paste your key here..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
          </div>
        </div>

        {/* Per-provider help banner */}
        {help && (
          <div className="mt-3 flex items-start gap-2 text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2.5 border border-blue-100">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-0.5">{help.description}</p>
              <a
                href={help.getKeyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
              >
                {help.getKeyLabel} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        <button onClick={() => save.mutate()} disabled={save.isPending || !apiKey} className="btn-primary mt-4">
          {save.isPending ? 'Saving...' : 'Save Integration'}
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 font-medium text-gray-900">Active Integrations</div>
        {isLoading ? (
          <div className="px-6 py-8 text-center text-gray-400">Loading...</div>
        ) : integrations.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400">No integrations configured</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Provider', 'Status', 'Last Tested'].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {integrations.map((intg: any) => (
                <tr key={intg.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{intg.provider}</td>
                  <td className="px-6 py-4">
                    <span className={intg.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}>{intg.status}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{intg.lastTestedAt ? new Date(intg.lastTestedAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ProfileTab() {
  return (
    <div className="card max-w-lg">
      <h3 className="font-semibold text-gray-900 mb-4">Profile Settings</h3>
      <p className="text-sm text-gray-500">Profile management coming soon.</p>
    </div>
  );
}

function AuditTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-log'],
    queryFn: () => api.get('/audit?limit=50').then(r => r.data),
  });
  const logs: any[] = data?.data ?? [];

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-6 py-4 border-b bg-gray-50 font-medium text-gray-900">Audit Log</div>
      {isLoading ? (
        <div className="px-6 py-8 text-center text-gray-400">Loading...</div>
      ) : (
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b sticky top-0">
              <tr>
                {['Action', 'Entity', 'User', 'When'].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No audit entries</td></tr>
              ) : logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono text-xs text-gray-600">{log.action}</td>
                  <td className="px-6 py-3 text-gray-700">{log.entityType} <span className="text-gray-400 text-xs">{log.entityId?.slice(0,8)}</span></td>
                  <td className="px-6 py-3 text-gray-600">{log.user?.email ?? '—'}</td>
                  <td className="px-6 py-3 text-gray-400 text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id: 'integrations', label: 'Integrations', icon: Key },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'audit', label: 'Audit Log', icon: ShieldCheck },
];

export default function SettingsPage() {
  const [tab, setTab] = useState('integrations');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Settings className="w-6 h-6" /> Settings</h1>
        <p className="text-gray-500 mt-1">Manage integrations, profile, and audit logs</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'integrations' && <IntegrationsTab />}
      {tab === 'profile' && <ProfileTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  );
}
