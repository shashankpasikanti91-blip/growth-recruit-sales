'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Link from 'next/link';
import api from '../../lib/api';
import { Users, PlusCircle, Search, Loader2 } from 'lucide-react';

export default function HREmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEmployees();
  }, [search, status]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/hrms/employees?status=${encodeURIComponent(status)}&limit=200&search=${encodeURIComponent(search)}`);
      setEmployees(res.data.data?.employees || []);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load employee directory');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="HR › Employees">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Employee Directory</h2>
            <p className="text-sm text-slate-500 mt-0.5">All active employees · Profiles · Departments</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employee / department"
                className="pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="ACTIVE">Active</option>
              <option value="PROBATION">Probation</option>
              <option value="ON_NOTICE">On Notice</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="RESIGNED">Resigned</option>
              <option value="TERMINATED">Terminated</option>
              <option value="ALL">All</option>
            </select>
            <Link href="/hr/employees/import" className="btn-ghost text-sm inline-flex items-center">Import Existing</Link>
            <Link href="/hr/employees/new" className="btn-primary text-sm inline-flex items-center"><PlusCircle size={14} /> Add Employee</Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 px-3 py-2">{error}</div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading employees...
            </div>
          ) : employees.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-center">
              <div>
                <Users size={32} className="text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500">No employees found</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left">Employee ID</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Designation</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">
                      <Link href={`/hr/employees/${emp.id}`} className="text-blue-600 hover:underline">{emp.employeeId || '-'}</Link>
                    </td>
                    <td className="px-4 py-3">{emp.user?.firstName} {emp.user?.lastName}</td>
                    <td className="px-4 py-3">{emp.department || '-'}</td>
                    <td className="px-4 py-3">{emp.designation || '-'}</td>
                    <td className="px-4 py-3">{emp.user?.role || '-'}</td>
                    <td className="px-4 py-3">{emp.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/hr/employees/${emp.id}`} className="text-blue-600 hover:underline">View</Link>
                        <Link href={`/hr/employees/${emp.id}`} className="text-slate-600 hover:underline">Edit</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
