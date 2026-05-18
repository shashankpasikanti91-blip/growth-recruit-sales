'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import apiClient from '../../lib/api';
import { getUser } from '../../lib/auth';
import {
  isHrmsExecutiveQueueRole,
  showFullExecutivePendingChrome,
} from '../../lib/hrmsExecutiveQueueRoles';

const PAYROLL_APPROVAL_FETCH_ROLES = new Set([
  'PAYROLL_ADMIN',
  'MANAGEMENT',
  'ADMIN',
  'SUPER_ADMIN',
  'DIRECTOR',
  'HEAD',
  'MD',
  'MANAGING_DIRECTOR',
  'DEPT_HEAD',
  'DEPARTMENT_HEAD',
  'COMPANY_HEAD',
  'FINANCE',
  'FINANCE_HEAD',
  'HR_ADMIN',
]);

function Stat({ label, value, tone = 'slate' }) {
  const tones = {
    blue: 'bg-blue-50 border-blue-100 text-blue-900',
    violet: 'bg-violet-50 border-violet-100 text-violet-900',
    amber: 'bg-amber-50 border-amber-100 text-amber-900',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-900',
    slate: 'bg-slate-50 border-slate-200 text-slate-900',
  };
  return (
    <div className={`rounded-xl border p-3 ${tones[tone] || tones.slate}`}>
      <p className="text-[10px] uppercase tracking-widest font-semibold">{label}</p>
      <p className="text-2xl font-bold mt-1">{value ?? 0}</p>
    </div>
  );
}

function formatApprovalsList(approvals) {
  if (!approvals?.length) return '—';
  return approvals
    .map(
      (a) =>
        `L${a.approvalLevel} ${a.approverRole || ''} ${a.status}${a.approvedAt ? ` @ ${new Date(a.approvedAt).toLocaleString()}` : ''}`
    )
    .join(' → ');
}

/** Human-readable gate when API omits top-level approverRole (embedded approvals still have it). */
function formatGate(role) {
  if (!role) return '—';
  const labels = {
    DEPARTMENT_MANAGER: 'Dept manager',
    DEPT_MANAGER: 'Dept manager',
    MANAGING_DIRECTOR: 'MD / executive',
    MD: 'MD / executive',
    CLIENT_APPROVER: 'Client approver',
    ADMIN: 'Admin',
    SUPER_ADMIN: 'Super admin',
    MANAGEMENT: 'Management',
    RECRUITMENT_MANAGER: 'Recruitment mgr',
    SALES_MANAGER: 'Sales mgr',
    HR_ADMIN: 'HR ops mgr',
    PAYROLL_ADMIN: 'Payroll mgr',
    FINANCE_HEAD: 'Finance mgr',
  };
  return labels[role] || String(role).replace(/_/g, ' ');
}

function getPendingApprovalFromLeave(lr) {
  const list = lr?.approvals || [];
  return list.find((a) => a.status === 'PENDING') || null;
}

export default function ExecutivePendingCenterPage() {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [department, setDepartment] = useState(() => {
    const u = getUser();
    if (!showFullExecutivePendingChrome(u?.role) && u?.department) return u.department;
    return 'ALL';
  });
  const [leaves, setLeaves] = useState([]);
  const [claims, setClaims] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [opsModules, setOpsModules] = useState(null);
  const [busyId, setBusyId] = useState('');
  const [leaveActionMap, setLeaveActionMap] = useState({});
  const [claimActionMap, setClaimActionMap] = useState({});
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailType, setDetailType] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const currentRole = userRole || getUser()?.role;
      const isExecutiveUser = isHrmsExecutiveQueueRole(currentRole);
      const fullExecChrome = showFullExecutivePendingChrome(currentRole);
      const fetchPayroll = fullExecChrome || PAYROLL_APPROVAL_FETCH_ROLES.has(currentRole);
      const fetchOpsKpis = fullExecChrome;

      if (isExecutiveUser) {
        const [queueRes, payrollRes, kpiRes] = await Promise.all([
          apiClient.get('/api/hrms/executive/pending-queue?limit=200').catch(() => null),
          fetchPayroll ? apiClient.get('/api/payroll/approvals').catch(() => null) : Promise.resolve(null),
          fetchOpsKpis ? apiClient.get('/api/hrms/kpis').catch(() => null) : Promise.resolve(null),
        ]);

        const q = queueRes?.data?.data;
        setLeaves(q?.leaves || []);
        setClaims(q?.claims || []);
        setOpsModules(fetchOpsKpis ? (q?.modules || null) : null);
        setPayroll(payrollRes?.data?.data || []);
        setKpis(kpiRes?.data?.data || null);

        const leaveActionable = {};
        (q?.leaves || []).forEach((row) => {
          if (row?.leaveRequest?.id && row.canApprove) {
            leaveActionable[row.leaveRequest.id] = row.pendingApprovalId || true;
          }
        });
        const claimActionable = {};
        (q?.claims || []).forEach((row) => {
          if (row?.claim?.id && row.canApprove) {
            claimActionable[row.claim.id] = row.pendingApprovalId || true;
          }
        });
        setLeaveActionMap(leaveActionable);
        setClaimActionMap(claimActionable);
      } else {
        const [leavesRes, claimsRes, payrollRes, kpiRes, leaveApproverRes, claimApproverRes] = await Promise.all([
          apiClient.get('/api/payroll/approver/leaves?status=PENDING&limit=200').catch(() => null),
          apiClient.get('/api/payroll/approver/claims?status=PENDING&limit=200').catch(() => null),
          fetchPayroll ? apiClient.get('/api/payroll/approvals').catch(() => null) : Promise.resolve(null),
          fetchOpsKpis ? apiClient.get('/api/hrms/kpis').catch(() => null) : Promise.resolve(null),
          apiClient.get('/api/payroll/approver/leaves?status=PENDING&limit=200').catch(() => null),
          apiClient.get('/api/payroll/approver/claims?status=PENDING&limit=200').catch(() => null),
        ]);

        setLeaves(leavesRes?.data?.data?.approvals || []);
        setClaims(claimsRes?.data?.data?.approvals || []);
        setOpsModules(null);
        setPayroll(fetchPayroll ? (payrollRes?.data?.data || []) : []);
        setKpis(fetchOpsKpis ? (kpiRes?.data?.data || null) : null);

        const leaveActionable = {};
        (leaveApproverRes?.data?.data?.approvals || []).forEach((x) => {
          if (x?.leaveRequest?.id) leaveActionable[x.leaveRequest.id] = true;
        });
        const claimActionable = {};
        (claimApproverRes?.data?.data?.approvals || []).forEach((x) => {
          if (x?.claim?.id) claimActionable[x.claim.id] = true;
        });
        setLeaveActionMap(leaveActionable);
        setClaimActionMap(claimActionable);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const u = getUser();
    setUserRole(u?.role || null);
    load();
  }, []);

  const resolvedRole = userRole || getUser()?.role;
  const fullExecChrome = showFullExecutivePendingChrome(resolvedRole);
  const tabIds = useMemo(
    () => (fullExecChrome
      ? ['all', 'leaves', 'claims', 'payroll', 'operations']
      : ['all', 'leaves', 'claims', 'recruitment']),
    [fullExecChrome]
  );

  useEffect(() => {
    if (!tabIds.includes(tab)) setTab('all');
  }, [tab, tabIds]);

  const isExecutiveView = isHrmsExecutiveQueueRole(resolvedRole);
  const pageTitle = fullExecChrome ? 'Executive Pending Center' : 'Pending approvals';

  const departments = useMemo(() => {
    const s = new Set();
    leaves.forEach((x) => s.add(x?.leaveRequest?.employee?.department || 'UNKNOWN'));
    claims.forEach((x) => s.add(x?.claim?.employee?.department || 'UNKNOWN'));
    return ['ALL', ...Array.from(s).filter(Boolean)];
  }, [leaves, claims]);

  const filteredLeaves = useMemo(() => {
    if (department === 'ALL') return leaves;
    return leaves.filter((x) => (x?.leaveRequest?.employee?.department || 'UNKNOWN') === department);
  }, [leaves, department]);

  const filteredClaims = useMemo(() => {
    if (department === 'ALL') return claims;
    return claims.filter((x) => (x?.claim?.employee?.department || 'UNKNOWN') === department);
  }, [claims, department]);

  const pickApprovalId = (map, id) => {
    const v = map[id];
    return typeof v === 'string' ? v : undefined;
  };

  const quickAction = async (type, id, action) => {
    const comments = action === 'REJECT' ? (window.prompt('Rejection reason (required)') || '').trim() : '';
    if (action === 'REJECT' && !comments) return;
    setBusyId(`${type}-${id}`);
    try {
      if (type === 'leave') {
        const approvalId = pickApprovalId(leaveActionMap, id);
        await apiClient.post(`/api/payroll/approver/leaves/${id}/action`, {
          action,
          comments: comments || null,
          ...(approvalId ? { approvalId } : {}),
        });
      } else if (type === 'claim') {
        const approvalId = pickApprovalId(claimActionMap, id);
        await apiClient.post(`/api/payroll/approver/claims/${id}/action`, {
          action,
          comments: comments || null,
          ...(approvalId ? { approvalId } : {}),
        });
      } else if (type === 'payroll') {
        if (action === 'APPROVE') await apiClient.post(`/api/payroll/approvals/${id}/approve`, { notes: 'Approved from executive center' });
        if (action === 'REJECT') await apiClient.post(`/api/payroll/approvals/${id}/reject`, { rejectionReason: comments });
      }
      await load();
    } catch (error) {
      const msg = error?.response?.data?.message || 'Action failed. Please refresh and retry.';
      window.alert(msg);
    } finally {
      setBusyId('');
    }
  };

  const visaKpi = fullExecChrome
    ? (kpis?.operations?.visaApplicationsPending ?? kpis?.visa?.newApplications ?? opsModules?.visaApplicationsPending ?? 0)
    : null;

  return (
    <DashboardLayout title={pageTitle}>
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{pageTitle}</h2>
            <p className="text-sm text-slate-500">
              {fullExecChrome
                ? 'Cross-module pending visibility with Request IDs and level-safe actions'
                : 'Leave and claim approvals for your queue; use Recruitment for offers, onboarding, and joining. Department filter applies to the rows below.'}
            </p>
          </div>
          <button type="button" onClick={load} className="px-3 py-1.5 text-xs border rounded-lg bg-white">Refresh</button>
        </div>

        <div className={`grid gap-3 ${fullExecChrome ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2'}`}>
          <Stat label="Pending Leaves" value={filteredLeaves.length} tone="violet" />
          <Stat label="Pending Claims" value={filteredClaims.length} tone="blue" />
          {fullExecChrome && (
            <>
              <Stat label="Pending Payroll Steps" value={payroll.length} tone="amber" />
              <Stat label="Visa (Application)" value={visaKpi} tone="emerald" />
            </>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap gap-2 items-center">
          {tabIds.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs rounded-lg capitalize ${tab === t ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {t}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-500">Department</span>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className="text-xs border rounded-md px-2 py-1">
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500">Loading pending list...</div>
        ) : (
          <div className="space-y-3">
            {(tab === 'all' || tab === 'leaves') && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b bg-violet-50 text-sm font-semibold text-violet-800">Leave Approvals</div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Request ID</th>
                      <th className="px-3 py-2 text-left">Employee</th>
                      <th className="px-3 py-2 text-left">Department</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Days</th>
                      <th className="px-3 py-2 text-left">Level</th>
                      <th className="px-3 py-2 text-left">Gate</th>
                      <th className="px-3 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaves.map((x) => {
                      const lr = x?.leaveRequest;
                      const id = lr?.id;
                      const key = `leave-${id}`;
                      const emp = lr?.employee;
                      const pendingApr = getPendingApprovalFromLeave(lr);
                      const canAct = !!leaveActionMap[id];
                      const level = x?.requiredLevel ?? pendingApr?.approvalLevel ?? lr?.currentApprovalLevel;
                      const gateRaw = x?.approverRole ?? pendingApr?.approverRole;
                      const gate = formatGate(gateRaw);
                      const rowKey = id || x?.entityId;
                      const blockedHint = !canAct && pendingApr
                        ? `Waiting for ${formatGate(pendingApr.approverRole)} (L${pendingApr.approvalLevel}) — not your approval step`
                        : !canAct
                          ? 'No pending approval row — check data or refresh'
                          : '';
                      return (
                        <tr key={rowKey} className="border-t">
                          <td className="px-3 py-2 font-mono text-xs">{lr?.displayId || id}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              className="text-blue-700 underline underline-offset-2"
                              onClick={() => { setSelectedDetail(x); setDetailType('leave'); }}
                            >
                              {emp?.user?.firstName} {emp?.user?.lastName}
                            </button>
                          </td>
                          <td className="px-3 py-2">{emp?.department || '—'}</td>
                          <td className="px-3 py-2">{lr?.leaveType || '—'}</td>
                          <td className="px-3 py-2">{lr?.daysCount ?? 0}</td>
                          <td className="px-3 py-2 text-xs">{level != null && level !== '' ? `L${level}` : '—'}</td>
                          <td className="px-3 py-2 text-[10px] uppercase text-slate-600">{gate}</td>
                          <td className="px-3 py-2 flex gap-2">
                            <button
                              type="button"
                              title={canAct ? 'Approve' : blockedHint}
                              disabled={busyId === key || !canAct}
                              onClick={() => quickAction('leave', id, 'APPROVE')}
                              className="px-2 py-1 text-xs rounded bg-emerald-600 text-white disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              title={canAct ? 'Reject' : blockedHint}
                              disabled={busyId === key || !canAct}
                              onClick={() => quickAction('leave', id, 'REJECT')}
                              className="px-2 py-1 text-xs rounded bg-red-600 text-white disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredLeaves.length === 0 && (
                      <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-400">No pending leaves</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {(tab === 'all' || tab === 'claims') && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b bg-blue-50 text-sm font-semibold text-blue-800">Claim Approvals</div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Request ID</th>
                      <th className="px-3 py-2 text-left">Employee</th>
                      <th className="px-3 py-2 text-left">Department</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Amount</th>
                      <th className="px-3 py-2 text-left">Level</th>
                      <th className="px-3 py-2 text-left">Gate</th>
                      <th className="px-3 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClaims.map((x) => {
                      const c = x?.claim;
                      const id = c?.id;
                      const key = `claim-${id}`;
                      const emp = c?.employee;
                      const pendingApr = (c?.approvals || []).find((a) => a.status === 'PENDING');
                      const canAct = !!claimActionMap[id];
                      const level = x?.requiredLevel ?? pendingApr?.approvalLevel ?? c?.currentApprovalLevel;
                      const gate = formatGate(x?.approverRole ?? pendingApr?.approverRole);
                      const rowKey = id || x?.entityId;
                      const blockedHint = !canAct && pendingApr
                        ? `Waiting for ${formatGate(pendingApr.approverRole)} (L${pendingApr.approvalLevel})`
                        : !canAct ? 'Not your approval step' : '';
                      return (
                        <tr key={rowKey} className="border-t">
                          <td className="px-3 py-2 font-mono text-xs">{c?.displayId || id}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              className="text-blue-700 underline underline-offset-2"
                              onClick={() => { setSelectedDetail(x); setDetailType('claim'); }}
                            >
                              {emp?.user?.firstName} {emp?.user?.lastName}
                            </button>
                          </td>
                          <td className="px-3 py-2">{emp?.department || '—'}</td>
                          <td className="px-3 py-2">{c?.claimType || '—'}</td>
                          <td className="px-3 py-2">{c?.currency || 'RM'} {Number(c?.amount || 0).toFixed(2)}</td>
                          <td className="px-3 py-2 text-xs">{level != null && level !== '' ? `L${level}` : '—'}</td>
                          <td className="px-3 py-2 text-[10px] uppercase text-slate-600">{gate}</td>
                          <td className="px-3 py-2 flex gap-2">
                            <button
                              type="button"
                              title={canAct ? 'Approve' : blockedHint}
                              disabled={busyId === key || !canAct}
                              onClick={() => quickAction('claim', id, 'APPROVE')}
                              className="px-2 py-1 text-xs rounded bg-emerald-600 text-white disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              title={canAct ? 'Reject' : blockedHint}
                              disabled={busyId === key || !canAct}
                              onClick={() => quickAction('claim', id, 'REJECT')}
                              className="px-2 py-1 text-xs rounded bg-red-600 text-white disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredClaims.length === 0 && (
                      <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-400">No pending claims</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {(tab === 'all' || tab === 'payroll') && fullExecChrome && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b bg-amber-50 text-sm font-semibold text-amber-800">Payroll Approval Steps</div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Run</th>
                      <th className="px-3 py-2 text-left">Step</th>
                      <th className="px-3 py-2 text-left">Required Role</th>
                      <th className="px-3 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payroll.map((x) => {
                      const key = `payroll-${x.id}`;
                      return (
                        <tr key={x.id} className="border-t">
                          <td className="px-3 py-2">{x?.payrollRun?.displayId || '—'}</td>
                          <td className="px-3 py-2">{x?.stepName || `Step ${x?.step || ''}`}</td>
                          <td className="px-3 py-2">{x?.requiredRole || '—'}</td>
                          <td className="px-3 py-2 flex gap-2">
                            <button type="button" disabled={busyId === key} onClick={() => quickAction('payroll', x.id, 'APPROVE')} className="px-2 py-1 text-xs rounded bg-emerald-600 text-white disabled:opacity-50">Approve</button>
                            <button type="button" disabled={busyId === key} onClick={() => quickAction('payroll', x.id, 'REJECT')} className="px-2 py-1 text-xs rounded bg-red-600 text-white disabled:opacity-50">Reject</button>
                          </td>
                        </tr>
                      );
                    })}
                    {payroll.length === 0 && (
                      <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400">No pending payroll approvals</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {(tab === 'all' || tab === 'operations') && fullExecChrome && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="text-sm font-semibold text-slate-900">Operations (visa, offers, onboarding, finance)</div>
                <p className="text-xs text-slate-500">Shown on <span className="font-medium">All</span> and <span className="font-medium">Operations</span> tabs. Counts match Analytics KPIs.</p>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="border rounded-lg p-3 flex items-center justify-between">
                    <span>Visa — applications</span>
                    <Link href="/visa" className="text-blue-700 text-xs underline">{opsModules?.visaApplicationsPending ?? kpis?.operations?.visaApplicationsPending ?? '—'}</Link>
                  </div>
                  <div className="border rounded-lg p-3 flex items-center justify-between">
                    <span>Offers pending release</span>
                    <Link href="/hr/onboarding" className="text-blue-700 text-xs underline">{opsModules?.offerLettersPending ?? kpis?.operations?.offerLettersPending ?? '—'}</Link>
                  </div>
                  <div className="border rounded-lg p-3 flex items-center justify-between">
                    <span>Onboarding in progress</span>
                    <Link href="/hr/onboarding" className="text-blue-700 text-xs underline">{opsModules?.onboardingInProgress ?? kpis?.operations?.onboardingInProgress ?? '—'}</Link>
                  </div>
                  <div className="border rounded-lg p-3 flex items-center justify-between">
                    <span>Resignation / offboarding records</span>
                    <span className="text-xs text-slate-600">{opsModules?.offboardingRecords ?? kpis?.operations?.offboardingRecords ?? '—'}</span>
                  </div>
                  <div className="border rounded-lg p-3 flex items-center justify-between sm:col-span-2">
                    <span>Invoices pending approval</span>
                    <Link href="/finance/invoices" className="text-blue-700 text-xs underline">{opsModules?.invoicesPendingApproval ?? kpis?.operations?.invoicesPendingApproval ?? '—'}</Link>
                  </div>
                </div>
                {!isExecutiveView && (
                  <p className="text-xs text-amber-700">Operations strip is richest for executive roles; some links require finance/visa access.</p>
                )}
              </div>
            )}

            {(tab === 'all' || tab === 'recruitment') && !fullExecChrome && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="text-sm font-semibold text-slate-900">Recruitment, onboarding &amp; joining</div>
                <p className="text-xs text-slate-500">Org-wide counts are limited to Admin / MD / Heads on the Executive view. Open each area to work your queue.</p>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <Link href="/jobs" className="border rounded-lg p-3 hover:bg-slate-50 text-blue-700">Job openings</Link>
                  <Link href="/candidates" className="border rounded-lg p-3 hover:bg-slate-50 text-blue-700">Candidates</Link>
                  <Link href="/hr/onboarding" className="border rounded-lg p-3 hover:bg-slate-50 text-blue-700">Offers &amp; onboarding tracker</Link>
                  <Link href="/screening" className="border rounded-lg p-3 hover:bg-slate-50 text-blue-700">Screening &amp; interviews</Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {selectedDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl border border-slate-200 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Approval Details</h3>
              <button type="button" className="text-xs px-2 py-1 border rounded" onClick={() => setSelectedDetail(null)}>Close</button>
            </div>
            <div className="p-4 text-sm space-y-2">
              <p><span className="font-semibold">Type:</span> {detailType === 'leave' ? 'Leave' : 'Claim'}</p>
              <p>
                <span className="font-semibold">Request ID:</span>
                {' '}
                {detailType === 'leave'
                  ? (selectedDetail?.leaveRequest?.displayId || selectedDetail?.leaveRequest?.id)
                  : (selectedDetail?.claim?.displayId || selectedDetail?.claim?.id)}
              </p>
              <p>
                <span className="font-semibold">Pending approval row:</span>
                {' '}
                {detailType === 'leave'
                  ? (selectedDetail?.pendingApprovalId || '—')
                  : (selectedDetail?.pendingApprovalId || '—')}
              </p>
              <p>
                <span className="font-semibold">Employee:</span>
                {' '}
                {detailType === 'leave'
                  ? `${selectedDetail?.leaveRequest?.employee?.user?.firstName || ''} ${selectedDetail?.leaveRequest?.employee?.user?.lastName || ''}`
                  : `${selectedDetail?.claim?.employee?.user?.firstName || ''} ${selectedDetail?.claim?.employee?.user?.lastName || ''}`}
              </p>
              <p>
                <span className="font-semibold">Department:</span>
                {' '}
                {detailType === 'leave'
                  ? (selectedDetail?.leaveRequest?.employee?.department || '—')
                  : (selectedDetail?.claim?.employee?.department || '—')}
              </p>
              {detailType === 'leave' ? (
                <>
                  <p><span className="font-semibold">Leave Type:</span> {selectedDetail?.leaveRequest?.leaveType || '—'}</p>
                  <p>
                    <span className="font-semibold">Dates:</span>
                    {' '}
                    {selectedDetail?.leaveRequest?.startDate ? new Date(selectedDetail.leaveRequest.startDate).toLocaleDateString() : '—'}
                    {' '}
                    -
                    {' '}
                    {selectedDetail?.leaveRequest?.endDate ? new Date(selectedDetail.leaveRequest.endDate).toLocaleDateString() : '—'}
                  </p>
                  <p><span className="font-semibold">Reason:</span> {selectedDetail?.leaveRequest?.reason || 'No reason provided'}</p>
                  <p><span className="font-semibold">Approval trail:</span> {formatApprovalsList(selectedDetail?.leaveRequest?.approvals)}</p>
                </>
              ) : (
                <>
                  <p><span className="font-semibold">Claim Type:</span> {selectedDetail?.claim?.claimType || '—'}</p>
                  <p>
                    <span className="font-semibold">Amount:</span>
                    {' '}
                    {selectedDetail?.claim?.currency || 'RM'} {Number(selectedDetail?.claim?.amount || 0).toFixed(2)}
                  </p>
                  <p><span className="font-semibold">Description:</span> {selectedDetail?.claim?.description || 'No description provided'}</p>
                  <p><span className="font-semibold">Approval trail:</span> {formatApprovalsList(selectedDetail?.claim?.approvals)}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
