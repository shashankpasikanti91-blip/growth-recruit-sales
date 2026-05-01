'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ChevronLeft, User, Mail, CheckCircle, XCircle, AlertTriangle,
  Loader2, Unlink, ExternalLink,
} from 'lucide-react';
import { myHubApi, connectApi } from '@/lib/api-client';
import { clsx } from 'clsx';

// ─── Channel card ─────────────────────────────────────────────────────────────
function ChannelCard({
  name, icon, connected, email, onConnect, onDisconnect, loading, comingSoon,
}: {
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  email?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  loading?: boolean;
  comingSoon?: boolean;
}) {
  return (
    <div className={clsx(
      'flex items-center justify-between bg-white rounded-xl border px-5 py-4',
      connected ? 'border-green-200 bg-green-50/40' : 'border-gray-200',
    )}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm">
          {icon}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{name}</p>
          {connected && email && <p className="text-xs text-gray-500">{email}</p>}
          {!connected && <p className="text-xs text-gray-400">Not connected</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {connected && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
            <CheckCircle className="w-3 h-3" /> Connected
          </span>
        )}
        {comingSoon ? (
          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">Coming Soon</span>
        ) : connected ? (
          <button
            onClick={onDisconnect}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-red-600 hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlink className="w-3 h-3" />}
            Disconnect
          </button>
        ) : (
          <button
            onClick={onConnect}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MyHubProfilePage() {
  const searchParams = useSearchParams();
  const qClient = useQueryClient();

  // Toast message from OAuth redirect
  const connected = searchParams.get('connected');
  const error = searchParams.get('error');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    if (connected === 'gmail') setToast({ type: 'success', msg: 'Gmail connected successfully!' });
    if (connected === 'outlook') setToast({ type: 'success', msg: 'Outlook connected successfully!' });
    if (error) setToast({ type: 'error', msg: `Connection failed: ${error.replace(/_/g, ' ')}` });
    if (connected || error) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [connected, error]);

  // Profile data
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: myHubApi.getProfile,
  });

  // Channel statuses
  const { data: channels, isLoading: channelsLoading } = useQuery({
    queryKey: ['connect-channel-statuses'],
    queryFn: connectApi.getChannelStatuses,
  });

  // Profile edit state
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName ?? '');
      setLastName(profile.lastName ?? '');
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: () => myHubApi.updateProfile({ firstName, lastName }),
    onSuccess: () => {
      qClient.invalidateQueries({ queryKey: ['my-profile'] });
      setEditing(false);
    },
  });

  // Gmail connect
  const [gmailLoading, setGmailLoading] = useState(false);
  const disconnectGmailMutation = useMutation({
    mutationFn: connectApi.disconnectGmail,
    onSuccess: () => qClient.invalidateQueries({ queryKey: ['connect-channel-statuses'] }),
  });

  const handleConnectGmail = async () => {
    setGmailLoading(true);
    try {
      const { url } = await connectApi.getGmailAuthUrl();
      window.location.href = url;
    } catch {
      setGmailLoading(false);
    }
  };

  // Outlook connect
  const [outlookLoading, setOutlookLoading] = useState(false);
  const disconnectOutlookMutation = useMutation({
    mutationFn: connectApi.disconnectOutlook,
    onSuccess: () => qClient.invalidateQueries({ queryKey: ['connect-channel-statuses'] }),
  });

  const handleConnectOutlook = async () => {
    setOutlookLoading(true);
    try {
      const { url } = await connectApi.getOutlookAuthUrl();
      window.location.href = url;
    } catch {
      setOutlookLoading(false);
    }
  };

  const gmail = channels?.gmail;
  const outlook = channels?.outlook;

  return (
    <div className="max-w-2xl">
      {/* Toast */}
      {toast && (
        <div className={clsx(
          'flex items-center gap-2 px-4 py-3 rounded-xl mb-6 text-sm font-medium',
          toast.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200',
        )}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/my-hub" className="text-gray-400 hover:text-gray-700"><ChevronLeft className="w-5 h-5" /></Link>
        <User className="w-6 h-6 text-brand-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500">Personal info and channel connections</p>
        </div>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Personal Information</h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-sm text-brand-600 hover:underline font-medium">Edit</button>
          )}
        </div>

        {profileLoading ? (
          <div className="flex justify-center py-8 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">First Name</label>
                <input
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Last Name</label>
                <input
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save changes
              </button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">First Name</p>
              <p className="text-sm text-gray-900">{profile?.firstName ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Last Name</p>
              <p className="text-sm text-gray-900">{profile?.lastName ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Email</p>
              <p className="text-sm text-gray-900">{profile?.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Role</p>
              <p className="text-sm text-gray-900">{profile?.role ?? '—'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Communication Channels */}
      <div>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">Email Channels</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Connect your work email account to send outreach directly from SRP. Your emails will appear in your sent folder.
          </p>
        </div>

        <div className="space-y-3">
          <ChannelCard
            name="Gmail"
            icon={<Mail className="w-5 h-5 text-red-500" />}
            connected={!!gmail?.connected}
            email={gmail?.email}
            loading={gmailLoading || disconnectGmailMutation.isPending}
            onConnect={handleConnectGmail}
            onDisconnect={() => disconnectGmailMutation.mutate()}
          />
          <ChannelCard
            name="Outlook / Microsoft 365"
            icon={<Mail className="w-5 h-5 text-blue-600" />}
            connected={!!outlook?.connected}
            email={outlook?.email}
            loading={outlookLoading || disconnectOutlookMutation.isPending}
            onConnect={handleConnectOutlook}
            onDisconnect={() => disconnectOutlookMutation.mutate()}
          />
        </div>

        <p className="text-xs text-gray-400 mt-3">
          Team messaging channels (WhatsApp, Telegram, Teams) are configured by your admin in{' '}
          <Link href="/integrations" className="text-brand-600 hover:underline">Settings → Integrations</Link>.
        </p>
      </div>
    </div>
  );
}
