import { Sidebar } from '@/components/layout/sidebar';
import { GlobalSearch } from '@/components/layout/global-search';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64 flex-1 overflow-y-auto">
        {/* Top bar with global search */}
        <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100 px-6 py-3 flex items-center justify-between">
          <GlobalSearch />
        </div>
        <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
