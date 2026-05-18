'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../components/layout/DashboardLayout';
import { getUser } from '../lib/auth';
import HRMSDashboard from '../components/dashboard/HRMSDashboard';
import ManagerDashboard from '../components/dashboard/ManagerDashboard';

export default function DashboardPage() {
  const user = getUser();
  const router = useRouter();

  useEffect(() => {
    if (user?.role === 'RECRUITER') {
      router.replace('/candidates');
    } else if (user?.role === 'HR_ADMIN') {
      router.replace('/hr');
    } else if (user?.role === 'PAYROLL_ADMIN') {
      router.replace('/payroll/admin-dashboard');
    } else if (user?.role === 'SALES_MANAGER' || user?.role === 'SALES_EXECUTIVE') {
      router.replace('/sales');
    } else if (user?.role === 'FINANCE_HEAD') {
      router.replace('/finance');
    } else if (
      ['EMPLOYEE', 'EMPLOYEE_VIEWER', 'DEPLOYED_STAFF', 'CONTRACTOR'].includes(user?.role)
    ) {
      router.replace('/workspace');
    } else if (user?.role === 'CLIENT_APPROVER') {
      router.replace('/workspace/approval-queue');
    }
  }, [user, router]);

  if ([
    'RECRUITER',
    'HR_ADMIN',
    'PAYROLL_ADMIN',
    'SALES_MANAGER',
    'SALES_EXECUTIVE',
    'FINANCE_HEAD',
    'EMPLOYEE',
    'EMPLOYEE_VIEWER',
    'DEPLOYED_STAFF',
    'CONTRACTOR',
    'CLIENT_APPROVER',
  ].includes(user?.role)) return null;

  return (
    <DashboardLayout title="Operations Hub">
      {user?.role === 'RECRUITMENT_MANAGER' ? (
        <ManagerDashboard user={user} />
      ) : (
        <HRMSDashboard user={user} />
      )}
    </DashboardLayout>
  );
}
