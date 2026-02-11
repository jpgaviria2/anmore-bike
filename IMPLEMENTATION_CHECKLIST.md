# Anmore.bike GitHub Architecture - Implementation Checklist

## Quick Start Guide

This checklist provides a step-by-step implementation plan to migrate from Nostr to GitHub-based architecture (following btcmap.org model).

---

## Phase 1: Repository Setup (Week 1)

### Day 1-2: Create Data Repository

- [ ] Create new GitHub repo: `anmore-bike-data`
- [ ] Set up repository structure:
  ```
  anmore-bike-data/
  ├── routes.json (empty FeatureCollection)
  ├── stats.json (initial stats)
  ├── submissions/
  │   ├── pending/
  │   ├── approved/
  │   └── rejected/
  ├── .github/
  │   ├── ISSUE_TEMPLATE/
  │   │   └── route-submission.md
  │   └── workflows/
  │       └── publish-routes.yml
  ├── README.md
  └── CONTRIBUTING.md
  ```

- [ ] Create initial `routes.json`:
  ```json
  {
    "type": "FeatureCollection",
    "metadata": {
      "generated_at": "2026-02-10T00:00:00Z",
      "total_routes": 0,
      "last_updated": "2026-02-10T00:00:00Z"
    },
    "features": []
  }
  ```

- [ ] Create GitHub issue template:
  ```markdown
  ---
  name: Route Submission
  about: Submit a new bike route for Anmore
  labels: route-submission, pending
  ---

  ## Route Information

  **Route Name:** 
  **Difficulty:** (easy/moderate/challenging)
  **Estimated Distance:** km
  **Surface Type:** (paved/gravel/dirt/mixed)

  ## Description

  [Describe the route, key features, and any safety notes]

  ## GeoJSON

  ```json
  [Paste GeoJSON from submission form]
  ```

  ## Submitter

  - GitHub User: @[username]
  - Date: [auto-filled]
  ```

### Day 3-4: Enable GitHub Pages

- [ ] Go to repo Settings → Pages
- [ ] Select branch: `main`
- [ ] Select folder: `/` (root)
- [ ] Save and wait for deployment
- [ ] Verify `https://[username].github.io/anmore-bike-data/routes.json` works

### Day 5: Documentation

- [ ] Write comprehensive `README.md`:
  - Purpose of repository
  - How to submit routes
  - How to become a Route Champion
  - Data schema documentation

- [ ] Write `CONTRIBUTING.md`:
  - Step-by-step submission guide
  - Review/approval process
  - Code of conduct
  - OSM tagging guidelines

---

## Phase 2: Frontend Integration (Week 2-3)

### Day 1-3: Modify Submission Form

- [ ] Update `src/pages/submit.astro` (or create new):
  ```javascript
  async function submitToGitHub(formData, geojson) {
    const issueBody = `
  ## Route Submission
  
  **Name:** ${formData.name}
  **Difficulty:** ${formData.difficulty}
  **Distance:** ${formData.distance} km
  **Surface:** ${formData.surface}
  
  ### Description
  ${formData.description}
  
  ### GeoJSON
  \`\`\`json
  ${JSON.stringify(geojson, null, 2)}
  \`\`\`
  
  ---
  *Submitted via anmore.bike on ${new Date().toISOString()}*
    `;
  
    const response = await fetch(
      'https://api.github.com/repos/[username]/anmore-bike-data/issues',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          title: `[ROUTE] ${formData.name}`,
          body: issueBody,
          labels: ['route-submission', 'pending']
        })
      }
    );
  
    return response.json();
  }
  ```

- [ ] Add success confirmation page
- [ ] Handle errors gracefully
- [ ] Test submission flow end-to-end

### Day 4-5: Update Map Display

- [ ] Modify main map page to fetch from GitHub:
  ```javascript
  // Fetch approved routes
  const routesUrl = 'https://[username].github.io/anmore-bike-data/routes.json';
  const routes = await fetch(routesUrl).then(r => r.json());
  
  // Display on Leaflet map
  L.geoJSON(routes, {
    style: (feature) => ({
      color: getDifficultyColor(feature.properties.difficulty),
      weight: 4,
      opacity: 0.7
    }),
    onEachFeature: (feature, layer) => {
      const props = feature.properties;
      layer.bindPopup(`
        <div class="route-popup">
          <h3>${props.name}</h3>
          <p><strong>Difficulty:</strong> ${props.difficulty}</p>
          <p><strong>Distance:</strong> ${props.length_km} km</p>
          <p><strong>Surface:</strong> ${props.surface}</p>
          <p>${props.description}</p>
          <small>Added: ${new Date(props.approved_at).toLocaleDateString()}</small>
        </div>
      `);
    }
  }).addTo(map);
  ```

### Day 6-7: Create Admin Dashboard (Optional)

- [ ] Create simple admin page: `src/pages/admin.astro`
- [ ] Use GitHub API to list pending issues
- [ ] Add approve/reject buttons (trigger GitHub API)
- [ ] Or keep it simple: just link to GitHub issues page

---

## Phase 3: Automation (Week 4)

### GitHub Actions Workflow

- [ ] Create `.github/workflows/publish-approved.yml`:
  ```yaml
  name: Publish Approved Routes
  
  on:
    issues:
      types: [closed, labeled]
  
  jobs:
    update-routes:
      if: contains(github.event.issue.labels.*.name, 'approved')
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        
        - name: Extract GeoJSON from issue
          id: extract
          run: |
            # Parse issue body, extract GeoJSON block
            # Save to submissions/approved/route-${{ github.event.issue.number }}.json
        
        - name: Update routes.json
          run: |
            # Read current routes.json
            # Append new route
            # Update metadata (count, timestamp)
            # Write back to routes.json
        
        - name: Commit changes
          run: |
            git config user.name "Anmore Bike Bot"
            git config user.email "bot@anmore.bike"
            git add routes.json submissions/
            git commit -m "Add route from issue #${{ github.event.issue.number }}"
            git push
        
        - name: Comment on issue
          uses: actions/github-script@v6
          with:
            script: |
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                body: '✅ Route published! View on [anmore.bike](https://anmore.bike)'
              });
  ```

- [ ] Create workflow for daily stats generation
- [ ] Create workflow for submission validation
- [ ] Test all workflows with dummy issues

---

## Phase 4: Data Migration (Week 5)

### Export Nostr Submissions

- [ ] Run monitoring script one final time
- [ ] Export all submissions to JSON file
- [ ] Create migration script:
  ```javascript
  const nostrSubmissions = require('./nostr-export.json');
  
  const migratedRoutes = nostrSubmissions.map((sub, index) => ({
    type: "Feature",
    id: `migrated-${index}`,
    geometry: JSON.parse(sub.geojson),
    properties: {
      name: sub.trail_name || sub.route_name,
      difficulty: mapDifficulty(sub.mtb_scale),
      surface: sub.surface,
      length_km: calculateLength(sub.geojson),
      description: sub.safety_concerns || sub.hazards || "",
      submitted_by: `nostr:${sub.npub.slice(0, 12)}...`,
      submitted_at: new Date(sub.created_at).toISOString(),
      approved_at: new Date().toISOString(),
      approved_by: "admin (migration)",
      migrated_from: "nostr"
    }
  }));
  
  // Add to routes.json
  const routesData = JSON.parse(fs.readFileSync('routes.json'));
  routesData.features.push(...migratedRoutes);
  routesData.metadata.total_routes = routesData.features.length;
  fs.writeFileSync('routes.json', JSON.stringify(routesData, null, 2));
  ```

- [ ] Run migration script
- [ ] Verify all routes appear on map
- [ ] Create migration report (how many migrated, any issues)

---

## Phase 5: Testing & Launch (Week 6-7)

### Testing

- [ ] Test submission flow:
  - [ ] Anonymous submission
  - [ ] GitHub-authenticated submission
  - [ ] Invalid GeoJSON handling
  - [ ] Duplicate route check

- [ ] Test approval flow:
  - [ ] Route Champion approves via label
  - [ ] Automatic publication
  - [ ] Notification to submitter
  - [ ] Route appears on map

- [ ] Test edge cases:
  - [ ] Very long routes
  - [ ] Routes outside Anmore bounds
  - [ ] Missing required fields
  - [ ] Malformed GeoJSON

- [ ] PWA offline testing:
  - [ ] Cache routes.json
  - [ ] Display cached routes offline
  - [ ] Queue submissions when offline

### Documentation

- [ ] Update main README.md
- [ ] Create user guide (How to submit)
- [ ] Create Route Champion guide
- [ ] Create troubleshooting FAQ
- [ ] Record demo video

### Community Launch

- [ ] Announce migration plan to community
- [ ] Recruit 3-5 Route Champions
- [ ] Train Route Champions on workflow
- [ ] Soft launch with beta testers
- [ ] Collect feedback and iterate
- [ ] Full public launch announcement

---

## Phase 6: Ongoing Operations

### Route Champion Tasks (Weekly)

- [ ] Review pending submissions (GitHub issues)
- [ ] Test routes when possible (ride them!)
- [ ] Approve valid submissions (add `approved` label)
- [ ] Reject invalid ones (close with explanation)
- [ ] Update routes.json when needed

### Community Admin Tasks (Monthly)

- [ ] Generate monthly stats report
- [ ] Highlight top contributors
- [ ] Plan community events
- [ ] Verify old routes still accurate
- [ ] Update documentation

### Technical Maintenance (Quarterly)

- [ ] Review GitHub Actions logs
- [ ] Check routes.json file size
- [ ] Optimize if needed
- [ ] Update dependencies
- [ ] Backup repository (git clone)

---

## Success Metrics (Track Monthly)

- [ ] Number of approved routes
- [ ] Number of pending submissions
- [ ] Number of contributors
- [ ] Average approval time (target: < 7 days)
- [ ] Website traffic
- [ ] Routes added to OSM (bonus goal)

---

## Rollback Plan (If Needed)

If GitHub approach doesn't work:

1. Keep routes.json but revert submission method
2. Nostr code is archived (can restore from git)
3. Migrate routes back to Nostr if needed (unlikely)

**Low risk:** BTCMap.org proves this model works at scale!

---

## Resources & Links

### Documentation
- BTCMap Architecture: `BTCMAP_ARCHITECTURE.md`
- Full Architecture Design: `ANMORE_ARCHITECTURE.md`
- Comparison Doc: `ARCHITECTURE_COMPARISON.md`

### GitHub Repos to Reference
- BTCMap Data: https://github.com/teambtcmap/btcmap-data
- BTCMap Web: https://github.com/teambtcmap/btcmap.org

### Community
- Discord: [anmore bike channel]
- GitHub Discussions: Enable in anmore-bike-data repo
- Email updates: Route approval notifications

---

## Questions & Support

**Need help?**
- Check existing GitHub issues
- Join Discord #dev channel
- Tag @[your-username] in issues

**Found a bug?**
- Create issue in anmore-bike repo
- Label: `bug`
- Include steps to reproduce

---

**Estimated Total Time:** 60-80 hours developer time  
**Timeline:** 6-8 weeks from start to full launch  
**Cost:** $0 (all free tools)

**Let's build something amazing for Anmore! 🚴‍♂️**
