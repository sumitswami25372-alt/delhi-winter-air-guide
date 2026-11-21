import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_PROFILE, parseStoredProfile, profileSchema, type Profile } from "./domain/profile";

/**
 * The household profile is stored only in this browser (localStorage).
 * It is never sent to our servers except as context for an assistant question the user asks.
 */
export const PROFILE_STORAGE_KEY = "wintershield.profile.v1";

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedProfile: Profile = DEFAULT_PROFILE;

function read(): Profile {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedProfile = parseStoredProfile(raw);
  }
  return cachedProfile;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === PROFILE_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function saveProfile(next: Profile) {
  const valid = profileSchema.parse(next);
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(valid));
  } catch {
    // Storage may be unavailable (private mode); keep the in-memory copy.
    cachedRaw = JSON.stringify(valid);
    cachedProfile = valid;
  }
  listeners.forEach((l) => l());
}

export function clearProfile() {
  try {
    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  cachedRaw = undefined;
  cachedProfile = DEFAULT_PROFILE;
  listeners.forEach((l) => l());
}

export function useProfile() {
  const profile = useSyncExternalStore(subscribe, read, () => DEFAULT_PROFILE);
  const update = useCallback(
    (updater: (p: Profile) => Profile) => saveProfile(updater(read())),
    [],
  );
  return { profile, update, save: saveProfile, reset: clearProfile };
}
