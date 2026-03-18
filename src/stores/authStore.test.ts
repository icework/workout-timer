import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from './authStore';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length() {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ username: 'alice' }),
    })
  );

  useAuthStore.setState({
    username: null,
    isLoading: false,
    error: null,
  });
});

describe('useAuthStore', () => {
  it('stores the normalized username on login', async () => {
    await useAuthStore.getState().login(' Alice ');

    expect(useAuthStore.getState().username).toBe('alice');
  });

  it('clears auth state on logout', () => {
    useAuthStore.setState({ username: 'alice' });

    useAuthStore.getState().logout();

    expect(useAuthStore.getState().username).toBeNull();
  });
});
