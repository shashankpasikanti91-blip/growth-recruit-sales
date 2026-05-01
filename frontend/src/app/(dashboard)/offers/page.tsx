'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { offersApi, submissionsApi } from '@/lib/api-client';
import { format } from 'date-fns';
import { FileText, Plus, X, ChevronLeft, ChevronRight, Filter, DollarSign } from 'lucide-react';
import { TableWrapper } from '@/components/ui/table-wrapper';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const OFFER_STATUSES = ['PENDING', 'EXTENDED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED'];

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-gray-100 text-gray-700',
  EXTENDED:  'bg-blue-50 text-blue-700',
  ACCEPTED:  'bg-emerald-50 text-emerald-700',
  DECLINED:  'bg-red-50 text-red-700',
  WITHDRAWN: 'bg-orange-50 text-orange-700',
  EXPIRED:   'bg-amber-50 text-amber-700',
};

// Next valid transitions per status
const TRANSITIONS: Record<string, string[]> = {
  PENDING:  ['EXTENDED', 'WITHDRAWN'],
  EXTENDED: ['ACCEPTED', 'DECLINED', 'WITHDRAWN'],
  ACCEPTED: [],
  DECLINED: [],
  WITHDRAWN:[],
  EXPIRED:  [],
};

// ─── Create Offer Modal ───────────────────────────────────────────────────────

function CreateOfferModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    submissionId: '',
    offeredSalary: '',
    currency: 'USD',
    joiningDate: '',
    expiryDate: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const { data: subsData } = useQuery({
    queryKey: ['submissions-for-offer'],
    queryFn: () => submissionsApi.list({ limit: 100 }),
  });
  const submissions: any[] = subsData?.items ?? [];

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.submissionId || !form.offeredSalary) {
      toast.error('Submission and offered salary are required');
      return;
    }
    setLoading(true);
    try {
      await offersApi.create({
        submissionId: form.submissionId,
        offeredSalary: parseFloat(form.offeredSalary),
        currency: form.currency,
        joiningDate: form.joiningDate ? new Date(form.joiningDate).toISOString() : undefined,
        expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : undefined,
        notes: form.notes || undefined,
      });
      toast.success('Offer created!');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to create offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-lg">Create Offer</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Submission *</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.submissionId}
              onChange={e => set('submissionId', e.target.value)}
            >
              <option value="">Select submission…</option>
              {submissions.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.candidate?.firstName} {s.candidate?.lastName} → {s.job?.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Offered Salary *</label>
              <input
                type="number" min={0}
                placeholder="e.g. 85000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={form.offeredSalary}
                onChange={e => set('offeredSalary', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={form.currency}
                onChange={e => set('currency', e.target.value)}
              >
                {['USD', 'GBP', 'EUR', 'AED', 'SGD', 'INR', 'AUD', 'CAD'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Joining Date</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={form.joiningDate}
                onChange={e => set('joiningDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Offer Expiry</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={form.expiryDate}
                onChange={e => set('expiryDate', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={2}
              placeholder="Additional offer details…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button
            onClick={submit}
            disabled={loading}
            className="px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? 'Creating…' : 'Create Offer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Decline Modal ────────────────────────────────────────────────────────────

function DeclineModal({ offer, onClose, onSaved }: { offer: any; onClose: () => void; onSaved: () => void }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await offersApi.update(offer.id, { status: 'DECLINED', declineReason: reason || undefined });
      toast.success('Offer marked as declined');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to update offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Decline Reason</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Why is the offer being declined?
          </label>
          <textarea
            rows={4}
            placeholder="e.g. Counter-offer accepted, salary too low, location…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button
            onClick={submit}
            disabled={loading}
            className="px-5 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Confirm Decline'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OffersPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [declineTarget, setDeclineTarget] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['offers', statusFilter, page],
    queryFn: () => offersApi.list({ status: statusFilter || undefined, page, limit: 20 }),
    placeholderData: (prev: any) => prev,
  });

  const { data: statsData } = useQuery({
    queryKey: ['offers-stats'],
    queryFn: offersApi.stats,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      offersApi.update(id, { status }),
    onSuccess: () => {
      toast.success('Offer updated');
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['offers-stats'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to update offer'),
  });

  const items: any[]  = data?.items ?? data ?? [];
  const total: number = data?.total ?? 0;
  const pages: number = data?.pages ?? 1;
  const stats: any    = statsData ?? {};

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['offers'] });
    queryClient.invalidateQueries({ queryKey: ['offers-stats'] });
  };

  const fmtShort = (d?: string | null) => d ? format(new Date(d), 'dd MMM yyyy') : '—';

  const handleTransition = (offer: any, nextStatus: string) => {
    if (nextStatus === 'DECLINED') {
      setDeclineTarget(offer);
    } else {
      updateMutation.mutate({ id: offer.id, status: nextStatus });
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Offers</h1>
            <p className="text-sm text-gray-500">Track all candidate offers and their outcomes</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" /> Create Offer
        </button>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {OFFER_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(statusFilter === s ? '' : s); setPage(1); }}
            className={`p-3 rounded-xl border text-left transition-all ${
              statusFilter === s ? 'border-emerald-400 bg-emerald-50 shadow-sm' : 'border-gray-200 bg-white hover:border-emerald-200'
            }`}
          >
            <div className="text-lg font-bold text-gray-900">{stats[s.toLowerCase()] ?? 0}</div>
            <div className={`text-xs mt-0.5 px-2 py-0.5 rounded-full w-fit font-medium ${STATUS_COLORS[s]}`}>
              {s}
            </div>
          </button>
        ))}
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setStatusFilter(''); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              statusFilter === '' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
            }`}
          >
            All
          </button>
          {OFFER_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s === statusFilter ? '' : s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                statusFilter === s ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {statusFilter && (
          <button onClick={() => setStatusFilter('')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <TableWrapper loading={isLoading} empty={items.length === 0} emptyMessage="No offers found">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Candidate', 'Job / Client', 'Offered Salary', 'Joining Date', 'Expires', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((offer: any) => {
              const next = TRANSITIONS[offer.status] ?? [];
              return (
                <tr key={offer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {offer.candidate?.firstName} {offer.candidate?.lastName}
                    </div>
                    {offer.candidate?.currentTitle && (
                      <div className="text-xs text-gray-500 mt-0.5">{offer.candidate.currentTitle}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-800 font-medium">{offer.job?.title}</div>
                    <div className="text-xs text-gray-500">{offer.job?.client?.name ?? offer.client?.name ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                      <DollarSign className="w-3.5 h-3.5" />
                      {offer.currency} {Number(offer.offeredSalary)?.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {fmtShort(offer.joiningDate)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {offer.expiryDate ? (
                      <span className={new Date(offer.expiryDate) < new Date() ? 'text-red-500 font-medium' : ''}>
                        {fmtShort(offer.expiryDate)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[offer.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {offer.status}
                    </span>
                    {offer.declineReason && (
                      <div className="text-xs text-gray-400 mt-1 max-w-[160px] truncate" title={offer.declineReason}>
                        {offer.declineReason}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {next.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {next.map(n => (
                          <button
                            key={n}
                            onClick={() => handleTransition(offer, n)}
                            disabled={updateMutation.isPending}
                            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all disabled:opacity-50 ${
                              n === 'ACCEPTED' ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' :
                              n === 'DECLINED' ? 'border-red-300 text-red-700 hover:bg-red-50' :
                              n === 'WITHDRAWN' ? 'border-orange-300 text-orange-700 hover:bg-orange-50' :
                              'border-blue-300 text-blue-700 hover:bg-blue-50'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrapper>

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{total} total offers</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="px-3 py-1.5 font-medium">{page} / {pages}</span>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showCreate && (
        <CreateOfferModal onClose={() => setShowCreate(false)} onSaved={invalidate} />
      )}
      {declineTarget && (
        <DeclineModal
          offer={declineTarget}
          onClose={() => setDeclineTarget(null)}
          onSaved={invalidate}
        />
      )}
    </div>
  );
}
