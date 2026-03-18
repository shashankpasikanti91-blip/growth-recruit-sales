'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '@/lib/api-client';
import Link from 'next/link';
import { Briefcase, Search, Copy, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function JobsPage() {
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState<string>('');
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', search, isActive, page],
    queryFn: () => jobsApi.list({ search: search || undefined, isActive: isActive || undefined, page, limit: 20 }),
    placeholderData: (prev) => prev,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-500 mt-1">{data?.meta?.total ?? 0} positions</p>
        </div>
        <Link href="/jobs/new" className="btn-primary"><Briefcase className="w-4 h-4" /> Post Job</Link>
      </div>

      <div className="card p-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search jobs..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input w-36" value={isActive} onChange={e => { setIsActive(e.target.value); setPage(1); }}>
          <option value="">All status</option>
          <option value="true">Open</option>
          <option value="false">Closed</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 text-center text-gray-400 py-12">Loading...</div>
        ) : data?.data?.length === 0 ? (
          <div className="col-span-3 text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-brand-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No job postings yet</h3>
            <p className="text-gray-400 text-sm mb-6">Post your first job and start receiving applications</p>
            <Link href="/jobs/new" className="btn-primary inline-flex">
              <Briefcase className="w-4 h-4" /> Post your first job
            </Link>
          </div>
        ) : data?.data?.map((job: any) => (
          <Link key={job.id} href={`/jobs/${job.id}`}
            className="card hover:shadow-md transition-shadow cursor-pointer block">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{job.title}</h3>
                <div className="text-sm text-gray-500">{job.department}</div>
              </div>
              <span className={`badge ${job.isActive ? 'badge-green' : 'badge-gray'}`}>
                {job.isActive ? 'Open' : 'Closed'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              {job.location && <span>{job.location}</span>}
              {job.workMode && <span className="badge-blue">{job.workMode}</span>}
            </div>
            <div className="mt-2 flex items-center gap-1">
              <span className="text-[10px] font-mono text-gray-400">ID: {job.id.slice(0, 8)}…</span>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(job.id); setCopiedId(job.id); setTimeout(() => setCopiedId(null), 2000); }}
                className="text-gray-300 hover:text-brand-600 transition-colors"
                title="Copy Job ID"
              >
                {copiedId === job.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
              <span>{job._count?.applications ?? 0} applications</span>
              <span>{formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
