'use client';

import DashboardLayout from '../components/layout/DashboardLayout';
import Link from 'next/link';
import {
  Users, UserCheck, ClipboardList, CalendarCheck, TrendingUp,
  PlusCircle, ArrowRight, Settings,
} from 'lucide-react';

const HR_SECTIONS = [
  {
    title: 'Employee Master',
    description: 'View and manage all employee profiles, departments, and designations.',
    icon: Users,
    color: 'bg-violet-500',
    href: '/hr/employees',
    badge: 'Active',
  },
  {
    title: 'Leave Management',
    description: 'Approve or reject leave requests. View leave balances by team.',
    icon: CalendarCheck,
    color: 'bg-blue-500',
    href: '/hr/leave',
    badge: 'Active',
  },
  {
    title: 'Attendance',
    description: 'Daily attendance records, exceptions, and late arrivals.',
    icon: ClipboardList,
    color: 'bg-emerald-500',
    href: '/hr/attendance',
    badge: 'Active',
  },
  {
    title: 'Performance Reviews',
    description: 'Set goals, run appraisals, and track performance cycles.',
    icon: TrendingUp,
    color: 'bg-amber-500',
    href: '/hr/performance',
    badge: 'Coming',
  },
  {
    title: 'Joining Documents',
    description: 'Track offer letters, contracts, and onboarding checklist per employee.',
    icon: UserCheck,
    color: 'bg-sky-500',
    href: '/hr/onboarding',
    badge: 'Coming',
  },
  {
    title: 'Exit Management',
    description: 'Resignation, clearance, and final settlements.',
    icon: Settings,
    color: 'bg-rose-500',
    href: '/hr/exit',
    badge: 'Coming',
  },
];

function SectionCard({ title, description, icon: Icon, color, href, badge }) {
  const isComingSoon = badge === 'Coming';
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3 ${isComingSoon ? 'opacity-70' : 'hover:shadow-md hover:border-slate-300 transition-all'}`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} shadow-sm`}>
          <Icon size={18} className="text-white" />
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          isComingSoon
            ? 'bg-slate-100 text-slate-500'
            : 'bg-emerald-100 text-emerald-700'
        }`}>
          {badge}
        </span>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</p>
      </div>
      {!isComingSoon ? (
        <Link href={href} className="mt-auto flex items-center gap-1.5 text-xs text-brand-500 font-medium hover:text-brand-600">
          Open <ArrowRight size={12} />
        </Link>
      ) : (
        <span className="mt-auto text-xs text-slate-400">Module in development</span>
      )}
    </div>
  );
}

export default function HRPage() {
  return (
    <DashboardLayout title="HR Operations">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">HR Operations</h2>
            <p className="text-sm text-slate-500 mt-0.5">Workforce management · Employee lifecycle · Compliance</p>
          </div>
          <button className="btn-primary text-sm self-start" disabled>
            <PlusCircle size={14} /> Add Employee
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Employees', value: '—', sub: 'Coming soon', color: 'text-violet-600 bg-violet-50' },
            { label: 'New Joiners',     value: '—', sub: 'This month',   color: 'text-blue-600 bg-blue-50'   },
            { label: 'Leave Requests',  value: '—', sub: 'Pending',      color: 'text-amber-600 bg-amber-50' },
            { label: 'Attendance Today',value: '—', sub: 'Present',      color: 'text-emerald-600 bg-emerald-50' },
          ].map(s => (
            <div key={s.label} className="stat-card flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                <p className="text-xs text-slate-400">{s.sub}</p>
              </div>
              <div className={`text-xs px-2 py-1 rounded-lg font-medium ${s.color}`}>Pending</div>
            </div>
          ))}
        </div>

        {/* Section cards */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">HR Modules</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {HR_SECTIONS.map(s => <SectionCard key={s.title} {...s} />)}
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-start gap-3">
          <UserCheck size={18} className="text-violet-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-violet-800">HR module is being built</h4>
            <p className="text-xs text-violet-600 mt-0.5">Employee records, leave management, and attendance tracking will be fully operational in the next phase. Employee data integration with Recruitment is in progress.</p>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
