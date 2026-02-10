# Anmore.bike - Persistent Admin-Approved Map Layers Implementation Plan

## Executive Summary

This document outlines the architecture and implementation strategy for adding **persistent, admin-approved map layers** to the Anmore.bike platform. The goal is to enable user-submitted routes/features to be reviewed by administrators and, once approved, displayed to ALL users as permanent layers on the OpenStreetMap base.

**Key Objectives:**
- ✅ Users submit routes/features via existing Nostr-encrypted forms
- ✅ Admin dashboard for reviewing and approving submissions
- ✅ Approved routes persist and display to all users (not session-based)
- ✅ Maintain privacy-first approach (no user tracking)
- ✅ Crowdsourced, community-driven map platform for Anmore, BC

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Proposed Architecture](#2-proposed-architecture)
3. [Data Storage Strategy](#3-data-storage-strategy)
4. [Map Layer Architecture](#4-map-layer-architecture)
5. [User Submission Workflow](#5-user-submission-workflow)
6. [Admin Approval Workflow](#6-admin-approval-workflow)
7. [Display Layer System](#7-display-layer-system)
8. [Privacy & Moderation](#8-privacy--moderation)
9. [Implementation Roadmap](#9-implementation-roadmap)
10. [Technical Specifications](#10-technical-specifications)

---

## 1. Current Architecture Analysis

### 1.1 Existing System Overview

**Technology Stack:**
```
Frontend:
  - Astro v5.17.1 (static site generator)
  - Leaflet.js 1.9.4 (interactive maps)
  - Leaflet.draw 1.0.4 (drawing tools)
  - Tailwind CSS 4.1.18 (styling)

Data Layer:
  - Nostr Protocol (decentralized messaging)
  - NIP-04 (end-to-end encryption)
  - 4 Public Relays (relay.anmore.me, relay.damus.io, nos.lol, relay.primal.net)
  
Storage:
  - LocalStorage (user profiles)
  - IndexedDB (offline queue)
  - SessionStorage (ephemeral keypairs)

Monitoring:
  - Node.js script (scripts/monitor.js)
  - Decrypts submissions with admin nsec
  - Displays formatted HTML + GeoJSON
```

**Current Data Flow:**
```
┌─────────────┐
│   User      │
│  Browser    │
└──────┬──────┘
       │ 1. Draws route on map (Leaflet)
       │ 2. Fills metadata form
       │ 3. Generates GeoJSON
       ▼
┌─────────────────┐
│ Nostr Client    │
│ (nostr-tools)   │
└──────┬──────────┘
       │ 4. Encrypts with NIP-04
       │ 5. Sends kind:4 DM event
       ▼
┌─────────────────┐
│ Nostr Relays    │
│ (4 public)      │
└──────┬──────────┘
       │ 6. Stores encrypted event
       ▼
┌─────────────────┐
│ Admin Monitor   │
│ (monitor.js)    │
└──────┬──────────┘
       │ 7. Decrypts with nsec
       │ 8. Displays HTML + GeoJSON
       ▼
┌─────────────────┐
│ Admin           │
│ (Manual Review) │
└─────────────────┘
```

### 1.2 Current Limitations

**No Persistence:**
- Submissions are ephemeral encrypted messages
- No public storage of approved routes
- Each user only sees their own drawings (session-based)
- No way to query/display approved submissions to all users

**Manual Process:**
- Admin must manually run monitor.js
- Copy/paste GeoJSON to external tools
- No structured approval workflow
- No feedback loop to submitter

**Data Silos:**
- Nostr relays store encrypted events (inaccessible to public)
- No centralized approved routes database
- No API for fetching approved layers

### 1.3 Strengths to Preserve

✅ **Privacy-first**: Nostr encryption protects user submissions  
✅ **Serverless**: No backend infrastructure (low cost)  
✅ **Decentralized**: Multiple relay redundancy  
✅ **Offline-capable**: PWA with service worker  
✅ **OSM-compatible**: GeoJSON output with comprehensive metadata  

---

## 2. Proposed Architecture

### 2.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │ User Browser│  │ Map Display  │  │  Admin Dashboard │    │
│  │ (Submission)│  │ (Public View)│  │  (Review/Approve)│    │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────────┘    │
└─────────┼─────────────────┼──────────────────┼───────────────┘
          │                 │                  │
          │                 │                  │
┌─────────▼─────────────────▼──────────────────▼───────────────┐
│                 NOSTR PROTOCOL LAYER                          │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Encrypted Submissions (kind:4 DMs)                  │    │
│  │  Approval Events (kind:30023 or custom kind)         │    │
│  │  Status Updates (kind:1 or custom kind)              │    │
│  └──────────────────────────────────────────────────────┘    │
│         4 Public Relays (existing infrastructure)             │
└───────────────────────────────────┬───────────────────────────┘
                                    │
┌───────────────────────────────────▼───────────────────────────┐
│               PERSISTENCE LAYER (NEW)                          │
│  ┌──────────────────┐  ┌─────────────────────────────────┐   │
│  │ Approved Routes  │  │   Metadata Database (Optional)  │   │
│  │ GeoJSON Files    │  │   - PostgreSQL + PostGIS        │   │
│  │ (Static/CDN)     │  │   - OR SQLite + SpatialLite     │   │
│  └──────────────────┘  └─────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼───────────────────────────┐
│                    MAP TILE LAYER                              │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  Base Layer: OpenStreetMap Tiles                     │     │
│  │  Overlay Layer 1: Approved Trails (GeoJSON)          │     │
│  │  Overlay Layer 2: Approved Pump Tracks (GeoJSON)     │     │
│  │  Overlay Layer 3: Approved Bike Trains (GeoJSON)     │     │
│  └──────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────┘
```

### 2.2 Three-Tier Data Strategy

We'll implement a **hybrid approach** combining Nostr's strengths with lightweight persistence:

#### **Tier 1: Submission (Existing - Enhanced)**
- Continue using Nostr NIP-04 encrypted DMs for privacy
- Store submissions as kind:4 events on existing relays
- Add submission metadata (UUID, timestamp, form type)

#### **Tier 2: Approval (New - Nostr Events)**
- Admin publishes approval as **public Nostr event** (kind:30023 "Parameterized Replaceable Event")
- Event contains:
  - Reference to original submission (by UUID)
  - Approved GeoJSON data
  - OSM tags/metadata
  - Approval timestamp
  - Admin signature
- Queryable by all clients (public, not encrypted)

#### **Tier 3: Display Cache (New - Static Files)**
- Aggregate approved events into static GeoJSON files
- One file per layer type (trails.json, pump-tracks.json, bike-trains.json)
- Served via CDN or static host (e.g., `/approved-layers/trails.json`)
- Regenerated on each approval (or cached with TTL)

---

## 3. Data Storage Strategy

### 3.1 Option A: Pure Nostr (Recommended for MVP)

**Philosophy:** Leverage Nostr for both submissions AND approvals (serverless)

**Storage Mechanism:**
```javascript
// Submission (existing): kind:4 encrypted DM
{
  "kind": 4,
  "pubkey": "user_pubkey",
  "tags": [
    ["p", "admin_pubkey"],
    ["submission_id", "uuid-v4"]
  ],
  "content": "<encrypted GeoJSON + metadata>",
  "created_at": 1234567890
}

// Approval (new): kind:30023 public event
{
  "kind": 30023,  // Parameterized Replaceable Event
  "pubkey": "admin_pubkey",
  "tags": [
    ["d", "trail-eagle-ridge-uuid"],  // Unique identifier
    ["t", "trail"],  // Type tag for filtering
    ["submission_id", "original-uuid"],
    ["approved_at", "1234567890"],
    ["status", "approved"],  // or "rejected"
    ["category", "trail-building"],
    ["difficulty", "intermediate"]
  ],
  "content": JSON.stringify({
    geoJSON: { /* full GeoJSON */ },
    metadata: { /* OSM tags */ },
    submitter: "npub...",  // Optional, for attribution
    approvedBy: "admin_npub",
    notes: "Approved for fall construction"
  }),
  "created_at": 1234567890
}
```

**Pros:**
- ✅ No additional infrastructure
- ✅ Decentralized (leverages existing relays)
- ✅ Immutable audit trail (Nostr's built-in integrity)
- ✅ Public queryability (kind:30023 events)

**Cons:**
- ❌ Relay dependency (must trust relays to persist)
- ❌ No spatial queries (can't search by bounding box)
- ❌ Must parse all events client-side

**Implementation:**
1. Admin dashboard queries kind:4 DMs (pending submissions)
2. On approval, publishes kind:30023 event with approved GeoJSON
3. Map clients query kind:30023 events filtered by `["t", "trail"]`
4. Leaflet renders GeoJSON from event content

### 3.2 Option B: Nostr + Static GeoJSON Files (Recommended for Scale)

**Philosophy:** Use Nostr for workflow, generate static files for display

**Storage Mechanism:**
```
Workflow (Nostr):
  - Submissions: kind:4 encrypted DMs
  - Approvals: kind:30023 public events

Display (Static Files):
  - /approved-layers/trails.geojson
  - /approved-layers/pump-tracks.geojson
  - /approved-layers/bike-trains.geojson
  
Build Process:
  1. Admin approves submission (publishes kind:30023)
  2. Build script queries all approved kind:30023 events
  3. Aggregates into GeoJSON FeatureCollections
  4. Writes to /public/approved-layers/*.geojson
  5. Static files deployed with Astro site
```

**Example GeoJSON Output:**
```json
{
  "type": "FeatureCollection",
  "metadata": {
    "generated": "2026-02-10T14:30:00Z",
    "count": 12,
    "category": "trails"
  },
  "features": [
    {
      "type": "Feature",
      "id": "trail-eagle-ridge-uuid",
      "geometry": {
        "type": "LineString",
        "coordinates": [[-122.8565, 49.3257], [-122.8550, 49.3270]]
      },
      "properties": {
        "name": "Eagle Ridge Connector",
        "surface": "compacted",
        "mtb:scale": "2",
        "width": "1.5",
        "approvedAt": "2026-02-01T10:00:00Z",
        "submitter": "npub1...",  // Optional
        "status": "approved"
      }
    }
  ]
}
```

**Pros:**
- ✅ Fast client-side rendering (no event parsing)
- ✅ CDN-friendly (cache GeoJSON files)
- ✅ Spatial libraries can process GeoJSON efficiently
- ✅ Backward compatible with existing OSM tools

**Cons:**
- ❌ Requires build step (manual or automated)
- ❌ Static files can drift from Nostr events (need sync)

**Implementation:**
1. Admin approves submission (publishes kind:30023 to Nostr)
2. Build script (Node.js) runs:
   ```bash
   npm run build:layers
   ```
3. Script queries Nostr relays for all kind:30023 events
4. Aggregates into GeoJSON FeatureCollections by type
5. Writes to `public/approved-layers/*.geojson`
6. Astro rebuild includes updated files
7. Map loads GeoJSON from `/approved-layers/trails.geojson`

### 3.3 Option C: Nostr + PostGIS Database (Advanced)

**Philosophy:** Full-featured spatial database for complex queries

**Storage Mechanism:**
```
Workflow (Nostr):
  - Submissions: kind:4 encrypted DMs (workflow only)
  - Approvals: kind:30023 events (published for transparency)

Database (PostgreSQL + PostGIS):
  - Table: approved_routes
  - Columns:
    - id (UUID, primary key)
    - nostr_event_id (reference to kind:30023)
    - category (trail, pump-track, bike-train)
    - geometry (PostGIS geometry column)
    - properties (JSONB for OSM tags)
    - approved_at (timestamp)
    - approved_by (admin npub)
    - status (approved, rejected, archived)
    
API Layer (optional):
  - GET /api/layers/trails → GeoJSON
  - GET /api/layers/trails?bbox=-122.9,49.3,-122.8,49.4 (spatial query)
```

**Pros:**
- ✅ Advanced spatial queries (bounding box, distance, intersections)
- ✅ Scalable to thousands of routes
- ✅ Server-side filtering/pagination
- ✅ Real-time updates (no rebuild needed)

**Cons:**
- ❌ Requires server infrastructure (hosting, backups)
- ❌ Increased complexity (database management)
- ❌ Contradicts "serverless" philosophy

**When to Use:**
- Project scales beyond 100+ routes
- Need real-time updates without rebuilds
- Want advanced filtering (e.g., "show all trails within 5km")

### 3.4 Recommended Approach: Hybrid (Option B)

**For Anmore.bike MVP:**

Use **Option B (Nostr + Static GeoJSON)** because:
1. ✅ Maintains serverless architecture (aligns with existing design)
2. ✅ Provides fast, CDN-friendly layer delivery
3. ✅ Keeps audit trail on Nostr (transparency)
4. ✅ Simple build process (can automate with GitHub Actions)

**Migration Path:**
- Phase 1 (MVP): Option B (static files)
- Phase 2 (Growth): Add caching/TTL for real-time updates
- Phase 3 (Scale): Migrate to Option C (PostGIS) if >500 routes

---

## 4. Map Layer Architecture

### 4.1 Leaflet Layer Structure

```javascript
// Base OSM Layer (existing)
const baseLayer = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  { attribution: '© OpenStreetMap contributors' }
);

// Approved Trails Layer (new)
const trailsLayer = L.geoJSON(null, {
  style: {
    color: '#16a34a',      // Green
    weight: 4,
    opacity: 0.8
  },
  onEachFeature: (feature, layer) => {
    const props = feature.properties;
    layer.bindPopup(`
      <strong>${props.name}</strong><br>
      Surface: ${props.surface}<br>
      Difficulty: MTB ${props['mtb:scale']}<br>
      <em>Approved: ${new Date(props.approvedAt).toLocaleDateString()}</em>
    `);
  }
});

// Approved Pump Tracks Layer (new)
const pumpTracksLayer = L.geoJSON(null, {
  style: {
    color: '#dc2626',      // Red
    fillColor: '#fca5a5',
    fillOpacity: 0.3,
    weight: 2
  },
  onEachFeature: (feature, layer) => {
    const props = feature.properties;
    layer.bindPopup(`
      <strong>${props.name}</strong><br>
      Surface: ${props.surface}<br>
      Features: ${props.features}<br>
    `);
  }
});

// Approved Bike Trains Layer (new)
const bikeTrainsLayer = L.geoJSON(null, {
  style: {
    color: '#2563eb',      // Blue
    weight: 5,
    opacity: 0.7,
    dashArray: '10, 5'     // Dashed line
  },
  onEachFeature: (feature, layer) => {
    const props = feature.properties;
    layer.bindPopup(`
      <strong>${props.name}</strong><br>
      School: ${props.school}<br>
      Cycleway: ${props.cycleway}<br>
    `);
  }
});

// Layer Control (user can toggle)
const overlays = {
  "Approved Trails": trailsLayer,
  "Pump Tracks": pumpTracksLayer,
  "Bike Trains": bikeTrainsLayer
};

L.control.layers(null, overlays, { collapsed: false }).addTo(map);

// Load approved layers
fetch('/approved-layers/trails.geojson')
  .then(res => res.json())
  .then(data => trailsLayer.addData(data));

fetch('/approved-layers/pump-tracks.geojson')
  .then(res => res.json())
  .then(data => pumpTracksLayer.addData(data));

fetch('/approved-layers/bike-trains.geojson')
  .then(res => res.json())
  .then(data => bikeTrainsLayer.addData(data));
```

### 4.2 Layer Styling Convention

**Color Coding:**
- 🟢 **Trails**: Green (#16a34a) - symbolizes nature
- 🔴 **Pump Tracks**: Red (#dc2626) - high energy
- 🔵 **Bike Trains**: Blue (#2563eb) - safety/school

**Line Styles:**
- **Solid**: Permanent trails
- **Dashed**: Bike train routes (temporary/seasonal)
- **Dotted**: Proposed (not yet built)

**Difficulty Indicators:**
- Width varies by MTB scale (beginner = 2px, expert = 6px)
- Opacity varies by trail visibility rating

### 4.3 Interactive Features

**On Click:**
- Display popup with full metadata
- Link to submission details
- "Report Issue" button (moderation)

**On Hover:**
- Highlight route
- Show tooltip with name + type

**Filtering UI:**
```html
<div class="layer-filters">
  <label>
    <input type="checkbox" checked data-layer="trails" />
    Trails (12)
  </label>
  <label>
    <input type="checkbox" checked data-layer="pump-tracks" />
    Pump Tracks (3)
  </label>
  <label>
    <input type="checkbox" checked data-layer="bike-trains" />
    Bike Trains (5)
  </label>
  
  <hr>
  
  <label>Difficulty:</label>
  <select data-filter="difficulty">
    <option value="all">All Levels</option>
    <option value="beginner">Beginner</option>
    <option value="intermediate">Intermediate</option>
    <option value="advanced">Advanced</option>
  </select>
</div>
```

---

## 5. User Submission Workflow

### 5.1 Enhanced Submission Flow

**Current Process (Preserved):**
1. User draws route on map (Leaflet.draw)
2. Fills metadata form (OSM tags)
3. Generates GeoJSON with properties
4. Encrypts via NIP-04
5. Sends kind:4 DM to admin

**New Additions:**
```javascript
// 1. Generate unique submission ID
const submissionId = crypto.randomUUID();

// 2. Add submission metadata
const submissionData = {
  submissionId,
  timestamp: Date.now(),
  formType: 'trail-building',
  status: 'pending',
  geoJSON: drawnFeatures.toGeoJSON(),
  metadata: formData,
  submitter: profile.npub
};

// 3. Store locally for tracking
localStorage.setItem(`submission_${submissionId}`, JSON.stringify({
  id: submissionId,
  status: 'pending',
  submittedAt: Date.now(),
  type: 'trail-building'
}));

// 4. Send encrypted DM (existing)
await sendEncryptedDM(secretKey, JSON.stringify(submissionData), statusCallback);

// 5. Show confirmation with tracking ID
showModal(`
  <h3>Submission Sent!</h3>
  <p>Your trail proposal has been submitted for review.</p>
  <p>Tracking ID: <code>${submissionId}</code></p>
  <p>You'll be notified when it's reviewed.</p>
`);
```

### 5.2 Submission Tracking (New Feature)

**User Dashboard Page (`/my-submissions`):**

```astro
---
// src/pages/my-submissions.astro
import Layout from '../layouts/Layout.astro';
---

<Layout title="My Submissions - Anmore.bike">
  <div id="submissions-list">
    <!-- Dynamically populated from localStorage -->
  </div>
</Layout>

<script>
  // Load user's submissions from localStorage
  const submissions = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('submission_')) {
      const data = JSON.parse(localStorage.getItem(key));
      submissions.push(data);
    }
  }
  
  // Query Nostr for status updates (kind:30023 events)
  // Match by submissionId in tags
  // Update status: pending → approved/rejected
</script>
```

**Status Display:**
```
┌────────────────────────────────────────┐
│ My Submissions (3)                     │
├────────────────────────────────────────┤
│ ✅ Eagle Ridge Trail                   │
│    Approved on Feb 1, 2026             │
│    [View on Map]                       │
├────────────────────────────────────────┤
│ ⏳ Sunnyside Pump Track                │
│    Pending review since Jan 28, 2026   │
│    [Track Status]                      │
├────────────────────────────────────────┤
│ ❌ Forest Loop Trail                   │
│    Rejected on Jan 25, 2026            │
│    Reason: Overlaps private property   │
│    [Resubmit] [Contact Admin]          │
└────────────────────────────────────────┘
```

---

## 6. Admin Approval Workflow

### 6.1 Admin Dashboard Architecture

**New Page: `/admin`** (password-protected or nsec-gated)

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD                          │
│                                                             │
│  [Pending (5)] [Approved (23)] [Rejected (2)]              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Submission #1: Eagle Ridge Trail                    │  │
│  │ Submitted: 2026-02-08 by npub1abc...                │  │
│  │ Type: Trail Building                                │  │
│  │                                                       │  │
│  │ [Preview Map] [View Metadata] [Review]              │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Review: Eagle Ridge Trail                           │  │
│  │ ┌─────────────────────────────────────────────────┐ │  │
│  │ │ [Map Preview with submitted route highlighted] │ │  │
│  │ └─────────────────────────────────────────────────┘ │  │
│  │                                                       │  │
│  │ Metadata:                                            │  │
│  │ • Surface: compacted                                 │  │
│  │ • MTB Scale: 2 (intermediate)                        │  │
│  │ • Width: 1.5m                                        │  │
│  │                                                       │  │
│  │ Admin Notes:                                         │  │
│  │ ┌─────────────────────────────────────────────────┐ │  │
│  │ │ [Text area for internal notes]                  │ │  │
│  │ └─────────────────────────────────────────────────┘ │  │
│  │                                                       │  │
│  │ Public Feedback (optional):                          │  │
│  │ ┌─────────────────────────────────────────────────┐ │  │
│  │ │ [Text area - sent to submitter]                 │ │  │
│  │ └─────────────────────────────────────────────────┘ │  │
│  │                                                       │  │
│  │ [❌ Reject] [💬 Request Changes] [✅ Approve]       │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Admin Authentication

**Option 1: nsec-based Login**
```javascript
// Admin logs in with their nsec (same as monitoring script)
// Verifies against hardcoded admin npubs in config
const ADMIN_NPUBS = [
  'npub19djteyezrkn9ppg6gjfsxl59pgxrwh76uju60lxtcvr5svj3cmlsf54ca2'
];

function verifyAdmin(npub) {
  return ADMIN_NPUBS.includes(npub);
}
```

**Option 2: Simple Password**
```javascript
// Lightweight alternative (less secure, but simpler)
const ADMIN_PASSWORD_HASH = 'sha256_hash_of_password';

function verifyAdmin(password) {
  return sha256(password) === ADMIN_PASSWORD_HASH;
}
```

### 6.3 Review Process

```javascript
async function approveSubmission(submissionId, adminNsec, notes) {
  // 1. Fetch original submission (decrypt kind:4 event)
  const submission = await fetchSubmission(submissionId);
  
  // 2. Validate GeoJSON
  if (!validateGeoJSON(submission.geoJSON)) {
    throw new Error('Invalid GeoJSON data');
  }
  
  // 3. Publish approval event (kind:30023)
  const approvalEvent = {
    kind: 30023,
    tags: [
      ['d', submissionId],
      ['t', submission.formType],
      ['submission_id', submissionId],
      ['status', 'approved'],
      ['approved_at', Math.floor(Date.now() / 1000)]
    ],
    content: JSON.stringify({
      geoJSON: submission.geoJSON,
      metadata: submission.metadata,
      submitter: submission.submitter,
      adminNotes: notes,
      approvedBy: nip19.npubEncode(getPublicKey(adminSecretKey))
    })
  };
  
  const signed = finalizeEvent(approvalEvent, adminSecretKey);
  
  // 4. Publish to all relays
  await pool.publish(RELAYS, signed);
  
  // 5. Trigger build script (regenerate GeoJSON files)
  await triggerLayerRebuild();
  
  // 6. Optionally send notification to submitter (kind:1 mention)
  await sendNotification(submission.submitter, `
    Your ${submission.formType} submission "${submission.metadata.name}" has been approved! 
    It will appear on the map shortly. Thank you for contributing to Anmore.bike!
  `);
  
  return true;
}

async function rejectSubmission(submissionId, adminNsec, reason) {
  // Similar to approve, but status: 'rejected'
  // Include rejection reason in content
  // Optionally send feedback to submitter
}
```

### 6.4 Build Script (`scripts/build-layers.js`)

```javascript
#!/usr/bin/env node
import { SimplePool } from 'nostr-tools/pool';
import { writeFile } from 'fs/promises';
import { RELAYS, ADMIN_NPUBS } from '../src/lib/config.ts';

const pool = new SimplePool();

// Query all approved kind:30023 events
const events = await pool.querySync(RELAYS, {
  kinds: [30023],
  authors: ADMIN_NPUBS,  // Only from trusted admins
  '#status': ['approved']
});

// Group by type
const layers = {
  trails: [],
  pumpTracks: [],
  bikeTrains: []
};

events.forEach(event => {
  const type = event.tags.find(t => t[0] === 't')?.[1];
  const content = JSON.parse(event.content);
  
  if (type === 'trail-building') {
    layers.trails.push({
      type: 'Feature',
      id: event.tags.find(t => t[0] === 'd')?.[1],
      geometry: content.geoJSON.geometry,
      properties: {
        ...content.metadata,
        approvedAt: event.created_at * 1000,
        submitter: content.submitter
      }
    });
  }
  // Similar for pump-track, bike-train...
});

// Write GeoJSON files
await writeFile(
  'public/approved-layers/trails.geojson',
  JSON.stringify({
    type: 'FeatureCollection',
    metadata: {
      generated: new Date().toISOString(),
      count: layers.trails.length
    },
    features: layers.trails
  }, null, 2)
);

// Repeat for other layers...
console.log(`✅ Built ${layers.trails.length} trails, ${layers.pumpTracks.length} pump tracks, ${layers.bikeTrains.length} bike trains`);
```

**Automation with GitHub Actions:**
```yaml
# .github/workflows/build-layers.yml
name: Build Map Layers
on:
  workflow_dispatch:  # Manual trigger from admin dashboard
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: node scripts/build-layers.js
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## 7. Display Layer System

### 7.1 Client-Side Layer Loading

**Map Initialization (all pages):**
```javascript
// src/lib/map-layers.ts
export async function loadApprovedLayers(map) {
  const layers = {
    trails: L.geoJSON(null, { style: trailStyle }),
    pumpTracks: L.geoJSON(null, { style: pumpTrackStyle }),
    bikeTrains: L.geoJSON(null, { style: bikeTrainStyle })
  };
  
  // Load from static files (fast, cached)
  const [trails, pumpTracks, bikeTrains] = await Promise.all([
    fetch('/approved-layers/trails.geojson').then(r => r.json()),
    fetch('/approved-layers/pump-tracks.geojson').then(r => r.json()),
    fetch('/approved-layers/bike-trains.geojson').then(r => r.json())
  ]);
  
  layers.trails.addData(trails);
  layers.pumpTracks.addData(pumpTracks);
  layers.bikeTrains.addData(bikeTrains);
  
  // Add to map with layer control
  const overlays = {
    "Approved Trails": layers.trails,
    "Pump Tracks": layers.pumpTracks,
    "Bike Trains": layers.bikeTrains
  };
  
  L.control.layers(null, overlays, { collapsed: false }).addTo(map);
  
  // Default: show all layers
  map.addLayer(layers.trails);
  map.addLayer(layers.pumpTracks);
  map.addLayer(layers.bikeTrains);
  
  return layers;
}
```

**Integration in Existing Pages:**
```astro
---
// src/pages/index.astro (homepage)
import Layout from '../layouts/Layout.astro';
---

<Layout title="Anmore.bike - Community Bike Routes">
  <div id="map" class="h-[600px]"></div>
</Layout>

<script>
  import L from 'leaflet';
  import { loadApprovedLayers } from '../lib/map-layers.ts';
  import { ANMORE_CENTER, DEFAULT_ZOOM } from '../lib/config.ts';
  
  // Initialize map
  const map = L.map('map').setView([ANMORE_CENTER.lat, ANMORE_CENTER.lng], DEFAULT_ZOOM);
  
  // Base layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  
  // Load approved layers
  loadApprovedLayers(map);
</script>
```

### 7.2 Real-Time Updates (Optional Enhancement)

**For immediate updates without rebuild:**
```javascript
// Option: Query Nostr directly for latest approvals
export async function loadApprovedLayersRealtime(map) {
  const pool = new SimplePool();
  
  // Query approved events (kind:30023)
  const events = await pool.querySync(RELAYS, {
    kinds: [30023],
    authors: ADMIN_NPUBS,
    '#status': ['approved'],
    limit: 1000
  });
  
  // Convert to GeoJSON on the fly
  const features = events.map(event => {
    const content = JSON.parse(event.content);
    return {
      type: 'Feature',
      id: event.tags.find(t => t[0] === 'd')?.[1],
      geometry: content.geoJSON.geometry,
      properties: content.metadata
    };
  });
  
  const geoJSON = {
    type: 'FeatureCollection',
    features
  };
  
  L.geoJSON(geoJSON).addTo(map);
  pool.close(RELAYS);
}
```

**Trade-offs:**
- ✅ Instant updates (no build delay)
- ❌ Slower initial load (must query Nostr)
- ❌ Client-side parsing overhead

**Recommendation:** Use static files for MVP, add real-time as opt-in feature

---

## 8. Privacy & Moderation

### 8.1 Privacy Considerations

**Submission Privacy:**
- ✅ Submissions remain encrypted (kind:4 DMs)
- ✅ Only admin can decrypt with nsec
- ✅ Submitter identity (npub) only visible to admin
- ⚠️ Approved routes are PUBLIC (by design)
- ⚠️ Submitter npub can be redacted before approval

**Attribution Policy:**
```javascript
// Option 1: Full attribution (default)
{
  "submitter": "npub1abc...",
  "displayName": "JaneDoe"  // If opted-in
}

// Option 2: Anonymous attribution
{
  "submitter": "anonymous",
  "contributorId": "uuid"  // For leaderboard only
}

// Option 3: No attribution
{
  // submitter field omitted entirely
}
```

**User Control:**
```html
<!-- In submission form -->
<label>
  <input type="checkbox" name="publicAttribution" checked />
  Display my name on approved routes (public leaderboard)
</label>
```

### 8.2 Moderation Workflow

**Rejection Reasons:**
- ❌ Incorrect location/geography
- ❌ Duplicate submission
- ❌ Overlaps private property
- ❌ Unsafe route (high traffic road, no cycleway)
- ❌ Incomplete metadata (missing required fields)
- ❌ Spam/malicious submission

**Feedback Loop:**
```javascript
async function sendRejectionFeedback(submitterNpub, submissionId, reason) {
  // Publish public note mentioning submitter
  const feedback = {
    kind: 1,  // Text note
    content: `RE: Submission ${submissionId}
    
Unfortunately, your submission was not approved for the following reason:
${reason}

You're welcome to revise and resubmit. Thank you for contributing to Anmore.bike!`,
    tags: [
      ['p', submitterNpub],
      ['e', submissionId]
    ]
  };
  
  const signed = finalizeEvent(feedback, adminSecretKey);
  await pool.publish(RELAYS, signed);
}
```

### 8.3 Content Moderation Tools

**Admin Dashboard Features:**
- 🔍 Filter by submission date/type
- 🚨 Flag suspicious submissions
- 📊 View submitter history (all submissions from npub)
- 🔒 Block repeat offenders (blacklist npub)
- 📝 Internal notes (not visible to public)

**Automated Validation:**
```javascript
function validateSubmission(data) {
  const errors = [];
  
  // Check required fields
  if (!data.geoJSON || !data.geoJSON.geometry) {
    errors.push('Missing map geometry');
  }
  
  // Validate GeoJSON structure
  if (data.geoJSON.type !== 'Feature' && data.geoJSON.type !== 'FeatureCollection') {
    errors.push('Invalid GeoJSON type');
  }
  
  // Check coordinates within Anmore bounds
  const bounds = {
    minLat: 49.30, maxLat: 49.35,
    minLng: -122.90, maxLng: -122.82
  };
  
  if (!isWithinBounds(data.geoJSON.geometry.coordinates, bounds)) {
    errors.push('Route outside Anmore area');
  }
  
  // Validate metadata completeness
  if (data.formType === 'trail-building') {
    if (!data.metadata.surface || !data.metadata.name) {
      errors.push('Missing required trail metadata');
    }
  }
  
  return errors;
}
```

### 8.4 Abuse Prevention

**Rate Limiting:**
```javascript
// Track submissions per npub
const submissionCounts = new Map();

function checkRateLimit(npub) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  
  if (!submissionCounts.has(npub)) {
    submissionCounts.set(npub, []);
  }
  
  const timestamps = submissionCounts.get(npub);
  const recentSubmissions = timestamps.filter(ts => now - ts < windowMs);
  
  if (recentSubmissions.length >= 5) {
    throw new Error('Rate limit exceeded. Please wait before submitting again.');
  }
  
  recentSubmissions.push(now);
  submissionCounts.set(npub, recentSubmissions);
}
```

**Duplicate Detection:**
```javascript
function isDuplicate(newGeoJSON, existingLayers) {
  // Check if new route overlaps >90% with existing route
  for (const feature of existingLayers.features) {
    const similarity = calculateSimilarity(newGeoJSON, feature.geometry);
    if (similarity > 0.9) {
      return {
        isDuplicate: true,
        matchId: feature.id,
        matchName: feature.properties.name
      };
    }
  }
  return { isDuplicate: false };
}
```

---

## 9. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal:** Set up approval event infrastructure

- [ ] **Task 1.1:** Define Nostr event schema (kind:30023 structure)
- [ ] **Task 1.2:** Update submission flow to include UUID tracking
- [ ] **Task 1.3:** Create `/admin` page skeleton (authentication)
- [ ] **Task 1.4:** Build submission query logic (fetch pending kind:4 events)
- [ ] **Task 1.5:** Implement admin approval function (publish kind:30023)

**Deliverables:**
- ✅ Admins can view pending submissions
- ✅ Admins can approve/reject with notes
- ✅ Approval events published to Nostr

---

### Phase 2: Display Layer System (Week 3-4)

**Goal:** Render approved routes to all users

- [ ] **Task 2.1:** Create `scripts/build-layers.js` (aggregate kind:30023 → GeoJSON)
- [ ] **Task 2.2:** Generate initial static GeoJSON files
- [ ] **Task 2.3:** Implement `loadApprovedLayers()` in map library
- [ ] **Task 2.4:** Add layer control UI (toggles for trails/pump tracks/bike trains)
- [ ] **Task 2.5:** Style layers with color coding and popups
- [ ] **Task 2.6:** Integrate approved layers on homepage and form pages

**Deliverables:**
- ✅ Approved routes visible on all maps
- ✅ Users can toggle layer visibility
- ✅ Popups show metadata on click

---

### Phase 3: User Tracking & Notifications (Week 5)

**Goal:** Close feedback loop with submitters

- [ ] **Task 3.1:** Create `/my-submissions` page
- [ ] **Task 3.2:** Store submission IDs in localStorage
- [ ] **Task 3.3:** Query Nostr for status updates (match by submission ID)
- [ ] **Task 3.4:** Implement notification system (kind:1 mentions)
- [ ] **Task 3.5:** Add "Resubmit" functionality for rejected submissions

**Deliverables:**
- ✅ Users can track submission status
- ✅ Users receive feedback on approvals/rejections
- ✅ Users can resubmit after revisions

---

### Phase 4: Admin Dashboard Polish (Week 6)

**Goal:** Streamline review workflow

- [ ] **Task 4.1:** Add map preview in admin review modal
- [ ] **Task 4.2:** Implement validation warnings (geometry errors, missing metadata)
- [ ] **Task 4.3:** Build filtering/sorting (by date, type, submitter)
- [ ] **Task 4.4:** Add bulk actions (approve multiple, archive old)
- [ ] **Task 4.5:** Create admin statistics dashboard (submissions/week, approval rate)

**Deliverables:**
- ✅ Efficient batch review process
- ✅ Visual feedback on data quality
- ✅ Admin insights into community engagement

---

### Phase 5: Automation & Polish (Week 7-8)

**Goal:** Production-ready deployment

- [ ] **Task 5.1:** Set up GitHub Actions workflow (auto-rebuild on approval)
- [ ] **Task 5.2:** Implement CDN caching for GeoJSON files (Cloudflare)
- [ ] **Task 5.3:** Add error handling and retry logic
- [ ] **Task 5.4:** Create admin documentation (review guidelines)
- [ ] **Task 5.5:** User testing and bug fixes
- [ ] **Task 5.6:** Performance optimization (layer clustering for 100+ routes)

**Deliverables:**
- ✅ Automated build pipeline
- ✅ Production deployment
- ✅ Admin training materials
- ✅ Scalable architecture (handles 500+ routes)

---

### Phase 6: Advanced Features (Future)

**Optional Enhancements:**
- [ ] Real-time layer updates (query Nostr directly)
- [ ] Spatial filtering (show routes within X km of location)
- [ ] Route search/autocomplete
- [ ] Export approved routes as GPX (for GPS devices)
- [ ] Integration with Strava/Komoot APIs
- [ ] Mobile app with offline approved layers
- [ ] Community voting (upvote/downvote routes)
- [ ] Photo attachments for trail conditions

---

## 10. Technical Specifications

### 10.1 Nostr Event Schemas

#### **Submission Event (kind:4 - existing, enhanced)**
```json
{
  "kind": 4,
  "pubkey": "user_pubkey_hex",
  "created_at": 1707580800,
  "tags": [
    ["p", "admin_pubkey_hex"],
    ["submission_id", "550e8400-e29b-41d4-a716-446655440000"]
  ],
  "content": "<NIP-04 encrypted JSON>",
  "id": "event_id_hex",
  "sig": "signature_hex"
}

// Decrypted content structure:
{
  "submissionId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": 1707580800000,
  "formType": "trail-building",
  "geoJSON": {
    "type": "Feature",
    "geometry": {
      "type": "LineString",
      "coordinates": [[-122.8565, 49.3257], [-122.8550, 49.3270]]
    },
    "properties": {}
  },
  "metadata": {
    "name": "Eagle Ridge Connector",
    "surface": "compacted",
    "mtb:scale": "2",
    "width": "1.5"
  },
  "submitter": "npub1...",
  "email": "user@example.com"
}
```

#### **Approval Event (kind:30023 - new)**
```json
{
  "kind": 30023,
  "pubkey": "admin_pubkey_hex",
  "created_at": 1707667200,
  "tags": [
    ["d", "trail-eagle-ridge-550e8400"],  // Unique identifier (required for kind:30023)
    ["t", "trail-building"],              // Type tag
    ["submission_id", "550e8400-e29b-41d4-a716-446655440000"],
    ["status", "approved"],
    ["approved_at", "1707667200"],
    ["category", "trail"],
    ["difficulty", "intermediate"],
    ["submitter", "npub1abc..."]  // Optional
  ],
  "content": "{\"geoJSON\":{...},\"metadata\":{...},\"adminNotes\":\"Approved for fall construction\"}",
  "id": "event_id_hex",
  "sig": "signature_hex"
}
```

**Why kind:30023?**
- Parameterized Replaceable Event (NIP-33)
- Allows updates (admin can edit/revoke approval)
- Unique `d` tag prevents duplicates
- Queryable by tags (efficient filtering)

#### **Notification Event (kind:1 - existing Nostr standard)**
```json
{
  "kind": 1,
  "pubkey": "admin_pubkey_hex",
  "created_at": 1707667200,
  "tags": [
    ["p", "submitter_pubkey_hex"],  // Mention submitter
    ["e", "submission_event_id"],   // Reference original submission
    ["t", "anmore-bike-approval"]   // Hashtag for filtering
  ],
  "content": "Your trail proposal 'Eagle Ridge Connector' has been approved! View it on the map at anmore.bike",
  "id": "event_id_hex",
  "sig": "signature_hex"
}
```

### 10.2 GeoJSON Structure

#### **Output Format (static files)**
```json
{
  "type": "FeatureCollection",
  "metadata": {
    "generated": "2026-02-10T14:30:00Z",
    "generator": "anmore-bike build-layers v1.0.0",
    "count": 12,
    "category": "trails",
    "bounds": {
      "minLat": 49.30, "maxLat": 49.35,
      "minLng": -122.90, "maxLng": -122.82
    }
  },
  "features": [
    {
      "type": "Feature",
      "id": "trail-eagle-ridge-550e8400",
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [-122.8565, 49.3257],
          [-122.8560, 49.3265],
          [-122.8550, 49.3270]
        ]
      },
      "properties": {
        "name": "Eagle Ridge Connector",
        "description": "Intermediate trail connecting Eagle Mountain to Sunnyside Ridge",
        "surface": "compacted",
        "mtb:scale": "2",
        "mtb:scale:uphill": "1",
        "width": "1.5",
        "trail_visibility": "good",
        "access": "yes",
        "sac_scale": "mountain_hiking",
        "approvedAt": "2026-02-01T10:00:00Z",
        "approvedBy": "npub19djt...",
        "submitter": "npub1abc...",
        "submittedAt": "2026-01-28T14:22:00Z",
        "status": "approved",
        "category": "trail-building",
        "difficulty": "intermediate"
      }
    }
  ]
}
```

### 10.3 API Endpoints (if using server)

**Optional REST API (for PostGIS backend):**

```
GET /api/layers/trails
  Response: GeoJSON FeatureCollection of approved trails
  Query params:
    - bbox: -122.9,49.3,-122.8,49.4 (bounding box filter)
    - difficulty: beginner|intermediate|advanced
    - surface: dirt|gravel|compacted|paved

GET /api/layers/pump-tracks
  Response: GeoJSON FeatureCollection of approved pump tracks
  
GET /api/layers/bike-trains
  Response: GeoJSON FeatureCollection of approved bike train routes

GET /api/submissions/pending
  Auth: Admin only
  Response: Array of pending submissions (decrypted)
  
POST /api/submissions/:id/approve
  Auth: Admin only
  Body: { notes: "string", publicAttribution: boolean }
  Response: { success: true, eventId: "nostr_event_id" }
  
POST /api/submissions/:id/reject
  Auth: Admin only
  Body: { reason: "string", feedback: "string" }
  Response: { success: true }
```

**Static File Endpoints (current approach):**
```
GET /approved-layers/trails.geojson
GET /approved-layers/pump-tracks.geojson
GET /approved-layers/bike-trains.geojson
GET /approved-layers/all.geojson (combined)
```

### 10.4 Database Schema (if using PostGIS)

```sql
-- Extension
CREATE EXTENSION postgis;

-- Approved routes table
CREATE TABLE approved_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nostr_event_id TEXT UNIQUE NOT NULL,
  submission_id UUID NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('trail', 'pump-track', 'bike-train')),
  name TEXT NOT NULL,
  description TEXT,
  geometry GEOMETRY(Geometry, 4326) NOT NULL,
  properties JSONB NOT NULL,
  submitter_npub TEXT,
  approved_by_npub TEXT NOT NULL,
  approved_at TIMESTAMP NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'rejected', 'archived')),
  admin_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_approved_routes_category ON approved_routes(category);
CREATE INDEX idx_approved_routes_status ON approved_routes(status);
CREATE INDEX idx_approved_routes_geometry ON approved_routes USING GIST(geometry);
CREATE INDEX idx_approved_routes_properties ON approved_routes USING GIN(properties);

-- Full-text search
CREATE INDEX idx_approved_routes_name ON approved_routes USING GIN(to_tsvector('english', name));

-- Example query: Find all trails within 5km of a point
SELECT 
  id, name, category, 
  ST_AsGeoJSON(geometry) as geometry,
  properties
FROM approved_routes
WHERE category = 'trail'
  AND status = 'approved'
  AND ST_DWithin(
    geometry::geography,
    ST_MakePoint(-122.8565, 49.3257)::geography,
    5000  -- 5km in meters
  )
ORDER BY ST_Distance(
  geometry::geography,
  ST_MakePoint(-122.8565, 49.3257)::geography
);
```

### 10.5 Security Considerations

**Admin Authentication:**
```javascript
// Option 1: Nostr-based (cryptographic)
function authenticateAdmin(nsec) {
  const { publicKey } = decodeNsec(nsec);
  const npub = nip19.npubEncode(publicKey);
  
  const ADMIN_NPUBS = [
    'npub19djteyezrkn9ppg6gjfsxl59pgxrwh76uju60lxtcvr5svj3cmlsf54ca2'
  ];
  
  if (!ADMIN_NPUBS.includes(npub)) {
    throw new Error('Unauthorized: Not an admin');
  }
  
  // Store in sessionStorage (expires on tab close)
  sessionStorage.setItem('admin_nsec', nsec);
  return true;
}

// Option 2: Environment variable (serverless)
// Check admin password against ADMIN_PASSWORD_HASH env var
```

**Input Validation:**
```javascript
import DOMPurify from 'dompurify';

function sanitizeInput(data) {
  return {
    ...data,
    metadata: {
      name: DOMPurify.sanitize(data.metadata.name),
      description: DOMPurify.sanitize(data.metadata.description),
      // ... sanitize all text fields
    }
  };
}
```

**Rate Limiting (client-side):**
```javascript
const SUBMISSION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

function checkSubmissionCooldown() {
  const lastSubmission = localStorage.getItem('last_submission_time');
  if (lastSubmission) {
    const timeSince = Date.now() - parseInt(lastSubmission);
    if (timeSince < SUBMISSION_COOLDOWN_MS) {
      const minutesLeft = Math.ceil((SUBMISSION_COOLDOWN_MS - timeSince) / 60000);
      throw new Error(`Please wait ${minutesLeft} minutes before submitting again`);
    }
  }
  localStorage.setItem('last_submission_time', Date.now().toString());
}
```

### 10.6 Performance Optimization

**Layer Clustering (for 100+ routes):**
```javascript
import 'leaflet.markercluster';

const trailsCluster = L.markerClusterGroup({
  disableClusteringAtZoom: 15,  // Show individual routes at high zoom
  maxClusterRadius: 50,
  spiderfyOnMaxZoom: true
});

// Add GeoJSON to cluster instead of directly to map
trailsCluster.addLayer(L.geoJSON(trailsData));
map.addLayer(trailsCluster);
```

**GeoJSON Compression:**
```javascript
// Reduce coordinate precision (±1m accuracy)
function compressGeoJSON(geojson) {
  return {
    ...geojson,
    features: geojson.features.map(f => ({
      ...f,
      geometry: {
        ...f.geometry,
        coordinates: f.geometry.coordinates.map(coord =>
          coord.map(c => parseFloat(c.toFixed(5)))  // 5 decimal places ≈ 1m
        )
      }
    }))
  };
}
```

**Service Worker Caching:**
```javascript
// public/sw.js
const CACHE_VERSION = 'anmore-bike-layers-v2';

self.addEventListener('fetch', event => {
  if (event.request.url.includes('/approved-layers/')) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(cache => {
        return cache.match(event.request).then(response => {
          // Serve from cache, update in background
          const fetchPromise = fetch(event.request).then(networkResponse => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
          return response || fetchPromise;
        });
      })
    );
  }
});
```

---

## 11. Testing Strategy

### 11.1 Unit Tests

**Test Coverage:**
```javascript
// scripts/build-layers.test.js
import { describe, test, expect } from 'vitest';
import { aggregateLayers, validateGeoJSON } from './build-layers.js';

describe('Layer Aggregation', () => {
  test('groups events by type', () => {
    const events = [
      { tags: [['t', 'trail-building']], content: '{"geoJSON":{...}}' },
      { tags: [['t', 'pump-track']], content: '{"geoJSON":{...}}' }
    ];
    const result = aggregateLayers(events);
    expect(result.trails).toHaveLength(1);
    expect(result.pumpTracks).toHaveLength(1);
  });
  
  test('validates GeoJSON structure', () => {
    const valid = { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] } };
    const invalid = { type: 'Invalid' };
    expect(validateGeoJSON(valid)).toBe(true);
    expect(validateGeoJSON(invalid)).toBe(false);
  });
});
```

### 11.2 Integration Tests

**End-to-End Workflow:**
```javascript
// tests/approval-workflow.test.js
import { test, expect } from '@playwright/test';

test('admin approval workflow', async ({ page }) => {
  // 1. Submit trail proposal
  await page.goto('http://localhost:4321/trail-building');
  await page.fill('#trail-name', 'Test Trail');
  // ... draw on map, fill form
  await page.click('#submit-btn');
  await expect(page.locator('#success-modal')).toBeVisible();
  
  // 2. Admin reviews submission
  await page.goto('http://localhost:4321/admin');
  await page.fill('#admin-nsec', process.env.TEST_ADMIN_NSEC);
  await page.click('#login-btn');
  await expect(page.locator('.pending-submission')).toHaveCount(1);
  
  // 3. Approve submission
  await page.click('.review-btn');
  await page.fill('#admin-notes', 'Looks good');
  await page.click('#approve-btn');
  
  // 4. Verify appears on map
  await page.goto('http://localhost:4321/');
  const layer = await page.locator('.leaflet-overlay-pane path').first();
  await expect(layer).toBeVisible();
});
```

### 11.3 Performance Tests

**Load Testing:**
```javascript
// tests/load-layers.bench.js
import { bench, describe } from 'vitest';
import { loadApprovedLayers } from '../src/lib/map-layers.ts';

describe('Layer Loading Performance', () => {
  bench('load 100 trails', async () => {
    const map = L.map(document.createElement('div'));
    await loadApprovedLayers(map);
  });
  
  bench('load 500 trails', async () => {
    // Simulate large dataset
  });
});
```

**Benchmarks:**
- Load 100 routes: < 200ms
- Load 500 routes: < 1s
- GeoJSON file size: < 500KB (compressed)

---

## 12. Deployment Checklist

### Pre-Launch

- [ ] Generate admin nsec keypair (store securely)
- [ ] Add admin npub to `ADMIN_NPUBS` array
- [ ] Test submission → approval → display workflow
- [ ] Verify GeoJSON files generate correctly
- [ ] Set up GitHub Actions for automated builds
- [ ] Configure CDN caching (Cloudflare)
- [ ] Create admin documentation
- [ ] Train admin reviewers
- [ ] Announce feature to community

### Post-Launch Monitoring

- [ ] Track submission volume (daily/weekly)
- [ ] Monitor approval latency (time to review)
- [ ] Check Nostr relay uptime
- [ ] Verify layer file sizes remain manageable
- [ ] Collect user feedback on approved routes
- [ ] Iterate on admin dashboard UX

---

## 13. Conclusion

This implementation plan provides a **comprehensive, privacy-preserving, and scalable architecture** for persistent, admin-approved map layers on Anmore.bike. By leveraging Nostr's decentralized protocol for submissions and approvals, combined with static GeoJSON files for fast display, the platform achieves:

✅ **Serverless persistence** (no database infrastructure)  
✅ **Privacy-first** (encrypted submissions)  
✅ **Transparent approvals** (public Nostr events)  
✅ **Fast rendering** (cached static files)  
✅ **Community-driven** (crowdsourced routes)  
✅ **OSM-compatible** (seamless integration)  

**Next Steps:**
1. Review this plan with stakeholders
2. Prioritize Phase 1 tasks (foundation)
3. Assign development resources
4. Set timeline for MVP launch
5. Begin implementation! 🚀

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-10  
**Author:** OpenClaw AI Assistant (Subagent)  
**Status:** Ready for Review  

For questions or feedback, contact the Anmore.bike admin team via Nostr DM.
