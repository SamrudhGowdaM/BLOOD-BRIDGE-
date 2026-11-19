import { CheckCircle2, MapPin, Search, ShieldCheck } from 'lucide-react';

interface AuthGateProps {
  onSignIn: () => void;
  authError: string | null;
  onDismissError: () => void;
}

export function AuthGate({ onSignIn, authError, onDismissError }: AuthGateProps) {
  return (
    <main className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 lg:py-20">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
        <section className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span>Emergency Blood Triage</span>
            <span aria-hidden="true">·</span>
            <span>Real-Time Eligibility</span>
            <span aria-hidden="true">·</span>
            <span>Hospital Proximity Matching</span>
          </div>

          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-50 sm:text-5xl leading-[1.12]">
            Find the right eligible blood donor nearby before time runs out.
          </h1>

          <p className="max-w-2xl text-base leading-relaxed text-slate-300">
            In a midnight medical emergency, forwarding messages across hundreds of group chats
            reaches people with the wrong blood group, distant cities, or recent donations.
            BloodBridge connects patients near a hospital directly with verified, medically
            eligible donors in one shared workspace.
          </p>

          {authError && (
            <div
              role="alert"
              className="flex items-start justify-between gap-4 rounded-lg border border-red-800/80 bg-red-950/50 px-4 py-3 text-sm text-red-200"
            >
              <span>{authError}</span>
              <button
                type="button"
                onClick={onDismissError}
                className="text-xs font-semibold text-red-300 hover:text-white whitespace-nowrap shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="button"
              onClick={onSignIn}
              className="min-h-[44px] px-6 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              Continue with Google
            </button>
            <span className="text-xs text-slate-400">
              Switch anytime between Patient Search Mode and Donor Eligibility Mode.
            </span>
          </div>
        </section>

        <aside className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#0F172A] p-6 space-y-5">
          <h2 className="font-display text-lg font-semibold text-slate-100">
            How BloodBridge Works
          </h2>

          <div className="space-y-4 border-t border-slate-800 pt-4">
            <div className="flex items-start gap-3.5">
              <Search className="mt-0.5 h-5 w-5 shrink-0 text-red-400" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Patient Mode — Nearest Hospital Search
                </h3>
                <p className="mt-1 text-sm text-slate-400 leading-relaxed">
                  Enter the needed blood group and nearest hospital location (PIN code, landmark,
                  city) to surface eligible donors ranked by proximity, with direct Call, WhatsApp,
                  and a copyable Emergency Alert Card.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 border-t border-slate-800 pt-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Donor Mode — Clinical Eligibility Validation
                </h3>
                <p className="mt-1 text-sm text-slate-400 leading-relaxed">
                  Validates age (18–65), weight (&gt; 45 kg), hemoglobin (&gt; 12.5 g/dL),
                  day-of-donation vitals checklist, and 3-month (male) / 4-month (female) donation
                  cooldowns automatically.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 border-t border-slate-800 pt-4">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Update Later Anytime
                </h3>
                <p className="mt-1 text-sm text-slate-400 leading-relaxed">
                  Log a new donation in one click to start your cooldown timer, pause availability,
                  or update your city and landmark whenever you travel.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 border-t border-slate-800 pt-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Private Vitals Isolation
                </h3>
                <p className="mt-1 text-sm text-slate-400 leading-relaxed">
                  Your weight, hemoglobin, and health screening details stay strictly private to your
                  account; only verified eligible availability is shared with active searches.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
