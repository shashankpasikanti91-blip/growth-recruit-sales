'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '@/lib/api-client';
import { Building2, Users, List, LayoutGrid, Globe, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { TableWrapper } from '@/components/ui/table-wrapper';

export default function CompaniesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const { data, isLoading } = useQuery({
    queryKey: ['companies', search, page],
    queryFn: () => companiesApi.list({ search: search || undefined, page, limit: 20 }),
  });

  const companies: any[] = data?.data ?? [];
  const total: number = data?.meta?.total ?? 0;
  const totalPages: number = data?.meta?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-500 mt-1">{total} total companies</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${viewMode === 'table' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <List className="w-3.5 h-3.5" /> Table
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${viewMode === 'cards' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Cards
            </button>
          </div>
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
      ) : viewMode === 'cards' ? (
        <>
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
                  {co._count?.leads != null && <div className="text-gray-500">{co._count.leads} leads</div>}
                  {co._count?.contacts != null && <div className="text-gray-500">{co._count.contacts} contacts</div>}
                </div>
                {co.description && <p className="mt-3 text-xs text-gray-500 line-clamp-2">{co.description}</p>}
              </div>
            ))}
          </div>
          {total > 20 && (
            <div className="flex justify-center gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm">Prev</button>
              <span className="px-3 py-1 text-sm text-gray-600">Page {page}</span>
              <button disabled={companies.length < 20} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm">Next</button>
            </div>
          )}
        </>
      ) : (
        /* Table View */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <TableWrapper>
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Company Name', 'Industry', 'Website', 'Country', 'Employees', 'Leads', 'Contacts', 'Created', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companies.map((co: any) => (
                  <tr key={co.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-brand-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{co.name}</div>
                          {co.description && <div className="text-xs text-gray-400 truncate max-w-[200px]">{co.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{co.industry ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">
                      {co.website ? (
                        <a href={co.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-brand-600 hover:underline text-xs whitespace-nowrap">
                          <Globe className="w-3 h-3" />
                          {co.website.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 28)}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{co.country ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {co.employeeCount != null ? (
                        <span className="flex items-center gap-1 text-sm"><Users className="w-3 h-3 text-gray-400" />{co.employeeCount.toLocaleString()}</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{co._count?.leads ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">{co._count?.contacts ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {co.createdAt ? (
                        <div>
                          <div>{format(new Date(co.createdAt), 'dd MMM yyyy')}</div>
                          <div className="text-[10px] text-gray-400">{formatDistanceToNow(new Date(co.createdAt), { addSuffix: true })}</div>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/companies/${co.id}`}
                        className="opacity-0 group-hover:opacity-100 text-xs text-brand-600 font-medium hover:underline transition-opacity whitespace-nowrap"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrapper>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-500">Page {page} of {totalPages} ({total} total)</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 flex items-center gap-1"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
