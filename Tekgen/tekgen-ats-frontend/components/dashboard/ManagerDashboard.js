'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import apiClient from '../../lib/api';
import { Briefcase, Users, BarChart3, ShoppingCart, ClipboardList, CalendarClock, CheckCircle2 } from 'lucide-react';

function Card({ label, value, sub, icon: Icon, color, href }) {
  const content = (
    <>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value ?? 0}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </>
  );

  if (!href) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        {content}
      </div>
    );
  }

  return (
    <Link href={href} className="block bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm hover:border-slate-300 transition">
      {content}
    </Link>
  );
}

export default function ManagerDashboard({ user }) {
  const [loading, setLoading] = useState(true);
  const [hrmsKpi, setHrmsKpi] = useState(null);
  const [salesKpi, setSalesKpi] = useState(null);
  const [approvalDash, setApprovalDash] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [kpiRes, salesRes, approverRes] = await Promise.all([
          apiClient.get('/api/hrms/kpis').catch(() => null),
          apiClient.get('/api/sales/dashboard').catch(() => null),
          apiClient.get('/api/payroll/approver/dashboard').catch(() => null),
        ]);
        setHrmsKpi(kpiRes?.data?.data ?? null);
        setSalesKpi(salesRes?.data?.data?.kpis ?? null);
        setApprovalDash(approverRes?.data?.data ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pendingApprovals = useMemo(
    () => (approvalDash?.pending?.leaves || 0) + (approvalDash?.pending?.claims || 0),
    [approvalDash]
  );
  const recruitmentSeries = useMemo(() => {
    const daily = hrmsKpi?.recruitment?.candidatesToday || 0;
    const weekly = daily * 5;
    const monthly = weekly * 4;
    const yearly = monthly * 12;
    return { daily, weekly, monthly, yearly };
  }, [hrmsKpi]);
  const salesSeries = useMemo(() => {
    const daily = hrmsKpi?.sales?.followUpsDue || 0;
    const weekly = daily * 5;
    const monthly = weekly * 4;
    const yearly = monthly * 12;
    return { daily, weekly, monthly, yearly };
  }, [hrmsKpi]);

  if (loading) return <div className="py-16 text-center text-slate-500">Loading manager dashboard...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Team Command Center</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Recruitment + Sales monitoring for {user?.firstName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="Open Jobs" value={hrmsKpi?.recruitment?.openJobs} sub="Recruitment pipeline" icon={Briefcase} color="bg-blue-500" href="/jobs" />
        <Card label="Candidates Today" value={hrmsKpi?.recruitment?.candidatesToday} sub="Daily submissions" icon={Users} color="bg-violet-500" href="/candidates" />
        <Card label="Active Clients" value={salesKpi?.activeClients} sub="Sales ownership" icon={ShoppingCart} color="bg-emerald-500" href="/sales/clients" />
        <Card label="Closures" value={salesKpi?.totalClosures} sub="Joined candidates" icon={CheckCircle2} color="bg-amber-500" href="/sales/pipeline" />
        <Card label="Interviews Today" value={hrmsKpi?.recruitment?.interviewsScheduled} sub="Interview tracker" icon={CalendarClock} color="bg-indigo-500" href="/interviews" />
        <Card label="Follow-ups Due" value={hrmsKpi?.sales?.followUpsDue} sub="Client and candidate follow-ups" icon={ClipboardList} color="bg-rose-500" href="/followups" />
        <Card label="Pending Approvals" value={pendingApprovals} sub="First-level approvals" icon={BarChart3} color="bg-slate-700" href="/workspace/approval-queue?tab=leaves" />
        <Card label="Offers Pending" value={hrmsKpi?.recruitment?.offersPending} sub="Offer closure watch" icon={Briefcase} color="bg-cyan-600" href="/candidates" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-2">
        <Link href="/analytics?tab=recruiters" className="btn-ghost text-sm">Recruitment Monitoring</Link>
        <Link href="/sales" className="btn-ghost text-sm">Sales Dashboard</Link>
        <Link href="/followups" className="btn-ghost text-sm">Follow-ups</Link>
        <Link href="/workspace/approval-queue?tab=leaves" className="btn-primary text-sm">Approval Queue</Link>
        <Link href="/analytics?tab=overview" className="btn-ghost text-sm">Analytics</Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800">Recruitment Performance Analytics</h3>
            <Link href="/analytics?tab=recruiters" className="text-xs text-brand-600 hover:text-brand-700">View report</Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
              <p className="text-[10px] uppercase tracking-widest text-blue-600 font-semibold">Daily</p>
              <p className="text-xl font-bold text-blue-900">{recruitmentSeries.daily}</p>
              <p className="text-[11px] text-blue-700">Submissions</p>
            </div>
            <div className="rounded-lg bg-violet-50 border border-violet-100 p-3">
              <p className="text-[10px] uppercase tracking-widest text-violet-600 font-semibold">Weekly</p>
              <p className="text-xl font-bold text-violet-900">{recruitmentSeries.weekly}</p>
              <p className="text-[11px] text-violet-700">Submissions</p>
            </div>
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
              <p className="text-[10px] uppercase tracking-widest text-emerald-600 font-semibold">Monthly</p>
              <p className="text-xl font-bold text-emerald-900">{recruitmentSeries.monthly}</p>
              <p className="text-[11px] text-emerald-700">Submissions</p>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
              <p className="text-[10px] uppercase tracking-widest text-amber-600 font-semibold">Yearly</p>
              <p className="text-xl font-bold text-amber-900">{recruitmentSeries.yearly}</p>
              <p className="text-[11px] text-amber-700">Submissions</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3 text-xs">
            <Link href="/interviews" className="rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50">Interviews</Link>
            <Link href="/selections" className="rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50">Selections</Link>
            <Link href="/onboard" className="rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50">Onboarding</Link>
            <Link href="/candidates" className="rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50">Rejected / Pipeline</Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800">Sales Performance Analytics</h3>
            <Link href="/sales" className="text-xs text-brand-600 hover:text-brand-700">View report</Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
              <p className="text-[10px] uppercase tracking-widest text-emerald-600 font-semibold">Daily</p>
              <p className="text-xl font-bold text-emerald-900">{salesSeries.daily}</p>
              <p className="text-[11px] text-emerald-700">Follow-ups</p>
            </div>
            <div className="rounded-lg bg-cyan-50 border border-cyan-100 p-3">
              <p className="text-[10px] uppercase tracking-widest text-cyan-600 font-semibold">Weekly</p>
              <p className="text-xl font-bold text-cyan-900">{salesSeries.weekly}</p>
              <p className="text-[11px] text-cyan-700">Follow-ups</p>
            </div>
            <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3">
              <p className="text-[10px] uppercase tracking-widest text-indigo-600 font-semibold">Monthly</p>
              <p className="text-xl font-bold text-indigo-900">{salesSeries.monthly}</p>
              <p className="text-[11px] text-indigo-700">Follow-ups</p>
            </div>
            <div className="rounded-lg bg-rose-50 border border-rose-100 p-3">
              <p className="text-[10px] uppercase tracking-widest text-rose-600 font-semibold">Yearly</p>
              <p className="text-xl font-bold text-rose-900">{salesSeries.yearly}</p>
              <p className="text-[11px] text-rose-700">Follow-ups</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3 text-xs">
            <Link href="/sales/leads" className="rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50">Leads</Link>
            <Link href="/sales/pipeline" className="rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50">Pipeline</Link>
            <Link href="/sales/clients" className="rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50">Clients</Link>
            <Link href="/followups" className="rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50">Meetings & Follow-ups</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
