'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';
import { openAuthenticatedFile } from '../../lib/secureFile';
import {
  CalendarCheck, Clock, CheckCircle2, XCircle, AlertCircle,
  ChevronDown, ChevronUp, User, FileText, Download, Eye,
  Loader2, Search, Filter
} from 'lucide-react';

const STATUS_CONFIG = {
  SUBMITTED: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', icon: Clock, label: 'Submitted' },
  PENDING_APPROVAL: { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', icon: AlertCircle, label: 'Pending Approval' },
  APPROVED: { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-700', icon: CheckCircle2, label: 'Approved' },
  REJECTED: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', icon: XCircle, label: 'Rejected' },
  CANCELLED: { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-700', icon: XCircle, label: 'Cancelled' },
};

const LEAVE_CONFIG = {
  ANNUAL: { label: 'Annual Leave', color: 'from-emerald-400 to-green-600', paid: true },
  MEDICAL: { label: 'Medical Leave', color: 'from-purple-400 to-violet-600', paid: true },
  HOSPITALIZATION: { label: 'Hospitalization Leave', color: 'from-red-400 to-rose-600', paid: true },
  COMPASSIONATE: { label: 'Compassionate Leave', color: 'from-blue-400 to-indigo-600', paid: true },
  REPLACEMENT: { label: 'Replacement Leave', color: 'from-amber-400 to-orange-500', paid: true },
  NO_PAY: { label: 'No Pay Leave', color: 'from-slate-400 to-slate-600', paid: false },
};

export default function LeaveStatus() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [expandedId, setExpandedId] = useState(null);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    loadLeaves();
  }, []);

  const loadLeaves = async () => {
    try {
      const res = await api.get('/api/my/leave');
      setLeaves(res.data.data?.leaves || []);
    } catch (err) {
      console.error('Failed to load leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = leaves.filter(leave => {
    const matchesSearch = 
      leave.displayId?.includes(searchTerm) ||
      leave.leaveType?.includes(searchTerm) ||
      leave.reason?.includes(searchTerm);
    
    const matchesStatus = filterStatus === 'ALL' || leave.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getApprovalProgress = (leave) => {
    if (!leave.approvals) return 0;
    const approved = leave.approvals.filter(a => a.status === 'APPROVED').length;
    const total = leave.approvals.length;
    return total > 0 ? (approved / total) * 100 : 0;
  };

  const getNextApprover = (leave) => {
    if (!leave.approvals) return null;
    const pending = leave.approvals.find(a => a.status === 'PENDING');
    if (!pending) return null;
    return {
      level: pending.approvalLevel,
      role: pending.approverRole,
      status: pending.status
    };
  };

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
            <h1 className="text-3xl font-bold text-gray-900">Leave Requests</h1>
            <p className="text-gray-600 mt-1">Track status of all your leave requests and approvals</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Total Requests</div>
            <div className="text-3xl font-bold text-indigo-600">{leaves.length}</div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-4">
          {['SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'].map((status) => {
            const count = leaves.filter(l => l.status === status).length;
            const config = STATUS_CONFIG[status];
            const Icon = config.icon;
            return (
              <div key={status} className={`${config.bg} border-2 ${config.border} rounded-lg p-4`}>
                <div className="flex items-center gap-3">
                  <Icon className="w-6 h-6 text-gray-700" />
                  <div>
                    <p className="text-sm text-gray-600">{config.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID, type, or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Status</option>
            {Object.keys(STATUS_CONFIG).map((status) => (
              <option key={status} value={status}>
                {STATUS_CONFIG[status].label}
              </option>
            ))}
          </select>
        </div>

        {/* Leave Requests List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No leave requests found</p>
            </div>
          ) : (
            filtered.map((leave) => {
              const config = STATUS_CONFIG[leave.status];
              const leaveConfig = LEAVE_CONFIG[leave.leaveType];
              const Icon = config.icon;
              const nextApprover = getNextApprover(leave);
              const isExpanded = expandedId === leave.id;

              return (
                <div
                  key={leave.id}
                  className={`border-2 ${config.border} ${config.bg} rounded-lg overflow-hidden`}
                >
                  {/* Main Card */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : leave.id)}
                    className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className="w-5 h-5" />
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${config.badge}`}>
                            {config.label}
                          </span>
                          <span className="text-xs font-mono text-gray-600">{leave.displayId}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {leaveConfig?.label || leave.leaveType}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <span>📅 {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</span>
                          <span>⏱️ {leave.daysCount} day(s)</span>
                          <span>{leaveConfig?.paid ? '💰 Paid' : '❌ Unpaid'}</span>
                        </div>

                        {/* Approval Progress */}
                        {leave.approvals && leave.approvals.length > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-semibold text-gray-700">Approval Progress</p>
                              <p className="text-xs text-gray-600">
                                {leave.approvals.filter(a => a.status === 'APPROVED').length}/{leave.approvals.length}
                              </p>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-300"
                                style={{ width: `${getApprovalProgress(leave)}%` }}
                              />
                            </div>

                            {/* Current Approver */}
                            {nextApprover && leave.status === 'PENDING_APPROVAL' && (
                              <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800">
                                ⏳ Waiting for <strong>{nextApprover.role}</strong> approval (Level {nextApprover.level})
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Expand Button */}
                      <button className="ml-4 p-1 text-gray-500 hover:text-gray-700">
                        {isExpanded ? <ChevronUp /> : <ChevronDown />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t-2 border-inherit p-4 bg-white bg-opacity-50">
                      {/* Description */}
                      {leave.reason && (
                        <div className="mb-4">
                          <p className="text-sm font-semibold text-gray-700 mb-1">Reason:</p>
                          <p className="text-sm text-gray-600">{leave.reason}</p>
                        </div>
                      )}

                      {/* Approvals Timeline */}
                      {leave.approvals && leave.approvals.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-semibold text-gray-700 mb-3">Approval Timeline:</p>
                          <div className="space-y-2">
                            {leave.approvals.map((approval, idx) => {
                              const isApproved = approval.status === 'APPROVED';
                              const isRejected = approval.status === 'REJECTED';
                              
                              return (
                                <div key={approval.id} className="flex gap-3 text-sm">
                                  <div className="flex flex-col items-center">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                      isApproved ? 'bg-green-500 text-white' :
                                      isRejected ? 'bg-red-500 text-white' :
                                      'bg-gray-300 text-gray-700'
                                    }`}>
                                      {idx + 1}
                                    </div>
                                    {idx < leave.approvals.length - 1 && (
                                      <div className="w-0.5 h-6 bg-gray-300 mt-1" />
                                    )}
                                  </div>
                                  <div className="flex-1 py-1">
                                    <p className="font-semibold text-gray-900">
                                      Level {approval.approvalLevel} - {approval.approverRole}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      {isApproved && `✓ Approved on ${new Date(approval.approvedAt).toLocaleDateString()}`}
                                      {isRejected && `✗ Rejected on ${new Date(approval.approvedAt).toLocaleDateString()}`}
                                      {approval.status === 'PENDING' && '⏳ Pending'}
                                    </p>
                                    {approval.comments && (
                                      <p className="text-xs text-gray-600 mt-1">💬 {approval.comments}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Attachments */}
                      {leave.attachments && leave.attachments.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Attachments:</p>
                          <div className="space-y-1">
                            {leave.attachments.map((att) => (
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

                      {/* Action Buttons */}
                      {['SUBMITTED', 'PENDING_APPROVAL'].includes(leave.status) && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedLeave(leave);
                              setShowDetail(true);
                            }}
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold flex items-center justify-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View Full Details
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
