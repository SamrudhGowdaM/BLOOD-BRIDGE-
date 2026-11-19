export const BLOOD_GROUPS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
] as const;

export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export type Sex = 'male' | 'female' | 'other';

export type Urgency = 'critical' | 'urgent' | 'scheduled';

export type WorkspaceMode = 'patient' | 'donor' | 'guide';

export interface UserProfile {
  uid: string;
  name: string;
  age: number;
  sex: Sex;
  bloodGroup: BloodGroup;
  phone: string;
  whatsappEnabled: boolean;
  email: string;
  emailEnabled: boolean;
  country: string;
  state: string;
  city: string;
  pinCode: string;
  landmark: string;
  weightKg: number;
  hemoglobinGdl: number;
  neverDonated: boolean;
  lastDonationDate: string;
  feelsHealthy: boolean;
  freeOfInfection: boolean;
  normalTemp: boolean;
  stablePulse: boolean;
  isEligible: boolean;
  isAvailable: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DonorListing {
  ownerId: string;
  name: string;
  bloodGroup: BloodGroup;
  phone: string;
  whatsappEnabled: boolean;
  email: string;
  emailEnabled: boolean;
  country: string;
  state: string;
  city: string;
  pinCode: string;
  landmark: string;
  isEligible: boolean;
  isAvailable: boolean;
  updatedAt?: unknown;
}

export interface BloodRequest {
  id: string;
  requesterId: string;
  patientBloodGroup: BloodGroup;
  allowCompatible: boolean;
  unitsNeeded: number;
  urgency: Urgency;
  hospitalName: string;
  hospitalLandmark: string;
  city: string;
  pinCode: string;
  state: string;
  country: string;
  contactPhone: string;
  ambulancePhone: string;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DonorFormState {
  name: string;
  age: string;
  sex: Sex;
  bloodGroup: BloodGroup;
  phone: string;
  whatsappEnabled: boolean;
  email: string;
  emailEnabled: boolean;
  country: string;
  state: string;
  city: string;
  pinCode: string;
  landmark: string;
  weightKg: string;
  hemoglobinGdl: string;
  neverDonated: boolean;
  lastDonationDate: string;
  feelsHealthy: boolean;
  freeOfInfection: boolean;
  normalTemp: boolean;
  stablePulse: boolean;
  isAvailable: boolean;
}

export interface SearchFormState {
  patientBloodGroup: BloodGroup;
  allowCompatible: boolean;
  unitsNeeded: number;
  urgency: Urgency;
  hospitalName: string;
  hospitalLandmark: string;
  city: string;
  pinCode: string;
  state: string;
  country: string;
  contactPhone: string;
  ambulancePhone: string;
  notes: string;
}

export interface EligibilityCheckItem {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface EligibilityEvaluation {
  isEligible: boolean;
  normalizedHbGdl: number | null;
  checks: EligibilityCheckItem[];
  failedReasons: string[];
  cooldownMonthsRequired: 3 | 4;
  daysRemaining: number;
  nextEligibleDate: string | null;
}

export type ProximityTier =
  | 'Same PIN Code'
  | 'Same City & Landmark'
  | 'Same City'
  | 'Same State'
  | 'Same Country'
  | 'Other Region';

export interface RankedDonorMatch {
  donor: DonorListing;
  matchType: 'Exact Match' | 'Compatible Donor';
  proximityTier: ProximityTier;
  proximityRank: number;
}
