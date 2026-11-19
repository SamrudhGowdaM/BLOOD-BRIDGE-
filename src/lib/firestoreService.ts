import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  BloodRequest,
  DonorFormState,
  DonorListing,
  SearchFormState,
  UserProfile,
} from '../types';
import {
  evaluateDonorEligibility,
  getTodayIsoDate,
  normalizeHemoglobinGdl,
} from './bloodEngine';
import { db, handleFirestoreError, OperationType } from './firebase';

function trimTo(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(snap.data() as UserProfile);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeEligibleDonors(
  onData: (donors: DonorListing[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'donors';
  const q = query(
    collection(db, 'donors'),
    where('isEligible', '==', true),
    where('isAvailable', '==', true)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as DonorListing);
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeUserRequests(
  uid: string,
  onData: (requests: BloodRequest[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'requests';
  const q = query(collection(db, 'requests'), where('requesterId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        ...(d.data() as Omit<BloodRequest, 'id'>),
        id: d.id,
      }));
      items.sort((a, b) => {
        const tA =
          typeof a.createdAt === 'object' && a.createdAt !== null && 'toMillis' in a.createdAt
            ? (a.createdAt as { toMillis: () => number }).toMillis()
            : 0;
        const tB =
          typeof b.createdAt === 'object' && b.createdAt !== null && 'toMillis' in b.createdAt
            ? (b.createdAt as { toMillis: () => number }).toMillis()
            : 0;
        return tB - tA;
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function saveDonorProfile(
  uid: string,
  form: DonorFormState,
  hasExistingProfile: boolean
): Promise<void> {
  const evaluation = evaluateDonorEligibility(form);
  const ageInt = Math.round(Number(form.age));
  const weightNum = Number(Number(form.weightKg).toFixed(1));
  const hbGdl = normalizeHemoglobinGdl(Number(form.hemoglobinGdl));

  const cleanEmail = trimTo(form.email, 120);
  const emailOptIn = Boolean(form.emailEnabled) && cleanEmail.length > 0;

  const commonLocationAndContact = {
    name: trimTo(form.name, 100),
    bloodGroup: form.bloodGroup,
    phone: trimTo(form.phone, 24),
    whatsappEnabled: Boolean(form.whatsappEnabled),
    email: emailOptIn ? cleanEmail : '',
    emailEnabled: emailOptIn,
    country: trimTo(form.country, 80),
    state: trimTo(form.state, 80),
    city: trimTo(form.city, 80),
    pinCode: trimTo(form.pinCode, 16),
    landmark: trimTo(form.landmark, 140),
    isEligible: evaluation.isEligible,
    isAvailable: Boolean(form.isAvailable),
    updatedAt: serverTimestamp(),
  };

  const userRef = doc(db, 'users', uid);
  const donorRef = doc(db, 'donors', uid);

  let existingDonorDoc = false;
  try {
    const donorSnap = await getDoc(donorRef);
    existingDonorDoc = donorSnap.exists();
  } catch {
    existingDonorDoc = false;
  }

  const batch = writeBatch(db);

  const userUpdatePayload = {
    ...commonLocationAndContact,
    email: cleanEmail,
    emailEnabled: emailOptIn,
    age: ageInt,
    sex: form.sex,
    weightKg: weightNum,
    hemoglobinGdl: hbGdl,
    neverDonated: Boolean(form.neverDonated),
    lastDonationDate: form.neverDonated ? '' : trimTo(form.lastDonationDate, 32),
    feelsHealthy: Boolean(form.feelsHealthy),
    freeOfInfection: Boolean(form.freeOfInfection),
    normalTemp: Boolean(form.normalTemp),
    stablePulse: Boolean(form.stablePulse),
  };

  if (hasExistingProfile) {
    batch.update(userRef, userUpdatePayload);
  } else {
    batch.set(userRef, {
      uid,
      ...userUpdatePayload,
      createdAt: serverTimestamp(),
    });
  }

  if (existingDonorDoc) {
    batch.update(donorRef, commonLocationAndContact);
  } else {
    batch.set(donorRef, {
      ownerId: uid,
      ...commonLocationAndContact,
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}

export async function toggleDonorAvailability(
  uid: string,
  nextAvailable: boolean
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const donorRef = doc(db, 'donors', uid);
  const batch = writeBatch(db);
  batch.update(userRef, {
    isAvailable: nextAvailable,
    updatedAt: serverTimestamp(),
  });
  batch.update(donorRef, {
    isAvailable: nextAvailable,
    updatedAt: serverTimestamp(),
  });
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function logDonationToday(uid: string): Promise<void> {
  const today = getTodayIsoDate();
  const userRef = doc(db, 'users', uid);
  const donorRef = doc(db, 'donors', uid);
  const batch = writeBatch(db);
  batch.update(userRef, {
    neverDonated: false,
    lastDonationDate: today,
    isEligible: false,
    updatedAt: serverTimestamp(),
  });
  batch.update(donorRef, {
    isEligible: false,
    updatedAt: serverTimestamp(),
  });
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function saveBloodRequest(
  uid: string,
  search: SearchFormState
): Promise<string> {
  const path = 'requests';
  try {
    const docRef = await addDoc(collection(db, 'requests'), {
      requesterId: uid,
      patientBloodGroup: search.patientBloodGroup,
      allowCompatible: Boolean(search.allowCompatible),
      unitsNeeded: Math.max(1, Math.min(20, Math.round(search.unitsNeeded))),
      urgency: search.urgency,
      hospitalName: trimTo(search.hospitalName, 140),
      hospitalLandmark: trimTo(search.hospitalLandmark, 140),
      city: trimTo(search.city, 80),
      pinCode: trimTo(search.pinCode, 16),
      state: trimTo(search.state, 80),
      country: trimTo(search.country, 80),
      contactPhone: trimTo(search.contactPhone, 24),
      ambulancePhone: trimTo(search.ambulancePhone, 24),
      notes: trimTo(search.notes, 300),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteBloodRequest(requestId: string): Promise<void> {
  const path = `requests/${requestId}`;
  try {
    await deleteDoc(doc(db, 'requests', requestId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
