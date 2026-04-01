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
import QueuePage from './pages/QueuePage';

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
        <Route path="/queue" element={<QueuePage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
      </Routes>
    </OnboardingGuard>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div style={{ minHeight: '100vh', background: '#008080', padding: '8px' }}>
          {/* Desktop window */}
          <div className="win-window" style={{ maxWidth: 900, margin: '0 auto' }}>
            {/* Title bar */}
            <div className="win-titlebar">
              <span style={{ fontSize: 12 }}>🖥️</span>
              <span style={{ flex: 1 }}>Speak — Microsoft Content Assistant 2000</span>
              <span className="win-btn-min">_</span>
              <span className="win-btn-max">□</span>
              <span className="win-btn-close">✕</span>
            </div>

            {/* Menu bar */}
            <div className="win-menubar">
              <span style={{ fontWeight: 'bold', marginRight: 12, fontSize: 13 }}>Speak</span>
              <div className="win-divider" style={{ width: 1, height: 16, margin: '0 4px', borderTop: 'none', borderLeft: '1px solid #808080', borderRight: '1px solid #fff' }} />
              <a href="/" className="win-menubar-item">📋 Dashboard</a>
              <a href="/capture" className="win-menubar-item">➕ Capture</a>
              <a href="/queue" className="win-menubar-item">🕐 Queue</a>
              <a href="/profile" className="win-menubar-item">👤 Profile</a>
              <a href="/settings" className="win-menubar-item">⚙️ Settings</a>
            </div>

            {/* Toolbar separator */}
            <div className="win-divider" style={{ margin: 0 }} />

            {/* Content area */}
            <div style={{ padding: '12px', background: '#d4d0c8', minHeight: '80vh' }}>
              <AppRoutes />
            </div>

            {/* Status bar */}
            <div className="win-statusbar">
              <div className="win-statusbar-panel" style={{ flex: 1 }}>Ready</div>
              <div className="win-statusbar-panel">speak.app</div>
              <div className="win-statusbar-panel">🔒 Secure</div>
            </div>
          </div>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
