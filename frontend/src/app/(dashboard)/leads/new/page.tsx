'use client';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { leadsApi } from '@/lib/api-client';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const SOURCES = ['MANUAL', 'CSV_IMPORT', 'LINKEDIN', 'WEBSITE', 'REFERRAL', 'EVENT', 'COLD_OUTREACH', 'OTHER'];

export default function NewLeadPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<any>();

  const mutation = useMutation({
    mutationFn: (data: any) => leadsApi.create(data),
    onSuccess: (lead) => {
      toast.success('Lead added!');
      router.push(`/leads/${lead.id}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to create lead'),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Add Lead</h1>
        <p className="text-gray-500 mt-1 text-sm">Add a new sales lead manually</p>
      </div>

      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="card space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
            <input className="input" {...register('firstName', { required: true })} placeholder="John" />
            {errors.firstName && <p className="text-xs text-red-500 mt-1">Required</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
            <input className="input" {...register('lastName', { required: true })} placeholder="Smith" />
            {errors.lastName && <p className="text-xs text-red-500 mt-1">Required</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input className="input" type="email" {...register('email')} placeholder="john@company.com" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
          <input className="input" {...register('title')} placeholder="VP of Sales" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
          <input className="input" {...register('companyName')} placeholder="Acme Corp" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input className="input" {...register('phone')} placeholder="+60 12 345 6789" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
          <input className="input" {...register('linkedinUrl')} placeholder="https://linkedin.com/in/..." />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
          <select className="input" {...register('source')}>
            {SOURCES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea className="input min-h-[80px]" {...register('notes')} placeholder="Any context or notes about this lead..." />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary flex-1"
          >
            {mutation.isPending ? 'Adding...' : 'Add Lead'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
