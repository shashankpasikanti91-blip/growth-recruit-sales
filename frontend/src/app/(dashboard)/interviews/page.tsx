'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { interviewsApi, submissionsApi } from '@/lib/api-client';
import { format } from 'date-fns';
import { Calendar, Users, Plus, X, Star, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { TableWrapper } from '@/components/ui/table-wrapper';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const INTERVIEW_STATUSES = ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
const INTERVIEW_MODES    = ['VIDEO', 'IN_PERSON', 'PHONE', 'PANEL'];
const RESULTS            = ['PASS', 'FAIL', 'HOLD'];

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED:   'bg-blue-50 text-blue-700',
  CONFIRMED:   'bg-cyan-50 text-cyan-700',
  RESCHEDULED: 'bg-amber-50 text-amber-700',
  COMPLETED:   'bg-emerald-50 text-emerald-700',
  CANCELLED:   'bg-red-50 text-red-700',
  NO_SHOW:     'bg-orange-50 text-orange-700',
};

const MODE_COLORS: Record<string, string> = {
  VIDEO:     'bg-purple-50 text-purple-700',
  IN_PERSON: 'bg-green-50 text-green-700',
  PHONE:     'bg-blue-50 text-blue-700',
  PANEL:     'bg-indigo-50 text-indigo-700',
};

const RESULT_COLORS: Record<string, string> = {
  PASS: 'bg-emerald-50 text-emerald-700',
  FAIL: 'bg-red-50 text-red-700',
  HOLD: 'bg-amber-50 text-amber-700',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function StarRating({ value }: { value?: number | null }) {
  if (!value) return <span className="text-gray-300 text-xs">—</span>;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
      ))}
    </div>
  );
}

// ─── Schedule Modal ───────────────────────────────────────────────────────────

function ScheduleModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    submissionId: '',
    candidateId: '',
    jobId: '',
    clientId: '' as string | undefined,
    round: 1,
    mode: 'VIDEO',
    scheduledAt: '',
    meetingLink: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const { data: subsData } = useQuery({
    queryKey: ['submissions-for-interview'],
    queryFn: () => submissionsApi.list({ limit: 100 }),
  });
  const submissions: any[] = subsData?.items ?? [];

  const submit = async () => {
    if (!form.submissionId || !form.scheduledAt || !form.candidateId || !form.jobId) {
      toast.error('Submission and scheduled date are required');
      return;
    }
    setLoading(true);
    try {
      await interviewsApi.create({
        submissionId: form.submissionId,
        candidateId: form.candidateId,
        jobId: form.jobId,
        clientId: form.clientId || undefined,
        round: Number(form.round),
        mode: form.mode,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        meetingLink: form.meetingLink || undefined,
        notes: form.notes || undefined,
      });
      toast.success('Interview scheduled!');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to schedule interview');
    } finally {
      setLoading(false);
    }
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-lg">Schedule Interview</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Submission *</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.submissionId}
              onChange={e => {
                const sid = e.target.value;
                const sub = submissions.find((s: any) => s.id === sid);
                setForm(f => ({
                  ...f,
                  submissionId: sid,
                  candidateId: sub?.candidateId ?? '',
                  jobId: sub?.jobId ?? '',
                  clientId: sub?.clientId ?? undefined,
                }));
              }}
            >
              <option value="">Select submission…</option>
              {submissions.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.candidate?.firstName} {s.candidate?.lastName} → {s.job?.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Round</label>
              <input
                type="number" min={1} max={10}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.round}
                onChange={e => set('round', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mode</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.mode}
                onChange={e => set('mode', e.target.value)}
              >
                {INTERVIEW_MODES.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Scheduled Date & Time *</label>
            <input
              type="datetime-local"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.scheduledAt}
              onChange={e => set('scheduledAt', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Meeting Link</label>
            <input
              type="url"
              placeholder="https://meet.google.com/…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.meetingLink}
              onChange={e => set('meetingLink', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={2}
              placeholder="Pre-interview notes…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button
            onClick={submit}
            disabled={loading}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Scheduling…' : 'Schedule Interview'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Feedback Modal ───────────────────────────────────────────────────────────

function FeedbackModal({ interview, onClose, onSaved }: { interview: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    status: 'COMPLETED',
    result: interview.result ?? '',
    rating: interview.rating ?? 0,
    feedback: interview.feedback ?? '',
    notes: interview.notes ?? '',
  });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await interviewsApi.update(interview.id, {
        status: form.status,
        result: form.result || undefined,
        rating: form.rating || undefined,
        feedback: form.feedback || undefined,
        notes: form.notes || undefined,
      });
      toast.success('Feedback saved!');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to save feedback');
    } finally {
      setLoading(false);
    }
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">Interview Feedback</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {interview.candidate?.firstName} {interview.candidate?.lastName} — Round {interview.round}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.status}
                onChange={e => set('status', e.target.value)}
              >
                {INTERVIEW_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Result</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.result}
                onChange={e => set('result', e.target.value)}
              >
                <option value="">No result yet</option>
                {RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  onClick={() => set('rating', i)}
                  className={`w-9 h-9 rounded-lg border text-sm font-medium transition-all ${
                    form.rating >= i ? 'bg-amber-400 border-amber-400 text-white' : 'border-gray-200 text-gray-400 hover:border-amber-300'
                  }`}
                >
                  {i}
                </button>
              ))}
              {form.rating > 0 && (
                <button onClick={() => set('rating', 0)} className="text-xs text-gray-400 hover:text-gray-600 ml-1">Clear</button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Interview Feedback</label>
            <textarea
              rows={3}
              placeholder="Interviewer's observations, strengths, concerns…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              value={form.feedback}
              onChange={e => set('feedback', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Internal Notes</label>
            <textarea
              rows={2}
              placeholder="Internal notes (not shared outside)…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button
            onClick={submit}
            disabled={loading}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Save Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InterviewsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showSchedule, setShowSchedule] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['interviews', statusFilter, page],
    queryFn: () => interviewsApi.list({ status: statusFilter || undefined, page, limit: 20 }),
    placeholderData: (prev: any) => prev,
  });

  const { data: statsData } = useQuery({
    queryKey: ['interviews-stats'],
    queryFn: interviewsApi.stats,
  });

  const items: any[]  = data?.items ?? data ?? [];
  const total: number = data?.total ?? 0;
  const pages: number = data?.pages ?? 1;
  const stats: any    = statsData ?? {};

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['interviews'] });
    queryClient.invalidateQueries({ queryKey: ['interviews-stats'] });
  };

  const fmt = (d?: string | null) => d ? format(new Date(d), 'dd MMM yyyy, HH:mm') : '—';
  const fmtShort = (d?: string | null) => d ? format(new Date(d), 'dd MMM yyyy') : '—';

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Interviews</h1>
            <p className="text-sm text-gray-500">Schedule and track all candidate interviews</p>
          </div>
        </div>
        <button
          onClick={() => setShowSchedule(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" /> Schedule Interview
        </button>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {INTERVIEW_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(statusFilter === s ? '' : s); setPage(1); }}
            className={`p-3 rounded-xl border text-left transition-all ${
              statusFilter === s ? 'border-indigo-400 bg-indigo-50 shadow-sm' : 'border-gray-200 bg-white hover:border-indigo-200'
            }`}
          >
            <div className="text-lg font-bold text-gray-900">{stats[s.toLowerCase()] ?? 0}</div>
            <div className={`text-xs mt-0.5 px-2 py-0.5 rounded-full w-fit font-medium ${STATUS_COLORS[s]}`}>
              {s.replace(/_/g, ' ')}
            </div>
          </button>
        ))}
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setStatusFilter(''); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              statusFilter === '' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
            }`}
          >
            All
          </button>
          {INTERVIEW_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s === statusFilter ? '' : s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                statusFilter === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        {statusFilter && (
          <button onClick={() => setStatusFilter('')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <TableWrapper loading={isLoading} empty={items.length === 0} emptyMessage="No interviews found">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Candidate', 'Job / Client', 'Round', 'Mode', 'Scheduled', 'Status', 'Result', 'Rating', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((iv: any) => (
              <tr key={iv.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">
                    {iv.candidate?.firstName} {iv.candidate?.lastName}
                  </div>
                  {iv.candidate?.currentTitle && (
                    <div className="text-xs text-gray-500 mt-0.5">{iv.candidate.currentTitle}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="text-gray-800 font-medium">{iv.job?.title}</div>
                  <div className="text-xs text-gray-500">{iv.job?.client?.name ?? iv.client?.name ?? '—'}</div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 text-gray-700 text-sm font-bold">
                    R{iv.round}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${MODE_COLORS[iv.mode] ?? 'bg-gray-100 text-gray-600'}`}>
                    {iv.mode?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">
                  {fmt(iv.scheduledAt)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={iv.status} />
                </td>
                <td className="px-4 py-3">
                  {iv.result ? (
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${RESULT_COLORS[iv.result] ?? 'bg-gray-100 text-gray-600'}`}>
                      {iv.result}
                    </span>
                  ) : <span className="text-gray-300 text-xs">—</span>}
                </td>
                <td className="px-4 py-3">
                  <StarRating value={iv.rating} />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setFeedbackTarget(iv)}
                    className="px-3 py-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    {iv.status === 'COMPLETED' ? 'Edit' : 'Feedback'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrapper>

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{total} total interviews</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="px-3 py-1.5 font-medium">{page} / {pages}</span>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showSchedule && (
        <ScheduleModal onClose={() => setShowSchedule(false)} onSaved={invalidate} />
      )}
      {feedbackTarget && (
        <FeedbackModal
          interview={feedbackTarget}
          onClose={() => setFeedbackTarget(null)}
          onSaved={invalidate}
        />
      )}
    </div>
  );
}
