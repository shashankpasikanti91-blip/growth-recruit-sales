'use client';
import Link from 'next/link';
import {
  BarChart2, TrendingUp, Users, Building2, Zap,
  Download, ArrowRight,
} from 'lucide-react';

const REPORT_CARDS = [
  {
    href: '/reports/placement-velocity',
    icon: TrendingUp,
    color: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
    title: 'Placement Velocity',
    description: 'Time to submit, time to offer, time to join — per JD and recruiter.',
    roles: 'All roles',
  },
  {
    href: '/reports/sales-pipeline',
    icon: BarChart2,
    color: 'bg-purple-50 border-purple-200',
    iconColor: 'text-purple-600',
    title: 'Sales Pipeline',
    description: 'Leads, conversions, pipeline value and overdue follow-ups per sales rep.',
    roles: 'Sales / Admin',
  },
  {
    href: '/reports/recruiter-performance',
    icon: Users,
    color: 'bg-emerald-50 border-emerald-200',
    iconColor: 'text-emerald-600',
    title: 'Recruiter Performance',
    description: 'JDs assigned, submissions, interviews, offers and placement rate per recruiter.',
    roles: 'Recruiter / Admin',
  },
  {
    href: '/reports/client-activity',
    icon: Building2,
    color: 'bg-amber-50 border-amber-200',
    iconColor: 'text-amber-600',
    title: 'Client Activity',
    description: 'Open JDs, submissions, interviews, offers and placements per client.',
    roles: 'Sales / Admin',
  },
  {
    href: '/reports/ai-usage',
    icon: Zap,
    color: 'bg-rose-50 border-rose-200',
    iconColor: 'text-rose-600',
    title: 'AI Usage',
    description: 'AI screening volume and lead generation counts per user.',
    roles: 'Admin only',
  },
];

export default function ReportsHubPage() {
  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-blue-600" />
          Reports & Analytics
        </h1>
        <p className="text-slate-500 mt-1">
          Exportable team performance and pipeline reports. Every report supports CSV and Excel export.
        </p>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {REPORT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className={`border rounded-xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow ${card.color}`}
            >
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-lg bg-white border ${card.color}`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 mt-1" />
              </div>
              <div>
                <div className="font-semibold text-slate-800">{card.title}</div>
                <div className="text-sm text-slate-500 mt-0.5">{card.description}</div>
              </div>
              <div className="mt-auto">
                <span className="text-xs font-medium text-slate-400">{card.roles}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Export note */}
      <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
        <Download className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div>
          Every report page has <strong>Export CSV</strong> and <strong>Export Excel</strong> buttons.
          You can also export any data grid (Candidates, Jobs, Submissions, Leads, etc.) directly from its own page.
        </div>
      </div>
    </div>
  );
}
