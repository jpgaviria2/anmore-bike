#!/usr/bin/env node
/**
 * Test script to verify Nostr DM sending and receiving
 * Run: node scripts/test-nostr-dm.js
 */

import { SimplePool } from 'nostr-tools/pool';
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import * as nip19 from 'nostr-tools/nip19';
import * as nip04 from 'nostr-tools/nip04';
import dotenv from 'dotenv';

dotenv.config();

const RELAYS = [
  'wss://relay.anmore.me',
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net'
];

const RECIPIENT_NPUB = 'npub19djteyezrkn9ppg6gjfsxl59pgxrwh76uju60lxtcvr5svj3cmlsf54ca2';

console.log('🧪 Testing Nostr DM Flow\n');

// Test 1: Generate a test keypair
console.log('✅ Test 1: Generate keypair');
const testSecretKey = generateSecretKey();
const testPublicKey = getPublicKey(testSecretKey);
const testNsec = nip19.nsecEncode(testSecretKey);
const testNpub = nip19.npubEncode(testPublicKey);
console.log('   Sender:', testNpub);

// Test 2: Decode recipient npub
console.log('\n✅ Test 2: Decode recipient npub');
const recipientDecoded = nip19.decode(RECIPIENT_NPUB);
if (recipientDecoded.type !== 'npub') {
  console.error('   ❌ Invalid recipient npub');
  process.exit(1);
}
const recipientPubkey = recipientDecoded.data;
console.log('   Recipient:', RECIPIENT_NPUB);
console.log('   Pubkey:', recipientPubkey);

// Test 3: Encrypt a test message
console.log('\n✅ Test 3: Encrypt test message');
const testMessage = JSON.stringify({
  test: true,
  timestamp: new Date().toISOString(),
  message: 'Test DM from Anmore.bike test script'
});

try {
  const encryptedContent = await nip04.encrypt(testSecretKey, recipientPubkey, testMessage);
  console.log('   Message encrypted successfully');
  console.log('   Length:', encryptedContent.length, 'chars');
} catch (error) {
  console.error('   ❌ Encryption failed:', error.message);
  process.exit(1);
}

// Test 4: Create and sign event
console.log('\n✅ Test 4: Create signed event');
const encryptedContent = await nip04.encrypt(testSecretKey, recipientPubkey, testMessage);
const eventTemplate = {
  kind: 4, // DM
  created_at: Math.floor(Date.now() / 1000),
  tags: [['p', recipientPubkey]],
  content: encryptedContent
};

const signedEvent = finalizeEvent(eventTemplate, testSecretKey);
console.log('   Event ID:', signedEvent.id);
console.log('   Event Kind:', signedEvent.kind);
console.log('   Tags:', signedEvent.tags);

// Test 5: Publish to relays
console.log('\n✅ Test 5: Publish to relays');
const pool = new SimplePool();

let publishedCount = 0;
for (const relay of RELAYS) {
  try {
    console.log(`   Publishing to ${relay}...`);
    const pubs = pool.publish([relay], signedEvent);
    await Promise.race([
      pubs,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]);
    console.log(`   ✓ Published to ${relay}`);
    publishedCount++;
  } catch (error) {
    console.log(`   ✗ Failed: ${relay} - ${error.message}`);
  }
}

console.log(`\n   Published to ${publishedCount}/${RELAYS.length} relays`);

// Test 6: Try to receive it back (if we have the recipient key)
if (process.env.NOSTR_NSEC) {
  console.log('\n✅ Test 6: Listen for the DM on relays');
  const decoded = nip19.decode(process.env.NOSTR_NSEC);
  const recipientSecretKey = decoded.data;
  const recipientPubkeyFromNsec = getPublicKey(recipientSecretKey);
  
  console.log('   Listening as:', nip19.npubEncode(recipientPubkeyFromNsec));
  
  const sub = pool.subscribeMany(
    RELAYS,
    [{
      kinds: [4],
      '#p': [recipientPubkeyFromNsec],
      since: Math.floor(Date.now() / 1000) - 60
    }],
    {
      onevent(event) {
        console.log('\n   📨 Received event:', event.id);
        console.log('   From:', nip19.npubEncode(event.pubkey));
        
        // Try to decrypt
        nip04.decrypt(recipientSecretKey, event.pubkey, event.content)
          .then(decrypted => {
            console.log('   Decrypted:', decrypted);
            if (event.id === signedEvent.id) {
              console.log('\n✅ SUCCESS! Test DM sent and received successfully!');
              cleanup();
            }
          })
          .catch(err => {
            console.error('   Decryption failed:', err.message);
          });
      },
      oneose() {
        console.log('\n   End of stored events');
      }
    }
  );
  
  setTimeout(() => {
    console.log('\n   Timeout - no DM received in 10 seconds');
    cleanup();
  }, 10000);
} else {
  console.log('\n⚠️  Test 6: Skipped (NOSTR_NSEC not in .env)');
  console.log('   To test receiving, add NOSTR_NSEC to .env file');
  cleanup();
}

function cleanup() {
  pool.close(RELAYS);
  process.exit(0);
}
