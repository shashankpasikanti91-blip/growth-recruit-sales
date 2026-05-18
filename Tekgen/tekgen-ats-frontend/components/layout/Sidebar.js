'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getUser, clearAuth } from '../../lib/auth';
import {
  LayoutDashboard, Users, Briefcase, ScanSearch, BarChart3, Mail,
  Plug, Shield, Settings, LogOut, ChevronLeft, ChevronRight,
  ClipboardList, CalendarCheck, TrendingUp, Menu, Activity,
  UserCheck, DollarSign, Plane, FileText, ShoppingCart,
  CreditCard, BarChart2, ChevronDown, ChevronUp, Bell, Target,
  CheckSquare, UserPlus, BookOpen,   Building2, CheckCircle2, Upload, PlusCircle, Table2,
} from 'lucide-react';

// ─── Full HRMS module navigation ─────────────────────────────────────────────
const MODULES = [
  {
    group: 'Platform',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Operations Hub', exact: true },
    ],
  },
  {
    group: 'Recruitment',
    moduleIcon: Briefcase,
    color: 'text-blue-400',
    items: [
      { href: '/jobs',        icon: Briefcase,    label: 'Job Openings'   },
      { href: '/jobs/bulk-import', icon: Table2,  label: 'Bulk hiring (Excel)', hideForRoles: ['RECRUITER'] },
      { href: '/clients',     icon: Building2,    label: 'Clients', hideForRoles: ['RECRUITER'] },
      { href: '/candidates',  icon: Users,         label: 'Candidates'     },
      { href: '/screening',   icon: ScanSearch,    label: 'AI Screening'   },
      { href: '/interviews',  icon: CalendarCheck, label: 'Interviews'     },
      { href: '/selections',  icon: CheckSquare,   label: 'Selections'     },
      { href: '/onboard',     icon: UserPlus,      label: 'Onboarding'     },
      { href: '/followups',   icon: ClipboardList, label: 'Follow-ups', badge: 'hot' },
      { href: '/emails',      icon: Mail,          label: 'Email Templates'},
    ],
  },
  {
    group: 'Sales CRM',
    moduleIcon: ShoppingCart,
    color: 'text-emerald-400',
    items: [
      { href: '/sales',          icon: ShoppingCart, label: 'Sales Dashboard'},
      { href: '/sales/requirements', icon: ClipboardList, label: 'Client requirements'},
      { href: '/sales/clients',  icon: Building2,    label: 'Clients'       },
      { href: '/sales/leads',    icon: Users,         label: 'Leads'         },
      { href: '/sales/pipeline', icon: TrendingUp,    label: 'Pipeline'      },
    ],
  },
  {
    group: 'HR Operations',
    moduleIcon: UserCheck,
    color: 'text-violet-400',
    items: [
      { href: '/hr',             icon: UserCheck,     label: 'HR Dashboard'    },
      { href: '/hr/employees',   icon: Users,         label: 'Employees'       },
      { href: '/hr/import',      icon: Upload,        label: 'Bulk import'       },
      { href: '/visa',           icon: Plane,         label: 'Visa desk'       },
      { href: '/visa/cases',     icon: FileText,      label: 'Visa cases'      },
      { href: '/visa/cases/new', icon: PlusCircle,    label: 'New visa case'   },
      { href: '/visa/employees', icon: Users,         label: 'Employee passes' },
      { href: '/visa/renewals',  icon: Bell,          label: 'Renewals due'    },
      { href: '/visa/compliance', icon: Shield,       label: 'Visa compliance' },
      { href: '/hr/leave', icon: CalendarCheck, label: 'Leave Management'},
      { href: '/hr/attendance',  icon: ClipboardList, label: 'Attendance'      },
      { href: '/hr/holidays',  icon: CalendarCheck, label: 'Holiday Calendar'      },
      { href: '/hr/onboarding',  icon: UserCheck, label: 'Onboarding'      },
      { href: '/hr/offboarding',  icon: Settings, label: 'Offboarding'      },
    ],
  },
  {
    group: 'Payroll',
    moduleIcon: DollarSign,
    color: 'text-amber-400',
    items: [
      { href: '/payroll/admin-dashboard', icon: DollarSign, label: 'Payroll Dashboard' },
      { href: '/payroll/runs',            icon: CreditCard, label: 'Payroll Runs' },
      { href: '/payroll/salary-structures', icon: BarChart3, label: 'Salary Structures' },
      { href: '/payroll/staff',           icon: Users, label: 'Staff & Attendance' },
      { href: '/payroll/claims',          icon: FileText, label: 'Claims & Reimbursements' },
      {
        href: '/workspace/approval-queue',
        icon: CheckCircle2,
        label: 'Leave & claim approvals',
        showForRoles: ['HR_ADMIN', 'PAYROLL_ADMIN'],
      },
      { href: '/payroll/approvals',       icon: CheckCircle2, label: 'Approvals Queue' },
      { href: '/payroll/bank',            icon: CreditCard, label: 'Bank Transfer File' },
      { href: '/payroll/dashboard',       icon: Activity, label: 'Leadership Monitoring' },
    ],
  },
  {
    group: 'Finance',
    moduleIcon: CreditCard,
    color: 'text-rose-400',
    items: [
      { href: '/finance',          icon: CreditCard, label: 'Finance Overview'},
      { href: '/finance/invoices', icon: FileText,   label: 'Invoices'        },
    ],
  },
  {
    group: 'Performance',
    moduleIcon: Target,
    color: 'text-cyan-400',
    items: [
      { href: '/performance', icon: Target, label: 'Team Performance' },
      {
        href: '/workspace/approval-queue',
        icon: CheckCircle2,
        label: 'Approval Queue',
        showForRoles: ['RECRUITMENT_MANAGER', 'SALES_MANAGER', 'FINANCE_HEAD', 'MANAGEMENT', 'ASSISTANT_MANAGER', 'CLIENT_APPROVER'],
      },
    ],
  },
  {
    group: 'Executive',
    moduleIcon: Activity,
    color: 'text-sky-400',
    items: [
      {
        href: '/executive/pending-center',
        icon: Activity,
        label: 'Executive Pending',
        showForRoles: ['MANAGEMENT', 'ASSISTANT_MANAGER', 'ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'HEAD', 'MD', 'MANAGING_DIRECTOR', 'DEPT_HEAD', 'DEPARTMENT_HEAD', 'COMPANY_HEAD'],
      },
    ],
  },
  {
    group: 'Analytics',
    moduleIcon: BarChart2,
    color: 'text-indigo-400',
    items: [
      { href: '/analytics', icon: BarChart3, label: 'Analytics & KPIs' },
    ],
  },
  {
    group: 'Documents',
    moduleIcon: FileText,
    color: 'text-slate-400',
    items: [
      { href: '/documents', icon: FileText, label: 'Document Vault'},
    ],
  },
];

// Global items (restricted to leadership/admin ops)
const GLOBAL_ITEMS = [
  { href: '/integrations', icon: Plug, label: 'Integrations' },
];

// My Workspace — visible to every logged-in user
const MY_WORKSPACE_ITEMS = [
  { href: '/workspace',            icon: LayoutDashboard, label: 'My Dashboard', exact: true },
  { href: '/workspace/profile',    icon: UserCheck,       label: 'My Profile'    },
  { href: '/workspace/leave',      icon: CalendarCheck,   label: 'My Leave'      },
  { href: '/workspace/attendance', icon: ClipboardList,   label: 'My Attendance' },
  { href: '/workspace/payslips',   icon: FileText,        label: 'My Payslips'   },
  { href: '/workspace/statutory-forms', icon: FileText,   label: 'My Statutory Forms' },
  { href: '/workspace/documents',  icon: FileText,        label: 'My Documents'  },
  { href: '/workspace/claims',     icon: DollarSign,      label: 'My Claims'     },
];

const ADMIN_ITEMS = [
  { href: '/admin',            icon: Shield,   label: 'User Management' },
  { href: '/admin/monitoring', icon: Activity, label: 'Monitoring'      },
];

const ROLE_TITLES = {
  ADMIN: 'Managing Director',
  SUPER_ADMIN: 'Main Admin',
  MANAGEMENT: 'Assistant Manager',
  ASSISTANT_MANAGER: 'Assistant Manager',
  HR_ADMIN: 'HR Ops Manager',
  PAYROLL_ADMIN: 'Payroll Manager',
  RECRUITMENT_MANAGER: 'Recruitment Manager',
  RECRUITER: 'Recruitment Staff',
  SALES_MANAGER: 'Sales Manager',
  SALES_EXECUTIVE: 'Sales Staff',
  FINANCE_HEAD: 'Finance Manager',
  EMPLOYEE_VIEWER: 'Staff',
  EMPLOYEE: 'Staff',
  DEPLOYED_STAFF: 'Deployed Staff',
  CONTRACTOR: 'Contractor',
  CLIENT_APPROVER: 'Client approver',
  VISA_ADMIN: 'Visa & Compliance',
};

// Which module groups each role is allowed to see (null = all)
// RECRUITER: only Recruitment (no Ops Hub Platform, no Visa)
const ROLE_MODULE_ACCESS = {
  SUPER_ADMIN:         null,
  ADMIN:               null,
  MANAGEMENT:          ['Platform', 'Recruitment', 'Sales CRM', 'HR Operations', 'Payroll', 'Finance', 'Performance', 'Executive', 'Analytics', 'Documents'],
  ASSISTANT_MANAGER:   ['Platform', 'Recruitment', 'Sales CRM', 'HR Operations', 'Payroll', 'Finance', 'Performance', 'Executive', 'Analytics', 'Documents'],
  HR_ADMIN:            ['HR Operations', 'Payroll', 'Documents'],
  RECRUITMENT_MANAGER: ['Platform', 'Recruitment', 'Sales CRM', 'Performance', 'Analytics'],
  RECRUITER:           ['Recruitment'],
  SALES_MANAGER:       ['Sales CRM', 'Performance', 'Analytics'],
  SALES_EXECUTIVE:     ['Sales CRM'],
  PAYROLL_ADMIN:       ['Payroll'],
  FINANCE_HEAD:        ['Finance', 'Payroll', 'Performance', 'Analytics'],
  EMPLOYEE_VIEWER:     [],
  EMPLOYEE:            [],
  DEPLOYED_STAFF:      [],
  CONTRACTOR:          [],
  /** Leave/claim approvals at L1 for deployed staff; no core ATS/HRMS modules. */
  CLIENT_APPROVER:     ['Performance'],
  VISA_ADMIN:          ['Platform', 'HR Operations'],
};

const ROLES_WITH_GLOBAL_ITEMS = new Set([
  'ADMIN',
  'SUPER_ADMIN',
  'MANAGEMENT',
  'ASSISTANT_MANAGER',
  'HR_ADMIN',
  'PAYROLL_ADMIN',
  'RECRUITMENT_MANAGER',
  'RECRUITER',
  'SALES_MANAGER',
  'SALES_EXECUTIVE',
  'FINANCE_HEAD',
  'FINANCE',
  'VISA_ADMIN',
]);

export default function Sidebar({ collapsed, onToggle }) {
  const router = useRouter();
  const [user, setUser]           = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({});

  useEffect(() => {
    setUser(getUser());
  }, []);

  // Auto-expand group containing active route
  useEffect(() => {
    const active = {};
    MODULES.forEach(m => {
      if (m.items?.some(i => {
        if (i.exact) return router.pathname === i.href;
        return router.pathname === i.href || router.pathname.startsWith(i.href + '/');
      })) {
        active[m.group] = true;
      }
    });
    // Auto-expand My Workspace group when on /workspace routes
    if ((router.pathname === '/workspace' || router.pathname.startsWith('/workspace/')) && router.pathname !== '/workspace/approval-queue') {
      active['My Workspace'] = true;
    }
    if (router.pathname === '/workspace/approval-queue') {
      active['Payroll'] = true;
      active['Performance'] = true;
    }
    if (router.pathname === '/executive' || router.pathname.startsWith('/executive/')) {
      active['Executive'] = true;
    }
    if (router.pathname === '/analytics' || router.pathname.startsWith('/analytics/')) {
      active['Analytics'] = true;
    }
    // Visa routes live under HR Operations in the nav
    if (router.pathname === '/visa' || router.pathname.startsWith('/visa/')) {
      active['HR Operations'] = true;
    }
    setOpenGroups(prev => ({ ...prev, ...active }));
  }, [router.pathname]);

  const handleLogout = () => { clearAuth(); router.push('/auth/login'); };

  const isActive = (href, exact = false) => {
    if (exact) return router.pathname === href;
    return router.pathname === href || router.pathname.startsWith(href + '/');
  };

  const NavItem = ({ item }) => {
    const active = isActive(item.href, item.exact);
    const Icon = item.icon;
    return (
      <li>
        <Link
          href={item.href}
          onClick={() => setMobileOpen(false)}
          className={`relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group
            ${active ? 'bg-brand-500 text-white shadow-md' : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'}`}
          title={collapsed ? item.label : undefined}
        >
          <Icon size={15} className="flex-shrink-0" />
          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
          {!collapsed && item.badge === 'hot' && <span className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0" />}
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
              {item.label}
            </div>
          )}
        </Link>
      </li>
    );
  };

  const SidebarContent = () => {
    // Filter modules based on user role
    const allowedGroups = ROLE_MODULE_ACCESS[user?.role] ?? null; // null = show all
    const visibleModules = allowedGroups
      ? MODULES.filter(m => allowedGroups.includes(m.group))
      : MODULES;

    return (
    <div className="flex flex-col h-full sidebar-scroll overflow-y-auto">

      {/* Logo */}
      <div className={`flex items-center h-14 px-3 border-b border-sidebar-border flex-shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2 group min-w-0">
            <div className="w-7 h-7 bg-gradient-to-br from-brand-500 to-blue-400 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-white font-bold text-xs">T</span>
            </div>
            <div className="min-w-0">
              <span className="text-white font-semibold text-sm tracking-tight block truncate leading-tight">Tekgen AI HRMS</span>
              <span className="text-sidebar-text text-[9px] font-medium tracking-widest uppercase leading-tight">Internal Platform</span>
            </div>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="w-7 h-7 bg-gradient-to-br from-brand-500 to-blue-400 rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xs">T</span>
          </Link>
        )}
        <button onClick={onToggle} className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md text-sidebar-text hover:text-white hover:bg-sidebar-hover transition-colors flex-shrink-0" title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto">
        {visibleModules.map((module) => {
          const isOpen = openGroups[module.group] ?? false;
          const GroupIcon = module.moduleIcon;

          if (module.group === 'Platform') {
            return (
              <div key="platform" className="mb-1">
                <ul className="space-y-0.5">
                  {module.items.map((item) => (
                    <NavItem key={`Platform-${item.href}`} item={item} />
                  ))}
                </ul>
                {!collapsed && <div className="my-2 border-t border-sidebar-border opacity-50" />}
              </div>
            );
          }

          const visibleItems = module.items.filter(
            (item) =>
              (!item.hideForRoles || !item.hideForRoles.includes(user?.role)) &&
              (!item.showForRoles || item.showForRoles.includes(user?.role))
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={module.group} className="mb-0.5">
              {!collapsed ? (
                <button
                  onClick={() => setOpenGroups(p => ({ ...p, [module.group]: !p[module.group] }))}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sidebar-text hover:text-white hover:bg-sidebar-hover/50 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    {GroupIcon && <GroupIcon size={11} className={module.color || 'text-slate-400'} />}
                    <span className="text-[9px] font-bold uppercase tracking-widest">{module.group}</span>
                  </div>
                  {isOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
              ) : (
                GroupIcon && <div className="flex justify-center py-0.5 opacity-25"><GroupIcon size={10} className={module.color} /></div>
              )}

              {(collapsed || isOpen) && (
                <ul className={`space-y-0.5 ${!collapsed ? 'mt-0.5 mb-1' : ''}`}>
                  {visibleItems.map((item) => (
                    <NavItem key={`${module.group}-${item.href}-${item.label}`} item={item} />
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        {/* My Workspace — always visible to every user */}
        <div className="mb-0.5">
          {!collapsed ? (
            <button
              onClick={() => setOpenGroups(p => ({ ...p, 'My Workspace': !p['My Workspace'] }))}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sidebar-text hover:text-white hover:bg-sidebar-hover/50 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <UserCheck size={11} className="text-teal-400" />
                <span className="text-[9px] font-bold uppercase tracking-widest">My Workspace</span>
              </div>
              {openGroups['My Workspace'] ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
          ) : (
            <div className="flex justify-center py-0.5 opacity-25"><UserCheck size={10} className="text-teal-400" /></div>
          )}
          {(collapsed || openGroups['My Workspace']) && (
            <ul className={`space-y-0.5 ${!collapsed ? 'mt-0.5 mb-1' : ''}`}>
              {MY_WORKSPACE_ITEMS
                .filter(item => !item.showForRoles || item.showForRoles.includes(user?.role))
                .map(item => <NavItem key={item.href} item={item} />)}
            </ul>
          )}
        </div>

        {/* Global: Integrations — visible to ALL users */}
        <div className="mt-1">
          {!collapsed && <div className="border-t border-sidebar-border my-2 opacity-50" />}
          {!collapsed && <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-2">Workspace</p>}
          {ROLES_WITH_GLOBAL_ITEMS.has(user?.role) && (
            <ul className="space-y-0.5">
              {GLOBAL_ITEMS.map(item => <NavItem key={item.href} item={item} />)}
            </ul>
          )}
        </div>

        {/* Admin-only section */}
        {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
          <div className="mt-1">
            {!collapsed && <div className="border-t border-sidebar-border my-2 opacity-50" />}
            {!collapsed && <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-2">Administration</p>}
            <ul className="space-y-0.5">
              {ADMIN_ITEMS.map(item => <NavItem key={item.href} item={item} />)}
            </ul>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className={`flex-shrink-0 border-t border-sidebar-border p-2.5 ${collapsed ? 'flex justify-center' : ''}`}>
        {!collapsed ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {user?.avatar ? (
                <img src={user.avatar} alt="User avatar" className="w-7 h-7 rounded-full object-cover border border-sidebar-border flex-shrink-0" />
              ) : (
                <div className="w-7 h-7 bg-gradient-to-br from-brand-500 to-blue-400 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate leading-tight">{user?.firstName} {user?.lastName}</p>
                <p className="text-sidebar-text text-[9px] truncate">{ROLE_TITLES[user?.role] || user?.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Link href="/profile" className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-sidebar-hover transition-colors" title="Profile & Settings">
                <Settings size={12} />
              </Link>
              <button onClick={handleLogout} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-red-400 hover:bg-sidebar-hover transition-colors" title="Sign out">
                <LogOut size={12} />
              </button>
            </div>
          </div>
        ) : (
          <button onClick={handleLogout} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-red-400 hover:bg-sidebar-hover transition-colors" title="Sign out">
            <LogOut size={13} />
          </button>
        )}
      </div>
    </div>
  );
  }; // end SidebarContent

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 bg-sidebar-bg shadow-sidebar transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <button onClick={() => setMobileOpen(true)} className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 flex items-center justify-center bg-brand-900 text-white rounded-xl shadow-lg">
        <Menu size={18} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-60 bg-sidebar-bg h-full shadow-2xl animate-slide-in">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
