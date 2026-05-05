'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Target,
  Handshake,
  Building2,
  Phone,
  TrendingUp,
  LayoutGrid,
  ExternalLink,
  CalendarClock,
  Mail,
  ScrollText,
  Sparkles,
} from 'lucide-react';

type SalesTab =
  | 'overview'
  | 'leads'
  | 'generate'
  | 'clients'
  | 'companies'
  | 'contacts'
  | 'pipeline'
  | 'followups'
  | 'outreach'
  | 'proposals';

const LINKS: { id: SalesTab; label: string; sub: string; href: string; icon: typeof Target }[] = [
  { id: 'leads', label: 'Leads', sub: 'ICP pipeline, scoring, sources', href: '/leads', icon: Target },
  { id: 'generate', label: 'Generate Leads', sub: 'AI + source based generation', href: '/leads/generate', icon: Sparkles },
  { id: 'companies', label: 'Companies', sub: 'Organisation master', href: '/companies', icon: Building2 },
  { id: 'clients', label: 'Clients', sub: 'Accounts, JDs, submissions', href: '/clients', icon: Handshake },
  { id: 'contacts', label: 'Contacts', sub: 'People & roles', href: '/contacts', icon: Phone },
  { id: 'pipeline', label: 'Opportunities', sub: 'Deal stages & value', href: '/opportunities', icon: TrendingUp },
  { id: 'followups', label: 'Follow Ups', sub: 'Calls, reminders, touchpoints', href: '/follow-ups', icon: CalendarClock },
  { id: 'outreach', label: 'Outreach', sub: 'Multi-channel sequence control', href: '/outreach', icon: Mail },
  { id: 'proposals', label: 'Proposals', sub: 'Commercial documents and stages', href: '/proposals', icon: ScrollText },
];

function SalesDeskContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = (searchParams.get('tab') as SalesTab | null) || 'overview';
  const [tab, setTab] = useState<SalesTab>(
    ['overview', 'leads', 'generate', 'clients', 'companies', 'contacts', 'pipeline', 'followups', 'outreach', 'proposals'].includes(tabParam)
      ? tabParam
      : 'overview',
  );

  useEffect(() => {
    const t = searchParams.get('tab') as SalesTab | null;
    if (t && ['overview', 'leads', 'generate', 'clients', 'companies', 'contacts', 'pipeline', 'followups', 'outreach', 'proposals'].includes(t)) {
      setTab(t);
    }
  }, [searchParams]);

  const setSalesTab = (t: SalesTab) => {
    setTab(t);
    const p = new URLSearchParams(searchParams.toString());
    p.set('tab', t);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  return (
    <div className="max-w-none -mx-2 sm:-mx-4 lg:-mx-6 px-1 sm:px-2 min-w-0">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center shadow-sm shrink-0">
            <LayoutGrid className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales desk</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Same structured layout as recruitment: clear sections, dense registers, and calm spacing. Open any module below — all existing screens and actions are unchanged.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <nav className="w-full lg:w-56 shrink-0 rounded-xl border border-slate-200 bg-white p-2 shadow-sm space-y-1">
          <button
            type="button"
            onClick={() => setSalesTab('overview')}
            className={
              'w-full text-left rounded-lg px-3 py-2.5 flex gap-3 transition-colors border ' +
              (tab === 'overview'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-slate-50/80 text-slate-700 border-transparent hover:border-slate-200 hover:bg-white')
            }
          >
            <LayoutGrid className={'w-5 h-5 shrink-0 mt-0.5 ' + (tab === 'overview' ? 'text-white' : 'text-slate-400')} />
            <span>
              <span className="block text-sm font-semibold">Overview</span>
              <span className={'block text-[11px] mt-0.5 ' + (tab === 'overview' ? 'text-blue-100' : 'text-slate-500')}>
                Quick map of CRM areas
              </span>
            </span>
          </button>
          {LINKS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSalesTab(item.id)}
                className={
                  'w-full text-left rounded-lg px-3 py-2.5 flex gap-3 transition-colors border ' +
                  (active
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50/80 text-slate-700 border-transparent hover:border-slate-200 hover:bg-white')
                }
              >
                <Icon className={'w-5 h-5 shrink-0 mt-0.5 ' + (active ? 'text-white' : 'text-slate-400')} />
                <span>
                  <span className={'block text-sm font-semibold ' + (active ? '' : 'text-slate-900')}>{item.label}</span>
                  <span className={'block text-[11px] mt-0.5 leading-snug ' + (active ? 'text-blue-100' : 'text-slate-500')}>
                    {item.sub}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="flex-1 min-w-0 w-full space-y-4">
          {tab === 'overview' && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">How to use this desk</h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Pick a module on the left. Each link opens the full-featured page (filters, mutations, exports) with updated layout: section headers, register-style tables, and consistent scroll behaviour.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600 list-disc pl-5">
                <li>Leads — pipeline chips, ICP scoring, inline stage updates</li>
                <li>Clients — account grid with JD and submission counts</li>
                <li>Companies & contacts — organisation and people masters</li>
                <li>Opportunities — weighted pipeline and deal register</li>
                <li>Follow-ups, outreach, and proposals — execution and commercial flow</li>
              </ul>
            </div>
          )}

          {tab !== 'overview' && (
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm">
              <p className="text-sm text-slate-600 mb-4">
                You are viewing <span className="font-semibold text-slate-800">{LINKS.find((l) => l.id === tab)?.label ?? tab}</span> in the navigator. Open the live workspace in one click — data and behaviour are identical to before.
              </p>
              <Link
                href={LINKS.find((l) => l.id === tab)?.href ?? '/leads'}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                Open {LINKS.find((l) => l.id === tab)?.label ?? 'module'}
                <ExternalLink className="w-4 h-4 opacity-90" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SalesDeskPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500 text-sm">Loading…</div>}>
      <SalesDeskContent />
    </Suspense>
  );
}
