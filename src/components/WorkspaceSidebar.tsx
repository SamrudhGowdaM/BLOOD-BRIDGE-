import { AlertCircle, BookOpen, CheckCircle2, HeartHandshake, Search } from 'lucide-react';
import type { BloodRequest, UserProfile, WorkspaceMode } from '../types';

interface WorkspaceSidebarProps {
  activeMode: WorkspaceMode;
  onSelectMode: (mode: WorkspaceMode) => void;
  userName: string | null;
  userEmail: string | null;
  profile: UserProfile | null;
  profileLoading: boolean;
  savedRequests: BloodRequest[];
  onToggleAvailability: (next: boolean) => Promise<void>;
  availabilitySaving: boolean;
}

export function WorkspaceSidebar({
  activeMode,
  onSelectMode,
  userName,
  userEmail,
  profile,
  profileLoading,
  savedRequests,
  onToggleAvailability,
  availabilitySaving,
}: WorkspaceSidebarProps) {
  return (
    <aside className="w-full lg:w-[272px] shrink-0 space-y-6">
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-400">Workspace Mode</p>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() => onSelectMode('patient')}
            className={`flex items-center gap-2.5 min-h-[42px] px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors text-left whitespace-nowrap ${
              activeMode === 'patient'
                ? 'bg-red-600 text-white'
                : 'bg-slate-900/80 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
            }`}
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Find Blood (Patient)</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectMode('donor')}
            className={`flex items-center gap-2.5 min-h-[42px] px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors text-left whitespace-nowrap ${
              activeMode === 'donor'
                ? 'bg-red-600 text-white'
                : 'bg-slate-900/80 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
            }`}
          >
            <HeartHandshake className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Donor &amp; Eligibility</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectMode('guide')}
            className={`col-span-2 lg:col-span-1 flex items-center gap-2.5 min-h-[40px] px-3.5 py-2 text-sm font-medium rounded-lg transition-colors text-left whitespace-nowrap ${
              activeMode === 'guide'
                ? 'bg-slate-800 text-white border border-slate-600'
                : 'bg-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Screening Guide</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-400">My Donor Status</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-100">
              {profile?.name || userName || 'Signed-In User'}
            </p>
            {userEmail && (
              <p className="truncate text-xs text-slate-400">{userEmail}</p>
            )}
          </div>
          {profile && (
            <span className="font-mono text-base font-bold text-red-400 tabular-nums shrink-0">
              {profile.bloodGroup}
            </span>
          )}
        </div>

        {profileLoading ? (
          <div className="space-y-2 pt-1">
            <div className="h-4 w-3/4 rounded bg-slate-800 animate-pulse" />
            <div className="h-8 w-full rounded bg-slate-800 animate-pulse" />
          </div>
        ) : profile ? (
          <div className="space-y-3 border-t border-slate-800 pt-3">
            <div className="flex items-center gap-2 text-xs font-medium">
              {profile.isEligible ? (
                <>
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-400">Clinically Eligible</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                  <span className="text-amber-400">Temporarily Ineligible</span>
                </>
              )}
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <p className="truncate">
                {profile.city} · <span className="font-mono tabular-nums">{profile.pinCode}</span>
              </p>
              <p className="truncate">{profile.landmark}</p>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-800 pt-3">
              <span className="text-xs text-slate-300">Search Visibility</span>
              <button
                type="button"
                disabled={availabilitySaving}
                onClick={() => void onToggleAvailability(!profile.isAvailable)}
                className={`min-h-[34px] px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  profile.isAvailable
                    ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-700/70 hover:bg-emerald-900/70'
                    : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-slate-600'
                }`}
              >
                {availabilitySaving
                  ? 'Saving...'
                  : profile.isAvailable
                    ? 'Visible'
                    : 'Paused'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => onSelectMode('donor')}
              className="w-full min-h-[38px] px-3 py-1.5 text-xs font-semibold text-slate-200 border border-slate-700 bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
            >
              Update Details / Log Donation
            </button>
          </div>
        ) : (
          <div className="space-y-3 border-t border-slate-800 pt-3">
            <p className="text-xs leading-relaxed text-slate-400">
              You have not registered a donor profile yet. Complete the screening form to appear
              in local hospital searches.
            </p>
            <button
              type="button"
              onClick={() => onSelectMode('donor')}
              className="w-full min-h-[40px] px-3 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              Register as Donor
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400">Saved Hospital Alerts</p>
          <span className="font-mono text-xs text-slate-300 tabular-nums">
            {savedRequests.length}
          </span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Save urgent hospital searches in Patient Mode to reuse or copy your alert card anytime.
        </p>
      </div>
    </aside>
  );
}
