'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { workflowsApi } from '@/lib/api-client';
import {
  GitBranch, Play, CheckCircle, XCircle, Clock, RefreshCw,
  Pause, RotateCcw, Ban, AlertTriangle, ShieldCheck, X, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';

type WorkflowRun = {
  id: string;
  businessId: string;
  workflowType: string;
  status: string;
  isPaused: boolean;
  pauseReason?: string;
  pausedAt?: string;
  overrideNote?: string;
  overriddenBy?: string;
  overriddenAt?: string;
  retryCount: number;
  errorMessage?: string;
  inputData?: Record<string, unknown>;
  outputData?: Record<string, unknown>;
  createdAt: string;
  completedAt?: string;
  startedAt?: string;
};

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  QUEUED:    { icon: Clock,       color: 'text-yellow-600',  bg: 'bg-yellow-50 border-yellow-200',  label: 'Queued'    },
  RUNNING:   { icon: RefreshCw,   color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200',      label: 'Running'   },
  SUCCESS:   { icon: CheckCircle, color: 'text-green-600',   bg: 'bg-green-50 border-green-200',    label: 'Success'   },
  COMPLETED: { icon: CheckCircle, color: 'text-green-600',   bg: 'bg-green-50 border-green-200',    label: 'Completed' },
  FAILED:    { icon: XCircle,     color: 'text-red-600',     bg: 'bg-red-50 border-red-200',        label: 'Failed'    },
  PAUSED:    { icon: Pause,       color: 'text-orange-600',  bg: 'bg-orange-50 border-orange-200',  label: 'Paused'    },
  RETRYING:  { icon: RotateCcw,   color: 'text-purple-600',  bg: 'bg-purple-50 border-purple-200',  label: 'Retrying'  },
  CANCELLED: { icon: Ban,         color: 'text-gray-500',    bg: 'bg-gray-50 border-gray-200',      label: 'Cancelled' },
};

function duration(start?: string, end?: string) {
  if (!start || !end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60000)}m`;
}

function formatType(type: string) {
  return type?.replace(/_/g, ' ') ?? '—';
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function RunDetailDrawer({ run, onClose }: { run: WorkflowRun; onClose: () => void }) {
  const cfg = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.QUEUED;
  const StatusIcon = cfg.icon;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-brand-600" />
            <h2 className="font-bold text-gray-900">Workflow Run Details</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
            <div className="flex-1">
              <p className="text-xs text-gray-400">Run ID</p>
              <p className="font-mono text-sm font-semibold text-gray-800">{run.businessId ?? run.id.slice(0, 8)}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
              <StatusIcon className="w-3 h-3" />
              {cfg.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Workflow Type</p>
              <p className="text-sm font-semibold text-gray-800">{formatType(run.workflowType)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Retries</p>
              <p className="text-sm font-semibold text-gray-800">{run.retryCount}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Started At</p>
              <p className="text-xs text-gray-600">{run.startedAt ? format(new Date(run.startedAt), 'dd MMM yyyy HH:mm:ss') : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Completed At</p>
              <p className="text-xs text-gray-600">{run.completedAt ? format(new Date(run.completedAt), 'dd MMM yyyy HH:mm:ss') : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Duration</p>
              <p className="text-sm font-semibold text-gray-800">{duration(run.startedAt, run.completedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Created</p>
              <p className="text-xs text-gray-600">{format(new Date(run.createdAt), 'dd MMM yyyy HH:mm')}</p>
            </div>
          </div>

          {run.isPaused && (
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-orange-700">Pause Info</p>
              {run.pausedAt && <p className="text-xs text-gray-600">Paused at: {format(new Date(run.pausedAt), 'dd MMM HH:mm:ss')}</p>}
              {run.pauseReason && <p className="text-xs text-gray-600">Reason: {run.pauseReason}</p>}
            </div>
          )}

          {run.overrideNote && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-yellow-700">Admin Override</p>
              <p className="text-xs text-gray-600">By: {run.overriddenBy}</p>
              {run.overriddenAt && <p className="text-xs text-gray-600">At: {format(new Date(run.overriddenAt), 'dd MMM HH:mm:ss')}</p>}
              <p className="text-xs text-gray-600">Note: {run.overrideNote}</p>
            </div>
          )}

          {run.errorMessage && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Failure Reason</p>
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-700">{run.errorMessage}</div>
            </div>
          )}

          {run.inputData && Object.keys(run.inputData).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Input Payload</p>
              <pre className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(run.inputData, null, 2)}
              </pre>
            </div>
          )}

          {run.outputData && Object.keys(run.outputData).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Output Payload</p>
              <pre className="bg-green-50 border border-green-100 rounded-lg p-3 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(run.outputData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Confirmation Dialog ──────────────────────────────────────────────────────

function ConfirmDialog({
  title, message, confirmLabel, confirmClass, onConfirm, onCancel, children,
}: {
  title: string; message: string; confirmLabel: string; confirmClass?: string;
  onConfirm: () => void; onCancel: () => void; children?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">{message}</p>
        {children}
        <div className="flex gap-3 mt-4">
          <button onClick={onConfirm} className={`flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${confirmClass ?? 'bg-brand-600 hover:bg-brand-700'}`}>
            {confirmLabel}
          </button>
          <button onClick={onCancel} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN';

  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [detailRun, setDetailRun] = useState<WorkflowRun | null>(null);

  // Confirm dialogs
  const [pauseTarget, setPauseTarget] = useState<WorkflowRun | null>(null);
  const [resumeTarget, setResumeTarget] = useState<WorkflowRun | null>(null);
  const [retryTarget, setRetryTarget] = useState<WorkflowRun | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<WorkflowRun | null>(null);
  const [overrideNote, setOverrideNote] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    workflowsApi.list(statusFilter ? { status: statusFilter } : undefined)
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.data ?? [];
        setRuns(list);
        setTotal(data?.meta?.total ?? list.length);
      })
      .catch(() => toast.error('Failed to load workflow runs'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [statusFilter]);

  const doAction = async (action: () => Promise<any>, successMsg: string) => {
    setActionLoading(action.toString());
    try {
      await action();
      toast.success(successMsg);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-500 text-sm mt-1">
            Monitor automation runs · pause, resume, retry, or manually override
            {total > 0 && <span className="ml-2 text-brand-600 font-semibold">{total} total</span>}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {['', 'QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'PAUSED', 'RETRYING', 'CANCELLED'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              statusFilter === s ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400'
            }`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Confirmation Dialogs */}
      {pauseTarget && (
        <ConfirmDialog
          title="Pause Workflow Run" confirmLabel="Pause Run" confirmClass="bg-orange-600 hover:bg-orange-700"
          message={`Pause run ${pauseTarget.businessId ?? pauseTarget.id.slice(0, 8)}? It can be resumed later.`}
          onConfirm={() => { doAction(() => workflowsApi.pause(pauseTarget.id, 'Manually paused by admin'), 'Run paused'); setPauseTarget(null); }}
          onCancel={() => setPauseTarget(null)}
        />
      )}
      {resumeTarget && (
        <ConfirmDialog
          title="Resume Workflow Run" confirmLabel="Resume Run" confirmClass="bg-green-600 hover:bg-green-700"
          message={`Resume paused run ${resumeTarget.businessId ?? resumeTarget.id.slice(0, 8)}?`}
          onConfirm={() => { doAction(() => workflowsApi.resume(resumeTarget.id), 'Run resumed'); setResumeTarget(null); }}
          onCancel={() => setResumeTarget(null)}
        />
      )}
      {retryTarget && (
        <ConfirmDialog
          title="Retry Workflow Run" confirmLabel="Retry Run" confirmClass="bg-blue-600 hover:bg-blue-700"
          message={`Retry run ${retryTarget.businessId ?? retryTarget.id.slice(0, 8)}? The run will be re-queued.`}
          onConfirm={() => { doAction(() => workflowsApi.retry(retryTarget.id), 'Run queued for retry'); setRetryTarget(null); }}
          onCancel={() => setRetryTarget(null)}
        />
      )}
      {overrideTarget && (
        <ConfirmDialog
          title="Admin Manual Override" confirmLabel="Apply Override" confirmClass="bg-orange-600 hover:bg-orange-700"
          message="This override will be permanently recorded in the audit log. Provide a business justification:"
          onConfirm={() => {
            if (!overrideNote.trim()) return toast.error('Override reason is required');
            doAction(() => workflowsApi.override(overrideTarget.id, overrideNote, 'QUEUED'), 'Override applied');
            setOverrideTarget(null);
            setOverrideNote('');
          }}
          onCancel={() => { setOverrideTarget(null); setOverrideNote(''); }}
        >
          <textarea
            value={overrideNote}
            onChange={e => setOverrideNote(e.target.value)}
            placeholder="e.g. Client approved re-processing; false-positive duplicate…"
            className="w-full border border-gray-200 rounded-lg p-3 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </ConfirmDialog>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : runs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No workflow runs found</p>
          <p className="text-xs mt-1">Runs will appear here when automations execute</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Run ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Workflow Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Started</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Duration</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Retries</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {runs.map((run) => {
                  const cfg = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.QUEUED;
                  const StatusIcon = cfg.icon;
                  return (
                    <tr key={run.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-500">{run.businessId ?? run.id.slice(0, 8)}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-4 h-4 text-gray-400 shrink-0" />
                          {formatType(run.workflowType)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
                          <StatusIcon className={`w-3 h-3 ${run.status === 'RUNNING' || run.status === 'RETRYING' ? 'animate-spin' : ''}`} />
                          {cfg.label}
                        </span>
                        {run.isPaused && run.pauseReason && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-orange-500">
                            <AlertTriangle className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">{run.pauseReason}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {run.createdAt ? formatDistanceToNow(new Date(run.createdAt), { addSuffix: true }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {duration(run.startedAt, run.completedAt)}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-400">
                        {run.retryCount > 0 ? <span className="text-orange-500 font-semibold">{run.retryCount}</span> : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {isAdmin && (
                          <div className="flex gap-1.5">
                            {(run.status === 'QUEUED' || run.status === 'RUNNING') && (
                              <button onClick={() => setPauseTarget(run)} title="Pause"
                                className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors">
                                <Pause className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {run.status === 'PAUSED' && (
                              <button onClick={() => setResumeTarget(run)} title="Resume"
                                className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {(run.status === 'FAILED' || run.status === 'PAUSED') && (
                              <button onClick={() => setRetryTarget(run)} title="Retry"
                                className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {run.status !== 'SUCCESS' && run.status !== 'CANCELLED' && (
                              <button onClick={() => setOverrideTarget(run)} title="Admin Manual Override"
                                className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-yellow-50 hover:text-yellow-700 transition-colors">
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setDetailRun(run)} className="p-1 rounded hover:bg-gray-100 transition-colors">
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detailRun && <RunDetailDrawer run={detailRun} onClose={() => setDetailRun(null)} />}
    </div>
  );
}
