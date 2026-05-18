'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import apiClient from '../lib/api';
import { getUser } from '../lib/auth';
import { Users, Plus, Shield, Trash2, Edit2, X, Check, Lock, Unlock, Key, Save, BarChart2, Briefcase, FileText } from 'lucide-react';

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editData, setEditData] = useState({});
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'RECRUITER', department: 'Recruitment' });
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'submissions'
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  useEffect(() => {
    const u = getUser();
    setCurrentUser(u);
    if (u?.role !== 'ADMIN') {
      setError('Admin access required');
      setLoading(false);
      return;
    }
    fetchUsers();
    fetchStats();
  }, []);

  const fetchSubmissions = async () => {
    if (submissionsLoading) return;
    try {
      setSubmissionsLoading(true);
      const res = await apiClient.get('/api/admin/submissions');
      setSubmissions(res.data.data.members || []);
    } catch (err) { /* ignore */ }
    finally { setSubmissionsLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get('/api/admin/users');
      setUsers(res.data.data.users || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/api/admin/stats');
      setStats(res.data.data);
    } catch (err) { /* ignore */ }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/api/admin/users', formData);
      setShowCreateForm(false);
      setFormData({ email: '', password: '', firstName: '', lastName: '', role: 'RECRUITER', department: 'Recruitment' });
      setSuccess('User created successfully');
      setTimeout(() => setSuccess(''), 3000);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      await apiClient.put(`/api/admin/users/${id}`, data);
      setEditingUser(null);
      setSuccess('User updated successfully');
      setTimeout(() => setSuccess(''), 3000);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    try {
      await apiClient.put(`/api/admin/users/${resetPasswordUser.id}`, { password: newPassword });
      setResetPasswordUser(null);
      setNewPassword('');
      setSuccess('Password reset successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleDelete = async (id, email) => {
    if (!confirm(`Delete user ${email}? This will remove all their data.`)) return;
    try {
      await apiClient.delete(`/api/admin/users/${id}`);
      setSuccess('User deleted');
      setTimeout(() => setSuccess(''), 3000);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const toggleLock = async (user) => {
    await handleUpdate(user.id, { isAccountLocked: !user.isAccountLocked });
  };

  const toggleActive = async (user) => {
    await handleUpdate(user.id, { isActive: !user.isActive });
  };

  const startEdit = (user) => {
    setEditingUser(user.id);
    setEditData({
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      department: user.department || '',
    });
  };

  const saveEdit = () => {
    handleUpdate(editingUser, editData);
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Shield size={64} className="mx-auto text-red-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800">Admin Access Required</h2>
            <p className="text-gray-500 mt-2">Only administrators can access this page.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-8">
            <h1 className="text-4xl font-bold mb-2">Admin Panel</h1>
            <p className="text-purple-100">Manage users, accounts, roles and permissions</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 pb-0">
              {[{ id: 'users', label: 'User Accounts', icon: Users }, { id: 'submissions', label: 'Team Submissions', icon: BarChart2 }].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === 'submissions' && submissions.length === 0) fetchSubmissions();
                  }}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-600 text-purple-700 bg-purple-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon size={15} /> {tab.label}
                </button>
              ))}
            </div>
            {/* Users tab content */}
            {activeTab === 'users' && (
            <div className="space-y-6">

            {/* System Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Users', value: stats.totalUsers, color: 'bg-blue-500' },
                  { label: 'Candidates', value: stats.totalCandidates, color: 'bg-green-500' },
                  { label: 'Jobs', value: stats.totalJobs, color: 'bg-yellow-500' },
                  { label: 'Screenings', value: stats.totalScreenings, color: 'bg-purple-500' },
                  { label: 'Applications', value: stats.totalApplications, color: 'bg-red-500' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm p-4">
                    <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center text-white font-bold mb-2`}>{stat.value}</div>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{error}
                <button onClick={() => setError('')} className="float-right text-red-400 hover:text-red-600"><X size={16} /></button>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg flex items-center gap-2">
                <Check size={16} /> {success}
              </div>
            )}

            {/* Create User Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Users size={28} /> User Accounts ({users.length})
              </h2>
              <button onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold">
                <Plus size={20} /> New Account
              </button>
            </div>

            {/* Create Form */}
            {showCreateForm && (
              <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold mb-4">Create New Account</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input placeholder="First Name" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                  <input placeholder="Last Name" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                  <input placeholder="Email" type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                  <input placeholder="Password (min 8 chars)" type="password" required minLength={8} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none">
                    <option value="RECRUITER">Recruiter</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <input placeholder="Department" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                </div>
                <div className="mt-4 flex gap-3">
                  <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold">Create</button>
                  <button type="button" onClick={() => setShowCreateForm(false)} className="bg-gray-200 hover:bg-gray-300 px-6 py-2 rounded-lg">Cancel</button>
                </div>
              </form>
            )}

            {/* Password Reset Modal */}
            {resetPasswordUser && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-md">
                  <h3 className="text-lg font-bold mb-4">Reset Password for {resetPasswordUser.firstName} {resetPasswordUser.lastName}</h3>
                  <p className="text-sm text-gray-500 mb-4">{resetPasswordUser.email}</p>
                  <input type="password" placeholder="New Password (min 8 characters)" value={newPassword}
                    onChange={e => setNewPassword(e.target.value)} minLength={8}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                  <div className="flex gap-3">
                    <button onClick={handleResetPassword} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold">Reset Password</button>
                    <button onClick={() => { setResetPasswordUser(null); setNewPassword(''); }} className="bg-gray-200 hover:bg-gray-300 px-6 py-2 rounded-lg">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* Users Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">User</th>
                    <th className="text-left py-3 px-4 font-semibold">Email</th>
                    <th className="text-left py-3 px-4 font-semibold">Role</th>
                    <th className="text-left py-3 px-4 font-semibold">Department</th>
                    <th className="text-left py-3 px-4 font-semibold">Activity</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Permissions</th>
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {editingUser === user.id ? (
                          <div className="flex gap-1">
                            <input value={editData.firstName} onChange={e => setEditData({...editData, firstName: e.target.value})}
                              className="w-20 px-1 py-0.5 border rounded text-xs" />
                            <input value={editData.lastName} onChange={e => setEditData({...editData, lastName: e.target.value})}
                              className="w-20 px-1 py-0.5 border rounded text-xs" />
                          </div>
                        ) : (
                          <span className="font-medium">{user.firstName} {user.lastName}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{user.email}</td>
                      <td className="py-3 px-4">
                        {editingUser === user.id ? (
                          <select value={editData.role} onChange={e => setEditData({...editData, role: e.target.value})}
                            className="px-1 py-0.5 border rounded text-xs">
                            <option value="RECRUITER">Recruiter</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                            {user.role}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {editingUser === user.id ? (
                          <input value={editData.department} onChange={e => setEditData({...editData, department: e.target.value})}
                            className="w-24 px-1 py-0.5 border rounded text-xs" />
                        ) : (
                          <span className="text-gray-600">{user.department || '-'}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        <span className="font-medium text-gray-700">{user._count?.jobs || 0}</span> JDs &nbsp;
                        <span className="font-medium text-gray-700">{user._count?.candidates || 0}</span> CVs &nbsp;
                        <span className="font-medium text-gray-700">{user._count?.screenings || 0}</span> Screenings
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          {user.isAccountLocked ? (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">Locked</span>
                          ) : user.isActive === false ? (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">Inactive</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Active</span>
                          )}
                        </div>
                      </td>
                      {/* Permissions column */}
                      <td className="py-3 px-4">
                        {user.role === 'ADMIN' ? (
                          <span className="text-xs text-gray-400 italic">All permissions</span>
                        ) : (
                          <label className="flex items-center gap-2 cursor-pointer select-none" title="Allow this recruiter to delete candidates">
                            <button
                              type="button"
                              onClick={() => handleUpdate(user.id, { canDeleteCandidates: !user.canDeleteCandidates })}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                                user.canDeleteCandidates ? 'bg-red-500' : 'bg-gray-200'
                              }`}
                            >
                              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                                user.canDeleteCandidates ? 'translate-x-4' : 'translate-x-1'
                              }`} />
                            </button>
                            <span className={`text-xs font-medium ${
                              user.canDeleteCandidates ? 'text-red-600' : 'text-gray-400'
                            }`}>
                              {user.canDeleteCandidates ? 'Can Delete' : 'No Delete'}
                            </span>
                          </label>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          {editingUser === user.id ? (
                            <>
                              <button onClick={saveEdit} title="Save" className="text-green-600 hover:text-green-800 p-1"><Save size={15} /></button>
                              <button onClick={() => setEditingUser(null)} title="Cancel" className="text-gray-600 hover:text-gray-800 p-1"><X size={15} /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(user)} title="Edit" className="text-blue-600 hover:text-blue-800 p-1"><Edit2 size={15} /></button>
                              <button onClick={() => toggleLock(user)} title={user.isAccountLocked ? 'Unlock' : 'Lock'}
                                className="text-yellow-600 hover:text-yellow-800 p-1">
                                {user.isAccountLocked ? <Unlock size={15} /> : <Lock size={15} />}
                              </button>
                              <button onClick={() => setResetPasswordUser(user)} title="Reset Password"
                                className="text-purple-600 hover:text-purple-800 p-1"><Key size={15} /></button>
                              <button onClick={() => handleDelete(user.id, user.email)} title="Delete"
                                className="text-red-600 hover:text-red-800 p-1"><Trash2 size={15} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>)} {/* end activeTab === 'users' */}

            {/* Team Submissions tab */}
            {activeTab === 'submissions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><BarChart2 size={20} /> Team Activity</h2>
                  <button onClick={fetchSubmissions} className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1">
                    Refresh
                  </button>
                </div>

                {submissionsLoading ? (
                  <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div>
                ) : submissions.length === 0 ? (
                  <p className="text-gray-500 text-sm py-8 text-center">No data yet. Click Refresh to load.</p>
                ) : (
                  <div className="space-y-4">
                    {submissions.map((member) => (
                      <div key={member.user.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        {/* Member header */}
                        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                          <div>
                            <span className="font-bold text-gray-900 text-sm">{member.user.name}</span>
                            <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${member.user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>{member.user.role}</span>
                            {member.user.department && <span className="ml-2 text-xs text-gray-500">{member.user.department}</span>}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-600">
                            <span className="flex items-center gap-1"><FileText size={12} className="text-violet-500" /><strong>{member.candidatesUploaded}</strong> CVs</span>
                            <span className="flex items-center gap-1"><Briefcase size={12} className="text-blue-500" /><strong>{member.jobsCreated}</strong> JDs</span>
                          </div>
                        </div>

                        {/* Recent candidates */}
                        {member.candidates.length > 0 && (
                          <div className="px-5 py-3 border-b border-gray-100">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Recent Candidates</p>
                            <div className="space-y-1.5">
                              {member.candidates.slice(0, 5).map(c => (
                                <div key={c.id} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-800 font-medium">{c.firstName} {c.lastName}</span>
                                  <div className="flex items-center gap-3 text-gray-400">
                                    <span>{c.currentRole || '—'}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                      c.status === 'HIRED' ? 'bg-emerald-100 text-emerald-700' :
                                      c.status === 'SCREENED' ? 'bg-violet-100 text-violet-700' :
                                      'bg-slate-100 text-slate-600'
                                    }`}>{c.status}</span>
                                    <span>{new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                                  </div>
                                </div>
                              ))}
                              {member.candidates.length > 5 && <p className="text-xs text-gray-400">+{member.candidates.length - 5} more</p>}
                            </div>
                          </div>
                        )}

                        {/* Recent JDs */}
                        {member.jobs.length > 0 && (
                          <div className="px-5 py-3">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Recent Job Postings</p>
                            <div className="space-y-1.5">
                              {member.jobs.slice(0, 5).map(j => (
                                <div key={j.id} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-800 font-medium">{j.title}</span>
                                  <div className="flex items-center gap-3 text-gray-400">
                                    {j.clientName && <span className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{j.clientName}</span>}
                                    {j.contractType && <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{j.contractType}</span>}
                                    <span>{j._count.applications} apps</span>
                                    <span>{new Date(j.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                                  </div>
                                </div>
                              ))}
                              {member.jobs.length > 5 && <p className="text-xs text-gray-400">+{member.jobs.length - 5} more</p>}
                            </div>
                          </div>
                        )}

                        {member.candidates.length === 0 && member.jobs.length === 0 && (
                          <p className="text-xs text-gray-400 italic px-5 py-3">No submissions yet</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
