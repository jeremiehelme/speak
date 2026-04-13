import { useState, useEffect, useSyncExternalStore } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSettings } from './hooks/use-settings';
import { useProfile } from './hooks/use-profile';
import { logout } from './lib/api-client';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import OnboardingPage from './pages/OnboardingPage';
import CapturePage from './pages/CapturePage';
import SourceDetailPage from './pages/SourceDetailPage';
import QueuePage from './pages/QueuePage';
import LoginPage from './pages/LoginPage';

const queryClient = new QueryClient();

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const { data: profile, isLoading: profileLoading } = useProfile();

  if (settingsLoading || profileLoading) {
    return <div className="text-gray-500 p-8">Loading...</div>;
  }

  const needsOnboarding = !settings?.hasApiKey && !profile;
  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  if (!needsOnboarding && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AuthenticatedApp({ onLogout }: { onLogout: () => void }) {
  async function handleLogout() {
    await logout();
    onLogout();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-gray-900">
            Speak
          </a>
          <div className="flex gap-4 items-center">
            <a href="/" className="text-sm text-gray-600 hover:text-gray-900">
              Dashboard
            </a>
            <a href="/capture" className="text-sm text-gray-600 hover:text-gray-900">
              Capture
            </a>
            <a href="/queue" className="text-sm text-gray-600 hover:text-gray-900">
              Queue
            </a>
            <a href="/profile" className="text-sm text-gray-600 hover:text-gray-900">
              Profile
            </a>
            <a href="/settings" className="text-sm text-gray-600 hover:text-gray-900">
              Settings
            </a>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-900">
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <OnboardingGuard>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/capture" element={<CapturePage />} />
            <Route path="/source/:id" element={<SourceDetailPage />} />
            <Route path="/queue" element={<QueuePage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </OnboardingGuard>
      </main>
    </div>
  );
}

function getSessionSnapshot() {
  return localStorage.getItem('sessionId') !== null;
}

function subscribeToStorage(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function App() {
  const hasSession = useSyncExternalStore(subscribeToStorage, getSessionSnapshot);
  const [forceAuth, setForceAuth] = useState<boolean | null>(null);

  useEffect(() => {
    const handler = () => {
      setForceAuth(false);
      queryClient.clear();
    };
    window.addEventListener('auth-expired', handler);
    return () => window.removeEventListener('auth-expired', handler);
  }, []);

  const authenticated = forceAuth ?? hasSession;

  if (!authenticated) {
    return (
      <LoginPage
        onLogin={() => {
          setForceAuth(true);
        }}
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthenticatedApp
          onLogout={() => {
            setForceAuth(false);
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
