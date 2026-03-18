import { create } from 'zustand';
import { normalizeUsername } from '../auth/username';

const AUTH_STORAGE_KEY = 'workout-timer.username';

interface AuthStore {
  username: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (username: string) => Promise<string>;
  logout: () => void;
}

function readStoredUsername(): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  const value = localStorage.getItem(AUTH_STORAGE_KEY);
  return value ? normalizeUsername(value) : null;
}

export const useAuthStore = create<AuthStore>((set) => ({
  username: readStoredUsername(),
  isLoading: false,
  error: null,
  isAuthenticated: readStoredUsername() !== null,

  login: async (input) => {
    const username = normalizeUsername(input);

    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = (await response.json()) as { username: string };
      localStorage.setItem(AUTH_STORAGE_KEY, data.username);
      set({
        username: data.username,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return data.username;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      set({
        isLoading: false,
        error: message,
        username: null,
        isAuthenticated: false,
      });
      throw error;
    }
  },

  logout: () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }

    set({
      username: null,
      isAuthenticated: false,
      error: null,
    });
  },
}));
