import {
  Ambulance,
  BookmarkPlus,
  Check,
  Copy,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import {
  buildDonorWhatsAppHref,
  buildMailtoHref,
  buildWhatsAppBroadcastHref,
  COMPATIBLE_DONORS,
  EMERGENCY_AMBULANCE_PRESETS,
  formatEmergencyAlertMessage,
  getDefaultAmbulanceNumber,
  rankMatchedDonors,
  sanitizePhoneForTel,
  sanitizePhoneForWhatsApp,
} from '../lib/bloodEngine';
import { deleteBloodRequest, saveBloodRequest } from '../lib/firestoreService';
import {
  BLOOD_GROUPS,
  type BloodGroup,
  type BloodRequest,
  type DonorListing,
  type SearchFormState,
  type Urgency,
} from '../types';

interface PatientSearchViewProps {
  uid: string;
  donors: DonorListing[];
  donorsLoading: boolean;
  savedRequests: BloodRequest[];
  defaultPhone: string;
  defaultLocation: {
    country: string;
    state: string;
    city: string;
    pinCode: string;
  };
  onSwitchToDonor: () => void;
}

export function PatientSearchView({
  uid,
  donors,
  donorsLoading,
  savedRequests,
  defaultPhone,
  defaultLocation,
  onSwitchToDonor,
}: PatientSearchViewProps) {
  const initialCountry = defaultLocation.country || 'India';
  const [search, setSearch] = useState<SearchFormState>({
    patientBloodGroup: 'O+',
    allowCompatible: true,
    unitsNeeded: 1,
    urgency: 'critical',
    hospitalName: '',
    hospitalLandmark: '',
    city: defaultLocation.city || '',
    pinCode: defaultLocation.pinCode || '',
    state: defaultLocation.state || '',
    country: initialCountry,
    contactPhone: defaultPhone || '',
    ambulancePhone: getDefaultAmbulanceNumber(initialCountry),
    notes: '',
  });

  const [strictNearbyOnly, setStrictNearbyOnly] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);
  const [copiedEmails, setCopiedEmails] = useState(false);
  const [savingRequest, setSavingRequest] = useState(false);
  const [requestFeedback, setRequestFeedback] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const rankedMatches = useMemo(() => {
    const allRanked = rankMatchedDonors(donors, search);
    if (!strictNearbyOnly) return allRanked;
    return allRanked.filter((m) => m.proximityRank <= 3);
  }, [donors, search, strictNearbyOnly]);

  const matchedDonorEmails = useMemo(
    () =>
      rankedMatches
        .filter((m) => m.donor.emailEnabled && m.donor.email.trim().length > 0)
        .map((m) => m.donor.email.trim()),
    [rankedMatches]
  );

  const alertCardText = useMemo(
    () => formatEmergencyAlertMessage(search),
    [search]
  );

  const whatsappBroadcastHref = useMemo(
    () => buildWhatsAppBroadcastHref(search),
    [search]
  );

  const batchEmailHref = useMemo(
    () => buildMailtoHref(matchedDonorEmails, search),
    [matchedDonorEmails, search]
  );

  const activeAmbulanceNumber =
    search.ambulancePhone.trim() || getDefaultAmbulanceNumber(search.country);
  const activeAmbulanceTelHref = `tel:${sanitizePhoneForTel(activeAmbulanceNumber)}`;

  function updateSearch<K extends keyof SearchFormState>(
    key: K,
    value: SearchFormState[K]
  ) {
    setSearch((prev) => ({ ...prev, [key]: value }));
    setRequestFeedback(null);
    setRequestError(null);
  }

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setHasSearched(true);
  }

  async function handleCopyAlertCard() {
    try {
      await navigator.clipboard.writeText(alertCardText);
      setCopiedCard(true);
      setTimeout(() => setCopiedCard(false), 2000);
    } catch {
      setRequestError('Clipboard access was denied. Please copy the message manually.');
    }
  }

  async function handleCopyEmails() {
    if (matchedDonorEmails.length === 0) return;
    try {
      await navigator.clipboard.writeText(matchedDonorEmails.join(', '));
      setCopiedEmails(true);
      setTimeout(() => setCopiedEmails(false), 2000);
    } catch {
      setRequestError('Clipboard access was denied while copying donor emails.');
    }
  }

  async function handleSaveRequest() {
    setRequestError(null);
    setRequestFeedback(null);
    if (search.hospitalName.trim().length < 2) {
      setRequestError('Enter the nearest hospital name before saving this alert.');
      return;
    }
    if (search.hospitalLandmark.trim().length < 2) {
      setRequestError('Enter the hospital landmark or street before saving.');
      return;
    }
    if (
      search.city.trim().length < 2 ||
      search.state.trim().length < 2 ||
      search.country.trim().length < 2
    ) {
      setRequestError('Enter hospital city, state, and country before saving.');
      return;
    }
    if (search.pinCode.trim().length < 3) {
      setRequestError('Enter the hospital PIN / postal code before saving.');
      return;
    }
    if (search.contactPhone.trim().length < 7) {
      setRequestError('Enter a valid coordinator contact phone number before saving.');
      return;
    }

    setSavingRequest(true);
    try {
      await saveBloodRequest(uid, search);
      setRequestFeedback('Hospital blood alert saved to your requests list.');
    } catch {
      setRequestError('Could not save hospital alert. Check your inputs and try again.');
    } finally {
      setSavingRequest(false);
    }
  }

  function loadSavedRequest(req: BloodRequest) {
    setSearch({
      patientBloodGroup: req.patientBloodGroup,
      allowCompatible: req.allowCompatible,
      unitsNeeded: req.unitsNeeded,
      urgency: req.urgency,
      hospitalName: req.hospitalName,
      hospitalLandmark: req.hospitalLandmark,
      city: req.city,
      pinCode: req.pinCode,
      state: req.state,
      country: req.country,
      contactPhone: req.contactPhone,
      ambulancePhone: req.ambulancePhone || getDefaultAmbulanceNumber(req.country),
      notes: req.notes,
    });
    setHasSearched(true);
    setRequestFeedback(`Loaded hospital alert for ${req.hospitalName}.`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-50">
            Find Eligible Blood Donors Near Hospital
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Searches only verified, medically eligible, currently available donors and dispatches
            WhatsApp, email, and ambulance alerts immediately.
          </p>
        </div>

        <button
          type="button"
          onClick={onSwitchToDonor}
          className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-200 border border-slate-700 bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          Switch to Donor Mode
        </button>
      </div>

      {/* Emergency Ambulance Quick-Dial Bar */}
      <section
        aria-label="Emergency ambulance dispatch"
        className="flex flex-col gap-4 rounded-xl border border-red-900/60 bg-[#0F172A] px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex items-start gap-3">
          <Ambulance className="mt-0.5 h-5 w-5 shrink-0 text-red-400" aria-hidden="true" />
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-100">
              Emergency Ambulance Quick-Dial
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Call national emergency medical services or your hospital ambulance desk directly.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {EMERGENCY_AMBULANCE_PRESETS.map((preset) => (
            <a
              key={preset.number}
              href={`tel:${preset.number}`}
              onClick={() => updateSearch('ambulancePhone', preset.number)}
              className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-semibold text-slate-200 border border-slate-700 bg-[#090D16] hover:border-red-500/70 hover:text-white rounded-lg transition-colors whitespace-nowrap"
            >
              <Phone className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
              <span>{preset.label}</span>
              <span className="font-mono text-red-400 tabular-nums">{preset.number}</span>
            </a>
          ))}

          <a
            href={activeAmbulanceTelHref}
            className="inline-flex items-center gap-2 min-h-[38px] px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors whitespace-nowrap"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Call Ambulance</span>
            <span className="font-mono tabular-nums">{activeAmbulanceNumber}</span>
          </a>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12 xl:items-start">
        {/* Search & Hospital Intake Form */}
        <form
          onSubmit={handleSearchSubmit}
          className="xl:col-span-5 rounded-xl border border-slate-800 bg-[#0F172A] p-5 sm:p-6 space-y-5"
        >
          <div className="border-b border-slate-800 pb-3">
            <h2 className="font-display text-base font-semibold text-slate-100">
              Patient Blood &amp; Hospital Location
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Blood Group Needed
              </label>
              <div className="grid grid-cols-4 gap-2">
                {BLOOD_GROUPS.map((group: BloodGroup) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => updateSearch('patientBloodGroup', group)}
                    className={`min-h-[40px] rounded-lg border font-mono text-sm font-semibold tabular-nums transition-colors whitespace-nowrap ${
                      search.patientBloodGroup === group
                        ? 'border-red-500 bg-red-600 text-white'
                        : 'border-slate-700 bg-[#090D16] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {group}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-[#090D16] p-3">
              <input
                type="checkbox"
                checked={search.allowCompatible}
                onChange={(e) => updateSearch('allowCompatible', e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-900 accent-red-600"
              />
              <span className="text-xs leading-relaxed text-slate-300">
                Include clinically compatible donor groups (
                <span className="font-mono text-slate-100">
                  {COMPATIBLE_DONORS[search.patientBloodGroup].join(', ')}
                </span>
                )
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="req-units" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Units Needed
                </label>
                <input
                  id="req-units"
                  type="number"
                  min={1}
                  max={20}
                  value={search.unitsNeeded}
                  onChange={(e) =>
                    updateSearch('unitsNeeded', Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-full min-h-[40px] rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 font-mono text-sm text-slate-100 tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
                />
              </div>

              <div>
                <label htmlFor="req-urgency" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Urgency
                </label>
                <select
                  id="req-urgency"
                  value={search.urgency}
                  onChange={(e) => updateSearch('urgency', e.target.value as Urgency)}
                  className="w-full min-h-[40px] rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
                >
                  <option value="critical">Critical (Immediate)</option>
                  <option value="urgent">Urgent (Today)</option>
                  <option value="scheduled">Scheduled Surgery</option>
                </select>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 space-y-3">
              <p className="text-xs font-semibold text-slate-300">Nearest Hospital Details</p>

              <div>
                <label htmlFor="hosp-name" className="block text-xs font-medium text-slate-400 mb-1">
                  Hospital Name
                </label>
                <input
                  id="hosp-name"
                  type="text"
                  maxLength={140}
                  value={search.hospitalName}
                  onChange={(e) => updateSearch('hospitalName', e.target.value)}
                  placeholder="e.g. Sakra World Hospital"
                  className="w-full min-h-[40px] rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
                />
              </div>

              <div>
                <label htmlFor="hosp-landmark" className="block text-xs font-medium text-slate-400 mb-1">
                  Hospital Landmark / Road
                </label>
                <input
                  id="hosp-landmark"
                  type="text"
                  maxLength={140}
                  value={search.hospitalLandmark}
                  onChange={(e) => updateSearch('hospitalLandmark', e.target.value)}
                  placeholder="e.g. Outer Ring Road, Bellandur"
                  className="w-full min-h-[40px] rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="hosp-city" className="block text-xs font-medium text-slate-400 mb-1">
                    City
                  </label>
                  <input
                    id="hosp-city"
                    type="text"
                    maxLength={80}
                    value={search.city}
                    onChange={(e) => updateSearch('city', e.target.value)}
                    placeholder="e.g. Bengaluru"
                    className="w-full min-h-[40px] rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
                  />
                </div>

                <div>
                  <label htmlFor="hosp-pin" className="block text-xs font-medium text-slate-400 mb-1">
                    PIN Code
                  </label>
                  <input
                    id="hosp-pin"
                    type="text"
                    maxLength={16}
                    value={search.pinCode}
                    onChange={(e) => updateSearch('pinCode', e.target.value)}
                    placeholder="e.g. 560103"
                    className="w-full min-h-[40px] rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 font-mono text-sm text-slate-100 tabular-nums placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
                  />
                </div>

                <div>
                  <label htmlFor="hosp-state" className="block text-xs font-medium text-slate-400 mb-1">
                    State
                  </label>
                  <input
                    id="hosp-state"
                    type="text"
                    maxLength={80}
                    value={search.state}
                    onChange={(e) => updateSearch('state', e.target.value)}
                    placeholder="e.g. Karnataka"
                    className="w-full min-h-[40px] rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
                  />
                </div>

                <div>
                  <label htmlFor="hosp-country" className="block text-xs font-medium text-slate-400 mb-1">
                    Country
                  </label>
                  <input
                    id="hosp-country"
                    type="text"
                    maxLength={80}
                    value={search.country}
                    onChange={(e) => updateSearch('country', e.target.value)}
                    placeholder="e.g. India"
                    className="w-full min-h-[40px] rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="hosp-phone" className="block text-xs font-medium text-slate-400 mb-1">
                    Coordinator Contact Phone
                  </label>
                  <input
                    id="hosp-phone"
                    type="tel"
                    maxLength={24}
                    value={search.contactPhone}
                    onChange={(e) => updateSearch('contactPhone', e.target.value)}
                    placeholder="Phone for donor callbacks"
                    className="w-full min-h-[40px] rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 font-mono text-sm text-slate-100 tabular-nums placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
                  />
                </div>

                <div>
                  <label htmlFor="hosp-ambulance" className="block text-xs font-medium text-slate-400 mb-1">
                    Emergency Ambulance Number
                  </label>
                  <input
                    id="hosp-ambulance"
                    type="tel"
                    maxLength={24}
                    value={search.ambulancePhone}
                    onChange={(e) => updateSearch('ambulancePhone', e.target.value)}
                    placeholder="e.g. 108 or hospital ambulance"
                    className="w-full min-h-[40px] rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 font-mono text-sm text-slate-100 tabular-nums placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="hosp-notes" className="block text-xs font-medium text-slate-400 mb-1">
                  Ward / Blood Bank Instructions (Optional)
                </label>
                <input
                  id="hosp-notes"
                  type="text"
                  maxLength={300}
                  value={search.notes}
                  onChange={(e) => updateSearch('notes', e.target.value)}
                  placeholder="e.g. ICU Bed 4, ask for blood bank desk"
                  className="w-full min-h-[40px] rounded-lg border border-slate-700 bg-[#090D16] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70"
                />
              </div>
            </div>
          </div>

          {requestError && (
            <div
              role="alert"
              className="rounded-lg border border-red-800/80 bg-red-950/50 px-3.5 py-2.5 text-xs text-red-200"
            >
              {requestError}
            </div>
          )}

          {requestFeedback && (
            <div
              role="status"
              className="rounded-lg border border-emerald-800/80 bg-emerald-950/50 px-3.5 py-2.5 text-xs text-emerald-200"
            >
              {requestFeedback}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="submit"
              className="inline-flex flex-1 items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors whitespace-nowrap"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              <span>Search &amp; Prepare Request</span>
            </button>

            <button
              type="button"
              disabled={savingRequest}
              onClick={() => void handleSaveRequest()}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 text-xs font-semibold text-slate-200 border border-slate-700 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
            >
              <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
              <span>{savingRequest ? 'Saving...' : 'Save Alert'}</span>
            </button>
          </div>
        </form>

        {/* Right Column: Instant WhatsApp & Email Dispatch + Ranked Matches */}
        <div className="xl:col-span-7 space-y-6">
          {/* WhatsApp & Email Dispatch Panel */}
          <section className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-100">
                  Dispatch Blood Request (WhatsApp &amp; Email)
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Send your formatted hospital request directly via WhatsApp or email all{' '}
                  <span className="font-mono tabular-nums text-slate-200">
                    {matchedDonorEmails.length}
                  </span>{' '}
                  matched donor{matchedDonorEmails.length === 1 ? '' : 's'} with email alerts enabled.
                </p>
              </div>
              {hasSearched && (
                <span className="text-xs font-medium text-emerald-400 whitespace-nowrap">
                  Ready to dispatch
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href={whatsappBroadcastHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 min-h-[42px] px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg transition-colors whitespace-nowrap"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span>Send Blood Request on WhatsApp</span>
              </a>

              <a
                href={batchEmailHref}
                className="inline-flex items-center gap-2 min-h-[42px] px-4 py-2 text-xs font-semibold text-slate-100 border border-slate-700 bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
              >
                <Mail className="h-4 w-4 text-red-400" aria-hidden="true" />
                <span>
                  {matchedDonorEmails.length > 0
                    ? `Email ${matchedDonorEmails.length} Matched Donor${matchedDonorEmails.length > 1 ? 's' : ''}`
                    : 'Compose Emergency Email'}
                </span>
              </a>

              {matchedDonorEmails.length > 0 && (
                <button
                  type="button"
                  onClick={() => void handleCopyEmails()}
                  className="inline-flex items-center gap-1.5 min-h-[42px] px-3.5 py-2 text-xs font-semibold text-slate-300 border border-slate-700 bg-[#090D16] hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  {copiedEmails ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                      <span>Copied Emails</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Copy Donor Emails</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-[#0F172A] overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-100">
                  Matched Eligible Donors
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  <span className="font-mono tabular-nums text-slate-200">
                    {rankedMatches.length}
                  </span>{' '}
                  {rankedMatches.length === 1 ? 'verified match' : 'verified matches'} for{' '}
                  <span className="font-mono font-semibold text-red-400">
                    {search.patientBloodGroup}
                  </span>
                  {search.city ? ` near ${search.city}` : ''}
                </p>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={strictNearbyOnly}
                  onChange={(e) => setStrictNearbyOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-red-600"
                />
                <span>Same City / PIN only</span>
              </label>
            </div>

            {donorsLoading ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3].map((row) => (
                  <div
                    key={row}
                    className="h-16 w-full rounded-lg bg-slate-800/60 animate-pulse"
                  />
                ))}
              </div>
            ) : rankedMatches.length === 0 ? (
              <div className="p-8 text-center space-y-4">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-400">
                  <MapPin className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="font-display text-base font-semibold text-slate-100">
                    {hasSearched
                      ? 'No matching eligible donors found yet'
                      : 'No verified donors match these filters right now'}
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-400">
                    BloodBridge starts with an empty registry of only verified signups and hides
                    donors in cooldown. Use the WhatsApp or Email dispatch buttons above, or copy
                    the Emergency Alert Card below.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                  {!search.allowCompatible && (
                    <button
                      type="button"
                      onClick={() => updateSearch('allowCompatible', true)}
                      className="min-h-[38px] px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Include Compatible Blood Groups
                    </button>
                  )}
                  {strictNearbyOnly && (
                    <button
                      type="button"
                      onClick={() => setStrictNearbyOnly(false)}
                      className="min-h-[38px] px-4 py-2 text-xs font-semibold text-slate-200 border border-slate-700 bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Show All Regions Ranked
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleCopyAlertCard()}
                    className="min-h-[38px] px-4 py-2 text-xs font-semibold text-slate-200 border border-slate-700 bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Copy Emergency Alert Card
                  </button>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-slate-800">
                {rankedMatches.map(({ donor, matchType, proximityTier }) => {
                  const telHref = `tel:${sanitizePhoneForTel(donor.phone)}`;
                  const waDigits = sanitizePhoneForWhatsApp(donor.phone);
                  const waHref = buildDonorWhatsAppHref(donor.phone, search, donor.name);
                  const emailHref =
                    donor.emailEnabled && donor.email.trim().length > 0
                      ? buildMailtoHref([donor.email], search, donor.name)
                      : null;

                  return (
                    <li
                      key={donor.ownerId}
                      className="flex flex-col gap-4 px-5 py-4 hover:bg-slate-900/50 transition-colors sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-base font-bold text-red-400 tabular-nums">
                            {donor.bloodGroup}
                          </span>
                          <span className="text-sm font-semibold text-slate-100">
                            {donor.name}
                          </span>
                          <span className="text-xs text-slate-400">
                            <span aria-hidden="true">·</span> {matchType}
                          </span>
                          <span className="text-xs font-medium text-emerald-400">
                            <span aria-hidden="true">·</span> {proximityTier}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 truncate">
                          {donor.landmark} · {donor.city}, {donor.state} · PIN{' '}
                          <span className="font-mono tabular-nums text-slate-300">
                            {donor.pinCode}
                          </span>
                        </p>

                        <p className="font-mono text-xs text-slate-300 tabular-nums">
                          {donor.phone}
                          {donor.emailEnabled && donor.email ? ` · ${donor.email}` : ''}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <a
                          href={telHref}
                          className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-semibold text-slate-100 border border-slate-700 bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
                        >
                          <Phone className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                          <span>Call</span>
                        </a>

                        {donor.whatsappEnabled && waDigits.length >= 7 && (
                          <a
                            href={waHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg transition-colors whitespace-nowrap"
                          >
                            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>WhatsApp</span>
                          </a>
                        )}

                        {emailHref && (
                          <a
                            href={emailHref}
                            className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-semibold text-slate-100 border border-slate-700 bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
                          >
                            <Mail className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
                            <span>Email</span>
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Copyable Emergency Alert Card */}
          <section className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-100">
                  Copyable Emergency Alert Card
                </h2>
                <p className="text-xs text-slate-400">
                  Pre-formatted hospital request with blood group, landmark, PIN code, and ambulance number.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleCopyAlertCard()}
                className="inline-flex items-center gap-2 min-h-[38px] px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                {copiedCard ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Copy Alert Card</span>
                  </>
                )}
              </button>
            </div>

            <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-[#090D16] p-4 font-mono text-xs leading-relaxed text-slate-200">
              {alertCardText}
            </pre>
          </section>

          {/* Saved Hospital Alerts */}
          {savedRequests.length > 0 && (
            <section className="rounded-xl border border-slate-800 bg-[#0F172A] overflow-hidden">
              <div className="border-b border-slate-800 px-5 py-3.5">
                <h2 className="font-display text-sm font-semibold text-slate-100">
                  Saved Hospital Requests
                </h2>
              </div>
              <ul className="divide-y divide-slate-800">
                {savedRequests.map((req) => (
                  <li
                    key={req.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-900/40 transition-colors"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-medium text-slate-100 truncate">
                        <span className="font-mono font-bold text-red-400 mr-2">
                          {req.patientBloodGroup}
                        </span>
                        {req.hospitalName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {req.hospitalLandmark} · {req.city} · PIN{' '}
                        <span className="font-mono tabular-nums">{req.pinCode}</span> ·{' '}
                        <span className="capitalize">{req.urgency}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => loadSavedRequest(req)}
                        className="min-h-[34px] px-3 py-1 text-xs font-semibold text-slate-200 border border-slate-700 bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap"
                      >
                        Load Search
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete alert for ${req.hospitalName}`}
                        onClick={() => void deleteBloodRequest(req.id)}
                        className="inline-flex items-center justify-center min-h-[34px] min-w-[34px] text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-900 rounded-md transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
