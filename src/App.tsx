import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { BottomNav, ErrorBoundary } from './components';
import { WorkoutLibrary } from './pages/WorkoutLibrary';
import { WorkoutBuilder } from './pages/WorkoutBuilder';
import { WorkoutDetail } from './pages/WorkoutDetail';
import { TimerRunner } from './pages/TimerRunner';
import { CompletionSummary } from './pages/CompletionSummary';
import { Stats } from './pages/Stats';
import './index.css';

function AppContent() {
  const location = useLocation();

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
