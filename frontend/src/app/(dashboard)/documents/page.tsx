'use client';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '@/lib/api-client';
import toast from 'react-hot-toast';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Search,
  RefreshCw,
  Link,
  File,
  FileSpreadsheet,
  Image,
} from 'lucide-react';

const DOC_TYPES = ['RESUME', 'LEAD_DOC', 'PROPOSAL', 'CONTRACT', 'COMPANY_DOC', 'OTHER'] as const;

const MIME_ICONS: Record<string, any> = {
  'application/pdf': FileText,
  'application/msword': File,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': File,
  'application/vnd.ms-excel': FileSpreadsheet,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileSpreadsheet,
  'image/png': Image,
  'image/jpeg': Image,
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [uploadType, setUploadType] = useState<string>('OTHER');
  const [dragActive, setDragActive] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['documents', { search, type: typeFilter, page }],
    queryFn: () =>
      documentsApi.list({
        search: search || undefined,
        type: typeFilter || undefined,
        page,
        limit: 20,
      }),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => documentsApi.upload(file, uploadType),
    onSuccess: () => {
      toast.success('Document uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? err?.response?.data?.error?.message ?? 'Upload failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      toast.success('Document deleted');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: () => toast.error('Delete failed'),
  });

  const reparseMutation = useMutation({
    mutationFn: (id: string) => documentsApi.reparse(id),
    onSuccess: () => {
      toast.success('Document re-parsed');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Re-parse failed'),
  });

  const handleDownload = async (id: string) => {
    try {
      const { url } = await documentsApi.getDownloadUrl(id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Could not generate download link');
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) uploadMutation.mutate(files[0]);
    },
    [uploadMutation],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) uploadMutation.mutate(f);
    e.target.value = '';
  };

  const docs = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, limit: 20 };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-1">Securely store and manage files for candidates, leads, and companies</p>
        </div>
      </div>

      {/* Upload area */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 mb-6 text-center transition-colors ${
          dragActive ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-white'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-600 mb-2">Drag & drop a file here, or click to browse</p>
        <div className="flex items-center justify-center gap-3 mb-3">
          <select
            value={uploadType}
            onChange={(e) => setUploadType(e.target.value)}
            className="input text-sm w-40"
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
          <label className="btn-primary text-sm cursor-pointer px-4 py-2">
            Choose File
            <input type="file" className="hidden" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.csv,.txt" />
          </label>
        </div>
        <p className="text-xs text-gray-400">PDF, DOCX, XLSX, PNG, JPG, CSV, TXT — Max 25MB. All files encrypted at rest (AES-256).</p>
        {uploadMutation.isPending && <p className="text-sm text-brand-600 mt-2">Uploading…</p>}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or business ID…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-9 text-sm"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="input text-sm w-40"
        >
          <option value="">All Types</option>
          {DOC_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace('_', ' ')}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400">{meta.total} documents</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="px-4 py-3 text-left">File</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Size</th>
              <th className="px-4 py-3 text-left">Business ID</th>
              <th className="px-4 py-3 text-left">Uploaded By</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Loading…</td></tr>
            ) : docs.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No documents found</td></tr>
            ) : (
              docs.map((doc: any) => {
                const IconComp = MIME_ICONS[doc.mimeType] || FileText;
                return (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <IconComp className="w-4 h-4 text-brand-600 flex-shrink-0" />
                        <span className="truncate max-w-[200px]" title={doc.originalName}>{doc.originalName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-brand-50 text-brand-700 text-xs rounded-full font-medium">
                        {doc.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatFileSize(doc.fileSize)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{doc.businessId}</td>
                    <td className="px-4 py-3 text-gray-500">{doc.uploadedBy?.fullName ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(doc.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleDownload(doc.id)} className="p-1.5 hover:bg-gray-100 rounded" title="Download">
                          <Download className="w-4 h-4 text-gray-500" />
                        </button>
                        <button onClick={() => reparseMutation.mutate(doc.id)} className="p-1.5 hover:bg-gray-100 rounded" title="Re-parse">
                          <RefreshCw className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => { if (confirm('Delete this document permanently?')) deleteMutation.mutate(doc.id); }}
                          className="p-1.5 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {meta.total > meta.limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="text-sm text-brand-600 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-gray-400">Page {page} of {Math.ceil(meta.total / meta.limit)}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * meta.limit >= meta.total}
              className="text-sm text-brand-600 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
