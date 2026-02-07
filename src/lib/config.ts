/**
 * Centralized configuration for Anmore.bike
 * 
 * Contains shared constants used across multiple pages:
 * - Map coordinates centered on 2697 Sunnyside Rd, Anmore BC
 * - Nostr relay URLs
 * - Recipient public key
 */

// Map Configuration
// Centered on 2697 Sunnyside Rd, Anmore BC
export const ANMORE_CENTER = {
  lat: 49.3257,
  lng: -122.8565
};

export const DEFAULT_ZOOM = 14;

// Nostr Configuration
export const NOSTR_RELAYS = [
  'wss://relay.anmore.me',
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net'
];

export const RECIPIENT_NPUB = 'npub19djteyezrkn9ppg6gjfsxl59pgxrwh76uju60lxtcvr5svj3cmlsf54ca2';
