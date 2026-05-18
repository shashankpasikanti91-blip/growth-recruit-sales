'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import {
  Briefcase,
  DollarSign,
  Calendar,
  FileText,
  Check,
  Clock,
  AlertCircle,
  Download,
  Eye,
} from 'lucide-react';

export default function DeployedStaffDashboard() {
  const [currentAssignment, setCurrentAssignment] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch deployed staff specific data
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  // Mock data for deployed staff
  const mockAssignment = {
    id: 'ASN-001',
    clientName: 'Acme Manufacturing Sdn Bhd',
    clientCity: 'Shah Alam, Selangor',
    role: 'Senior Talent Acquisition Specialist',
    startDate: '2026-01-15',
    endDate: '2026-12-31',
    billingRate: 8500,
    paymentType: 'MONTHLY',
    status: 'ACTIVE',
    manager: 'Ravi Kumar',
    managerPhone: '+60 12 345 6789',
    managerEmail: 'ravi@acme.my',
  };

  const mockAttendance = [
    { date: '2026-05-06', status: 'PRESENT', checkIn: '09:00', checkOut: '17:30', hours: 8.5 },
    { date: '2026-05-05', status: 'PRESENT', checkIn: '09:15', checkOut: '17:45', hours: 8.5 },
    { date: '2026-05-04', status: 'PRESENT', checkIn: '09:00', checkOut: '18:00', hours: 9 },
    { date: '2026-05-03', status: 'WEEKEND', checkIn: null, checkOut: null, hours: 0 },
    { date: '2026-05-02', status: 'PRESENT', checkIn: '09:00', checkOut: '17:30', hours: 8.5 },
    { date: '2026-05-01', status: 'PUBLIC_HOLIDAY', checkIn: null, checkOut: null, hours: 0 },
  ];

  const mockInvoices = [
    {
      id: 'INV-2026-05-001',
      month: 'May 2026',
      period: '1-31 May 2026',
      amount: 8500,
      status: 'GENERATED',
      generatedDate: '2026-05-01',
      sentDate: '2026-05-02',
      dueDate: '2026-05-30',
    },
    {
      id: 'INV-2026-04-001',
      month: 'April 2026',
      period: '1-30 April 2026',
      amount: 8500,
      status: 'PAID',
      generatedDate: '2026-04-01',
      sentDate: '2026-04-02',
      paidDate: '2026-04-20',
    },
  ];

  const mockPayments = [
    {
      id: 'PAY-2026-04',
      amount: 8500,
      date: '2026-04-20',
      reference: 'TRF20260420001',
      status: 'PAID',
      invoice: 'INV-2026-04-001',
    },
    {
      id: 'PAY-2026-03',
      amount: 8500,
      date: '2026-03-18',
      reference: 'TRF20260318001',
      status: 'PAID',
      invoice: 'INV-2026-03-001',
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'PAID':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'GENERATED':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'PENDING':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PAID':
      case 'ACTIVE':
        return <Check size={16} className="text-green-600" />;
      case 'PENDING':
        return <Clock size={16} className="text-yellow-600" />;
      case 'GENERATED':
        return <FileText size={16} className="text-blue-600" />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout title="ESS › Deployed Staff Dashboard">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Deployed Staff Portal</h2>
          <p className="text-sm text-slate-500 mt-1">
            View your assignment, attendance, invoices, and payment history
          </p>
        </div>

        {/* Current Assignment Card */}
        {mockAssignment && (
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg text-white p-6 shadow-lg">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold mb-1">{mockAssignment.clientName}</h3>
                <p className="text-blue-100 text-sm">{mockAssignment.clientCity}</p>
              </div>
              <span className="bg-green-400 text-green-900 px-3 py-1 rounded-full text-sm font-semibold">
                ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white bg-opacity-20 rounded p-3">
                <p className="text-blue-100 text-xs uppercase mb-1">Role</p>
                <p className="font-semibold">{mockAssignment.role}</p>
              </div>
              <div className="bg-white bg-opacity-20 rounded p-3">
                <p className="text-blue-100 text-xs uppercase mb-1">Duration</p>
                <p className="font-semibold">
                  {new Date(mockAssignment.startDate).toLocaleDateString()} -{' '}
                  {new Date(mockAssignment.endDate).toLocaleDateString()}
                </p>
              </div>
              <div className="bg-white bg-opacity-20 rounded p-3">
                <p className="text-blue-100 text-xs uppercase mb-1">Billing Rate</p>
                <p className="font-semibold text-lg">RM {mockAssignment.billingRate.toLocaleString()}</p>
              </div>
              <div className="bg-white bg-opacity-20 rounded p-3">
                <p className="text-blue-100 text-xs uppercase mb-1">Payment Type</p>
                <p className="font-semibold">{mockAssignment.paymentType}</p>
              </div>
            </div>

            <div className="border-t border-white border-opacity-30 pt-4">
              <p className="text-blue-100 text-sm mb-2">
                <strong>Assignment Manager:</strong> {mockAssignment.manager} |{' '}
                {mockAssignment.managerPhone}
              </p>
              <p className="text-blue-100 text-sm">
                <strong>Email:</strong> {mockAssignment.managerEmail}
              </p>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">This Month Attendance</span>
              <Calendar size={18} className="text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">20</p>
            <p className="text-xs text-slate-500 mt-1">Working days</p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">Total Hours</span>
              <Clock size={18} className="text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">160</p>
            <p className="text-xs text-slate-500 mt-1">This month</p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">Pending Invoice</span>
              <FileText size={18} className="text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">1</p>
            <p className="text-xs text-slate-500 mt-1">RM 8,500.00</p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-600 text-sm font-medium">Last Payment</span>
              <DollarSign size={18} className="text-green-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">RM 8.5K</p>
            <p className="text-xs text-slate-500 mt-1">20 April 2026</p>
          </div>
        </div>

        {/* Attendance */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Recent Attendance</h3>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Check-In</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Check-Out</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Hours</th>
                </tr>
              </thead>
              <tbody>
                {mockAttendance.map((att, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {new Date(att.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          att.status === 'PRESENT'
                            ? 'bg-green-100 text-green-800'
                            : att.status === 'WEEKEND'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {att.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{att.checkIn || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{att.checkOut || '-'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                      {att.hours > 0 ? att.hours : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoices */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Invoices & Billing</h3>
          <div className="space-y-3">
            {mockInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className={`rounded-lg border p-4 flex items-center justify-between ${getStatusColor(
                  invoice.status
                )}`}
              >
                <div className="flex items-center gap-4">
                  {getStatusIcon(invoice.status)}
                  <div>
                    <p className="font-semibold text-sm">{invoice.month}</p>
                    <p className="text-xs">{invoice.period}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-8">
                  <div className="text-right">
                    <p className="font-bold text-lg">RM {invoice.amount.toLocaleString()}</p>
                    <p className="text-xs">
                      {invoice.status === 'PAID' ? 'Paid' : 'Pending'}{' '}
                      {invoice.status === 'PAID' ? invoice.paidDate : invoice.dueDate}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-slate-200 rounded-lg transition">
                      <Eye size={16} />
                    </button>
                    <button className="p-2 hover:bg-slate-200 rounded-lg transition">
                      <Download size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment History */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Payment History</h3>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Payment ID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Reference
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockPayments.map((payment, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{payment.id}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                      RM {payment.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(payment.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{payment.reference}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-800 rounded">
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
