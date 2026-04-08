import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
}

interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  phone?: string;
  industry?: string;
  country?: string;
  inviteToken?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, tenantSlug?: string, rememberMe?: boolean) => Promise<void>;
  signup: (data: SignupData) => Promise<{ requiresVerification?: boolean; email?: string }>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string, user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: async (email, password, tenantSlug, rememberMe = false) => {
        const { data } = await api.post('/auth/login', { email, password, tenantSlug });
        const cookieOpts = rememberMe
          ? { expires: 7, secure: true, sameSite: 'strict' as const }
          : { secure: true, sameSite: 'strict' as const }; // session cookie — removed when browser closes
        Cookies.set('access_token', data.accessToken, { ...cookieOpts, expires: 1 / 96 });
        Cookies.set('refresh_token', data.refreshToken, cookieOpts);
        set({ user: data.user, isAuthenticated: true });
      },

      signup: async (data: SignupData) => {
        const { data: res } = await api.post('/auth/signup', data);
        return res; // { requiresVerification: true, email } or tokens
      },

      logout: async () => {
        try {
          const refreshToken = Cookies.get('refresh_token');
          await api.post('/auth/logout', { refreshToken });
        } finally {
          Cookies.remove('access_token');
          Cookies.remove('refresh_token');
          set({ user: null, isAuthenticated: false });
        }
      },

      setUser: (user) => set({ user, isAuthenticated: true }),

      setTokens: (accessToken, refreshToken, user) => {
        Cookies.set('access_token', accessToken, { expires: 1 / 96, secure: true, sameSite: 'strict' });
        Cookies.set('refresh_token', refreshToken, { expires: 7, secure: true, sameSite: 'strict' });
        set({ user, isAuthenticated: true });
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
