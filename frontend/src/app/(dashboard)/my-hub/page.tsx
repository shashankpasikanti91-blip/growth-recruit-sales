'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Briefcase, Send, Target, CalendarClock, AlertCircle,
  ChevronRight, LayoutDashboard,
} from 'lucide-react';
import { myHubApi } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';
import { clsx } from 'clsx';

function StatCard({ label, value, icon: Icon, color, href }: {
  label: string; value: number | string; icon: React.ElementType;
  color: string; href?: string;
}) {
  const inner = (
    <div className={clsx('bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4', href && 'cursor-pointer')}>
      <span className={clsx('p-3 rounded-xl', color)}>
        <Icon className="w-5 h-5" />
      </span>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      </div>
      {href && <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : <div>{inner}</div>;
}

export default function MyHubPage() {
  const { user } = useAuthStore();
  const role = (user as any)?.role ?? '';

  const isRecruiter = ['RECRUITER', 'TENANT_ADMIN', 'SUPER_ADMIN'].includes(role);
  const isSales     = ['SALES', 'TENANT_ADMIN', 'SUPER_ADMIN'].includes(role);

  const { data, isLoading } = useQuery({
    queryKey: ['my-dashboard'],
    queryFn: myHubApi.getDashboard,
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <LayoutDashboard className="w-6 h-6 text-brand-600" />
          <h1 className="text-2xl font-bold text-gray-900">My Hub</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Welcome back, {(user as any)?.firstName ?? 'there'}. Here's your personal workspace.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {isRecruiter && (
            <>
              <StatCard
                label="My Active JDs"
                value={data?.myActiveJDs ?? 0}
                icon={Briefcase}
                color="bg-brand-100 text-brand-700"
                href="/my-hub/my-jds"
              />
              <StatCard
                label="My Submissions This Month"
                value={data?.mySubmissionsThisMonth ?? 0}
                icon={Send}
                color="bg-green-100 text-green-700"
                href="/my-hub/my-submissions"
              />
            </>
          )}
          {isSales && (
            <StatCard
              label="My Open Leads"
              value={data?.myOpenLeads ?? 0}
              icon={Target}
              color="bg-purple-100 text-purple-700"
              href="/my-hub/my-leads"
            />
          )}
          <StatCard
            label="Follow-ups Today"
            value={data?.myFollowUpsToday ?? 0}
            icon={CalendarClock}
            color="bg-blue-100 text-blue-700"
            href="/my-hub/my-follow-ups?view=today"
          />
          {(data?.myOverdueFollowUps ?? 0) > 0 && (
            <StatCard
              label="Overdue Follow-ups"
              value={data?.myOverdueFollowUps ?? 0}
              icon={AlertCircle}
              color="bg-red-100 text-red-700"
              href="/my-hub/my-follow-ups?view=overdue"
            />
          )}
        </div>
      )}

      {/* Quick links */}
      <div className="mt-10">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Navigation</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            ...(isRecruiter ? [
              { label: 'My JDs',          href: '/my-hub/my-jds' },
              { label: 'My Submissions',  href: '/my-hub/my-submissions' },
            ] : []),
            ...(isSales ? [
              { label: 'My Leads',        href: '/my-hub/my-leads' },
            ] : []),
            { label: 'My Follow-ups',   href: '/my-hub/my-follow-ups' },
            { label: 'My Activity',     href: '/my-hub/my-activity' },
          ].map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-brand-300 hover:bg-brand-50/30 transition-colors text-sm font-medium text-gray-700"
            >
              {link.label}
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
