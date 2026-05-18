'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';
import { openAuthenticatedFile } from '../../lib/secureFile';
import { getUser } from '../../lib/auth';
import {
  CheckCircle2, XCircle, AlertCircle, Loader2, Search,
  MessageSquare, User, Calendar, FileText, Download, Eye,
  ChevronDown, ChevronUp, Send
} from 'lucide-react';

const APPROVAL_TYPE_CONFIG = {
  'leaves': { label: 'Leave Requests', icon: Calendar, color: 'blue' },
  'claims': { label: 'Expense Claims', icon: FileText, color: 'purple' },
};

const LEAVE_TYPE_CONFIG = {
  ANNUAL: { label: 'Annual', color: 'emerald' },
  MEDICAL: { label: 'Medical', color: 'purple' },
  HOSPITALIZATION: { label: 'Hospitalization', color: 'red' },
  COMPASSIONATE: { label: 'Compassionate', color: 'blue' },
  REPLACEMENT: { label: 'Replacement', color: 'amber' },
  NO_PAY: { label: 'No Pay', color: 'slate' },
};

const CLAIM_TYPE_CONFIG = {
  MEDICAL: { label: 'Medical', color: 'red' },
  TRANSPORT: { label: 'Transport', color: 'blue' },
  MEAL: { label: 'Meal', color: 'orange' },
  ACCOMMODATION: { label: 'Accommodation', color: 'purple' },
  PHONE: { label: 'Phone', color: 'cyan' },
  OTHER: { label: 'Other', color: 'gray' },
};

/** Same leadership set as Executive Pending Center — they use the consolidated queue instead. */
const APPROVAL_QUEUE_REDIRECT_ROLES = new Set([
  'MANAGEMENT', 'ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'HEAD', 'MD', 'MANAGING_DIRECTOR',
  'DEPT_HEAD', 'DEPARTMENT_HEAD', 'COMPANY_HEAD',
]);

export default function ApprovalQueue() {
  const router = useRouter();
  const [leaves, setLeaves] = useState([]);
  const [claims, setClaims] = useState([]);
  const [activeTab, setActiveTab] = useState('leaves');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [comments, setComments] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    const u = getUser();
    if (u?.role && APPROVAL_QUEUE_REDIRECT_ROLES.has(u.role)) {
      router.replace('/executive/pending-center');
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount; exec users redirect before load
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const tab = Array.isArray(router.query.tab) ? router.query.tab[0] : router.query.tab;
    if (tab === 'leaves' || tab === 'claims') {
      setActiveTab(tab);
    }
  }, [router.isReady, router.query.tab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashRes, leavesRes, claimsRes] = await Promise.all([
        api.get('/api/payroll/approver/dashboard'),
        api.get('/api/payroll/approver/leaves'),
        api.get('/api/payroll/approver/claims'),
      ]);

      setDashboard(dashRes.data.data);
      setLeaves(leavesRes.data.data?.approvals || []);
      setClaims(claimsRes.data.data?.approvals || []);
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedItem) return;

    setProcessing(selectedItem.id);
    try {
      const endpoint = activeTab === 'leaves'
        ? `/api/payroll/approver/leaves/${selectedItem.leaveRequest?.id || selectedItem.leave?.id}/action`
        : `/api/payroll/approver/claims/${selectedItem.claim?.id}/action`;

      await api.post(endpoint, {
        action: 'APPROVE',
        comments: comments || null
      });

      setShowApproveModal(false);
      setComments('');
      setSelectedItem(null);
      loadData(); // Reload data
    } catch (err) {
      console.error('Failed to approve:', err);
      alert('Failed to approve. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedItem || !comments.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setProcessing(selectedItem.id);
    try {
      const endpoint = activeTab === 'leaves'
        ? `/api/payroll/approver/leaves/${selectedItem.leaveRequest?.id || selectedItem.leave?.id}/action`
        : `/api/payroll/approver/claims/${selectedItem.claim?.id}/action`;

      await api.post(endpoint, {
        action: 'REJECT',
        comments: comments
      });

      setShowRejectModal(false);
      setComments('');
      setSelectedItem(null);
      loadData();
    } catch (err) {
      console.error('Failed to reject:', err);
      alert('Failed to reject. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const currentItems = activeTab === 'leaves' ? leaves : claims;
  const filtered = currentItems.filter(item => {
    const emp = activeTab === 'leaves' 
      ? item.leaveRequest?.employee 
      : item.claim?.employee;
    
    return emp?.user?.firstName?.includes(searchTerm) ||
           emp?.employeeId?.includes(searchTerm) ||
           emp?.user?.email?.includes(searchTerm);
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Approval Queue</h1>
            <p className="text-gray-600 mt-1">Review and approve pending leave and claim requests</p>
          </div>
        </div>

        {/* Dashboard Summary */}
        {dashboard && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Pending Leaves</p>
              <p className="text-3xl font-bold text-blue-600">{dashboard.pending.leaves}</p>
            </div>
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Pending Claims</p>
              <p className="text-3xl font-bold text-purple-600">{dashboard.pending.claims}</p>
            </div>
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Approved (7 days)</p>
              <p className="text-3xl font-bold text-green-600">{dashboard.recent.approvals}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {Object.keys(APPROVAL_TYPE_CONFIG).map((type) => {
            const config = APPROVAL_TYPE_CONFIG[type];
            const Icon = config.icon;
            const count = type === 'leaves' ? leaves.length : claims.length;

            return (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`px-6 py-3 font-semibold flex items-center gap-2 transition-colors ${
                  activeTab === type
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-600 border-b-2 border-transparent hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                {config.label}
                <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-mono">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by employee name, ID, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Items List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <CheckCircle2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-semibold">No pending {activeTab} to review</p>
              <p className="text-sm text-gray-500 mt-1">Great job! Keep up the good work.</p>
            </div>
          ) : (
            filtered.map((item) => {
              const isExpanded = expandedId === item.id;
              const data = activeTab === 'leaves' ? item.leaveRequest : item.claim;
              const employee = data.employee;
              const isLeave = activeTab === 'leaves';
              const typeConfig = isLeave ? LEAVE_TYPE_CONFIG[data.leaveType] : CLAIM_TYPE_CONFIG[data.claimType];

              return (
                <div
                  key={item.id}
                  className="border-2 border-yellow-200 bg-yellow-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Main Card */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="p-4 cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Employee Info & Request Type */}
                        <div className="flex items-center gap-4 mb-2">
                          <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                            {employee?.user?.firstName?.[0]}{employee?.user?.lastName?.[0]}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">
                              {employee?.user?.firstName} {employee?.user?.lastName}
                            </h3>
                            <p className="text-xs text-gray-600">
                              {employee?.employeeId} • {employee?.department}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold bg-${typeConfig?.color}-100 text-${typeConfig?.color}-700`}>
                            {typeConfig?.label || (isLeave ? data.leaveType : data.claimType)}
                          </span>
                        </div>

                        {/* Request Details */}
                        <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                          <div>
                            <p className="text-gray-600">Request ID</p>
                            <p className="font-mono font-semibold text-gray-900">{data.displayId}</p>
                          </div>
                          {isLeave ? (
                            <>
                              <div>
                                <p className="text-gray-600">Duration</p>
                                <p className="font-semibold text-gray-900">{data.daysCount} day(s)</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <p className="text-gray-600">Amount</p>
                                <p className="font-semibold text-gray-900">{data.currency} {data.amount.toFixed(2)}</p>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Dates */}
                        {isLeave ? (
                          <div className="mt-2 text-sm text-gray-600">
                            📅 {new Date(data.startDate).toLocaleDateString()} - {new Date(data.endDate).toLocaleDateString()}
                          </div>
                        ) : (
                          <div className="mt-2 text-sm text-gray-600">
                            📅 Claim Date: {new Date(data.claimDate).toLocaleDateString()}
                          </div>
                        )}

                        {/* Reason */}
                        {data.reason && (
                          <p className="mt-2 text-sm text-gray-700">
                            <strong>Reason:</strong> {data.reason}
                          </p>
                        )}

                        {/* Approval Level Indicator */}
                        {item.approvalLevel && (
                          <div className="mt-2 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded inline-block">
                            🎯 Level {item.approvalLevel} Approval Required
                          </div>
                        )}
                      </div>

                      {/* Expand Button */}
                      <button className="ml-4 p-1 text-gray-500 hover:text-gray-700">
                        {isExpanded ? <ChevronUp /> : <ChevronDown />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details & Actions */}
                  {isExpanded && (
                    <div className="border-t-2 border-yellow-200 p-4 bg-white bg-opacity-50 space-y-4">
                      {/* Description */}
                      {(data.reason || data.description) && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-1">Description:</p>
                          <p className="text-sm text-gray-600">{data.reason || data.description}</p>
                        </div>
                      )}

                      {/* Attachments */}
                      {data.attachments && data.attachments.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-2">Attachments:</p>
                          <div className="space-y-1">
                            {data.attachments.map((att) => (
                              <button
                                key={att.id}
                                type="button"
                                onClick={() => openAuthenticatedFile(`/api/secure-files/attachments/${att.id}/download`)}
                                className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800"
                              >
                                <FileText className="w-4 h-4" />
                                {att.fileName}
                                <Download className="w-3 h-3" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Approval History */}
                      {data.approvals && data.approvals.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-2">Approval History:</p>
                          <div className="space-y-2">
                            {data.approvals.map((approval, idx) => (
                              <div key={approval.id} className="flex gap-3 text-xs">
                                <div className="flex flex-col items-center">
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                                    approval.status === 'APPROVED' ? 'bg-green-500 text-white' :
                                    approval.status === 'REJECTED' ? 'bg-red-500 text-white' :
                                    'bg-yellow-400 text-white'
                                  }`}>
                                    {idx + 1}
                                  </div>
                                </div>
                                <div className="flex-1 py-1">
                                  <p className="font-semibold">Level {approval.approvalLevel} - {approval.approverRole}</p>
                                  <p className="text-gray-600">
                                    {approval.status === 'APPROVED' && `✓ Approved`}
                                    {approval.status === 'REJECTED' && `✗ Rejected`}
                                    {approval.status === 'PENDING' && `⏳ Pending (Current)`}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowApproveModal(true);
                            setComments('');
                          }}
                          disabled={processing === item.id}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold flex items-center justify-center gap-2 text-sm"
                        >
                          {processing === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowRejectModal(true);
                            setComments('');
                          }}
                          disabled={processing === item.id}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-semibold flex items-center justify-center gap-2 text-sm"
                        >
                          {processing === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Approve {activeTab === 'leaves' ? 'Leave' : 'Claim'}?</h2>
            <textarea
              placeholder="Add optional comments or notes..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowApproveModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={processing === selectedItem?.id}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-semibold flex items-center justify-center gap-2"
              >
                {processing === selectedItem?.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Reject {activeTab === 'leaves' ? 'Leave' : 'Claim'}?</h2>
            <textarea
              placeholder="Reason for rejection (required)..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={3}
              required
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing === selectedItem?.id || !comments.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-semibold flex items-center justify-center gap-2"
              >
                {processing === selectedItem?.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
