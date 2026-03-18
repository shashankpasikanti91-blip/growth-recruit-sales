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

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, tenantSlug?: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: async (email, password, tenantSlug) => {
        const { data } = await api.post('/auth/login', { email, password, tenantSlug });
        Cookies.set('access_token', data.accessToken, { expires: 1 / 96, secure: true, sameSite: 'strict' });
        Cookies.set('refresh_token', data.refreshToken, { expires: 7, secure: true, sameSite: 'strict' });
        set({ user: data.user, isAuthenticated: true });
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
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
