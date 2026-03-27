import { create } from 'zustand';
import type { Admin } from '@/types';
import { authApi } from '@/lib/api';

interface AuthState {
  token: string | null;
  admin: Admin | null;
  isAuthenticated: boolean;

  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => void;
  getProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  admin: null,
  isAuthenticated: false,

  login: async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    const { token, admin } = res as unknown as { token: string; admin: Admin };

    localStorage.setItem('token', token);
    localStorage.setItem('admin', JSON.stringify(admin));
    set({ token, admin, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors on logout – we clear local state regardless
    }
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    set({ token: null, admin: null, isAuthenticated: false });
  },

  loadFromStorage: () => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('token');
    const adminRaw = localStorage.getItem('admin');

    if (token) {
      let admin: Admin | null = null;
      if (adminRaw) {
        try {
          admin = JSON.parse(adminRaw) as Admin;
        } catch {
          admin = null;
        }
      }
      set({ token, admin, isAuthenticated: true });
    }
  },

  getProfile: async () => {
    try {
      const admin = await authApi.getProfile();
      localStorage.setItem('admin', JSON.stringify(admin));
      set({ admin });
    } catch {
      // If profile fetch fails, clear auth state
      localStorage.removeItem('token');
      localStorage.removeItem('admin');
      set({ token: null, admin: null, isAuthenticated: false });
    }
  },
}));
