'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { TrendingUp, ArrowLeft, Eye, EyeOff, CheckCircle, Users, Target, Zap, ExternalLink } from 'lucide-react';
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
    <div className="min-h-screen flex" style={{ background: '#f8fafc' }}>

      {/* ── Left panel — branding (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-[46%] flex-col justify-between p-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #0f172a 0%, #0f1b2d 55%, #1e3a5f 100%)' }}
      >
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        <div className="relative z-10">
          {/* Parent link */}
          <a href="https://srpailabs.com" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 text-xs transition-colors mb-10">
            <ArrowLeft className="w-3 h-3" /> srpailabs.com
          </a>

          {/* Product logo */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-xl tracking-tight leading-tight">Growth OS</div>
              <div className="text-blue-400 text-xs font-medium">by SRP AI Labs</div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mt-8 mb-3 leading-tight">
            Recruitment & Sales<br />Automation Platform
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-10">
            AI-powered hiring pipelines, lead scoring, and outreach automation — built for agencies and B2B sales teams.
          </p>

          {/* Feature highlights */}
          <div className="space-y-4">
            {[
              { icon: Users, label: 'AI Resume Screening', desc: 'Senior-level AI auditor scores every candidate' },
              { icon: Target, label: 'Lead Scoring & CRM', desc: 'ICP scoring + automated outreach sequences' },
              { icon: Zap, label: 'Workflow Automation', desc: 'Import, enrich, and engage at scale' },
            ].map(f => (
              <div key={f.label} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(37,99,235,0.3)' }}>
                  <f.icon className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <div className="text-white text-sm font-medium">{f.label}</div>
                  <div className="text-slate-400 text-xs">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
            <span className="text-slate-400 text-xs">Multi-tenant · Isolated per workspace</span>
          </div>
          <a href="https://srpailabs.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs transition-colors">
            <ExternalLink className="w-3 h-3" />
            Part of the SRP AI Labs product suite
          </a>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        {/* Mobile logo */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-lg leading-tight">Growth OS</div>
              <div className="text-blue-600 text-xs font-medium">by SRP AI Labs</div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h1>
            <p className="text-gray-500 text-sm">Welcome back — enter your workspace credentials</p>
          </div>

          {DEMO_CREDENTIALS && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-blue-700 mb-1">Try the Demo</p>
                  <p className="text-xs text-blue-600">Email: <span className="font-mono">{DEMO_CREDENTIALS.email}</span></p>
                  <p className="text-xs text-blue-600">Workspace: <span className="font-mono">{DEMO_CREDENTIALS.tenantSlug}</span></p>
                </div>
                <button type="button" onClick={fillDemo} className="flex-shrink-0 text-xs bg-blue-600 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
                  Fill
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email address</label>
              <input {...register('email')} type="email" placeholder="admin@company.com" className="input" autoComplete="email" />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700">Password</label>
                <Link href="/forgot-password" className="text-xs text-brand-600 hover:text-brand-700 font-medium">Forgot password?</Link>
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
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Workspace Slug <span className="text-gray-400 font-normal">(optional — for multi-tenant login)</span>
              </label>
              <input {...register('tenantSlug')} className="input" placeholder="my-company" />
            </div>

            <div className="flex items-center gap-2">
              <input {...register('rememberMe')} id="rememberMe" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
              <label htmlFor="rememberMe" className="text-xs text-gray-600">Remember me for 7 days</label>
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-2.5 font-semibold" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in to Growth OS'}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#f8fafc] px-3 text-gray-400 tracking-wide">or</span>
            </div>
          </div>

          <GoogleLoginButton label="Continue with Google" />

          <p className="text-center text-xs text-gray-400 mt-6">
            No account?{' '}
            <Link href="/signup" className="text-brand-600 font-semibold hover:text-brand-700">Create workspace</Link>
          </p>

          <p className="text-center text-[10px] text-gray-300 mt-4">
            Growth OS is a product of{' '}
            <a href="https://srpailabs.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600 underline">SRP AI Labs</a>
          </p>
        </div>
      </div>

    </div>
  );
}

