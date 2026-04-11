'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Phone, Building2, Mail, Search, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  company?: { name: string };
  createdAt: string;
};

export default function ContactsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    clearTimeout((window as any).__contactSearchTimer);
    (window as any).__contactSearchTimer = setTimeout(() => setDebouncedSearch(value), 300);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', debouncedSearch, page],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit: 20 };
      if (debouncedSearch) params.search = debouncedSearch;
      const { data } = await api.get('/contacts', { params });
      // Handle both old array response and new paginated response
      if (Array.isArray(data)) return { data, meta: { total: data.length, page: 1, limit: data.length, totalPages: 1 } };
      return data;
    },
  });

  const contacts: Contact[] = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, totalPages: 1 };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your sales contacts</p>
        </div>
        <span className="text-sm text-gray-500 flex items-center gap-1">
          <Phone className="w-4 h-4" />
          {meta.total} contacts
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, email, title, company..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9 pr-4 py-2.5 w-full max-w-sm border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Table */}
      {contacts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{debouncedSearch ? 'No contacts match your search' : 'No contacts yet'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/contacts/${c.id}`} className="flex items-center gap-3 group">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold">
                        {c.firstName?.[0]}{c.lastName?.[0]}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 group-hover:text-brand-600">{c.firstName} {c.lastName}</div>
                        {c.title && <div className="text-xs text-gray-400">{c.title}</div>}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600 flex items-center gap-1.5">
                    {c.company ? (
                      <>
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        {c.company.name}
                      </>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="text-brand-600 hover:underline flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />{c.email}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.phone ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-500">
                Page {meta.page} of {meta.totalPages} ({meta.total} total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
