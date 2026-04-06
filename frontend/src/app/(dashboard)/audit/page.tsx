'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';
import { Shield, ChevronRight, X, Search, Filter, User, Clock, Tag, Info } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

// ─── Types ──────────────────────────────────────────────────────────────────

type AuditEntry = {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId?: string;
  tenantId: string;
  ipAddress?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  user?: { id: string; firstName: string; lastName: string; email: string } | null;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  CREATE:         'bg-green-100 text-green-700',
  UPDATE:         'bg-blue-100 text-blue-700',
  DELETE:         'bg-red-100 text-red-700',
  SOFT_DELETE:    'bg-red-100 text-red-700',
  STAGE_CHANGED:  'bg-purple-100 text-purple-700',
  AI_SCREENED:    'bg-indigo-100 text-indigo-700',
  IMPORT_UPLOAD:  'bg-amber-100 text-amber-700',
  IMPORT_COMMIT:  'bg-amber-100 text-amber-700',
  WORKFLOW_PAUSE: 'bg-orange-100 text-orange-700',
  WORKFLOW_RESUME:'bg-teal-100 text-teal-700',
  WORKFLOW_RETRY: 'bg-cyan-100 text-cyan-700',
  OVERRIDE:       'bg-rose-100 text-rose-700',
  LOGIN:          'bg-gray-100 text-gray-600',
  LOGOUT:         'bg-gray-100 text-gray-600',
};

const ENTITY_TYPES = ['', 'Candidate', 'Lead', 'Application', 'Job', 'Company', 'Contact', 'Document', 'SourceImport', 'WorkflowRun', 'Integration'];
const ACTIONS = ['', 'CREATE', 'UPDATE', 'DELETE', 'STAGE_CHANGED', 'AI_SCREENED', 'IMPORT_UPLOAD', 'IMPORT_COMMIT', 'WORKFLOW_PAUSE', 'WORKFLOW_RESUME', 'WORKFLOW_RETRY', 'OVERRIDE', 'LOGIN'];

function actionBadge(action: string) {
  const cls = ACTION_COLORS[action] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>
      {action}
    </span>
  );
}

// ─── Detail Drawer ───────────────────────────────────────────────────────────

function DetailDrawer({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-600" />
            <h2 className="font-bold text-gray-900">Audit Entry</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Action</p>
              {actionBadge(entry.action)}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Entity Type</p>
              <p className="text-sm font-semibold text-gray-800">{entry.entityType}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Entity ID</p>
              <p className="text-xs font-mono text-gray-600 break-all">{entry.entityId ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Timestamp</p>
              <p className="text-xs text-gray-600">{format(new Date(entry.createdAt), 'dd MMM yyyy HH:mm:ss')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Actor</p>
              {entry.user ? (
                <div>
                  <p className="text-sm font-medium text-gray-800">{entry.user.firstName} {entry.user.lastName}</p>
                  <p className="text-xs text-gray-400">{entry.user.email}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">System / Unknown</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Source IP</p>
              <p className="text-xs font-mono text-gray-600">{entry.ipAddress ?? '—'}</p>
            </div>
          </div>

          {/* Before / After */}
          {entry.oldValue && Object.keys(entry.oldValue).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Before</p>
              <pre className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(entry.oldValue, null, 2)}
              </pre>
            </div>
          )}

          {entry.newValue && Object.keys(entry.newValue).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">After</p>
              <pre className="bg-green-50 border border-green-100 rounded-lg p-3 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(entry.newValue, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN';

  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [entityId, setEntityId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', entityType, action, entityId, from, to, page],
    queryFn: () => auditApi.list({
      entityType: entityType || undefined,
      action: action || undefined,
      entityId: entityId || undefined,
      from: from || undefined,
      to: to || undefined,
      page,
      limit: 50,
    }),
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Shield className="w-12 h-12 mb-3 opacity-30" />
        <p className="font-semibold">Access Restricted</p>
        <p className="text-sm">Audit logs are only visible to Tenant Admins and Super Admins.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-brand-600" />
            Audit Logs
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Complete audit trail of all create, update, delete, stage, and override actions
          </p>
        </div>
        {data?.meta && (
          <span className="text-sm text-gray-400">{data.meta.total.toLocaleString()} entries</span>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            className="input pl-8 text-sm"
            placeholder="Entity ID / businessId"
            value={entityId}
            onChange={e => { setEntityId(e.target.value); setPage(1); }}
          />
        </div>
        <select className="input text-sm" value={entityType} onChange={e => { setEntityType(e.target.value); setPage(1); }}>
          {ENTITY_TYPES.map(t => <option key={t} value={t}>{t || 'All Entity Types'}</option>)}
        </select>
        <select className="input text-sm" value={action} onChange={e => { setAction(e.target.value); setPage(1); }}>
          {ACTIONS.map(a => <option key={a} value={a}>{a || 'All Actions'}</option>)}
        </select>
        <input
          type="date"
          className="input text-sm"
          value={from}
          onChange={e => { setFrom(e.target.value); setPage(1); }}
          placeholder="From"
        />
        <input
          type="date"
          className="input text-sm"
          value={to}
          onChange={e => { setTo(e.target.value); setPage(1); }}
          placeholder="To"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Time</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actor</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Entity</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Entity ID</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">Loading audit logs…</td>
              </tr>
            ) : !data?.data?.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-gray-400">
                  <Shield className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p>No audit entries found for the selected filters</p>
                </td>
              </tr>
            ) : (
              data.data.map((entry: AuditEntry) => (
                <tr
                  key={entry.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelected(entry)}
                >
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                    <div>{format(new Date(entry.createdAt), 'dd MMM HH:mm')}</div>
                    <div className="text-gray-300">{formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}</div>
                  </td>
                  <td className="px-4 py-3">
                    {entry.user ? (
                      <div>
                        <div className="font-medium text-gray-800 text-xs">{entry.user.firstName} {entry.user.lastName}</div>
                        <div className="text-xs text-gray-400">{entry.user.email}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">System</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{actionBadge(entry.action)}</td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-700">{entry.entityType}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 max-w-[160px] truncate">
                    {entry.entityId ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {data?.meta && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-500">
              Page {page} of {data.meta.totalPages} · {data.meta.total} total entries
            </span>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 text-xs rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <button
                className="px-3 py-1 text-xs rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
                disabled={page >= data.meta.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {selected && <DetailDrawer entry={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
