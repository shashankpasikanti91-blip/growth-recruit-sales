'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingApi } from '@/lib/api-client';
import { Check, CreditCard, TrendingUp, Zap, Users, Target, AlertCircle, ChevronRight } from 'lucide-react';
import { formatDistanceToNow, format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import Link from 'next/link';

const PLAN_COLORS: Record<string, string> = {
  STARTER: 'bg-gray-100 text-gray-700',
  GROWTH: 'bg-blue-100 text-blue-700',
  PROFESSIONAL: 'bg-brand-100 text-brand-700',
  ENTERPRISE: 'bg-purple-100 text-purple-700',
};

function UsageMeter({ label, used, limit, icon: Icon, color }: any) {
  const isUnlimited = limit === -1 || limit >= 999999;
  const hasNoLimit = !isUnlimited && (limit == null || limit === 0);
  const pct = isUnlimited || hasNoLimit ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const isWarning = !hasNoLimit && pct >= 80;
  const isCritical = !hasNoLimit && pct >= 95;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className="text-xs text-gray-400">
          {isUnlimited ? `${used.toLocaleString()} / ∞` : hasNoLimit ? `${used.toLocaleString()} / —` : `${used.toLocaleString()} / ${limit.toLocaleString()}`}
        </span>
      </div>
      {!isUnlimited && !hasNoLimit && (
        <>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-brand-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className={`text-xs font-medium ${isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-gray-400'}`}>
              {pct}% used
            </span>
            {isWarning && (
              <span className="flex items-center gap-1 text-xs text-amber-500">
                <AlertCircle className="w-3 h-3" /> {isCritical ? 'Almost full' : 'Getting close'}
              </span>
            )}
          </div>
        </>
      )}
      {isUnlimited && <div className="text-xs text-emerald-500 font-medium mt-1">Unlimited</div>}
      {hasNoLimit && <div className="text-xs text-gray-400 font-medium mt-1">No active plan</div>}
    </div>
  );
}

export default function BillingPage() {
  const queryClient = useQueryClient();
  const [cycle, setCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');

  const { data: plans } = useQuery({ queryKey: ['billing-plans'], queryFn: billingApi.plans });
  const { data: sub } = useQuery({ queryKey: ['billing-subscription'], queryFn: billingApi.subscription });
  const { data: usage } = useQuery({ queryKey: ['billing-usage'], queryFn: billingApi.usage });
  const { data: invoicesData } = useQuery({ queryKey: ['billing-invoices'], queryFn: () => billingApi.invoices(1) });

  const changePlanMutation = useMutation({
    mutationFn: ({ planId, billingCycle }: { planId: string; billingCycle: 'MONTHLY' | 'ANNUAL' }) =>
      billingApi.changePlan(planId, billingCycle),
    onSuccess: () => {
      toast.success('Plan updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['billing-subscription'] });
    },
    onError: () => toast.error('Failed to update plan'),
  });

  const currentPlanId = sub?.subscription?.planId;
  const trialEnd = sub?.subscription?.trialEndsAt ? new Date(sub.subscription.trialEndsAt) : null;
  const trialDaysLeft = trialEnd ? differenceInDays(trialEnd, new Date()) : null;
  const isTrialing = sub?.subscription?.status === 'TRIALING';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-brand-600" /> Billing & Subscription
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage your plan, usage, and payment history</p>
        </div>
        <Link href="/pricing" className="text-sm text-brand-600 font-medium hover:underline flex items-center gap-1">
          View all plans <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Trial banner */}
      {isTrialing && trialDaysLeft !== null && (
        <div className={`rounded-xl p-4 border flex items-center justify-between ${trialDaysLeft <= 3 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-3">
            <AlertCircle className={`w-5 h-5 ${trialDaysLeft <= 3 ? 'text-red-500' : 'text-amber-500'}`} />
            <div>
              <p className={`text-sm font-semibold ${trialDaysLeft <= 3 ? 'text-red-700' : 'text-amber-700'}`}>
                {trialDaysLeft <= 0 ? 'Trial expired' : `${trialDaysLeft} days left in your trial`}
              </p>
              <p className="text-xs text-gray-500">Upgrade now to keep full access to all features</p>
            </div>
          </div>
          <button className="text-xs bg-brand-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors">
            Upgrade now
          </button>
        </div>
      )}

      {/* Current subscription card */}
      {sub?.subscription && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${PLAN_COLORS[sub.subscription.plan?.tier] ?? 'bg-gray-100 text-gray-600'}`}>
                  {sub.subscription.plan?.name ?? 'Unknown Plan'}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sub.subscription.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : sub.subscription.status === 'TRIALING' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                  {sub.subscription.status}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {sub.subscription.billingCycle === 'ANNUAL' ? 'Annual billing' : 'Monthly billing'}
                {sub.subscription.currentPeriodEnd && (
                  <> · Renews {format(new Date(sub.subscription.currentPeriodEnd), 'MMM d, yyyy')}</>
                )}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {sub.subscription.plan?.tier === 'ENTERPRISE' ? (
                  <span className="text-brand-700">Custom</span>
                ) : (cycle === 'ANNUAL' ? sub.subscription.plan?.annualPrice : sub.subscription.plan?.monthlyPrice) === 0 ? (
                  <span>Free</span>
                ) : (
                  <>${cycle === 'ANNUAL' ? sub.subscription.plan?.annualPrice : sub.subscription.plan?.monthlyPrice}<span className="text-sm text-gray-400 font-normal">/{cycle === 'ANNUAL' ? 'yr' : 'mo'}</span></>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage meters */}
      {usage && (
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Current Usage</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <UsageMeter label="Candidates" used={usage.candidates?.used ?? 0} limit={usage.candidates?.limit ?? 0} icon={Users} color="bg-blue-100 text-blue-600" />
            <UsageMeter label="Leads" used={usage.leads?.used ?? 0} limit={usage.leads?.limit ?? 0} icon={Target} color="bg-purple-100 text-purple-600" />
            <UsageMeter label="AI Calls" used={usage.aiCalls?.used ?? 0} limit={usage.aiCalls?.limit ?? 0} icon={Zap} color="bg-amber-100 text-amber-600" />
            <UsageMeter label="Imports" used={usage.imports?.used ?? 0} limit={usage.imports?.limit ?? 0} icon={TrendingUp} color="bg-green-100 text-green-600" />
          </div>
        </div>
      )}

      {/* Plan upgrade cards */}
      {plans && plans.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Available Plans</h2>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              {(['MONTHLY', 'ANNUAL'] as const).map(c => (
                <button key={c} onClick={() => setCycle(c)}
                  className={`px-3 py-1.5 font-medium transition-colors ${cycle === c ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  {c === 'ANNUAL' ? 'Annual (save 20%)' : 'Monthly'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            {plans.map((plan: any) => {
              const isCurrent = plan.id === currentPlanId;
              const price = cycle === 'ANNUAL' ? plan.annualPrice : plan.monthlyPrice;
              return (
                <div key={plan.id} className={`rounded-xl border-2 p-4 bg-white flex flex-col ${isCurrent ? 'border-brand-500 ring-1 ring-brand-300' : 'border-gray-200'}`}>
                  {isCurrent && <div className="text-xs font-bold text-brand-600 mb-1">Current Plan</div>}
                  <div className="font-bold text-gray-900 text-sm mb-0.5">{plan.name}</div>
                  <div className="text-xl font-extrabold text-gray-900 mb-4">
                    {plan.tier === 'ENTERPRISE' ? (
                      <span className="text-brand-700">Custom</span>
                    ) : price === 0 ? (
                      <span>Free</span>
                    ) : (
                      <>${price}<span className="text-xs text-gray-400 font-normal">/{cycle === 'ANNUAL' ? 'yr' : 'mo'}</span></>
                    )}
                  </div>
                  <ul className="space-y-1.5 mb-4 flex-1">
                    {(plan.features ?? []).slice(0, 4).map((f: string) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
                        <Check className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" /> {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    disabled={isCurrent || changePlanMutation.isPending}
                    onClick={() => changePlanMutation.mutate({ planId: plan.id, billingCycle: cycle })}
                    className={`text-xs py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 ${isCurrent ? 'bg-gray-100 text-gray-400 cursor-default' : 'bg-brand-600 text-white hover:bg-brand-700'}`}
                  >
                    {isCurrent ? 'Current' : 'Switch to this plan'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invoice history */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Invoice History</h2>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Invoice #', 'Date', 'Amount', 'Status'].map(h => (
                  <th key={h} className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!invoicesData?.invoices?.length ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400 text-sm">No invoices yet</td></tr>
              ) : invoicesData.invoices.map((inv: any) => (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-xs text-gray-600">{inv.invoiceNumber}</td>
                  <td className="py-3 px-4 text-gray-600">{inv.createdAt ? format(new Date(inv.createdAt), 'MMM d, yyyy') : '—'}</td>
                  <td className="py-3 px-4 font-semibold text-gray-900">${inv.total} {inv.currency}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inv.status === 'PAID' ? 'bg-green-100 text-green-700' : inv.status === 'OPEN' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
