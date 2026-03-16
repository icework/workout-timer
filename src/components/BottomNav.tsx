import { Link, useLocation } from 'react-router-dom';

/**
 * Fixed bottom navigation with Workouts and Stats tabs.
 * Highlights the active route.
 */
export function BottomNav() {
  const location = useLocation();

  const isWorkoutsActive =
    location.pathname === '/' || location.pathname.startsWith('/workout');
  const isStatsActive = location.pathname === '/stats';

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-16 flex items-center justify-around safe-area-pb">
      <Link
        to="/"
        className={`flex flex-col items-center justify-center w-20 h-full gap-1 ${
          isWorkoutsActive ? 'text-blue-600' : 'text-gray-500'
        }`}
        aria-current={isWorkoutsActive ? 'page' : undefined}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <span className="text-xs font-medium">Workouts</span>
      </Link>

      <Link
        to="/stats"
        className={`flex flex-col items-center justify-center w-20 h-full gap-1 ${
          isStatsActive ? 'text-blue-600' : 'text-gray-500'
        }`}
        aria-current={isStatsActive ? 'page' : undefined}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <span className="text-xs font-medium">Stats</span>
      </Link>
    </nav>
  );
}
