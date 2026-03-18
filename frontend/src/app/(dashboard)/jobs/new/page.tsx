'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { jobsApi, aiApi } from '@/lib/api-client';
import { ArrowLeft, Upload, Loader2, Briefcase, Zap, FileText, X } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface JobForm {
  title: string;
  department?: string;
  location?: string;
  employmentType?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  description: string;
  requirements?: string;
  skills?: string;
  experienceLevel?: string;
}

export default function NewJobPage() {
  const router = useRouter();
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<JobForm>({
    defaultValues: { salaryCurrency: 'USD', employmentType: 'FULL_TIME', experienceLevel: 'MID' },
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setJdFile(file);
    setIsParsing(true);
    try {
      // For JD files, extract text and parse
      const form = new FormData();
      form.append('file', file);
      const result = await aiApi.parseResume(file); // reuse parse endpoint for JD text extraction
      if (result?.title) setValue('title', result.title);
      if (result?.department) setValue('department', result.department);
      if (result?.location) setValue('location', result.location);
      if (result?.description) setValue('description', result.description);
      if (result?.requirements) setValue('requirements', result.requirements);
      if (result?.skills) setValue('skills', Array.isArray(result.skills) ? result.skills.join(', ') : result.skills);
      toast.success('JD parsed! Please review and confirm the details.');
    } catch {
      toast.error('Could not auto-parse JD. Please fill in fields manually.');
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
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
  });

  const createMutation = useMutation({
    mutationFn: (data: JobForm) => {
      const payload = {
        ...data,
        skills: data.skills ? data.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
        requirements: data.requirements ? data.requirements.split('\n').filter(Boolean) : [],
        salaryMin: data.salaryMin ? Number(data.salaryMin) : undefined,
        salaryMax: data.salaryMax ? Number(data.salaryMax) : undefined,
      };
      return jobsApi.create(payload);
    },
    onSuccess: (data) => {
      toast.success('Job posted successfully!');
      router.push('/jobs');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to create job'),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/jobs" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-brand-600" /> Post New Job
          </h1>
          <p className="text-gray-400 text-sm">Upload a JD file for AI auto-fill or enter details manually</p>
        </div>
      </div>

      {/* JD Upload */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-brand-600" /> AI Job Description Parser
          <span className="text-xs font-normal text-gray-400">— Upload PDF/Word/TXT to auto-fill fields</span>
        </h2>

        {!jdFile ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'}`}
          >
            <input {...getInputProps()} />
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">{isDragActive ? 'Drop JD here' : 'Drag & drop job description here'}</p>
            <p className="text-xs text-gray-400 mt-1">Supports PDF, Word (.docx), Plain text · Max 20MB</p>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-brand-50 rounded-xl border border-brand-200">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-brand-600" />
              <div>
                <p className="text-sm font-medium text-gray-700">{jdFile.name}</p>
                <p className="text-xs text-gray-400">{(jdFile.size / 1024).toFixed(0)} KB</p>
              </div>
              {isParsing && <Loader2 className="w-4 h-4 text-brand-600 animate-spin" />}
            </div>
            <button onClick={() => setJdFile(null)} className="text-gray-400 hover:text-red-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Job Details</h2>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Job Title *</label>
          <input {...register('title', { required: 'Required' })} className="input" placeholder="Senior Software Engineer" />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
            <input {...register('department')} className="input" placeholder="Engineering" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
            <input {...register('location')} className="input" placeholder="London, UK / Remote" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Employment Type</label>
            <select {...register('employmentType')} className="input">
              <option value="FULL_TIME">Full-time</option>
              <option value="PART_TIME">Part-time</option>
              <option value="CONTRACT">Contract</option>
              <option value="FREELANCE">Freelance</option>
              <option value="INTERNSHIP">Internship</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Experience Level</label>
            <select {...register('experienceLevel')} className="input">
              <option value="JUNIOR">Junior (0-2 yrs)</option>
              <option value="MID">Mid (2-5 yrs)</option>
              <option value="SENIOR">Senior (5+ yrs)</option>
              <option value="LEAD">Lead / Principal</option>
              <option value="EXECUTIVE">Executive / Director</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Salary Min</label>
            <input {...register('salaryMin')} type="number" className="input" placeholder="60000" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Salary Max</label>
            <input {...register('salaryMax')} type="number" className="input" placeholder="90000" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
            <select {...register('salaryCurrency')} className="input">
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="EUR">EUR</option>
              <option value="AED">AED</option>
              <option value="SGD">SGD</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Job Description *</label>
          <textarea {...register('description', { required: 'Required' })} className="input min-h-[120px] resize-y" placeholder="Describe the role, team, responsibilities..." />
          {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Requirements <span className="text-gray-400">(one per line)</span></label>
          <textarea {...register('requirements')} className="input min-h-[80px] resize-y" placeholder="5+ years experience in Node.js&#10;Strong understanding of PostgreSQL&#10;Experience with cloud services (AWS/GCP)" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Required Skills <span className="text-gray-400">(comma separated)</span></label>
          <input {...register('skills')} className="input" placeholder="Node.js, TypeScript, PostgreSQL, AWS" />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/jobs" className="btn-secondary flex-1 text-center justify-center">Cancel</Link>
          <button type="submit" disabled={createMutation.isPending || isParsing} className="btn-primary flex-1 justify-center">
            {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Posting…</> : 'Post Job'}
          </button>
        </div>
      </form>
    </div>
  );
}
