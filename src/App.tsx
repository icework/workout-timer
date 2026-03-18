import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { BottomNav, ErrorBoundary } from './components';
import { WorkoutLibrary } from './pages/WorkoutLibrary';
import { WorkoutBuilder } from './pages/WorkoutBuilder';
import { WorkoutDetail } from './pages/WorkoutDetail';
import { TimerRunner } from './pages/TimerRunner';
import { CompletionSummary } from './pages/CompletionSummary';
import { Stats } from './pages/Stats';
import { LoginPage } from './pages/Login';
import { useAuthStore } from './stores/authStore';
import { migrateLegacyData, resetMigrationClaim } from './persistence/migration';
import './index.css';

function BootLoadingScreen({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto h-8 w-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        <p className="mt-4 text-sm text-gray-600">{message}</p>
      </div>
    </main>
  );
}

function MigrationBlockedScreen({
  message,
  onReset,
  onLogout,
}: {
  message: string;
  onReset: () => void;
  onLogout: () => void;
}) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Migration needs attention</h1>
        <p className="mt-3 text-sm text-gray-600">{message}</p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onReset}
            className="h-11 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700"
          >
            Clear Migration Claim
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="h-11 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
          >
            Log Out
          </button>
        </div>
      </div>
    </main>
  );
}

function AppContent() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const username = useAuthStore((state) => state.username);
  const logout = useAuthStore((state) => state.logout);
  const [bootState, setBootState] = useState<
    | { status: 'ready' }
    | { status: 'loading'; message: string }
    | { status: 'blocked'; message: string }
  >({ status: 'ready' });

  useEffect(() => {
    if (!isAuthenticated || !username) {
      setBootState({ status: 'ready' });
      return;
    }

    const activeUsername = username;

    let cancelled = false;

    async function bootstrap() {
      setBootState({
        status: 'loading',
        message: 'Checking for legacy workout data...',
      });

      const result = await migrateLegacyData({
        username: activeUsername,
        confirmOwnership: async (claimedUsername) =>
          window.confirm(
            `Import old local workouts into "${claimedUsername}" and then clear local data from this browser?`
          ),
      });

      if (cancelled) {
        return;
      }

      if (result.status === 'conflict' || result.status === 'blocked' || result.status === 'failed') {
        setBootState({ status: 'blocked', message: result.message });
        return;
      }

      setBootState({ status: 'ready' });
    }

    bootstrap().catch((error) => {
      if (cancelled) {
        return;
      }

      setBootState({
        status: 'blocked',
        message: error instanceof Error ? error.message : 'Failed to start the app',
      });
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, username]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (bootState.status === 'loading') {
    return <BootLoadingScreen message={bootState.message} />;
  }

  if (bootState.status === 'blocked') {
    return (
      <MigrationBlockedScreen
        message={bootState.message}
        onReset={() => {
          resetMigrationClaim();
          setBootState({ status: 'ready' });
        }}
        onLogout={logout}
      />
    );
  }

  // Hide bottom nav during workout run and completion screens
  const hideBottomNav =
    location.pathname.endsWith('/run') || location.pathname.endsWith('/complete');

  return (
    <div className="min-h-screen bg-gray-50">
      <main className={hideBottomNav ? '' : 'pb-16'}>
        <Routes>
          <Route path="/" element={<WorkoutLibrary />} />
          <Route path="/workout/new" element={<WorkoutBuilder />} />
          <Route path="/workout/:id" element={<WorkoutDetail />} />
          <Route path="/workout/:id/edit" element={<WorkoutBuilder />} />
          <Route path="/workout/:id/run" element={<TimerRunner />} />
          <Route path="/workout/:id/complete" element={<CompletionSummary />} />
          <Route path="/stats" element={<Stats />} />
        </Routes>
      </main>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
