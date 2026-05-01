'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getUser, clearAuth } from '../../lib/auth';
import apiClient from '../../lib/api';
import { Search, Bell, Settings, LogOut, ChevronDown, X, CheckCheck } from 'lucide-react';

const TYPE_DOT = {
  WARNING: 'bg-amber-400',
  ALERT:   'bg-red-400',
  SUCCESS: 'bg-emerald-400',
  INFO:    'bg-blue-400',
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Topbar({ title }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const userRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => { setUser(getUser()); }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/notifications');
      const list = res.data?.data ?? [];
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.isRead).length);
    } catch {
      // silent — keep previous state
    }
  }, []);

  // Fetch on mount, and re-fetch when notification dropdown opens
  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await apiClient.patch('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  const handleMarkRead = async (id) => {
    try {
      await apiClient.patch(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  };

  const handleDeleteNotif = async (e, id) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/api/notifications/${id}`);
      setNotifications(prev => {
        const next = prev.filter(n => n.id !== id);
        setUnreadCount(next.filter(n => !n.isRead).length);
        return next;
      });
    } catch { /* ignore */ }
  };

  // Close menus on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userRef.current && !userRef.current.contains(e.target)) setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e) => {
    if (e.key === 'Enter' && search.trim()) {
      router.push(`/candidates?search=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push('/auth/login');
  };

  const getBreadcrumb = () => {
    const parts = router.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return 'Operations Hub';
    const labelMap = {
      dashboard: 'Operations Hub', jobs: 'Job Openings', candidates: 'Candidates',
      screening: 'AI Screening', interviews: 'Interviews', followups: 'Follow-ups',
      emails: 'Email Templates', analytics: 'Analytics', sales: 'Sales CRM',
      hr: 'HR Operations', payroll: 'Payroll', visa: 'Visa & Permits',
      finance: 'Finance', documents: 'Documents', admin: 'Admin Control',
      integrations: 'Integrations', profile: 'Profile & Settings',
      leads: 'Leads', pipeline: 'Pipeline', employees: 'Employees',
      leave: 'Leave Management', attendance: 'Attendance', runs: 'Payroll Runs',
      claims: 'Claims', renewals: 'Renewals', invoices: 'Invoices',
      upload: 'Upload Resume', create: 'Create', edit: 'Edit', view: 'View',
      monitoring: 'Monitoring',
    };
    return parts
      .filter(p => !p.startsWith('['))              // drop dynamic params like [id]
      .map(p => labelMap[p] || (p.charAt(0).toUpperCase() + p.slice(1)))
      .join(' › ');
  };

  const onNotifToggle = () => {
    const opening = !notifOpen;
    setNotifOpen(opening);
    setUserMenuOpen(false);
    if (opening) fetchNotifications();
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-5 gap-4 sticky top-0 z-30 shadow-sm flex-shrink-0">

      {/* Page title */}
      <div className="ml-10 lg:ml-0 flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-slate-800 truncate">
          {title || getBreadcrumb()}
        </h1>
      </div>

      {/* Global search */}
      <div className="relative hidden md:flex items-center">
        <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearch}
          placeholder="Search people, JDs, leads, documents…"
          className="w-64 pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50
                     focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 text-slate-400 hover:text-slate-600">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Notifications */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={onNotifToggle}
          className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-11 w-80 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden animate-fade-in">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">
                Notifications {unreadCount > 0 && <span className="text-xs font-normal text-slate-400">({unreadCount} unread)</span>}
              </span>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs text-brand-500 font-medium hover:text-brand-600 flex items-center gap-1">
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
            </div>
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell size={24} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No notifications</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => { if (!n.isRead) handleMarkRead(n.id); if (n.link) router.push(n.link); }}
                    className={`px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer ${n.isRead ? 'opacity-60' : ''}`}
                  >
                    <div className="flex gap-3 items-start">
                      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${TYPE_DOT[n.type] ?? 'bg-slate-400'} ${n.isRead ? 'opacity-0' : ''}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-700 leading-snug">{n.message}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteNotif(e, n.id)}
                        className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0 ml-1"
                        title="Dismiss"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* User menu */}
      <div className="relative" ref={userRef}>
        <button
          onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false); }}
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors group"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-blue-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.firstName} {user?.lastName}</p>
            <p className="text-[10px] text-slate-500 leading-tight capitalize">{user?.role?.toLowerCase()}</p>
          </div>
          <ChevronDown size={13} className={`text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {userMenuOpen && (
          <div className="absolute right-0 top-11 w-48 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden animate-fade-in">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
            <div className="py-1">
              <Link href="/profile" onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                <Settings size={14} /> Profile &amp; Settings
              </Link>
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
