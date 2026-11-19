import { useEffect, useState } from 'react';
import { AuthGate } from './components/AuthGate';
import { DonorProfileView } from './components/DonorProfileView';
import { PatientSearchView } from './components/PatientSearchView';
import { ScreeningGuideView } from './components/ScreeningGuideView';
import { TopBar } from './components/TopBar';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  subscribeEligibleDonors,
  subscribeUserProfile,
  subscribeUserRequests,
  toggleDonorAvailability,
} from './lib/firestoreService';
import type {
  BloodRequest,
  DonorListing,
  UserProfile,
  WorkspaceMode,
} from './types';

function BloodBridgeWorkspace() {
  const {
    user,
    authLoading,
    authError,
    signInWithGoogle,
    signOutUser,
    clearAuthError,
  } = useAuth();

  const [activeMode, setActiveMode] = useState<WorkspaceMode>('patient');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [donors, setDonors] = useState<DonorListing[]>([]);
  const [donorsLoading, setDonorsLoading] = useState(true);
  const [savedRequests, setSavedRequests] = useState<BloodRequest[]>([]);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) {
      setProfile(null);
      setDonors([]);
      setSavedRequests([]);
      setProfileLoading(false);
      setDonorsLoading(false);
      return;
    }

    setProfileLoading(true);
    setDonorsLoading(true);
    setDataError(null);

    const unsubProfile = subscribeUserProfile(
      user.uid,
      (nextProfile) => {
        setProfile(nextProfile);
        setProfileLoading(false);
      },
      () => {
        setProfileLoading(false);
        setDataError('Unable to load your donor profile from Firestore.');
      }
    );

    const unsubDonors = subscribeEligibleDonors(
      (nextDonors) => {
        setDonors(nextDonors);
        setDonorsLoading(false);
      },
      () => {
        setDonorsLoading(false);
        setDataError('Unable to sync eligible donor listings.');
      }
    );

    const unsubRequests = subscribeUserRequests(
      user.uid,
      (nextRequests) => {
        setSavedRequests(nextRequests);
      },
      () => {
        setDataError('Unable to load saved hospital alerts.');
      }
    );

    return () => {
      unsubProfile();
      unsubDonors();
      unsubRequests();
    };
  }, [authLoading, user]);

  async function handleToggleAvailability(nextAvailable: boolean) {
    if (!user || !profile) return;
    setAvailabilitySaving(true);
    try {
      await toggleDonorAvailability(user.uid, nextAvailable);
    } catch {
      setDataError('Could not update availability status right now.');
    } finally {
      setAvailabilitySaving(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#090D16] text-slate-100">
      <TopBar
        isAuthenticated={Boolean(user)}
        activeMode={activeMode}
        onSelectMode={setActiveMode}
        onSignIn={() => void signInWithGoogle()}
        onSignOut={() => void signOutUser()}
        userDisplayName={user?.displayName}
      />

      {authLoading ? (
        <div className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-12 sm:px-6">
          <div className="space-y-4">
            <div className="h-8 w-64 rounded bg-slate-800/70 animate-pulse" />
            <div className="h-48 w-full rounded-xl bg-slate-900 border border-slate-800 animate-pulse" />
          </div>
        </div>
      ) : !user ? (
        <div className="flex-1">
          <AuthGate
            onSignIn={() => void signInWithGoogle()}
            authError={authError}
            onDismissError={clearAuthError}
          />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:py-8">
          {dataError && (
            <div
              role="alert"
              className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-red-800/80 bg-red-950/50 px-4 py-3 text-sm text-red-200"
            >
              <span>{dataError}</span>
              <button
                type="button"
                onClick={() => setDataError(null)}
                className="text-xs font-semibold text-red-300 hover:text-white whitespace-nowrap shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            <WorkspaceSidebar
              activeMode={activeMode}
              onSelectMode={setActiveMode}
              userName={user.displayName}
              userEmail={user.email}
              profile={profile}
              profileLoading={profileLoading}
              savedRequests={savedRequests}
              onToggleAvailability={handleToggleAvailability}
              availabilitySaving={availabilitySaving}
            />

            <main className="min-w-0 flex-1">
              {activeMode === 'patient' && (
                <PatientSearchView
                  uid={user.uid}
                  donors={donors}
                  donorsLoading={donorsLoading}
                  savedRequests={savedRequests}
                  defaultPhone={profile?.phone || ''}
                  defaultLocation={{
                    country: profile?.country || 'India',
                    state: profile?.state || '',
                    city: profile?.city || '',
                    pinCode: profile?.pinCode || '',
                  }}
                  onSwitchToDonor={() => setActiveMode('donor')}
                />
              )}

              {activeMode === 'donor' && (
                <DonorProfileView
                  uid={user.uid}
                  defaultName={user.displayName || ''}
                  defaultEmail={user.email || ''}
                  profile={profile}
                  onSwitchToSearch={() => setActiveMode('patient')}
                />
              )}

              {activeMode === 'guide' && <ScreeningGuideView />}
            </main>
          </div>
        </div>
      )}

      <footer className="border-t border-slate-800/80 bg-[#090D16] py-5">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 text-xs text-slate-500 sm:px-6">
          <span>BloodBridge — Emergency Blood Donor Matching &amp; Eligibility Triage</span>
          <span>Always confirm final cross-matching at the hospital blood bank.</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BloodBridgeWorkspace />
    </AuthProvider>
  );
}
