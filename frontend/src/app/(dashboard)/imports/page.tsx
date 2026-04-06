'use client';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { importsApi } from '@/lib/api-client';
import { useDropzone } from 'react-dropzone';
import { Upload, RefreshCw, FileText, AlertCircle, X, ChevronRight, Copy, Check } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'badge-gray',
  PROCESSING: 'badge-blue',
  COMPLETED: 'badge-green',
  FAILED: 'badge-red',
  PARTIAL: 'badge-yellow',
};

const ACCEPT_TYPES = {
  'text/csv': ['.csv'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
};

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function ImportDetailDrawer({ imp, onClose }: { imp: any; onClose: () => void }) {
  const [copiedId, setCopiedId] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(imp.businessId ?? imp.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-600" />
            <h2 className="font-bold text-gray-900">Import Batch Details</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Batch ID */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
            <div className="flex-1">
              <p className="text-xs text-gray-400">Batch ID</p>
              <p className="font-mono text-sm font-semibold text-gray-800">{imp.businessId ?? imp.id.slice(0, 8)}</p>
            </div>
            <button onClick={copy} title="Copy batch ID"
              className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors text-gray-400 hover:text-brand-600">
              {copiedId ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">File Name</p>
              <p className="text-sm font-medium text-gray-800 break-all">{imp.name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Entity Type</p>
              <p className="text-sm font-medium text-gray-800">
                {imp.importType === 'CANDIDATE' ? '👤 Candidates' : '🎯 Leads'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Source</p>
              <p className="text-sm font-medium text-gray-800">{imp.source ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Status</p>
              <span className={STATUS_BADGE[imp.status] ?? 'badge-gray'}>{imp.status}</span>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Uploaded</p>
              <p className="text-xs text-gray-600">
                {imp.createdAt ? format(new Date(imp.createdAt), 'dd MMM yyyy HH:mm') : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Completed</p>
              <p className="text-xs text-gray-600">
                {imp.completedAt ? format(new Date(imp.completedAt), 'dd MMM yyyy HH:mm') : '—'}
              </p>
            </div>
          </div>

          {/* Row stats */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Row Summary</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Rows', value: imp.totalRows ?? 0, color: 'text-gray-700' },
                { label: 'Processed', value: imp.processedRows ?? 0, color: 'text-blue-600' },
                { label: 'Imported', value: imp.importedRows ?? (imp.processedRows - (imp.failedRows ?? 0)), color: 'text-green-600' },
                { label: 'Failed', value: imp.failedRows ?? 0, color: 'text-red-500' },
                { label: 'Duplicates', value: imp.duplicateRows ?? 0, color: 'text-amber-600' },
                { label: 'Skipped', value: imp.skippedRows ?? 0, color: 'text-gray-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Error summary */}
          {imp.errorMessage && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Error Summary</p>
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-700">
                {imp.errorMessage}
              </div>
            </div>
          )}

          {/* Mapping summary */}
          {imp.mappingTemplate && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Column Mapping</p>
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 font-mono">
                Template: {imp.mappingTemplate.name ?? 'Auto-detected'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── New Import Card ──────────────────────────────────────────────────────────

function NewImportCard() {
  const queryClient = useQueryClient();
  const [importType, setImportType] = useState<'candidate' | 'lead'>('candidate');
  const [step, setStep] = useState<'idle' | 'uploading'>('idle');

  const getImportSource = (file: File): string => {
    const name = file.name.toLowerCase();
    if (name.endsWith('.csv')) return 'CSV';
    if (name.match(/\.(xlsx|xls)$/)) return 'EXCEL';
    return 'MANUAL';
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles[0]) return;
      const file = acceptedFiles[0];
      setStep('uploading');
      try {
        const created = await importsApi.create({
          importType,
          source: getImportSource(file),
          name: `${importType === 'candidate' ? 'Candidates' : 'Leads'} — ${file.name}`,
        });
        await importsApi.upload(created.id, file);
        toast.success('File uploaded! Processing started…');
        queryClient.invalidateQueries({ queryKey: ['imports'] });
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? 'Import failed — please try again');
      } finally {
        setStep('idle');
      }
    },
    [importType, queryClient],
  );

  const isUploading = step === 'uploading';
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: ACCEPT_TYPES, maxFiles: 1, disabled: isUploading,
  });

  return (
    <div className="card">
      <h2 className="font-semibold text-gray-900 mb-1">New Import</h2>
      <p className="text-sm text-gray-500 mb-4">
        Upload a CSV, Excel, PDF, or Word file. The system will auto-detect columns and import your data.
      </p>

      <div className="flex gap-3 mb-4">
        {(['candidate', 'lead'] as const).map(t => (
          <button key={t} onClick={() => setImportType(t)}
            className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
              importType === t ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}>
            {t === 'candidate' ? '👤 Import Candidates' : '🎯 Import Leads'}
          </button>
        ))}
      </div>

      <div {...getRootProps()} className={`flex flex-col items-center justify-center gap-3 py-10 px-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
        isUploading ? 'border-brand-400 bg-brand-50 cursor-not-allowed' : isDragActive ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'
      }`}>
        <input {...getInputProps()} />
        <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center">
          {isUploading ? <RefreshCw className="w-6 h-6 text-brand-600 animate-spin" /> : <Upload className="w-6 h-6 text-brand-600" />}
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-700 text-sm">
            {isUploading ? 'Uploading & processing…' : isDragActive ? 'Drop your file here' : 'Drag & drop your file, or click to browse'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Supports CSV, Excel (.xlsx/.xls), PDF, Word (.docx/.doc)</p>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>Headers like <strong>name</strong>, <strong>email</strong>, <strong>company</strong>, <strong>title</strong> are auto-detected in CSV/Excel files.</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ImportsPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: imports, isLoading } = useQuery({
    queryKey: ['imports'],
    queryFn: importsApi.list,
    refetchInterval: (query) => {
      const hasActive = query.state.data?.data?.some(
        (i: any) => i.status === 'PROCESSING' || i.status === 'PENDING',
      );
      return hasActive ? 3000 : false;
    },
  });

  const retryMutation = useMutation({
    mutationFn: importsApi.retry,
    onSuccess: () => { toast.success('Retry queued'); queryClient.invalidateQueries({ queryKey: ['imports'] }); },
    onError: () => toast.error('Retry failed'),
  });

  const copyId = (id: string, bid?: string) => {
    navigator.clipboard.writeText(bid ?? id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Imports</h1>
        <p className="text-gray-500 mt-1">
          Bulk import candidates and leads from CSV, Excel, PDF, or Word files
        </p>
      </div>

      <NewImportCard />

      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">Import History</h2>
          <FileText className="w-4 h-4 text-gray-400" />
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Batch ID', 'File / Name', 'Type', 'Status', 'Rows', 'Started', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Loading…</td></tr>
            ) : !imports?.data?.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  No imports yet — upload a file above to get started
                </td>
              </tr>
            ) : (
              imports.data.map((imp: any) => (
                <tr key={imp.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(imp)}>
                  <td className="px-4 py-3">
                    <button
                      onClick={e => { e.stopPropagation(); copyId(imp.id, imp.businessId); }}
                      className="flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-brand-600"
                      title="Copy Batch ID"
                    >
                      {imp.businessId ?? imp.id.slice(0, 8)}
                      {copiedId === imp.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px] truncate">
                    {imp.name || `Import ${imp.id.slice(0, 8)}`}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {imp.importType === 'CANDIDATE' ? '👤 Candidates' : '🎯 Leads'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={STATUS_BADGE[imp.status] ?? 'badge-gray'}>{imp.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {imp.processedRows ?? 0} / {imp.totalRows ?? '?'}
                    {(imp.failedRows ?? 0) > 0 && (
                      <span className="ml-1 text-red-500">{imp.failedRows}✗</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {imp.createdAt ? formatDistanceToNow(new Date(imp.createdAt), { addSuffix: true }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {(imp.failedRows ?? 0) > 0 && imp.status === 'FAILED' && (
                        <button
                          onClick={e => { e.stopPropagation(); retryMutation.mutate(imp.id); }}
                          className="text-xs text-brand-600 hover:text-brand-800 flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Retry
                        </button>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && <ImportDetailDrawer imp={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
