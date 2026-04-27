'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { submissionsApi, clientsApi } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const STAGES = [
  { value: 'DRAFT',                label: 'Draft' },
  { value: 'INTERNAL_REVIEW',      label: 'Internal Review' },
  { value: 'SUBMITTED_TO_SALES',   label: 'Submitted to Sales' },
  { value: 'SUBMITTED_TO_CLIENT',  label: 'Submitted to Client' },
  { value: 'CLIENT_REVIEW',        label: 'Client Review' },
  { value: 'INTERVIEW',            label: 'Interview' },
  { value: 'OFFER',                label: 'Offer' },
  { value: 'JOINED',               label: 'Joined' },
];

export default function NewSubmissionPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    clientId: '', jobId: '', candidateId: '',
    stage: 'DRAFT', recruiterNotes: '',
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 'all'],
    queryFn: () => clientsApi.list({ limit: 100 }),
  });
  const clients: any[] = clientsData?.data ?? [];

  const { data: jobsData } = useQuery({
    queryKey: ['jobs', 'all'],
    queryFn: () => api.get('/jobs', { params: { limit: 100 } }).then(r => r.data),
    enabled: !!form.clientId,
  });
  const jobs: any[] = jobsData?.data ?? [];

  const { data: candidatesData } = useQuery({
    queryKey: ['candidates', 'all'],
    queryFn: () => api.get('/candidates', { params: { limit: 100 } }).then(r => r.data),
  });
  const candidates: any[] = candidatesData?.data ?? [];

  const { mutate, isPending } = useMutation({
    mutationFn: () => submissionsApi.create({
      clientId: form.clientId,
      jobId: form.jobId,
      candidateId: form.candidateId,
      stage: form.stage,
      recruiterNotes: form.recruiterNotes || undefined,
    }),
    onSuccess: () => {
      toast.success('Submission created');
      qc.invalidateQueries({ queryKey: ['submissions'] });
      router.push('/submissions');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to create submission'),
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const canSubmit = form.clientId && form.jobId && form.candidateId;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/submissions" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Back to Submissions
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <Send className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">New Submission</h1>
            <p className="text-sm text-gray-500">Submit a candidate to a client for a job</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client <span className="text-red-500">*</span></label>
            <select value={form.clientId} onChange={e => set('clientId', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">Select client</option>
              {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Job */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job / JD <span className="text-red-500">*</span></label>
            <select value={form.jobId} onChange={e => set('jobId', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">{form.clientId ? 'Select job' : 'Select a client first'}</option>
              {jobs.map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>

          {/* Candidate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Candidate <span className="text-red-500">*</span></label>
            <select value={form.candidateId} onChange={e => set('candidateId', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">Select candidate</option>
              {candidates.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {`${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.email}
                </option>
              ))}
            </select>
          </div>

          {/* Stage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
            <select value={form.stage} onChange={e => set('stage', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
              {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Recruiter Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recruiter Notes</label>
            <textarea
              value={form.recruiterNotes} onChange={e => set('recruiterNotes', e.target.value)}
              rows={3} placeholder="Why is this candidate a good fit? Key highlights..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={() => mutate()}
            disabled={isPending || !canSubmit}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {isPending ? 'Saving...' : 'Create Submission'}
          </button>
          <Link href="/submissions" className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
