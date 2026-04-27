'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { followUpsApi } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CalendarCheck, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const TYPES = [
  { value: 'CALL',      label: 'Phone Call' },
  { value: 'EMAIL',     label: 'Email' },
  { value: 'MEETING',   label: 'Meeting' },
  { value: 'LINKEDIN',  label: 'LinkedIn' },
  { value: 'WHATSAPP',  label: 'WhatsApp' },
  { value: 'OTHER',     label: 'Other' },
];

export default function NewFollowUpPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const defaultDT = now.toISOString().slice(0, 16);

  const [form, setForm] = useState({
    scheduledAt: defaultDT, type: 'CALL', subject: '', notes: '',
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () => followUpsApi.create({
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      type: form.type,
      subject: form.subject || undefined,
      notes: form.notes || undefined,
    }),
    onSuccess: () => {
      toast.success('Follow-up scheduled');
      qc.invalidateQueries({ queryKey: ['follow-ups'] });
      router.push('/follow-ups');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to create follow-up'),
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/follow-ups" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Back to Follow-Ups
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Schedule Follow-Up</h1>
            <p className="text-sm text-gray-500">Set a reminder to follow up with a contact</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Type + Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date &amp; Time <span className="text-red-500">*</span></label>
              <input
                type="datetime-local" value={form.scheduledAt} onChange={e => set('scheduledAt', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text" value={form.subject} onChange={e => set('subject', e.target.value)}
              placeholder="e.g. Follow up on proposal sent last week"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={3} placeholder="Context or talking points..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={() => mutate()}
            disabled={isPending || !form.scheduledAt}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {isPending ? 'Saving...' : 'Schedule Follow-Up'}
          </button>
          <Link href="/follow-ups" className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
