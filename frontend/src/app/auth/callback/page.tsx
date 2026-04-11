'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import { Zap } from 'lucide-react';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const isNewTenant = params.get('is_new_tenant') === 'true';
    const error = params.get('error');

    if (error) {
      toast.error(decodeURIComponent(error));
      router.replace('/login');
      return;
    }

    if (!accessToken || !refreshToken) {
      toast.error('Authentication failed. Please try again.');
      router.replace('/login');
      return;
    }

    // Fetch the user profile using the new token
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    fetch(`${apiUrl}/v1/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load user profile');
        return res.json();
      })
      .then((user) => {
        setTokens(accessToken, refreshToken, user);
        // Clear tokens from URL before redirecting
        window.history.replaceState({}, document.title, '/auth/callback');
        if (isNewTenant) {
          toast.success(`Welcome to RecruiSales AI, ${user.firstName}! Your account is ready.`);
        } else {
          toast.success(`Welcome back, ${user.firstName}!`);
        }
        router.replace('/dashboard');
      })
      .catch(() => {
        toast.error('Failed to load your profile. Please log in again.');
        router.replace('/login');
      });
  }, [router, setTokens]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500">
      <div className="text-center text-white">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Zap className="w-7 h-7 text-white" />
          </div>
        </div>
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/80 text-sm">Signing you in with Google…</p>
      </div>
    </div>
  );
}
