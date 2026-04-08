'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Zap, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';

const schema = z.object({
  otp: z.string().length(6, 'Enter the full 6-digit code'),
  newPassword: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ResetForm = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ResetForm>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const stored = sessionStorage.getItem('reset_email');
    if (!stored) {
      router.replace('/forgot-password');
      return;
    }
    setEmail(stored);
    inputRefs.current[0]?.focus();
  }, [router]);

  const handleDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);
    const combined = next.join('');
    setValue('otp', combined, { shouldValidate: combined.length === 6 });
    if (cleaned && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] ?? '';
    setDigits(next);
    setValue('otp', pasted.padEnd(6, '').slice(0, 6), { shouldValidate: pasted.length === 6 });
    inputRefs.current[Math.min(pasted.length - 1, 5)]?.focus();
  };

  const onSubmit = async (data: ResetForm) => {
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email,
        otp: data.otp,
        newPassword: data.newPassword,
      });
      sessionStorage.removeItem('reset_email');
      setSuccess(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Reset failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Password reset!</h2>
          <p className="text-sm text-gray-500 mb-6">You can now log in with your new password.</p>
          <Link href="/login" className="btn-primary w-full justify-center py-2.5 text-sm font-semibold">
            Go to login →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 p-4">
      <div className="w-full max-w-md">
        <Link
          href="/forgot-password"
          className="flex items-center gap-1.5 text-brand-100 hover:text-white text-xs mb-6 transition-colors w-fit"
        >
          <ArrowLeft className="w-3 h-3" /> Back
        </Link>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Reset your password</h1>
          <p className="mt-1 text-brand-100 text-sm">Enter the 6-digit code sent to <span className="font-semibold text-white">{email}</span></p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* OTP input */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Reset code</label>
              <div className="flex justify-center gap-2">
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={i === 0 ? handlePaste : undefined}
                    className={`w-10 h-12 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all
                      ${digit ? 'border-brand-500 text-brand-700 bg-brand-50' : 'border-gray-200 text-gray-900'}
                      focus:border-brand-600 focus:ring-2 focus:ring-brand-200`}
                    disabled={loading}
                  />
                ))}
              </div>
              {/* Hidden field for react-hook-form validation */}
              <input {...register('otp')} type="hidden" />
              {errors.otp && <p className="mt-1 text-xs text-red-600 text-center">{errors.otp.message}</p>}
            </div>

            {/* New password */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
              <div className="relative">
                <input
                  {...register('newPassword')}
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.newPassword && <p className="mt-1 text-xs text-red-600">{errors.newPassword.message}</p>}
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Confirm New Password</label>
              <div className="relative">
                <input
                  {...register('confirmPassword')}
                  type={showConfirm ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 text-sm font-semibold"
            >
              {loading ? 'Resetting…' : 'Reset password'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-5">
            <Link href="/forgot-password" className="text-brand-600 hover:underline">Request a new code</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
