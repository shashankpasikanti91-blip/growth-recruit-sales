'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { outreachApi } from '@/lib/api-client';
import { Mail, Send, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'badge-gray', SENT: 'badge-blue', DELIVERED: 'badge-blue',
  OPENED: 'badge-green', REPLIED: 'badge-green', BOUNCED: 'badge-red', OPTED_OUT: 'badge-red',
};

function GenerateForm() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ targetType: 'CANDIDATE', targetId: '', channel: 'EMAIL', sequenceSteps: 1, jobId: '' });

  const mutation = useMutation({
    mutationFn: () => outreachApi.generate(form),
    onSuccess: () => { toast.success('Outreach generated!'); queryClient.invalidateQueries({ queryKey: ['outreach-messages'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Generation failed'),
  });

  return (
    <div className="card space-y-4">
      <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Zap className="w-4 h-4 text-purple-500" /> Generate Outreach</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Target Type</label>
          <select className="input" value={form.targetType} onChange={e => setForm(f => ({ ...f, targetType: e.target.value }))}>
            <option value="CANDIDATE">Candidate</option>
            <option value="LEAD">Lead</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Channel</label>
          <select className="input" value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}>
            <option value="EMAIL">Email</option>
            <option value="LINKEDIN">LinkedIn</option>
            <option value="WHATSAPP">WhatsApp</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">{form.targetType} ID</label>
        <input className="input" placeholder="UUID" value={form.targetId} onChange={e => setForm(f => ({ ...f, targetId: e.target.value }))} />
      </div>
      {form.targetType === 'CANDIDATE' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Job ID (optional)</label>
          <input className="input" placeholder="UUID of job for context" value={form.jobId} onChange={e => setForm(f => ({ ...f, jobId: e.target.value }))} />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Sequence Steps (1 = single message)</label>
        <input type="number" min={1} max={5} className="input w-24" value={form.sequenceSteps} onChange={e => setForm(f => ({ ...f, sequenceSteps: Number(e.target.value) }))} />
      </div>
      <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.targetId} className="btn-primary">
        {mutation.isPending ? 'Generating...' : 'Generate with AI'}
      </button>
    </div>
  );
}

export default function OutreachPage() {
  const [status, setStatus] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['outreach-messages', status],
    queryFn: () => outreachApi.listMessages({ status: status || undefined, limit: 50 }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Outreach</h1>
        <p className="text-gray-500 mt-1">AI-generated outreach messages and sequences</p>
      </div>

      <GenerateForm />

      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b bg-gray-50">
          <Mail className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-900">Messages</span>
          <select className="input ml-auto w-36" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {['PENDING','SENT','DELIVERED','OPENED','REPLIED','BOUNCED','OPTED_OUT'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Channel', 'Subject', 'Status', 'Step', 'Created'].map(h => (
                <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : data?.data?.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No messages yet</td></tr>
            ) : (
              data?.data?.map((msg: any) => (
                <tr key={msg.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4"><span className="badge-blue">{msg.channel}</span></td>
                  <td className="px-6 py-4 text-gray-900 max-w-xs truncate">{msg.subject ?? '(no subject)'}</td>
                  <td className="px-6 py-4"><span className={STATUS_BADGE[msg.status] ?? 'badge-gray'}>{msg.status}</span></td>
                  <td className="px-6 py-4 text-gray-500">Step {msg.stepNumber}</td>
                  <td className="px-6 py-4 text-gray-400 text-xs">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
