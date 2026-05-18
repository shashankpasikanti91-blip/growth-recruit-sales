'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import api from '../../../lib/api';
import { openAuthenticatedFile } from '../../../lib/secureFile';

export default function EmployeeDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [form, setForm] = useState(null);
  const [managers, setManagers] = useState([]);
  const [clients, setClients] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [docFiles, setDocFiles] = useState([]);
  const [docType, setDocType] = useState('OTHER');
  const [docName, setDocName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (id) load();
  }, [id]);

  useEffect(() => {
    api.get('/api/hrms/employees?status=ACTIVE&limit=200')
      .then((res) => setManagers(res.data.data?.employees || []))
      .catch(() => setManagers([]));
    api.get('/api/sales/clients')
      .then((res) => setClients(res.data.data?.clients || res.data.data || []))
      .catch(() => setClients([]));
  }, []);

  const load = async () => {
    try {
      const res = await api.get(`/api/hrms/employees/${id}`);
      const emp = res.data.data?.employee;
      setForm({
        firstName: emp.user?.firstName || '',
        lastName: emp.user?.lastName || '',
        department: emp.department || '',
        designation: emp.designation || '',
        status: emp.status || 'ACTIVE',
        employmentType: emp.employmentType || 'INTERNAL',
        joinDate: emp.joinDate ? new Date(emp.joinDate).toISOString().split('T')[0] : '',
        phone: emp.phone || '',
        nricPassport: emp.nricPassport || '',
        dob: emp.dob ? new Date(emp.dob).toISOString().split('T')[0] : '',
        gender: emp.gender || '',
        nationality: emp.nationality || '',
        personalEmail: emp.personalEmail || '',
        address: emp.address || '',
        emergencyName: emp.emergencyName || '',
        emergencyPhone: emp.emergencyPhone || '',
        emergencyRelation: emp.emergencyRelation || '',
        visaStatus: emp.visaStatus || '',
        visaExpiryDate: emp.visaExpiryDate ? new Date(emp.visaExpiryDate).toISOString().split('T')[0] : '',
        managerId: emp.managerId || '',
        clientId: emp.paymentAgreements?.[0]?.clientId || '',
      });
      setDocuments(emp.documents || []);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load employee');
    }
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put(`/api/hrms/employees/${id}`, form);
      setError('');
      setNotice('Employee profile saved successfully.');
      setTimeout(() => setNotice(''), 2500);
    } catch (e2) {
      setError(e2.response?.data?.message || 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  const uploadDocument = async () => {
    try {
      if (!docFiles.length) return;
      const fd = new FormData();
      docFiles.forEach((f) => fd.append('files', f));
      fd.append('documentType', docType);
      fd.append('documentName', docName || docFiles[0].name);
      await api.post(`/api/hrms/employees/${id}/documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const refreshed = await api.get(`/api/hrms/employees/${id}`);
      setDocuments(refreshed.data.data?.employee?.documents || []);
      setDocFiles([]);
      setDocName('');
      setDocType('OTHER');
      setNotice('Document(s) uploaded successfully.');
      setTimeout(() => setNotice(''), 2500);
    } catch (e3) {
      setError(e3.response?.data?.message || 'Failed to upload document');
    }
  };

  return (
    <DashboardLayout title="HR › Employee 360">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => router.push('/hr/employees')}
            className="text-sm px-3 py-1.5 border border-slate-300 rounded hover:bg-slate-50"
          >
            ← Back to Employees
          </button>
          <h2 className="text-xl font-bold text-slate-900">Employee 360</h2>
        </div>
        {error && <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-700">{error}</div>}
        {notice && <div className="bg-green-50 border border-green-200 rounded px-3 py-2 text-sm text-green-700">{notice}</div>}
        {!form ? (
          <div className="text-sm text-slate-500">Loading...</div>
        ) : (
          <>
          <form onSubmit={save} className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-2 gap-4">
            <div className="col-span-2 text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">Basic + Employment</div>
            <input className="border rounded px-3 py-2 text-sm" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <input className="border rounded px-3 py-2 text-sm" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <input className="border rounded px-3 py-2 text-sm" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            <input className="border rounded px-3 py-2 text-sm" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
            <input className="border rounded px-3 py-2 text-sm" type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
            <input className="border rounded px-3 py-2 text-sm" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className="border rounded px-3 py-2 text-sm" placeholder="NRIC / Passport" value={form.nricPassport} onChange={(e) => setForm({ ...form, nricPassport: e.target.value })} />
            <input className="border rounded px-3 py-2 text-sm" type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
            <input className="border rounded px-3 py-2 text-sm" placeholder="Nationality" value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
            <select className="border rounded px-3 py-2 text-sm" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="">Gender</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
            <input className="border rounded px-3 py-2 text-sm col-span-2" placeholder="Personal Email" value={form.personalEmail} onChange={(e) => setForm({ ...form, personalEmail: e.target.value })} />
            <textarea className="border rounded px-3 py-2 text-sm col-span-2" rows={2} placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <input className="border rounded px-3 py-2 text-sm" placeholder="Emergency Contact Name" value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} />
            <input className="border rounded px-3 py-2 text-sm" placeholder="Emergency Contact Phone" value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} />
            <input className="border rounded px-3 py-2 text-sm col-span-2" placeholder="Emergency Contact Relationship" value={form.emergencyRelation} onChange={(e) => setForm({ ...form, emergencyRelation: e.target.value })} />
            <select className="border rounded px-3 py-2 text-sm" value={form.visaStatus} onChange={(e) => setForm({ ...form, visaStatus: e.target.value })}>
              <option value="">Visa Status</option>
              <option value="CITIZEN">Citizen</option>
              <option value="PR">PR</option>
              <option value="EP_PASS">EP Pass</option>
              <option value="WORK_PERMIT">Work Permit</option>
              <option value="DEPENDENT">Dependent Pass</option>
              <option value="OTHER">Other</option>
            </select>
            <input className="border rounded px-3 py-2 text-sm" type="date" placeholder="Visa/Passport Expiry" value={form.visaExpiryDate} onChange={(e) => setForm({ ...form, visaExpiryDate: e.target.value })} />
            <select className="border rounded px-3 py-2 text-sm" value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
              <option value="">Department Manager (optional)</option>
              {managers.filter((m) => m.id !== id).map((m) => (
                <option key={m.id} value={m.id}>{m.user?.firstName} {m.user?.lastName} ({m.employeeId})</option>
              ))}
            </select>
            <select className="border rounded px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="ON_LEAVE">ON_LEAVE</option>
              <option value="RESIGNED">RESIGNED</option>
              <option value="TERMINATED">TERMINATED</option>
            </select>
            <select className="border rounded px-3 py-2 text-sm" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>
              <option value="INTERNAL">INTERNAL</option>
              <option value="CONTRACTOR">CONTRACTOR</option>
              <option value="DEPLOYED">DEPLOYED</option>
            </select>
            <select className="border rounded px-3 py-2 text-sm col-span-2" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Client mapping (required for deployed staff)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.clientName || c.name} ({c.code || c.id?.slice(0, 6)})</option>
              ))}
            </select>
            <div className="col-span-2 flex justify-end">
              <button disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">Dependent Pass (DP) Guidance</p>
            <p>
              For visa holders with spouse/children/parents, upload dependent documents here under proper document type.
              These files are referenced by Visa module workflows for tracking and renewals.
            </p>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-xl p-5 mt-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">Employee Documents (HR Controlled)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select className="border rounded px-3 py-2 text-sm" value={docType} onChange={(e) => setDocType(e.target.value)}>
                <option value="OTHER">OTHER</option>
                <option value="NRIC">NRIC</option>
                <option value="PASSPORT">PASSPORT</option>
                <option value="EDUCATION">EDUCATION</option>
                <option value="CERTIFICATION">CERTIFICATION</option>
                <option value="OFFER_LETTER">OFFER_LETTER</option>
                <option value="TAX_CLEARANCE">TAX_CLEARANCE</option>
                <option value="NOC">NOC</option>
                <option value="DEPENDENT_PASS">DEPENDENT_PASS</option>
                <option value="DEPENDENT_SPOUSE_DOC">DEPENDENT_SPOUSE_DOC</option>
                <option value="DEPENDENT_CHILD_DOC">DEPENDENT_CHILD_DOC</option>
                <option value="DEPENDENT_PARENT_DOC">DEPENDENT_PARENT_DOC</option>
              </select>
              <input className="border rounded px-3 py-2 text-sm" placeholder="Document Name" value={docName} onChange={(e) => setDocName(e.target.value)} />
              <input className="border rounded px-3 py-2 text-sm" type="file" multiple onChange={(e) => setDocFiles(Array.from(e.target.files || []))} />
            </div>
            {docFiles.length > 0 && (
              <p className="text-xs text-slate-500">{docFiles.length} file(s) selected</p>
            )}
            <div className="flex justify-end">
              <button type="button" onClick={uploadDocument} className="px-3 py-2 bg-blue-600 text-white rounded text-sm">Upload Document</button>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-left px-3 py-2">Name</th>
                    <th className="text-left px-3 py-2">Uploaded</th>
                    <th className="text-left px-3 py-2">File</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((d) => (
                    <tr key={d.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{d.documentType}</td>
                      <td className="px-3 py-2">{d.documentName}</td>
                      <td className="px-3 py-2">{d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : '-'}</td>
                      <td className="px-3 py-2">
                        {d.fileUrl && id ? (
                          <button
                            type="button"
                            onClick={() => openAuthenticatedFile(`/api/hrms/employees/${id}/documents/${d.id}/download`)}
                            className="text-blue-600 underline"
                          >
                            Open
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                  {documents.length === 0 && (
                    <tr><td className="px-3 py-3 text-slate-500" colSpan={4}>No documents uploaded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
