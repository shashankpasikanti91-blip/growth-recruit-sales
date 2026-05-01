'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Link from 'next/link';
import api from '../../lib/api';
import { getUser } from '../../lib/auth';
import {
  CalendarCheck, DollarSign, ClipboardList, UserCheck,
  ChevronRight, AlertCircle, Loader2,
} from 'lucide-react';

const LEAVE_COLORS = {
  ANNUAL:          'bg-blue-100 text-blue-700',
  MEDICAL:         'bg-green-100 text-green-700',
  HOSPITALIZATION: 'bg-purple-100 text-purple-700',
  COMPASSIONATE:   'bg-orange-100 text-orange-700',
  NO_PAY:          'bg-slate-100 text-slate-600',
};

export default function MyDashboard() {
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const user = getUser();

  useEffect(() => {
    api.get('/api/my/summary')
      .then(r => setSummary(r.data.data))
      .catch(e => setError(e.response?.data?.message || 'Failed to load summary'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="My Workspace">
      <div className="max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Welcome back, {user?.firstName || 'there'} 👋
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Your personal workspace — leave, claims, payslips &amp; more
          </p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-8">
            <Loader2 size={16} className="animate-spin" />
            Loading your workspace…
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 px-4 py-3 rounded-lg">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {summary && !loading && (
          <>
            {/* Profile completeness banner */}
            {summary.profileComplete < 100 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-amber-800 text-sm">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>Your profile is <strong>{summary.profileComplete}%</strong> complete. Fill in the missing details to unlock all features.</span>
                </div>
                <Link href="/workspace/profile" className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline whitespace-nowrap">
                  Complete profile →
                </Link>
              </div>
            )}

            {/* Employee ID card */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl px-5 py-4 text-white flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Employee ID</p>
                <p className="text-2xl font-bold tracking-wider">{summary.employeeId}</p>
                <p className="text-xs text-slate-400 mt-1 capitalize">{summary.status?.toLowerCase()?.replace('_', ' ')}</p>
              </div>
              <div className="text-right text-sm">
                <p className="text-slate-300">{user?.firstName} {user?.lastName}</p>
                <p className="text-slate-500 text-xs mt-1">{user?.role}</p>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <QuickCard
                icon={<CalendarCheck size={18} />}
                label="Pending Leaves"
                value={summary.pendingLeave}
                color="text-blue-500"
                href="/workspace/leave"
              />
              <QuickCard
                icon={<DollarSign size={18} />}
                label="Pending Claims"
                value={summary.pendingClaims}
                color="text-amber-500"
                href="/workspace/claims"
              />
              <QuickCard
                icon={<UserCheck size={18} />}
                label="Profile Complete"
                value={`${summary.profileComplete}%`}
                color="text-teal-500"
                href="/workspace/profile"
              />
            </div>

            {/* Leave balance snapshot */}
            {summary.leaveSnapshot?.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700">Leave Balance</h3>
                  <Link href="/workspace/leave" className="text-xs text-brand-500 hover:underline flex items-center gap-0.5">
                    View all <ChevronRight size={12} />
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {summary.leaveSnapshot.map(b => (
                    <span
                      key={b.leaveType}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${LEAVE_COLORS[b.leaveType] || 'bg-slate-100 text-slate-600'}`}
                    >
                      {b.leaveType.replace('_', ' ')}: <strong>{b.remaining}</strong> days
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { href: '/workspace/leave',      icon: CalendarCheck,  label: 'Apply Leave',    sub: 'Submit a leave request'  },
                { href: '/workspace/claims',     icon: DollarSign,     label: 'Submit Claim',   sub: 'Expense reimbursements'  },
                { href: '/workspace/attendance', icon: ClipboardList,  label: 'My Attendance',  sub: 'Clock-in history'        },
                { href: '/workspace/payslips',   icon: DollarSign,     label: 'My Payslips',    sub: 'Salary slips'            },
                { href: '/workspace/profile',    icon: UserCheck,      label: 'Update Profile', sub: 'Personal & bank details' },
              ].map(a => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex items-start gap-3 bg-white border border-slate-200 rounded-xl p-3.5 hover:border-brand-400 hover:shadow-sm transition-all"
                >
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 text-slate-600">
                    <a.icon size={15} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{a.label}</p>
                    <p className="text-xs text-slate-400">{a.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function QuickCard({ icon, label, value, color, href }) {
  return (
    <Link href={href} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-brand-400 hover:shadow-sm transition-all">
      <div className={`${color} mb-2`}>{icon}</div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </Link>
  );
}
