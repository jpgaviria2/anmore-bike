# BTC Map Architecture Analysis

**Date:** 2026-02-11  
**Purpose:** Understand btcmap.org's architecture to inform anmore.bike implementation

---

## Executive Summary

BTC Map is a **community-driven bitcoin merchant directory** built on top of **OpenStreetMap (OSM)** infrastructure. They query OSM data periodically, filter for bitcoin-accepting businesses, cache it locally, and serve it via a custom REST API with a Svelte-based frontend.

**Key Insight:** They don't edit OSM base layers—they query OSM using specific tags, store snapshots locally, and display custom overlays on top of standard OSM tiles.

---

## 1. Core Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA FLOW ARCHITECTURE                    │
└─────────────────────────────────────────────────────────────┘

   OpenStreetMap                BTC Map Backend              Client Apps
   =============                ================             ===========
        │                              │                          │
        │  Query OSM API               │                          │
        │  (every 10 min)              │                          │
        ├─────────────────────────────>│                          │
        │                              │                          │
        │  Filter by tags:             │                          │
        │  - payment:bitcoin           │                          │
        │  - payment:lightning         │                          │
        │  - currency:XBT              │                          │
        │  - payment:onchain           │                          │
        │                              │                          │
        │                         ┌────▼─────┐                   │
        │                         │ Database │                   │
        │                         │ (Cached  │                   │
        │                         │  OSM     │                   │
        │                         │  Data)   │                   │
        │                         └────┬─────┘                   │
        │                              │                          │
        │                         ┌────▼─────┐                   │
        │                         │ REST API │                   │
        │                         │   v2/    │                   │
        │                         │   v3/    │                   │
        │                         │   v4/    │                   │
        │                         └────┬─────┘                   │
        │                              │                          │
        │                              ├─────────────────────────>│
        │                              │  JSON response           │
        │                              │  (elements, areas)       │
        │                              │                          │
        │                         Map Tiles                       │
        │                         (OpenFreeMap)                   │
        ├────────────────────────────────────────────────────────>│
        │                                                          │
```

---

## 2. OpenStreetMap Integration

### 2.1 OSM Tags Used

BTC Map queries OSM using these **standardized tags**:

| Tag | Description | Example |
|-----|-------------|---------|
| `payment:bitcoin` | Generic bitcoin acceptance | `payment:bitcoin=yes` |
| `payment:lightning` | Lightning Network support | `payment:lightning=yes` |
| `payment:onchain` | On-chain bitcoin only | `payment:onchain=yes` |
| `payment:lightning_contactless` | NFC Lightning | `payment:lightning_contactless=yes` |
| `currency:XBT` | Bitcoin as currency | `currency:XBT=yes` |

### 2.2 Data Synchronization

- **Frequency:** Every **10 minutes**
- **Method:** Query OSM Overpass API with tag filters
- **Process:**
  1. Query OSM API for elements matching bitcoin-related tags
  2. Extract full OSM JSON (node/way/relation with lat/lon, tags, metadata)
  3. Store in local database with timestamps
  4. Track `created_at`, `updated_at`, `deleted_at` for each element

### 2.3 Example OSM Element Structure

```json
{
  "id": "node:1581342044",
  "osm_json": {
    "type": "node",
    "id": 1581342044,
    "lat": 40.7616461,
    "lon": -111.8885341,
    "timestamp": "2019-09-10T17:46:20Z",
    "version": 6,
    "changeset": 74323559,
    "user": "skquinn",
    "uid": 243003,
    "tags": {
      "name": "Pie Hole",
      "amenity": "restaurant",
      "cuisine": "pizza",
      "payment:bitcoin": "yes",
      "addr:street": "State Street",
      "addr:housenumber": "344 S"
    }
  },
  "tags": {
    "icon:android": "local_pizza",
    "category": "other"
  },
  "created_at": "2022-09-25T08:45:08Z",
  "updated_at": "2022-11-02T10:15:41Z",
  "deleted_at": "2022-10-18T21:01:31Z"
}
```

**Key Observations:**
- Full OSM JSON preserved (`osm_json` field)
- Additional BTC Map metadata (`tags`, timestamps)
- Soft deletion support (`deleted_at`)
- Changesets tracked for audit trail

---

## 3. Backend API Architecture

### 3.1 Tech Stack

**Repository:** https://github.com/teambtcmap/btcmap-api

**Technology:**
- Likely **Rust** (based on btcmap-cli being Rust)
- Database: **PostgreSQL** (inferred from data structure)
- Hosting: **Static JSON files** via CDN (`static.btcmap.org`)

### 3.2 API Versions

| Version | Status | Used By | Notes |
|---------|--------|---------|-------|
| **v4** | Latest | New apps | Recommended |
| **v3** | Active | Android app | Current production |
| **v2** | Legacy | Web/iOS | Being phased out |

### 3.3 Core Endpoints

#### **v2/v3/v4 Common Structure:**

```
GET /v4/places
GET /v4/areas
GET /v4/events
GET /v4/place-boosts
GET /v4/place-comments
GET /v4/invoices
```

#### **Incremental Sync Support:**

Clients can sync efficiently using timestamps:
```
GET /v4/places?updated_since=2024-01-01T00:00:00Z
```

### 3.4 Static Hosting Strategy

**Important Discovery:** API responses are pre-generated JSON files served via CDN:

```
https://api.btcmap.org/v2/elements
  ↓ redirects to ↓
https://static.btcmap.org/api/v2/elements.json
```

**Benefits:**
- Instant global distribution
- No database query overhead
- Handles massive traffic spikes
- Very low hosting costs

**Trade-off:**
- Data freshness limited to regeneration cycle (10 min)
- No real-time queries (acceptable for map data)

---

## 4. Frontend Architecture

### 4.1 Tech Stack

**Repository:** https://github.com/teambtcmap/btcmap.org

**Technology:**
- **Svelte/SvelteKit** (modern reactive framework)
- **TypeScript** (type safety)
- **Vite** (build tool)
- **TailwindCSS** (styling)
- **Playwright** (E2E testing)
- **Netlify** (hosting/CDN)

### 4.2 Map Rendering

#### **Base Tiles:**
- **OpenFreeMap** (https://openfreemap.org/)
- **OpenStreetMap** base tiles
- No proprietary/paid providers needed!

#### **Overlay Strategy:**

```javascript
// Pseudocode - How they display custom markers
1. Load OSM base tiles from OpenFreeMap
2. Fetch /v4/places from BTC Map API
3. For each place:
   - Parse lat/lon from osm_json
   - Create custom marker/icon
   - Add to map overlay layer
4. Handle clustering for dense areas
5. Popup details on click
```

**This is the key answer:** They use **client-side overlay layers** on top of standard OSM tiles. No modifications to OSM base data.

### 4.3 Progressive Web App (PWA)

- Installable on mobile devices
- Offline support
- App-like experience
- No app store submission needed

---

## 5. Data Pipeline

### 5.1 Community Contribution Flow

```
User submits location
       ↓
btcmap.org/add-location
       ↓
Creates GitHub Issue
       ↓
"Shadowy Supertagger" volunteer
       ↓
Adds tags to OpenStreetMap
       ↓
BTC Map sync (10 min)
       ↓
Appears on btcmap.org
```

**Repository:** https://github.com/teambtcmap/btcmap-data

**Process:**
1. User submits merchant via form
2. GitHub issue auto-created with label `location-submission`
3. Community "Shadowy Supertaggers" verify and add to OSM
4. OSM sync picks up new data
5. Merchant appears on map

### 5.2 Data Quality & Verification

- **Survey dates:** `survey:date` tag tracks last verification
- **Verification system:** Users can verify via `/verify-location`
- **Issue tracking:** All submissions tracked on GitHub
- **Community moderation:** Discord/Telegram for coordination

---

## 6. Mobile Apps

### 6.1 Android
- **Repository:** https://github.com/teambtcmap/btcmap-android
- **Language:** Kotlin
- **License:** AGPL-3.0

### 6.2 iOS
- **Repository:** https://github.com/teambtcmap/btcmap-ios
- **Language:** Swift
- **License:** AGPL-3.0

Both apps consume the same REST API (v3/v4).

---

## 7. Adapting for Anmore Bike Routes

### 7.1 Architectural Parallels

| BTC Map | Anmore.bike Equivalent |
|---------|------------------------|
| OpenStreetMap | OpenStreetMap (cycling tags) |
| `payment:bitcoin=yes` | `route=bicycle`, `highway=cycleway` |
| Bitcoin merchants | Bike routes, trails, amenities |
| 10-min sync | Real-time or hourly sync |
| Static JSON CDN | Same approach! |
| Svelte frontend | Svelte/React/Next.js |
| OpenFreeMap tiles | OpenFreeMap + cycling overlays |

### 7.2 Recommended OSM Tags for Bike Routes

**Core Tags:**
```
route=bicycle
highway=cycleway
highway=path + bicycle=designated
surface=paved|gravel|dirt
smoothness=excellent|good|bad
width=1.5|2.0|3.0
lit=yes|no
```

**Anmore-Specific:**
```
name=Sunnyside Road Trail
operator=Village of Anmore
difficulty=easy|moderate|hard
scenic=yes
maintenance=excellent
```

### 7.3 Proposed Architecture for Anmore.bike

```
┌────────────────────────────────────────────────────────────┐
│              ANMORE.BIKE ARCHITECTURE                      │
└────────────────────────────────────────────────────────────┘

OpenStreetMap          Anmore.bike Backend        Frontend
   (OSM)                  (API + DB)              (Web App)
     │                        │                       │
     │  Query cycling tags    │                       │
     │  (hourly/daily)        │                       │
     ├───────────────────────>│                       │
     │                        │                       │
     │  Filter:               │                       │
     │  - route=bicycle       │                       │
     │  - highway=cycleway    │                       │
     │  - location: Anmore    │                       │
     │                        │                       │
     │                   ┌────▼─────┐                │
     │                   │ Postgres │                │
     │                   │  Cached  │                │
     │                   │  Routes  │                │
     │                   └────┬─────┘                │
     │                        │                       │
     │                   ┌────▼─────┐                │
     │                   │ REST API │                │
     │                   │  /routes │                │
     │                   │  /pois   │                │
     │                   │  /events │                │
     │                   └────┬─────┘                │
     │                        │                       │
     │                        ├──────────────────────>│
     │                        │  JSON                 │
     │                        │                       │
     │                   Map Tiles                    │
     │                   (OpenFreeMap +               │
     │                    CyclOSM tiles)              │
     ├───────────────────────────────────────────────>│
```

### 7.4 Data Structure Example

```json
{
  "id": "way:123456789",
  "osm_json": {
    "type": "way",
    "id": 123456789,
    "nodes": [1, 2, 3, 4],
    "tags": {
      "name": "Sunnyside Road Trail",
      "route": "bicycle",
      "highway": "cycleway",
      "surface": "paved",
      "width": "2.5",
      "operator": "Village of Anmore",
      "difficulty": "easy",
      "scenic": "yes"
    }
  },
  "tags": {
    "icon": "bike",
    "category": "trail",
    "difficulty_color": "green"
  },
  "created_at": "2026-02-10T00:00:00Z",
  "updated_at": "2026-02-10T00:00:00Z"
}
```

### 7.5 Implementation Steps

1. **Phase 1: OSM Data Collection**
   - Set up Overpass API queries for Anmore cycling infrastructure
   - Define tag schema (copy BTC Map's approach)
   - Build sync script (every hour)

2. **Phase 2: Backend API**
   - PostgreSQL database (same structure as BTC Map)
   - REST API with versioned endpoints (`/v1/routes`, `/v1/pois`)
   - Static JSON generation for CDN hosting
   - Incremental sync support

3. **Phase 3: Frontend**
   - SvelteKit or Next.js
   - OpenFreeMap base tiles + **CyclOSM** overlay
   - Route overlay rendering (similar to BTC Map markers)
   - Interactive route details (elevation, surface, difficulty)

4. **Phase 4: Community Features**
   - Route submission form (like `/add-location`)
   - GitHub issue tracking
   - Verification system for route conditions

5. **Phase 5: Mobile Apps**
   - PWA first (installable web app)
   - Native iOS/Android later (reuse BTC Map's code structure)

---

## 8. Key Learnings & Recommendations

### 8.1 What BTC Map Does Right

✅ **Static CDN hosting** - Fast, cheap, scalable  
✅ **OSM as single source of truth** - No proprietary database lock-in  
✅ **Community-driven** - Crowdsourced data quality  
✅ **Open source everything** - AGPL ensures forks stay open  
✅ **Simple sync model** - Periodic refresh is good enough  
✅ **Progressive Web App** - No app store dependencies  

### 8.2 What We Should Do Differently

🔄 **Elevation data** - Add elevation profiles (cycling-specific)  
🔄 **Real-time conditions** - Weather, trail closures, construction  
🔄 **Route planning** - A-to-B navigation (not just discovery)  
🔄 **Strava integration** - Import popular segments  
🔄 **Photo uploads** - Community trail photos  

### 8.3 Critical Technical Decisions

**1. Do we edit OSM directly?**
- **Answer:** Yes! Add Anmore routes to OSM (community benefit)
- Use proper OSM tagging conventions
- Contribute back to global cycling infrastructure

**2. Do we cache or query live?**
- **Answer:** Cache (like BTC Map)
- Hourly sync is sufficient for route changes
- Static JSON for performance

**3. What map tiles?**
- **Answer:** OpenFreeMap + CyclOSM
- CyclOSM highlights cycling infrastructure
- Free, no API keys, no rate limits

**4. Hosting?**
- **Answer:** Netlify (frontend) + Cloudflare (static API)
- Same as BTC Map
- Free tier sufficient for Anmore scale

---

## 9. Resources & Links

### Primary Sources
- **BTC Map Website:** https://btcmap.org
- **GitHub Organization:** https://github.com/teambtcmap
- **API Base:** https://api.btcmap.org/v4/
- **Static Assets:** https://static.btcmap.org/

### Key Repositories
- **btcmap.org (Frontend):** https://github.com/teambtcmap/btcmap.org
- **btcmap-api (Backend):** https://github.com/teambtcmap/btcmap-api
- **btcmap-data (Community):** https://github.com/teambtcmap/btcmap-data

### OpenStreetMap References
- **Payment Tags:** https://wiki.openstreetmap.org/wiki/Key:payment
- **Bicycle Tags:** https://wiki.openstreetmap.org/wiki/Bicycle
- **Route Tags:** https://wiki.openstreetmap.org/wiki/Tag:route=bicycle
- **Overpass API:** https://wiki.openstreetmap.org/wiki/Overpass_API

### Map Tiles
- **OpenFreeMap:** https://openfreemap.org/
- **CyclOSM:** https://www.cyclosm.org/
- **Thunderforest Cycle:** https://www.thunderforest.com/maps/cycle/

---

## 10. Conclusion

**Answer to the key question:**  
*"How does btcmap.org display custom markers/data on top of OSM without editing the base OSM data?"*

**They don't avoid editing OSM—they embrace it!** 

1. **Data lives in OSM** - All merchants are tagged in OpenStreetMap
2. **Periodic sync** - Query OSM every 10 minutes for bitcoin tags
3. **Local cache** - Store full OSM JSON in database
4. **Static API** - Pre-generate JSON, serve via CDN
5. **Client overlay** - JavaScript renders custom markers on top of standard map tiles

**For Anmore.bike:**  
Follow the same pattern—use OSM as the database, sync periodically, cache locally, serve via CDN, render overlays. Add cycling-specific enhancements (elevation, routing, photos) on top of this solid foundation.

**This architecture is proven, scalable, and community-friendly. Perfect for Anmore.bike.**

---

**Document prepared by:** btcmap-analyst subagent  
**Date:** 2026-02-11  
**Status:** Complete ✅
