import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSettings } from './hooks/use-settings';
import { useProfile } from './hooks/use-profile';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import OnboardingPage from './pages/OnboardingPage';
import CapturePage from './pages/CapturePage';
import SourceDetailPage from './pages/SourceDetailPage';

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

function AppRoutes() {
  return (
    <OnboardingGuard>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/capture" element={<CapturePage />} />
        <Route path="/source/:id" element={<SourceDetailPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
      </Routes>
    </OnboardingGuard>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
              <a href="/" className="text-xl font-bold text-gray-900">Speak</a>
              <div className="flex gap-4">
                <a href="/" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</a>
                <a href="/capture" className="text-sm text-gray-600 hover:text-gray-900">Capture</a>
                <a href="/profile" className="text-sm text-gray-600 hover:text-gray-900">Profile</a>
                <a href="/settings" className="text-sm text-gray-600 hover:text-gray-900">Settings</a>
              </div>
            </div>
          </nav>
          <main className="max-w-5xl mx-auto px-4 py-6">
            <AppRoutes />
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
