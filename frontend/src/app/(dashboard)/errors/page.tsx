'use client';
import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Clock, Server, ChevronDown, ChevronRight } from 'lucide-react';
import api from '@/lib/api';

type AppError = {
  id: string;
  level: 'ERROR' | 'WARN' | 'INFO';
  message: string;
  context?: string;
  stack?: string;
  createdAt: string;
};

const LEVEL_STYLES: Record<string, string> = {
  ERROR: 'bg-red-50 border-red-200 text-red-700',
  WARN: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  INFO: 'bg-blue-50 border-blue-200 text-blue-700',
};

export default function ErrorsPage() {
  const [errors, setErrors] = useState<AppError[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<string>('ALL');

  const load = () => {
    setLoading(true);
    api.get('/audit?type=error').then(({ data }) => {
      setErrors(Array.isArray(data) ? data : data?.data ?? []);
    }).catch(() => setErrors([])).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = levelFilter === 'ALL' ? errors : errors.filter((e) => e.level === levelFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Error Logs</h1>
          <p className="text-gray-500 text-sm mt-1">Application errors and warnings</p>
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

      {/* Level filter */}
      <div className="flex gap-2">
        {['ALL', 'ERROR', 'WARN', 'INFO'].map((l) => (
          <button
            key={l}
            onClick={() => setLevelFilter(l)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              levelFilter === l ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Server className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{errors.length === 0 ? 'No errors logged — all systems healthy!' : 'No entries match this filter'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <div
              key={e.id}
              className={`rounded-xl border p-4 ${LEVEL_STYLES[e.level] ?? LEVEL_STYLES.INFO}`}
            >
              <button
                className="w-full flex items-start justify-between gap-3 text-left"
                onClick={() => setExpanded(expanded === e.id ? null : e.id)}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{e.message}</div>
                    {e.context && (
                      <div className="text-xs opacity-70 mt-0.5">{e.context}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs opacity-60 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(e.createdAt).toLocaleString()}
                  </span>
                  {expanded === e.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </button>
              {expanded === e.id && e.stack && (
                <pre className="mt-3 text-xs overflow-x-auto bg-black/5 rounded p-3 whitespace-pre-wrap break-all">
                  {e.stack}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
