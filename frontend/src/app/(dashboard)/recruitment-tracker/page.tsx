'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  UserPlus,
  Briefcase,
  Calendar,
  PartyPopper,
  Search,
  LayoutList,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { candidatesApi, jobsApi, interviewsApi, offersApi } from '@/lib/api-client';
import { TableWrapper } from '@/components/ui/table-wrapper';
import { DeskShell as TrackerShell, DeskTableSection as TrackerTableWrap, zebraRow } from '@/components/ui/desk-shell';

type DeskTab = 'candidates' | 'requirements' | 'interviews' | 'onboard';

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: 'Other',
  LINKEDIN: 'LinkedIn',
  JOB_BOARD: 'Job board',
  NAUKRI: 'Naukri',
  MONSTER: 'Monster',
  INDEED: 'Indeed',
  JOBSTREET: 'Jobstreet',
  APOLLO: 'Apollo',
  CSV: 'CSV',
  REFERRAL: 'Referral',
  SCRAPER: 'Other',
  EMAIL: 'Other',
};

function fmtMoney(v?: number | null, cur?: string | null) {
  if (v == null || Number.isNaN(v)) return '—';
  const c = cur || 'MYR';
  try {
    return `${c} ${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  } catch {
    return `${c} ${v}`;
  }
}

function fmtSource(s?: string | null) {
  if (!s) return '—';
  const u = s.toUpperCase();
  return SOURCE_LABEL[u] ?? s.replace(/_/g, ' ');
}

function latestSub(c: any) {
  const arr = c?.submissions;
  return Array.isArray(arr) && arr.length ? arr[0] : null;
}

function aggregateBySubmission(interviews: any[]) {
  type Row = {
    submissionId: string;
    candidate: any;
    job: any;
    client: any;
    byRound: Record<number, any>;
  };
  const m = new Map<string, Row>();
  for (const iv of interviews) {
    const sub = iv.submission;
    const sid = sub?.id ?? iv.submissionId;
    if (!sid) continue;
    if (!sub) continue;
    if (!m.has(sid)) {
      m.set(sid, {
        submissionId: sid,
        candidate: sub.candidate,
        job: sub.job,
        client: sub.client,
        byRound: {},
      });
    }
    const row = m.get(sid)!;
    row.byRound[iv.round ?? 1] = iv;
    row.candidate = sub.candidate ?? row.candidate;
    row.job = sub.job ?? row.job;
    row.client = sub.client ?? row.client;
  }
  return Array.from(m.values());
}

const TH =
  'text-left px-3 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-slate-100/95 border-b border-slate-200';

function RecruitmentTrackerContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = (searchParams.get('tab') as DeskTab | null) || 'candidates';
  const [tab, setTab] = useState<DeskTab>(
    ['candidates', 'requirements', 'interviews', 'onboard'].includes(tabParam) ? tabParam : 'candidates',
  );
  const [q, setQ] = useState('');

  useEffect(() => {
    const t = searchParams.get('tab') as DeskTab | null;
    if (t && ['candidates', 'requirements', 'interviews', 'onboard'].includes(t)) setTab(t);
  }, [searchParams]);

  const setDeskTab = (t: DeskTab) => {
    setTab(t);
    const p = new URLSearchParams(searchParams.toString());
    p.set('tab', t);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  const { data: candData, isLoading: candLoading } = useQuery({
    queryKey: ['tracker-candidates', q],
    queryFn: () => candidatesApi.list({ search: q || undefined, page: 1, limit: 50 }),
    enabled: tab === 'candidates',
  });

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['tracker-jobs', q],
    queryFn: () => jobsApi.list({ search: q || undefined, page: 1, limit: 50 }),
    enabled: tab === 'requirements',
  });

  const { data: ivData, isLoading: ivLoading } = useQuery({
    queryKey: ['tracker-interviews'],
    queryFn: () => interviewsApi.list({ page: 1, limit: 400 }),
    enabled: tab === 'interviews',
  });

  const { data: offerData, isLoading: offerLoading } = useQuery({
    queryKey: ['tracker-offers'],
    queryFn: () => offersApi.list({ page: 1, limit: 100 }),
    enabled: tab === 'onboard',
  });

  const candidates = (candData?.data ?? []).filter((c: any) => {
    if (!q.trim()) return true;
    const t = q.toLowerCase();
    const blob = [c.firstName, c.lastName, c.email, c.phone, c.businessId, c.currentTitle, c.currentCompany]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return blob.includes(t);
  });

  const jobs = (jobsData?.data ?? []).filter((j: any) => {
    if (!q.trim()) return true;
    const t = q.toLowerCase();
    const blob = [j.title, j.department, j.location, j.client?.name, j.businessId].filter(Boolean).join(' ').toLowerCase();
    return blob.includes(t);
  });

  const interviewRows = useMemo(() => aggregateBySubmission(ivData?.items ?? []), [ivData]);

  const filteredInterviewRows = useMemo(() => {
    if (!q.trim()) return interviewRows;
    const t = q.toLowerCase();
    return interviewRows.filter((r) => {
      const blob = [
        r.candidate?.firstName,
        r.candidate?.lastName,
        r.candidate?.email,
        r.candidate?.phone,
        r.job?.title,
        r.client?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(t);
    });
  }, [interviewRows, q]);

  const offers = (offerData?.items ?? []).filter((o: any) => {
    if (!q.trim()) return true;
    const c = o.submission?.candidate;
    const t = q.toLowerCase();
    const blob = [c?.firstName, c?.lastName, c?.email, c?.phone, o.submission?.job?.title, o.submission?.client?.name]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return blob.includes(t);
  });

  const rail = (
    <nav className="w-full lg:w-56 shrink-0 rounded-xl border border-slate-200 bg-white p-2 shadow-sm space-y-1">
      {(
        [
          { id: 'candidates' as const, label: 'Candidate pipeline', sub: 'Pool, AI score, visa, submissions', icon: UserPlus },
          { id: 'requirements' as const, label: 'Requirements (JD)', sub: 'Client, role, intake, hiring', icon: Briefcase },
          { id: 'interviews' as const, label: 'Interview desk', sub: 'Rounds, contacts, compensation', icon: Calendar },
          { id: 'onboard' as const, label: 'Onboard', sub: 'Offers, DOJ, readiness', icon: PartyPopper },
        ] as const
      ).map((item) => {
        const Icon = item.icon;
        const active = tab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setDeskTab(item.id)}
            className={
              'w-full text-left rounded-lg px-3 py-2.5 flex gap-3 transition-colors border ' +
              (active
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-slate-50/80 text-slate-700 border-transparent hover:border-slate-200 hover:bg-white')
            }
          >
            <Icon className={'w-5 h-5 shrink-0 mt-0.5 ' + (active ? 'text-white' : 'text-slate-400')} />
            <span>
              <span className={'block text-sm font-semibold ' + (active ? '' : 'text-slate-900')}>{item.label}</span>
              <span className={'block text-[11px] mt-0.5 leading-snug ' + (active ? 'text-blue-100' : 'text-slate-500')}>
                {item.sub}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );

  const searchBar = (
    <div className="relative flex-1 min-w-[200px] max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        placeholder={tab === 'requirements' ? 'Search client, job title, location…' : 'Search name, email, phone, role…'}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
    </div>
  );

  return (
    <div className="max-w-none -mx-2 sm:-mx-4 lg:-mx-6 px-1 sm:px-2 min-w-0">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-700 flex items-center justify-center shadow-sm shrink-0">
            <LayoutList className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recruitment desk</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Structured trackers for candidates, live requirements, interviews, and onboarding — wide tables with synced horizontal scroll, sticky identifiers, and clear section headers.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link href="/candidates" className="btn-secondary py-1.5 px-3 text-xs">
            Full candidates app
          </Link>
          <Link href="/jobs" className="btn-secondary py-1.5 px-3 text-xs">
            Jobs / JDs
          </Link>
          <Link href="/interviews" className="btn-secondary py-1.5 px-3 text-xs">
            Interview actions
          </Link>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {rail}
        <div className="flex-1 min-w-0 space-y-4 w-full">
          {tab === 'candidates' && (
            <TrackerShell
              title="Candidate pipeline tracker"
              subtitle="Columns align to your recruitment spreadsheet: IDs, latest client submission context, screening, visa, compensation, and ownership."
              actions={searchBar}
            >
              <TrackerTableWrap>
                <TableWrapper loading={candLoading} empty={!candLoading && candidates.length === 0} emptyMessage="No candidates">
                  <table className="w-full text-[13px] min-w-[2200px]">
                    <thead className="sticky top-0 z-20 shadow-sm">
                      <tr>
                        <th className={TH + ' sticky left-0 z-30 border-r border-slate-200/80'}>U ID</th>
                        <th className={TH + ' sticky left-[88px] z-30 border-r border-slate-200/80'}>Submission date</th>
                        <th className={TH}>Client</th>
                        <th className={TH}>Hire type</th>
                        <th className={TH}>Role</th>
                        <th className={TH}>Candidate name</th>
                        <th className={TH}>Contact</th>
                        <th className={TH}>Email</th>
                        <th className={TH}>Total exp</th>
                        <th className={TH}>AI screening</th>
                        <th className={TH}>AI score</th>
                        <th className={TH}>Job portal</th>
                        <th className={TH}>Relevant exp</th>
                        <th className={TH}>Nationality</th>
                        <th className={TH}>Visa type</th>
                        <th className={TH}>Visa validity</th>
                        <th className={TH}>Employer</th>
                        <th className={TH}>Current location</th>
                        <th className={TH}>Preferred location</th>
                        <th className={TH}>Current salary</th>
                        <th className={TH}>Expected salary</th>
                        <th className={TH}>Notice</th>
                        <th className={TH}>Interview mode</th>
                        <th className={TH}>Offers / pipeline</th>
                        <th className={TH}>Recruiter inputs</th>
                        <th className={TH}>Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {candidates.map((c: any, i: number) => {
                        const sub = latestSub(c);
                        const score = c.overallScore ?? c.scorecards?.[0]?.score ?? sub?.aiScore ?? null;
                        const scr = c.scorecards?.[0];
                        const visaExp = c.visaExpiry ? format(new Date(c.visaExpiry), 'dd MMM yyyy') : '—';
                        return (
                          <tr key={c.id} className={'hover:bg-blue-50/40 ' + zebraRow(i)}>
                            <td
                              className={
                                'px-3 py-2 font-mono text-xs text-slate-600 whitespace-nowrap sticky left-0 z-10 border-r border-slate-100 ' +
                                zebraRow(i)
                              }
                            >
                              {c.businessId ?? c.id.slice(0, 12)}
                            </td>
                            <td
                              className={
                                'px-3 py-2 text-xs text-slate-600 whitespace-nowrap sticky left-[88px] z-10 border-r border-slate-100 ' +
                                zebraRow(i)
                              }
                            >
                              {sub?.submittedAt ? format(new Date(sub.submittedAt), 'dd MMM yyyy') : '—'}
                            </td>
                            <td className="px-3 py-2 text-slate-800 max-w-[140px] truncate">{sub?.client?.name ?? '—'}</td>
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{sub?.job?.jobType ?? '—'}</td>
                            <td className="px-3 py-2 text-slate-800 max-w-[160px] truncate">{sub?.job?.title ?? c.currentTitle ?? '—'}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <Link href={'/candidates/' + c.id} className="font-medium text-blue-700 hover:underline">
                                {c.firstName} {c.lastName}
                              </Link>
                            </td>
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{c.phone ?? '—'}</td>
                            <td className="px-3 py-2 text-blue-700 max-w-[200px] truncate">{c.email ?? '—'}</td>
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{c.yearsExperience != null ? `${c.yearsExperience} yrs` : '—'}</td>
                            <td className="px-3 py-2 text-xs text-slate-600 max-w-[200px] truncate" title={scr?.explanation ?? ''}>
                              {scr?.explanation ? 'Yes · see profile' : score != null ? 'Scored' : '—'}
                            </td>
                            <td className="px-3 py-2 font-semibold whitespace-nowrap">{score != null ? `${Math.round(score)}` : '—'}</td>
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{fmtSource(c.sourceName ?? c.source)}</td>
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{c.yearsExperience != null ? `${c.yearsExperience} yrs` : '—'}</td>
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{c.nationality ?? '—'}</td>
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{c.visaType ?? c.visaStatus ?? '—'}</td>
                            <td className="px-3 py-2 text-xs whitespace-nowrap">{visaExp}</td>
                            <td className="px-3 py-2 text-slate-600 max-w-[140px] truncate">{c.currentCompany ?? '—'}</td>
                            <td className="px-3 py-2 text-slate-600 max-w-[120px] truncate">{c.location ?? '—'}</td>
                            <td className="px-3 py-2 text-slate-400">—</td>
                            <td className="px-3 py-2 whitespace-nowrap">{fmtMoney(c.currentSalary, c.salaryCurrency)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{fmtMoney(c.expectedSalary, c.salaryCurrency)}</td>
                            <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                              {c.noticePeriodDays != null ? `${c.noticePeriodDays}d` : '—'}
                            </td>
                            <td className="px-3 py-2 text-slate-400">—</td>
                            <td className="px-3 py-2 text-xs text-slate-500 max-w-[120px] truncate">{sub?.stage?.replace(/_/g, ' ') ?? '—'}</td>
                            <td className="px-3 py-2 text-xs text-slate-600 max-w-[180px] truncate" title={c.recruiterNotes ?? ''}>
                              {c.recruiterNotes ?? sub?.recruiterNotes ?? '—'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-[11px] font-semibold">
                                {c.stage?.replace(/_/g, ' ') ?? '—'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TableWrapper>
              </TrackerTableWrap>
            </TrackerShell>
          )}

          {tab === 'requirements' && (
            <TrackerShell
              title="Requirement list (JD & client)"
              subtitle="Each row is a live requisition: client, contract signals, salary band, submission targets, and funnel counts."
              actions={searchBar}
            >
              <TrackerTableWrap>
                <TableWrapper loading={jobsLoading} empty={!jobsLoading && jobs.length === 0} emptyMessage="No jobs">
                  <table className="w-full text-[13px] min-w-[1500px]">
                    <thead className="sticky top-0 z-20">
                      <tr>
                        <th className={TH + ' w-10'}>#</th>
                        <th className={TH + ' sticky left-0 z-30 border-r border-slate-200/80'}>Client / project</th>
                        <th className={TH + ' sticky left-[160px] z-30 border-r border-slate-200/80'}>Role</th>
                        <th className={TH}>Recruitment type</th>
                        <th className={TH}>Experience</th>
                        <th className={TH}>Location</th>
                        <th className={TH}>Contract</th>
                        <th className={TH}>Expats / local</th>
                        <th className={TH}>Intake</th>
                        <th className={TH}>Salary range</th>
                        <th className={TH}>Target submissions</th>
                        <th className={TH}>No. submissions</th>
                        <th className={TH}>Hiring status</th>
                        <th className={TH}>Current status</th>
                        <th className={TH}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {jobs.map((j: any, i: number) => {
                        const client = j.client?.name ?? '—';
                        const subs = j._count?.submissions ?? 0;
                        const apps = j._count?.applications ?? 0;
                        const sal =
                          j.salaryMin != null || j.salaryMax != null
                            ? `${fmtMoney(j.salaryMin, j.currency)} – ${fmtMoney(j.salaryMax, j.currency)}`
                            : '—';
                        const target = j.targetSubmissionDate ? format(new Date(j.targetSubmissionDate), 'dd MMM yyyy') : '—';
                        const hiring = j.isActive ? 'Open' : 'Closed';
                        const pri = j.priority && j.priority !== 'NORMAL' ? j.priority : '';
                        return (
                          <tr key={j.id} className={'hover:bg-blue-50/40 ' + zebraRow(i)}>
                            <td className="px-3 py-2 text-slate-400 text-xs">{i + 1}</td>
                            <td
                              className={
                                'px-3 py-2 text-slate-900 font-medium max-w-[200px] truncate sticky left-0 z-10 border-r border-slate-100 ' +
                                zebraRow(i)
                              }
                            >
                              {client}
                            </td>
                            <td
                              className={
                                'px-3 py-2 sticky left-[160px] z-10 border-r border-slate-100 ' + zebraRow(i)
                              }
                            >
                              <Link href={'/jobs/' + j.id} className="font-medium text-blue-700 hover:underline truncate block max-w-[220px]">
                                {j.title}
                              </Link>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">{j.businessId}</div>
                            </td>
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{j.jobType ?? '—'}</td>
                            <td className="px-3 py-2 text-slate-600 max-w-[120px] truncate">{j.experience ?? '—'}</td>
                            <td className="px-3 py-2 text-slate-600 max-w-[120px] truncate">{j.location ?? '—'}</td>
                            <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">{j.jobType ?? '—'}</td>
                            <td className="px-3 py-2 text-xs text-slate-600 max-w-[140px] truncate">{j.visaRequirement ?? '—'}</td>
                            <td className="px-3 py-2 text-center text-slate-700">{j.openings ?? '—'}</td>
                            <td className="px-3 py-2 text-xs whitespace-nowrap">{sal}</td>
                            <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">{target}</td>
                            <td className="px-3 py-2 text-center font-medium text-slate-800">{subs}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span
                                className={
                                  'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ' +
                                  (j.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600')
                                }
                              >
                                {hiring}
                                {pri ? ` · ${pri}` : ''}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                              {apps} applicants · {j.lastActivityAt ? formatDistanceToNow(new Date(j.lastActivityAt), { addSuffix: true }) : '—'}
                            </td>
                            <td className="px-3 py-2 text-xs text-slate-500 max-w-[220px] truncate" title={j.description ?? ''}>
                              {j.description ? j.description.slice(0, 80) + (j.description.length > 80 ? '…' : '') : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TableWrapper>
              </TrackerTableWrap>
            </TrackerShell>
          )}

          {tab === 'interviews' && (
            <TrackerShell
              title="Interview tracker"
              subtitle="One row per submission with first- and second-round dates rolled up from scheduled interviews."
              actions={searchBar}
            >
              <TrackerTableWrap>
                <TableWrapper loading={ivLoading} empty={!ivLoading && filteredInterviewRows.length === 0} emptyMessage="No interviews">
                  <table className="w-full text-[13px] min-w-[1400px]">
                    <thead className="sticky top-0 z-20">
                      <tr>
                        <th className={TH + ' sticky left-0 z-30 border-r border-slate-200/80'}>Candidate</th>
                        <th className={TH}>First round</th>
                        <th className={TH}>Second round</th>
                        <th className={TH}>Contact</th>
                        <th className={TH}>Email</th>
                        <th className={TH}>Client / project</th>
                        <th className={TH}>Position</th>
                        <th className={TH}>Total exp</th>
                        <th className={TH}>Current salary</th>
                        <th className={TH}>Expected salary</th>
                        <th className={TH}>Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredInterviewRows.map((r, i) => {
                        const c = r.candidate;
                        const iv1 = r.byRound[1];
                        const iv2 = r.byRound[2];
                        const fmtIv = (iv: any) =>
                          iv?.scheduledAt ? format(new Date(iv.scheduledAt), 'dd MMM yyyy, HH:mm') : '—';
                        const statusSummary = [iv1, iv2]
                          .filter(Boolean)
                          .map((iv: any) => `R${iv.round ?? '?'}: ${iv.status}`)
                          .join(' · ');
                        return (
                          <tr key={r.submissionId} className={'hover:bg-blue-50/40 ' + zebraRow(i)}>
                            <td
                              className={'px-3 py-2 font-medium text-slate-900 whitespace-nowrap sticky left-0 z-10 border-r border-slate-100 ' + zebraRow(i)}
                            >
                              {c ? (
                                <Link href={'/candidates/' + c.id} className="text-blue-700 hover:underline">
                                  {c.firstName} {c.lastName}
                                </Link>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap">{fmtIv(iv1)}</td>
                            <td className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap">{fmtIv(iv2)}</td>
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{c?.phone ?? '—'}</td>
                            <td className="px-3 py-2 text-blue-700 max-w-[200px] truncate">{c?.email ?? '—'}</td>
                            <td className="px-3 py-2 text-slate-800 max-w-[160px] truncate">{r.client?.name ?? '—'}</td>
                            <td className="px-3 py-2 text-slate-800 max-w-[180px] truncate">{r.job?.title ?? '—'}</td>
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{c?.yearsExperience != null ? `${c.yearsExperience} yrs` : '—'}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{fmtMoney(c?.currentSalary, c?.salaryCurrency)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{fmtMoney(c?.expectedSalary, c?.salaryCurrency)}</td>
                            <td className="px-3 py-2 text-xs text-slate-600 max-w-[240px] truncate" title={statusSummary}>
                              {statusSummary || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TableWrapper>
              </TrackerTableWrap>
            </TrackerShell>
          )}

          {tab === 'onboard' && (
            <TrackerShell
              title="Onboard tracker"
              subtitle="Pulled from live offers: compensation, client, and joining date (DOJ). Refine statuses in the Offers module."
              actions={searchBar}
            >
              <TrackerTableWrap>
                <TableWrapper loading={offerLoading} empty={!offerLoading && offers.length === 0} emptyMessage="No offers">
                  <table className="w-full text-[13px] min-w-[1200px]">
                    <thead className="sticky top-0 z-20">
                      <tr>
                        <th className={TH + ' sticky left-0 z-30 border-r border-slate-200/80'}>Name</th>
                        <th className={TH}>Contact</th>
                        <th className={TH}>Email</th>
                        <th className={TH}>Client / project</th>
                        <th className={TH}>Position</th>
                        <th className={TH}>Total exp</th>
                        <th className={TH}>Current salary</th>
                        <th className={TH}>Expected salary</th>
                        <th className={TH}>Offered</th>
                        <th className={TH}>DOJ</th>
                        <th className={TH}>Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {offers.map((o: any, i: number) => {
                        const c = o.submission?.candidate;
                        const job = o.submission?.job;
                        const client = o.submission?.client;
                        return (
                          <tr key={o.id} className={'hover:bg-blue-50/40 ' + zebraRow(i)}>
                            <td
                              className={'px-3 py-2 font-medium whitespace-nowrap sticky left-0 z-10 border-r border-slate-100 ' + zebraRow(i)}
                            >
                              {c ? (
                                <Link href={'/candidates/' + c.id} className="text-blue-700 hover:underline">
                                  {c.firstName} {c.lastName}
                                </Link>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{c?.phone ?? '—'}</td>
                            <td className="px-3 py-2 text-blue-700 max-w-[200px] truncate">{c?.email ?? '—'}</td>
                            <td className="px-3 py-2 text-slate-800 max-w-[160px] truncate">{client?.name ?? '—'}</td>
                            <td className="px-3 py-2 text-slate-800 max-w-[180px] truncate">{job?.title ?? '—'}</td>
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{c?.yearsExperience != null ? `${c.yearsExperience} yrs` : '—'}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{fmtMoney(c?.currentSalary, c?.salaryCurrency)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{fmtMoney(c?.expectedSalary, c?.salaryCurrency)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{fmtMoney(o.offeredSalary, o.currency)}</td>
                            <td className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap">
                              {o.joiningDate ? format(new Date(o.joiningDate), 'dd MMM yyyy') : '—'}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className="inline-flex rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-[11px] font-semibold">
                                {o.status?.replace(/_/g, ' ')}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TableWrapper>
              </TrackerTableWrap>
            </TrackerShell>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RecruitmentTrackerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500 text-sm">Loading…</div>}>
      <RecruitmentTrackerContent />
    </Suspense>
  );
}
