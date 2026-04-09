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
  Zap,
  CreditCard,
  Globe,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  GitBranch,
  Plug,
  AlertTriangle,
  UserCog,
  BookOpen,
  Target,
  Phone,
  Sparkles,
  FileText,
  Shield,
  Lock,
} from 'lucide-react';
import { clsx } from 'clsx';

type NavItem = { label: string; href: string; icon: React.ElementType };
type NavGroup = { label: string; items: NavItem[] };
type NavSection = NavItem | { group: string; items: NavItem[] };

const ADMIN_ROLES = ['SUPER_ADMIN', 'TENANT_ADMIN'];

const navConfig = (role: string) => {
  const isAdmin = ADMIN_ROLES.includes(role);
  const isSuperAdmin = role === 'SUPER_ADMIN';

  return [
    {
      item: { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    },
    {
      group: 'Recruitment',
      items: [
        { label: 'Candidates', href: '/candidates', icon: UserPlus },
        { label: 'Jobs', href: '/jobs', icon: Briefcase },
        { label: 'Applications', href: '/applications', icon: ClipboardList },
        { label: 'Candidate Match Analysis', href: '/ai/screen', icon: Sparkles },
      ],
    },
    {
      group: 'Sales',
      items: [
        { label: 'Leads', href: '/leads', icon: Target },
        { label: 'Generate Leads', href: '/leads/generate', icon: Sparkles },
        { label: 'Companies', href: '/companies', icon: Building2 },
        { label: 'Contacts', href: '/contacts', icon: Phone },
        { label: 'Outreach', href: '/outreach', icon: Mail },
      ],
    },
    {
      group: 'Operations',
      items: [
        { label: 'Documents', href: '/documents', icon: FileText },
        { label: 'Imports', href: '/imports', icon: Upload },
        { label: 'Workflows', href: '/workflows', icon: GitBranch },
        { label: 'Integrations', href: '/integrations', icon: Plug },
      ],
    },
    {
      item: { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    },
    {
      group: 'Settings',
      items: [
        ...(isAdmin ? [{ label: 'Audit Logs', href: '/audit', icon: Shield }] : []),
        ...(isAdmin ? [{ label: 'Billing', href: '/billing', icon: CreditCard }] : []),
        { label: 'Settings', href: '/settings', icon: Settings },
        ...(isAdmin ? [{ label: 'Users & Roles', href: '/users', icon: UserCog }] : []),
        { label: 'Visa Guide', href: '/visa-guide', icon: Globe },
      ],
    },
    ...(isSuperAdmin ? [{
      group: 'Owner',
      items: [{ label: 'Owner Control Panel', href: '/owner', icon: Lock }],
    }] : []),
  ];
};

function NavLink({ href, icon: Icon, label, active }: { href: string; icon: React.ElementType; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={clsx(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        active
          ? 'bg-brand-600 text-white'
          : 'text-brand-200 hover:bg-brand-800 hover:text-white',
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
        className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-brand-400 uppercase tracking-wider hover:text-brand-200 transition-colors"
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
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-brand-900 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-brand-700">
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-white font-bold text-sm">SRP AI Labs</div>
          <div className="text-brand-300 text-xs truncate max-w-[140px]">{user?.email}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
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
      <div className="px-3 py-4 border-t border-brand-700">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">{user?.firstName} {user?.lastName}</div>
            <div className="text-brand-300 text-xs">{user?.role}</div>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 w-full px-3 py-2 text-brand-200 hover:bg-brand-800 hover:text-white rounded-lg text-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
