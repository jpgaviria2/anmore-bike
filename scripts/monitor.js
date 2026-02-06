import { SimplePool } from 'nostr-tools/pool';
import { getPublicKey } from 'nostr-tools/pure';
import * as nip19 from 'nostr-tools/nip19';
import * as nip04 from 'nostr-tools/nip04';
import { hexToBytes } from '../src/lib/nostr.ts';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const YOUR_NSEC = process.env.NOSTR_NSEC;
const RELAYS = [
  'wss://relay.anmore.me',
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net'
];

// Decode nsec to get secret key
let secretKey;
let publicKey;
let npub;

if (!YOUR_NSEC) {
  console.error('❌ Error: NOSTR_NSEC not found in .env file');
  console.error('Please create a .env file with your nsec key:');
  console.error('NOSTR_NSEC=nsec1your_secret_key_here');
  process.exit(1);
}

try {
  const decoded = nip19.decode(YOUR_NSEC);
  if (decoded.type !== 'nsec') {
    console.error('Invalid nsec key');
    process.exit(1);
  }
  secretKey = decoded.data;
  publicKey = getPublicKey(secretKey);
  npub = nip19.npubEncode(publicKey);
  
  console.log('🔑 Monitoring submissions for:', npub);
  console.log('📡 Connected to relays:', RELAYS.join(', '));
  console.log('\n⏳ Waiting for form submissions...\n');
} catch (error) {
  console.error('Error decoding nsec:', error);
  process.exit(1);
}

// Initialize pool
const pool = new SimplePool();

// Track contributor stats for leaderboard
const contributorStats = new Map();

// Subscribe to DMs
const sub = pool.subscribeMany(
  RELAYS,
  [
    {
      kinds: [4], // DM kind
      '#p': [publicKey], // DMs to our pubkey
      since: Math.floor(Date.now() / 1000) - 86400 // Last 24 hours
    }
  ],
  {
    onevent(event) {
      handleSubmission(event);
    },
    oneose() {
      console.log('✅ Subscription active, listening for new submissions...\n');
    }
  }
);

async function handleSubmission(event) {
  try {
    // Get sender pubkey
    const senderPubkey = event.pubkey;
    const senderNpub = nip19.npubEncode(senderPubkey);
    
    // Decrypt content
    const decrypted = await nip04.decrypt(secretKey, senderPubkey, event.content);
    
    // Try to parse as JSON first (structured data)
    let data;
    try {
      data = JSON.parse(decrypted);
    } catch {
      // If not JSON, it's HTML formatted
      console.log('\n' + '='.repeat(80));
      console.log('📝 NEW SUBMISSION');
      console.log('='.repeat(80));
      console.log('From:', senderNpub);
      console.log('Time:', new Date(event.created_at * 1000).toLocaleString());
      console.log('\n' + decrypted);
      console.log('='.repeat(80) + '\n');
      return;
    }
    
    // Structured data submission
    console.log('\n' + '='.repeat(80));
    console.log('📝 NEW SUBMISSION:', data.formType || 'Unknown Form');
    console.log('='.repeat(80));
    console.log('From:', data.profile?.name || 'bikeuser', `(${senderNpub.slice(0, 16)}...)`);
    console.log('Opt-in:', data.profile?.optIn ? 'YES' : 'NO');
    console.log('Time:', new Date(event.created_at * 1000).toLocaleString());
    
    if (data.email) {
      console.log('Email:', data.email);
    }
    
    console.log('\n--- Form Data ---');
    console.log(JSON.stringify(data.formData, null, 2));
    
    if (data.geoJSON) {
      console.log('\n--- GeoJSON Data ---');
      console.log(JSON.stringify(data.geoJSON, null, 2));
      console.log('\n💡 Tip: Copy GeoJSON above to import into JOSM or iD editor for OSM');
    }
    
    // Update contributor stats
    updateContributorStats(senderNpub, data.profile);
    
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('Error processing submission:', error);
  }
}

function updateContributorStats(npub, profile) {
  if (!contributorStats.has(npub)) {
    contributorStats.set(npub, {
      name: profile?.name || 'bikeuser',
      optIn: profile?.optIn || false,
      count: 0,
      lastSeen: Date.now()
    });
  }
  
  const stats = contributorStats.get(npub);
  stats.count++;
  stats.lastSeen = Date.now();
  
  // Log leaderboard periodically
  if (stats.count % 5 === 0) {
    showLeaderboard();
  }
}

function showLeaderboard() {
  console.log('\n' + '🏆'.repeat(40));
  console.log('CONTRIBUTOR LEADERBOARD (Top 10)');
  console.log('🏆'.repeat(40));
  
  const sorted = Array.from(contributorStats.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);
  
  sorted.forEach(([npub, stats], index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    const name = stats.optIn ? stats.name : 'bikeuser';
    console.log(`${medal} ${name} - ${stats.count} contribution(s)`);
  });
  
  console.log('🏆'.repeat(40) + '\n');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  showLeaderboard();
  sub.close();
  pool.close(RELAYS);
  process.exit(0);
});

// Keep process alive
process.stdin.resume();
