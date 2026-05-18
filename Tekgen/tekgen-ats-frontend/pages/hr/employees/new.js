'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import api from '../../../lib/api';

const DOCUMENT_REQUIREMENTS = [
  { key: 'resume', label: 'Updated Resume', documentType: 'OTHER' },
  { key: 'education', label: 'Highest Education Certificate', documentType: 'EDUCATION' },
  { key: 'offerLetters', label: 'Current/Previous Employer Offer Letters', documentType: 'OFFER_LETTER' },
  { key: 'payslips', label: 'Last 3 Months Payslips', documentType: 'OTHER' },
  { key: 'photo', label: 'Passport Size Photo', documentType: 'OTHER' },
  { key: 'icCopy', label: 'IC Copy (Local)', documentType: 'NRIC' },
  { key: 'passportCopy', label: 'Passport Copy (Expats)', documentType: 'PASSPORT' },
  { key: 'marriageCertificate', label: 'Marriage Certificate (if DP)', documentType: 'OTHER' },
  { key: 'kidsBirthCertificates', label: 'Kids Birth Certificates (if DP)', documentType: 'OTHER' },
  { key: 'dependentPassDocs', label: 'Dependent Pass Documents (if DP)', documentType: 'OTHER' },
  { key: 'taxClearance', label: 'Tax Clearance Document (Expats)', documentType: 'TAX_CLEARANCE' },
  { key: 'nocForm', label: 'NOC Form (Expats)', documentType: 'NOC' },
];

export default function NewEmployeePage() {
  const router = useRouter();
  const [managers, setManagers] = useState([]);
  const [clients, setClients] = useState([]);
  const [documents, setDocuments] = useState({});
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'EMPLOYEE_VIEWER',
    department: '',
    designation: '',
    joinDate: '',
    employmentType: 'INTERNAL',
    phone: '',
    nricPassport: '',
    dob: '',
    gender: '',
    nationality: '',
    personalEmail: '',
    address: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: '',
    visaStatus: '',
    visaExpiryDate: '',
    managerId: '',
    clientId: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/hrms/employees?status=ACTIVE&limit=200')
      .then((res) => setManagers(res.data.data?.employees || []))
      .catch(() => setManagers([]));
    api.get('/api/sales/clients')
      .then((res) => setClients(res.data.data?.clients || res.data.data || []))
      .catch(() => setClients([]));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      const res = await api.post('/api/hrms/employees', form);
      const id = res.data.data?.employee?.id;
      if (id) {
        for (const req of DOCUMENT_REQUIREMENTS) {
          const file = documents[req.key];
          if (!file) continue;
          const fd = new FormData();
          fd.append('file', file);
          fd.append('documentType', req.documentType);
          fd.append('documentName', req.label);
          await api.post(`/api/hrms/employees/${id}/documents`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      }
      if (id) router.push(`/hr/employees/${id}`);
      else router.push('/hr/employees');
    } catch (e2) {
      const status = e2.response?.status;
      if (status === 428) {
        setError('Backup required before creating employee. Run backup-db.ps1 and try again.');
      } else {
        setError(e2.response?.data?.message || 'Failed to create employee');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="HR › New Employee">
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Add Employee</h2>
        {error && <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-700">{error}</div>}
        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-2 gap-4">
          <div className="col-span-2 text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">Basic Details</div>
          <input className="border rounded px-3 py-2 text-sm" placeholder="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          <input className="border rounded px-3 py-2 text-sm" placeholder="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          <input className="border rounded px-3 py-2 text-sm col-span-2" type="email" placeholder="Work Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="border rounded px-3 py-2 text-sm" placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <input className="border rounded px-3 py-2 text-sm" placeholder="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
          <input className="border rounded px-3 py-2 text-sm" type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
          <input className="border rounded px-3 py-2 text-sm" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="border rounded px-3 py-2 text-sm" placeholder="NRIC / Passport No" value={form.nricPassport} onChange={(e) => setForm({ ...form, nricPassport: e.target.value })} />
          <input className="border rounded px-3 py-2 text-sm" type="date" placeholder="Date of Birth" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
          <select className="border rounded px-3 py-2 text-sm" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="">Gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
          <input className="border rounded px-3 py-2 text-sm" placeholder="Nationality" value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
          <input className="border rounded px-3 py-2 text-sm col-span-2" type="email" placeholder="Personal Email" value={form.personalEmail} onChange={(e) => setForm({ ...form, personalEmail: e.target.value })} />
          <textarea className="border rounded px-3 py-2 text-sm col-span-2" rows={2} placeholder="Home Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <select className="border rounded px-3 py-2 text-sm" value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
            <option value="">Department Manager (optional)</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>{m.user?.firstName} {m.user?.lastName} ({m.employeeId})</option>
            ))}
          </select>
          <select className="border rounded px-3 py-2 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="EMPLOYEE_VIEWER">Internal Staff (Workspace)</option>
            <option value="DEPLOYED_STAFF">Deployed Staff (Workspace)</option>
            <option value="CONTRACTOR">Contractor (Workspace)</option>
            <option value="RECRUITER">Recruitment Staff</option>
            <option value="RECRUITMENT_MANAGER">Recruitment Manager</option>
            <option value="SALES_MANAGER">Sales Manager</option>
            <option value="HR_ADMIN">HR Ops Manager</option>
            <option value="PAYROLL_ADMIN">Payroll Manager</option>
            <option value="FINANCE_HEAD">Finance Manager</option>
          </select>
          <select className="border rounded px-3 py-2 text-sm" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>
            <option value="INTERNAL">Internal</option>
            <option value="CONTRACTOR">Contractor</option>
            <option value="DEPLOYED">Deployed</option>
          </select>
          <select className="border rounded px-3 py-2 text-sm col-span-2" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
            <option value="">Client mapping (required for deployed staff)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.clientName || c.name} ({c.code || c.id?.slice(0, 6)})</option>
            ))}
          </select>
          <div className="col-span-2 text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2 mt-2">Emergency Contact</div>
          <input className="border rounded px-3 py-2 text-sm" placeholder="Emergency Contact Name" value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} />
          <input className="border rounded px-3 py-2 text-sm" placeholder="Emergency Contact Phone" value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} />
          <input className="border rounded px-3 py-2 text-sm col-span-2" placeholder="Emergency Contact Relationship" value={form.emergencyRelation} onChange={(e) => setForm({ ...form, emergencyRelation: e.target.value })} />

          <div className="col-span-2 text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2 mt-2">Visa / Expat Details</div>
          <select className="border rounded px-3 py-2 text-sm" value={form.visaStatus} onChange={(e) => setForm({ ...form, visaStatus: e.target.value })}>
            <option value="">Visa Status</option>
            <option value="CITIZEN">Citizen</option>
            <option value="PR">PR</option>
            <option value="EP_PASS">EP Pass</option>
            <option value="WORK_PERMIT">Work Permit</option>
            <option value="DEPENDENT">Dependent Pass</option>
            <option value="OTHER">Other</option>
          </select>
          <input className="border rounded px-3 py-2 text-sm" type="date" placeholder="Passport/Visa Expiry Date" value={form.visaExpiryDate} onChange={(e) => setForm({ ...form, visaExpiryDate: e.target.value })} />

          <div className="col-span-2 text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2 mt-2">Joining Documents Upload (HR)</div>
          {DOCUMENT_REQUIREMENTS.map((req) => (
            <div key={req.key} className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1">{req.label}</label>
              <input
                className="border rounded px-3 py-2 text-sm w-full"
                type="file"
                onChange={(e) => setDocuments((prev) => ({ ...prev, [req.key]: e.target.files?.[0] || null }))}
              />
            </div>
          ))}
          <p className="col-span-2 text-xs text-slate-500">
            Uploaded documents are securely stored and mapped to employee records. Expat-related documents are also available for visa processing.
          </p>
          <div className="col-span-2 flex gap-2 justify-end">
            <button type="button" onClick={() => router.push('/hr/employees')} className="px-4 py-2 border rounded text-sm">Cancel</button>
            <button disabled={saving} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm">{saving ? 'Saving...' : 'Create Employee'}</button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
