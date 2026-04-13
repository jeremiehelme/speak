import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn(() => null),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('App', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('should render login page when not authenticated', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Sign in')).toBeDefined();
    });
  });

  it('should render the Speak nav title when authenticated', async () => {
    localStorageMock.setItem('sessionId', 'test-session');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Speak')).toBeDefined();
    });
  });

  it('should render navigation links when authenticated', async () => {
    localStorageMock.setItem('sessionId', 'test-session');
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeDefined();
      expect(screen.getByText('Profile')).toBeDefined();
    });
  });
});
