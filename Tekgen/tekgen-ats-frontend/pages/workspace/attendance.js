'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const LEAVE_TYPES = {
  AL: { label: 'Annual Leave', color: 'bg-green-100 text-green-700', badge: 'AL' },
  ML: { label: 'Medical Leave', color: 'bg-purple-100 text-purple-700', badge: 'ML' },
  HL: { label: 'Hospitalization Leave', color: 'bg-red-100 text-red-700', badge: 'HL' },
  CL: { label: 'Compassionate Leave', color: 'bg-blue-100 text-blue-700', badge: 'CL' },
  RL: { label: 'Replacement Leave', color: 'bg-amber-100 text-amber-700', badge: 'RL' },
  NPL: { label: 'No Pay Leave', color: 'bg-slate-100 text-slate-700', badge: 'NPL' },
  PH: { label: 'Public Holiday', color: 'bg-yellow-100 text-yellow-700', badge: 'PH' },
  EL: { label: 'Emergency Leave', color: 'bg-orange-100 text-orange-700', badge: 'EL' },
};

export default function MyAttendance() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [todaySubmitted, setTodaySubmitted] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('PRESENT');
  const [submitMsg, setSubmitMsg] = useState('');
  const [submitMode, setSubmitMode] = useState('DAILY');
  const [monthlyStatus, setMonthlyStatus] = useState('PRESENT');
  const [monthlySubmitting, setMonthlySubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      // Fetch approved leaves for the month
      try {
        const resLeaves = await api.get(`/api/my/leave?year=${year}&month=${month}`);
        const approvedLeaves = resLeaves.data.data?.leaves?.filter(l => l.status === 'APPROVED') || [];
        setLeaves(approvedLeaves);
      } catch (err) {
        setLeaves([]);
      }

      // Fetch public holidays
      try {
        const resHolidays = await api.get(`/api/holidays?year=${year}&month=${month}`);
        setHolidays(resHolidays.data.data?.holidays || []);
      } catch (err) {
        setHolidays([]);
      }

      // Fetch own submitted attendance records
      try {
        const resAttendance = await api.get(`/api/my/attendance?year=${year}&month=${month}`);
        const records = resAttendance.data.data?.records || [];
        setAttendanceRecords(records);
        const today = new Date();
        const hasToday = records.some((r) => {
          const d = new Date(r.date);
          return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
        });
        setTodaySubmitted(hasToday);
      } catch (err) {
        setAttendanceRecords([]);
        setTodaySubmitted(false);
      }
    } catch (err) {
      console.error('Error loading attendance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, () => null);

  // Helper function to get event for a specific date
  const getEventForDate = (day) => {
    if (!day) return null;

    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Check for leave
    for (const leave of leaves) {
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      const currentDay = new Date(dateStr);

      if (currentDay >= startDate && currentDay <= endDate) {
        const leaveType = leave.leaveType === 'ANNUAL' ? 'AL' : 
                          leave.leaveType === 'MEDICAL' ? 'ML' :
                          leave.leaveType === 'HOSPITALIZATION' ? 'HL' :
                          leave.leaveType === 'COMPASSIONATE' ? 'CL' :
                          leave.leaveType === 'REPLACEMENT' ? 'RL' :
                          leave.leaveType === 'NO_PAY' ? 'NPL' :
                          leave.leaveType === 'EMERGENCY' ? 'EL' : 'AL';
        return { type: 'leave', code: leaveType, label: LEAVE_TYPES[leaveType]?.label };
      }
    }

    // Check for public holiday
    for (const holiday of holidays) {
      if (holiday.date === dateStr) {
        return { type: 'holiday', code: 'PH', label: holiday.name };
      }
    }

    return null;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getColorClass = (event) => {
    if (!event) return '';
    if (event.type === 'leave') return LEAVE_TYPES[event.code]?.color;
    if (event.type === 'holiday') return LEAVE_TYPES.PH.color;
    return '';
  };

  const submitTodayAttendance = async () => {
    try {
      const todayIso = new Date().toISOString();
      await api.post('/api/my/attendance/submit', { date: todayIso, status: submitStatus });
      setSubmitMsg('Attendance submitted successfully. Editing is disabled after submission.');
      await loadData();
    } catch (err) {
      setSubmitMsg(err.response?.data?.message || 'Failed to submit attendance');
    }
  };

  const submitMonthlyAttendance = async () => {
    try {
      setMonthlySubmitting(true);
      await api.post('/api/my/attendance/submit-monthly', {
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
        status: monthlyStatus,
      });
      setSubmitMsg('Monthly attendance submitted successfully for missing working days.');
      await loadData();
    } catch (err) {
      setSubmitMsg(err.response?.data?.message || 'Failed to submit monthly attendance');
    } finally {
      setMonthlySubmitting(false);
    }
  };

  return (
    <DashboardLayout title="My Workspace › My Attendance">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Attendance Calendar</h2>
          <p className="text-sm text-slate-500 mt-0.5">Monthly calendar showing your approved leaves and public holidays</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-slate-600">Loading attendance calendar...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Today Attendance Submission</p>
                  <p className="text-xs text-slate-500">Choose Daily or Monthly one-time mode. Submitted records remain locked.</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="px-3 py-2 border border-slate-300 rounded text-sm"
                    value={submitMode}
                    onChange={(e) => setSubmitMode(e.target.value)}
                  >
                    <option value="DAILY">Daily</option>
                    <option value="MONTHLY">End-of-month (one time)</option>
                  </select>
                  {submitMode === 'DAILY' ? (
                    <>
                  <select
                    className="px-3 py-2 border border-slate-300 rounded text-sm"
                    value={submitStatus}
                    onChange={(e) => setSubmitStatus(e.target.value)}
                    disabled={todaySubmitted}
                  >
                    <option value="PRESENT">Present</option>
                    <option value="HALF_DAY">Half Day</option>
                    <option value="ON_DUTY">On Duty</option>
                    <option value="SICK">Sick</option>
                    <option value="ABSENT">Absent</option>
                  </select>
                  <button
                    onClick={submitTodayAttendance}
                    disabled={todaySubmitted}
                    className="px-3 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
                  >
                    {todaySubmitted ? 'Submitted' : 'Submit Attendance'}
                  </button>
                    </>
                  ) : (
                    <>
                      <select
                        className="px-3 py-2 border border-slate-300 rounded text-sm"
                        value={monthlyStatus}
                        onChange={(e) => setMonthlyStatus(e.target.value)}
                      >
                        <option value="PRESENT">Present</option>
                        <option value="HALF_DAY">Half Day</option>
                        <option value="ON_DUTY">On Duty</option>
                        <option value="SICK">Sick</option>
                        <option value="ABSENT">Absent</option>
                        <option value="LEAVE">Leave</option>
                        <option value="UNPAID_LEAVE">Unpaid Leave</option>
                      </select>
                      <button
                        onClick={submitMonthlyAttendance}
                        disabled={monthlySubmitting}
                        className="px-3 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
                      >
                        {monthlySubmitting ? 'Submitting...' : 'Submit Monthly'}
                      </button>
                    </>
                  )}
                </div>
              </div>
              {submitMsg && <p className="text-xs mt-2 text-slate-600">{submitMsg}</p>}
            </div>

            {/* Calendar Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">{monthName}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={previousMonth}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-600" />
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="mb-6">
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center font-bold text-sm text-slate-600 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-2">
                  {[...emptyDays, ...monthDays].map((day, idx) => {
                    const event = getEventForDate(day);
                    const isWeekend = [0, 6].includes((firstDay + idx) % 7);

                    return (
                      <div
                        key={idx}
                        className={`aspect-square flex flex-col items-center justify-center rounded-lg border-2 transition-all ${
                          !day
                            ? 'border-transparent'
                            : event
                            ? `border-current ${getColorClass(event)} font-semibold`
                            : isWeekend
                            ? 'border-slate-200 bg-slate-50 text-slate-500'
                            : 'border-slate-200 bg-white hover:border-blue-300'
                        }`}
                      >
                        {day && (
                          <>
                            <span className="text-sm">{day}</span>
                            {event && <span className="text-xs font-bold mt-1">{event.code}</span>}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="border-t border-slate-200 pt-6">
                <p className="font-bold text-slate-900 mb-3">Legend</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(LEAVE_TYPES).map(([code, config]) => (
                    <div key={code} className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${config.color}`}>
                        {code}
                      </div>
                      <span className="text-sm text-slate-600">{config.label}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-slate-50 border-2 border-slate-300 flex items-center justify-center text-xs font-bold text-slate-500">
                      —
                    </div>
                    <span className="text-sm text-slate-600">Weekend</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Approved Leaves Summary */}
            {leaves.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">📋</span> Approved Leaves This Month
                </h3>
                <div className="space-y-2">
                  {leaves.map(leave => {
                    const leaveType = leave.leaveType === 'ANNUAL' ? 'AL' : 
                                      leave.leaveType === 'MEDICAL' ? 'ML' :
                                      leave.leaveType === 'HOSPITALIZATION' ? 'HL' :
                                      leave.leaveType === 'COMPASSIONATE' ? 'CL' :
                                      leave.leaveType === 'REPLACEMENT' ? 'RL' :
                                      leave.leaveType === 'NO_PAY' ? 'NPL' :
                                      leave.leaveType === 'EMERGENCY' ? 'EL' : 'AL';
                    return (
                      <div key={leave.id} className="flex items-center justify-between text-sm bg-white rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${LEAVE_TYPES[leaveType]?.color}`}>
                            {leaveType}
                          </span>
                          <span className="text-slate-700">{LEAVE_TYPES[leaveType]?.label}</span>
                        </div>
                        <span className="text-slate-600 text-xs">
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Public Holidays Summary */}
            {holidays.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <h3 className="font-bold text-yellow-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">🎉</span> Public Holidays This Month
                </h3>
                <div className="space-y-2">
                  {holidays.map(holiday => (
                    <div key={holiday.id || holiday.date} className="flex items-center justify-between text-sm bg-white rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded text-xs font-bold bg-yellow-100 text-yellow-700">PH</span>
                        <span className="text-slate-700">{holiday.name || 'Public Holiday'}</span>
                      </div>
                      <span className="text-slate-600 text-xs">{new Date(holiday.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {leaves.length === 0 && holidays.length === 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                <p className="text-slate-600">No approved leaves or public holidays scheduled for {monthName}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
