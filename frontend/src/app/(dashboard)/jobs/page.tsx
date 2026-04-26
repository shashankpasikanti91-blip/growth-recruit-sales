'use client';
import { useState, type MouseEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '@/lib/api-client';
import Link from 'next/link';
import { Briefcase, Search, Copy, Check, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function JobsPage() {
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState<string>('');
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', search, isActive, page],
    queryFn: () => jobsApi.list({ search: search || undefined, isActive: isActive || undefined, page, limit: 25 }),
    placeholderData: (prev) => prev,
  });

  const handleCopy = (e: MouseEvent<HTMLButtonElement>, id: string, value: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.meta?.total ?? 0} positions</p>
        </div>
        <Link href="/jobs/new" className="btn-primary">
          <Briefcase className="w-4 h-4" /> Post Job
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-3 flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by title, department, location..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="input w-40"
          value={isActive}
          onChange={e => { setIsActive(e.target.value); setPage(1); }}
        >
          <option value="">All Status</option>
          <option value="true">Open</option>
          <option value="false">Closed</option>
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Job ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">Job Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Job Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Applications</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Closing Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Posted Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center">
                        <Briefcase className="w-7 h-7 text-brand-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">No job postings yet</p>
                        <p className="text-xs text-gray-400 mt-1">Post your first job to start receiving applications</p>
                      </div>
                      <Link href="/jobs/new" className="btn-primary text-xs mt-1">
                        <Briefcase className="w-3.5 h-3.5" /> Post a Job
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.data?.map((job: any) => (
                  <tr key={job.id} className="hover:bg-brand-50/40 transition-colors group">
                    {/* Job ID */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-gray-500 whitespace-nowrap">
                          {job.businessId ?? job.id.slice(0, 10)}
                        </span>
                        <button
                          onClick={e => handleCopy(e, job.id, job.businessId ?? job.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-brand-600 transition-all"
                          title="Copy ID"
                        >
                          {copiedId === job.id
                            ? <Check className="w-3 h-3 text-green-500" />
                            : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    {/* Title */}
                    <td className="px-4 py-3">
                      <Link href={`/jobs/${job.id}`} className="font-medium text-gray-900 hover:text-brand-600 transition-colors">
                        {job.title}
                      </Link>
                    </td>
                    {/* Department */}
                    <td className="px-4 py-3 text-gray-500 text-sm whitespace-nowrap">
                      {job.department ?? <span className="text-gray-300">—</span>}
                    </td>
                    {/* Location */}
                    <td className="px-4 py-3 text-gray-500 text-sm whitespace-nowrap">
                      {job.location ?? <span className="text-gray-300">—</span>}
                    </td>
                    {/* Job Type */}
                    <td className="px-4 py-3">
                      {job.jobType ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 whitespace-nowrap">
                          {job.jobType}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                        job.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${job.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {job.isActive ? 'Open' : 'Closed'}
                      </span>
                    </td>
                    {/* Applications */}
                    <td className="px-4 py-3 text-sm font-semibold text-gray-700">
                      {job._count?.applications ?? 0}
                    </td>
                    {/* Closing Date */}
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {job.closingDate ? (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(job.closingDate), 'dd MMM yyyy')}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    {/* Posted Date */}
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap"
                      title={job.createdAt ? formatDistanceToNow(new Date(job.createdAt), { addSuffix: true }) : ''}>
                      {job.createdAt ? format(new Date(job.createdAt), 'dd MMM yyyy') : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.meta && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-500">
              Showing {((page - 1) * 25) + 1}–{Math.min(page * 25, data.meta.total)} of {data.meta.total} positions
            </span>
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-brand-400 hover:text-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <span className="text-xs text-gray-500 px-1">Page {page} of {data.meta.totalPages}</span>
              <button
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-brand-400 hover:text-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                disabled={page >= data.meta.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
