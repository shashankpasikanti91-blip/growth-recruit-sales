'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import apiClient from '../../lib/api';
import { setAuthToken } from '../../lib/auth';
import { Eye, EyeOff, ChevronDown, ChevronUp, Briefcase, Users, TrendingUp, ShieldCheck } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { email: 'admin@tekgen.com',    password: 'Admin@2026',    label: 'Admin',    role: 'ADMIN' },
  { email: 'shashank@tekgen.com', password: 'Shashank@2026', label: 'Shashank', role: 'RECRUITER' },
  { email: 'jerry@tekgen.com',    password: 'Jerry@2026',    label: 'Jerry',    role: 'RECRUITER' },
  { email: 'savitha@tekgen.com',  password: 'Savitha@2026',  label: 'Savitha',  role: 'RECRUITER' },
  { email: 'demo@tekgen.com',     password: 'Demo@2026',     label: 'Demo',     role: 'RECRUITER' },
];

const FEATURES = [
  { icon: Briefcase,   text: 'Recruitment ATS — full candidate pipeline' },
  { icon: Users,       text: 'HR Operations — employee lifecycle management' },
  { icon: TrendingUp,  text: 'Sales CRM — lead tracking and pipeline' },
  { icon: ShieldCheck, text: 'Visa Desk — pass and permit management' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail');
    const savedPassword = localStorage.getItem('savedPassword');
    const shouldRemember = localStorage.getItem('rememberMe') === 'true';
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(shouldRemember);
      if (savedPassword && shouldRemember) setPassword(savedPassword);
    }
  }, []);

  const handleQuickLogin = (acct) => {
    setEmail(acct.email);
    setPassword(acct.password);
    setError('');
    setShowAccounts(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await apiClient.post('/api/auth/login', { email, password });
      const { user, token } = response.data.data;
      setAuthToken(token, user);
      if (rememberMe) {
        localStorage.setItem('savedEmail', email);
        localStorage.setItem('savedPassword', password);
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('savedEmail');
        localStorage.removeItem('savedPassword');
        localStorage.removeItem('rememberMe');
      }
      router.push('/dashboard');
    } catch (err) {
      if (!err.response) {
        setError('Cannot reach the server. Make sure the backend is running on port 5000.');
      } else if (err.response.status === 429) {
        setError('Account temporarily locked due to too many failed attempts. Try again later.');
      } else if (err.response.status === 401) {
        setError('Incorrect email or password. Please check your credentials and try again.');
      } else {
        setError(err.response?.data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans">

      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-500/10 rounded-full" />
          <div className="absolute bottom-12 -right-12 w-72 h-72 bg-blue-400/5 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-brand-500/5 rounded-full" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-blue-400 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <div>
            <span className="text-white font-bold text-xl tracking-tight">Tekgen AI HRMS</span>
              <span className="block text-slate-400 text-[10px] tracking-widest uppercase font-medium">Internal Operations Platform</span>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Your operations,<br />
            <span className="text-blue-400">one platform.</span>
          </h2>
          <p className="text-slate-400 text-base mb-10 leading-relaxed max-w-sm">
            Tekgen AI HRMS centralises recruitment, HR, payroll, sales, and visa management for the entire organisation.
          </p>
          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-blue-400" />
                </div>
                <span className="text-slate-300 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-slate-600 text-xs">&copy; 2026 Tekgen Sdn. Bhd. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-surface">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-blue-400 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold">T</span>
            </div>
            <span className="text-slate-800 font-bold text-xl">Tekgen AI HRMS</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
            <p className="text-slate-500 text-sm mt-1">Sign in to your workspace</p>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <span className="flex-shrink-0 mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Quick login */}
          <div className="mb-5">
            <button
              type="button"
              onClick={() => setShowAccounts(!showAccounts)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <span className="font-medium">Quick Login</span>
              {showAccounts ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            {showAccounts && (
              <div className="mt-1.5 border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white animate-fade-in">
                {DEMO_ACCOUNTS.map((acct) => (
                  <button
                    key={acct.email}
                    type="button"
                    onClick={() => handleQuickLogin(acct)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-blue-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {acct.label[0]}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-800 block leading-tight">{acct.label}</span>
                        <span className="text-xs text-slate-400">{acct.email}</span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      acct.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {acct.role}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-surface text-xs text-slate-400 font-medium">or enter manually</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="you@tekgen.com"
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <Link href="/auth/forgot-password" className="text-xs text-brand-500 hover:text-brand-600 font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
              />
              <label htmlFor="rememberMe" className="text-sm text-slate-600 cursor-pointer select-none">
                Keep me signed in
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary justify-center py-3 text-base"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-slate-500">
            Need access?{' '}
            <Link href="/auth/signup" className="text-brand-500 hover:text-brand-600 font-semibold">
              Request an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
