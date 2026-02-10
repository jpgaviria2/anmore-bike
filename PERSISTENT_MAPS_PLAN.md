# Persistent Map Layers Implementation Plan
## Anmore.bike - Admin-Approved Route Display System

**Created:** 2026-02-10  
**Goal:** Transform submission-only forms into a crowdsourced mapping platform where ALL users can see admin-approved routes, trails, and features.

---

## 🎯 Executive Summary

**Current State:**
- Users submit trail/route proposals via encrypted Nostr DMs (kind:4)
- Submissions include GeoJSON map data
- Admin receives encrypted submissions via monitor.js
- **No persistence:** Map drawings are session-only
- **No public display:** Other users can't see approved routes

**Target State:**
- **Persistent storage:** Approved routes stored as public Nostr events
- **Admin workflow:** Review → Approve/Reject → Publish
- **Public display:** ALL users see approved routes on interactive maps
- **Real-time updates:** New approvals appear automatically
- **Layered maps:** Toggle different route types (trails, pump tracks, bike trains)

---

## 📐 Architecture Overview

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER SUBMISSION FLOW                        │
└─────────────────────────────────────────────────────────────────┘

1. User draws route on map (Leaflet + Leaflet.draw)
   └─> GeoJSON created with properties (surface, difficulty, etc.)

2. User fills form + submits
   └─> Encrypted DM (kind:4) to admin npub
   └─> Includes: GeoJSON, form data, user profile

3. Admin receives via monitor.js
   └─> Decrypts DM
   └─> Reviews submission

┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN APPROVAL FLOW                          │
└─────────────────────────────────────────────────────────────────┘

4. Admin reviews submission in web dashboard
   └─> See map preview, form data, contributor info

5. Admin approves or rejects
   └─> APPROVE: Creates public Nostr event (kind:30078)
       ├─> Event contains GeoJSON + metadata
       ├─> Tagged with category (trail/pump-track/bike-train)
       ├─> Includes approval timestamp + admin note
       └─> Published to relays
   └─> REJECT: Sends encrypted DM back to user with reason

┌─────────────────────────────────────────────────────────────────┐
│                   PUBLIC DISPLAY FLOW                           │
└─────────────────────────────────────────────────────────────────┘

6. ALL users load map page
   └─> Query relays for approved routes (kind:30078)
   └─> Filter by admin pubkey + category tags
   └─> Parse GeoJSON from events

7. Display routes on Leaflet map
   └─> Base layer: OpenStreetMap tiles
   └─> Overlay layers: Approved routes (colored by type)
   └─> Click popup: Route details, contributor, approval date
   └─> Layer control: Toggle route types on/off

8. Real-time updates
   └─> Subscribe to relay for new approvals
   └─> Auto-add new routes without refresh
```

---

## 🔧 Technical Implementation

### 1. Nostr Event Structure for Approved Routes

**Use NIP-78: Application-Specific Data (kind:30078)**  
Parameterized Replaceable Events with `d` tag for unique identification

```json
{
  "kind": 30078,
  "pubkey": "<admin_hex_pubkey>",
  "created_at": 1770763200,
  "content": "{\"geoJSON\": {...}, \"description\": \"...\", \"approvalNote\": \"...\"}",
  "tags": [
    ["d", "<unique_route_id>"],
    ["t", "anmore-bike"],
    ["t", "trail-building"],
    ["category", "trail"],
    ["name", "Ridge Runner Trail"],
    ["contributor", "<user_npub>"],
    ["approved_at", "1770763200"],
    ["status", "active"]
  ]
}
```

**Why kind:30078?**
- Parameterized replaceable: Admin can update/modify routes
- Application-specific: Won't pollute general Nostr feeds
- Queryable by tags: Easy filtering by category/status

**Content JSON Structure:**
```json
{
  "geoJSON": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "LineString",
          "coordinates": [[-122.85, 49.32], [-122.86, 49.33]]
        },
        "properties": {
          "name": "Ridge Runner Trail",
          "surface": "compacted",
          "mtb:scale": "2",
          "difficulty": "intermediate",
          "width": "1.5",
          "trail_visibility": "good",
          "access": "yes"
        }
      }
    ]
  },
  "description": "New intermediate trail connecting...",
  "approvalNote": "Great proposal, approved for 2026 build season",
  "adminName": "TORCA Admin",
  "originalSubmission": {
    "timestamp": 1770700000,
    "contributor": "npub1..."
  }
}
```

### 2. Database Schema (Alternative: Nostr-Only vs Hybrid)

#### Option A: Pure Nostr (Recommended for MVP)

**Pros:**
- No backend infrastructure
- Truly decentralized
- Censorship resistant
- Works with existing relay network

**Cons:**
- Depends on relay availability
- Query performance varies
- No SQL-style filtering

**Implementation:**
- Store approved routes as kind:30078 events
- Query relays on page load
- Cache in browser LocalStorage/IndexedDB
- Background sync for updates

#### Option B: Hybrid (Nostr + Database)

**Pros:**
- Fast queries
- Complex filtering
- Analytics dashboard
- Backup storage

**Cons:**
- Requires backend server
- Centralization point
- Hosting costs
- Goes against "0 infrastructure" goal

**Implementation:**
- Nostr events remain source of truth
- Database mirrors approved routes
- Sync service listens to relays
- Public API for queries

**Recommendation:** Start with **Option A (Pure Nostr)** for MVP. Add database only if performance becomes issue.

### 3. Admin Dashboard

**New Page:** `src/pages/admin.astro`

**Features:**
- Login with admin nsec (stored in LocalStorage)
- Query relays for pending submissions (kind:4 DMs)
- Decrypt with admin private key
- Display submissions in card grid:
  - Map preview (Leaflet)
  - Form data table
  - Contributor profile
  - Approve/Reject buttons

**Approval Flow:**
```javascript
async function approveSubmission(submission) {
  // 1. Parse GeoJSON from submission
  const geoJSON = submission.geoJSON;
  
  // 2. Create content object
  const content = {
    geoJSON,
    description: submission.formData.description,
    approvalNote: adminNote, // from textarea
    adminName: adminProfile.name,
    originalSubmission: {
      timestamp: submission.timestamp,
      contributor: submission.profile.npub
    }
  };
  
  // 3. Create event
  const event = {
    kind: 30078,
    content: JSON.stringify(content),
    tags: [
      ['d', generateRouteId()], // unique ID
      ['t', 'anmore-bike'],
      ['t', 'trail-building'],
      ['category', submission.formType], // trail/pump-track/bike-train
      ['name', submission.formData.trailName],
      ['contributor', submission.profile.npub],
      ['approved_at', Math.floor(Date.now() / 1000).toString()],
      ['status', 'active']
    ]
  };
  
  // 4. Sign and publish
  const signedEvent = finalizeEvent(event, adminSecretKey);
  await pool.publish(RELAYS, signedEvent);
  
  // 5. Send confirmation DM to contributor
  await sendEncryptedDM(
    adminSecretKey,
    `Your ${submission.formType} "${submission.formData.trailName}" has been approved!`,
    submission.profile.npub
  );
}
```

**Rejection Flow:**
```javascript
async function rejectSubmission(submission, reason) {
  // Send encrypted DM with rejection reason
  await sendEncryptedDM(
    adminSecretKey,
    `Your ${submission.formType} submission was not approved. Reason: ${reason}`,
    submission.profile.npub
  );
  
  // Mark as reviewed in local tracking (IndexedDB)
  await markAsReviewed(submission.id, 'rejected');
}
```

### 4. Public Map Display (Updated Pages)

**Update ALL map pages:**
- `src/pages/trail-building.astro`
- `src/pages/pump-track.astro`
- `src/pages/bike-train.astro`

**New Feature: Load Approved Routes**

```javascript
// src/lib/routes.ts
import { SimplePool } from 'nostr-tools/pool';
import { RELAYS, ADMIN_NPUB } from './config.ts';
import * as nip19 from 'nostr-tools/nip19';

export async function loadApprovedRoutes(category: string) {
  const pool = new SimplePool();
  const adminPubkey = nip19.decode(ADMIN_NPUB).data as string;
  
  // Query for approved routes
  const filter = {
    kinds: [30078],
    authors: [adminPubkey],
    '#t': ['anmore-bike'],
    '#category': [category],
    '#status': ['active']
  };
  
  const events = await pool.querySync(RELAYS, filter);
  pool.close(RELAYS);
  
  // Parse routes
  return events.map(event => {
    const content = JSON.parse(event.content);
    const name = event.tags.find(t => t[0] === 'name')?.[1] || 'Unnamed';
    const contributor = event.tags.find(t => t[0] === 'contributor')?.[1];
    const approvedAt = event.tags.find(t => t[0] === 'approved_at')?.[1];
    
    return {
      id: event.id,
      name,
      geoJSON: content.geoJSON,
      description: content.description,
      approvalNote: content.approvalNote,
      contributor,
      approvedAt: new Date(parseInt(approvedAt) * 1000),
      category
    };
  });
}
```

**Map Display Implementation:**

```javascript
// In trail-building.astro <script> section
import { loadApprovedRoutes } from '../lib/routes.ts';

// After map initialization
const approvedRoutes = await loadApprovedRoutes('trail');

// Create layer group for approved routes
const approvedLayer = L.layerGroup();

// Add routes to map
approvedRoutes.forEach(route => {
  const geoJSONLayer = L.geoJSON(route.geoJSON, {
    style: {
      color: '#059669', // green for approved
      weight: 4,
      opacity: 0.7
    },
    onEachFeature: (feature, layer) => {
      // Add popup with route details
      layer.bindPopup(`
        <div class="route-popup">
          <h3>${route.name}</h3>
          <p><strong>Status:</strong> Approved</p>
          <p><strong>Approved:</strong> ${route.approvedAt.toLocaleDateString()}</p>
          <p>${route.description}</p>
          ${route.approvalNote ? `<p><em>Admin Note: ${route.approvalNote}</em></p>` : ''}
          ${route.contributor ? `<p class="text-sm">Proposed by: ${route.contributor}</p>` : ''}
        </div>
      `);
    }
  });
  
  geoJSONLayer.addTo(approvedLayer);
});

// Add layer control
const overlays = {
  'Approved Routes': approvedLayer,
  'Your Drawing': drawnItems
};

L.control.layers(null, overlays, { collapsed: false }).addTo(map);

// Auto-add approved layer
approvedLayer.addTo(map);
```

**Visual Differentiation:**
- **Approved routes:** Green (solid), thicker lines
- **User drawings:** Blue (dashed), thinner lines
- **Pending submissions:** Orange (dotted), medium weight

### 5. Real-Time Updates

**Subscribe to relay for new approvals:**

```javascript
// src/lib/realtime.ts
import { SimplePool } from 'nostr-tools/pool';

export function subscribeToApprovals(category: string, onNewRoute: (route) => void) {
  const pool = new SimplePool();
  const adminPubkey = nip19.decode(ADMIN_NPUB).data as string;
  
  const sub = pool.subscribeMany(
    RELAYS,
    [
      {
        kinds: [30078],
        authors: [adminPubkey],
        '#t': ['anmore-bike'],
        '#category': [category],
        '#status': ['active'],
        since: Math.floor(Date.now() / 1000) // only new events
      }
    ],
    {
      onevent(event) {
        // Parse and callback
        const content = JSON.parse(event.content);
        const route = {
          id: event.id,
          name: event.tags.find(t => t[0] === 'name')?.[1],
          geoJSON: content.geoJSON,
          description: content.description,
          // ... other fields
        };
        onNewRoute(route);
      },
      oneose() {
        console.log('Subscription active, listening for new approvals');
      }
    }
  );
  
  // Return unsubscribe function
  return () => {
    sub.close();
    pool.close(RELAYS);
  };
}
```

**Usage in map page:**

```javascript
// Subscribe to real-time updates
const unsubscribe = subscribeToApprovals('trail', (newRoute) => {
  // Add new route to map
  const geoJSONLayer = L.geoJSON(newRoute.geoJSON, {
    style: { color: '#059669', weight: 4, opacity: 0.7 },
    onEachFeature: (feature, layer) => {
      layer.bindPopup(`<h3>${newRoute.name}</h3><p>Just approved!</p>`);
    }
  });
  geoJSONLayer.addTo(approvedLayer);
  
  // Show notification
  showToast(`New trail approved: ${newRoute.name}`, 'success');
});

// Cleanup on page unload
window.addEventListener('beforeunload', unsubscribe);
```

### 6. Category-Specific Maps

**Create dedicated map pages for public viewing:**

**New Page:** `src/pages/maps/trails.astro`
- Display ONLY approved trails (no submission form)
- Full-screen map
- Filter sidebar: difficulty, surface, length
- Export to GPX/KML for GPS devices

**New Page:** `src/pages/maps/pump-tracks.astro`
- Display all approved pump track locations
- Polygon overlays with colors by skill level
- Click for details: surface, features, dimensions

**New Page:** `src/pages/maps/bike-trains.astro`
- Display all bike train routes
- Color-coded by school
- Show schedule, coordinator info in popup

**New Page:** `src/pages/maps/all.astro`
- Unified map with all categories
- Layer control to toggle each category
- Legend for route types

### 7. Search & Filter

**Add filter controls to map pages:**

```javascript
// Filter UI
<div class="filter-panel">
  <h3>Filter Routes</h3>
  
  <!-- Category filter -->
  <div>
    <label>Category</label>
    <select id="category-filter">
      <option value="all">All</option>
      <option value="trail">Trails</option>
      <option value="pump-track">Pump Tracks</option>
      <option value="bike-train">Bike Trains</option>
    </select>
  </div>
  
  <!-- Difficulty filter (for trails) -->
  <div id="difficulty-filter-group" class="hidden">
    <label>Difficulty</label>
    <select id="difficulty-filter">
      <option value="all">All</option>
      <option value="beginner">Beginner</option>
      <option value="intermediate">Intermediate</option>
      <option value="advanced">Advanced</option>
    </select>
  </div>
  
  <!-- Surface filter -->
  <div>
    <label>Surface</label>
    <select id="surface-filter">
      <option value="all">All</option>
      <option value="paved">Paved</option>
      <option value="compacted">Compacted</option>
      <option value="gravel">Gravel</option>
      <option value="dirt">Dirt</option>
    </select>
  </div>
  
  <!-- Text search -->
  <div>
    <label>Search</label>
    <input type="text" id="search-input" placeholder="Search by name...">
  </div>
</div>

<script>
  // Filter logic
  function applyFilters() {
    const category = document.getElementById('category-filter').value;
    const difficulty = document.getElementById('difficulty-filter').value;
    const surface = document.getElementById('surface-filter').value;
    const search = document.getElementById('search-input').value.toLowerCase();
    
    // Filter routes
    const filtered = allRoutes.filter(route => {
      if (category !== 'all' && route.category !== category) return false;
      if (difficulty !== 'all' && route.difficulty !== difficulty) return false;
      if (surface !== 'all' && route.surface !== surface) return false;
      if (search && !route.name.toLowerCase().includes(search)) return false;
      return true;
    });
    
    // Update map
    updateMapLayers(filtered);
  }
  
  // Attach listeners
  document.getElementById('category-filter').addEventListener('change', applyFilters);
  document.getElementById('difficulty-filter').addEventListener('change', applyFilters);
  document.getElementById('surface-filter').addEventListener('change', applyFilters);
  document.getElementById('search-input').addEventListener('input', applyFilters);
</script>
```

---

## 🎨 UI/UX Enhancements

### 1. Map Legend

```html
<div class="map-legend">
  <h4>Legend</h4>
  <div class="legend-item">
    <span class="legend-line" style="background: #059669;"></span>
    <span>Approved Trail</span>
  </div>
  <div class="legend-item">
    <span class="legend-line" style="background: #dc2626;"></span>
    <span>Pump Track</span>
  </div>
  <div class="legend-item">
    <span class="legend-line" style="background: #2563eb;"></span>
    <span>Bike Train Route</span>
  </div>
  <div class="legend-item">
    <span class="legend-marker">📍</span>
    <span>Trailhead / Point of Interest</span>
  </div>
</div>
```

### 2. Route Cards (Alternative to Map View)

```html
<div class="route-grid">
  {routes.map(route => (
    <div class="route-card">
      <div class="route-header">
        <h3>{route.name}</h3>
        <span class="badge">{route.category}</span>
      </div>
      <div class="route-thumbnail">
        <!-- Mini map preview -->
        <div id={`mini-map-${route.id}`}></div>
      </div>
      <div class="route-details">
        <p>{route.description}</p>
        <div class="route-meta">
          <span>📏 {route.length}m</span>
          <span>⚡ {route.difficulty}</span>
          <span>🏞️ {route.surface}</span>
        </div>
      </div>
      <div class="route-actions">
        <button onclick={`showOnMap('${route.id}')`}>View on Map</button>
        <button onclick={`exportGPX('${route.id}')`}>Download GPX</button>
      </div>
    </div>
  ))}
</div>
```

### 3. Notifications for Contributors

When admin approves user's submission:

```javascript
// In user's notification check (can run on heartbeat or page load)
async function checkApprovals(userNpub) {
  const pool = new SimplePool();
  const adminPubkey = nip19.decode(ADMIN_NPUB).data as string;
  
  // Query for approvals mentioning this user
  const filter = {
    kinds: [30078],
    authors: [adminPubkey],
    '#contributor': [userNpub],
    since: getLastCheckTimestamp()
  };
  
  const events = await pool.querySync(RELAYS, filter);
  
  if (events.length > 0) {
    // Show notification
    events.forEach(event => {
      const name = event.tags.find(t => t[0] === 'name')?.[1];
      showToast(`🎉 Your submission "${name}" has been approved!`, 'success', 5000);
    });
    
    // Update last check timestamp
    saveLastCheckTimestamp(Math.floor(Date.now() / 1000));
  }
}
```

---

## 🔐 Security & Privacy Considerations

### 1. Admin Authentication

**Multi-Admin Support:**
```javascript
// config.ts
export const ADMIN_NPUBS = [
  'npub1...', // TORCA Admin
  'npub2...', // Parks & Rec Admin
  'npub3...'  // Community Admin
];

// Verify admin
export function isAdmin(npub: string): boolean {
  return ADMIN_NPUBS.includes(npub);
}
```

**Admin Login:**
- Enter nsec on admin page
- Verify npub matches ADMIN_NPUBS list
- Store encrypted in LocalStorage with session timeout
- Clear on logout or after 24h

### 2. Edit & Delete Routes

**Admin can update routes (NIP-78 replaceability):**

```javascript
async function updateRoute(routeId, updates) {
  // Fetch existing event
  const existing = await fetchEventByDTag(routeId);
  
  // Merge updates
  const newContent = {
    ...JSON.parse(existing.content),
    ...updates
  };
  
  // Create new event with same 'd' tag (replaces old)
  const event = {
    kind: 30078,
    content: JSON.stringify(newContent),
    tags: existing.tags.map(tag => {
      // Update specific tags if needed
      if (tag[0] === 'name' && updates.name) return ['name', updates.name];
      return tag;
    })
  };
  
  // Sign and publish (auto-replaces due to same 'd' tag)
  await publishEvent(event);
}

async function deleteRoute(routeId) {
  // Update status to 'deleted'
  await updateRoute(routeId, { status: 'deleted' });
  
  // Or publish deletion event (NIP-09)
  const deleteEvent = {
    kind: 5,
    tags: [['e', routeId]],
    content: 'Route deleted by admin'
  };
  await publishEvent(deleteEvent);
}
```

### 3. Moderation

**Report Route (for any user):**

```javascript
async function reportRoute(routeId, reason) {
  // Send encrypted DM to admin
  const report = {
    type: 'report',
    routeId,
    reason,
    reportedBy: userNpub,
    timestamp: Date.now()
  };
  
  await sendEncryptedDM(
    userSecretKey,
    JSON.stringify(report),
    ADMIN_NPUB
  );
  
  showToast('Report submitted. Admins will review.', 'info');
}
```

**Admin Review Reports:**
- Shows in admin dashboard
- Mark route as under review
- Contact reporter if needed
- Take action: edit, delete, or dismiss report

---

## 📊 Analytics & Insights

### 1. Usage Stats Page

**New Page:** `src/pages/stats.astro`

**Metrics:**
- Total approved routes (by category)
- Top contributors (by approved submissions)
- Recent approvals timeline
- Map coverage heat map
- Popular routes (by views/clicks)

**Implementation:**
```javascript
// Query all approved routes
const allRoutes = await loadApprovedRoutes('all');

// Aggregate stats
const stats = {
  totalRoutes: allRoutes.length,
  byCategory: {
    trail: allRoutes.filter(r => r.category === 'trail').length,
    pumpTrack: allRoutes.filter(r => r.category === 'pump-track').length,
    bikeTrain: allRoutes.filter(r => r.category === 'bike-train').length
  },
  topContributors: aggregateByContributor(allRoutes),
  recentApprovals: allRoutes.slice(-10).reverse()
};
```

### 2. Export Options

**Bulk Export:**
- Download all approved routes as GeoJSON file
- Export to JOSM for OpenStreetMap contribution
- Generate KML for Google Earth
- CSV for spreadsheet analysis

```javascript
function exportAllRoutes(format = 'geojson') {
  const allRoutes = await loadApprovedRoutes('all');
  
  if (format === 'geojson') {
    const featureCollection = {
      type: 'FeatureCollection',
      features: allRoutes.flatMap(r => r.geoJSON.features)
    };
    downloadJSON(featureCollection, 'anmore-bike-routes.geojson');
  }
  
  if (format === 'kml') {
    const kml = convertGeoJSONToKML(allRoutes);
    downloadText(kml, 'anmore-bike-routes.kml');
  }
  
  if (format === 'csv') {
    const csv = convertToCSV(allRoutes);
    downloadText(csv, 'anmore-bike-routes.csv');
  }
}
```

---

## 🚀 Implementation Roadmap

### Phase 1: Core Persistence (Week 1-2)

**Tasks:**
1. ✅ Update `src/lib/config.ts` with ADMIN_NPUB
2. ✅ Create `src/lib/routes.ts` with loadApprovedRoutes()
3. ✅ Create `src/lib/realtime.ts` with subscribeToApprovals()
4. ✅ Update trail-building.astro to load & display approved routes
5. ✅ Add layer control (Approved vs Your Drawing)
6. ✅ Test: Submit → manually publish kind:30078 → verify display

**Deliverables:**
- Users can see approved trails on trail-building page
- Basic layer control works
- GeoJSON data renders correctly

### Phase 2: Admin Dashboard (Week 2-3)

**Tasks:**
1. ✅ Create `src/pages/admin.astro` with login
2. ✅ Build submission queue UI (decrypt kind:4 DMs)
3. ✅ Implement approve/reject buttons
4. ✅ Create approval flow (publish kind:30078)
5. ✅ Add admin notes and contributor notifications
6. ✅ Test: Submit → approve → verify public display

**Deliverables:**
- Functional admin dashboard
- Full approval workflow
- Contributor notifications working

### Phase 3: Multi-Category Support (Week 3-4)

**Tasks:**
1. ✅ Update pump-track.astro with approved routes
2. ✅ Update bike-train.astro with approved routes
3. ✅ Create unified maps pages (trails, pump-tracks, bike-trains, all)
4. ✅ Add category-specific styling (colors, line types)
5. ✅ Implement filter controls

**Deliverables:**
- All three categories support approved routes
- Dedicated map view pages
- Filter and search working

### Phase 4: Real-Time & Polish (Week 4-5)

**Tasks:**
1. ✅ Integrate subscribeToApprovals() on all map pages
2. ✅ Add toast notifications for new approvals
3. ✅ Create route cards (alternative to map view)
4. ✅ Build stats/analytics page
5. ✅ Add export functionality (GeoJSON, KML, CSV)
6. ✅ Implement edit/delete for admin
7. ✅ Add user report feature

**Deliverables:**
- Live updates without refresh
- Beautiful route cards
- Analytics dashboard
- Full admin control

### Phase 5: OpenStreetMap Integration (Week 5-6)

**Tasks:**
1. ✅ Create OSM export workflow documentation
2. ✅ Build GeoJSON → OSM XML converter
3. ✅ Add "Contribute to OSM" button on approved routes
4. ✅ Document changeset comment template
5. ✅ Create video tutorial for OSM contribution

**Deliverables:**
- Seamless OSM contribution workflow
- Community can add approved routes to OpenStreetMap
- Documentation for JOSM/iD editors

---

## 📝 Code Snippets

### Complete Admin Dashboard Skeleton

```astro
---
// src/pages/admin.astro
import Layout from '../layouts/Layout.astro';
import Navigation from '../components/Navigation.astro';
---

<Layout title="Admin Dashboard - Anmore.bike">
  <Navigation />
  
  <div class="container mx-auto px-4 py-8">
    <!-- Admin Login -->
    <div id="login-section" class="max-w-md mx-auto">
      <h1 class="text-3xl font-bold mb-4">Admin Login</h1>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold mb-2">Admin nsec</label>
          <input 
            type="password" 
            id="admin-nsec" 
            placeholder="nsec1..."
            class="w-full px-4 py-2 border rounded"
          />
        </div>
        <button 
          id="login-btn"
          class="w-full bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700"
        >
          Login
        </button>
        <p id="login-error" class="text-red-600 text-sm hidden"></p>
      </div>
    </div>
    
    <!-- Admin Panel (hidden until logged in) -->
    <div id="admin-panel" class="hidden">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">Pending Submissions</h1>
        <button 
          id="logout-btn"
          class="text-red-600 font-semibold hover:text-red-700"
        >
          Logout
        </button>
      </div>
      
      <!-- Submissions Grid -->
      <div id="submissions-grid" class="grid md:grid-cols-2 gap-6">
        <!-- Will be populated dynamically -->
      </div>
      
      <!-- Empty State -->
      <div id="empty-state" class="text-center py-12 hidden">
        <p class="text-gray-600 text-lg">No pending submissions</p>
      </div>
    </div>
  </div>
  
  <!-- Approval Modal -->
  <div id="approval-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center">
    <div class="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <h2 class="text-2xl font-bold mb-4" id="modal-title"></h2>
      
      <!-- Map Preview -->
      <div id="modal-map" class="h-[400px] mb-4 rounded border"></div>
      
      <!-- Form Data -->
      <div id="modal-details" class="space-y-2 mb-4"></div>
      
      <!-- Admin Note -->
      <div class="mb-4">
        <label class="block text-sm font-semibold mb-2">Admin Note (optional)</label>
        <textarea 
          id="admin-note"
          rows="3"
          class="w-full px-4 py-2 border rounded"
          placeholder="Add a note for the contributor..."
        ></textarea>
      </div>
      
      <!-- Actions -->
      <div class="flex gap-4">
        <button 
          id="approve-btn"
          class="flex-1 bg-green-600 text-white px-4 py-3 rounded font-bold hover:bg-green-700"
        >
          ✓ Approve
        </button>
        <button 
          id="reject-btn"
          class="flex-1 bg-red-600 text-white px-4 py-3 rounded font-bold hover:bg-red-700"
        >
          ✗ Reject
        </button>
        <button 
          id="close-modal-btn"
          class="px-6 py-3 border rounded font-semibold hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</Layout>

<script>
  import { decodeNsec, getStoredKeypair } from '../lib/nostr.ts';
  import { isAdmin, ADMIN_NPUBS } from '../lib/config.ts';
  // ... rest of admin logic
</script>
```

### Complete Route Display Code

```javascript
// src/lib/routes.ts
import { SimplePool } from 'nostr-tools/pool';
import { RELAYS, ADMIN_NPUBS } from './config.ts';
import * as nip19 from 'nostr-tools/nip19';

export interface ApprovedRoute {
  id: string;
  name: string;
  category: string;
  geoJSON: any;
  description: string;
  approvalNote?: string;
  contributor?: string;
  approvedAt: Date;
  adminName?: string;
  difficulty?: string;
  surface?: string;
  length?: number;
}

export async function loadApprovedRoutes(category: string = 'all'): Promise<ApprovedRoute[]> {
  const pool = new SimplePool();
  
  // Convert all admin npubs to hex pubkeys
  const adminPubkeys = ADMIN_NPUBS.map(npub => {
    const decoded = nip19.decode(npub);
    return decoded.data as string;
  });
  
  // Build filter
  const filter: any = {
    kinds: [30078],
    authors: adminPubkeys,
    '#t': ['anmore-bike'],
    '#status': ['active']
  };
  
  if (category !== 'all') {
    filter['#category'] = [category];
  }
  
  try {
    const events = await pool.querySync(RELAYS, filter);
    pool.close(RELAYS);
    
    // Parse and return
    return events.map(event => {
      const content = JSON.parse(event.content);
      
      return {
        id: event.id,
        name: event.tags.find(t => t[0] === 'name')?.[1] || 'Unnamed',
        category: event.tags.find(t => t[0] === 'category')?.[1] || 'unknown',
        geoJSON: content.geoJSON,
        description: content.description || '',
        approvalNote: content.approvalNote,
        contributor: event.tags.find(t => t[0] === 'contributor')?.[1],
        approvedAt: new Date(parseInt(event.tags.find(t => t[0] === 'approved_at')?.[1] || '0') * 1000),
        adminName: content.adminName,
        difficulty: content.geoJSON?.features?.[0]?.properties?.difficulty,
        surface: content.geoJSON?.features?.[0]?.properties?.surface,
        length: content.geoJSON?.features?.[0]?.properties?.length
      };
    }).sort((a, b) => b.approvedAt.getTime() - a.approvedAt.getTime());
  } catch (error) {
    console.error('Error loading approved routes:', error);
    return [];
  }
}

export function subscribeToApprovals(
  category: string,
  onNewRoute: (route: ApprovedRoute) => void
): () => void {
  const pool = new SimplePool();
  
  const adminPubkeys = ADMIN_NPUBS.map(npub => {
    const decoded = nip19.decode(npub);
    return decoded.data as string;
  });
  
  const filter: any = {
    kinds: [30078],
    authors: adminPubkeys,
    '#t': ['anmore-bike'],
    '#status': ['active'],
    since: Math.floor(Date.now() / 1000)
  };
  
  if (category !== 'all') {
    filter['#category'] = [category];
  }
  
  const sub = pool.subscribeMany(
    RELAYS,
    [filter],
    {
      onevent(event) {
        try {
          const content = JSON.parse(event.content);
          const route: ApprovedRoute = {
            id: event.id,
            name: event.tags.find(t => t[0] === 'name')?.[1] || 'Unnamed',
            category: event.tags.find(t => t[0] === 'category')?.[1] || 'unknown',
            geoJSON: content.geoJSON,
            description: content.description || '',
            approvalNote: content.approvalNote,
            contributor: event.tags.find(t => t[0] === 'contributor')?.[1],
            approvedAt: new Date(parseInt(event.tags.find(t => t[0] === 'approved_at')?.[1] || '0') * 1000),
            adminName: content.adminName
          };
          onNewRoute(route);
        } catch (error) {
          console.error('Error parsing route event:', error);
        }
      },
      oneose() {
        console.log('✓ Subscribed to approval updates');
      }
    }
  );
  
  // Return cleanup function
  return () => {
    sub.close();
    pool.close(RELAYS);
  };
}
```

---

## 🧪 Testing Plan

### Unit Tests

1. **routes.ts functions:**
   - loadApprovedRoutes() returns correct data
   - subscribeToApprovals() triggers callback
   - Filter by category works

2. **Event creation:**
   - Approval event has correct structure
   - Tags are properly formatted
   - Content JSON is valid

3. **GeoJSON parsing:**
   - All geometry types supported (Point, LineString, Polygon)
   - Properties preserved correctly
   - Invalid GeoJSON handled gracefully

### Integration Tests

1. **Submission → Approval → Display Flow:**
   - User submits trail proposal
   - Admin receives encrypted DM
   - Admin approves → kind:30078 published
   - Other users see route on map
   - Real-time subscription updates map

2. **Multi-Admin Support:**
   - Multiple admins can approve
   - Events from all admins displayed
   - Admin authentication works

3. **Cross-Browser Testing:**
   - Chrome, Firefox, Safari, Edge
   - Mobile browsers (iOS Safari, Chrome Android)
   - Map rendering consistent
   - LocalStorage/IndexedDB works

### Load Testing

1. **Query Performance:**
   - 100 routes load within 2 seconds
   - 1000 routes load within 5 seconds
   - Pagination if needed

2. **Relay Resilience:**
   - Works with 1/4 relays down
   - Timeout handling
   - Retry logic

3. **Memory Usage:**
   - Large GeoJSON files don't crash browser
   - Map tiles cached efficiently
   - IndexedDB within limits

---

## 📚 Documentation Tasks

1. **User Guide:**
   - How to view approved routes
   - How to submit proposals
   - How to toggle layers
   - How to export routes

2. **Admin Guide:**
   - Login process
   - Review submissions
   - Approval workflow
   - Edit/delete routes
   - Handle reports

3. **Developer Guide:**
   - Architecture overview
   - Nostr event schemas
   - API reference (routes.ts)
   - Extension guide (add new categories)

4. **OpenStreetMap Contribution:**
   - Export GeoJSON
   - Import to JOSM
   - Verify tags
   - Upload changeset

---

## 🎯 Success Metrics

**MVP Launch (Week 5):**
- ✅ Users can see approved routes on all 3 categories
- ✅ Admin can approve/reject submissions
- ✅ Real-time updates work
- ✅ At least 5 test routes approved and displayed
- ✅ Documentation complete

**Post-Launch (Month 2-3):**
- 50+ approved routes across all categories
- 10+ active contributors
- 5+ routes added to OpenStreetMap
- 100+ unique visitors to map pages
- 90%+ uptime (relay availability)

**Long-Term (6 months):**
- 200+ approved routes
- 50+ contributors
- Integration with local trail apps
- Partnership with Anmore Parks & Rec
- Featured in local media

---

## 🚨 Potential Issues & Solutions

### Issue 1: Relay Reliability

**Problem:** If primary relays go down, approved routes won't load

**Solutions:**
- Use 4+ relays (already implemented)
- Add fallback relay list
- Cache routes in IndexedDB
- Show "offline mode" with cached data
- Implement relay health check on page load

### Issue 2: Admin nsec Security

**Problem:** Admin private key stored in browser LocalStorage is vulnerable

**Solutions:**
- Session timeout (auto-logout after 1 hour inactivity)
- Encrypt nsec with password before storing
- Consider hardware key support (WebAuthn)
- Admin-only computer recommended
- Regular key rotation

### Issue 3: Spam / Malicious Submissions

**Problem:** Users could spam submissions or submit inappropriate content

**Solutions:**
- Rate limiting in submission form (1 per minute)
- Admin review required (already planned)
- Report feature for public routes
- Ban list for repeat offenders (filter by npub)
- CAPTCHA on submission (optional)

### Issue 4: GeoJSON Size Limits

**Problem:** Very detailed routes might create huge events (>10KB)

**Solutions:**
- Simplify geometry (Douglas-Peucker algorithm)
- Warn users if >5KB before submission
- Split large routes into segments
- Use compressed encoding (base64 + gzip)
- Link to external storage for huge routes

### Issue 5: Conflicting Routes

**Problem:** Multiple approved routes on same location

**Solutions:**
- Admin sees overlap warnings
- Merge tool for duplicate submissions
- Version control (route updates replace old)
- Status tags: proposed, approved, built, decommissioned
- Historical view of changes

---

## 🎉 Conclusion

This implementation plan transforms anmore.bike from a submission-only platform into a **true crowdsourced mapping system** where:

1. ✅ **Users contribute** trail/route proposals with detailed GeoJSON
2. ✅ **Admins review** submissions and approve quality content
3. ✅ **Everyone sees** approved routes on interactive maps
4. ✅ **Real-time updates** keep data fresh
5. ✅ **OpenStreetMap integration** contributes to public good
6. ✅ **100% decentralized** using Nostr protocol (no servers!)

**Key Innovation:** Using Nostr's parameterized replaceable events (kind:30078) for persistent, admin-controlled, publicly-visible map data — **all without a backend server**.

**Timeline:** 5-6 weeks from start to MVP launch

**Next Step:** Begin Phase 1 implementation with `src/lib/routes.ts` and update first map page (trail-building.astro) to display approved routes.

---

**Questions? Need clarification on any section?** Let's discuss before starting implementation!
