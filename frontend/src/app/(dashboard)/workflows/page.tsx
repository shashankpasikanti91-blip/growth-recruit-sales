'use client';
import { useEffect, useState } from 'react';
import { GitBranch, Play, CheckCircle, XCircle, Clock, RefreshCw, Pause, RotateCcw, Ban, AlertTriangle, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

type WorkflowRun = {
  id: string;
  businessId: string;
  workflowType: string;
  status: string;
  isPaused: boolean;
  pauseReason?: string;
  overrideNote?: string;
  overriddenBy?: string;
  retryCount: number;
  errorMessage?: string;
  inputData?: Record<string, unknown>;
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

export default function WorkflowsPage() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [total, setTotal]  = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [overrideId, setOverrideId] = useState<string | null>(null);
  const [overrideNote, setOverrideNote] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const params = statusFilter ? `?status=${statusFilter}` : '';
    api.get(`/workflows/runs${params}`).then(({ data }) => {
      const list = Array.isArray(data) ? data : data?.data ?? [];
      setRuns(list);
      setTotal(data?.meta?.total ?? list.length);
    }).catch(() => toast.error('Failed to load workflow runs')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [statusFilter]);

  const runAction = async (id: string, action: string, body?: object) => {
    setActionLoading(id + action);
    try {
      await api.patch(`/workflows/runs/${id}/${action}`, body ?? {});
      toast.success(`Run ${action}d successfully`);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? `Failed to ${action} run`);
    } finally {
      setActionLoading(null);
    }
  };

  const submitOverride = async () => {
    if (!overrideId || !overrideNote.trim()) return;
    setActionLoading(overrideId + 'override');
    try {
      await api.post(`/workflows/runs/${overrideId}/override`, {
        note: overrideNote,
        forceStatus: 'QUEUED',
      });
      toast.success('Manual override applied and run re-queued');
      setOverrideId(null);
      setOverrideNote('');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Override failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-500 text-sm mt-1">
            Monitor automation runs · pause, resume, retry, or manually override
            {total > 0 && <span className="ml-2 text-brand-600 font-semibold">{total} total</span>}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {['', 'QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'PAUSED', 'RETRYING', 'CANCELLED'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              statusFilter === s
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Override modal */}
      {overrideId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-orange-500" />
              <h3 className="font-bold text-gray-900">Admin Manual Override</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              This action will force re-queue the run and is permanently recorded in the audit log.
              Provide a business justification.
            </p>
            <textarea
              value={overrideNote}
              onChange={e => setOverrideNote(e.target.value)}
              placeholder="e.g. Client approved re-processing; duplicate was false-positive..."
              className="w-full border border-gray-200 rounded-lg p-3 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={submitOverride}
                disabled={!overrideNote.trim() || actionLoading === overrideId + 'override'}
                className="flex-1 bg-orange-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                Apply Override
              </button>
              <button
                onClick={() => { setOverrideId(null); setOverrideNote(''); }}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Workflow Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Started</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Retries</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {runs.map((run) => {
                  const cfg = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.QUEUED;
                  const StatusIcon = cfg.icon;
                  const busy = (s: string) => actionLoading === run.id + s;
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
                        {new Date(run.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {duration(run.startedAt, run.completedAt)}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-400">
                        {run.retryCount > 0 ? <span className="text-orange-500 font-semibold">{run.retryCount}</span> : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 max-w-[160px]">
                        {run.overrideNote
                          ? <span className="text-orange-600" title={run.overrideNote}>⚡ {run.overrideNote.slice(0, 50)}</span>
                          : run.errorMessage
                          ? <span className="text-red-400" title={run.errorMessage}>{run.errorMessage.slice(0, 50)}</span>
                          : '—'
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {/* Pause — only for QUEUED/RUNNING */}
                          {(run.status === 'QUEUED' || run.status === 'RUNNING') && (
                            <button
                              onClick={() => runAction(run.id, 'pause', { reason: 'Manually paused by admin' })}
                              disabled={!!busy('pause')}
                              title="Pause"
                              className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 disabled:opacity-40 transition-colors"
                            >
                              <Pause className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* Resume — only for PAUSED */}
                          {run.status === 'PAUSED' && (
                            <button
                              onClick={() => runAction(run.id, 'resume')}
                              disabled={!!busy('resume')}
                              title="Resume"
                              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-40 transition-colors"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* Retry — for FAILED/PAUSED */}
                          {(run.status === 'FAILED' || run.status === 'PAUSED') && (
                            <button
                              onClick={() => runAction(run.id, 'retry')}
                              disabled={!!busy('retry')}
                              title="Retry"
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-40 transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* Override — admin superpower */}
                          {run.status !== 'SUCCESS' && run.status !== 'CANCELLED' && (
                            <button
                              onClick={() => setOverrideId(run.id)}
                              title="Admin Manual Override"
                              className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-yellow-50 hover:text-yellow-700 transition-colors"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
