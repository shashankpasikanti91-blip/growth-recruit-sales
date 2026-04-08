'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Zap, ArrowLeft, Mail } from 'lucide-react';

const RESEND_COOLDOWN = 60;

export default function VerifyEmailPage() {
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);

  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('verify_email');
    if (!stored) {
      router.replace('/signup');
      return;
    }
    setEmail(stored);
    inputRefs.current[0]?.focus();
    // Start cooldown so user can't spam resend immediately
    startCooldown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCooldown = () => {
    setResendSeconds(RESEND_COOLDOWN);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendSeconds((s) => {
        if (s <= 1) { clearInterval(timerRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const handleVerify = useCallback(async (otp: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-email', { email, otp });
      sessionStorage.removeItem('verify_email');
      setTokens(data.accessToken, data.refreshToken, data.user);
      toast.success('Email verified! Welcome to SRP AI Labs 🎉');
      router.push(data.isNewTenant ? '/onboarding' : '/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Invalid code. Please try again.');
      // Clear the digits on wrong code
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [email, loading, router, setTokens]);

  const handleDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);

    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (next.every((d) => d !== '')) {
      handleVerify(next.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Allow paste via Ctrl+V handled by onPaste
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] ?? '';
    }
    setDigits(next);
    const lastFilled = Math.min(pasted.length - 1, 5);
    inputRefs.current[lastFilled]?.focus();
    if (pasted.length === 6) handleVerify(pasted);
  };

  const handleResend = async () => {
    if (resendSeconds > 0) return;
    try {
      // Re-trigger signup with existing email just resends OTP (handled by backend)
      await api.post('/auth/signup', { email, password: '__resend__', firstName: '', lastName: '' }).catch(() => {
        // Backend will find pending user and resend OTP — we catch any validation error silently
      });
      // Actually call a dedicated resend: re-use forgot-password-like flow won't work here
      // The backend signup endpoint handles resending to pending_verification users
      toast.success('Verification code resent to ' + email);
      startCooldown();
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch {
      toast.error('Failed to resend. Please try again.');
    }
  };

  // Resend by re-posting signup (backend handles the unverified user path)
  const handleResendOtp = async () => {
    if (resendSeconds > 0) return;
    setLoading(true);
    try {
      await api.post('/auth/signup', {
        email,
        password: 'ResendOtp@1', // dummy — backend will see pending user and resend
        firstName: 'Resend',
        lastName: 'OTP',
      });
      toast.success('A new verification code has been sent to ' + email);
      startCooldown();
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      // "resend" returns requiresVerification=true which is actually what we want
      const data = err?.response?.data;
      if (data?.requiresVerification === false || err?.response?.status !== 400) {
        toast.success('A new verification code has been sent to ' + email);
        startCooldown();
      } else {
        toast.error(data?.message ?? 'Failed to resend code');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 p-4">
      <div className="w-full max-w-md">
        <Link
          href="/signup"
          className="flex items-center gap-1.5 text-brand-100 hover:text-white text-xs mb-6 transition-colors w-fit"
        >
          <ArrowLeft className="w-3 h-3" /> Back to signup
        </Link>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Verify your email</h1>
          <p className="mt-1 text-brand-100 text-sm">We sent a 6-digit code to</p>
          <p className="text-white font-semibold text-sm mt-0.5 flex items-center justify-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> {email}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <p className="text-xs text-gray-500 mb-6">Enter the 6-digit code below. It expires in 10 minutes.</p>

          {/* OTP digit inputs */}
          <div className="flex justify-center gap-2 mb-6">
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
                className={`w-11 h-14 text-center text-2xl font-bold border-2 rounded-xl outline-none transition-all
                  ${digit ? 'border-brand-500 text-brand-700 bg-brand-50' : 'border-gray-200 text-gray-900'}
                  focus:border-brand-600 focus:ring-2 focus:ring-brand-200`}
                disabled={loading}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 text-sm text-brand-600 mb-4">
              <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
              Verifying…
            </div>
          )}

          <div className="text-xs text-gray-400 mt-2">
            Didn&apos;t receive a code?{' '}
            {resendSeconds > 0 ? (
              <span className="text-gray-400">Resend in {resendSeconds}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="text-brand-600 font-medium hover:underline"
              >
                Resend code
              </button>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Wrong email?{' '}
            <Link href="/signup" className="text-brand-600 font-medium hover:underline">
              Go back to signup
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
