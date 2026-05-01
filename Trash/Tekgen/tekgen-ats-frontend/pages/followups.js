'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import apiClient from '../lib/api';
import { useRole } from '../lib/useRole';
import {
  Plus, CheckCircle2, Clock, AlertTriangle, CalendarClock,
  Briefcase, X, Trash2, ChevronDown
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function bucketLabel(bucket) {
  const map = { overdue: 'Overdue', today: 'Due Today', upcoming: 'Upcoming', done: 'Completed' };
  return map[bucket] ?? bucket;
}

function bucketStyle(bucket) {
  return {
    overdue:  'text-red-600 bg-red-50 border-red-200',
    today:    'text-amber-700 bg-amber-50 border-amber-200',
    upcoming: 'text-brand-700 bg-brand-50 border-brand-200',
    done:     'text-emerald-700 bg-emerald-50 border-emerald-200',
  }[bucket] ?? 'text-slate-600 bg-slate-50 border-slate-200';
}

function FollowUpCard({ item, onMarkDone, onDelete, onUpdate }) {
  const bucket = item.bucket;
  const [expanded, setExpanded] = useState(false);
  const [editNote, setEditNote] = useState(item.note);
  const [editDue, setEditDue] = useState(item.dueDate ? item.dueDate.split('T')[0] : '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(item.id, { note: editNote.trim(), dueDate: editDue });
      setExpanded(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`rounded-xl border transition-all ${
      item.status === 'DONE' ? 'bg-slate-50 opacity-70' : 'bg-white hover:shadow-sm'
    } ${bucket === 'overdue' ? 'border-red-200' : 'border-slate-100'}`}>

      {/* Main row — clickable to expand */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-start gap-3 p-4 w-full text-left"
      >
        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
          bucket === 'overdue' ? 'bg-red-500' :
          bucket === 'today'   ? 'bg-amber-500' :
          bucket === 'done'    ? 'bg-emerald-500' : 'bg-brand-400'
        }`} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800">{item.note}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            {item.job && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Briefcase size={11} />
                {item.job.title}
                {item.job.displayId && <span className="font-mono text-slate-300">({item.job.displayId})</span>}
              </span>
            )}
            {item.application?.candidate && (
              <span className="text-xs text-slate-400">
                {item.application.candidate.firstName} {item.application.candidate.lastName}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock size={11} />
              {formatDate(item.dueDate)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {item.status !== 'DONE' && (
            <button onClick={() => onMarkDone(item.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
              title="Mark done">
              <CheckCircle2 size={16} />
            </button>
          )}
          <button onClick={() => onDelete(item.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
            title="Delete">
            <Trash2 size={14} />
          </button>
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${expanded ? '' : '-rotate-90'}`} />
        </div>
      </button>

      {/* Expanded edit panel */}
      {expanded && item.status !== 'DONE' && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Note</label>
            <textarea
              className="form-input resize-none h-16 text-sm"
              value={editNote}
              onChange={e => setEditNote(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Due Date</label>
            <input type="date" className="form-input text-sm" value={editDue} onChange={e => setEditDue(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setExpanded(false)} className="btn-ghost text-xs py-1.5 px-3">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className="btn-primary text-xs py-1.5 px-3">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddFollowUpForm({ jobs, onCreated, onCancel }) {
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [jobId, setJobId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!note.trim() || !dueDate) { setError('Note and due date are required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await apiClient.post('/api/followups', {
        note: note.trim(),
        dueDate,
        jobId: jobId || null,
      });
      onCreated(res.data.data);
      setNote(''); setDueDate(''); setJobId('');
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to create follow-up');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-5 border-2 border-brand-200 bg-brand-50/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title text-brand-700">New Follow-up</h3>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <X size={18} />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-slate-600 mb-1 block">Note *</label>
          <textarea
            className="form-input resize-none h-20"
            placeholder="What needs to be followed up on?"
            value={note}
            onChange={e => setNote(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Due Date *</label>
          <input type="date" className="form-input" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Linked JD (optional)</label>
          <select className="form-input" value={jobId} onChange={e => setJobId(e.target.value)}>
            <option value="">— None —</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.title} {j.displayId ? `(${j.displayId})` : ''}</option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      <div className="flex gap-2 mt-4 justify-end">
        <button type="button" onClick={onCancel} className="btn-ghost text-sm">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary text-sm">
          {saving ? 'Saving…' : 'Add Follow-up'}
        </button>
      </div>
    </form>
  );
}

// ── Bucket section ────────────────────────────────────────────────────────────

function BucketSection({ bucket, items, onMarkDone, onDelete, onUpdate, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  if (items.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full mb-2 group"
      >
        <span className={`status-badge border ${bucketStyle(bucket)}`}>{bucketLabel(bucket)}</span>
        <span className="text-xs text-slate-400 font-medium">{items.length}</span>
        <ChevronDown size={14} className={`text-slate-400 ml-auto transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="space-y-2">
          {items.map(item => (
            <FollowUpCard key={item.id} item={item} onMarkDone={onMarkDone} onDelete={onDelete} onUpdate={onUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FollowupsPage() {
  const { isAdmin } = useRole();
  const [grouped, setGrouped] = useState({ overdue: [], today: [], upcoming: [], done: [] });
  const [total, setTotal] = useState(0);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchFollowUps = useCallback(async () => {
    try {
      const [fuRes, jobsRes] = await Promise.all([
        apiClient.get('/api/followups'),
        apiClient.get('/api/jobs?status=OPEN&limit=50').catch(() => null),
      ]);
      const { grouped: g, total: t } = fuRes.data.data;
      setGrouped({
        overdue:  (g?.overdue  ?? []).map(f => ({ ...f, bucket: 'overdue' })),
        today:    (g?.today    ?? []).map(f => ({ ...f, bucket: 'today' })),
        upcoming: (g?.upcoming ?? []).map(f => ({ ...f, bucket: 'upcoming' })),
        done:     (g?.done     ?? []).map(f => ({ ...f, bucket: 'done' })),
      });
      setTotal(t ?? 0);
      const rawJobs = jobsRes?.data?.data?.jobs ?? jobsRes?.data?.data ?? [];
      setJobs(Array.isArray(rawJobs) ? rawJobs : []);
    } catch {
      // silent fail — page still renders with empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFollowUps(); }, [fetchFollowUps]);

  const handleMarkDone = async (id) => {
    try {
      await apiClient.patch(`/api/followups/${id}`, { status: 'DONE' });
      fetchFollowUps();
    } catch { /* ignore */ }
  };

  const handleUpdate = async (id, data) => {
    try {
      await apiClient.patch(`/api/followups/${id}`, data);
      fetchFollowUps();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this follow-up?')) return;
    try {
      await apiClient.delete(`/api/followups/${id}`);
      fetchFollowUps();
    } catch { /* ignore */ }
  };

  const handleCreated = () => {
    setShowForm(false);
    fetchFollowUps();
  };

  const overdueCount = grouped.overdue.length;
  const todayCount = grouped.today.length;
  const upcomingCount = grouped.upcoming.length;
  const doneCount = grouped.done.length;
  const isEmpty = overdueCount + todayCount + upcomingCount + doneCount === 0;

  return (
    <DashboardLayout title="Follow-ups">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Follow-ups</h2>
            <p className="text-sm text-slate-500 mt-0.5">Stay on top of pending actions and candidate touchpoints</p>
          </div>
          <button onClick={() => setShowForm(v => !v)} className="btn-primary text-sm">
            <Plus size={15} /> New Follow-up
          </button>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Overdue', count: overdueCount,  cls: 'text-red-600 bg-red-50 border-red-100',    icon: AlertTriangle },
            { label: 'Due Today', count: todayCount,  cls: 'text-amber-700 bg-amber-50 border-amber-100', icon: CalendarClock },
            { label: 'Upcoming', count: upcomingCount, cls: 'text-brand-700 bg-brand-50 border-brand-100', icon: Clock },
            { label: 'Done',     count: doneCount,     cls: 'text-emerald-700 bg-emerald-50 border-emerald-100', icon: CheckCircle2 },
          ].map(({ label, count, cls, icon: Icon }) => (
            <div key={label} className={`card border p-3 text-center ${cls}`}>
              <Icon size={16} className="mx-auto mb-1" />
              <p className="text-xl font-bold">{count}</p>
              <p className="text-xs font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Add form */}
        {showForm && (
          <AddFollowUpForm
            jobs={jobs}
            onCreated={handleCreated}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Loading follow-ups...</p>
            </div>
          </div>
        ) : isEmpty ? (
          <div className="card p-12 text-center">
            <CheckCircle2 size={40} className="text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">You're all caught up!</p>
            <p className="text-sm text-slate-400 mt-1">No pending follow-ups at the moment.</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mt-4 text-sm">
              <Plus size={14} /> Add one now
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <BucketSection bucket="overdue"  items={grouped.overdue}  onMarkDone={handleMarkDone} onDelete={handleDelete} onUpdate={handleUpdate} defaultOpen={true} />
            <BucketSection bucket="today"    items={grouped.today}    onMarkDone={handleMarkDone} onDelete={handleDelete} onUpdate={handleUpdate} defaultOpen={true} />
            <BucketSection bucket="upcoming" items={grouped.upcoming} onMarkDone={handleMarkDone} onDelete={handleDelete} onUpdate={handleUpdate} defaultOpen={true} />
            <BucketSection bucket="done"     items={grouped.done}     onMarkDone={handleMarkDone} onDelete={handleDelete} onUpdate={handleUpdate} defaultOpen={false} />
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
