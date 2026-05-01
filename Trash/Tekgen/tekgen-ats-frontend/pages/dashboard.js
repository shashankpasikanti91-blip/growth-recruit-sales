'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../components/layout/DashboardLayout';
import { getUser } from '../lib/auth';
import HRMSDashboard from '../components/dashboard/HRMSDashboard';

export default function DashboardPage() {
  const user = getUser();
  const router = useRouter();

  // Recruiters don't have the Operations Hub — redirect to candidates
  useEffect(() => {
    if (user?.role === 'RECRUITER') {
      router.replace('/candidates');
    }
  }, [user, router]);

  if (user?.role === 'RECRUITER') return null;

  return (
    <DashboardLayout title="Operations Hub">
      <HRMSDashboard user={user} />
    </DashboardLayout>
  );
}
