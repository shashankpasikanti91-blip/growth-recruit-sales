import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';
import { openAuthenticatedFile } from '../../lib/secureFile';

export default function MyStatutoryForms() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadForms();
  }, [year]);

  async function loadForms() {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/api/my/statutory-forms?financialYear=${year}&limit=100`);
      setForms(res.data.data?.forms || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load statutory forms');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout title="My Workspace › Statutory Forms">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">My Statutory Forms</h2>
            <p className="text-sm text-slate-500">Only your own forms are shown</p>
          </div>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-sm text-slate-500">Loading...</div>
          ) : forms.length === 0 ? (
            <div className="p-8 text-sm text-slate-500">No forms found for selected year</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left">Form</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Year</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">File</th>
                </tr>
              </thead>
              <tbody>
                {forms.map((f) => (
                  <tr key={f.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">{f.formName || f.displayId || 'Form'}</td>
                    <td className="px-4 py-3">{f.formType}</td>
                    <td className="px-4 py-3">{f.financialYear || '-'}</td>
                    <td className="px-4 py-3">{f.status}</td>
                    <td className="px-4 py-3">
                      {f.fileUrl ? (
                        <button
                          type="button"
                          onClick={() => openAuthenticatedFile(`/api/my/statutory-forms/${f.id}/download`)}
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
