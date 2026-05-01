'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';
import { getUser } from '../../lib/auth';
import { Save, Loader2, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

const SECTION = ({ title, children }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
    <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">{title}</h3>
    {children}
  </div>
);

const Field = ({ label, value, onChange, type = 'text', readOnly = false, hint }) => (
  <div>
    <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange && onChange(e.target.value)}
      readOnly={readOnly}
      className={`w-full px-3 py-2 text-sm rounded-lg border ${readOnly ? 'bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed' : 'border-slate-300 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none'}`}
    />
    {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
  </div>
);

const Select = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none bg-white"
    >
      <option value="">— select —</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

export default function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [user, setUser]       = useState(null);
  const [form, setForm]       = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null); // { type: 'success'|'error', msg }
  const [showAccount, setShowAccount] = useState(false);

  useEffect(() => {
    setUser(getUser());
    api.get('/api/my/profile')
      .then(r => {
        setProfile(r.data.data.profile);
        const p = r.data.data.profile;
        setForm({
          nricPassport:       p.nricPassport      || '',
          nationality:        p.nationality       || '',
          dob:                p.dob ? p.dob.split('T')[0] : '',
          gender:             p.gender            || '',
          personalEmail:      p.personalEmail     || '',
          phone:              p.phone             || '',
          address:            p.address           || '',
          emergencyName:      p.emergencyName     || '',
          emergencyPhone:     p.emergencyPhone    || '',
          emergencyRelation:  p.emergencyRelation || '',
          workLocation:       p.workLocation      || '',
          workState:          p.workState         || '',
          bankName:           p.bankName          || '',
          bankAccountNo:      '',   // never pre-fill sensitive
          taxNumber:          p.taxNumber         || '',
          epfNumber:          p.epfNumber         || '',
          socsoNumber:        p.socsoNumber       || '',
          eisNumber:          p.eisNumber         || '',
        });
      })
      .catch(() => setToast({ type: 'error', msg: 'Failed to load profile' }))
      .finally(() => setLoading(false));
  }, []);

  const f = (field) => (val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      // Don't send empty bankAccountNo (would overwrite masked value)
      if (!payload.bankAccountNo) delete payload.bankAccountNo;
      await api.put('/api/my/profile', payload);
      setToast({ type: 'success', msg: 'Profile saved successfully!' });
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      setToast({ type: 'error', msg: e.response?.data?.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="My Workspace › My Profile">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">My Profile</h2>
            <p className="text-sm text-slate-500 mt-0.5">Personal details, emergency contact &amp; financial info</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="btn-primary text-sm flex items-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg border ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
            {toast.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {toast.msg}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-8">
            <Loader2 size={16} className="animate-spin" /> Loading profile…
          </div>
        )}

        {!loading && profile && (
          <>
            {/* Employment (read-only) */}
            <SECTION title="Employment Details">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label="Employee ID"    value={profile.employeeId}     readOnly />
                <Field label="Work Email"     value={user?.email}             readOnly />
                <Field label="Name"           value={`${user?.firstName} ${user?.lastName}`} readOnly />
                <Field label="Role"           value={user?.role}              readOnly />
                <Field label="Department"     value={profile.department || user?.department} readOnly />
                <Field label="Designation"    value={profile.designation}     readOnly />
                <Field label="Employment Type" value={profile.employmentType} readOnly />
                <Field label="Join Date"      value={profile.joinDate ? profile.joinDate.split('T')[0] : ''}  readOnly />
                <Field label="Work Location"  value={form.workLocation} onChange={f('workLocation')} />
              </div>
            </SECTION>

            {/* Personal */}
            <SECTION title="Personal Information">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label="NRIC / Passport No."  value={form.nricPassport}    onChange={f('nricPassport')} />
                <Field label="Nationality"           value={form.nationality}     onChange={f('nationality')} />
                <Field label="Date of Birth"         value={form.dob}             onChange={f('dob')} type="date" />
                <Select label="Gender" value={form.gender} onChange={f('gender')} options={[
                  { value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }, { value: 'OTHER', label: 'Prefer not to say' },
                ]} />
                <Field label="Personal Email"        value={form.personalEmail}   onChange={f('personalEmail')} type="email" />
                <Field label="Mobile Phone"          value={form.phone}           onChange={f('phone')} type="tel" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Home Address</label>
                <textarea
                  value={form.address}
                  onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none resize-none"
                />
              </div>
            </SECTION>

            {/* Emergency contact */}
            <SECTION title="Emergency Contact">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label="Full Name"     value={form.emergencyName}     onChange={f('emergencyName')} />
                <Field label="Phone"         value={form.emergencyPhone}    onChange={f('emergencyPhone')} type="tel" />
                <Field label="Relationship"  value={form.emergencyRelation} onChange={f('emergencyRelation')} hint="e.g. Spouse, Parent, Sibling" />
              </div>
            </SECTION>

            {/* Bank & Statutory */}
            <SECTION title="Bank & Statutory Details">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 flex items-center gap-2 mb-3">
                <AlertCircle size={13} /> This information is encrypted and only visible to HR/Payroll admins.
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label="Bank Name"         value={form.bankName}       onChange={f('bankName')} />
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Bank Account No.</label>
                  <div className="relative">
                    <input
                      type={showAccount ? 'text' : 'password'}
                      value={form.bankAccountNo}
                      onChange={e => setForm(prev => ({ ...prev, bankAccountNo: e.target.value }))}
                      placeholder={profile.bankAccountNo ? '(leave blank to keep existing)' : 'Enter account number'}
                      className="w-full px-3 py-2 pr-9 text-sm rounded-lg border border-slate-300 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
                    />
                    <button type="button" onClick={() => setShowAccount(p => !p)} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                      {showAccount ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <Field label="Tax No. (LHDN/TIN)" value={form.taxNumber}    onChange={f('taxNumber')} />
                <Field label="EPF No."             value={form.epfNumber}    onChange={f('epfNumber')} />
                <Field label="SOCSO No."           value={form.socsoNumber}  onChange={f('socsoNumber')} />
                <Field label="EIS No."             value={form.eisNumber}    onChange={f('eisNumber')} />
              </div>
            </SECTION>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
