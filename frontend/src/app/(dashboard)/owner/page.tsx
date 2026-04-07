'use client';
import { useQuery } from '@tanstack/react-query';
import { ownerApi } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Users, Building2, Zap, CreditCard, TrendingUp,
  AlertTriangle, UserPlus, BarChart3, RefreshCw,
} from 'lucide-react';

function StatCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string | number; sub?: string; color: string; icon: any;
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
        {sub && <div className="text-xs text-gray-400">{sub}</div>}
      </div>
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = {
  TRIALING: 'badge-yellow',
  ACTIVE: 'badge-green',
  PAST_DUE: 'badge-red',
  CANCELLED: 'badge-gray',
  EXPIRED: 'badge-red',
};

export default function OwnerDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [tab, setTab] = useState<'overview' | 'tenants' | 'subscriptions' | 'signups' | 'ai'>('overview');
  const [search, setSearch] = useState('');
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN') router.replace('/dashboard');
  }, [user, router]);

  const { data: overview, isLoading: loadingOverview, refetch: refetchOverview } = useQuery({
    queryKey: ['owner-overview'],
    queryFn: () => ownerApi.overview(),
    enabled: user?.role === 'SUPER_ADMIN',
    refetchInterval: 60_000,
  });

  const { data: tenants, isLoading: loadingTenants } = useQuery({
    queryKey: ['owner-tenants', search],
    queryFn: () => ownerApi.tenants({ limit: 100, search: search || undefined }),
    enabled: user?.role === 'SUPER_ADMIN' && tab === 'tenants',
  });

  const { data: subs, isLoading: loadingSubs } = useQuery({
    queryKey: ['owner-subscriptions'],
    queryFn: () => ownerApi.subscriptions(),
    enabled: user?.role === 'SUPER_ADMIN' && tab === 'subscriptions',
  });

  const { data: signups, isLoading: loadingSignups } = useQuery({
    queryKey: ['owner-signups', days],
    queryFn: () => ownerApi.signups(days),
    enabled: user?.role === 'SUPER_ADMIN' && tab === 'signups',
  });

  const { data: aiStats, isLoading: loadingAi } = useQuery({
    queryKey: ['owner-ai', days],
    queryFn: () => ownerApi.aiUsage(days),
    enabled: user?.role === 'SUPER_ADMIN' && tab === 'ai',
  });

  if (!user || user.role !== 'SUPER_ADMIN') {
    return <div className="flex items-center justify-center h-64 text-gray-400">Access denied</div>;
  }

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'tenants', label: 'All Tenants' },
    { key: 'subscriptions', label: 'Subscriptions' },
    { key: 'signups', label: 'Recent Signups' },
    { key: 'ai', label: 'AI Usage' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            🔐 Owner Control Panel
          </h1>
          <p className="text-gray-500 mt-1">Platform-wide visibility — SUPER_ADMIN only</p>
        </div>
        <button
          onClick={() => refetchOverview()}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview ─────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {loadingOverview ? (
            <div className="text-center text-gray-400 py-12">Loading platform stats…</div>
          ) : overview ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Tenants" value={overview.tenants.total} sub={`${overview.tenants.active} active`} color="bg-blue-500" icon={Building2} />
                <StatCard label="New (30 days)" value={overview.tenants.newLast30Days} sub={`${overview.tenants.newToday} today`} color="bg-green-500" icon={UserPlus} />
                <StatCard label="Total Users" value={overview.users.total} color="bg-purple-500" icon={Users} />
                <StatCard label="AI Calls (30d)" value={overview.ai.callsLast30Days} sub={`${overview.ai.totalCalls} total`} color="bg-orange-500" icon={Zap} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Candidates" value={overview.data.candidates} color="bg-indigo-500" icon={Users} />
                <StatCard label="Total Leads" value={overview.data.leads} color="bg-pink-500" icon={TrendingUp} />
                <StatCard label="Total Jobs" value={overview.data.jobs} color="bg-teal-500" icon={BarChart3} />
                <StatCard
                  label="Subscriptions"
                  value={overview.subscriptions.active + overview.subscriptions.trialing}
                  sub={`${overview.subscriptions.active} active · ${overview.subscriptions.trialing} trialing`}
                  color="bg-yellow-500"
                  icon={CreditCard}
                />
              </div>

              {/* Quick notification setup reminder */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <strong>Telegram alerts:</strong> To receive signup/payment notifications on Telegram, set
                  <code className="bg-amber-100 px-1 mx-1 rounded text-xs">OWNER_TELEGRAM_BOT_TOKEN</code> and
                  <code className="bg-amber-100 px-1 mx-1 rounded text-xs">OWNER_TELEGRAM_CHAT_ID</code> in
                  your server <code className="bg-amber-100 px-1 rounded text-xs">.env</code> file, then restart backend.
                  Message your bot first to get your Chat ID:{' '}
                  <strong>send any message to your bot → check
                  {' '}https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</strong>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── All Tenants ──────────────────────────────────────────── */}
      {tab === 'tenants' && (
        <div className="space-y-4">
          <input
            className="input max-w-sm"
            placeholder="Search tenants…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Tenant', 'Plan', 'Subscription', 'Users', 'Candidates', 'Leads', 'Joined'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loadingTenants ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
                ) : tenants?.data?.map((t: any) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{t.name}</div>
                      <div className="text-xs text-gray-400">{t.slug}</div>
                    </td>
                    <td className="px-4 py-3"><span className="badge-blue">{t.plan}</span></td>
                    <td className="px-4 py-3">
                      {t.subscription ? (
                        <div>
                          <span className={STATUS_COLOR[t.subscription.status] ?? 'badge-gray'}>{t.subscription.status}</span>
                          <div className="text-xs text-gray-400">{t.subscription.planName}</div>
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{t.users}</td>
                    <td className="px-4 py-3 text-gray-600">{t.candidates}</td>
                    <td className="px-4 py-3 text-gray-600">{t.leads}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Subscriptions ────────────────────────────────────────── */}
      {tab === 'subscriptions' && (
        <div className="space-y-4">
          {loadingSubs ? (
            <div className="text-center text-gray-400 py-8">Loading…</div>
          ) : subs ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(subs.statusBreakdown as Record<string, number>).map(([status, count]) => (
                  <div key={status} className="card text-center">
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-sm text-gray-500">{status}</div>
                  </div>
                ))}
              </div>
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Tenant', 'Plan', 'Status', 'Billing', 'Trial Ends', 'Period End', 'Created'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {subs.list?.map((s: any) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{s.tenantName}</div>
                          <div className="text-xs text-gray-400">{s.tenantId.slice(0,8)}…</div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{s.planName}</td>
                        <td className="px-4 py-3"><span className={STATUS_COLOR[s.status] ?? 'badge-gray'}>{s.status}</span></td>
                        <td className="px-4 py-3 text-gray-500">{s.billingCycle}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {s.trialEndsAt ? new Date(s.trialEndsAt).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(s.createdAt).toLocaleDateString('en-GB')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── Recent Signups ────────────────────────────────────────── */}
      {tab === 'signups' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Show last</span>
            {[7, 14, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded-lg text-sm ${days === d ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {d}d
              </button>
            ))}
          </div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Company', 'Admin Email', 'Plan', 'Subscription', 'Joined'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loadingSignups ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
                ) : signups?.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No signups in last {days} days</td></tr>
                ) : signups?.map((s: any) => (
                  <tr key={s.tenantId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{s.tenantName}</div>
                      <div className="text-xs text-gray-400">{s.tenantId.slice(0,8)}…</div>
                    </td>
                    <td className="px-4 py-3">
                      {s.admin ? (
                        <div>
                          <div className="text-gray-900">{s.admin.firstName} {s.admin.lastName}</div>
                          <div className="text-xs text-gray-400">{s.admin.email}</div>
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3"><span className="badge-blue">{s.plan}</span></td>
                    <td className="px-4 py-3">
                      {s.subscription ? (
                        <span className={STATUS_COLOR[s.subscription.status] ?? 'badge-gray'}>{s.subscription.status}</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(s.createdAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── AI Usage ──────────────────────────────────────────────── */}
      {tab === 'ai' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Show last</span>
            {[7, 14, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded-lg text-sm ${days === d ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {d}d
              </button>
            ))}
          </div>
          {loadingAi ? (
            <div className="text-center text-gray-400 py-8">Loading…</div>
          ) : aiStats ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="card text-center">
                  <div className="text-2xl font-bold text-gray-900">{aiStats.totalCalls}</div>
                  <div className="text-sm text-gray-500">AI Calls</div>
                </div>
                <div className="card text-center">
                  <div className="text-2xl font-bold text-gray-900">{aiStats.totalTokens?.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Tokens Used</div>
                </div>
              </div>
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">By Action Type</h3>
                <div className="space-y-2">
                  {Object.entries(aiStats.byAction as Record<string, number>)
                    .sort((a, b) => b[1] - a[1])
                    .map(([action, count]) => (
                      <div key={action} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 font-mono text-xs">{action}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-24 bg-gray-100 rounded-full h-1.5">
                            <div
                              className="bg-brand-500 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, (count / aiStats.totalCalls) * 100)}%` }}
                            />
                          </div>
                          <span className="text-gray-900 font-medium w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
