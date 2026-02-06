export interface UserProfile {
  name: string;
  optIn: boolean;
  contact?: string;
  bio?: string;
  interests: string[];
  npub: string;
  createdAt: number;
}

const PROFILE_KEY = 'anmore_user_profile';

// Save profile to localStorage
export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

// Get profile from localStorage
export function getProfile(): UserProfile | null {
  const data = localStorage.getItem(PROFILE_KEY);
  if (!data) return null;
  
  try {
    return JSON.parse(data) as UserProfile;
  } catch (error) {
    console.error('Error parsing profile:', error);
    return null;
  }
}

// Update profile
export function updateProfile(updates: Partial<UserProfile>): void {
  const current = getProfile();
  if (!current) return;
  
  const updated = { ...current, ...updates };
  saveProfile(updated);
}

// Clear profile (logout)
export function clearProfile(): void {
  localStorage.removeItem(PROFILE_KEY);
  sessionStorage.removeItem('nostr_secret_key');
}

// Get display name (either actual name or 'bikeuser')
export function getDisplayName(profile: UserProfile | null): string {
  if (!profile) return 'bikeuser';
  return profile.optIn && profile.name ? profile.name : 'bikeuser';
}
