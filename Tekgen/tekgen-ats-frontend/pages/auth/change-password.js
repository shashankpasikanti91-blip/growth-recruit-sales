'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import apiClient from '../../lib/api';
import { getUser, setAuthToken, clearAuth, getAuthToken } from '../../lib/auth';

export default function ChangePasswordPage() {
  const router = useRouter();
  const forced = router.query.forced === '1';
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    try {
      const cached = sessionStorage.getItem('forceChangeOldPassword');
      if (cached) {
        setOldPassword(cached);
      }
    } catch {
      // ignore
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Please fill all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword === oldPassword) {
      setError('New password must be different from current password.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/api/auth/change-password', {
        oldPassword,
        newPassword,
        confirmPassword,
      });

      const user = getUser();
      if (user) {
        setAuthToken(getAuthToken(), { ...user, mustChangePassword: false });
      }
      try {
        sessionStorage.removeItem('forceChangeOldPassword');
      } catch {
        // ignore
      }

      setMessage('Password updated successfully.');
      setTimeout(() => {
        router.replace('/dashboard');
      }, 700);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Current password is incorrect.');
      } else {
        setError(err.response?.data?.message || 'Failed to change password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    clearAuth();
    router.replace('/auth/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h1 className="text-2xl font-bold text-slate-900">Change Password</h1>
        <p className="text-sm text-slate-500 mt-1">
          {forced ? 'For security, set a new password before continuing.' : 'Update your account password.'}
        </p>

        {error && (
          <div className="mt-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="mt-4 px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Password</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="form-input"
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="form-input"
              autoComplete="new-password"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-input"
              autoComplete="new-password"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="w-full btn-primary justify-center py-3 text-base">
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          {forced ? (
            <button onClick={handleSignOut} className="text-slate-500 hover:text-slate-700">
              Sign out
            </button>
          ) : (
            <Link href="/dashboard" className="text-brand-500 hover:text-brand-600 font-medium">
              Back to dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
