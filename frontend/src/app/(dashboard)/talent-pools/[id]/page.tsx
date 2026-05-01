'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { talentPoolsApi, candidatesApi } from '@/lib/api-client';
import Link from 'next/link';
import { ArrowLeft, Users, Trash2, Plus, X, Search, UserMinus, Zap, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STAGE_COLORS: Record<string, string> = {
  SOURCED: 'bg-gray-100 text-gray-700',
  CONTACTED: 'bg-sky-100 text-sky-700',
  INTERESTED: 'bg-green-100 text-green-700',
  NOT_INTERESTED: 'bg-red-100 text-red-600',
  PROFILE_RECEIVED: 'bg-violet-100 text-violet-700',
  SCREENING: 'bg-yellow-100 text-yellow-700',
  SHORTLISTED: 'bg-emerald-100 text-emerald-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  CLIENT_REVIEW: 'bg-indigo-100 text-indigo-700',
  INTERVIEW_SCHEDULED: 'bg-purple-100 text-purple-700',
  INTERVIEW_COMPLETED: 'bg-teal-100 text-teal-700',
  OFFER_PENDING: 'bg-orange-100 text-orange-700',
  OFFERED: 'bg-amber-100 text-amber-700',
  OFFER_ACCEPTED: 'bg-lime-100 text-lime-700',
  OFFER_DECLINED: 'bg-rose-100 text-rose-600',
  JOINED: 'bg-green-200 text-green-800',
  ON_HOLD: 'bg-slate-100 text-slate-600',
  REJECTED: 'bg-red-100 text-red-700',
  WITHDRAWN: 'bg-gray-100 text-gray-500',
};

export default function TalentPoolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showAdd, setShowAdd]     = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: pool, isLoading } = useQuery({
    queryKey: ['talent-pool', id],
    queryFn: () => talentPoolsApi.get(id),
    enabled: !!id,
  });

  const { data: searchData } = useQuery({
    queryKey: ['candidates-search-pool', addSearch],
    queryFn: () => candidatesApi.list({ search: addSearch, limit: 10 }),
    enabled: showAdd && addSearch.length >= 2,
    placeholderData: undefined,
  });

  const addMutation = useMutation({
    mutationFn: (candidateId: string) => talentPoolsApi.addMember(id, { candidateId }),
    onSuccess: () => {
      toast.success('Candidate added to pool');
      queryClient.invalidateQueries({ queryKey: ['talent-pool', id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to add'),
  });

  const removeMutation = useMutation({
    mutationFn: (candidateId: string) => talentPoolsApi.removeMember(id, candidateId),
    onSuccess: () => {
      toast.success('Candidate removed');
      queryClient.invalidateQueries({ queryKey: ['talent-pool', id] });
    },
    onError: () => toast.error('Failed to remove'),
  });

  const poolData: any = pool;
  const members: any[] = poolData?.members ?? [];
  const existingIds = new Set(members.map((m: any) => m.candidateId));
  const searchResults: any[] = (searchData as any)?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-100 rounded w-64 animate-pulse" />
        <div className="card animate-pulse h-48" />
      </div>
    );
  }

  if (!poolData) {
    return (
      <div className="card text-center py-20">
        <p className="text-gray-500">Pool not found</p>
        <Link href="/talent-pools" className="btn-secondary mt-4 text-sm">Back to Pools</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/talent-pools" className="text-gray-400 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{poolData.name}</h1>
            {poolData.description && <p className="text-gray-500 text-sm mt-0.5">{poolData.description}</p>}
          </div>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus className="w-4 h-4" /> Add Candidates
        </button>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="font-semibold text-gray-700">{poolData._count?.members ?? 0}</span> candidate{poolData._count?.members !== 1 ? 's' : ''}
        </span>
        <span>Created {poolData.createdAt ? format(new Date(poolData.createdAt), 'dd MMM yyyy') : '-'}</span>
      </div>

      {/* Add candidates modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Add Candidates to Pool</h3>
              <button onClick={() => { setShowAdd(false); setAddSearch(''); }} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="input pl-9 w-full text-sm"
                placeholder="Search by name, email, title…"
                value={addSearch}
                onChange={e => setAddSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 min-h-[160px]">
              {addSearch.length < 2 ? (
                <p className="text-sm text-gray-400 text-center py-8">Type at least 2 characters to search…</p>
              ) : searchResults.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No candidates found</p>
              ) : (
                searchResults.map((c: any) => {
                  const alreadyIn = existingIds.has(c.id);
                  return (
                    <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900">{c.firstName} {c.lastName}</div>
                        <div className="text-xs text-gray-400 truncate">
                          {[c.currentTitle, c.currentCompany].filter(Boolean).join(' · ') || c.email || '-'}
                        </div>
                      </div>
                      {alreadyIn ? (
                        <span className="text-xs text-gray-400 shrink-0">Already in pool</span>
                      ) : (
                        <button
                          onClick={() => addMutation.mutate(c.id)}
                          disabled={addMutation.isPending}
                          className="btn-primary text-xs px-3 py-1 shrink-0"
                        >
                          <Plus className="w-3 h-3 inline mr-0.5" />Add
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Members list */}
      {members.length === 0 ? (
        <div className="card text-center py-20">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-500">No candidates in this pool</p>
          <p className="text-sm text-gray-400 mt-1">Add candidates from the button above or from any Candidate 360 page</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary mt-4 text-sm">
            <Plus className="w-4 h-4 inline mr-1.5" />Add Candidates
          </button>
        </div>
      ) : (
        <div className="card p-0 divide-y divide-gray-50">
          {members.map((member: any) => {
            const c = member.candidate;
            return (
              <div key={member.id} className="flex items-center gap-4 px-5 py-4 hover:bg-brand-50/30 transition-colors group">
                <div className="flex-1 min-w-0">
                  <Link href={`/candidates/${c.id}`} className="font-semibold text-gray-900 hover:text-brand-600 text-sm">
                    {c.firstName} {c.lastName}
                  </Link>
                  <div className="text-xs text-gray-400 mt-0.5 truncate">
                    {[c.currentTitle, c.currentCompany].filter(Boolean).join(' · ') || c.email || '-'}
                  </div>
                  {member.notes && (
                    <div className="text-xs text-gray-500 mt-0.5 italic">{member.notes}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
                  {c.stage && (
                    <span className={"text-[10px] font-semibold px-2 py-0.5 rounded-full " + (STAGE_COLORS[c.stage] ?? 'bg-gray-100 text-gray-600')}>
                      {c.stage.replace(/_/g, ' ')}
                    </span>
                  )}
                  {c.yearsExperience != null && (
                    <span className="text-xs text-gray-500">{c.yearsExperience}yr</span>
                  )}
                  {c.location && (
                    <span className="flex items-center gap-0.5 text-xs text-gray-400">
                      <MapPin className="w-3 h-3" />{c.location}
                    </span>
                  )}
                  {c.skills?.slice(0, 2).map((s: string) => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">{s}</span>
                  ))}
                  <div className="text-[11px] text-gray-400 shrink-0">
                    Added {member.createdAt ? format(new Date(member.createdAt), 'dd MMM') : '-'}
                  </div>
                  <button
                    onClick={() => removeMutation.mutate(c.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity ml-1"
                    title="Remove from pool"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
