'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Tag,
} from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Candidates', href: '/candidates', icon: UserPlus },
  { label: 'Jobs', href: '/jobs', icon: Briefcase },
  { label: 'Leads', href: '/leads', icon: Users },
  { label: 'Companies', href: '/companies', icon: Building2 },
  { label: 'Imports', href: '/imports', icon: Upload },
  { label: 'Outreach', href: '/outreach', icon: Mail },
  { label: 'AI Screen', href: '/ai/screen', icon: Zap },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Billing', href: '/billing', icon: CreditCard },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-brand-900 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-brand-700">
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-white font-bold text-sm">RecruiSales AI</div>
          <div className="text-brand-300 text-xs truncate max-w-[140px]">{user?.email}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
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
