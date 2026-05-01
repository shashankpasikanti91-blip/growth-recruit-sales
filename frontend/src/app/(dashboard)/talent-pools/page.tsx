'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { talentPoolsApi } from '@/lib/api-client';
import Link from 'next/link';
import { Layers, Plus, Trash2, Users, ArrowRight, X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function TalentPoolsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName]       = useState('');
  const [newDesc, setNewDesc]       = useState('');
  const queryClient = useQueryClient();

  const { data: pools, isLoading } = useQuery({
    queryKey: ['talent-pools'],
    queryFn: () => talentPoolsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => talentPoolsApi.create({ name: newName.trim(), description: newDesc.trim() || undefined }),
    onSuccess: () => {
      toast.success('Pool created');
      setNewName(''); setNewDesc(''); setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['talent-pools'] });
    },
    onError: () => toast.error('Failed to create pool'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => talentPoolsApi.remove(id),
    onSuccess: () => {
      toast.success('Pool deleted');
      queryClient.invalidateQueries({ queryKey: ['talent-pools'] });
    },
    onError: () => toast.error('Failed to delete pool'),
  });

  const poolsList: any[] = (pools as any) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Talent Pools</h1>
          <p className="text-gray-500 text-sm mt-0.5">{poolsList.length} pool{poolsList.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus className="w-4 h-4" /> Create Pool
        </button>
      </div>

      {/* Create pool modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-lg">New Talent Pool</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Pool Name *</label>
                <input
                  className="input w-full"
                  placeholder="e.g. React Developers Dubai 2026"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) createMutation.mutate(); }}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <textarea
                  className="input w-full resize-none"
                  rows={2}
                  placeholder="Optional description…"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                className="btn-primary flex-1"
                disabled={!newName.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? 'Creating…' : 'Create Pool'}
              </button>
              <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card animate-pulse space-y-3">
              <div className="h-5 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : poolsList.length === 0 ? (
        <div className="card text-center py-20">
          <Layers className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-500">No talent pools yet</p>
          <p className="text-sm text-gray-400 mt-1">Create a pool to group candidates for batch submissions</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-4 text-sm">
            <Plus className="w-4 h-4 inline mr-1.5" />Create First Pool
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {poolsList.map((pool: any) => (
            <div key={pool.id} className="card group hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Link href={`/talent-pools/${pool.id}`} className="font-semibold text-gray-900 hover:text-brand-600 block truncate">
                    {pool.name}
                  </Link>
                  {pool.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{pool.description}</p>
                  )}
                </div>
                <button
                  onClick={() => { if (confirm('Delete this pool?')) deleteMutation.mutate(pool.id); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold text-gray-700">{pool._count?.members ?? 0}</span>
                  <span>candidate{pool._count?.members !== 1 ? 's' : ''}</span>
                </div>
                <Link href={`/talent-pools/${pool.id}`} className="flex items-center gap-1 text-xs text-brand-600 font-medium hover:underline">
                  View <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="mt-2 text-[11px] text-gray-400">
                Created {pool.createdAt ? format(new Date(pool.createdAt), 'dd MMM yyyy') : '-'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
