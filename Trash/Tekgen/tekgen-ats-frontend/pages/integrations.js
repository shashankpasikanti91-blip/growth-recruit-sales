import { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import apiClient from '../lib/api';
import {
  Mail, MessageSquare, Send, Phone,
  Check, AlertCircle, Globe, Info, Eye, EyeOff,
  Wifi, WifiOff, Settings, Shield, RefreshCw, Trash2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Platform metadata
// ---------------------------------------------------------------------------
const COMM_PLATFORMS = {
  outlook: {
    name: 'Microsoft Outlook',
    subtitle: 'Send recruitment emails via your company Outlook account',
    icon: Mail,
    color: 'bg-blue-700',
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    fields: [
      { key: 'smtpUser', label: 'Outlook Email Address', type: 'email', placeholder: 'recruitment@company.com', required: true },
      { key: 'apiKey', label: 'App Password', type: 'password', placeholder: 'xxxx xxxx xxxx xxxx', required: true,
        hint: 'Generate at: Microsoft Account > Security > App Passwords (MFA must be enabled first)' },
      { key: 'smtpHost', label: 'SMTP Host', type: 'text', placeholder: 'smtp.office365.com', required: false },
    ],
  },
  teams: {
    name: 'Microsoft Teams',
    subtitle: 'Post notifications to your Teams channel via Incoming Webhook',
    icon: MessageSquare,
    color: 'bg-indigo-700',
    border: 'border-indigo-200',
    bg: 'bg-indigo-50',
    fields: [
      { key: 'webhookUrl', label: 'Teams Incoming Webhook URL', type: 'url',
        placeholder: 'https://company.webhook.office.com/webhookb2/...', required: true,
        hint: 'Teams > Channel > ... > Connectors > Incoming Webhook > Configure > Copy URL' },
    ],
  },
  whatsapp: {
    name: 'WhatsApp Business',
    subtitle: 'Message candidates via Meta Business API',
    icon: Phone,
    color: 'bg-green-600',
    border: 'border-green-200',
    bg: 'bg-green-50',
    fields: [
      { key: 'apiKey', label: 'Access Token', type: 'password', placeholder: 'EAA...', required: true,
        hint: 'Meta Business Suite > WhatsApp > API Access > Permanent Token' },
      { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text', placeholder: '1234567890123', required: false,
        hint: 'Meta > WhatsApp > Getting Started > Phone Number ID' },
    ],
  },
  telegram: {
    name: 'Telegram',
    subtitle: 'Send candidate notifications via your Telegram Bot',
    icon: Send,
    color: 'bg-sky-500',
    border: 'border-sky-200',
    bg: 'bg-sky-50',
    fields: [
      { key: 'apiKey', label: 'Bot Token', type: 'password', placeholder: '1234567890:ABCdef...', required: true,
        hint: 'From @BotFather on Telegram > /newbot > copy the token' },
      { key: 'chatId', label: 'Default Chat ID', type: 'text', placeholder: '-1001234567890', required: false,
        hint: 'Group or channel ID for notifications (get via @userinfobot)' },
    ],
  },
};

const JOB_PORTAL_PLATFORMS = {
  monster:   { name: 'Monster',   color: 'bg-purple-500' },
  naukri:    { name: 'Naukri',    color: 'bg-blue-500'   },
  jobstreet: { name: 'JobStreet', color: 'bg-green-500'  },
  indeed:    { name: 'Indeed',    color: 'bg-indigo-500' },
  futurejob: { name: 'FutureJob', color: 'bg-teal-500'   },
};

// ---------------------------------------------------------------------------
// Password field with show/hide toggle
// ---------------------------------------------------------------------------
function PasswordField({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
      />
      <button type="button" onClick={() => setShow(v => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Communication platform card (Outlook / Teams / WhatsApp / Telegram)
// ---------------------------------------------------------------------------
function CommCard({ platform, info, integration, isAdmin, onSaved, onDeleted }) {
  const Icon = info.icon;
  const [editing, setEditing]       = useState(false);
  const [testing, setTesting]       = useState(false);
  const [saving,  setSaving]        = useState(false);
  const [msg,     setMsg]           = useState('');
  const [msgOk,   setMsgOk]         = useState(true);
  const [form,    setForm]          = useState({});
  const [makeGlobal, setMakeGlobal] = useState(false);

  const isConfigured = integration?.isConfigured;
  const isGlobal     = integration?.isGlobal;
  const isFromGlobal = integration?.isFromGlobal;
  const connectedAs  = integration?.connectedAs;
  const canEdit      = isAdmin || !isFromGlobal;

  function flash(text, ok = true) {
    setMsg(text); setMsgOk(ok);
    setTimeout(() => setMsg(''), 6000);
  }

  function openEdit() {
    setForm({});
    setMakeGlobal(isGlobal || false);
    setEditing(true);
    setMsg('');
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      const payload = { platform, isEnabled: true, isGlobal: isAdmin ? makeGlobal : false };
      info.fields.forEach(f => { if (form[f.key]) payload[f.key] = form[f.key]; });
      await apiClient.post('/api/integrations', payload);
      flash(makeGlobal && isAdmin
        ? info.name + ' connected — system-wide for ALL users automatically.'
        : info.name + ' connected successfully.');
      setEditing(false);
      onSaved();
    } catch (err) {
      flash(err.response?.data?.message || 'Save failed.', false);
    } finally { setSaving(false); }
  }

  async function handleTest() {
    setTesting(true); setMsg('');
    try {
      if (platform === 'outlook') {
        const res = await apiClient.post('/api/integrations/outlook/test-smtp');
        flash('Connected: ' + (res.data.data?.email || connectedAs));
      } else {
        const res = await apiClient.post('/api/integrations/test/' + platform);
        flash(res.data.message || 'Connection OK');
      }
    } catch (err) { flash(err.response?.data?.message || 'Test failed.', false); }
    finally { setTesting(false); }
  }

  async function handleDelete() {
    if (!window.confirm('Remove ' + info.name + '?')) return;
    try {
      await apiClient.delete('/api/integrations/' + platform);
      onDeleted();
    } catch (err) { flash(err.response?.data?.message || 'Delete failed.', false); }
  }

  return (
    <div className={`bg-white rounded-xl border-2 ${info.border} overflow-hidden shadow-sm`}>
      {/* Card header */}
      <div className={`flex items-center justify-between px-5 py-4 ${info.bg} border-b ${info.border}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 ${info.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
            <Icon size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-gray-900 text-sm">{info.name}</span>
              {isGlobal && (
                <span className="inline-flex items-center gap-1 bg-teal-100 text-teal-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  <Shield size={8} /> SYSTEM-WIDE
                </span>
              )}
              {isFromGlobal && !isAdmin && (
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">COMPANY</span>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">{info.subtitle}</p>
          </div>
        </div>
        <span className={`ml-2 flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
          isConfigured && integration?.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
        }`}>
          {isConfigured && integration?.isEnabled
            ? <><Wifi size={9} /> Active</>
            : <><WifiOff size={9} /> {isConfigured ? 'Off' : 'Not Set'}</>}
        </span>
      </div>

      {/* Feedback message */}
      {msg && (
        <div className={`mx-4 mt-3 px-3 py-2 rounded-lg text-xs flex items-start gap-2 ${
          msgOk ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {msgOk ? <Check size={12} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />}
          {msg}
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Non-admin using company global: read-only */}
        {!isAdmin && isFromGlobal && (
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <Check size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Connected via company account</p>
              {connectedAs && <p className="text-xs text-blue-600">{connectedAs}</p>}
              <p className="text-xs text-blue-400 mt-0.5">Your admin configured this for the whole team — no action needed.</p>
            </div>
          </div>
        )}

        {/* Configured (admin or personal, not from global), not editing: show status + actions */}
        {isConfigured && (!isFromGlobal || isAdmin) && !editing && (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <div className="text-sm text-green-800 font-semibold flex items-center gap-2">
              <Check size={15} className="text-green-600" />
              {connectedAs || 'Configured'}
              {isGlobal && isAdmin && <span className="text-xs font-normal text-teal-600">(all users)</span>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleTest} disabled={testing}
                className="flex items-center gap-1 text-xs bg-white border border-green-300 text-green-700 px-2.5 py-1 rounded-lg hover:bg-green-50 disabled:opacity-50 font-medium">
                <RefreshCw size={10} className={testing ? 'animate-spin' : ''} />
                {testing ? 'Testing' : 'Test'}
              </button>
              {canEdit && (
                <button onClick={openEdit}
                  className="flex items-center gap-1 text-xs bg-white border border-gray-300 text-gray-700 px-2.5 py-1 rounded-lg hover:bg-gray-50 font-medium">
                  <Settings size={10} /> Update
                </button>
              )}
              {canEdit && (
                <button onClick={handleDelete} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Config form */}
        {(!isConfigured || editing) && canEdit && (
          <form onSubmit={handleSave} className="space-y-3">
            {info.fields.map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {f.type === 'password' ? (
                  <PasswordField
                    value={form[f.key] || ''}
                    onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                  />
                ) : (
                  <input
                    type={f.type || 'text'}
                    value={form[f.key] || ''}
                    onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    required={f.required}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                )}
                {f.hint && (
                  <p className="text-[11px] text-gray-400 mt-1 flex items-start gap-1">
                    <Info size={10} className="flex-shrink-0 mt-0.5" />{f.hint}
                  </p>
                )}
              </div>
            ))}

            {/* Admin: Make system-wide toggle */}
            {isAdmin && (
              <label className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 cursor-pointer select-none">
                <div className="relative flex-shrink-0">
                  <input type="checkbox" className="sr-only" checked={makeGlobal}
                    onChange={e => setMakeGlobal(e.target.checked)} />
                  <div className={`w-10 h-5 rounded-full transition-colors ${makeGlobal ? 'bg-teal-500' : 'bg-gray-300'}`} />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${makeGlobal ? 'translate-x-5' : ''}`} />
                </div>
                <div>
                  <p className="text-sm font-bold text-teal-800">Make System-wide</p>
                  <p className="text-xs text-teal-600">
                    All users (Recruiter, Sales, HR, Payroll) automatically get this — zero individual setup
                  </p>
                </div>
              </label>
            )}

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-bold">
                <Check size={14} /> {saving ? 'Saving...' : isConfigured ? 'Update' : 'Connect'}
              </button>
              {editing && (
                <button type="button" onClick={() => setEditing(false)}
                  className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm text-gray-600">
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        {/* Non-admin, not from global, not configured */}
        {!isConfigured && !canEdit && (
          <p className="text-center text-xs text-gray-400 py-3">
            Not configured. Ask your admin to set this up.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Job Portal card (personal per-user API keys)
// ---------------------------------------------------------------------------
function JobPortalCard({ platform, info, integration, onSaved, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [apiKey,  setApiKey]  = useState('');
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState('');

  async function handleSave() {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      await apiClient.post('/api/integrations', { platform, apiKey, isEnabled: true });
      setEditing(false); setApiKey(''); onSaved();
      setMsg('Saved'); setTimeout(() => setMsg(''), 3000);
    } catch (err) { setMsg(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!window.confirm('Remove ' + info.name + '?')) return;
    try { await apiClient.delete('/api/integrations/' + platform); onDeleted(); } catch {}
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 ${info.color} rounded-lg flex items-center justify-center`}>
          <Globe size={15} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-xs">{info.name}</p>
          <span className={`text-[10px] font-bold ${integration?.isEnabled ? 'text-green-600' : 'text-gray-400'}`}>
            {integration?.isEnabled ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      {msg && <p className="text-xs text-teal-600 mb-2">{msg}</p>}
      {editing ? (
        <div className="space-y-2">
          <PasswordField value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="API Key" />
          <div className="flex gap-1.5">
            <button onClick={handleSave} disabled={saving}
              className="bg-teal-600 text-white px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-50">
              {saving ? '...' : 'Save'}
            </button>
            <button onClick={() => { setEditing(false); setApiKey(''); }}
              className="bg-gray-100 px-3 py-1 rounded-lg text-xs text-gray-600">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex gap-1.5">
          <button onClick={() => setEditing(true)}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 rounded-lg text-xs font-medium">
            {integration?.isConfigured ? 'Update' : 'Setup'}
          </button>
          {integration?.isConfigured && (
            <button onClick={handleDelete} className="text-red-400 hover:text-red-600 px-1.5">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [isAdmin,      setIsAdmin]      = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (stored) { const u = JSON.parse(stored); setIsAdmin(u.role === 'ADMIN'); }
    } catch {}
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/integrations');
      setIntegrations(res.data?.data?.integrations || []);
    } catch {} finally { setLoading(false); }
  }

  const get = p => integrations.find(i => i.platform === p);
  const globalCount = Object.keys(COMM_PLATFORMS).filter(p => get(p)?.isGlobal).length;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto">

          {/* Hero header */}
          <div className="bg-gradient-to-r from-teal-600 to-teal-800 text-white p-8">
            <h1 className="text-3xl font-bold mb-1">Integrations</h1>
            <p className="text-teal-100 text-sm">
              {isAdmin
                ? 'Configure company integrations once. Enable System-wide and every user gets it automatically — no individual setup needed.'
                : 'Your connected services. Company integrations from your admin are ready to use.'}
            </p>
          </div>

          <div className="p-6 space-y-8">

            {/* Admin info banner */}
            {isAdmin && (
              <div className="flex items-start gap-3 bg-teal-50 border border-teal-200 rounded-xl px-5 py-4">
                <Shield size={18} className="text-teal-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-teal-900 text-sm">Admin: System-wide Configuration</p>
                  <p className="text-xs text-teal-700 mt-1">
                    Toggle <strong>Make System-wide</strong> when connecting Outlook, Teams, WhatsApp or Telegram.
                    Every recruiter, sales, HR and payroll user will automatically have the channel active
                    with zero individual configuration.
                    {globalCount > 0 && <span className="ml-1 font-semibold text-teal-800">{globalCount} channel{globalCount > 1 ? 's' : ''} already system-wide.</span>}
                  </p>
                </div>
              </div>
            )}

            {/* Non-admin info banner */}
            {!isAdmin && (
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
                <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Integrations marked <strong className="bg-blue-100 px-1 rounded text-blue-800">COMPANY</strong> are
                  set up by your admin and shared across the whole team — they are already active for you with no setup required.
                </p>
              </div>
            )}

            {/* Communications section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-bold text-gray-900">Communications</h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  Email · Teams · WhatsApp · Telegram
                </span>
              </div>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(n => (
                    <div key={n} className="bg-white rounded-xl border-2 border-gray-100 h-44 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(COMM_PLATFORMS).map(([platform, info]) => (
                    <CommCard key={platform} platform={platform} info={info}
                      integration={get(platform)} isAdmin={isAdmin}
                      onSaved={load} onDeleted={load} />
                  ))}
                </div>
              )}
            </section>

            {/* Job Portals section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-bold text-gray-900">Job Portals</h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Personal API keys</span>
              </div>
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map(n => (
                    <div key={n} className="bg-white rounded-xl border border-gray-100 h-28 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {Object.entries(JOB_PORTAL_PLATFORMS).map(([platform, info]) => (
                    <JobPortalCard key={platform} platform={platform} info={info}
                      integration={get(platform)} onSaved={load} onDeleted={load} />
                  ))}
                </div>
              )}
            </section>

            {/* Quick setup guides */}
            <section className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
                <Info size={13} /> Quick Setup Guides
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-500">
                {[
                  { title: 'Outlook (Office 365)', color: 'text-blue-700', steps: [
                    'Sign in at account.microsoft.com',
                    'Security > Advanced security options',
                    'Enable Multi-Factor Authentication',
                    'App Passwords > Create > select "Mail"',
                    'Enter your email + app password above',
                  ]},
                  { title: 'Microsoft Teams', color: 'text-indigo-700', steps: [
                    'Open Teams > go to target channel',
                    'Click ... (more options) > Connectors',
                    'Search "Incoming Webhook" > Configure',
                    'Give it a name > Create',
                    'Copy the webhook URL > paste above',
                  ]},
                  { title: 'WhatsApp Business', color: 'text-green-700', steps: [
                    'Go to business.facebook.com',
                    'WhatsApp > API Setup > Phone Numbers',
                    'Generate a Permanent Access Token',
                    'Copy your Phone Number ID',
                    'Enter token + Phone Number ID above',
                  ]},
                  { title: 'Telegram Bot', color: 'text-sky-600', steps: [
                    'Open Telegram > search @BotFather',
                    'Send /newbot and follow the prompts',
                    'Copy the bot token provided',
                    'Add the bot to your group/channel',
                    'Get chat ID via @userinfobot',
                  ]},
                ].map(g => (
                  <div key={g.title} className="bg-white rounded-lg border border-gray-200 p-4">
                    <p className={`font-bold mb-2 ${g.color}`}>{g.title}</p>
                    <ol className="list-decimal list-inside space-y-1">
                      {g.steps.map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
