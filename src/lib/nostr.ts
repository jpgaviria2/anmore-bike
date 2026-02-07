import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { finalizeEvent, type EventTemplate } from 'nostr-tools/pure';
import * as nip19 from 'nostr-tools/nip19';
import * as nip04 from 'nostr-tools/nip04';
import { SimplePool } from 'nostr-tools/pool';
import { NOSTR_RELAYS, RECIPIENT_NPUB } from './config.ts';

// Relay configuration (imported from centralized config)
export const RELAYS = NOSTR_RELAYS;

// Recipient npub for receiving form submissions (imported from centralized config)
export { RECIPIENT_NPUB };

// Generate new keypair
export function generateKeypair(): { secretKey: Uint8Array; publicKey: string; nsec: string; npub: string } {
  const secretKey = generateSecretKey();
  const publicKey = getPublicKey(secretKey);
  const nsec = nip19.nsecEncode(secretKey);
  const npub = nip19.npubEncode(publicKey);
  
  return { secretKey, publicKey, nsec, npub };
}

// Convert hex string to Uint8Array
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Convert Uint8Array to hex string
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Store keypair in sessionStorage
export function storeKeypair(secretKey: Uint8Array): void {
  const hex = bytesToHex(secretKey);
  sessionStorage.setItem('nostr_secret_key', hex);
}

// Retrieve keypair from sessionStorage
export function getStoredKeypair(): { secretKey: Uint8Array; publicKey: string; nsec: string; npub: string } | null {
  const hex = sessionStorage.getItem('nostr_secret_key');
  if (!hex) return null;
  
  const secretKey = hexToBytes(hex);
  const publicKey = getPublicKey(secretKey);
  const nsec = nip19.nsecEncode(secretKey);
  const npub = nip19.npubEncode(publicKey);
  
  return { secretKey, publicKey, nsec, npub };
}

// Decode nsec to keypair
export function decodeNsec(nsec: string): { secretKey: Uint8Array; publicKey: string; nsec: string; npub: string } | null {
  try {
    const decoded = nip19.decode(nsec);
    if (decoded.type !== 'nsec') return null;
    
    const secretKey = decoded.data as Uint8Array;
    const publicKey = getPublicKey(secretKey);
    const npub = nip19.npubEncode(publicKey);
    
    return { secretKey, publicKey, nsec, npub };
  } catch (error) {
    console.error('Invalid nsec:', error);
    return null;
  }
}

// Decrypt recipient npub to hex pubkey
export function getRecipientPubkey(): string {
  const decoded = nip19.decode(RECIPIENT_NPUB);
  if (decoded.type !== 'npub') throw new Error('Invalid recipient npub');
  return decoded.data as string;
}

// Send encrypted DM via Nostr
export async function sendEncryptedDM(
  secretKey: Uint8Array,
  message: string,
  onProgress?: (status: string) => void
): Promise<boolean> {
  try {
    const recipientPubkey = getRecipientPubkey();
    const senderPubkey = getPublicKey(secretKey);
    
    onProgress?.('Encrypting message...');
    const encryptedContent = await nip04.encrypt(secretKey, recipientPubkey, message);
    
    const eventTemplate: EventTemplate = {
      kind: 4,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['p', recipientPubkey]],
      content: encryptedContent
    };
    
    const signedEvent = finalizeEvent(eventTemplate, secretKey);
    
    onProgress?.('Connecting to relays...');
    const pool = new SimplePool();
    
    const promises = RELAYS.map(async (relay) => {
      try {
        onProgress?.(`Publishing to ${relay}...`);
        await pool.publish([relay], signedEvent);
        return true;
      } catch (error) {
        console.error(`Failed to publish to ${relay}:`, error);
        return false;
      }
    });
    
    const results = await Promise.allSettled(promises);
    pool.close(RELAYS);
    
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    onProgress?.(`Published to ${successCount}/${RELAYS.length} relays`);
    
    return successCount > 0;
  } catch (error) {
    console.error('Error sending DM:', error);
    return false;
  }
}

// Format form data as HTML for easy processing
export function formatFormAsHTML(data: {
  profile: any;
  formType: string;
  formData: any;
  geoJSON?: any;
  email?: string;
}): string {
  const { profile, formType, formData, geoJSON, email } = data;
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${formType} Submission</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 20px auto; padding: 20px; }
    h1 { color: #16a34a; }
    h2 { color: #15803d; margin-top: 30px; }
    .field { margin: 10px 0; }
    .label { font-weight: bold; color: #374151; }
    .value { margin-left: 10px; color: #1f2937; }
    .geo-data { background: #f3f4f6; padding: 10px; border-radius: 5px; overflow-x: auto; }
    pre { background: #1f2937; color: #f3f4f6; padding: 15px; border-radius: 5px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>${formType} Submission</h1>
  <p><em>Submitted: ${new Date().toLocaleString()}</em></p>
  
  <h2>Contributor Profile</h2>
  <div class="field">
    <span class="label">Name:</span>
    <span class="value">${profile.name || 'bikeuser'}</span>
    ${profile.optIn ? ' <em>(opted-in for public display)</em>' : ' <em>(anonymous)</em>'}
  </div>
  <div class="field">
    <span class="label">Nostr Pubkey:</span>
    <span class="value">${profile.npub}</span>
  </div>
  ${profile.bio ? `<div class="field"><span class="label">Bio:</span><span class="value">${profile.bio}</span></div>` : ''}
  ${profile.contact ? `<div class="field"><span class="label">Contact:</span><span class="value">${profile.contact}</span></div>` : ''}
  ${email ? `<div class="field"><span class="label">Email:</span><span class="value">${email}</span></div>` : ''}
  
  <h2>Form Data</h2>
`;

  // Add form fields
  for (const [key, value] of Object.entries(formData)) {
    if (value && key !== 'geoJSON') {
      html += `  <div class="field">
    <span class="label">${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
    <span class="value">${value}</span>
  </div>\n`;
    }
  }
  
  // Add GeoJSON data if present
  if (geoJSON) {
    html += `
  <h2>Map Data (GeoJSON)</h2>
  <div class="geo-data">
    <pre>${JSON.stringify(geoJSON, null, 2)}</pre>
  </div>
`;
  }
  
  html += `
</body>
</html>`;
  
  return html;
}
