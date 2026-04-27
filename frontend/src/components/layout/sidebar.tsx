'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  UserPlus,
  Upload,
  Mail,
  BarChart3,
  Settings,
  LogOut,
  Building2,
  TrendingUp,
  CreditCard,
  Globe,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  GitBranch,
  Plug,
  UserCog,
  Target,
  Phone,
  Sparkles,
  FileText,
  Shield,
  Lock,
  ExternalLink,
  Handshake,
  CalendarClock,
  SendHorizonal,
  ScrollText,
  DollarSign,
} from 'lucide-react';
import { clsx } from 'clsx';

type NavItem = { label: string; href: string; icon: React.ElementType };

const ADMIN_ROLES = ['SUPER_ADMIN', 'TENANT_ADMIN'];

const navConfig = (role: string) => {
  const isAdmin = ADMIN_ROLES.includes(role);
  const isSuperAdmin = role === 'SUPER_ADMIN';

  return [
    {
      item: { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    },
    // ── SALES CRM ────────────────────────────────────────────────────────────
    {
      group: 'Sales CRM',
      items: [
        { label: 'Leads',           href: '/leads',          icon: Target },
        { label: 'Generate Leads',  href: '/leads/generate', icon: Sparkles },
        { label: 'Companies',       href: '/companies',       icon: Building2 },
        { label: 'Clients',         href: '/clients',         icon: Handshake },
        { label: 'Contacts',        href: '/contacts',        icon: Phone },
        { label: 'Opportunities',   href: '/opportunities',   icon: TrendingUp },
        { label: 'Follow Ups',      href: '/follow-ups',      icon: CalendarClock },
        { label: 'Outreach',        href: '/outreach',        icon: Mail },
        { label: 'Proposals',       href: '/proposals',       icon: ScrollText },
        ...(isAdmin ? [{ label: 'Billing', href: '/billing', icon: DollarSign }] : []),
      ],
    },
    // ── RECRUITMENT ──────────────────────────────────────────────────────────
    {
      group: 'Recruitment',
      items: [
        { label: 'Candidates',        href: '/candidates',    icon: UserPlus },
        { label: 'Jobs / JDs',        href: '/jobs',          icon: Briefcase },
        { label: 'Applications',      href: '/applications',  icon: ClipboardList },
        { label: 'Submissions',       href: '/submissions',   icon: SendHorizonal },
        { label: 'AI Match Analysis', href: '/ai/screen',     icon: Sparkles },
      ],
    },
    // ── OPERATIONS ───────────────────────────────────────────────────────────
    {
      group: 'Operations',
      items: [
        { label: 'Analytics',    href: '/analytics',    icon: BarChart3 },
        { label: 'Documents',    href: '/documents',    icon: FileText },
        { label: 'Imports',      href: '/imports',      icon: Upload },
        { label: 'Workflows',    href: '/workflows',    icon: GitBranch },
        { label: 'Integrations', href: '/integrations', icon: Plug },
      ],
    },
    // ── SETTINGS ─────────────────────────────────────────────────────────────
    {
      group: 'Settings',
      items: [
        ...(isAdmin ? [{ label: 'Users & Roles', href: '/users',    icon: UserCog }] : []),
        ...(isAdmin ? [{ label: 'Audit Logs',    href: '/audit',    icon: Shield }] : []),
        { label: 'Settings',   href: '/settings',   icon: Settings },
        { label: 'Visa Guide', href: '/visa-guide', icon: Globe },
      ],
    },
    ...(isSuperAdmin
      ? [{ group: 'Owner', items: [{ label: 'Owner Control Panel', href: '/owner', icon: Lock }] }]
      : []),
  ];
};

function NavLink({ href, icon: Icon, label, active }: { href: string; icon: React.ElementType; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={clsx(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
        active
          ? 'bg-[#1d4ed8]/80 text-white shadow-sm border-l-2 border-[#60a5fa]'
          : 'text-slate-300 hover:bg-white/[0.06] hover:text-white',
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </Link>
  );
}

function NavGroupSection({ group, items, pathname, defaultOpen = true }: { group: string; items: NavItem[]; pathname: string; defaultOpen?: boolean }) {
  const isGroupActive = items.some(
    (i) => pathname === i.href || (i.href !== '/dashboard' && pathname.startsWith(i.href.split('?')[0])),
  );
  const [open, setOpen] = useState(defaultOpen || isGroupActive);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full px-3 py-2 text-[11px] font-extrabold text-slate-200 uppercase tracking-widest hover:text-white transition-colors border-l-2 border-blue-500 mb-0.5"
      >
        {group}
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {items.map(({ label, href, icon }) => {
            const basePath = href.split('?')[0];
            const active = pathname === basePath || (basePath !== '/dashboard' && pathname.startsWith(basePath));
            return <NavLink key={href} href={href} icon={icon} label={label} active={active} />;
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const sections = navConfig(user?.role ?? '');

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #0f1b2d 60%, #0a1628 100%)' }}>
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/[0.07]">
        {/* Product header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}>
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-white font-bold text-sm leading-tight tracking-tight">SRP AI Growth</div>
            <div className="text-[10px] font-medium text-blue-400 flex items-center gap-1">
              Powered by SRP AI Labs
            </div>
          </div>
        </div>
        {/* Parent badge */}
        <a
          href="https://srpailabs.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 w-full px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.08] transition-colors group"
        >
          <div className="w-4 h-4 rounded flex items-center justify-center bg-blue-600/60 flex-shrink-0">
            <TrendingUp className="w-2.5 h-2.5 text-white" />
          </div>
          <span className="text-[10px] text-slate-400 font-medium group-hover:text-slate-300 truncate flex-1">srpailabs.com</span>
          <ExternalLink className="w-2.5 h-2.5 text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
        </a>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {sections.map((section, idx) => {
          if ('item' in section && section.item) {
            const { label, href, icon } = section.item;
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return <NavLink key={href} href={href} icon={icon} label={label} active={active} />;
          }
          if ('group' in section) {
            return (
              <NavGroupSection
                key={section.group}
                group={section.group}
                items={section.items}
                pathname={pathname}
                defaultOpen={idx < 3}
              />
            );
          }
          return null;
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/[0.07]">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)' }}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-medium truncate">{user?.firstName} {user?.lastName}</div>
            <div className="text-slate-400 text-[10px] truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 w-full px-3 py-2 text-slate-400 hover:bg-white/[0.06] hover:text-white rounded-lg text-xs transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
