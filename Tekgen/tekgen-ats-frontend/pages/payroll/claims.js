'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PayrollNavActions from '../../components/payroll/PayrollNavActions';
import FileUpload from '../../components/FileUpload';
import api from '../../lib/api';
import { apiErrorMessage } from '../../lib/apiErrorMessage';
import { CreditCard, PlusCircle, CheckCircle, XCircle, Clock, Loader2, AlertCircle, Download } from 'lucide-react';

const CLAIM_TYPES = [
  { value: 'MEDICAL',    label: '⚕️ Medical' },
  { value: 'TRANSPORT',  label: '🚗 Transport' },
  { value: 'FOOD',       label: '🍽️ Meals' },
  { value: 'HOTEL',      label: '🏨 Accommodation' },
  { value: 'OTHER',      label: '📋 Other' },
];

const STATUS_BADGE = {
  DRAFT:        'bg-slate-100 text-slate-700',
  SUBMITTED:    'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
  PENDING_APPROVAL: 'bg-indigo-100 text-indigo-700',
  APPROVED:     'bg-green-100 text-green-700',
  REJECTED:     'bg-red-100 text-red-700',
};

const STATUS_ICON = {
  DRAFT:        Clock,
  SUBMITTED:    Clock,
  UNDER_REVIEW: Loader2,
  PENDING_APPROVAL: Clock,
  APPROVED:     CheckCircle,
  REJECTED:     XCircle,
};

export default function PayrollClaimsPage() {
  const router = useRouter();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);
  const [files, setFiles] = useState([]);

  const [form, setForm] = useState({
    claimType: '',
    amount: '',
    description: '',
    claimDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      const res = await api.get('/api/my/claims');
      const claimsData = res.data.data?.claims || [];
      setClaims(claimsData);
    } catch (e) {
      console.error('Error:', e);
      setToast({ type: 'error', msg: apiErrorMessage(e, 'Failed to load claims') });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.claimType || !form.amount || !form.claimDate) {
      setToast({ type: 'error', msg: 'Please fill all required fields' });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('claimType', form.claimType);
      formData.append('amount', form.amount);
      formData.append('description', form.description);
      formData.append('claimDate', form.claimDate);
      
      if (files.length > 0) {
        files.forEach((file) => formData.append('attachments', file));
      }

      await api.post('/api/my/claims', formData);

      setToast({ type: 'success', msg: 'Claim submitted successfully!' });
      setShowForm(false);
      setForm({ claimType: '', amount: '', description: '', claimDate: new Date().toISOString().split('T')[0] });
      setFiles([]);
      fetchClaims();
    } catch (e) {
      setToast({ type: 'error', msg: e.response?.data?.message || 'Failed to submit claim' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const getStats = () => {
    return {
      pending:  claims.filter(c => ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'PENDING_APPROVAL'].includes(c.status)).length,
      approved: claims.filter(c => c.status === 'APPROVED').length,
      rejected: claims.filter(c => c.status === 'REJECTED').length,
    };
  };

  const stats = getStats();

  return (
    <DashboardLayout title="Payroll › Claims">
      <div className="max-w-5xl mx-auto space-y-5">
        <PayrollNavActions />
        <p className="text-xs text-slate-500">Claim amounts in <strong>RM (MYR)</strong>.</p>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Claims & Reimbursements</h2>
            <p className="text-sm text-slate-500 mt-0.5">Submit & track expense reimbursement requests</p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
            >
              <PlusCircle size={16} /> New Claim
            </button>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {toast.msg}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pending', value: stats.pending, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'Approved', value: stats.approved, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Rejected', value: stats.rejected, color: 'text-red-600', bg: 'bg-red-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl border border-current border-opacity-20 p-4`}>
              <p className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* New claim form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Submit New Claim</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Claim Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Claim Type *</label>
                  <select
                    value={form.claimType}
                    onChange={(e) => setForm({ ...form, claimType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select type</option>
                    {CLAIM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount (RM) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Claim Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Claim Date *</label>
                <input
                  type="date"
                  value={form.claimDate}
                  onChange={(e) => setForm({ ...form, claimDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the expense"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* File Upload */}
              <FileUpload
                value={files}
                onChange={setFiles}
                maxFiles={5}
                accept={['image/*', '.pdf', '.doc', '.docx']}
              />

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setFiles([]); }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {submitting ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Claims List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : claims.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 flex items-center justify-center py-16 text-center">
            <div>
              <CreditCard size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No claims submitted</p>
              <p className="text-xs text-slate-400 mt-1">Click &quot;New Claim&quot; to get started</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {claims.map(claim => {
                    const StatusIcon = STATUS_ICON[claim.status] || Clock;
                    return (
                      <tr key={claim.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-700">{new Date(claim.claimDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {CLAIM_TYPES.find(t => t.value === claim.claimType)?.label}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{claim.description}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800">RM {claim.amount?.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[claim.status]}`}>
                            <StatusIcon size={14} />
                            {claim.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

