'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { UserCog, Shield, Mail, Plus, Trash2, RefreshCw, Users, Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { billingApi } from '@/lib/api-client';
import api from '@/lib/api';
import Link from 'next/link';

type AppUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
  isActive: boolean;
};

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
  TENANT_ADMIN: 'bg-blue-100 text-blue-700',
  RECRUITER: 'bg-green-100 text-green-700',
  SALES: 'bg-yellow-100 text-yellow-700',
  VIEWER: 'bg-gray-100 text-gray-600',
};

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  const ADMIN_ROLES = ['SUPER_ADMIN', 'TENANT_ADMIN'];
  const canManage = ADMIN_ROLES.includes(currentUser?.role ?? '');

  const { data: sub } = useQuery({ queryKey: ['billing-subscription'], queryFn: billingApi.subscription });
  const maxUsers: number = sub?.subscription?.plan?.maxUsers ?? 0;
  const seatLabel = maxUsers >= 999999 ? '∞' : maxUsers > 0 ? String(maxUsers) : '—';
  const seatsUsed = users.length;

  const load = () => {
    setLoading(true);
    api.get('/users').then(({ data }) => {
      setUsers(Array.isArray(data) ? data : data?.data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (!canManage) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>You need Admin access to manage users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users & Roles</h1>
          <p className="text-gray-500 text-sm mt-1">Manage team members and their permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            onClick={() => {/* TODO: open invite modal */}}
          >
            <Plus className="w-4 h-4" />
            Invite User
          </button>
        </div>
      </div>

      {/* Seat usage banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <Users className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-blue-700">
              Team Seats — {seatsUsed} / {seatLabel} used
            </p>
            <Link href="/billing" className="text-xs text-blue-600 underline font-medium">Upgrade plan</Link>
          </div>
          <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
            Each person in your company gets their <strong>own login</strong> (email + password).
            There is <strong>one company account</strong> (tenant) — team members are added to it.
            Roles: <strong>Admin</strong> (full access) · <strong>Recruiter</strong> (candidates &amp; jobs) ·
            <strong> Sales</strong> (leads &amp; outreach) · <strong>Viewer</strong> (read-only).
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold">
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{u.firstName} {u.lastName}</div>
                        <div className="text-xs text-gray-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" />{u.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_BADGE[u.role] ?? ROLE_BADGE.VIEWER}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== currentUser?.id && (
                      <button
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Remove user"
                        onClick={() => {/* TODO: confirm + delete */}}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
