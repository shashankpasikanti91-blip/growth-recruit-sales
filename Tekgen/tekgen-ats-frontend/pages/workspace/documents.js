import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';
import { openAuthenticatedFile } from '../../lib/secureFile';

export default function MyDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/api/my/documents?limit=100');
      setDocuments(res.data.data?.documents || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout title="My Workspace › Documents">
      <div className="max-w-6xl mx-auto space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">My Documents</h2>
          <p className="text-sm text-slate-500">Only your own uploaded/assigned documents are shown</p>
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-sm text-slate-500">Loading...</div>
          ) : documents.length === 0 ? (
            <div className="p-8 text-sm text-slate-500">No documents found</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left">Document</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Uploaded</th>
                  <th className="px-4 py-3 text-left">Expiry</th>
                  <th className="px-4 py-3 text-left">File</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">{d.documentName || d.fileName}</td>
                    <td className="px-4 py-3">{d.documentType || '-'}</td>
                    <td className="px-4 py-3">{d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3">{d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3">
                      {d.fileUrl ? (
                        <button
                          type="button"
                          onClick={() => openAuthenticatedFile(`/api/my/documents/${d.id}/download`)}
                          className="text-blue-600 hover:underline"
                        >
                          View
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
