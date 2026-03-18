'use client';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { importsApi } from '@/lib/api-client';
import { useDropzone } from 'react-dropzone';
import { Upload, RefreshCw, FileText, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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

function NewImportCard() {
  const queryClient = useQueryClient();
  const [importType, setImportType] = useState<'candidate' | 'lead'>('candidate');
  const [step, setStep] = useState<'idle' | 'uploading'>('idle');

  // Determine import source from file extension
  const getImportSource = (file: File): string => {
    const name = file.name.toLowerCase();
    if (name.endsWith('.csv')) return 'CSV';
    if (name.match(/\.(xlsx|xls)$/)) return 'EXCEL';
    return 'MANUAL'; // PDF, Word, and other documents
  };

  // When a file is dropped, run both steps in sequence
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles[0]) return;
      const file = acceptedFiles[0];
      setStep('uploading');
      try {
        // Create then upload in sequence
        const created = await importsApi.create({
          importType,
          source: getImportSource(file),
          name: `${importType === 'candidate' ? 'Candidates' : 'Leads'} — ${file.name}`,
        });
        await importsApi.upload(created.id, file);
        toast.success('File uploaded! Processing started...');
        queryClient.invalidateQueries({ queryKey: ['imports'] });
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? 'Import failed — please try again';
        toast.error(msg);
      } finally {
        setStep('idle');
      }
    },
    [importType, queryClient],
  );

  const isUploading = step === 'uploading';

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT_TYPES,
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className="card">
      <h2 className="font-semibold text-gray-900 mb-1">New Import</h2>
      <p className="text-sm text-gray-500 mb-4">
        Upload a CSV, Excel, PDF, or Word file. The system will auto-detect columns and import
        your {importType === 'candidate' ? 'candidates' : 'leads'}.
      </p>

      {/* Type selector */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setImportType('candidate')}
          className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
            importType === 'candidate'
              ? 'border-brand-500 bg-brand-50 text-brand-700'
              : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          👤 Import Candidates
        </button>
        <button
          onClick={() => setImportType('lead')}
          className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
            importType === 'lead'
              ? 'border-brand-500 bg-brand-50 text-brand-700'
              : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          🎯 Import Leads
        </button>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`flex flex-col items-center justify-center gap-3 py-10 px-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
          isUploading
            ? 'border-brand-400 bg-brand-50 cursor-not-allowed'
            : isDragActive
            ? 'border-brand-500 bg-brand-50'
            : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center">
          {isUploading ? (
            <RefreshCw className="w-6 h-6 text-brand-600 animate-spin" />
          ) : (
            <Upload className="w-6 h-6 text-brand-600" />
          )}
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-700 text-sm">
            {isUploading
              ? 'Uploading & processing...'
              : isDragActive
              ? 'Drop your file here'
              : 'Drag & drop your file, or click to browse'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Supports CSV, Excel (.xlsx/.xls), PDF, Word (.docx/.doc)
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>For CSV/Excel imports, column headers like <strong>name</strong>, <strong>email</strong>, <strong>company</strong>, <strong>title</strong> are auto-detected. Download a <a href="#" className="underline" onClick={e => e.preventDefault()}>sample template</a> for best results.</span>
      </div>
    </div>
  );
}

export default function ImportsPage() {
  const queryClient = useQueryClient();
  const { data: imports, isLoading } = useQuery({
    queryKey: ['imports'],
    queryFn: importsApi.list,
    refetchInterval: (query) => {
      // Auto-refresh while any import is PROCESSING or PENDING
      const hasActive = query.state.data?.data?.some(
        (i: any) => i.status === 'PROCESSING' || i.status === 'PENDING'
      );
      return hasActive ? 3000 : false;
    },
  });

  const retryMutation = useMutation({
    mutationFn: importsApi.retry,
    onSuccess: () => {
      toast.success('Retry queued');
      queryClient.invalidateQueries({ queryKey: ['imports'] });
    },
    onError: () => toast.error('Retry failed'),
  });

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
              {['File / Name', 'Type', 'Status', 'Rows Processed', 'Started', ''].map(h => (
                <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : !imports?.data?.length ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  No imports yet — upload a file above to get started
                </td>
              </tr>
            ) : (
              imports?.data?.map((imp: any) => (
                <tr key={imp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {imp.name || `Import ${imp.id.slice(0, 8)}`}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {imp.importType === 'CANDIDATE' ? '👤 Candidates' : '🎯 Leads'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={STATUS_BADGE[imp.status] ?? 'badge-gray'}>{imp.status}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {imp.processedRows ?? 0} / {imp.totalRows ?? '?'}
                    {imp.failedRows > 0 && (
                      <span className="ml-2 text-red-500 text-xs">{imp.failedRows} failed</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {imp.createdAt ? formatDistanceToNow(new Date(imp.createdAt), { addSuffix: true }) : '—'}
                  </td>
                  <td className="px-6 py-4">
                    {imp.failedRows > 0 && imp.status === 'FAILED' && (
                      <button
                        onClick={() => retryMutation.mutate(imp.id)}
                        className="text-xs text-brand-600 hover:text-brand-800 flex items-center gap-1"
                      >
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
