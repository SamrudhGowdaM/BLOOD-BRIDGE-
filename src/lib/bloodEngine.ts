import type {
  BloodGroup,
  DonorFormState,
  DonorListing,
  EligibilityCheckItem,
  EligibilityEvaluation,
  ProximityTier,
  RankedDonorMatch,
  SearchFormState,
  Sex,
} from '../types';

export const COMPATIBLE_DONORS: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-'],
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
};

export function normalizeHemoglobinGdl(rawValue: number): number {
  if (!Number.isFinite(rawValue)) return NaN;
  // Support g/L entry (e.g., 125-200) transparently alongside canonical g/dL (e.g., 12.5-20.0)
  return rawValue > 30 ? Number((rawValue / 10).toFixed(1)) : Number(rawValue.toFixed(1));
}

export function getRequiredCooldownMonths(sex: Sex): 3 | 4 {
  return sex === 'male' ? 3 : 4;
}

function addCalendarMonths(isoDate: string, months: number): Date {
  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const day = Number(dayStr);
  const target = new Date(year, month + months, day);
  target.setHours(0, 0, 0, 0);
  return target;
}

function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayIsoDate(): string {
  return formatIsoDate(new Date());
}

export function evaluateDonorEligibility(form: DonorFormState): EligibilityEvaluation {
  const ageNum = Number(form.age);
  const weightNum = Number(form.weightKg);
  const rawHb = Number(form.hemoglobinGdl);
  const hbGdl = normalizeHemoglobinGdl(rawHb);
  const cooldownMonthsRequired = getRequiredCooldownMonths(form.sex);

  const ageValid = Number.isInteger(ageNum) && ageNum >= 18 && ageNum <= 65;
  const weightValid = Number.isFinite(weightNum) && weightNum > 45;
  const hbValid = Number.isFinite(hbGdl) && hbGdl > 12.5;

  const checklistValid =
    form.feelsHealthy && form.freeOfInfection && form.normalTemp && form.stablePulse;

  let cooldownValid = false;
  let daysRemaining = 0;
  let nextEligibleDate: string | null = null;
  let cooldownDetail = '';

  if (form.neverDonated) {
    cooldownValid = true;
    cooldownDetail = 'First-time donor — no prior donation cooldown';
  } else if (!form.lastDonationDate) {
    cooldownValid = false;
    cooldownDetail = `Enter your last donation date (${cooldownMonthsRequired}-month interval required)`;
  } else {
    const parsedLast = new Date(`${form.lastDonationDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(parsedLast.getTime())) {
      cooldownValid = false;
      cooldownDetail = 'Invalid donation date';
    } else if (parsedLast.getTime() > today.getTime()) {
      cooldownValid = false;
      cooldownDetail = 'Last donation date cannot be in the future';
    } else {
      const nextDate = addCalendarMonths(form.lastDonationDate, cooldownMonthsRequired);
      const minDays = cooldownMonthsRequired * 30;
      const minDaysDate = new Date(parsedLast.getTime() + minDays * 86400000);
      const requiredDate = nextDate.getTime() >= minDaysDate.getTime() ? nextDate : minDaysDate;

      const diffMs = requiredDate.getTime() - today.getTime();
      if (diffMs <= 0) {
        cooldownValid = true;
        const elapsedDays = Math.floor((today.getTime() - parsedLast.getTime()) / 86400000);
        cooldownDetail = `${elapsedDays} days elapsed (requires ${cooldownMonthsRequired} months)`;
      } else {
        cooldownValid = false;
        daysRemaining = Math.ceil(diffMs / 86400000);
        nextEligibleDate = formatIsoDate(requiredDate);
        cooldownDetail = `${daysRemaining} days left until ${nextEligibleDate} (${cooldownMonthsRequired}-month rule)`;
      }
    }
  }

  const checks: EligibilityCheckItem[] = [
    {
      id: 'age',
      label: 'Age 18–65 years',
      passed: ageValid,
      detail: Number.isFinite(ageNum) && form.age !== ''
        ? `${ageNum} years ${ageValid ? '(within 18–65 range)' : '(must be 18–65)'}`
        : 'Enter age between 18 and 65',
    },
    {
      id: 'weight',
      label: 'Weight above 45 kg',
      passed: weightValid,
      detail: Number.isFinite(weightNum) && form.weightKg !== ''
        ? `${weightNum} kg ${weightValid ? '(meets > 45 kg requirement)' : '(must be > 45 kg)'}`
        : 'Enter weight in kg',
    },
    {
      id: 'hemoglobin',
      label: 'Hemoglobin above 12.5 g/dL (125 g/L)',
      passed: hbValid,
      detail: Number.isFinite(hbGdl) && form.hemoglobinGdl !== ''
        ? `${hbGdl} g/dL (${Math.round(hbGdl * 10)} g/L) ${hbValid ? '— above threshold' : '— must exceed 12.5 g/dL'}`
        : 'Enter hemoglobin level',
    },
    {
      id: 'checklist',
      label: 'Day-of-donation health & vitals checklist',
      passed: checklistValid,
      detail: checklistValid
        ? 'Healthy, infection-free, normal temp, stable pulse confirmed'
        : 'All 4 health & vitals confirmations must be checked',
    },
    {
      id: 'cooldown',
      label: `Donation cooldown (${cooldownMonthsRequired} months for ${form.sex === 'male' ? 'males' : 'females / others'})`,
      passed: cooldownValid,
      detail: cooldownDetail,
    },
  ];

  const failedReasons = checks.filter((c) => !c.passed).map((c) => `${c.label}: ${c.detail}`);

  return {
    isEligible: checks.every((c) => c.passed),
    normalizedHbGdl: Number.isFinite(hbGdl) ? hbGdl : null,
    checks,
    failedReasons,
    cooldownMonthsRequired,
    daysRemaining,
    nextEligibleDate,
  };
}

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function hasLandmarkOverlap(a: string, b: string): boolean {
  const wordsA = norm(a)
    .split(/[\s,.-]+/)
    .filter((w) => w.length >= 3);
  const wordsB = new Set(
    norm(b)
      .split(/[\s,.-]+/)
      .filter((w) => w.length >= 3)
  );
  return wordsA.some((w) => wordsB.has(w));
}

export function rankMatchedDonors(
  donors: DonorListing[],
  search: SearchFormState
): RankedDonorMatch[] {
  const targetGroups = search.allowCompatible
    ? COMPATIBLE_DONORS[search.patientBloodGroup]
    : [search.patientBloodGroup];

  const searchPin = norm(search.pinCode);
  const searchCity = norm(search.city);
  const searchState = norm(search.state);
  const searchCountry = norm(search.country);

  const ranked: RankedDonorMatch[] = donors
    .filter((donor) => donor.isEligible && donor.isAvailable && targetGroups.includes(donor.bloodGroup))
    .map((donor) => {
      const donorPin = norm(donor.pinCode);
      const donorCity = norm(donor.city);
      const donorState = norm(donor.state);
      const donorCountry = norm(donor.country);

      let proximityTier: ProximityTier = 'Other Region';
      let proximityRank = 6;

      if (searchPin && donorPin && searchPin === donorPin) {
        proximityTier = 'Same PIN Code';
        proximityRank = 1;
      } else if (
        searchCity &&
        donorCity &&
        searchCity === donorCity &&
        search.hospitalLandmark &&
        donor.landmark &&
        hasLandmarkOverlap(search.hospitalLandmark, donor.landmark)
      ) {
        proximityTier = 'Same City & Landmark';
        proximityRank = 2;
      } else if (searchCity && donorCity && searchCity === donorCity) {
        proximityTier = 'Same City';
        proximityRank = 3;
      } else if (searchState && donorState && searchState === donorState) {
        proximityTier = 'Same State';
        proximityRank = 4;
      } else if (searchCountry && donorCountry && searchCountry === donorCountry) {
        proximityTier = 'Same Country';
        proximityRank = 5;
      }

      const matchType =
        donor.bloodGroup === search.patientBloodGroup ? 'Exact Match' : 'Compatible Donor';

      return {
        donor,
        matchType,
        proximityTier,
        proximityRank,
      };
    });

  ranked.sort((a, b) => {
    if (a.proximityRank !== b.proximityRank) {
      return a.proximityRank - b.proximityRank;
    }
    if (a.matchType !== b.matchType) {
      return a.matchType === 'Exact Match' ? -1 : 1;
    }
    return a.donor.name.localeCompare(b.donor.name);
  });

  return ranked;
}

export const EMERGENCY_AMBULANCE_PRESETS = [
  { label: 'National Ambulance', number: '108' },
  { label: 'Patient Transport', number: '102' },
  { label: 'Unified Emergency', number: '112' },
] as const;

export function getDefaultAmbulanceNumber(country: string): string {
  const c = country.trim().toLowerCase();
  if (c === 'india' || c === 'in') return '108';
  if (c === 'united states' || c === 'usa' || c === 'us' || c === 'canada') return '911';
  if (c === 'united kingdom' || c === 'uk' || c === 'gb') return '999';
  return '112';
}

export function sanitizePhoneForTel(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

export function sanitizePhoneForWhatsApp(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function formatEmergencyAlertMessage(
  search: SearchFormState,
  recipientName?: string
): string {
  const urgencyLabel =
    search.urgency === 'critical'
      ? 'CRITICAL EMERGENCY'
      : search.urgency === 'urgent'
        ? 'URGENT'
        : 'SCHEDULED';

  const hospitalLine = [
    search.hospitalName.trim(),
    search.hospitalLandmark.trim(),
    search.city.trim(),
    search.pinCode.trim() ? `PIN ${search.pinCode.trim()}` : '',
    search.state.trim(),
    search.country.trim(),
  ]
    .filter(Boolean)
    .join(', ');

  const lines = [
    recipientName ? `Hi ${recipientName},` : 'URGENT BLOOD REQUEST — BloodBridge',
    `[${urgencyLabel}] Blood Needed: ${search.patientBloodGroup} (${search.unitsNeeded} unit${search.unitsNeeded > 1 ? 's' : ''})`,
    search.allowCompatible
      ? `Compatible donor groups accepted: ${COMPATIBLE_DONORS[search.patientBloodGroup].join(', ')}`
      : `Exact blood group requested: ${search.patientBloodGroup}`,
    hospitalLine ? `Hospital: ${hospitalLine}` : 'Hospital: Location details pending',
    search.contactPhone.trim() ? `Coordinator Contact: ${search.contactPhone.trim()}` : '',
    search.ambulancePhone.trim() ? `Emergency Ambulance: ${search.ambulancePhone.trim()}` : '',
    search.notes.trim() ? `Ward / Notes: ${search.notes.trim()}` : '',
  ].filter(Boolean);

  return lines.join('\n');
}

export function buildDonorWhatsAppHref(
  phone: string,
  search: SearchFormState,
  donorName?: string
): string {
  const digits = sanitizePhoneForWhatsApp(phone);
  const text = encodeURIComponent(formatEmergencyAlertMessage(search, donorName));
  return `https://wa.me/${digits}?text=${text}`;
}

export function buildWhatsAppBroadcastHref(search: SearchFormState): string {
  const text = encodeURIComponent(formatEmergencyAlertMessage(search));
  return `https://wa.me/?text=${text}`;
}

export function buildEmergencyEmailSubject(search: SearchFormState): string {
  const urgencyPrefix =
    search.urgency === 'critical'
      ? 'CRITICAL BLOOD REQUEST'
      : search.urgency === 'urgent'
        ? 'URGENT BLOOD REQUEST'
        : 'BLOOD DONATION REQUEST';
  const locationPart = [search.hospitalName.trim(), search.city.trim()]
    .filter(Boolean)
    .join(', ');
  return locationPart
    ? `[${urgencyPrefix}] ${search.patientBloodGroup} needed at ${locationPart}`
    : `[${urgencyPrefix}] ${search.patientBloodGroup} blood needed`;
}

export function buildMailtoHref(
  recipients: string[],
  search: SearchFormState,
  recipientName?: string
): string {
  const cleanRecipients = recipients.map((r) => r.trim()).filter(Boolean);
  const subject = encodeURIComponent(buildEmergencyEmailSubject(search));
  const body = encodeURIComponent(formatEmergencyAlertMessage(search, recipientName));
  if (cleanRecipients.length === 1) {
    return `mailto:${encodeURIComponent(cleanRecipients[0])}?subject=${subject}&body=${body}`;
  }
  if (cleanRecipients.length > 1) {
    const bcc = cleanRecipients.map((r) => encodeURIComponent(r)).join(',');
    return `mailto:?bcc=${bcc}&subject=${subject}&body=${body}`;
  }
  return `mailto:?subject=${subject}&body=${body}`;
}
