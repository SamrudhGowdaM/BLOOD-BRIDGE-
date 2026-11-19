import { AlertCircle, CalendarCheck, CheckCircle2, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  evaluateDonorEligibility,
  getTodayIsoDate,
} from '../lib/bloodEngine';
import {
  logDonationToday,
  saveDonorProfile,
} from '../lib/firestoreService';
import {
  BLOOD_GROUPS,
  type BloodGroup,
  type DonorFormState,
  type Sex,
  type UserProfile,
} from '../types';

interface DonorProfileViewProps {
  uid: string;
  defaultName: string;
  defaultEmail: string;
  profile: UserProfile | null;
  onSwitchToSearch: () => void;
}

function buildInitialForm(
  profile: UserProfile | null,
  defaultName: string,
  defaultEmail: string
): DonorFormState {
  if (profile) {
    return {
      name: profile.name,
      age: String(profile.age),
      sex: profile.sex,
      bloodGroup: profile.bloodGroup,
      phone: profile.phone,
      whatsappEnabled: profile.whatsappEnabled,
      email: profile.email || defaultEmail,
      emailEnabled: profile.emailEnabled ?? true,
      country: profile.country,
      state: profile.state,
      city: profile.city,
      pinCode: profile.pinCode,
      landmark: profile.landmark,
      weightKg: String(profile.weightKg),
      hemoglobinGdl: String(profile.hemoglobinGdl),
      neverDonated: profile.neverDonated,
      lastDonationDate: profile.lastDonationDate,
      feelsHealthy: profile.feelsHealthy,
      freeOfInfection: profile.freeOfInfection,
      normalTemp: profile.normalTemp,
      stablePulse: profile.stablePulse,
      isAvailable: profile.isAvailable,
    };
  }

  return {
    name: defaultName || '',
    age: '',
    sex: 'male',
    bloodGroup: 'O+',
    phone: '',
    whatsappEnabled: true,
    email: defaultEmail || '',
    emailEnabled: true,
    country: 'India',
    state: '',
    city: '',
    pinCode: '',
    landmark: '',
    weightKg: '',
    hemoglobinGdl: '',
    neverDonated: true,
    lastDonationDate: '',
    feelsHealthy: false,
    freeOfInfection: false,
    normalTemp: false,
    stablePulse: false,
    isAvailable: true,
  };
}

export function DonorProfileView({
  uid,
  defaultName,
  defaultEmail,
  profile,
  onSwitchToSearch,
}: DonorProfileViewProps) {
  const [form, setForm] = useState<DonorFormState>(() =>
    buildInitialForm(profile, defaultName, defaultEmail)
  );
  const [saving, setSaving] = useState(false);
  const [loggingDonation, setLoggingDonation] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setForm(buildInitialForm(profile, defaultName, defaultEmail));
    }
  }, [profile, defaultName, defaultEmail]);

  const evaluation = useMemo(() => evaluateDonorEligibility(form), [form]);

  function updateField<K extends keyof DonorFormState>(
    key: K,
    value: DonorFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setValidationError(null);
    setFeedback(null);
  }

  function validateFormInputs(): string | null {
    if (form.name.trim().length < 2) return 'Full name must be at least 2 characters.';
    const ageNum = Number(form.age);
    if (!Number.isInteger(ageNum) || ageNum < 13 || ageNum > 120) {
      return 'Please enter a valid whole-number age.';
    }
    if (form.phone.trim().length < 7) {
      return 'Please enter a valid phone number (at least 7 digits).';
    }
    if (form.country.trim().length < 2) return 'Country is required.';
    if (form.state.trim().length < 2) return 'State / Province is required.';
    if (form.city.trim().length < 2) return 'City is required.';
    if (form.pinCode.trim().length < 3) return 'PIN / Postal code must be at least 3 characters.';
    if (form.landmark.trim().length < 2) return 'Nearby landmark or street area is required.';

    const weightNum = Number(form.weightKg);
    if (!Number.isFinite(weightNum) || weightNum < 20 || weightNum > 300) {
      return 'Please enter a valid body weight in kilograms.';
    }
    const rawHb = Number(form.hemoglobinGdl);
    if (!Number.isFinite(rawHb) || rawHb < 3 || rawHb > 250) {
      return 'Please enter a valid hemoglobin reading (e.g., 13.5 g/dL or 135 g/L).';
    }
    if (!form.neverDonated && !form.lastDonationDate) {
      return 'Select your last blood donation date or check "I have never donated blood before".';
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const err = validateFormInputs();
    if (err) {
      setValidationError(err);
      return;
    }

    setSaving(true);
    setFeedback(null);
    setValidationError(null);
    try {
      await saveDonorProfile(uid, form, Boolean(profile));
      setFeedback({
        type: 'success',
        message: evaluation.isEligible
          ? 'Donor profile saved. You are verified eligible and synced to emergency searches.'
          : 'Profile saved. Based on your screening responses, you are currently marked ineligible and hidden from searches.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error instanceof Error
            ? 'Unable to save donor profile. Please verify your entries and connection.'
            : 'Unable to save donor profile.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleLogDonationToday() {
    if (!profile) return;
    setLoggingDonation(true);
    setFeedback(null);
    try {
      await logDonationToday(uid);
      setFeedback({
        type: 'success',
        message: `Donation logged for ${getTodayIsoDate()}. Cooldown started (${evaluation.cooldownMonthsRequired} months) and your directory listing is automatically paused.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'Could not log donation date right now. Please try again.',
      });
    } finally {
      setLoggingDonation(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-50">
            {profile ? 'Update Donor Profile & Eligibility' : 'Donor Registration & Eligibility Screening'}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Complete your location, vitals, and day-of-donation checklist. You can update your status anytime.
          </p>
        </div>

        <button
          type="button"
          onClick={onSwitchToSearch}
          className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-200 border border-slate-700 bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          Switch to Patient Search
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12 xl:items-start">
        <form onSubmit={handleSubmit} className="xl:col-span-8 space-y-6">
          {/* Identity & Contact */}
          <section className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3">
              <h2 className="font-display text-base font-semibold text-slate-100">
                01. Identity, Blood Group &amp; Contact
              </h2>
              <span className="text-xs text-slate-400">Age 18–65 required</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="donor-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  id="donor-name"
                  type="text"
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full min-h-[42px] rounded-lg border border-slate-700 bg-[#090D16] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
                />
              </div>

              <div>
                <label htmlFor="donor-age" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Age (Years)
                </label>
                <input
                  id="donor-age"
                  type="number"
                  required
                  min={13}
                  max={120}
                  value={form.age}
                  onChange={(e) => updateField('age', e.target.value)}
                  placeholder="e.g. 24"
                  className="w-full min-h-[42px] rounded-lg border border-slate-700 bg-[#090D16] px-3.5 py-2 font-mono text-sm text-slate-100 tabular-nums placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
                />
                {form.age !== '' && (Number(form.age) < 18 || Number(form.age) > 65) && (
                  <p className="mt-1 text-xs text-amber-400">
                    Eligible donor age is strictly between 18 and 65 years.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Sex (Determines Cooldown Interval)
                </label>
                <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-slate-800 bg-[#090D16] p-1">
                  {(['male', 'female', 'other'] as Sex[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateField('sex', option)}
                      className={`min-h-[34px] rounded-md px-2 text-xs font-semibold capitalize transition-colors whitespace-nowrap ${
                        form.sex === option
                          ? 'bg-slate-800 text-white border border-slate-600'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Blood Group
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {BLOOD_GROUPS.map((group: BloodGroup) => (
                    <button
                      key={group}
                      type="button"
                      onClick={() => updateField('bloodGroup', group)}
                      className={`min-h-[42px] rounded-lg border font-mono text-sm font-semibold tabular-nums transition-colors whitespace-nowrap ${
                        form.bloodGroup === group
                          ? 'border-red-500 bg-red-600 text-white'
                          : 'border-slate-700 bg-[#090D16] text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="donor-phone" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Contact Phone Number
                </label>
                <input
                  id="donor-phone"
                  type="tel"
                  required
                  maxLength={24}
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full min-h-[42px] rounded-lg border border-slate-700 bg-[#090D16] px-3.5 py-2 font-mono text-sm text-slate-100 tabular-nums placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
                />
              </div>

              <div className="flex items-end">
                <label className="flex w-full min-h-[42px] cursor-pointer items-center gap-3 rounded-lg border border-slate-700 bg-[#090D16] px-3.5 py-2">
                  <input
                    type="checkbox"
                    checked={form.whatsappEnabled}
                    onChange={(e) => updateField('whatsappEnabled', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-red-600"
                  />
                  <span className="text-xs font-medium text-slate-200">
                    Allow direct WhatsApp emergency alerts
                  </span>
                </label>
              </div>

              <div>
                <label htmlFor="donor-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Contact Email
                </label>
                <input
                  id="donor-email"
                  type="email"
                  maxLength={120}
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="e.g. donor@example.com"
                  className="w-full min-h-[42px] rounded-lg border border-slate-700 bg-[#090D16] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
                />
              </div>

              <div className="flex items-end">
                <label className="flex w-full min-h-[42px] cursor-pointer items-center gap-3 rounded-lg border border-slate-700 bg-[#090D16] px-3.5 py-2">
                  <input
                    type="checkbox"
                    checked={form.emailEnabled}
                    onChange={(e) => updateField('emailEnabled', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-red-600"
                  />
                  <span className="text-xs font-medium text-slate-200">
                    Allow emergency blood request emails
                  </span>
                </label>
              </div>
            </div>
          </section>

          {/* Location */}
          <section className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3">
              <h2 className="font-display text-base font-semibold text-slate-100">
                02. Location Details (For Nearby Hospital Matching)
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="donor-country" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Country
                </label>
                <input
                  id="donor-country"
                  type="text"
                  required
                  maxLength={80}
                  value={form.country}
                  onChange={(e) => updateField('country', e.target.value)}
                  placeholder="e.g. India"
                  className="w-full min-h-[42px] rounded-lg border border-slate-700 bg-[#090D16] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
                />
              </div>

              <div>
                <label htmlFor="donor-state" className="block text-xs font-medium text-slate-300 mb-1.5">
                  State / Province
                </label>
                <input
                  id="donor-state"
                  type="text"
                  required
                  maxLength={80}
                  value={form.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  placeholder="e.g. Karnataka"
                  className="w-full min-h-[42px] rounded-lg border border-slate-700 bg-[#090D16] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
                />
              </div>

              <div>
                <label htmlFor="donor-city" className="block text-xs font-medium text-slate-300 mb-1.5">
                  City / Town
                </label>
                <input
                  id="donor-city"
                  type="text"
                  required
                  maxLength={80}
                  value={form.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="e.g. Bengaluru"
                  className="w-full min-h-[42px] rounded-lg border border-slate-700 bg-[#090D16] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
                />
              </div>

              <div>
                <label htmlFor="donor-pin" className="block text-xs font-medium text-slate-300 mb-1.5">
                  PIN / Postal Code
                </label>
                <input
                  id="donor-pin"
                  type="text"
                  required
                  maxLength={16}
                  value={form.pinCode}
                  onChange={(e) => updateField('pinCode', e.target.value)}
                  placeholder="e.g. 560103"
                  className="w-full min-h-[42px] rounded-lg border border-slate-700 bg-[#090D16] px-3.5 py-2 font-mono text-sm text-slate-100 tabular-nums placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="donor-landmark" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Landmark / Neighborhood Area
                </label>
                <input
                  id="donor-landmark"
                  type="text"
                  required
                  maxLength={140}
                  value={form.landmark}
                  onChange={(e) => updateField('landmark', e.target.value)}
                  placeholder="e.g. Near Bellandur Outer Ring Road"
                  className="w-full min-h-[42px] rounded-lg border border-slate-700 bg-[#090D16] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
                />
              </div>
            </div>
          </section>

          {/* Health Metrics & Donation History */}
          <section className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3">
              <h2 className="font-display text-base font-semibold text-slate-100">
                03. Health Metrics &amp; Donation Interval
              </h2>
              <span className="text-xs text-slate-400">Kept strictly private</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="donor-weight" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Body Weight (kg — must be &gt; 45 kg)
                </label>
                <input
                  id="donor-weight"
                  type="number"
                  step="0.1"
                  required
                  min={20}
                  max={300}
                  value={form.weightKg}
                  onChange={(e) => updateField('weightKg', e.target.value)}
                  placeholder="e.g. 62"
                  className="w-full min-h-[42px] rounded-lg border border-slate-700 bg-[#090D16] px-3.5 py-2 font-mono text-sm text-slate-100 tabular-nums placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
                />
              </div>

              <div>
                <label htmlFor="donor-hb" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Hemoglobin (&gt; 12.5 g/dL or 125 g/L)
                </label>
                <input
                  id="donor-hb"
                  type="number"
                  step="0.1"
                  required
                  min={3}
                  max={250}
                  value={form.hemoglobinGdl}
                  onChange={(e) => updateField('hemoglobinGdl', e.target.value)}
                  placeholder="e.g. 13.8"
                  className="w-full min-h-[42px] rounded-lg border border-slate-700 bg-[#090D16] px-3.5 py-2 font-mono text-sm text-slate-100 tabular-nums placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
                />
                {evaluation.normalizedHbGdl !== null && form.hemoglobinGdl !== '' && (
                  <p className="mt-1 font-mono text-xs text-slate-400 tabular-nums">
                    Interpreted as {evaluation.normalizedHbGdl} g/dL ({Math.round(evaluation.normalizedHbGdl * 10)} g/L)
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="donor-last-date" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Last Blood Donation Date ({evaluation.cooldownMonthsRequired}-month rule)
                </label>
                <input
                  id="donor-last-date"
                  type="date"
                  max={getTodayIsoDate()}
                  disabled={form.neverDonated}
                  value={form.neverDonated ? '' : form.lastDonationDate}
                  onChange={(e) => updateField('lastDonationDate', e.target.value)}
                  className="w-full min-h-[42px] rounded-lg border border-slate-700 bg-[#090D16] px-3.5 py-2 font-mono text-sm text-slate-100 tabular-nums disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
                />
              </div>

              <div className="flex items-end">
                <label className="flex w-full min-h-[42px] cursor-pointer items-center gap-3 rounded-lg border border-slate-700 bg-[#090D16] px-3.5 py-2">
                  <input
                    type="checkbox"
                    checked={form.neverDonated}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setForm((prev) => ({
                        ...prev,
                        neverDonated: checked,
                        lastDonationDate: checked ? '' : prev.lastDonationDate,
                      }));
                    }}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-red-600"
                  />
                  <span className="text-xs font-medium text-slate-200">
                    I have never donated blood before
                  </span>
                </label>
              </div>
            </div>

            {/* Day-of-donation validation checklist */}
            <div className="space-y-3 border-t border-slate-800 pt-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-100">
                  Day-of-Donation Health &amp; Vitals Checklist
                </h3>
                <span className="text-xs text-slate-400">All 4 required</span>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-[#090D16] p-3.5 hover:border-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.feelsHealthy}
                    onChange={(e) => updateField('feelsHealthy', e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-900 accent-emerald-600"
                  />
                  <span className="text-xs leading-relaxed text-slate-200">
                    I feel healthy, rested, and fit to donate today.
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-[#090D16] p-3.5 hover:border-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.freeOfInfection}
                    onChange={(e) => updateField('freeOfInfection', e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-900 accent-emerald-600"
                  />
                  <span className="text-xs leading-relaxed text-slate-200">
                    I am free from cold, flu, cough, fever, or any infection today.
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-[#090D16] p-3.5 hover:border-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.normalTemp}
                    onChange={(e) => updateField('normalTemp', e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-900 accent-emerald-600"
                  />
                  <span className="text-xs leading-relaxed text-slate-200">
                    My body temperature is normal (afebrile).
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-[#090D16] p-3.5 hover:border-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.stablePulse}
                    onChange={(e) => updateField('stablePulse', e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-900 accent-emerald-600"
                  />
                  <span className="text-xs leading-relaxed text-slate-200">
                    My pulse rate is stable and regular (50–100 bpm).
                  </span>
                </label>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-800 bg-[#090D16] px-4 py-3">
                <div>
                  <span className="block text-sm font-medium text-slate-100">
                    Appear in Emergency Donor Searches
                  </span>
                  <span className="block text-xs text-slate-400">
                    Even when enabled, you are only visible to patients if every eligibility check passes.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(e) => updateField('isAvailable', e.target.checked)}
                  className="h-5 w-5 shrink-0 rounded border-slate-600 bg-slate-900 accent-red-600"
                />
              </label>
            </div>
          </section>

          {validationError && (
            <div
              role="alert"
              className="rounded-lg border border-red-800/80 bg-red-950/50 px-4 py-3 text-sm text-red-200"
            >
              {validationError}
            </div>
          )}

          {feedback && (
            <div
              role="status"
              className={`rounded-lg border px-4 py-3 text-sm ${
                feedback.type === 'success'
                  ? 'border-emerald-800/80 bg-emerald-950/50 text-emerald-200'
                  : 'border-red-800/80 bg-red-950/50 text-red-200'
              }`}
            >
              {feedback.message}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] px-6 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
            >
              {saving
                ? 'Saving Profile...'
                : profile
                  ? 'Save & Update Profile'
                  : 'Complete Donor Registration'}
            </button>

            {profile && (
              <button
                type="button"
                disabled={loggingDonation}
                onClick={() => void handleLogDonationToday()}
                className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 text-sm font-semibold text-slate-200 border border-slate-700 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
              >
                <CalendarCheck className="h-4 w-4 text-amber-400" aria-hidden="true" />
                <span>{loggingDonation ? 'Logging...' : 'I Donated Today'}</span>
              </button>
            )}
          </div>
        </form>

        {/* Live Eligibility Triage Panel */}
        <aside className="xl:col-span-4 xl:sticky xl:top-20 rounded-xl border border-slate-800 bg-[#0F172A] p-5 sm:p-6 space-y-5">
          <div className="space-y-2 border-b border-slate-800 pb-4">
            <p className="text-xs font-semibold text-slate-400">
              Live Eligibility Validation
            </p>
            <div className="flex items-center gap-2.5">
              {evaluation.isEligible ? (
                <>
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-400" aria-hidden="true" />
                  <span className="font-display text-lg font-bold text-emerald-400">
                    Eligible to Donate
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-6 w-6 shrink-0 text-amber-400" aria-hidden="true" />
                  <span className="font-display text-lg font-bold text-amber-400">
                    Not Currently Eligible
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {evaluation.isEligible
                ? form.isAvailable
                  ? 'Your profile satisfies every clinical criterion and will appear in nearby patient searches once saved.'
                  : 'You pass every clinical check, though directory visibility is currently paused.'
                : 'Resolve the highlighted criteria below before donating. You can still save your profile and update later.'}
            </p>
          </div>

          <ul className="space-y-3">
            {evaluation.checks.map((check) => (
              <li
                key={check.id}
                className="flex items-start gap-3 border-b border-slate-800/70 pb-3 last:border-b-0 last:pb-0"
              >
                {check.passed ? (
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                    aria-hidden="true"
                  />
                ) : (
                  <XCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-red-400"
                    aria-hidden="true"
                  />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-100">
                      {check.label}
                    </span>
                    <span
                      className={`text-[11px] font-mono ${
                        check.passed ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {check.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{check.detail}</p>
                </div>
              </li>
            ))}
          </ul>

          {evaluation.nextEligibleDate && evaluation.daysRemaining > 0 && (
            <div className="rounded-lg border border-amber-800/70 bg-amber-950/30 p-3.5 space-y-1">
              <p className="text-xs font-semibold text-amber-300">
                Donation Cooldown Active
              </p>
              <p className="font-mono text-xs text-amber-200 tabular-nums">
                {evaluation.daysRemaining} days remaining · Eligible on {evaluation.nextEligibleDate}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
