'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Users, Calendar, ChevronLeft, ChevronRight, CheckCircle2,
  XCircle, Clock, MinusCircle, AlertTriangle, Loader2,
  UserCheck, TrendingUp, BadgeCheck, Edit3, X, Save,
  ChevronDown, RefreshCw, Building2, Globe2,
} from 'lucide-react';
import apiClient from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PayrollNavActions from '../../components/payroll/PayrollNavActions';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const ATTENDANCE_STATUS = [
  { value: 'PRESENT',      label: 'Present',      color: 'bg-green-100 text-green-700',  icon: CheckCircle2,  dot: 'bg-green-500' },
  { value: 'ABSENT',       label: 'Absent',       color: 'bg-red-100 text-red-700',     icon: XCircle,       dot: 'bg-red-500' },
  { value: 'HALF_DAY',     label: 'Half Day',     color: 'bg-yellow-100 text-yellow-700',icon: MinusCircle,   dot: 'bg-yellow-400' },
  { value: 'LEAVE',        label: 'Leave',        color: 'bg-blue-100 text-blue-700',   icon: Calendar,      dot: 'bg-blue-500' },
  { value: 'ON_DUTY',      label: 'On Duty',      color: 'bg-purple-100 text-purple-700',icon: BadgeCheck,   dot: 'bg-purple-500' },
  { value: 'SICK',         label: 'Sick',         color: 'bg-orange-100 text-orange-700',icon: AlertTriangle, dot: 'bg-orange-400' },
  { value: 'UNPAID_LEAVE', label: 'Unpaid Leave', color: 'bg-slate-100 text-slate-600', icon: Clock,         dot: 'bg-slate-400' },
];

const STATUS_DOT = {
  PRESENT:      'bg-green-500',
  ABSENT:       'bg-red-500',
  HALF_DAY:     'bg-yellow-400',
  LEAVE:        'bg-blue-500',
  ON_DUTY:      'bg-purple-500',
  SICK:         'bg-orange-400',
  UNPAID_LEAVE: 'bg-slate-400',
  WEEKEND:      'bg-slate-200',
  HOLIDAY:      'bg-pink-300',
};

const STATUS_ABBR = {
  PRESENT:      'P',
  ABSENT:       'A',
  HALF_DAY:     'H',
  LEAVE:        'L',
  ON_DUTY:      'D',
  SICK:         'S',
  UNPAID_LEAVE: 'U',
  WEEKEND:      '—',
  HOLIDAY:      '★',
};

function getWorkingDays(month, year) {
  // Returns array of {date, dayLabel, isWeekend} for the payroll period
  // Payroll period: 25th of (month-1) to 24th of month
  const days = [];
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear  = month === 1 ? year - 1 : year;

  // 25th of prev month to 24th of current month
  const start = new Date(prevYear, prevMonth - 1, 25);
  const end   = new Date(year, month - 1, 24);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    days.push({
      date:      d.toISOString().split('T')[0],
      day:       d.getDate(),
      month:     d.getMonth() + 1,
      dayLabel:  ['Su','Mo','Tu','We','Th','Fr','Sa'][dow],
      isWeekend: dow === 0 || dow === 6,
    });
  }
  return days;
}

function AttendanceCell({ status, isWeekend, onClick, saving }) {
  if (isWeekend) {
    return (
      <div className="w-8 h-8 flex items-center justify-center rounded text-xs text-slate-300 bg-slate-50 cursor-default select-none">
        —
      </div>
    );
  }
  const dot = STATUS_DOT[status] || 'bg-slate-300';
  const abbr = STATUS_ABBR[status] || '?';
  return (
    <button
      onClick={onClick}
      disabled={saving}
      title={status || 'Not Marked'}
      className={`w-8 h-8 flex items-center justify-center rounded text-xs font-semibold border transition-all hover:scale-110 hover:shadow-md ${
        status
          ? `${dot.replace('bg-', 'border-')} bg-white text-slate-700`
          : 'border-slate-200 bg-white text-slate-300 hover:border-blue-300'
      } ${saving ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
    >
      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : (
        <span className={`w-2 h-2 rounded-full ${dot || 'bg-slate-300'} inline-block`} title={abbr} />
      )}
    </button>
  );
}

export default function PayrollStaff() {
  const router = useRouter();

  // Period: default to current payroll month (May 2026 = month 5)
  const now = new Date();
  const defaultMonth = now.getDate() >= 25
    ? (now.getMonth() === 11 ? 1 : now.getMonth() + 2)
    : now.getMonth() + 1;
  const defaultYear  = now.getDate() >= 25 && now.getMonth() === 11
    ? now.getFullYear() + 1
    : now.getFullYear();

  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear]   = useState(defaultYear);

  const [staff,      setStaff]      = useState([]);
  const [attendance, setAttendance] = useState({}); // { profileId_date: status }
  const [period,     setPeriod]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  // Mark-attendance modal
  const [modal, setModal] = useState(null); // { profileId, date, currentStatus }
  const [marking, setMarking] = useState(false);

  // Summary row: counts per employee
  const days = getWorkingDays(month, year);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const rawUser = localStorage.getItem('user');
    const parsedUser = rawUser ? JSON.parse(rawUser) : null;
    const role  = localStorage.getItem('userRole') || parsedUser?.role;
    if (!token) { router.push('/auth/login'); return; }
    if (role && !['ADMIN', 'MANAGEMENT', 'PAYROLL_ADMIN', 'HR_ADMIN'].includes(role)) {
      router.push('/dashboard');
    }
  }, []);

  // ── Fetch data ─────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [staffRes, periodRes, attRes] = await Promise.allSettled([
        apiClient.get('/api/payroll/admin/internal-staff', { headers }),
        apiClient.get('/api/payroll/admin/period',         { headers }),
        apiClient.get(`/api/payroll/attendance?month=${month}&year=${year}&limit=500`, { headers }),
      ]);

      if (staffRes.status === 'fulfilled') {
        setStaff(staffRes.value.data.data || []);
      }
      if (periodRes.status === 'fulfilled') {
        setPeriod(periodRes.value.data.data);
      }
      if (attRes.status === 'fulfilled') {
        const records = attRes.value.data.data || [];
        const map = {};
        for (const r of records) {
          const dateKey = r.date?.split('T')[0];
          map[`${r.employeeId}_${dateKey}`] = r.status;
        }
        setAttendance(map);
      }
    } catch (e) {
      setError('Failed to load staff data.');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Mark attendance ────────────────────────────────────────────────────────
  async function markAttendance(profileId, date, status) {
    setMarking(true);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      await apiClient.post('/api/payroll/attendance', {
        employeeId: profileId,
        date,
        status,
      }, { headers: { Authorization: `Bearer ${token}` } });

      setAttendance(prev => ({ ...prev, [`${profileId}_${date}`]: status }));
    } catch (e) {
      alert('Failed to mark attendance: ' + (e.response?.data?.message || e.message));
    } finally {
      setMarking(false);
      setModal(null);
    }
  }

  // ── Summary stats per employee ─────────────────────────────────────────────
  function getStats(profileId) {
    const workDays = days.filter(d => !d.isWeekend);
    let present = 0, absent = 0, leave = 0, halfDay = 0, notMarked = 0;
    for (const d of workDays) {
      const s = attendance[`${profileId}_${d.date}`];
      if (!s)                    notMarked++;
      else if (s === 'PRESENT')  present++;
      else if (s === 'ABSENT')   absent++;
      else if (s === 'HALF_DAY') halfDay++;
      else if (s === 'LEAVE' || s === 'SICK' || s === 'UNPAID_LEAVE') leave++;
    }
    return { present, absent, leave, halfDay, notMarked, workDays: workDays.length };
  }

  // ── KPI banner ─────────────────────────────────────────────────────────────
  const totalWorkDays = days.filter(d => !d.isWeekend).length;
  const totalPresent  = staff.reduce((s, e) => s + getStats(e.profileId).present, 0);
  const totalAbsent   = staff.reduce((s, e) => s + getStats(e.profileId).absent, 0);
  const totalNotMkd   = staff.reduce((s, e) => s + getStats(e.profileId).notMarked, 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout title="Payroll › Staff & attendance">
        <div className="flex justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Loading staff attendance…</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <Head><title>Staff & Attendance — Tekgen Payroll</title></Head>

      <DashboardLayout title="Payroll › Staff & attendance">
        <PayrollNavActions />
        <p className="text-xs text-slate-500 mb-4">Payroll period and attendance for <strong>Malaysia (MYR)</strong> payroll runs.</p>
        <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 p-2 md:p-4 rounded-xl border border-slate-100">

        {/* ── Header ── */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                Staff &amp; Attendance
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Payroll period: {period
                  ? `${period.periodStart} → ${period.periodEnd}`
                  : `25 ${MONTHS[month === 1 ? 11 : month - 2]} – 24 ${MONTHS[month - 1]} ${year}`
                }
                {period?.daysRemaining > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-amber-600 font-medium">
                    <Clock className="w-3.5 h-3.5" /> {period.daysRemaining} days remaining
                  </span>
                )}
              </p>
            </div>

            {/* Period selector */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (month === 1) { setMonth(12); setYear(y => y - 1); }
                  else setMonth(m => m - 1);
                }}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 min-w-[140px] justify-center">
                <Calendar className="w-4 h-4 text-blue-500" />
                {MONTHS[month - 1]} {year}
              </div>
              <button
                onClick={() => {
                  if (month === 12) { setMonth(1); setYear(y => y + 1); }
                  else setMonth(m => m + 1);
                }}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-white transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={fetchAll}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-white transition-colors ml-1"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Staff',     value: staff.length,    icon: Users,       color: 'text-blue-600',   bg: 'bg-blue-50' },
            { label: 'Working Days',    value: totalWorkDays,   icon: Calendar,    color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Total Present',   value: totalPresent,    icon: CheckCircle2,color: 'text-green-600',  bg: 'bg-green-50' },
            { label: 'Not Yet Marked',  value: totalNotMkd,     icon: Clock,       color: 'text-amber-600',  bg: 'bg-amber-50' },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${k.bg} flex items-center justify-center flex-shrink-0`}>
                <k.icon className={`w-5 h-5 ${k.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{k.label}</p>
                <p className="text-xl font-bold text-slate-800">{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Attendance Grid ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              Attendance Grid — {MONTHS[month - 1]} {year} Payroll Period
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              {[
                { dot: 'bg-green-500', label: 'Present' },
                { dot: 'bg-red-500',   label: 'Absent' },
                { dot: 'bg-yellow-400',label: 'Half Day' },
                { dot: 'bg-blue-500',  label: 'Leave' },
                { dot: 'bg-slate-300', label: 'Weekend' },
              ].map(l => (
                <span key={l.label} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${l.dot}`} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-500 min-w-[220px]">
                    Employee
                  </th>
                  {days.map(d => (
                    <th
                      key={d.date}
                      className={`px-1 py-2 text-center text-xs min-w-[36px] ${d.isWeekend ? 'text-slate-300' : 'text-slate-500 font-medium'}`}
                    >
                      <div>{d.dayLabel}</div>
                      <div className={`text-[10px] ${d.month !== month ? 'text-blue-400' : ''}`}>{d.day}</div>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 min-w-[80px]">P</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 min-w-[80px]">A</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 min-w-[80px]">L</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 min-w-[80px]">Unmark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {staff.map((emp, idx) => {
                  const stats = getStats(emp.profileId);
                  return (
                    <tr key={emp.profileId} className={`hover:bg-blue-50/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                      {/* Employee cell */}
                      <td className="sticky left-0 z-10 bg-inherit px-4 py-3 min-w-[220px]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {emp.firstName?.[0]}{emp.lastName?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 truncate text-sm">
                              {emp.firstName} {emp.lastName}
                            </p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                              <span className="font-mono">{emp.employeeId}</span>
                              {emp.nationality !== 'Malaysia' && (
                                <span className="inline-flex items-center gap-0.5 px-1 rounded text-[9px] bg-purple-100 text-purple-600">
                                  <Globe2 className="w-2.5 h-2.5" /> Expat
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Attendance cells */}
                      {days.map(d => {
                        const key = `${emp.profileId}_${d.date}`;
                        const status = attendance[key];
                        return (
                          <td key={d.date} className="px-1 py-2 text-center">
                            <AttendanceCell
                              status={status}
                              isWeekend={d.isWeekend}
                              saving={false}
                              onClick={() => setModal({
                                profileId: emp.profileId,
                                name: `${emp.firstName} ${emp.lastName}`,
                                date: d.date,
                                currentStatus: status,
                              })}
                            />
                          </td>
                        );
                      })}

                      {/* Summary */}
                      <td className="px-3 py-3 text-center">
                        <span className="text-sm font-semibold text-green-600">{stats.present}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-sm font-semibold text-red-500">{stats.absent}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-sm font-semibold text-blue-500">{stats.leave}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {stats.notMarked > 0
                          ? <span className="text-sm font-semibold text-amber-500">{stats.notMarked}</span>
                          : <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {staff.length === 0 && !loading && (
              <div className="py-16 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No internal staff found.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Employee Cards (salary summary) ── */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map(emp => {
            const stats  = getStats(emp.profileId);
            const salary = emp.salary;
            const gross  = salary
              ? salary.basicSalary + Object.values(salary.allowances || {}).reduce((s, v) => s + v, 0)
              : null;
            return (
              <div key={emp.profileId} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {emp.firstName?.[0]}{emp.lastName?.[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800">{emp.firstName} {emp.lastName}</p>
                    <p className="text-xs text-slate-500">{emp.designation || emp.role}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{emp.employeeId}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    emp.nationality === 'Malaysia'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {emp.nationality === 'Malaysia' ? 'Local' : 'Expat'}
                  </span>
                </div>

                {/* Attendance mini-summary */}
                <div className="grid grid-cols-4 gap-1 text-center mb-3 bg-slate-50 rounded-lg p-2">
                  {[
                    { label: 'Days',  val: stats.workDays,  color: 'text-slate-600' },
                    { label: 'Pres',  val: stats.present,   color: 'text-green-600' },
                    { label: 'Abs',   val: stats.absent,    color: 'text-red-500' },
                    { label: 'Pend',  val: stats.notMarked, color: 'text-amber-500' },
                  ].map(s => (
                    <div key={s.label}>
                      <p className={`text-base font-bold ${s.color}`}>{s.val}</p>
                      <p className="text-[10px] text-slate-400">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Salary */}
                {salary ? (
                  <div className="text-xs text-slate-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Basic Salary</span>
                      <span className="font-medium text-slate-700">RM {salary.basicSalary.toLocaleString()}</span>
                    </div>
                    {gross && (
                      <div className="flex justify-between border-t pt-1">
                        <span>Est. Gross</span>
                        <span className="font-semibold text-green-700">RM {gross.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-amber-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> No approved salary structure
                  </p>
                )}
              </div>
            );
          })}
        </div>

        </div>
      </DashboardLayout>

      {/* ── Mark Attendance Modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="font-semibold text-slate-800">Mark Attendance</h3>
                <p className="text-sm text-slate-500">{modal.name} · {modal.date}</p>
              </div>
              <button onClick={() => setModal(null)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-2 gap-2">
              {ATTENDANCE_STATUS.map(s => {
                const Icon = s.icon;
                const isCurrent = modal.currentStatus === s.value;
                return (
                  <button
                    key={s.value}
                    disabled={marking}
                    onClick={() => markAttendance(modal.profileId, modal.date, s.value)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all hover:scale-[1.02] ${
                      isCurrent
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : `border-transparent ${s.color} hover:border-current`
                    } ${marking ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {s.label}
                    {isCurrent && <span className="ml-auto text-[10px] bg-blue-500 text-white rounded px-1">current</span>}
                  </button>
                );
              })}
            </div>

            <div className="px-5 pb-4 flex justify-end">
              <button onClick={() => setModal(null)} className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
