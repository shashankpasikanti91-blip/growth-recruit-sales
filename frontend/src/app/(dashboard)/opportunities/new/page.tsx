'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { opportunitiesApi, clientsApi } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const STAGES = [
  { value: 'DISCOVERY',      label: 'Discovery' },
  { value: 'PROPOSAL',       label: 'Proposal' },
  { value: 'NEGOTIATION',    label: 'Negotiation' },
  { value: 'VERBAL_COMMIT',  label: 'Verbal Commit' },
  { value: 'CLOSED_WON',    label: 'Closed — Won' },
  { value: 'CLOSED_LOST',   label: 'Closed — Lost' },
  { value: 'ON_HOLD',       label: 'On Hold' },
];

export default function NewOpportunityPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: '', clientId: '', stage: 'DISCOVERY', value: '',
    currency: 'USD', probability: '', expectedCloseDate: '', notes: '',
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 'all'],
    queryFn: () => clientsApi.list({ limit: 100 }),
  });
  const clients: any[] = clientsData?.data ?? [];

  const { mutate, isPending } = useMutation({
    mutationFn: () => opportunitiesApi.create({
      ...form,
      value: form.value ? Number(form.value) : undefined,
      probability: form.probability ? Number(form.probability) : undefined,
      clientId: form.clientId || undefined,
      expectedCloseDate: form.expectedCloseDate || undefined,
    }),
    onSuccess: (data) => {
      toast.success('Opportunity created');
      qc.invalidateQueries({ queryKey: ['opportunities'] });
      router.push('/opportunities');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to create opportunity'),
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/opportunities" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Back to Opportunities
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Add New Opportunity</h1>
            <p className="text-sm text-gray-500">Track a new sales opportunity</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opportunity Title <span className="text-red-500">*</span></label>
            <input
              type="text" value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="e.g. Acme Corp — 5 Java Developer positions"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Client + Stage */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <select value={form.clientId} onChange={e => set('clientId', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">Select client (optional)</option>
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
              <select value={form.stage} onChange={e => set('stage', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Value + Currency + Probability */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
              <input
                type="number" value={form.value} onChange={e => set('value', e.target.value)}
                placeholder="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {['USD', 'EUR', 'GBP', 'INR', 'AED', 'SGD', 'AUD'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Probability %</label>
              <input
                type="number" min={0} max={100} value={form.probability} onChange={e => set('probability', e.target.value)}
                placeholder="50"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Expected Close Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Close Date</label>
            <input
              type="date" value={form.expectedCloseDate} onChange={e => set('expectedCloseDate', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={3} placeholder="Additional notes..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={() => mutate()}
            disabled={isPending || !form.title.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {isPending ? 'Saving...' : 'Create Opportunity'}
          </button>
          <Link href="/opportunities" className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
