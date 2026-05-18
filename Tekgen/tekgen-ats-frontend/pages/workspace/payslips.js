import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';
import { Download, Printer, ChevronDown } from 'lucide-react';

export default function MyPayslips() {
  const router = useRouter();
  const [payslips, setPayslips] = useState([]);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [toast, setToast] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const resProfile = await api.get('/api/my/profile');
      setEmployee(resProfile.data.data);

      // Fetch from API
      const resPayslips = await api.get(`/api/payroll/my-payslips?month=${month}&year=${year}`);
      const data = resPayslips.data.data;
      
      if (data.payslips && data.payslips.length > 0) {
        setPayslips(data.payslips);
        setSelectedPayslip(data.payslips[0]);
      } else {
        setPayslips([]);
        setSelectedPayslip(null);
      }
    } catch (err) {
      console.error('Error:', err);
      setToast({ type: 'error', msg: 'Failed to load payslips' });
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDownload = async () => {
    if (!selectedPayslip) return;
    
    try {
      setDownloading(true);
      const res = await api.get(`/api/payroll/my-payslips/download/${selectedPayslip.id}`);
      const signedUrl = res.data?.data?.signedUrl;
      if (signedUrl) {
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
        setToast({ type: 'success', msg: `Secure download link opened (expires soon)` });
      } else {
        setToast({ type: 'error', msg: 'Secure download link unavailable for this payslip' });
      }
    } catch (err) {
      console.error('Error:', err);
      setToast({ type: 'error', msg: 'Failed to download payslip' });
    } finally {
      setDownloading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const ps = selectedPayslip;
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];
  const months = [
    { val: 1, label: 'January' }, { val: 2, label: 'February' }, { val: 3, label: 'March' },
    { val: 4, label: 'April' }, { val: 5, label: 'May' }, { val: 6, label: 'June' },
    { val: 7, label: 'July' }, { val: 8, label: 'August' }, { val: 9, label: 'September' },
    { val: 10, label: 'October' }, { val: 11, label: 'November' }, { val: 12, label: 'December' }
  ];

  return (
    <DashboardLayout title="My Workspace › My Payslips">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg text-sm font-medium z-50 ${
          toast.type === 'success' 
            ? 'bg-green-100 border border-green-300 text-green-700' 
            : 'bg-red-100 border border-red-300 text-red-700'
        }`}>
          {toast.msg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-slate-600">Loading payslips...</p>
        </div>
      ) : !ps ? (
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-20 text-center max-w-5xl mx-auto">
          <p className="text-slate-600">No payslips available for {months.find(m => m.val === month)?.label} {year}</p>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Filters */}
          <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600">Month:</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                >
                  {months.map(m => (
                    <option key={m.val} value={m.val}>{m.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600">Year:</label>
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 print:hidden">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-400 flex items-center gap-2 text-sm font-medium"
              >
                <Download className="w-4 h-4" /> {downloading ? 'Downloading...' : 'Download'}
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 flex items-center gap-2 text-sm font-medium"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
            </div>
          </div>

          {/* Payslip Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Payslip - {ps.displayPeriod}</h2>
              <p className="text-sm text-slate-600 mt-1">Pay Status: <span className="font-medium text-blue-600">{ps.payrollRun?.status || 'PENDING'}</span></p>
            </div>
          </div>

          {/* Payslip Content */}
          <div id="payslip-print" className="bg-white rounded-xl border border-slate-200 p-8">
            {/* Header */}
            <div className="border-b-2 border-slate-300 pb-6 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">TEKGEN</h1>
                  <p className="text-slate-600 text-sm">Tekgen Solutions Sdn. Bhd.</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">PAYSLIP</p>
                  <p className="text-sm text-slate-600">{ps.displayPeriod}</p>
                  <p className="text-xs text-slate-500 mt-1">{ps.displayId}</p>
                </div>
              </div>
            </div>

            {/* Employee & Period Info */}
            <div className="grid grid-cols-2 gap-8 mb-6 pb-6 border-b border-slate-200">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Employee</p>
                <p className="font-bold text-slate-900">{employee?.firstName} {employee?.lastName}</p>
                <p className="text-sm text-slate-600">ID: {employee?.employeeId}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Period</p>
                <p className="text-sm text-slate-900">{ps.displayPeriod}</p>
              </div>
            </div>

            {/* Attendance */}
            <div className="mb-6 pb-6 border-b border-slate-200">
              <p className="font-bold text-slate-900 mb-3">Attendance Summary</p>
              <div className="grid grid-cols-5 gap-3 text-sm">
                <div className="bg-slate-50 p-3 rounded"><p className="text-slate-600 text-xs">Days Worked</p><p className="font-bold text-lg">{ps.daysWorked || 0}</p></div>
                <div className="bg-slate-50 p-3 rounded"><p className="text-slate-600 text-xs">Absent</p><p className="font-bold text-lg">{ps.daysAbsent || 0}</p></div>
                <div className="bg-slate-50 p-3 rounded"><p className="text-slate-600 text-xs">Leave Used</p><p className="font-bold text-lg">{ps.leaveUsed || 0}</p></div>
                <div className="bg-slate-50 p-3 rounded"><p className="text-slate-600 text-xs">Weekend</p><p className="font-bold text-lg">{ps.weekendDays || 0}</p></div>
                <div className="bg-slate-50 p-3 rounded"><p className="text-slate-600 text-xs">Holiday</p><p className="font-bold text-lg">{ps.holidays || 0}</p></div>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="mb-6 pb-6 border-b border-slate-200">
              <p className="font-bold text-slate-900 mb-3">Earnings</p>
              <table className="w-full text-sm mb-4">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="py-2 text-slate-700">Basic Salary</td>
                    <td className="py-2 text-right font-bold">RM {ps.basicSalary?.toFixed(2) || '0.00'}</td>
                  </tr>
                  {ps.allowances && Object.entries(ps.allowances).map(([key, val]) => val > 0 ? (
                    <tr key={key} className="border-b border-slate-200">
                      <td className="py-2 text-slate-700 capitalize">{key}</td>
                      <td className="py-2 text-right font-bold">RM {parseFloat(val).toFixed(2)}</td>
                    </tr>
                  ) : null)}
                  <tr className="border-b-2 border-slate-300 bg-blue-50 font-bold">
                    <td className="py-2">Gross Salary</td>
                    <td className="py-2 text-right">RM {ps.grossSalary?.toFixed(2) || '0.00'}</td>
                  </tr>
                </tbody>
              </table>

              {/* Deductions */}
              <p className="font-bold text-slate-900 mt-6 mb-3">Deductions</p>
              <table className="w-full text-sm mb-4">
                <tbody>
                  {ps.epfEmployee && (
                    <tr className="border-b border-slate-200">
                      <td className="py-2 text-slate-700">EPF (8%)</td>
                      <td className="py-2 text-right">RM {ps.epfEmployee.toFixed(2)}</td>
                    </tr>
                  )}
                  {ps.socsoEmployee && (
                    <tr className="border-b border-slate-200">
                      <td className="py-2 text-slate-700">SOCSO (0.5%)</td>
                      <td className="py-2 text-right">RM {ps.socsoEmployee.toFixed(2)}</td>
                    </tr>
                  )}
                  {ps.eisEmployee && (
                    <tr className="border-b border-slate-200">
                      <td className="py-2 text-slate-700">EIS (0.4%)</td>
                      <td className="py-2 text-right">RM {ps.eisEmployee.toFixed(2)}</td>
                    </tr>
                  )}
                  {ps.incomeTax && (
                    <tr className="border-b border-slate-200">
                      <td className="py-2 text-slate-700">Income Tax (PCB)</td>
                      <td className="py-2 text-right">RM {ps.incomeTax.toFixed(2)}</td>
                    </tr>
                  )}
                  {ps.otherDeductions && (
                    <tr className="border-b border-slate-200">
                      <td className="py-2 text-slate-700">Other Deductions</td>
                      <td className="py-2 text-right">RM {ps.otherDeductions.toFixed(2)}</td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-slate-300 bg-green-50 font-bold">
                    <td className="py-2">Total Deductions</td>
                    <td className="py-2 text-right">RM {ps.totalDeductions?.toFixed(2) || '0.00'}</td>
                  </tr>
                </tbody>
              </table>

              {/* Net Pay */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <p className="text-lg font-bold text-slate-900">NET PAY (Take Home)</p>
                  <p className="text-3xl font-bold text-green-600">RM {ps.netSalary?.toFixed(2) || (ps.grossSalary - ps.totalDeductions).toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Employer Contributions */}
            {(ps.epfEmployer || ps.socsoEmployer || ps.eisEmployer || ps.hrdf) && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600">
                <p className="font-bold text-slate-700 mb-2">Employer Contributions (Informational Only)</p>
                <div className="grid grid-cols-4 gap-4">
                  {ps.epfEmployer && <p>EPF: <span className="font-bold">RM {ps.epfEmployer.toFixed(2)}</span></p>}
                  {ps.socsoEmployer && <p>SOCSO: <span className="font-bold">RM {ps.socsoEmployer.toFixed(2)}</span></p>}
                  {ps.eisEmployer && <p>EIS: <span className="font-bold">RM {ps.eisEmployer.toFixed(2)}</span></p>}
                  {ps.hrdf && <p>HRDF: <span className="font-bold">RM {ps.hrdf.toFixed(2)}</span></p>}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-slate-300 mt-8 pt-6 text-center text-xs text-slate-600">
              <p>This is an electronically generated payslip | © 2026 Tekgen Solutions</p>
              <p className="mt-2 text-slate-500">Generated: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
