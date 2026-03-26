import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from './pages/DashboardPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
              <a href="/" className="text-xl font-bold text-gray-900">Speak</a>
            </div>
          </nav>
          <main className="max-w-5xl mx-auto px-4 py-6">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
