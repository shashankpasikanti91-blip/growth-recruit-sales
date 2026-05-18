import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import api from '../../lib/api';
import { openAuthenticatedFile } from '../../lib/secureFile';
import { MessageCircle, FileText, Download, CheckCircle, XCircle, Clock, Calendar } from 'lucide-react';

export default function LeaveApprovalPage() {
  const router = useRouter();
  const [leaves, setLeaves] = useState([]);
  const [filter, setFilter] = useState('SUBMITTED');
  const [loading, setLoading] = useState(true);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [action, setAction] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Load leave requests
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/payroll/admin/leaves', { params: { status: filter } });
        setLeaves(res.data.data?.leaves || []);
      } catch (err) {
        console.error('Error loading leaves:', err);
        setToast({ type: 'error', msg: 'Failed to load leave requests' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filter]);

  const handleApprove = async (leaveId) => {
    if (!confirm('Approve this leave request?')) return;
    setSubmitting(true);
    try {
      await api.post(`/api/payroll/admin/leaves/${leaveId}/review`, { action: 'APPROVE', comment });
      setToast({ type: 'success', msg: 'Leave request approved' });
      setLeaves(leaves.filter(l => l.id !== leaveId));
      setSelectedLeave(null);
    } catch (err) {
      setToast({ type: 'error', msg: 'Failed to approve leave' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (leaveId) => {
    if (!comment.trim()) {
      setToast({ type: 'error', msg: 'Please provide a reason for rejection' });
      return;
    }
    if (!confirm('Reject this leave request?')) return;
    setSubmitting(true);
    try {
      await api.post(`/api/payroll/admin/leaves/${leaveId}/review`, { action: 'REJECT', comment });
      setToast({ type: 'success', msg: 'Leave request rejected' });
      setLeaves(leaves.filter(l => l.id !== leaveId));
      setSelectedLeave(null);
    } catch (err) {
      setToast({ type: 'error', msg: 'Failed to reject leave' });
    } finally {
      setSubmitting(false);
    }
  };

  const calcDays = (start, end) => {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((new Date(end) - new Date(start)) / msPerDay) + 1;
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

  const leaveTypeEmoji = (type) => {
    const emoji = {
      ANNUAL: '☀️',
      MEDICAL: '⚕️',
      EMERGENCY: '🆘',
      COMPASSIONATE: '🙏',
      UNPAID: '❌',
      NO_PAY: '❌'
    };
    return emoji[type] || '📋';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Leave Request Approval</h1>
            <p className="text-slate-600 mt-2">Review and approve employee leave requests</p>
          </div>
          <Link href="/payroll/admin-dashboard" className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`mb-4 p-4 rounded-lg ${toast.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {toast.msg}
          </div>
        )}

        {/* Filter */}
        <div className="mb-6 flex gap-2">
          {['SUBMITTED', 'APPROVED', 'REJECTED', 'ALL'].map(st => (
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
          {/* Leave List */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="bg-white rounded-lg p-8 text-center text-slate-500">Loading leave requests...</div>
            ) : leaves.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center text-slate-500">No leave requests found</div>
            ) : (
              <div className="space-y-3">
                {leaves.map(leave => (
                  <div
                    key={leave.id}
                    onClick={() => setSelectedLeave(leave)}
                    className={`bg-white border-2 rounded-lg p-4 cursor-pointer transition ${
                      selectedLeave?.id === leave.id
                        ? 'border-slate-900 shadow-md'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{leave.displayId}</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${statusColor(leave.status)}`}>
                            {statusIcon(leave.status)}
                            {leave.status}
                          </span>
                        </div>
                        <p className="text-slate-600 text-sm mt-1">
                          {leave.employee?.user?.firstName} {leave.employee?.user?.lastName}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                          <span>{leaveTypeEmoji(leave.leaveType)} {leave.leaveType}</span>
                          <span>{calcDays(leave.startDate, leave.endDate)} days</span>
                          <span className="text-xs">
                            {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {leave.attachments?.length > 0 && (
                        <div className="text-slate-400">
                          <FileText className="w-5 h-5" />
                          <span className="text-xs mt-1">{leave.attachments.length}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leave Details & Action Panel */}
          {selectedLeave && (
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Leave Details</h3>

              {/* Employee Info */}
              <div className="mb-4 pb-4 border-b border-slate-200">
                <p className="text-sm text-slate-600">Employee</p>
                <p className="font-bold text-slate-900">
                  {selectedLeave.employee?.user?.firstName} {selectedLeave.employee?.user?.lastName}
                </p>
                <p className="text-sm text-slate-600">{selectedLeave.employee?.user?.email}</p>
              </div>

              {/* Leave Info */}
              <div className="space-y-3 mb-4 pb-4 border-b border-slate-200 text-sm">
                <div>
                  <p className="text-slate-600">Type</p>
                  <p className="font-bold text-slate-900">
                    {leaveTypeEmoji(selectedLeave.leaveType)} {selectedLeave.leaveType}
                  </p>
                </div>
                <div>
                  <p className="text-slate-600">Duration</p>
                  <p className="font-bold text-slate-900">{calcDays(selectedLeave.startDate, selectedLeave.endDate)} days</p>
                </div>
                <div>
                  <p className="text-slate-600">Date Range</p>
                  <p className="font-bold text-slate-900">
                    {new Date(selectedLeave.startDate).toLocaleDateString()} - {new Date(selectedLeave.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-slate-600">Session</p>
                  <p className="font-bold text-slate-900">{selectedLeave.session}</p>
                </div>
                {selectedLeave.reason && (
                  <div>
                    <p className="text-slate-600">Reason</p>
                    <p className="font-bold text-slate-900">{selectedLeave.reason}</p>
                  </div>
                )}
              </div>

              {/* Attachments */}
              {selectedLeave.attachments?.length > 0 && (
                <div className="mb-4 pb-4 border-b border-slate-200">
                  <p className="text-sm text-slate-600 mb-2">Attachments ({selectedLeave.attachments.length})</p>
                  <div className="space-y-2">
                    {selectedLeave.attachments.map(att => (
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
              {selectedLeave.status === 'SUBMITTED' && (
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
                      onClick={() => handleApprove(selectedLeave.id)}
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(selectedLeave.id)}
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </>
              )}

              {selectedLeave.status !== 'SUBMITTED' && (
                <div className={`text-center p-3 rounded-lg ${
                  selectedLeave.status === 'APPROVED' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  <p className="font-bold">{selectedLeave.status}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
