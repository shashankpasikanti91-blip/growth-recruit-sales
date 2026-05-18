'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getUser, clearAuth } from '../../lib/auth';
import { LogOut, Settings, Menu, X, Shield, Plug, Mail } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const handleLogout = () => {
    clearAuth();
    router.push('/auth/login');
  };

  const isActive = (path) => router.pathname === path;
  const linkClass = (path) =>
    `text-sm font-medium transition ${isActive(path) ? 'text-blue-600 font-bold' : 'text-gray-600 hover:text-gray-900'}`;

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-bold text-xl text-gray-800">Tekgen ATS</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-5">
            <Link href="/dashboard" className={linkClass('/dashboard')}>Dashboard</Link>
            <Link href="/candidates" className={linkClass('/candidates')}>Candidates</Link>
            <Link href="/jobs" className={linkClass('/jobs')}>Jobs</Link>
            <Link href="/screening" className={linkClass('/screening')}>AI Screening</Link>
            <Link href="/analytics" className={linkClass('/analytics')}>Analytics</Link>
            <Link href="/emails" className={linkClass('/emails')}>Emails</Link>
            <Link href="/integrations" className={linkClass('/integrations')}>Integrations</Link>
            {user?.role === 'ADMIN' && (
              <Link href="/admin" className={`${linkClass('/admin')} flex items-center gap-1`}>
                <Shield size={14} /> Admin
              </Link>
            )}
            {user && (
              <div className="flex items-center space-x-3 pl-4 border-l border-gray-300">
                <Link href="/profile" className="text-gray-500 hover:text-gray-900"><Settings size={18} /></Link>
                <button onClick={handleLogout} className="text-gray-500 hover:text-gray-900"><LogOut size={18} /></button>
                <div className="text-sm">
                  <p className="font-semibold text-gray-800">{user?.firstName}</p>
                  <p className="text-gray-400 text-xs">{user?.role}</p>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 border-t space-y-1 pt-2">
            <Link href="/dashboard" className="block py-2 px-2 text-gray-600 hover:bg-gray-50 rounded">Dashboard</Link>
            <Link href="/candidates" className="block py-2 px-2 text-gray-600 hover:bg-gray-50 rounded">Candidates</Link>
            <Link href="/jobs" className="block py-2 px-2 text-gray-600 hover:bg-gray-50 rounded">Jobs</Link>
            <Link href="/screening" className="block py-2 px-2 text-blue-600 font-semibold hover:bg-blue-50 rounded">AI Screening</Link>
            <Link href="/analytics" className="block py-2 px-2 text-gray-600 hover:bg-gray-50 rounded">Analytics</Link>
            <Link href="/emails" className="block py-2 px-2 text-gray-600 hover:bg-gray-50 rounded">Email Templates</Link>
            <Link href="/integrations" className="block py-2 px-2 text-gray-600 hover:bg-gray-50 rounded">Integrations</Link>
            {user?.role === 'ADMIN' && (
              <Link href="/admin" className="block py-2 px-2 text-purple-600 font-semibold hover:bg-purple-50 rounded">Admin Panel</Link>
            )}
            <Link href="/profile" className="block py-2 px-2 text-gray-600 hover:bg-gray-50 rounded">Profile</Link>
            <button onClick={handleLogout} className="block w-full text-left py-2 px-2 text-gray-600 hover:bg-gray-50 rounded">Logout</button>
          </div>
        )}
      </div>
    </nav>
  );
}
