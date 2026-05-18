import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { openAuthenticatedFile } from '../../lib/secureFile';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PayrollNavActions from '../../components/payroll/PayrollNavActions';
import { apiErrorMessage } from '../../lib/apiErrorMessage';
import { MessageCircle, FileText, Download, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function ClaimsApprovalPage() {
  const [claims, setClaims] = useState([]);
  const [filter, setFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [action, setAction] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Load claims
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/payroll/admin/claims', { params: { status: filter } });
        setClaims(res.data.data?.claims || []);
      } catch (err) {
        console.error('Error loading claims:', err);
        setToast({ type: 'error', msg: apiErrorMessage(err, 'Failed to load claims') });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filter]);

  const handleApprove = async (claimId) => {
    if (!confirm('Approve this claim?')) return;
    setSubmitting(true);
    try {
      await api.post(`/api/payroll/admin/claims/${claimId}/review`, { action: 'APPROVE', comment });
      setToast({ type: 'success', msg: 'Claim approved' });
      setClaims(claims.filter(c => c.id !== claimId));
      setSelectedClaim(null);
    } catch (err) {
      setToast({ type: 'error', msg: 'Failed to approve claim' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (claimId) => {
    if (!comment.trim()) {
      setToast({ type: 'error', msg: 'Please provide a reason for rejection' });
      return;
    }
    if (!confirm('Reject this claim?')) return;
    setSubmitting(true);
    try {
      await api.post(`/api/payroll/admin/claims/${claimId}/review`, { action: 'REJECT', comment });
      setToast({ type: 'success', msg: 'Claim rejected' });
      setClaims(claims.filter(c => c.id !== claimId));
      setSelectedClaim(null);
    } catch (err) {
      setToast({ type: 'error', msg: 'Failed to reject claim' });
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (status) => {
    const colors = {
      SUBMITTED: 'bg-blue-50 text-blue-700',
      APPROVED: 'bg-green-50 text-green-700',
      REJECTED: 'bg-red-50 text-red-700'
    };
    return colors[status] || 'bg-gray-50 text-gray-700';
  };

  const statusIcon = (status) => {
    const icons = {
      SUBMITTED: <Clock className="w-4 h-4" />,
      APPROVED: <CheckCircle className="w-4 h-4" />,
      REJECTED: <XCircle className="w-4 h-4" />
    };
    return icons[status];
  };

  return (
    <DashboardLayout title="Payroll › Claims approval">
      <div className="max-w-7xl mx-auto p-1">
        <PayrollNavActions />
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Claims approval</h1>
            <p className="text-slate-600 text-sm mt-1">Review and approve employee expense claims (amounts in RM)</p>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`mb-4 p-4 rounded-lg ${toast.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {toast.msg}
          </div>
        )}

        {/* Filter */}
        <div className="mb-6 flex gap-2">
          {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(st => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Claims List */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="bg-white rounded-lg p-8 text-center text-slate-500">Loading claims...</div>
            ) : claims.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center text-slate-500">No claims found</div>
            ) : (
              <div className="space-y-3">
                {claims.map(claim => (
                  <div
                    key={claim.id}
                    onClick={() => setSelectedClaim(claim)}
                    className={`bg-white border-2 rounded-lg p-4 cursor-pointer transition ${
                      selectedClaim?.id === claim.id
                        ? 'border-slate-900 shadow-md'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{claim.displayId}</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${statusColor(claim.status)}`}>
                            {statusIcon(claim.status)}
                            {claim.status}
                          </span>
                        </div>
                        <p className="text-slate-600 text-sm mt-1">
                          {claim.employee?.user?.firstName} {claim.employee?.user?.lastName}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                          <span>{claim.claimType}</span>
                          <span className="font-bold text-slate-900">RM {claim.amount.toFixed(2)}</span>
                          <span>{new Date(claim.claimDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {claim.attachments?.length > 0 && (
                        <div className="text-slate-400">
                          <FileText className="w-5 h-5" />
                          <span className="text-xs mt-1">{claim.attachments.length}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Claim Details & Action Panel */}
          {selectedClaim && (
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Claim Details</h3>

              {/* Employee Info */}
              <div className="mb-4 pb-4 border-b border-slate-200">
                <p className="text-sm text-slate-600">Employee</p>
                <p className="font-bold text-slate-900">
                  {selectedClaim.employee?.user?.firstName} {selectedClaim.employee?.user?.lastName}
                </p>
                <p className="text-sm text-slate-600">{selectedClaim.employee?.user?.email}</p>
              </div>

              {/* Claim Info */}
              <div className="space-y-3 mb-4 pb-4 border-b border-slate-200 text-sm">
                <div>
                  <p className="text-slate-600">Type</p>
                  <p className="font-bold text-slate-900">{selectedClaim.claimType}</p>
                </div>
                <div>
                  <p className="text-slate-600">Amount</p>
                  <p className="font-bold text-slate-900">RM {selectedClaim.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-600">Date</p>
                  <p className="font-bold text-slate-900">{new Date(selectedClaim.claimDate).toLocaleDateString()}</p>
                </div>
                {selectedClaim.description && (
                  <div>
                    <p className="text-slate-600">Description</p>
                    <p className="font-bold text-slate-900">{selectedClaim.description}</p>
                  </div>
                )}
              </div>

              {/* Attachments */}
              {selectedClaim.attachments?.length > 0 && (
                <div className="mb-4 pb-4 border-b border-slate-200">
                  <p className="text-sm text-slate-600 mb-2">Attachments ({selectedClaim.attachments.length})</p>
                  <div className="space-y-2">
                    {selectedClaim.attachments.map(att => (
                      <button
                        key={att.id}
                        type="button"
                        onClick={() => openAuthenticatedFile(`/api/secure-files/attachments/${att.id}/download`)}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 p-2 bg-blue-50 rounded w-full text-left"
                      >
                        <Download className="w-4 h-4" />
                        <span className="truncate">{att.fileName}</span>
                        <span className="text-xs text-slate-500">({(att.fileSize / 1024).toFixed(1)} KB)</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {['SUBMITTED', 'PENDING_APPROVAL', 'UNDER_REVIEW'].includes(selectedClaim.status) && (
                <>
                  {/* Comment */}
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Reason for rejection (if applicable)..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    rows={3}
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(selectedClaim.id)}
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(selectedClaim.id)}
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </>
              )}

              {!['SUBMITTED', 'PENDING_APPROVAL', 'UNDER_REVIEW'].includes(selectedClaim.status) && (
                <div className={`text-center p-3 rounded-lg ${
                  selectedClaim.status === 'APPROVED' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  <p className="font-bold">{selectedClaim.status}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
