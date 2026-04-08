'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Zap, ArrowLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const INDUSTRIES = [
  'Recruitment / Staffing',
  'Technology / IT',
  'Finance / Banking',
  'Healthcare',
  'Manufacturing',
  'Retail / E-Commerce',
  'Education',
  'Real Estate',
  'Legal',
  'Consulting',
  'Marketing / Advertising',
  'Sales',
  'Other',
];

const signupSchema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Invalid email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string(),
  companyName: z.string().min(1, 'Company name required'),
  phone: z.string().optional(),
  industry: z.string().optional(),
  country: z.string().optional(),
  agreeTerms: z.boolean().refine((v) => v, 'You must agree to the Terms & Privacy Policy'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type SignupForm = z.infer<typeof signupSchema>;

const passwordRules = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Contains uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Contains a number', test: (p: string) => /[0-9]/.test(p) },
];

export default function SignupPage() {
  const router = useRouter();
  const signup = useAuthStore((s) => s.signup);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupForm>({ resolver: zodResolver(signupSchema) });

  const password = watch('password', '');

  const onSubmit = async (data: SignupForm) => {
    setLoading(true);
    try {
      const result = await signup({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        companyName: data.companyName,
        phone: data.phone || undefined,
        industry: data.industry || undefined,
        country: data.country || undefined,
      });

      if (result?.requiresVerification) {
        // Store email for verify-email page
        sessionStorage.setItem('verify_email', result.email ?? data.email);
        toast.success('Account created! Check your email for the verification code.');
        router.push('/verify-email');
      } else {
        toast.success('Account created!');
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 p-4">
      <div className="w-full max-w-lg">
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-brand-100 hover:text-white text-xs mb-6 transition-colors w-fit"
        >
          <ArrowLeft className="w-3 h-3" /> Back to login
        </Link>

        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="mt-1 text-brand-100 text-sm">Start your 14-day free trial — no credit card required</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
                <input {...register('firstName')} className="input" placeholder="John" autoComplete="given-name" />
                {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
                <input {...register('lastName')} className="input" placeholder="Doe" autoComplete="family-name" />
                {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Work Email *</label>
              <input
                {...register('email')}
                type="email"
                className="input"
                placeholder="john@company.com"
                autoComplete="email"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            {/* Company */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Company Name *</label>
              <input {...register('companyName')} className="input" placeholder="Acme Corp" autoComplete="organization" />
              {errors.companyName && <p className="mt-1 text-xs text-red-600">{errors.companyName.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Password strength rules */}
              {password && (
                <div className="mt-1.5 space-y-0.5">
                  {passwordRules.map((rule) => (
                    <div key={rule.label} className={`flex items-center gap-1.5 text-xs ${rule.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                      <CheckCircle2 className={`w-3 h-3 ${rule.test(password) ? 'text-green-500' : 'text-gray-300'}`} />
                      {rule.label}
                    </div>
                  ))}
                </div>
              )}
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password *</label>
              <div className="relative">
                <input
                  {...register('confirmPassword')}
                  type={showConfirm ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Repeat password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
            </div>

            {/* Optional fields row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone <span className="text-gray-400">(optional)</span></label>
                <input
                  {...register('phone')}
                  type="tel"
                  className="input"
                  placeholder="+60 12-345 6789"
                  autoComplete="tel"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Industry <span className="text-gray-400">(optional)</span></label>
                <select {...register('industry')} className="input">
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Country <span className="text-gray-400">(optional)</span></label>
              <input {...register('country')} className="input" placeholder="e.g. Malaysia, Singapore" autoComplete="country-name" />
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                {...register('agreeTerms')}
                id="agreeTerms"
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="agreeTerms" className="text-xs text-gray-600 leading-snug">
                I agree to the{' '}
                <Link href="/terms" target="_blank" className="text-brand-600 font-medium hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" target="_blank" className="text-brand-600 font-medium hover:underline">
                  Privacy Policy
                </Link>
                , including the processing of business contact data and candidate resumes.
              </label>
            </div>
            {errors.agreeTerms && <p className="text-xs text-red-600">{errors.agreeTerms.message}</p>}

            <button
              type="submit"
              className="btn-primary w-full justify-center py-2.5 text-sm font-semibold mt-2"
              disabled={loading}
            >
              {loading ? 'Creating account…' : 'Create account & verify email →'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-5">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
