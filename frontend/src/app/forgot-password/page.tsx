'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Zap, ArrowLeft, Mail } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotForm = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<ForgotForm>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: ForgotForm) => {
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: data.email });
      sessionStorage.setItem('reset_email', data.email);
      setSent(true);
    } catch (err: any) {
      // Even on error, show generic message (don't reveal if email exists)
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
            <p className="text-sm text-gray-500 mb-1">
              If <span className="font-medium text-gray-700">{getValues('email')}</span> is registered,
              we&apos;ve sent a password reset code.
            </p>
            <p className="text-xs text-gray-400 mb-6">The code expires in 10 minutes. Check your spam folder if you don&apos;t see it.</p>
            <button
              onClick={() => router.push('/reset-password')}
              className="btn-primary w-full justify-center py-2.5 text-sm font-semibold"
            >
              Enter reset code →
            </button>
            <p className="text-xs text-gray-400 mt-4">
              <Link href="/login" className="text-brand-600 hover:underline">Back to login</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 p-4">
      <div className="w-full max-w-md">
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-brand-100 hover:text-white text-xs mb-6 transition-colors w-fit"
        >
          <ArrowLeft className="w-3 h-3" /> Back to login
        </Link>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Forgot password?</h1>
          <p className="mt-1 text-brand-100 text-sm">Enter your email and we&apos;ll send you a reset code</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email address</label>
              <input
                {...register('email')}
                type="email"
                className="input"
                placeholder="john@company.com"
                autoComplete="email"
                autoFocus
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 text-sm font-semibold"
            >
              {loading ? 'Sending…' : 'Send reset code'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-5">
            Remembered your password?{' '}
            <Link href="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
