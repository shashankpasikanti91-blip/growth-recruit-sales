'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Plus, List, Grid3x3, Calendar, AlertCircle, ChevronRight } from 'lucide-react';

export default function LeaveDashboard() {
  const router = useRouter();
  const [view, setView] = useState('grid');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const leaveTypes = [
    {
      id: 'ANNUAL',
      name: 'Annual Leave',
      subtitle: 'Yearly vacation entitlement',
      color: 'from-green-400 to-green-600',
      icon: '☀️',
      entitled: 11,
      taken: 7,
      remaining: 4,
      pending: 0,
    },
    {
      id: 'MEDICAL',
      name: 'Medical Leave',
      subtitle: 'Sick leave entitlement',
      color: 'from-purple-400 to-purple-600',
      icon: '⚕️',
      entitled: 14,
      taken: 0,
      remaining: 14,
      pending: 0,
    },
    {
      id: 'HOSPITALIZATION',
      name: 'Hospitalization Leave',
      subtitle: 'Emergency medical leave',
      color: 'from-red-400 to-red-600',
      icon: '🏥',
      entitled: 60,
      taken: 0,
      remaining: 60,
      pending: 0,
    },
    {
      id: 'COMPASSIONATE',
      name: 'Compassionate Leave',
      subtitle: 'Family emergency leave',
      color: 'from-blue-400 to-blue-600',
      icon: '💙',
      entitled: 3,
      taken: 0,
      remaining: 3,
      pending: 0,
    },
    {
      id: 'NO_PAY',
      name: 'No Pay Leave',
      subtitle: 'Unpaid leave',
      color: 'from-slate-400 to-slate-600',
      icon: '📋',
      entitled: 0,
      taken: 0,
      remaining: 0,
      pending: 0,
    },
    {
      id: 'REPLACEMENT',
      name: 'Replacement Leave',
      subtitle: 'Weekend replacement',
      color: 'from-amber-400 to-amber-600',
      icon: '🔄',
      entitled: 0,
      taken: 0,
      remaining: 0,
      pending: 0,
    },
    {
      id: 'COMPANY_OFF',
      name: 'Company Off',
      subtitle: 'Company closure days',
      color: 'from-cyan-400 to-cyan-600',
      icon: '🏢',
      entitled: 0,
      taken: 0,
      remaining: 0,
      pending: 0,
    },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Leave Management - Tekgen</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Leave Management</h1>
              <p className="text-slate-600 mt-1">View and apply for leaves</p>
            </div>
            <button
              onClick={() => router.push('/workspace/leave')}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              <Plus size={20} />
              Apply Leave
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex gap-3 mb-8">
            <button
              onClick={() => setView('grid')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                view === 'grid'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <Grid3x3 size={18} />
              Grid View
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                view === 'list'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <List size={18} />
              List View
            </button>
          </div>

          {/* GRID VIEW */}
          {view === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {leaveTypes.map((leave) => (
                <div
                  key={leave.id}
                  className={`relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 cursor-pointer group bg-gradient-to-br ${leave.color} min-h-80`}
                  onClick={() => router.push(`/workspace/leave?type=${leave.id}`)}
                >
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-all" />
                  <div className="relative p-6 h-full flex flex-col text-white">
                    <div className="text-4xl mb-3 opacity-80">{leave.icon}</div>
                    <h2 className="text-2xl font-bold mb-1">{leave.name}</h2>
                    <p className="text-white/80 text-sm mb-6 flex-grow">{leave.subtitle}</p>
                    <div className="grid grid-cols-3 gap-3 mb-6 text-center">
                      <div>
                        <p className="text-white/70 text-xs font-medium uppercase mb-1">Entitled</p>
                        <p className="text-3xl font-bold">{leave.entitled}</p>
                      </div>
                      <div>
                        <p className="text-white/70 text-xs font-medium uppercase mb-1">Taken</p>
                        <p className="text-3xl font-bold">{leave.taken}</p>
                      </div>
                      <div>
                        <p className="text-white/70 text-xs font-medium uppercase mb-1">Remaining</p>
                        <p className="text-3xl font-bold">{leave.remaining}</p>
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full transition-all"
                          style={{
                            width: `${leave.entitled > 0 ? (leave.taken / leave.entitled) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-white/70 mt-2">
                        {leave.taken} of {leave.entitled} used
                      </p>
                    </div>
                    <button
                      className="mt-auto w-full bg-white/25 hover:bg-white/40 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 group"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/workspace/leave?type=${leave.id}`);
                      }}
                    >
                      APPLY <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* LIST VIEW */}
          {view === 'list' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Leave Type</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900">Entitled</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900">Taken</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900">Remaining</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900">Pending</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {leaveTypes.map((leave) => (
                      <tr key={leave.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{leave.icon}</span>
                            <div>
                              <p className="font-semibold">{leave.name}</p>
                              <p className="text-xs text-slate-500">{leave.subtitle}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-slate-900">{leave.entitled}</td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-slate-900">{leave.taken}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-700">
                            {leave.remaining}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-slate-900">{leave.pending}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => router.push(`/workspace/leave?type=${leave.id}`)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Apply
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Applications */}
          <div className="mt-12 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Recent Leave Requests</h2>
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">Annual Leave Request</p>
                    <p className="text-sm text-slate-600">May 15-17, 2026 • 3 days</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                      Pending
                    </span>
                    <ChevronRight size={20} className="text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
