/**
 * Test Script: Publish Approved Bike Train Route
 * 
 * This script publishes a test approved route (kind:30078) to demonstrate
 * the persistent map layers feature. In production, this would be done
 * through the admin dashboard.
 * 
 * Usage: node test-publish-approved-route.js
 */

import { SimplePool } from 'nostr-tools/pool';
import { finalizeEvent } from 'nostr-tools/pure';
import * as nip19 from 'nostr-tools/nip19';
import { hexToBytes } from './src/lib/nostr.ts';

// Configuration
const RELAYS = [
  'wss://relay.anmore.me',
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net'
];

// Admin nsec - REPLACE WITH YOUR ACTUAL ADMIN NSEC FOR TESTING
// For now, using the recipient key from config
const ADMIN_NSEC = 'nsec1YOUR_ADMIN_KEY_HERE';

// Test route data
const testRoute = {
  name: 'Anmore Elementary Safe Route',
  category: 'bike-train',
  description: 'Safe bike train route from Heritage Park to Anmore Elementary School. Features quiet residential streets, bike lanes, and safe crossings.',
  geoJSON: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [-122.8565, 49.3257],  // Start: Heritage Park area
            [-122.8555, 49.3267],
            [-122.8545, 49.3277],
            [-122.8535, 49.3287],  // End: School area
          ]
        },
        properties: {
          name: 'Anmore Elementary Safe Route',
          cycleway: 'lane',
          surface: 'paved',
          lit: 'yes',
          maxspeed: '30',
          crossing: 'marked',
          traffic_calming: 'bump'
        }
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [-122.8565, 49.3257]
        },
        properties: {
          name: 'Meeting Point: Heritage Park',
          amenity: 'bicycle_parking'
        }
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [-122.8535, 49.3287]
        },
        properties: {
          name: 'Drop-off: Anmore Elementary',
          amenity: 'school'
        }
      }
    ]
  }
};

async function publishApprovedRoute() {
  console.log('🚀 Publishing test approved route...\n');
  
  // Decode admin nsec
  if (ADMIN_NSEC === 'nsec1YOUR_ADMIN_KEY_HERE') {
    console.error('❌ ERROR: Please set your admin nsec in the script!');
    console.log('\nTo get your nsec:');
    console.log('1. Go to https://jpgaviria2.github.io/anmore-bike/bike-train/');
    console.log('2. Click "Login with Key"');
    console.log('3. If you don\'t have a key, one will be created');
    console.log('4. Copy your nsec and paste it into this script\n');
    process.exit(1);
  }
  
  let adminKeypair;
  try {
    const decoded = nip19.decode(ADMIN_NSEC);
    const secretKey = decoded.data;
    const { getPublicKey } = await import('nostr-tools/pure');
    const publicKey = getPublicKey(secretKey);
    const npub = nip19.npubEncode(publicKey);
    
    adminKeypair = { secretKey, publicKey, npub };
    console.log(`✅ Admin key loaded`);
    console.log(`   npub: ${npub}\n`);
  } catch (error) {
    console.error('❌ Invalid admin nsec:', error.message);
    process.exit(1);
  }
  
  // Create approval event content
  const content = {
    geoJSON: testRoute.geoJSON,
    description: testRoute.description,
    approvalNote: 'Test route approved for demonstration purposes. This shows how approved routes appear on the map for all users.',
    adminName: 'Test Admin',
    originalSubmission: {
      timestamp: Math.floor(Date.now() / 1000),
      contributor: adminKeypair.npub
    }
  };
  
  // Create event (kind:30078 - NIP-78 parameterized replaceable event)
  const eventTemplate = {
    kind: 30078,
    content: JSON.stringify(content),
    tags: [
      ['d', `${testRoute.category}-test-${Date.now()}`],  // Unique identifier
      ['t', 'anmore-bike'],                                // App tag
      ['category', testRoute.category],                    // Category tag
      ['name', testRoute.name],                            // Route name
      ['contributor', adminKeypair.npub],                  // Contributor
      ['approved_at', Math.floor(Date.now() / 1000).toString()],  // Approval timestamp
      ['status', 'active']                                 // Status
    ],
    created_at: Math.floor(Date.now() / 1000)
  };
  
  console.log('📝 Event details:');
  console.log(`   Kind: ${eventTemplate.kind} (NIP-78 parameterized replaceable)`);
  console.log(`   Category: ${testRoute.category}`);
  console.log(`   Name: ${testRoute.name}`);
  console.log(`   Features: ${testRoute.geoJSON.features.length} (route + markers)\n`);
  
  // Sign event
  const signedEvent = finalizeEvent(eventTemplate, adminKeypair.secretKey);
  console.log(`✅ Event signed`);
  console.log(`   Event ID: ${signedEvent.id}\n`);
  
  // Publish to relays
  console.log('📡 Publishing to relays...');
  const pool = new SimplePool();
  
  const results = await Promise.allSettled(
    RELAYS.map(async (relay) => {
      try {
        console.log(`   → ${relay}...`);
        await pool.publish([relay], signedEvent);
        console.log(`   ✅ ${relay} - success`);
        return { relay, success: true };
      } catch (error) {
        console.log(`   ❌ ${relay} - failed: ${error.message}`);
        return { relay, success: false, error };
      }
    })
  );
  
  pool.close(RELAYS);
  
  const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  
  console.log(`\n📊 Results: ${successCount}/${RELAYS.length} relays published successfully`);
  
  if (successCount > 0) {
    console.log('\n✅ SUCCESS! Test route published.');
    console.log('\n🔍 How to verify:');
    console.log('1. Open https://jpgaviria2.github.io/anmore-bike/bike-train/');
    console.log('2. Wait a few seconds for the route to load from relays');
    console.log('3. Look for a green route line on the map');
    console.log('4. Click the route to see popup with details');
    console.log('5. Check the layer control (top-right) to toggle "Approved Routes"\n');
    console.log('📌 Route name: ' + testRoute.name);
    console.log('📍 Location: Anmore, BC (centered on Heritage Park area)\n');
  } else {
    console.log('\n❌ FAILED: Could not publish to any relays');
    console.log('   This may be a network issue or relay availability problem.\n');
  }
}

// Run
publishApprovedRoute().catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
