'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Settings, Key, User, Building2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const PROVIDERS = ['LINKEDIN','INDEED','APOLLO','HUNTER','CLEARBIT','SMTP','SLACK','WEBHOOK'];

function IntegrationsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => api.get('/integrations').then(r => r.data),
  });

  const [newProvider, setNewProvider] = useState('APOLLO');
  const [apiKey, setApiKey] = useState('');

  const save = useMutation({
    mutationFn: () => api.post('/integrations', { provider: newProvider, encryptedCredentials: { apiKey } }),
    onSuccess: () => { toast.success('Integration saved'); queryClient.invalidateQueries({ queryKey: ['integrations'] }); setApiKey(''); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Save failed'),
  });

  const integrations: any[] = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Add / Update Integration</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Provider</label>
            <select className="input" value={newProvider} onChange={e => setNewProvider(e.target.value)}>
              {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">API Key / Credential</label>
            <input className="input" type="password" placeholder="Paste key..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
          </div>
        </div>
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
