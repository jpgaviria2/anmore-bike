# Anmore.bike Architecture Design
## Following BTCMap.org Principles

**Date:** 2026-02-10  
**Status:** Proposed Architecture  
**Version:** 1.0

---

## Executive Summary

This document proposes a **btcmap.org-style architecture** for anmore.bike that uses **OpenStreetMap as the single source of truth**, **GitHub for submission management**, and **community volunteers for moderation**. This approach eliminates the need for Nostr protocol complexity while maintaining decentralization and community ownership.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Data Storage Strategy](#data-storage-strategy)
3. [API Design](#api-design)
4. [Frontend Implementation](#frontend-implementation)
5. [User Submission Workflow](#user-submission-workflow)
6. [Admin Approval Workflow](#admin-approval-workflow)
7. [Deployment Strategy](#deployment-strategy)
8. [Migration from Current Nostr Implementation](#migration-from-current-nostr-implementation)
9. [Comparison: OSM vs Nostr vs Separate Database](#comparison-osm-vs-nostr-vs-separate-database)
10. [Implementation Roadmap](#implementation-roadmap)

---

## System Architecture

### High-Level Diagram (Text-Based)

```
┌─────────────────────────────────────────────────────────────┐
│                      ANMORE.BIKE USERS                       │
│                   (Community Members)                        │
└─────────────┬───────────────────────────────────────────────┘
              │
              │ Submit Routes
              ▼
┌─────────────────────────────────────────────────────────────┐
│                  ANMORE.BIKE WEB APP                         │
│              (Astro/Svelte + Leaflet.js)                     │
│   - Route Submission Form                                    │
│   - Interactive Map (OSM Tiles)                              │
│   - Display Approved Routes                                  │
│   - PWA Offline Support                                      │
└─────────────┬───────────────────────────────────────────────┘
              │
              │ 1. Creates GitHub Issue
              ▼
┌─────────────────────────────────────────────────────────────┐
│              GITHUB REPOSITORY                               │
│           (anmore-bike-data)                                 │
│   - Issues = Submission Queue                                │
│   - Labels: pending, approved, rejected                      │
│   - Automated Actions                                        │
│   - JSON file storage (routes.json)                          │
└─────────────┬───────────────────────────────────────────────┘
              │
              │ 2. Community Admin Reviews
              ▼
┌─────────────────────────────────────────────────────────────┐
│           COMMUNITY ADMINS / VOLUNTEERS                      │
│   ("Route Champions")                                        │
│   - Review submissions in GitHub                             │
│   - Verify route safety                                      │
│   - Add/update OSM tags                                      │
│   - Close issues when complete                               │
└─────────────┬───────────────────────────────────────────────┘
              │
              │ 3. Add to OSM (Optional)
              │    OR Update routes.json (Required)
              ▼
┌─────────────────────────────────────────────────────────────┐
│        OPENSTREETMAP + GITHUB DATA                           │
│   OSM: Public routes with standard tags                      │
│   GitHub: anmore.bike-specific routes (routes.json)          │
│   - Approved routes                                          │
│   - Community metadata                                       │
│   - Difficulty ratings                                       │
└─────────────┬───────────────────────────────────────────────┘
              │
              │ 4. Auto-sync every 10 min
              ▼
┌─────────────────────────────────────────────────────────────┐
│          STATIC API (GitHub Pages / CDN)                     │
│   routes.json - All approved routes                          │
│   stats.json - Community statistics                          │
│   geojson/*.geojson - Individual route files                 │
└─────────────┬───────────────────────────────────────────────┘
              │
              │ 5. Fetch & Display
              ▼
┌─────────────────────────────────────────────────────────────┐
│              USER'S MAP VIEW                                 │
│   - OpenStreetMap base tiles                                 │
│   - Anmore approved routes overlay                           │
│   - Route details on click                                   │
│   - Offline support (PWA cache)                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Storage Strategy

### Option Analysis

| Approach | Pros | Cons | Recommended? |
|----------|------|------|--------------|
| **OSM Only** | Public, standard tags, benefits everyone,永久 preservation | OSM doesn't support all anmore.bike metadata (ratings, safety notes), approval workflow not native | ⚠️ Partial (use for public routes) |
| **GitHub JSON** | Simple, version controlled, flexible schema, free hosting, community workflow | Not discoverable outside anmore.bike, requires manual sync | ✅ **YES (Primary)** |
| **Separate Database** | Full control, complex queries, fast reads | Costs money, requires backend, vendor lock-in, maintenance overhead | ❌ No (unnecessary) |
| **Nostr (Current)** | Decentralized, encrypted, no servers | Complex for users, no data persistence, hard to moderate, requires relay maintenance | ❌ No (overly complex) |

### **Recommended Hybrid Approach**

**Primary: GitHub-Based JSON Storage**
- Store all approved routes in `routes.json` in `anmore-bike-data` repo
- Version controlled (full history)
- Free hosting via GitHub Pages
- Community can fork and improve
- Easy to backup and export

**Secondary: OSM Contributions (Optional)**
- Add suitable routes to OpenStreetMap with standard bicycle tags
- Benefits the global cycling community
- Ensures data preservation
- Follows OSM tagging guidelines

### GitHub Repository Structure

```
anmore-bike-data/
├── routes.json              # All approved routes (GeoJSON FeatureCollection)
├── submissions/             # Individual submission files
│   ├── pending/
│   │   └── issue-123.json
│   ├── approved/
│   │   └── route-001.json
│   └── rejected/
│       └── issue-456.json
├── stats.json               # Community statistics
├── .github/
│   └── workflows/
│       ├── validate-submission.yml
│       ├── publish-approved.yml
│       └── notify-discord.yml
└── README.md                # Contributor guide
```

---

## API Design

### Endpoints (Static Files)

| Endpoint | Purpose | Update Frequency |
|----------|---------|------------------|
| `/routes.json` | All approved routes (GeoJSON) | Real-time (on approval) |
| `/stats.json` | Contributor stats, route counts | Daily |
| `/routes/{id}.geojson` | Individual route detail | On approval |
| `/pending.json` | Public pending count (no details) | Hourly |

### Data Schema: routes.json

```json
{
  "type": "FeatureCollection",
  "metadata": {
    "generated_at": "2026-02-10T18:00:00Z",
    "total_routes": 12,
    "total_contributors": 8,
    "last_updated": "2026-02-10T17:45:00Z"
  },
  "features": [
    {
      "type": "Feature",
      "id": "anmore-route-001",
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [-122.85, 49.32],
          [-122.84, 49.325],
          [-122.83, 49.33]
        ]
      },
      "properties": {
        "name": "Eagle Ridge Loop",
        "description": "Family-friendly loop through Anmore Village",
        "difficulty": "easy",
        "surface": "paved",
        "length_km": 5.2,
        "elevation_gain_m": 120,
        "route_type": "recreational",
        "suitable_for": ["family", "beginner"],
        "hazards": [],
        "features": ["scenic", "quiet-streets"],
        "submitted_by": "github_user_123",
        "submitted_at": "2026-02-01T10:00:00Z",
        "approved_by": "route_champion_admin",
        "approved_at": "2026-02-05T14:30:00Z",
        "last_verified": "2026-02-10T09:00:00Z",
        "osm_way_id": "123456789",
        "github_issue": "42"
      }
    }
  ]
}
```

### Stats Schema: stats.json

```json
{
  "updated_at": "2026-02-10T18:00:00Z",
  "totals": {
    "routes": 12,
    "contributors": 8,
    "pending_submissions": 3,
    "total_km": 87.5
  },
  "top_contributors": [
    {
      "github_username": "bike_dad",
      "display_name": "Mike T.",
      "routes_submitted": 5,
      "routes_approved": 4,
      "badge": "🚴 Route Pioneer"
    }
  ],
  "recent_approvals": [
    {
      "route_name": "Eagle Ridge Loop",
      "approved_at": "2026-02-05T14:30:00Z",
      "approved_by": "admin"
    }
  ],
  "routes_by_difficulty": {
    "easy": 5,
    "moderate": 4,
    "challenging": 3
  }
}
```

---

## Frontend Implementation

### Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Framework** | **Astro** (keep current) | Static site generation, fast, simple |
| **Mapping** | **Leaflet.js** (keep current) | Lightweight, flexible, OSM-compatible |
| **Styling** | **Tailwind CSS** (keep current) | Rapid development, consistent design |
| **PWA** | **Service Worker** (keep current) | Offline support, installable |
| **Submission Form** | **Vanilla JS** → GitHub API | No backend needed |

### Key Pages

1. **Home (`/`)** - Map view with all approved routes
2. **Submit Route (`/submit`)** - Form to create GitHub issue
3. **Route Detail (`/route/[id]`)** - Individual route view
4. **Leaderboard (`/contributors`)** - Community stats
5. **Admin (`/admin`)** - GitHub OAuth login → manage submissions

### Map Implementation

```javascript
// Fetch approved routes
const routes = await fetch('https://anmore-bike.github.io/data/routes.json')
  .then(r => r.json());

// Display on map
L.geoJSON(routes, {
  style: (feature) => ({
    color: getDifficultyColor(feature.properties.difficulty),
    weight: 4
  }),
  onEachFeature: (feature, layer) => {
    layer.bindPopup(`
      <h3>${feature.properties.name}</h3>
      <p>${feature.properties.description}</p>
      <p><strong>Distance:</strong> ${feature.properties.length_km} km</p>
      <p><strong>Difficulty:</strong> ${feature.properties.difficulty}</p>
    `);
  }
}).addTo(map);
```

### Offline PWA Strategy

```javascript
// Service Worker - Cache approved routes
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('anmore-routes-v1').then(cache => {
      return cache.addAll([
        '/',
        '/routes.json',
        '/stats.json',
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png' // Anmore area tiles
      ]);
    })
  );
});
```

---

## User Submission Workflow

### Step-by-Step Process

#### 1. User Draws Route on Map

```html
<!-- submit.astro -->
<div id="map"></div>
<form id="route-form">
  <input type="text" name="name" placeholder="Route Name" required />
  <textarea name="description" placeholder="Describe your route..."></textarea>
  <select name="difficulty">
    <option value="easy">Easy</option>
    <option value="moderate">Moderate</option>
    <option value="challenging">Challenging</option>
  </select>
  <input type="number" name="length_km" placeholder="Distance (km)" />
  <button type="submit">Submit Route</button>
</form>
```

#### 2. Form Submits to GitHub API

```javascript
async function submitRoute(formData, geojson) {
  const issueBody = `
## New Route Submission

**Name:** ${formData.name}
**Difficulty:** ${formData.difficulty}
**Description:** ${formData.description}

### GeoJSON
\`\`\`json
${JSON.stringify(geojson, null, 2)}
\`\`\`

### Submitter
- GitHub: ${currentUser || 'Anonymous'}
- Date: ${new Date().toISOString()}

---
**Auto-generated by anmore.bike submission form**
`;

  // Create GitHub issue
  const response = await fetch('https://api.github.com/repos/anmore-bike/anmore-bike-data/issues', {
    method: 'POST',
    headers: {
      'Authorization': `token ${GITHUB_PAT}`, // Personal Access Token
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: `[ROUTE] ${formData.name}`,
      body: issueBody,
      labels: ['route-submission', 'pending']
    })
  });

  const issue = await response.json();
  return issue.html_url; // Show confirmation with link
}
```

#### 3. User Receives Confirmation

```
✅ Route submitted successfully!

Your route "Eagle Ridge Loop" is now pending review.

Track status: https://github.com/anmore-bike/anmore-bike-data/issues/42

Estimated review time: 2-5 days

Thank you for contributing to Anmore's bike community! 🚴‍♂️
```

---

## Admin Approval Workflow

### Route Champions (Community Moderators)

**Who can be a Route Champion?**
- Anmore residents
- Experienced cyclists
- Familiar with local trails
- GitHub account required

**Responsibilities:**
1. Review route submissions (GitHub issues)
2. Verify route safety and accuracy
3. Test routes in person (when possible)
4. Approve or reject with feedback
5. Update routes.json via pull request
6. Optionally add to OpenStreetMap

### Approval Process (Manual)

#### Option A: Direct Commit (Admin with Write Access)

```bash
# 1. Clone repo
git clone https://github.com/anmore-bike/anmore-bike-data.git
cd anmore-bike-data

# 2. Add route to routes.json
# (Copy GeoJSON from issue, add metadata)

# 3. Commit and push
git add routes.json
git commit -m "Approve route: Eagle Ridge Loop (issue #42)"
git push origin main

# 4. Close GitHub issue with comment
# "✅ Approved! Route is now live on anmore.bike"
```

#### Option B: GitHub Actions (Automated)

```yaml
# .github/workflows/approve-route.yml
name: Approve Route
on:
  issue_comment:
    types: [created]

jobs:
  approve:
    if: contains(github.event.comment.body, '/approve')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Extract GeoJSON
        run: |
          # Parse issue body, extract GeoJSON
          # Add to routes.json
      - name: Commit and push
        run: |
          git config user.name "Anmore Bike Bot"
          git commit -am "Approve route from issue #${{ github.event.issue.number }}"
          git push
      - name: Close issue
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.update({
              issue_number: context.issue.number,
              state: 'closed',
              labels: ['approved']
            });
```

### Admin Dashboard (Optional)

Simple HTML page that uses GitHub API:

```html
<!-- admin.html -->
<!DOCTYPE html>
<html>
<head><title>Anmore.bike Admin</title></head>
<body>
  <h1>Pending Route Submissions</h1>
  <div id="pending-routes"></div>
  
  <script>
    fetch('https://api.github.com/repos/anmore-bike/anmore-bike-data/issues?labels=pending')
      .then(r => r.json())
      .then(issues => {
        issues.forEach(issue => {
          // Display issue with approve/reject buttons
          // Buttons trigger GitHub API calls
        });
      });
  </script>
</body>
</html>
```

---

## Deployment Strategy

### GitHub Pages (Recommended)

**Advantages:**
- Free hosting
- Automatic SSL
- CDN distribution
- No backend required
- Version controlled

**Setup:**

1. **Main Site:** `anmore-bike` repo → GitHub Pages
   - URL: `anmore.bike` (custom domain)
   - Deploys on push to `main`

2. **Data Repo:** `anmore-bike-data` repo → GitHub Pages
   - URL: `data.anmore.bike` or `anmore-bike.github.io/data`
   - Serves `routes.json`, `stats.json`

3. **Deployment Workflow:**

```yaml
# .github/workflows/deploy.yml (in anmore-bike repo)
name: Deploy Site
on:
  push:
    branches: [main]
  
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### Alternative: Netlify (Current Setup)

Can keep current Netlify deployment, just change data source from Nostr to GitHub:

```javascript
// Before (Nostr)
const submissions = await fetchFromNostrRelays();

// After (GitHub)
const submissions = await fetch('https://data.anmore.bike/routes.json')
  .then(r => r.json());
```

---

## Migration from Current Nostr Implementation

### Transition Strategy

#### Phase 1: Dual Mode (2 weeks)
- Keep Nostr submission working
- Add "Submit via GitHub" option
- Both workflows live simultaneously
- Community testing

#### Phase 2: GitHub Primary (1 month)
- Make GitHub the default
- Nostr as fallback
- Monitor adoption
- Gather feedback

#### Phase 3: Deprecate Nostr (After 2 months)
- Archive Nostr code
- Document migration
- Update all documentation
- Announce sunset date

### Data Migration

```javascript
// Convert existing Nostr submissions to GitHub JSON
const nostrSubmissions = /* fetch from relays */;

const routes = nostrSubmissions.map(sub => ({
  type: "Feature",
  geometry: JSON.parse(sub.geojson),
  properties: {
    name: sub.trail_name,
    difficulty: sub.mtb_scale,
    submitted_by: sub.npub,
    submitted_at: new Date(sub.created_at).toISOString(),
    // ... map other fields
  }
}));

// Write to routes.json
fs.writeFileSync('routes.json', JSON.stringify({
  type: "FeatureCollection",
  features: routes
}, null, 2));
```

### Communication Plan

**Email/Discord Announcement:**
```
📢 Anmore.bike is upgrading!

We're moving to a GitHub-based submission system (like btcmap.org). 

Why?
✅ Simpler for users (no Nostr keys needed)
✅ Better moderation (community review on GitHub)
✅ Transparent workflow (see all submissions)
✅ Easier contribution (familiar GitHub interface)

Your existing submissions are safe and will be migrated.

New submission process launches March 1st!

Questions? Reply here or join our Discord.
```

---

## Comparison: OSM vs Nostr vs Separate Database

### Feature Comparison Matrix

| Feature | OSM + GitHub | Nostr (Current) | Separate DB | Winner |
|---------|--------------|-----------------|-------------|--------|
| **Setup Complexity** | Low | High | Medium | OSM+GitHub ✅ |
| **User Friction** | Low (no keys) | High (nsec required) | Low | OSM+GitHub ✅ |
| **Data Persistence** | Permanent | Relay-dependent | Depends on vendor | OSM+GitHub ✅ |
| **Public Benefit** | High (OSM public) | Low (Nostr-only) | None | OSM+GitHub ✅ |
| **Moderation** | GitHub issues | Complex | Custom admin | OSM+GitHub ✅ |
| **Cost** | $0 | $0 | $10-50/month | Tie ✅ |
| **Scalability** | GitHub CDN | Relay limits | DB limits | OSM+GitHub ✅ |
| **Privacy** | Public | Encrypted | Depends | Nostr ⚠️ |
| **Offline Support** | PWA cache | Relay-dependent | PWA cache | Tie ✅ |
| **Community Familiarity** | High (GitHub) | Low (Nostr new) | Medium | OSM+GitHub ✅ |

### Verdict: OSM + GitHub is Superior

**Why GitHub Beats Nostr for This Use Case:**

1. **No user onboarding complexity** - No need to explain nsec/npub
2. **Proven workflow** - BTCMap.org demonstrates it works at scale
3. **Better moderation** - GitHub issues = built-in review system
4. **Familiar to developers** - More contributors can help
5. **Transparent** - Anyone can see submissions and approvals
6. **Reliable** - GitHub uptime > Nostr relay uptime
7. **Searchable** - GitHub search works great
8. **Audit trail** - Full history preserved

**When Nostr Makes Sense:**
- Private/sensitive data (medical, financial)
- Censorship resistance critical
- User owns their data absolutely
- Decentralization is the primary goal

**For Anmore.bike:**
- Routes are **public** data (benefit from openness)
- Community **wants transparency** (see what's pending)
- GitHub **familiar to contributors**
- No censorship risk (community-approved content)

---

## Implementation Roadmap

### Phase 1: Setup (Week 1)

**Tasks:**
- [ ] Create `anmore-bike-data` GitHub repository
- [ ] Set up GitHub Pages for data hosting
- [ ] Design routes.json schema
- [ ] Create submission issue template
- [ ] Write contributor guidelines (CONTRIBUTING.md)

**Deliverables:**
- Empty data repo ready to receive submissions
- Documentation for volunteers

### Phase 2: Frontend Changes (Week 2-3)

**Tasks:**
- [ ] Modify submission form to use GitHub API
- [ ] Add GitHub OAuth login (optional)
- [ ] Update map to fetch from routes.json
- [ ] Create admin dashboard (simple HTML)
- [ ] Update PWA to cache routes.json

**Deliverables:**
- Working submission form → GitHub issues
- Map displays routes from routes.json

### Phase 3: Automation (Week 4)

**Tasks:**
- [ ] GitHub Actions for validation
- [ ] Auto-publish approved routes
- [ ] Generate stats.json daily
- [ ] Discord/email notifications
- [ ] Backup workflow

**Deliverables:**
- Automated approval workflow
- Community notifications working

### Phase 4: Migration (Week 5-6)

**Tasks:**
- [ ] Export Nostr submissions to JSON
- [ ] Import to routes.json
- [ ] Dual-mode testing
- [ ] Community training
- [ ] Documentation updates

**Deliverables:**
- All historical routes preserved
- Both systems working side-by-side

### Phase 5: Launch (Week 7-8)

**Tasks:**
- [ ] Final testing
- [ ] Announce to community
- [ ] Onboard Route Champions
- [ ] Monitor first submissions
- [ ] Fix bugs and iterate

**Deliverables:**
- GitHub-based system live
- Nostr deprecated
- Community actively using

### Phase 6: OSM Integration (Month 3+)

**Tasks:**
- [ ] Train volunteers on JOSM/iD
- [ ] Define OSM tagging standards for Anmore
- [ ] Add approved routes to OSM
- [ ] Set up OSM sync (optional)

**Deliverables:**
- Anmore routes visible on global OSM
- Benefits broader cycling community

---

## Technical Considerations

### GitHub API Rate Limits

**Anonymous:** 60 requests/hour  
**Authenticated:** 5,000 requests/hour

**Solution:** Use GitHub OAuth for submissions (5,000 req/hr)

### Security

**Submission Validation:**
```javascript
// Prevent spam/malicious submissions
function validateRoute(geojson) {
  // Check bounds (must be within Anmore)
  const anmoreBounds = {
    north: 49.35,
    south: 49.30,
    east: -122.82,
    west: -122.90
  };
  
  // Verify coordinates are within bounds
  // Limit route length (< 50km)
  // Check for suspicious patterns
}
```

**Admin Authentication:**
- GitHub OAuth for admin dashboard
- Only repo collaborators can approve
- All actions logged in git history

### Performance

**Static JSON = Fast:**
- Pre-generated files
- Served from CDN
- No database queries
- Cache-friendly

**Estimated Load:**
- 1,000 users/day
- 10 submissions/week
- routes.json < 100KB
- Total bandwidth: Negligible on GitHub Pages

---

## Maintenance & Operations

### Daily Tasks (Automated)
- ✅ Generate stats.json (GitHub Action)
- ✅ Validate pending submissions (GitHub Action)
- ✅ Backup routes.json (automatic via Git)

### Weekly Tasks (Route Champions)
- 👤 Review pending submissions (GitHub issues)
- 👤 Approve/reject with feedback
- 👤 Update routes.json
- 👤 Optional: Add to OpenStreetMap

### Monthly Tasks (Community)
- 📊 Review stats
- 🎯 Plan new routes
- 📣 Promote achievements
- 🐛 Fix reported issues

### Yearly Tasks
- 🔄 Verify all routes still accurate
- 📝 Update documentation
- 🎉 Community celebration event

---

## Success Metrics

### Year 1 Goals

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Approved Routes** | 20+ | Count in routes.json |
| **Contributors** | 15+ | Unique GitHub usernames |
| **Active Route Champions** | 3+ | GitHub reviewers |
| **Website Visits** | 500/month | GitHub Pages analytics |
| **Routes Added to OSM** | 10+ | Tag search on OSM |

### Community Health Indicators

- ✅ Average approval time < 7 days
- ✅ >80% positive feedback on submissions
- ✅ At least 1 new route per month
- ✅ Zero unreviewed submissions > 30 days old
- ✅ Active discussion in GitHub issues

---

## Conclusion

This architecture follows the **proven btcmap.org model** while adapting it for bike route mapping in Anmore, BC.

**Key Advantages:**

1. **Simplicity** - No complex Nostr setup
2. **Transparency** - All submissions visible on GitHub
3. **Community-Driven** - Distributed moderation via Route Champions
4. **Cost-Effective** - $0 hosting (GitHub Pages)
5. **Future-Proof** - OpenStreetMap integration benefits everyone
6. **Familiar Tools** - GitHub workflow well-understood
7. **Reliable** - No dependency on Nostr relay uptime
8. **Scalable** - CDN handles growth automatically

**Next Steps:**

1. ✅ Review this architecture with community
2. Create `anmore-bike-data` GitHub repository
3. Recruit 3-5 Route Champions
4. Implement frontend changes
5. Migrate existing Nostr submissions
6. Launch and iterate

---

**Document Version:** 1.0  
**Author:** System Architect (OpenClaw Agent)  
**Date:** 2026-02-10  
**Status:** Ready for Community Review

---

## Appendix: OpenStreetMap Tagging Reference

When adding approved Anmore routes to OSM, use these tags:

### Bicycle Route Tags

```
route=bicycle
type=route
name=Eagle Ridge Loop
network=local
ref=AR-1
description=Family-friendly loop through Anmore Village
distance=5.2
ascent=120
mtb:scale=0
mtb:scale:uphill=1
surface=paved
smoothness=excellent
```

### Path/Way Tags

```
highway=cycleway
surface=paved
width=2
lit=yes
segregated=yes
bicycle=designated
foot=designated
```

### Documentation
- [OSM Bicycle Wiki](https://wiki.openstreetmap.org/wiki/Bicycle)
- [Cycle Routes](https://wiki.openstreetmap.org/wiki/Tag:route%3Dbicycle)
- [MTB Tagging](https://wiki.openstreetmap.org/wiki/Key:mtb:scale)

---

*End of Architecture Document*
