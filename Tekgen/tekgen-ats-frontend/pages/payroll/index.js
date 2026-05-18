import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

/** Role-based entry for `/payroll`. Static overview cards live at `/payroll/hub`. */
const PayrollIndex = () => {
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      
      // Redirect based on role
      if (['PAYROLL_ADMIN', 'HR_ADMIN'].includes(user.role)) {
        router.replace('/payroll/admin-dashboard');
      } else if (['ADMIN', 'SUPER_ADMIN', 'FINANCE', 'FINANCE_HEAD', 'MANAGEMENT'].includes(user.role)) {
        router.replace('/payroll/dashboard');
      } else {
        router.replace('/dashboard');
      }
    } else {
      router.replace('/auth/login');
    }
  }, []);

  return null;
};

export default PayrollIndex;
