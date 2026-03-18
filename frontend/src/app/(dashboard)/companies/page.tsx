'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '@/lib/api-client';
import { Building2, Users } from 'lucide-react';

export default function CompaniesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['companies', search, page],
    queryFn: () => companiesApi.list({ search: search || undefined, page, limit: 20 }),
  });

  const companies: any[] = data?.data ?? [];
  const total: number = data?.meta?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-500 mt-1">{total} total companies</p>
        </div>
      </div>

      <div className="flex gap-3">
        <input
          className="input max-w-sm"
          placeholder="Search companies..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : companies.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No companies found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((co: any) => (
            <div key={co.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-brand-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{co.name}</h3>
                  {co.industry && <p className="text-sm text-gray-500">{co.industry}</p>}
                  {co.website && (
                    <a href={co.website} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline truncate block">
                      {co.website}
                    </a>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2 text-sm">
                {co.employeeCount && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <Users className="w-3 h-3" /> {co.employeeCount.toLocaleString()} employees
                  </div>
                )}
                {co.country && <div className="text-gray-500">{co.country}</div>}
                {co._count?.leads != null && (
                  <div className="text-gray-500">{co._count.leads} leads</div>
                )}
                {co._count?.contacts != null && (
                  <div className="text-gray-500">{co._count.contacts} contacts</div>
                )}
              </div>

              {co.description && (
                <p className="mt-3 text-xs text-gray-500 line-clamp-2">{co.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm">Prev</button>
          <span className="px-3 py-1 text-sm text-gray-600">Page {page}</span>
          <button disabled={companies.length < 20} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm">Next</button>
        </div>
      )}
    </div>
  );
}
