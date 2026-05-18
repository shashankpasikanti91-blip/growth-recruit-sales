'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '../../lib/ProtectedRoute';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function DashboardLayout({ children, title }) {
  const [collapsed, setCollapsed] = useState(false);

  // Persist collapsed state
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) setCollapsed(saved === 'true');
  }, []);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      localStorage.setItem('sidebarCollapsed', String(!prev));
      return !prev;
    });
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-surface" style={{ overflow: 'hidden', width: '100%' }}>
        <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />

        {/* Main content area shifts based on sidebar width */}
        <div
          className={`flex flex-col min-h-screen transition-all duration-300 ${collapsed ? 'lg:ml-16' : 'lg:ml-60'}`}
          style={{
            minWidth: 0,
            overflow: 'hidden',
            width: '100%',
          }}
        >
          <Topbar title={title} />
          <main className="flex-1 p-4 animate-fade-in overflow-x-hidden" style={{ minWidth: 0 }}>
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

