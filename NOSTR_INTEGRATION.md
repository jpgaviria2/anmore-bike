# Nostr Integration Design for Anmore.bike

## Executive Summary

This document defines how Nostr protocol is used in the anmore.bike architecture. The key principle is:

**Nostr for COMMUNICATION (submissions, notifications), NOT for STORAGE/DISPLAY (use OSM/DB/static files for that).**

---

## Table of Contents

1. [Core Principles](#1-core-principles)
2. [Nostr Use Cases (What Works)](#2-nostr-use-cases-what-works)
3. [Nostr Anti-Patterns (What Doesn't Work)](#3-nostr-anti-patterns-what-doesnt-work)
4. [Event Types & Workflow](#4-event-types--workflow)
5. [Submission Workflow](#5-submission-workflow)
6. [Admin Processing Workflow](#6-admin-processing-workflow)
7. [Notification System](#7-notification-system)
8. [Integration with Main Architecture](#8-integration-with-main-architecture)
9. [Code Examples](#9-code-examples)
10. [Security Considerations](#10-security-considerations)

---

## 1. Core Principles

### ✅ What Nostr Should Be Used For

1. **User → Admin Communication**
   - Users submit route proposals as encrypted DMs
   - Privacy-preserving (NIP-04 encryption)
   - Decentralized submission workflow

2. **Admin → User Notifications**
   - Notify users when submissions are approved/rejected
   - Public mentions or encrypted feedback
   - Real-time communication channel

3. **Workflow Audit Trail**
   - Immutable record of approvals/rejections
   - Transparency via public approval events
   - Cryptographic verification of admin actions

4. **Optional Social Features (Future)**
   - Comments on routes (kind:1 replies)
   - Ratings/reactions (NIP-25)
   - Community discussions

### ❌ What Nostr Should NOT Be Used For

1. **Primary Data Storage**
   - ❌ Don't rely on relays to persist approved routes long-term
   - ❌ Relay operators can purge old events anytime
   - ❌ No guaranteed data retention (unlike databases)

2. **Map Display Data Source**
   - ❌ Don't query Nostr every time someone loads the map
   - ❌ Performance issues (slow relay queries)
   - ❌ Unreliable availability (relays can be down)

3. **Spatial/Geographic Queries**
   - ❌ Nostr has no spatial indexing
   - ❌ Can't search by bounding box or proximity
   - ❌ Not designed for GIS operations

### The Hybrid Approach

```
┌─────────────────────────────────────────────────────────────┐
│                    NOSTR LAYER                              │
│                 (Communication Only)                         │
├─────────────────────────────────────────────────────────────┤
│ • User submissions (kind:4 encrypted DMs)                   │
│ • Admin approvals (kind:30078 public events)                │
│ • Status notifications (kind:1 mentions)                    │
│ • Audit trail (immutable event log)                         │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ Extract & Transform
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              PERSISTENT STORAGE LAYER                        │
│             (What Users Actually See)                        │
├─────────────────────────────────────────────────────────────┤
│ • Static GeoJSON files (fast, cached)                       │
│ • OR: PostgreSQL/PostGIS (advanced queries)                 │
│ • OR: OSM exports (community contribution)                  │
│ • Built from Nostr events, served independently             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Nostr Use Cases (What Works)

### Use Case 1: User Submits Route Proposal

**Why Nostr?**
- ✅ End-to-end encryption protects user privacy
- ✅ Decentralized (no single point of failure)
- ✅ User owns their identity (Nostr keypair)
- ✅ No server infrastructure needed

**Implementation:**
```javascript
// User draws route on map, fills form
const submissionData = {
  submissionId: crypto.randomUUID(),
  timestamp: Date.now(),
  formType: 'trail-building',
  geoJSON: drawnFeatures.toGeoJSON(),
  metadata: {
    name: 'Eagle Ridge Trail',
    surface: 'compacted',
    difficulty: 'intermediate'
  }
};

// Encrypt and send as kind:4 DM to admin
await sendEncryptedDM(
  userSecretKey,
  JSON.stringify(submissionData),
  (status) => console.log(status)
);
```

**Event Structure:**
```json
{
  "kind": 4,
  "pubkey": "user_pubkey_hex",
  "tags": [
    ["p", "admin_pubkey_hex"],
    ["submission_id", "uuid-v4"]
  ],
  "content": "<NIP-04 encrypted JSON>",
  "created_at": 1707580800
}
```

---

### Use Case 2: Admin Publishes Approval

**Why Nostr?**
- ✅ Public transparency (anyone can verify approvals)
- ✅ Immutable audit trail
- ✅ Real-time subscription for notifications
- ✅ Admin signature proves authenticity

**Implementation:**
```javascript
// Admin approves submission
const approvalEvent = {
  kind: 30078,  // NIP-78: Application-specific data
  tags: [
    ['d', `route-${submissionId}`],         // Unique identifier
    ['t', 'anmore-bike'],                   // App tag
    ['category', 'trail'],                  // Route category
    ['status', 'active'],                   // Active route
    ['name', 'Eagle Ridge Trail'],          // Route name
    ['contributor', userNpub],              // Original submitter
    ['approved_at', Math.floor(Date.now() / 1000).toString()]
  ],
  content: JSON.stringify({
    geoJSON: submissionData.geoJSON,
    description: 'Beautiful intermediate trail',
    approvalNote: 'Approved for fall construction',
    adminName: 'Trail Committee'
  })
};

const signedEvent = finalizeEvent(approvalEvent, adminSecretKey);
await pool.publish(RELAYS, signedEvent);
```

**Why kind:30078 instead of 30023?**
- ✅ NIP-78 is designed for application-specific data
- ✅ Parameterized replaceable (can update route status)
- ✅ Better semantic fit than "long-form content" (30023)
- ✅ Already implemented in existing `routes.ts`

---

### Use Case 3: User Receives Approval Notification

**Why Nostr?**
- ✅ No email infrastructure needed
- ✅ Real-time push notifications
- ✅ User controls notification settings

**Implementation:**
```javascript
// Admin sends notification as public mention
const notification = {
  kind: 1,
  tags: [
    ['p', submitterPubkey],  // Mention user
    ['e', approvalEventId],  // Reference approval event
    ['t', 'anmore-bike-approval']
  ],
  content: `Your trail proposal "Eagle Ridge Trail" has been approved! 🎉\n\nView it on the map: https://anmore.bike`
};

await pool.publish(RELAYS, finalizeEvent(notification, adminSecretKey));
```

**User subscribes to notifications:**
```javascript
// In user's client
pool.subscribeMany(
  RELAYS,
  [{
    kinds: [1],
    '#p': [userPubkey],
    '#t': ['anmore-bike-approval'],
    since: Math.floor(Date.now() / 1000) - 86400  // Last 24h
  }],
  {
    onevent(event) {
      showNotification(event.content);
    }
  }
);
```

---

### Use Case 4: Audit Trail & Transparency

**Why Nostr?**
- ✅ Anyone can query approval history
- ✅ Cryptographic proof of admin actions
- ✅ Community can verify legitimacy

**Query Example:**
```javascript
// Anyone can query all approved routes
const approvals = await pool.querySync(RELAYS, {
  kinds: [30078],
  authors: [adminPubkey],
  '#t': ['anmore-bike'],
  '#status': ['active']
});

console.log(`Found ${approvals.length} approved routes`);
console.log(`All signed by admin: ${adminNpub}`);
```

---

## 3. Nostr Anti-Patterns (What Doesn't Work)

### ❌ Anti-Pattern 1: Using Nostr as Primary Database

**Why This Fails:**
```javascript
// ❌ BAD: Query Nostr every page load
async function loadMap() {
  const routes = await loadApprovedRoutes('all');  // Queries Nostr relays
  routes.forEach(route => {
    L.geoJSON(route.geoJSON).addTo(map);
  });
}
```

**Problems:**
1. **Slow Performance**: Relay queries take 2-5 seconds
2. **Unreliable**: Relays can be down or rate-limited
3. **No Caching**: Every user hits relays independently
4. **Bandwidth Waste**: Re-downloads same data constantly

**✅ CORRECT APPROACH:**
```javascript
// ✅ GOOD: Load from static GeoJSON file
async function loadMap() {
  const response = await fetch('/approved-layers/trails.geojson');
  const geojson = await response.json();  // Fast, cached by CDN
  L.geoJSON(geojson).addTo(map);
}
```

**How to Build Static Files:**
```bash
# Run build script periodically (GitHub Actions, cron, manual)
node scripts/build-layers.js  # Queries Nostr once, outputs GeoJSON
```

---

### ❌ Anti-Pattern 2: Relying on Relay Persistence

**Why This Fails:**
- Relay operators can delete old events anytime
- No SLA guarantees for free public relays
- Data can disappear without warning

**✅ CORRECT APPROACH:**
- Use Nostr for **workflow events** (submissions, approvals)
- Immediately export approved routes to **permanent storage**:
  - Static GeoJSON files (committed to Git)
  - PostgreSQL/PostGIS database
  - OSM exports

**Backup Strategy:**
```javascript
// After admin approves, immediately save to Git
async function approveAndBackup(submission) {
  // 1. Publish approval to Nostr
  const approvalEvent = await publishApproval(submission);
  
  // 2. IMMEDIATELY save to static file
  await saveToGeoJSON(submission.geoJSON);
  
  // 3. Commit to Git (permanent backup)
  await exec('git add public/approved-layers/*.geojson');
  await exec('git commit -m "Add approved route: ${submission.name}"');
  await exec('git push');
}
```

---

### ❌ Anti-Pattern 3: Spatial Queries via Nostr

**Why This Fails:**
```javascript
// ❌ BAD: Trying to filter routes by location
const nearbyRoutes = await pool.querySync(RELAYS, {
  kinds: [30078],
  // No way to filter by bounding box!
});

// Must download ALL routes and filter client-side
const filtered = nearbyRoutes.filter(route => {
  const coords = route.content.geoJSON.coordinates;
  return isInBounds(coords, boundingBox);  // Expensive!
});
```

**✅ CORRECT APPROACH (Option A: Static Files with Client-Side Turf.js):**
```javascript
// Load GeoJSON once, use spatial libraries
import * as turf from '@turf/turf';

const allRoutes = await fetch('/approved-layers/trails.geojson').then(r => r.json());
const nearbyRoutes = turf.pointsWithinPolygon(allRoutes, searchArea);
```

**✅ CORRECT APPROACH (Option B: PostGIS Database):**
```sql
-- Server-side spatial query (if using PostGIS backend)
SELECT * FROM approved_routes
WHERE ST_DWithin(
  geometry::geography,
  ST_MakePoint(-122.8565, 49.3257)::geography,
  5000  -- 5km radius
);
```

---

## 4. Event Types & Workflow

### Event Kind Summary

| Event Kind | Purpose | Example | Encrypted? | Who Signs? |
|------------|---------|---------|------------|------------|
| **4** | User submission | Trail proposal DM | ✅ Yes (NIP-04) | User |
| **30078** | Admin approval | Approved route publication | ❌ No (public) | Admin |
| **1** | Notification | Approval/rejection notice | ❌ No (public mention) | Admin |
| **1** (reply) | User comment | Community feedback (future) | ❌ No | User |

### Why kind:30078 for Approvals?

**Parameterized Replaceable Events (NIP-33):**
- Can update route status (active → archived)
- Unique `d` tag prevents duplicates
- Latest version automatically replaces old

**Example Update:**
```javascript
// Original approval
{
  kind: 30078,
  tags: [['d', 'route-abc123'], ['status', 'active']],
  content: '{"geoJSON": ...}'
}

// Later: Mark as archived
{
  kind: 30078,
  tags: [['d', 'route-abc123'], ['status', 'archived']],
  content: '{"geoJSON": ..., "archiveReason": "Trail closed for maintenance"}'
}
// Same 'd' tag → replaces original event on relays
```

---

## 5. Submission Workflow

### Step-by-Step: User Submits Route

```
┌──────────────┐
│ 1. User      │
│ draws route  │
│ on map       │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ 2. JavaScript        │
│ generates GeoJSON    │
│ + form metadata      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ 3. Encrypt with      │
│ NIP-04 (user nsec    │
│ + admin npub)        │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ 4. Publish kind:4    │
│ DM to 4 relays       │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ 5. Store submission  │
│ ID in localStorage   │
│ for tracking         │
└──────────────────────┘
```

### Code Implementation

**1. Generate Submission Data:**
```typescript
// src/lib/submission.ts
import { v4 as uuidv4 } from 'uuid';

export interface SubmissionData {
  submissionId: string;
  timestamp: number;
  formType: 'trail-building' | 'pump-track' | 'bike-train';
  geoJSON: any;
  metadata: Record<string, any>;
  submitter: {
    npub: string;
    name: string;
    email?: string;
  };
}

export function createSubmission(
  formType: string,
  geoJSON: any,
  metadata: any,
  profile: any,
  email?: string
): SubmissionData {
  const submissionId = uuidv4();
  
  return {
    submissionId,
    timestamp: Date.now(),
    formType: formType as any,
    geoJSON,
    metadata,
    submitter: {
      npub: profile.npub,
      name: profile.name || 'bikeuser',
      email
    }
  };
}
```

**2. Encrypt and Send:**
```typescript
// src/lib/nostr.ts (already implemented)
export async function sendEncryptedDM(
  secretKey: Uint8Array,
  message: string,
  onProgress?: (status: string) => void
): Promise<boolean> {
  // See existing implementation in nostr.ts
  // Handles NIP-04 encryption + relay publishing
}
```

**3. Track Submission Locally:**
```typescript
// src/lib/submission-tracker.ts
export interface SubmissionTracking {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  formType: string;
  submittedAt: number;
  name: string;
}

export function trackSubmission(submission: SubmissionData): void {
  const tracking: SubmissionTracking = {
    id: submission.submissionId,
    status: 'pending',
    formType: submission.formType,
    submittedAt: submission.timestamp,
    name: submission.metadata.name || 'Unnamed'
  };
  
  localStorage.setItem(
    `submission_${submission.submissionId}`,
    JSON.stringify(tracking)
  );
}

export function getMySubmissions(): SubmissionTracking[] {
  const submissions: SubmissionTracking[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('submission_')) {
      const data = localStorage.getItem(key);
      if (data) {
        submissions.push(JSON.parse(data));
      }
    }
  }
  
  return submissions.sort((a, b) => b.submittedAt - a.submittedAt);
}
```

---

## 6. Admin Processing Workflow

### Step-by-Step: Admin Reviews Submission

```
┌──────────────────────┐
│ 1. Admin runs        │
│ monitor.js script    │
│ OR opens admin UI    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ 2. Query kind:4 DMs  │
│ sent to admin npub   │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ 3. Decrypt with      │
│ admin nsec (NIP-04)  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ 4. Display           │
│ submission details   │
│ + map preview        │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ 5. Admin decision:   │
│ Approve / Reject     │
└──────┬───────────────┘
       │
       ├─── APPROVE ────▶┌──────────────────────┐
       │                 │ 6a. Publish kind:    │
       │                 │ 30078 approval event │
       │                 └──────┬───────────────┘
       │                        │
       │                        ▼
       │                 ┌──────────────────────┐
       │                 │ 7a. Save to static   │
       │                 │ GeoJSON file         │
       │                 └──────┬───────────────┘
       │                        │
       │                        ▼
       │                 ┌──────────────────────┐
       │                 │ 8a. Send kind:1      │
       │                 │ approval notice      │
       │                 └──────────────────────┘
       │
       └─── REJECT ────▶┌──────────────────────┐
                        │ 6b. Send kind:1      │
                        │ rejection notice     │
                        │ with feedback        │
                        └──────────────────────┘
```

### Code Implementation

**1. Monitor Submissions (Existing):**
```javascript
// scripts/monitor.js (already implemented)
// Runs continuously, decrypts incoming DMs
// Displays formatted HTML + GeoJSON
```

**2. Approval Function:**
```typescript
// scripts/admin-approve.ts
import { finalizeEvent } from 'nostr-tools/pure';
import { SimplePool } from 'nostr-tools/pool';
import * as nip19 from 'nostr-tools/nip19';
import { RELAYS, ADMIN_NPUB } from '../src/lib/config.ts';

export async function approveSubmission(
  submissionData: SubmissionData,
  adminNsec: string,
  approvalNote?: string
): Promise<string> {
  // Decode admin nsec
  const decoded = nip19.decode(adminNsec);
  const adminSecretKey = decoded.data as Uint8Array;
  
  // Create approval event
  const approvalEvent = {
    kind: 30078,
    tags: [
      ['d', `route-${submissionData.submissionId}`],
      ['t', 'anmore-bike'],
      ['category', submissionData.formType],
      ['status', 'active'],
      ['name', submissionData.metadata.name],
      ['contributor', submissionData.submitter.npub],
      ['approved_at', Math.floor(Date.now() / 1000).toString()]
    ],
    content: JSON.stringify({
      geoJSON: submissionData.geoJSON,
      description: submissionData.metadata.description || '',
      approvalNote: approvalNote || 'Approved',
      adminName: 'Trail Committee',
      metadata: submissionData.metadata
    }),
    created_at: Math.floor(Date.now() / 1000)
  };
  
  // Sign and publish
  const signedEvent = finalizeEvent(approvalEvent, adminSecretKey);
  const pool = new SimplePool();
  
  try {
    await pool.publish(RELAYS, signedEvent);
    console.log(`✅ Published approval: ${signedEvent.id}`);
    return signedEvent.id;
  } finally {
    pool.close(RELAYS);
  }
}
```

**3. Build Static Files:**
```typescript
// scripts/build-layers.ts
import { SimplePool } from 'nostr-tools/pool';
import * as nip19 from 'nostr-tools/nip19';
import { writeFile, mkdir } from 'fs/promises';
import { RELAYS, ADMIN_NPUBS } from '../src/lib/config.ts';

export async function buildStaticLayers(): Promise<void> {
  const pool = new SimplePool();
  
  // Get admin pubkeys in hex
  const adminPubkeys = ADMIN_NPUBS.map(npub => {
    const decoded = nip19.decode(npub);
    return decoded.data as string;
  });
  
  // Query all approved routes
  const events = await pool.querySync(RELAYS, {
    kinds: [30078],
    authors: adminPubkeys,
    '#t': ['anmore-bike'],
    '#status': ['active']
  });
  
  console.log(`Found ${events.length} approved routes`);
  
  // Group by category
  const layers: Record<string, any[]> = {
    'trail': [],
    'pump-track': [],
    'bike-train': []
  };
  
  events.forEach(event => {
    const categoryTag = event.tags.find(t => t[0] === 'category');
    const category = categoryTag?.[1];
    
    if (!category || !layers[category]) return;
    
    try {
      const content = JSON.parse(event.content);
      const nameTag = event.tags.find(t => t[0] === 'name');
      const approvedAtTag = event.tags.find(t => t[0] === 'approved_at');
      
      layers[category].push({
        type: 'Feature',
        id: event.id,
        geometry: content.geoJSON.geometry || content.geoJSON,
        properties: {
          name: nameTag?.[1],
          description: content.description,
          approvedAt: new Date(parseInt(approvedAtTag?.[1] || '0') * 1000).toISOString(),
          ...content.metadata
        }
      });
    } catch (error) {
      console.error(`Error parsing event ${event.id}:`, error);
    }
  });
  
  // Write GeoJSON files
  await mkdir('public/approved-layers', { recursive: true });
  
  for (const [category, features] of Object.entries(layers)) {
    const geojson = {
      type: 'FeatureCollection',
      metadata: {
        generated: new Date().toISOString(),
        count: features.length,
        category
      },
      features
    };
    
    const filename = `public/approved-layers/${category}s.geojson`;
    await writeFile(filename, JSON.stringify(geojson, null, 2));
    console.log(`✅ Wrote ${features.length} features to ${filename}`);
  }
  
  pool.close(RELAYS);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildStaticLayers().catch(console.error);
}
```

**4. Notify User:**
```typescript
// scripts/send-notification.ts
export async function notifyApproval(
  submitterNpub: string,
  routeName: string,
  approvalEventId: string,
  adminNsec: string
): Promise<void> {
  const decoded = nip19.decode(adminNsec);
  const adminSecretKey = decoded.data as Uint8Array;
  
  const submitterDecoded = nip19.decode(submitterNpub);
  const submitterPubkey = submitterDecoded.data as string;
  
  const notification = {
    kind: 1,
    tags: [
      ['p', submitterPubkey],
      ['e', approvalEventId],
      ['t', 'anmore-bike-approval']
    ],
    content: `🎉 Your route "${routeName}" has been approved!\n\nView it on the map: https://anmore.bike\n\nThank you for contributing to Anmore.bike!`,
    created_at: Math.floor(Date.now() / 1000)
  };
  
  const signed = finalizeEvent(notification, adminSecretKey);
  const pool = new SimplePool();
  
  try {
    await pool.publish(RELAYS, signed);
    console.log(`✅ Sent notification to ${submitterNpub}`);
  } finally {
    pool.close(RELAYS);
  }
}
```

---

## 7. Notification System

### User Notification Flow

**1. User Subscribes to Notifications:**
```typescript
// src/lib/notifications.ts
import { SimplePool } from 'nostr-tools/pool';
import * as nip19 from 'nostr-tools/nip19';
import { RELAYS } from './config.ts';

export function subscribeToNotifications(
  userNpub: string,
  onNotification: (message: string, eventId: string) => void
): () => void {
  const decoded = nip19.decode(userNpub);
  const userPubkey = decoded.data as string;
  
  const pool = new SimplePool();
  
  const sub = pool.subscribeMany(
    RELAYS,
    [{
      kinds: [1],
      '#p': [userPubkey],
      '#t': ['anmore-bike-approval', 'anmore-bike-rejection'],
      since: Math.floor(Date.now() / 1000) - 86400  // Last 24h
    }],
    {
      onevent(event) {
        console.log('📬 New notification:', event.content);
        onNotification(event.content, event.id);
      }
    }
  );
  
  return () => {
    sub.close();
    pool.close(RELAYS);
  };
}
```

**2. Display Notifications in UI:**
```astro
---
// src/pages/my-submissions.astro
---
<Layout title="My Submissions">
  <div id="notifications"></div>
  <div id="submissions-list"></div>
</Layout>

<script>
  import { subscribeToNotifications } from '../lib/notifications.ts';
  import { getStoredProfile } from '../lib/profile.ts';
  
  const profile = getStoredProfile();
  if (profile?.npub) {
    const cleanup = subscribeToNotifications(
      profile.npub,
      (message, eventId) => {
        // Show notification banner
        const banner = document.createElement('div');
        banner.className = 'notification-banner';
        banner.innerHTML = `
          <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            ${message}
          </div>
        `;
        document.getElementById('notifications')?.appendChild(banner);
        
        // Update submission status in localStorage
        updateSubmissionStatus(eventId);
      }
    );
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanup);
  }
</script>
```

---

## 8. Integration with Main Architecture

### Architecture Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                      USER BROWSER                              │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐   │
│  │ Submit Form  │  │ View Map      │  │ Track Submissions│   │
│  │ (Leaflet UI) │  │ (Leaflet +    │  │ (localStorage +  │   │
│  │              │  │  GeoJSON)     │  │  Nostr sub)      │   │
│  └──────┬───────┘  └───────┬───────┘  └────────┬─────────┘   │
└─────────┼──────────────────┼───────────────────┼──────────────┘
          │                  │                   │
          │ kind:4 DM        │ fetch()           │ kind:1 mentions
          │ (encrypted)      │                   │
          ▼                  ▼                   ▼
┌───────────────────────────────────────────────────────────────┐
│                    NOSTR PROTOCOL                              │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Relays: relay.anmore.me, relay.damus.io, nos.lol, ...  │  │
│  │                                                         │  │
│  │ Event Types:                                            │  │
│  │ • kind:4 → Encrypted submissions (user→admin)           │  │
│  │ • kind:30078 → Public approvals (admin→world)           │  │
│  │ • kind:1 → Notifications (admin→user)                   │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────┬──────────────────────────────────┬────────────────┘
            │                                  │
            │ monitor.js                       │
            │ (admin laptop)                   │
            ▼                                  │
┌─────────────────────────┐                   │
│  ADMIN PROCESSING       │                   │
│  ┌───────────────────┐  │                   │
│  │ Decrypt kind:4    │  │                   │
│  │ Review submission │  │                   │
│  │ Publish kind:30078│◀─┘                   │
│  │ Run build script  │                      │
│  └─────────┬─────────┘                      │
└────────────┼────────────┘                   │
             │                                 │
             │ build-layers.ts                 │
             ▼                                 │
┌─────────────────────────────────────────────┼────────────────┐
│              STATIC HOSTING (GitHub Pages)                    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ /approved-layers/trails.geojson         ◀────────────┘    │
│  │ /approved-layers/pump-tracks.geojson                       │
│  │ /approved-layers/bike-trains.geojson                       │
│  │                                                            │
│  │ Built from Nostr events, served as static files            │
│  │ ✅ Fast (CDN cached)                                       │
│  │ ✅ Reliable (not dependent on relays)                      │
│  │ ✅ Offline-friendly (PWA caching)                          │
│  └────────────────────────────────────────────────────────────┘
└───────────────────────────────────────────────────────────────┘
```

### Data Flow Summary

1. **Submission**: User → Nostr (kind:4 encrypted DM) → Admin
2. **Approval**: Admin → Nostr (kind:30078 public event) → Everyone can see
3. **Persistence**: build-layers.ts → Query Nostr → Generate GeoJSON → Commit to Git
4. **Display**: User visits site → Fetch static GeoJSON → Render on map (no Nostr query)
5. **Notification**: Admin → Nostr (kind:1 mention) → User (real-time subscription)

### Why This Works

- ✅ **Fast**: Map loads from static files (no relay queries)
- ✅ **Reliable**: Not dependent on relay availability
- ✅ **Transparent**: Anyone can verify approvals on Nostr
- ✅ **Private**: User submissions stay encrypted
- ✅ **Serverless**: No backend infrastructure needed
- ✅ **Decentralized**: Nostr for communication, Git for storage

---

## 9. Code Examples

### Example 1: Complete Submission Flow

```typescript
// src/pages/trail-building.astro
<script>
  import { createSubmission, trackSubmission } from '../lib/submission.ts';
  import { sendEncryptedDM } from '../lib/nostr.ts';
  import { getStoredKeypair } from '../lib/nostr.ts';
  import { getStoredProfile } from '../lib/profile.ts';
  
  async function handleSubmit(event: Event) {
    event.preventDefault();
    
    const formData = new FormData(event.target as HTMLFormElement);
    const profile = getStoredProfile();
    const keypair = getStoredKeypair();
    
    if (!keypair) {
      alert('Please create a profile first');
      return;
    }
    
    // 1. Create submission data
    const submission = createSubmission(
      'trail-building',
      drawnFeatures.toGeoJSON(),
      {
        name: formData.get('name'),
        surface: formData.get('surface'),
        difficulty: formData.get('difficulty'),
        // ... other fields
      },
      profile,
      formData.get('email') as string
    );
    
    // 2. Track locally
    trackSubmission(submission);
    
    // 3. Encrypt and send
    const success = await sendEncryptedDM(
      keypair.secretKey,
      JSON.stringify(submission),
      (status) => {
        document.getElementById('status')!.textContent = status;
      }
    );
    
    if (success) {
      alert(`✅ Submission sent! Tracking ID: ${submission.submissionId}`);
      window.location.href = '/my-submissions';
    } else {
      alert('❌ Failed to send submission. Please try again.');
    }
  }
  
  document.getElementById('trailForm')?.addEventListener('submit', handleSubmit);
</script>
```

### Example 2: Admin Approval Script

```typescript
// scripts/approve-route.ts
import { approveSubmission, buildStaticLayers, notifyApproval } from './admin-lib.ts';
import { readFileSync } from 'fs';

// Read submission from JSON file (exported from monitor.js)
const submissionData = JSON.parse(
  readFileSync('./pending/submission-abc123.json', 'utf-8')
);

const ADMIN_NSEC = process.env.ADMIN_NSEC!;

async function main() {
  console.log(`Approving: ${submissionData.metadata.name}`);
  
  // 1. Publish approval to Nostr
  const approvalEventId = await approveSubmission(
    submissionData,
    ADMIN_NSEC,
    'Looks great! Approved for construction.'
  );
  
  console.log(`✅ Published approval: ${approvalEventId}`);
  
  // 2. Rebuild static files
  console.log('🔨 Rebuilding static layers...');
  await buildStaticLayers();
  
  // 3. Notify submitter
  await notifyApproval(
    submissionData.submitter.npub,
    submissionData.metadata.name,
    approvalEventId,
    ADMIN_NSEC
  );
  
  console.log('✅ Done!');
}

main().catch(console.error);
```

### Example 3: Query Submission Status

```typescript
// src/lib/submission-status.ts
import { SimplePool } from 'nostr-tools/pool';
import * as nip19 from 'nostr-tools/nip19';
import { RELAYS, ADMIN_NPUBS } from './config.ts';

export async function checkSubmissionStatus(
  submissionId: string
): Promise<'pending' | 'approved' | 'rejected' | null> {
  const pool = new SimplePool();
  
  // Get admin pubkeys
  const adminPubkeys = ADMIN_NPUBS.map(npub => {
    const decoded = nip19.decode(npub);
    return decoded.data as string;
  });
  
  // Query for approval with matching submission ID
  const events = await pool.querySync(RELAYS, {
    kinds: [30078],
    authors: adminPubkeys,
    '#d': [`route-${submissionId}`]
  });
  
  pool.close(RELAYS);
  
  if (events.length === 0) {
    return 'pending';  // No approval event found yet
  }
  
  const statusTag = events[0].tags.find(t => t[0] === 'status');
  return statusTag?.[1] === 'active' ? 'approved' : 'rejected';
}
```

---

## 10. Security Considerations

### 1. Admin Key Management

**✅ GOOD: Use Dedicated Admin Key**
```bash
# Generate admin keypair offline
npx nostr-keygen

# Store nsec in password manager (1Password, Bitwarden)
# Use environment variable, never commit to Git
echo "ADMIN_NSEC=nsec1..." >> .env
```

**❌ BAD: Hardcode nsec in Code**
```typescript
// ❌ NEVER DO THIS
const ADMIN_NSEC = 'nsec1qpqp...';  // Exposed in Git history!
```

### 2. Validate Submissions Before Approval

```typescript
function validateSubmission(data: SubmissionData): string[] {
  const errors: string[] = [];
  
  // Check required fields
  if (!data.geoJSON || !data.geoJSON.geometry) {
    errors.push('Missing geometry data');
  }
  
  // Validate GeoJSON structure
  if (data.geoJSON.type !== 'Feature' && data.geoJSON.type !== 'FeatureCollection') {
    errors.push('Invalid GeoJSON type');
  }
  
  // Check coordinates within Anmore bounds
  const bounds = { minLat: 49.30, maxLat: 49.35, minLng: -122.90, maxLng: -122.82 };
  if (!isWithinBounds(data.geoJSON.geometry.coordinates, bounds)) {
    errors.push('Route outside Anmore area');
  }
  
  // Validate metadata
  if (!data.metadata.name || data.metadata.name.length < 3) {
    errors.push('Route name too short');
  }
  
  // Sanitize text fields
  const sanitized = DOMPurify.sanitize(data.metadata.name);
  if (sanitized !== data.metadata.name) {
    errors.push('Invalid characters in name');
  }
  
  return errors;
}
```

### 3. Rate Limiting (Client-Side)

```typescript
const COOLDOWN_MS = 5 * 60 * 1000;  // 5 minutes

function checkSubmissionCooldown(): void {
  const lastSubmission = localStorage.getItem('last_submission_time');
  
  if (lastSubmission) {
    const timeSince = Date.now() - parseInt(lastSubmission);
    
    if (timeSince < COOLDOWN_MS) {
      const minutesLeft = Math.ceil((COOLDOWN_MS - timeSince) / 60000);
      throw new Error(`Please wait ${minutesLeft} minutes before submitting again`);
    }
  }
  
  localStorage.setItem('last_submission_time', Date.now().toString());
}
```

### 4. Verify Admin Signatures

```typescript
import { verifyEvent } from 'nostr-tools/pure';
import { ADMIN_NPUBS } from './config.ts';

function isValidAdminApproval(event: Event): boolean {
  // 1. Verify event signature
  if (!verifyEvent(event)) {
    console.warn('Invalid signature:', event.id);
    return false;
  }
  
  // 2. Check author is authorized admin
  const authorNpub = nip19.npubEncode(event.pubkey);
  if (!ADMIN_NPUBS.includes(authorNpub)) {
    console.warn('Unauthorized admin:', authorNpub);
    return false;
  }
  
  // 3. Check event type and tags
  if (event.kind !== 30078) {
    return false;
  }
  
  const appTag = event.tags.find(t => t[0] === 't' && t[1] === 'anmore-bike');
  if (!appTag) {
    return false;
  }
  
  return true;
}
```

---

## Conclusion

This Nostr integration design follows a **hybrid approach**:

1. **Nostr for Communication**: Submissions, approvals, notifications (what it's good at)
2. **Static Files for Display**: Fast, reliable, CDN-cached GeoJSON (what works best)
3. **Git for Persistence**: Permanent backup, version control (belt-and-suspenders)

**Key Takeaway**: Use each technology for its strengths. Nostr enables decentralized, private communication. Static files enable fast, reliable display. Together, they create a robust, serverless architecture.

---

## Next Steps

1. ✅ Review existing `routes.ts` implementation (already uses kind:30078)
2. ✅ Create `build-layers.ts` script to generate static GeoJSON
3. ✅ Set up GitHub Actions to auto-rebuild on approvals
4. ✅ Implement notification system (`subscribeToNotifications()`)
5. ✅ Build admin UI for approval workflow
6. ✅ Test end-to-end: Submit → Approve → Display

**Questions?** Review the code examples above or consult the [Nostr NIPs](https://github.com/nostr-protocol/nips).
