import type { WorkspaceMode } from '../types';

interface TopBarProps {
  isAuthenticated: boolean;
  activeMode: WorkspaceMode;
  onSelectMode: (mode: WorkspaceMode) => void;
  onSignIn: () => void;
  onSignOut: () => void;
  userDisplayName?: string | null;
}

export function TopBar({
  isAuthenticated,
  activeMode,
  onSelectMode,
  onSignIn,
  onSignOut,
  userDisplayName,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#090D16]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
        <button
          type="button"
          onClick={() => onSelectMode('patient')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70 rounded"
        >
          <span
            aria-hidden="true"
            className="inline-block h-3.5 w-3.5 rotate-45 rounded-tl-full rounded-tr-full rounded-bl-full bg-red-600"
          />
          <span className="font-display text-lg font-bold tracking-tight text-slate-100">
            BloodBridge
          </span>
        </button>

        {isAuthenticated ? (
          <nav
            aria-label="Primary sections"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400"
          >
            <button
              type="button"
              onClick={() => onSelectMode('patient')}
              className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70 rounded ${
                activeMode === 'patient'
                  ? 'text-slate-100 underline decoration-red-500 decoration-2 underline-offset-8'
                  : 'hover:text-slate-200'
              }`}
            >
              Find Blood
            </button>
            <button
              type="button"
              onClick={() => onSelectMode('donor')}
              className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70 rounded ${
                activeMode === 'donor'
                  ? 'text-slate-100 underline decoration-red-500 decoration-2 underline-offset-8'
                  : 'hover:text-slate-200'
              }`}
            >
              Donor Eligibility
            </button>
            <button
              type="button"
              onClick={() => onSelectMode('guide')}
              className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70 rounded ${
                activeMode === 'guide'
                  ? 'text-slate-100 underline decoration-red-500 decoration-2 underline-offset-8'
                  : 'hover:text-slate-200'
              }`}
            >
              Screening Guide
            </button>
          </nav>
        ) : (
          <div className="hidden md:block" />
        )}

        <div className="flex items-center gap-4 shrink-0">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={onSignOut}
              title={userDisplayName ? `Signed in as ${userDisplayName}` : 'Sign out'}
              className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-200 border border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-slate-600 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
            >
              Sign Out
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              Sign In with Google
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
