'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Zap, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { GoogleLoginButton } from '@/components/GoogleLoginButton';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
  tenantSlug: z.string().optional(),
  rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

const DEMO_CREDENTIALS = DEMO_MODE ? {
  email: 'admin@srp-ai-labs.com',
  password: 'Admin@123',
  tenantSlug: 'srp-ai-labs',
} : null;

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { rememberMe: false } });

  const fillDemo = () => {
    if (!DEMO_CREDENTIALS) return;
    setValue('email', DEMO_CREDENTIALS.email);
    setValue('password', DEMO_CREDENTIALS.password);
    setValue('tenantSlug', DEMO_CREDENTIALS.tenantSlug);
    toast.success('Demo credentials filled! Click Sign in.');
  };

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      await login(data.email, data.password, data.tenantSlug, data.rememberMe ?? false);
      const redirect = searchParams.get('redirect') || '/dashboard';
      // Prevent open redirect — only allow relative paths starting with /
      const safePath = redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/dashboard';
      router.push(safePath);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Login failed';
      if (msg.toLowerCase().includes('verify your email')) {
        sessionStorage.setItem('verify_email', data.email);
        toast.error('Please verify your email first.');
        router.push('/verify-email');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-1.5 text-brand-100 hover:text-white text-xs mb-6 transition-colors w-fit">
          <ArrowLeft className="w-3 h-3" /> Back to home
        </Link>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">SRP AI Labs</h1>
          <p className="mt-1 text-brand-100 text-sm">Recruitment &amp; Sales Automation Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Sign in to your account</h2>
          <p className="text-gray-400 text-xs mb-5">Enter your credentials or try the demo</p>

          {DEMO_CREDENTIALS && (
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 mb-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-brand-700 mb-1">Try the Demo</p>
                <p className="text-xs text-brand-600">Email: <span className="font-mono">{DEMO_CREDENTIALS.email}</span></p>
                <p className="text-xs text-brand-600">Password: <span className="font-mono">{DEMO_CREDENTIALS.password}</span></p>
              </div>
              <button type="button" onClick={fillDemo} className="flex-shrink-0 text-xs bg-brand-600 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-brand-700 transition-colors">
                Fill Demo
              </button>
            </div>
          </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input {...register('email')} type="email" placeholder="admin@company.com" className="input" autoComplete="email" />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-700">Password</label>
                <Link href="/forgot-password" className="text-xs text-brand-600 hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input {...register('password')} type={showPassword ? 'text' : 'password'} className="input pr-10" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Workspace Slug <span className="text-gray-400">(optional)</span></label>
              <input {...register('tenantSlug')} className="input" placeholder="my-company" />
            </div>

            <div className="flex items-center gap-2">
              <input {...register('rememberMe')} id="rememberMe" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              <label htmlFor="rememberMe" className="text-xs text-gray-600">Remember me for 7 days</label>
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-2.5 text-sm font-semibold" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-gray-400 tracking-wide">or</span>
            </div>
          </div>

          <GoogleLoginButton label="Sign in with Google" />

          <p className="text-center text-xs text-gray-400 mt-5">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-brand-600 font-medium hover:underline">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
