'use client';
import { useState, type MouseEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '@/lib/api-client';
import Link from 'next/link';
import { Briefcase, Search, Copy, Check, ChevronLeft, ChevronRight, Calendar, LayoutGrid, List, MapPin, Users } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function JobsPage() {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.meta?.total ?? 0} positions</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('table')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${viewMode === 'table' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}><List className="w-3.5 h-3.5" /> Table</button>
            <button onClick={() => setViewMode('cards')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${viewMode === 'cards' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}><LayoutGrid className="w-3.5 h-3.5" /> Cards</button>
          </div>
          <Link href="/jobs/new" className="btn-primary flex items-center gap-1.5 text-sm">
            <Briefcase className="w-4 h-4" /> Post Job
          </Link>
        </div>
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

      {/* Cards View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card p-5 animate-pulse space-y-3">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
              ))
            : data?.data?.length === 0
              ? <div className="col-span-3 text-center py-16 text-gray-400"><Briefcase className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No jobs found</p></div>
              : data?.data?.map((job: any) => (
                  <Link key={job.id} href={`/jobs/${job.id}`} className="card p-5 hover:shadow-md hover:border-brand-300 transition-all group block">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">{job.title}</div>
                        {job.department && <div className="text-xs text-gray-500 mt-0.5">{job.department}</div>}
                      </div>
                      <span className={`ml-2 shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${job.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {job.isActive ? 'Open' : 'Closed'}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs text-gray-500">
                      {job.location && <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-gray-300" />{job.location}</div>}
                      {job.jobType && <div className="flex items-center gap-1.5"><Briefcase className="w-3 h-3 text-gray-300" />{job.jobType}</div>}
                      <div className="flex items-center gap-1.5"><Users className="w-3 h-3 text-gray-300" />{job._count?.applications ?? 0} applications</div>
                      {job.closingDate && <div className="flex items-center gap-1.5 text-amber-600"><Calendar className="w-3 h-3" />Closes {format(new Date(job.closingDate), 'dd MMM yyyy')}</div>}
                    </div>
                  </Link>
                ))}
        </div>
      )}

      {/* Table */}
      {viewMode === 'table' && <div className="card p-0 overflow-hidden">
        <div className="overflow-x-scroll" style={{scrollbarGutter:'stable'}}>
          <table className="w-full text-sm min-w-[1100px]">
            <thead style={{position:'sticky',top:0,zIndex:10}}>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50" style={{position:'sticky',left:0,zIndex:11}}>Job ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px] bg-gray-50" style={{position:'sticky',left:130,zIndex:11}}>Job Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">Department</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">Location</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50">Job Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50">Openings</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50">Applicants</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50">Closing Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50">Created</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50">Updated</th>
                <th className="w-10 bg-gray-50"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={12} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-16 text-center">
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
                    {/* Job ID - frozen */}
                    <td className="px-4 py-3" style={{position:'sticky',left:0,zIndex:5,background:'white'}}>
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
                    {/* Title - frozen */}
                    <td className="px-4 py-3" style={{position:'sticky',left:130,zIndex:5,background:'white'}}>
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
                      {job.location ? <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-300" />{job.location}</span> : <span className="text-gray-300">—</span>}
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
                    {/* Openings */}
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium text-center">
                      {job.openings ?? 1}
                    </td>
                    {/* Applicants */}
                    <td className="px-4 py-3">
                      <Link href={`/jobs/${job.id}`} className="text-sm font-semibold text-gray-700 hover:text-brand-600 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-gray-300" />{job._count?.applications ?? 0}
                      </Link>
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
                    {/* Created */}
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {job.createdAt ? (
                        <div>
                          <div>{format(new Date(job.createdAt), 'dd MMM yyyy, HH:mm')}</div>
                          <div className="text-[10px] text-gray-400">{formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</div>
                        </div>
                      ) : '—'}
                    </td>
                    {/* Updated */}
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {job.updatedAt ? (
                        <div>
                          <div>{format(new Date(job.updatedAt), 'dd MMM yyyy, HH:mm')}</div>
                          <div className="text-[10px] text-gray-400">{formatDistanceToNow(new Date(job.updatedAt), { addSuffix: true })}</div>
                        </div>
                      ) : '—'}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <Link href={`/jobs/${job.id}`} className="opacity-0 group-hover:opacity-100 text-xs text-brand-600 font-medium flex items-center gap-0.5">
                        View<ChevronRight className="w-3 h-3" />
                      </Link>
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
      </div>}
    </div>
  );
}
