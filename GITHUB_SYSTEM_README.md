# GitHub-Based Route Management System

**Status:** ✅ Fully Implemented  
**Deployment:** https://jpgaviria2.github.io/anmore-bike/draw-simple.html

---

## 🎯 System Overview

Anmore.bike uses **GitHub as the backend** for managing community-submitted bike routes:

- **Users** draw routes and submit via GitHub Issues
- **Moderator (JP)** reviews and approves submissions
- **Approved routes** added to `routes.json` file
- **Website** automatically displays all approved routes as green overlay on map

**Inspired by:** btcmap.org (Bitcoin merchant map using OSM)

---

## 📦 Components

### 1. User-Facing Tools

**Drawing Page:** `public/draw-simple.html`
- Interactive map with drawing tools
- See existing approved routes (green lines)
- Draw new routes (blue lines)
- Submit via GitHub Issue button
- Alternate: Download GeoJSON file

**URL:** https://jpgaviria2.github.io/anmore-bike/draw-simple.html

### 2. Submission System

**GitHub Issue Template:** `.github/ISSUE_TEMPLATE/route-submission.md`
- Pre-formatted form for route details
- Automatic labels: `route-submission`, `pending-review`
- Auto-assigns to JP
- Includes GeoJSON data section

**Issue Queue:** https://github.com/jpgaviria2/anmore-bike/issues?q=is%3Aissue+is%3Aopen+label%3Aroute-submission

### 3. Data Storage

**Routes File:** `public/routes.json`
```json
{
  "type": "FeatureCollection",
  "metadata": {
    "name": "Anmore Bike Routes",
    "updated": "2026-02-10"
  },
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "LineString", "coordinates": [...] },
      "properties": {
        "name": "Route Name",
        "description": "Brief description",
        "approved_date": "2026-02-10",
        "category": "bike-train",
        "difficulty": "Easy"
      }
    }
  ]
}
```

### 4. Admin Tools

**Workflow Guide:** `ADMIN_WORKFLOW.md`
- Step-by-step approval process
- How to edit routes.json
- Closing issues properly
- Troubleshooting

---

## 🔄 Data Flow

```
┌─────────────┐
│    User     │
│ Draws Route │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│ Submit via GitHub Issue │
│ (GeoJSON + Details)     │
└───────────┬─────────────┘
            │
            ▼
    ┌───────────────┐
    │ GitHub Issues │◄─── Moderator (JP)
    │  (Pending)    │     Reviews
    └───────┬───────┘
            │
        ┌───┴───┐
        │Approve│
        └───┬───┘
            │
            ▼
    ┌─────────────┐
    │   JP edits  │
    │ routes.json │
    │ & commits   │
    └──────┬──────┘
           │
           ▼
   ┌───────────────┐
   │ GitHub Pages  │
   │   Deploys     │
   │  (2-3 min)    │
   └───────┬───────┘
           │
           ▼
   ┌───────────────┐
   │  Website Map  │
   │ Shows Green   │
   │    Route!     │
   └───────────────┘
```

---

## 🚀 User Journey

### Submitting a Route

1. **Go to:** https://jpgaviria2.github.io/anmore-bike/draw-simple.html
2. **Draw route** using polyline tool on left side of map
3. **Click:** "✨ Submit via GitHub Issue"
4. **Fill prompts:**
   - Route name
   - Description (optional)
   - Difficulty level
5. **Click:** "Submit new issue" on GitHub
6. **Wait for approval** (JP reviews and notifies you)

### Alternate Method (No GitHub Account)

1. Draw route
2. Click "📥 Download GeoJSON File"
3. Send file to JP via WhatsApp/email
4. JP creates issue for you

---

## 👨‍💼 Admin Journey

### Approving a Route

1. **Check queue:** https://github.com/jpgaviria2/anmore-bike/issues?q=is%3Aissue+is%3Aopen+label%3Aroute-submission
2. **Review issue:**
   - Route name makes sense?
   - GeoJSON data present?
   - Safety concerns addressed?
3. **Edit routes.json:**
   - Go to: https://github.com/jpgaviria2/anmore-bike/blob/main/public/routes.json
   - Click "Edit" (pencil icon)
   - Add route to features array
   - Commit: "Add route: [Name] (closes #[issue])"
4. **Close issue:**
   - Add thank-you comment
   - Label as `approved`
   - Close
5. **Verify:** Check website in 2-3 minutes

**Full guide:** See `ADMIN_WORKFLOW.md`

---

## 📊 Advantages Over Nostr

| Feature | Nostr (Previous) | GitHub (Current) |
|---------|------------------|------------------|
| User friction | High (nsec keys) | Low (GitHub login) |
| Data persistence | Relay-dependent | Guaranteed (Git) |
| Moderation UI | Custom build | Built-in (Issues) |
| Public visibility | Hidden | Transparent |
| Cost | $0-25/month | $0/month |
| Maintenance | 2h/month | 1h/month |
| Community trust | Low (unfamiliar) | High (familiar) |

---

## 🎓 Based on btcmap.org

This architecture mirrors btcmap.org's proven approach:

**btcmap.org:**
- Bitcoin merchants → OSM tags → Static JSON → Map overlay

**anmore.bike:**
- Bike routes → GitHub Issues → routes.json → Map overlay

Both use:
- ✅ OpenStreetMap base tiles
- ✅ Static JSON data file
- ✅ Community submissions
- ✅ Volunteer moderators
- ✅ GitHub for transparency
- ✅ $0 infrastructure cost

**Reference:** `BTCMAP_ARCHITECTURE.md`

---

## 🔧 Maintenance

### Regular Tasks

**Daily:** Check issue queue (1-2 min)  
**Weekly:** Review and approve submissions (10-15 min)  
**Monthly:** Update metadata in routes.json (optional)

### Scaling

**Current capacity:** 100s of routes (tested up to 500+ on btcmap.org)  
**Performance:** Static JSON = CDN-cached, sub-100ms load times  
**Storage:** GitHub repos support 1GB+ (routes.json unlikely to exceed 10MB even with 1000 routes)

---

## 📚 Documentation

- **User Guide:** Instructions in draw-simple.html
- **Admin Workflow:** `ADMIN_WORKFLOW.md`
- **Architecture:** `ANMORE_ARCHITECTURE.md`
- **Comparison:** `ARCHITECTURE_COMPARISON.md`
- **Implementation:** `IMPLEMENTATION_CHECKLIST.md`
- **btcmap Research:** `BTCMAP_ARCHITECTURE.md`

---

## 🎯 Success Metrics

**Launch Goals (Month 1):**
- ✅ System deployed
- ✅ First 3-5 routes approved
- ✅ Zero infrastructure costs
- ✅ <24h average approval time

**Growth Goals (Month 3):**
- 20+ approved routes
- 5+ active contributors
- Community feedback incorporated
- Routes optionally added to OpenStreetMap

---

## 🆘 Support

**Technical Issues:**
- Check GitHub Actions: https://github.com/jpgaviria2/anmore-bike/actions
- Review browser console (F12)
- Validate JSON: https://jsonlint.com/

**Questions:**
- Create discussion: https://github.com/jpgaviria2/anmore-bike/discussions
- Contact JP via WhatsApp
- Check architecture docs

---

**System Status:** 🟢 Operational  
**Last Updated:** 2026-02-10  
**Moderator:** JP (@jpgaviria2)
