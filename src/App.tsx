import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { RealtimeProvider } from './context/RealtimeContext';
import { FixturesPage } from './pages/FixturesPage';
import { MatchDetailPage } from './pages/MatchDetailPage';
import { MatchesPage } from './pages/MatchesPage';
import { OverviewPage } from './pages/OverviewPage';

export function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/fixtures" element={<FixturesPage />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/matches/:id" element={<MatchDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <RealtimeProvider>
        <AppRoutes />
      </RealtimeProvider>
    </BrowserRouter>
  );
}
