'use client';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { importsApi } from '@/lib/api-client';
import { useDropzone } from 'react-dropzone';
import { Upload, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'badge-gray', PROCESSING: 'badge-blue', COMPLETED: 'badge-green',
  FAILED: 'badge-red', PARTIAL: 'badge-yellow',
};

function NewImportCard() {
  const queryClient = useQueryClient();
  const [importType, setImportType] = useState<'CANDIDATE' | 'LEAD'>('CANDIDATE');
  const [importId, setImportId] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => importsApi.create({ importType, source: 'CSV_UPLOAD', name: `Import ${new Date().toLocaleDateString()}` }),
    onSuccess: (data) => setImportId(data.id),
    onError: () => toast.error('Failed to create import'),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => importsApi.upload(importId!, file),
    onSuccess: () => {
      toast.success('File uploaded! Processing started...');
      setImportId(null);
      queryClient.invalidateQueries({ queryKey: ['imports'] });
    },
    onError: () => toast.error('Upload failed'),
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!importId) return;
    uploadMutation.mutate(acceptedFiles[0]);
  }, [importId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
    },
    maxFiles: 1,
    disabled: !importId || uploadMutation.isPending,
  });

  return (
    <div className="card border-2 border-dashed border-brand-200">
      <h2 className="font-semibold text-gray-900 mb-4">New Import</h2>
      <div className="flex gap-3 mb-4">
        <select className="input flex-1" value={importType} onChange={e => setImportType(e.target.value as any)}>
          <option value="CANDIDATE">Candidates (CSV, Excel, PDF, Word)</option>
          <option value="LEAD">Leads (CSV, Excel, PDF, Word)</option>
        </select>
        {!importId ? (
          <button onClick={() => createMutation.mutate()} className="btn-primary" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Start Import'}
          </button>
        ) : (
          <div {...getRootProps()} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${isDragActive ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400'}`}>
            <input {...getInputProps()} />
            <Upload className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">{uploadMutation.isPending ? 'Uploading…' : isDragActive ? 'Drop here' : 'Drop CSV, Excel, PDF or Word · click to browse'}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ImportsPage() {
  const queryClient = useQueryClient();
  const { data: imports, isLoading } = useQuery({ queryKey: ['imports'], queryFn: importsApi.list });

  const retryMutation = useMutation({
    mutationFn: importsApi.retry,
    onSuccess: () => { toast.success('Retry queued'); queryClient.invalidateQueries({ queryKey: ['imports'] }); },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Imports</h1>
        <p className="text-gray-500 mt-1">Bulk import candidates and leads from CSV or Excel files</p>
      </div>

      <NewImportCard />

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Name', 'Type', 'Status', 'Rows', 'Started', ''].map(h => (
                <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : imports?.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No imports yet</td></tr>
            ) : (
              imports?.map((imp: any) => (
                <tr key={imp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{imp.name || `Import ${imp.id.slice(0, 8)}`}</td>
                  <td className="px-6 py-4 text-gray-600">{imp.importType}</td>
                  <td className="px-6 py-4"><span className={STATUS_BADGE[imp.status] ?? 'badge-gray'}>{imp.status}</span></td>
                  <td className="px-6 py-4 text-gray-600">
                    {imp.processedRows ?? 0}/{imp.totalRows ?? '?'}
                    {imp.failedRows > 0 && <span className="ml-2 text-red-500">{imp.failedRows} failed</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">{imp.createdAt ? formatDistanceToNow(new Date(imp.createdAt), { addSuffix: true }) : '—'}</td>
                  <td className="px-6 py-4">
                    {imp.failedRows > 0 && (
                      <button onClick={() => retryMutation.mutate(imp.id)} className="text-xs text-brand-600 hover:text-brand-800 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
