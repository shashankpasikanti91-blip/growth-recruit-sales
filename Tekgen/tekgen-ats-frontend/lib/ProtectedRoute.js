'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { isAuthenticated } from './auth';

export default function ProtectedRoute({ children }) {
  const router = useRouter();
  // Start as authenticated if token exists — avoids flash on page load
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const ok = isAuthenticated();
    if (!ok) {
      router.replace('/auth/login');
    } else {
      setAuthed(true);
    }
    setChecked(true);
  }, [router]);

  if (!checked || !authed) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading…</p>
        </div>
      </div>
    );
  }

  return children;
}
