'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { candidatesApi, aiApi } from '@/lib/api-client';
import { ArrowLeft, Upload, Loader2, UserPlus, Zap, FileText, X } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface CandidateForm {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  currentTitle?: string;
  currentCompany?: string;
  location?: string;
  linkedinUrl?: string;
  skills?: string;
  resumeText?: string;
  source?: string;
  nationality?: string;
  visaType?: string;
  visaExpiry?: string;
  visaStatus?: string;
  isForeigner?: boolean;
}

export default function NewCandidatePage() {
  const router = useRouter();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<CandidateForm>({
    defaultValues: { source: 'MANUAL' },
  });

  // Resume upload dropzone (PDF/Word)
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setResumeFile(file);

    // Try to extract text via AI parser
    setIsParsing(true);
    try {
      const result = await aiApi.parseResume(file);
      if (result?.firstName) setValue('firstName', result.firstName);
      if (result?.lastName) setValue('lastName', result.lastName);
      if (result?.email) setValue('email', result.email);
      if (result?.phone) setValue('phone', result.phone);
      if (result?.currentTitle) setValue('currentTitle', result.currentTitle);
      if (result?.currentCompany) setValue('currentCompany', result.currentCompany);
      if (result?.location) setValue('location', result.location);
      if (result?.linkedinUrl) setValue('linkedinUrl', result.linkedinUrl);
      if (result?.skills) setValue('skills', Array.isArray(result.skills) ? result.skills.join(', ') : result.skills);
      if (result?.resumeText) setValue('resumeText', result.resumeText);
      if (result?.nationality) setValue('nationality', result.nationality);
      if (result?.visaType) setValue('visaType', result.visaType);
      if (result?.visaExpiry) setValue('visaExpiry', result.visaExpiry);
      if (result?.isForeigner !== undefined) setValue('isForeigner', result.isForeigner);
      toast.success('Resume parsed! Please review and confirm the details.');
    } catch {
      toast.error('Could not auto-parse resume. Please fill in fields manually.');
    } finally {
      setIsParsing(false);
    }
  }, [setValue]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
    },
    maxFiles: 1,
  });

  const createMutation = useMutation({
    mutationFn: (data: CandidateForm) => {
      const payload = {
        ...data,
        skills: data.skills ? data.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      return candidatesApi.create(payload);
    },
    onSuccess: (data) => {
      toast.success('Candidate added successfully!');
      router.push(`/candidates/${data.id}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to create candidate'),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/candidates" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand-600" /> Add New Candidate
          </h1>
          <p className="text-gray-400 text-sm">Upload a resume for AI auto-fill or enter details manually</p>
        </div>
      </div>

      {/* Resume Upload */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-brand-600" /> AI Resume Parser
          <span className="text-xs font-normal text-gray-400">— Upload PDF or Word to auto-fill fields</span>
        </h2>

        {!resumeFile ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'}`}
          >
            <input {...getInputProps()} />
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">{isDragActive ? 'Drop resume here' : 'Drag & drop resume here'}</p>
            <p className="text-xs text-gray-400 mt-1">Supports PDF, Word (.docx, .doc) · Max 20MB</p>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-brand-50 rounded-xl border border-brand-200">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-brand-600" />
              <div>
                <p className="text-sm font-medium text-gray-700">{resumeFile.name}</p>
                <p className="text-xs text-gray-400">{(resumeFile.size / 1024).toFixed(0)} KB</p>
              </div>
              {isParsing && <Loader2 className="w-4 h-4 text-brand-600 animate-spin" />}
            </div>
            <button onClick={() => setResumeFile(null)} className="text-gray-400 hover:text-red-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Candidate Details</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
            <input {...register('firstName', { required: 'Required' })} className="input" placeholder="Jane" />
            {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
            <input {...register('lastName', { required: 'Required' })} className="input" placeholder="Smith" />
            {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
          <input {...register('email', { required: 'Required' })} type="email" className="input" placeholder="jane@example.com" />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
            <input {...register('phone')} className="input" placeholder="+1 555 0100" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
            <input {...register('location')} className="input" placeholder="London, UK" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Current Title</label>
            <input {...register('currentTitle')} className="input" placeholder="Senior Engineer" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Current Company</label>
            <input {...register('currentCompany')} className="input" placeholder="Acme Corp" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">LinkedIn URL</label>
          <input {...register('linkedinUrl')} className="input" placeholder="https://linkedin.com/in/janesmith" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Skills <span className="text-gray-400">(comma separated)</span></label>
          <input {...register('skills')} className="input" placeholder="React, TypeScript, Node.js, Python" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Source</label>
          <select {...register('source')} className="input">
            <option value="MANUAL">Manual entry</option>
            <option value="LINKEDIN">LinkedIn</option>
            <option value="REFERRAL">Referral</option>
            <option value="JOB_BOARD">Job Board</option>
            <option value="WEBSITE">Website</option>
          </select>
        </div>

        {/* Visa & Immigration */}
        <div className="border-t pt-4 mt-2">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Visa & Immigration</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nationality</label>
              <input {...register('nationality')} className="input" placeholder="Malaysian" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Visa Type</label>
              <input {...register('visaType')} className="input" placeholder="EP, SP, H-1B..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Visa Expiry</label>
              <input {...register('visaExpiry')} type="date" className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Visa Status</label>
              <select {...register('visaStatus')} className="input">
                <option value="">Select...</option>
                <option value="CITIZEN">Citizen</option>
                <option value="PR">Permanent Resident</option>
                <option value="VALID">Valid Visa</option>
                <option value="EXPIRING_SOON">Expiring Soon</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
              <input {...register('isForeigner')} type="checkbox" className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              Foreign worker (requires work visa / permit)
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Resume Text <span className="text-gray-400">(optional — paste or auto-filled)</span></label>
          <textarea {...register('resumeText')} className="input min-h-[80px] resize-y" placeholder="Paste resume text or leave blank if uploaded above..." />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/candidates" className="btn-secondary flex-1 text-center justify-center">Cancel</Link>
          <button type="submit" disabled={createMutation.isPending || isParsing} className="btn-primary flex-1 justify-center">
            {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Add Candidate'}
          </button>
        </div>
      </form>
    </div>
  );
}
