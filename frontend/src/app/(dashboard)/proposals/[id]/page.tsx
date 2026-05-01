'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { proposalsApi } from '@/lib/api-client';
import Link from 'next/link';
import {
  ArrowLeft, ScrollText, DollarSign, Calendar, Clock,
  CheckCircle, XCircle, Send, RotateCcw, FileText, Building2,
  User, Hash, Loader2, ExternalLink,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  DRAFT:        { bg: 'bg-gray-100',    text: 'text-gray-600',   border: 'border-gray-200',   label: 'Draft' },
  SENT:         { bg: 'bg-blue-50',     text: 'text-blue-700',   border: 'border-blue-200',   label: 'Sent' },
  UNDER_REVIEW: { bg: 'bg-indigo-50',   text: 'text-indigo-700', border: 'border-indigo-200', label: 'Under Review' },
  ACCEPTED:     { bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', label: 'Accepted' },
  REJECTED:     { bg: 'bg-red-50',      text: 'text-red-700',    border: 'border-red-200',    label: 'Rejected' },
  REVISED:      { bg: 'bg-amber-50',    text: 'text-amber-700',  border: 'border-amber-200',  label: 'Revised' },
};

// Allowed next transitions per status
const TRANSITIONS: Record<string, string[]> = {
  DRAFT:        ['SENT'],
  SENT:         ['UNDER_REVIEW', 'ACCEPTED', 'REJECTED'],
  UNDER_REVIEW: ['ACCEPTED', 'REJECTED', 'REVISED'],
  REVISED:      ['SENT', 'ACCEPTED', 'REJECTED'],
  ACCEPTED:     [],
  REJECTED:     ['REVISED'],
};

const TRANSITION_LABELS: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  SENT:         { label: 'Mark Sent',       icon: Send,       cls: 'btn-primary' },
  UNDER_REVIEW: { label: 'Under Review',    icon: RotateCcw,  cls: 'btn-secondary' },
  ACCEPTED:     { label: 'Accept',          icon: CheckCircle, cls: 'bg-emerald-600 text-white hover:bg-emerald-700 btn' },
  REJECTED:     { label: 'Reject',          icon: XCircle,    cls: 'bg-red-600 text-white hover:bg-red-700 btn' },
  REVISED:      { label: 'Mark Revised',    icon: RotateCcw,  cls: 'btn-secondary' },
};

// Status progression bar steps
const STATUS_STEPS = ['DRAFT', 'SENT', 'UNDER_REVIEW', 'ACCEPTED'];
const STEP_INDEX: Record<string, number> = {
  DRAFT: 0, SENT: 1, UNDER_REVIEW: 2, ACCEPTED: 3, REVISED: 1, REJECTED: -1,
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${c.bg} ${c.text} border ${c.border}`}>
      {c.label}
    </span>
  );
}

function fmt(d?: string | null) {
  return d ? format(new Date(d), 'dd MMM yyyy') : '—';
}
function rel(d?: string | null) {
  return d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : '';
}

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);

  const { data: proposal, isLoading, error } = useQuery({
    queryKey: ['proposal', id],
    queryFn: () => proposalsApi.get(id),
  });

  const updateMutation = useMutation({
    mutationFn: (status: string) => proposalsApi.update(id, { status }),
    onSuccess: () => {
      toast.success('Proposal status updated');
      queryClient.invalidateQueries({ queryKey: ['proposal', id] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      setConfirmStatus(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Update failed'),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading proposal…</div>;
  if (error || !proposal) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16 space-y-4">
        <p className="text-gray-400 text-lg">Proposal not found.</p>
        <button onClick={() => router.push('/proposals')} className="btn-primary">Back to Proposals</button>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[proposal.status] ?? STATUS_CONFIG.DRAFT;
  const nextTransitions = TRANSITIONS[proposal.status] ?? [];
  const currentStep = STEP_INDEX[proposal.status] ?? 0;
  const isTerminal = proposal.status === 'ACCEPTED' || proposal.status === 'REJECTED';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => router.push('/proposals')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to Proposals
      </button>

      {/* ── Header ── */}
      <div className="card">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center">
              <ScrollText className="w-7 h-7 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{proposal.title}</h1>
                <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{proposal.businessId}</span>
              </div>
              {proposal.client && (
                <Link href={`/clients/${proposal.client.id}`} className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 mt-1 font-medium">
                  <Building2 className="w-3.5 h-3.5" /> {proposal.client.name}
                  <ExternalLink className="w-3 h-3 text-gray-400" />
                </Link>
              )}
              {proposal.lead && (
                <Link href={`/leads/${proposal.lead.id}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mt-0.5">
                  <User className="w-3 h-3" /> {proposal.lead.firstName} {proposal.lead.lastName}
                </Link>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                {proposal.value != null && (
                  <span className="flex items-center gap-1 text-green-600 font-semibold text-sm">
                    <DollarSign className="w-3.5 h-3.5" />
                    {proposal.currency ?? 'USD'} {Number(proposal.value).toLocaleString()}
                  </span>
                )}
                {proposal.validUntil && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Valid until {fmt(proposal.validUntil)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Created {fmt(proposal.createdAt)} · {rel(proposal.createdAt)}
                </span>
              </div>
            </div>
          </div>
          <StatusBadge status={proposal.status} />
        </div>
      </div>

      {/* ── Status Progression Bar ── */}
      {!isTerminal && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Proposal Progress</h2>
          <div className="flex items-center gap-0">
            {STATUS_STEPS.map((step, idx) => {
              const isActive = idx === currentStep;
              const isDone = idx < currentStep;
              const stepCfg = STATUS_CONFIG[step];
              return (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    isDone ? 'bg-green-500 border-green-500 text-white' :
                    isActive ? `${stepCfg?.bg} ${stepCfg?.border} border-2 ${stepCfg?.text} font-bold` :
                    'bg-gray-100 border-gray-200 text-gray-400'
                  }`}>
                    {isDone ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div className="ml-2 mr-4 hidden sm:block">
                    <p className={`text-xs font-medium ${isActive ? stepCfg?.text : isDone ? 'text-green-600' : 'text-gray-400'}`}>
                      {stepCfg?.label}
                    </p>
                  </div>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${isDone ? 'bg-green-400' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Status = REJECTED banner ── */}
      {proposal.status === 'REJECTED' && (
        <div className="card bg-red-50 border-red-100">
          <div className="flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-800">This proposal was rejected</p>
              {proposal.rejectedAt && (
                <p className="text-xs text-red-600 mt-0.5">Rejected on {fmt(proposal.rejectedAt)} · {rel(proposal.rejectedAt)}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Status = ACCEPTED banner ── */}
      {proposal.status === 'ACCEPTED' && (
        <div className="card bg-emerald-50 border-emerald-100">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-emerald-800">This proposal was accepted</p>
              {proposal.acceptedAt && (
                <p className="text-xs text-emerald-600 mt-0.5">Accepted on {fmt(proposal.acceptedAt)} · {rel(proposal.acceptedAt)}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Notes ── */}
      {proposal.notes && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Notes</h2>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{proposal.notes}</p>
        </div>
      )}

      {/* ── Document Link ── */}
      {proposal.fileUrl && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Proposal Document</h2>
          <a
            href={proposal.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            <FileText className="w-4 h-4" /> View / Download Document
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* ── Proposal Details ── */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Proposal Details</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Status',      value: STATUS_CONFIG[proposal.status]?.label ?? proposal.status },
            { label: 'Currency',    value: proposal.currency ?? 'USD' },
            { label: 'Valid Until', value: fmt(proposal.validUntil) },
            { label: 'Sent',        value: proposal.sentAt ? `${fmt(proposal.sentAt)} · ${rel(proposal.sentAt)}` : '—' },
            { label: 'Accepted',    value: proposal.acceptedAt ? `${fmt(proposal.acceptedAt)} · ${rel(proposal.acceptedAt)}` : '—' },
            { label: 'Rejected',    value: proposal.rejectedAt ? `${fmt(proposal.rejectedAt)} · ${rel(proposal.rejectedAt)}` : '—' },
            { label: 'Created',     value: `${fmt(proposal.createdAt)} · ${rel(proposal.createdAt)}` },
            { label: 'Last Updated', value: `${fmt(proposal.updatedAt)} · ${rel(proposal.updatedAt)}` },
          ].filter(d => d.value && d.value !== '—').map(({ label, value }) => (
            <div key={label} className="contents">
              <dt className="text-gray-500">{label}</dt>
              <dd className="font-medium text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ── Status Transition Actions ── */}
      {nextTransitions.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Update Status</h2>
          <div className="flex flex-wrap gap-2">
            {nextTransitions.map(next => {
              const t = TRANSITION_LABELS[next];
              if (!t) return null;
              const Icon = t.icon;
              return (
                <button
                  key={next}
                  onClick={() => setConfirmStatus(next)}
                  disabled={updateMutation.isPending}
                  className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-all ${t.cls}`}
                >
                  <Icon className="w-4 h-4" /> {t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Confirm Status Modal ── */}
      {confirmStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-gray-900">Confirm Status Change</h3>
            <p className="text-sm text-gray-600">
              Change status from <strong>{STATUS_CONFIG[proposal.status]?.label}</strong> to{' '}
              <strong>{STATUS_CONFIG[confirmStatus]?.label}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmStatus(null)} className="btn-secondary text-sm">Cancel</button>
              <button
                onClick={() => updateMutation.mutate(confirmStatus)}
                disabled={updateMutation.isPending}
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
