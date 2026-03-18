import { useState } from 'react';

interface AccountMenuProps {
  username: string;
  onLogout: () => void;
}

export function AccountMenu({ username, onLogout }: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100"
        aria-label="Account menu"
        aria-expanded={isOpen}
      >
        {username}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-20 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
          <div className="rounded-lg px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Signed in as
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-gray-900">{username}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            className="mt-1 flex h-10 w-full items-center rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50 active:bg-red-100"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
