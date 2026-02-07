#!/usr/bin/env node
/**
 * Send test form submission with complete OSM-ready data
 * Run: node scripts/test-osm-submission.js
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

console.log('🚀 Sending Test OSM Submission\n');

// Generate test user
const testSecretKey = generateSecretKey();
const testPublicKey = getPublicKey(testSecretKey);
const testNpub = nip19.npubEncode(testPublicKey);

// Test profile
const profile = {
  name: 'Test Contributor',
  optIn: true,
  contact: 'test@anmore.bike',
  bio: 'Testing OSM data submission',
  interests: ['trail building', 'pump tracks'],
  npub: testNpub,
  createdAt: Date.now()
};

// Test 1: Bike Train Route with complete OSM data
const bikeTrainGeoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [-122.8565, 49.3257], // 2697 Sunnyside Rd
          [-122.8570, 49.3265], // Northwest along Sunnyside
          [-122.8575, 49.3275], // Continue north
          [-122.8580, 49.3280]  // End point
        ]
      }
    },
    {
      type: 'Feature',
      properties: { marker: 'start' },
      geometry: {
        type: 'Point',
        coordinates: [-122.8565, 49.3257]
      }
    },
    {
      type: 'Feature',
      properties: { marker: 'end' },
      geometry: {
        type: 'Point',
        coordinates: [-122.8580, 49.3280]
      }
    }
  ]
};

const bikeTrainData = {
  routeName: 'Sunnyside Elementary Safe Route',
  startLocation: '2697 Sunnyside Rd, Anmore BC',
  endLocation: 'Anmore Elementary School',
  description: 'Safe bike route for elementary students',
  daysOfWeek: 'Monday, Tuesday, Wednesday, Thursday, Friday',
  time: '8:00 AM',
  ageGroup: '7-12',
  distance: '1.2',
  duration: '15',
  ageSuitability: '7+',
  cyclewayType: 'shared_lane',
  surface: 'paved',
  lit: 'yes',
  maxspeed: '30',
  trafficCalming: 'speed_bumps, school_zone',
  crossings: 'zebra_crossing, traffic_signals',
  hazards: 'Blind corner at Sunnyside/Cedar intersection, steep hill near school',
  email: 'test@anmore.bike',
  osmTags: {
    route: 'bicycle',
    type: 'route',
    network: 'local',
    name: 'Sunnyside Elementary Safe Route',
    cycleway: 'shared_lane',
    surface: 'paved',
    lit: 'yes',
    maxspeed: '30',
    note: 'School bike train route'
  }
};

// Test 2: Trail Building with OSM data
const trailGeoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [-122.8560, 49.3250],
          [-122.8555, 49.3255],
          [-122.8550, 49.3260],
          [-122.8545, 49.3265]
        ]
      }
    }
  ]
};

const trailData = {
  trailName: 'Cedar Creek Trail',
  trailType: 'singletrack',
  difficulty: 'intermediate',
  surface: 'dirt',
  condition: 'good',
  width: '1',
  length: '2.5',
  usage: 'mountain biking, hiking',
  restrictions: 'none',
  seasonalAccess: 'May-October, closed when wet',
  maintenance: 'Maintained by Anmore Trail Association',
  hazards: 'Some loose rocks, steep sections',
  features: 'Creek crossing, scenic viewpoint',
  access: 'yes',
  bicycle: 'yes',
  foot: 'yes',
  email: 'test@anmore.bike',
  osmTags: {
    highway: 'path',
    surface: 'dirt',
    bicycle: 'yes',
    foot: 'yes',
    sac_scale: 'mountain_hiking',
    trail_visibility: 'good',
    mtb_scale: '2',
    name: 'Cedar Creek Trail',
    operator: 'Anmore Trail Association'
  }
};

// Test 3: Pump Track with OSM data
const pumpTrackGeoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-122.8565, 49.3257],
          [-122.8570, 49.3257],
          [-122.8570, 49.3260],
          [-122.8565, 49.3260],
          [-122.8565, 49.3257]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { marker: 'entrance' },
      geometry: {
        type: 'Point',
        coordinates: [-122.8565, 49.3258]
      }
    }
  ]
};

const pumpTrackData = {
  locationName: 'Anmore Community Pump Track',
  surface: 'asphalt',
  skillLevel: 'intermediate',
  features: 'berms, jumps, rollers',
  dimensions: '40x30',
  lighting: 'yes',
  fence: 'yes',
  spectatorArea: 'yes',
  description: 'Community pump track suitable for all ages',
  lit: 'yes',
  loop: 'yes',
  access: 'yes',
  fee: 'no',
  wheelchair: 'limited',
  parking: 'yes',
  openingHours: 'Dawn to dusk',
  operator: 'Village of Anmore',
  maintenanceContact: 'parks@anmore.ca',
  email: 'test@anmore.bike',
  osmTags: {
    leisure: 'track',
    sport: 'bmx',
    surface: 'asphalt',
    lit: 'yes',
    loop: 'yes',
    access: 'yes',
    fee: 'no',
    wheelchair: 'limited',
    operator: 'Village of Anmore',
    opening_hours: 'dawn-dusk',
    name: 'Anmore Community Pump Track'
  }
};

// Format as HTML (matching the app's formatFormAsHTML function)
function formatSubmissionHTML(formType, formData, geoJSON) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${formType} Submission</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 20px auto; padding: 20px; background: #fff; }
    h1 { color: #16a34a; border-bottom: 3px solid #16a34a; padding-bottom: 10px; }
    h2 { color: #15803d; margin-top: 30px; border-bottom: 2px solid #d1d5db; padding-bottom: 5px; }
    .field { margin: 12px 0; padding: 8px; background: #f9fafb; border-left: 3px solid #16a34a; }
    .label { font-weight: bold; color: #374151; display: inline-block; min-width: 200px; }
    .value { color: #1f2937; }
    .geo-data { background: #f3f4f6; padding: 15px; border-radius: 5px; overflow-x: auto; margin-top: 10px; }
    .osm-tags { background: #dbeafe; padding: 15px; border-radius: 5px; border: 2px solid #3b82f6; }
    pre { background: #1f2937; color: #f3f4f6; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 12px; }
    .instructions { background: #fef3c7; padding: 15px; border-radius: 5px; border-left: 4px solid #f59e0b; margin: 20px 0; }
    .instructions h3 { margin-top: 0; color: #92400e; }
  </style>
</head>
<body>
  <h1>🚴 ${formType}</h1>
  <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
  <p><strong>Test Submission:</strong> Generated by test-osm-submission.js</p>
  
  <h2>👤 Contributor Profile</h2>
  <div class="field">
    <span class="label">Name:</span>
    <span class="value">${profile.name}</span>
    ${profile.optIn ? ' <em>(opted-in for public display)</em>' : ' <em>(anonymous)</em>'}
  </div>
  <div class="field">
    <span class="label">Nostr Pubkey:</span>
    <span class="value">${profile.npub}</span>
  </div>
  <div class="field">
    <span class="label">Bio:</span>
    <span class="value">${profile.bio}</span>
  </div>
  <div class="field">
    <span class="label">Contact:</span>
    <span class="value">${profile.contact}</span>
  </div>
  <div class="field">
    <span class="label">Email:</span>
    <span class="value">${formData.email}</span>
  </div>
  
  <h2>📝 Form Data</h2>
  ${Object.entries(formData).filter(([key]) => key !== 'osmTags' && key !== 'email')
    .map(([key, value]) => `  <div class="field">
    <span class="label">${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
    <span class="value">${value}</span>
  </div>`).join('\n')}
  
  <div class="instructions">
    <h3>📋 How to Add to OpenStreetMap</h3>
    <ol>
      <li>Log in to <a href="https://www.openstreetmap.org">OpenStreetMap.org</a></li>
      <li>Click "Edit" and use iD editor or download JOSM</li>
      <li>Use the GeoJSON coordinates below to draw the feature</li>
      <li>Apply the OSM tags listed below</li>
      <li>Add changeset comment: "Adding bike infrastructure in Anmore BC based on community input"</li>
      <li>Save and upload</li>
    </ol>
  </div>
  
  <h2>🗺️ OSM Tags (Copy/Paste Ready)</h2>
  <div class="osm-tags">
    <pre>${JSON.stringify(formData.osmTags, null, 2)}</pre>
  </div>
  
  <h2>📍 Map Data (GeoJSON)</h2>
  <div class="geo-data">
    <p><strong>Coordinates:</strong> Ready for import into JOSM or iD editor</p>
    <pre>${JSON.stringify(geoJSON, null, 2)}</pre>
  </div>
  
  <h2>🔄 Quick Import to JOSM</h2>
  <div class="instructions">
    <p><strong>JOSM Import Steps:</strong></p>
    <ol>
      <li>Copy the GeoJSON above</li>
      <li>Save to file: <code>${formType.toLowerCase().replace(/\s+/g, '-')}.geojson</code></li>
      <li>In JOSM: File → Open → Select the GeoJSON file</li>
      <li>Right-click feature → Add Tags → Paste OSM tags from above</li>
      <li>Upload with changeset comment</li>
    </ol>
  </div>
  
  <hr style="margin: 30px 0;">
  <p style="text-align: center; color: #6b7280; font-size: 12px;">
    Generated by Anmore.bike • Community-driven bike infrastructure mapping
  </p>
</body>
</html>`;
}

// Send all three test submissions
async function sendTestSubmissions() {
  const recipientDecoded = nip19.decode(RECIPIENT_NPUB);
  const recipientPubkey = recipientDecoded.data;
  const pool = new SimplePool();
  
  const submissions = [
    { type: 'Bike Train Route', data: bikeTrainData, geoJSON: bikeTrainGeoJSON },
    { type: 'Trail Building Proposal', data: trailData, geoJSON: trailGeoJSON },
    { type: 'Pump Track Proposal', data: pumpTrackData, geoJSON: pumpTrackGeoJSON }
  ];
  
  for (const submission of submissions) {
    console.log(`\n📤 Sending: ${submission.type}`);
    
    const htmlMessage = formatSubmissionHTML(submission.type, submission.data, submission.geoJSON);
    
    // Encrypt
    const encryptedContent = await nip04.encrypt(testSecretKey, recipientPubkey, htmlMessage);
    
    // Create event
    const eventTemplate = {
      kind: 4,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['p', recipientPubkey]],
      content: encryptedContent
    };
    
    const signedEvent = finalizeEvent(eventTemplate, testSecretKey);
    console.log(`   Event ID: ${signedEvent.id}`);
    
    // Publish
    let successCount = 0;
    for (const relay of RELAYS) {
      try {
        await pool.publish([relay], signedEvent);
        console.log(`   ✓ ${relay}`);
        successCount++;
      } catch (error) {
        console.log(`   ✗ ${relay}: ${error.message}`);
      }
    }
    
    console.log(`   Published to ${successCount}/${RELAYS.length} relays`);
    
    // Wait a bit between submissions
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  pool.close(RELAYS);
  
  console.log('\n✅ All test submissions sent!');
  console.log('\n📊 Summary:');
  console.log('   - 3 different submission types');
  console.log('   - Complete GeoJSON coordinates');
  console.log('   - OSM-ready tags');
  console.log('   - Import instructions included');
  console.log('\n👀 Check your monitor.js terminal to see the decrypted messages!');
  console.log('\n💾 The HTML format is ready for:');
  console.log('   - Email forwarding');
  console.log('   - Direct copy/paste into OSM editors');
  console.log('   - Archive for community review');
}

sendTestSubmissions().catch(console.error);
