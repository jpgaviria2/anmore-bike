# WhatsApp Route Submission Workflow

Quick guide for users and admin on the WhatsApp submission system.

---

## 🚴 For Users: How to Submit a Route

### Step 1: Open Any Map Page

Go to one of these pages:
- https://jpgaviria2.github.io/anmore-bike/bike-train.html (Bike Train Routes)
- https://jpgaviria2.github.io/anmore-bike/pump-track.html (Pump Track Locations)
- https://jpgaviria2.github.io/anmore-bike/trail-building.html (Trail Building)

### Step 2: See Approved Routes

- **Green lines** = approved routes visible to everyone
- Click on a green line to see route details
- You can draw your route on top of existing routes

### Step 3: Draw Your Route

**Using the Drawing Tools (left side of map):**
1. Click the **polyline tool** (diagonal line icon)
2. Click on the map to add points along your route
3. Double-click to finish the route
4. Use the **marker tool** (pin icon) to mark important spots

**Editing:**
- Click the **edit** tool (pencil icon) to modify your drawing
- Click the **delete** tool (trash icon) to remove shapes

### Step 4: Submit via WhatsApp

1. Click the **"Submit via WhatsApp"** button (top right, green button with WhatsApp logo)
2. Enter details when prompted:
   - **Route name**: e.g., "Sunnyside School Route"
   - **Description** (optional): e.g., "Safe route with bike lane"
   - **Difficulty**: Easy, Moderate, or Challenging
   - **Category**: bike-train, recreation, or commute
3. WhatsApp opens with your route data ready to send
4. Click **Send** in WhatsApp
5. Done! You'll hear back when your route is approved

---

## 👨‍💼 For Admin (JP): How to Approve Routes

### Step 1: Receive WhatsApp Submission

You'll get a message like:
```
🚴 New Bike Route Submission

**Route Name:** Sunnyside School Route
**Description:** Safe route with bike lane
**Difficulty:** Easy
**Category:** bike-train

**GeoJSON Data:**
```json
{
  "type": "FeatureCollection",
  "features": [...]
}
```

Submitted from anmore.bike map
```

### Step 2: Review the Route

**Visual Review:**
1. Copy the GeoJSON block (everything in the code fence)
2. Go to: http://geojson.io
3. Paste the GeoJSON to see the route on a map
4. Verify it makes sense

**Quality Check:**
- Route is appropriate for Anmore
- No obvious safety issues
- Name and description are reasonable

### Step 3: Add to routes.json

**Option A: GitHub Web Interface** (Easiest)

1. Go to: https://github.com/jpgaviria2/anmore-bike/blob/main/public/routes.json
2. Click **"Edit"** (pencil icon)
3. Copy the feature(s) from the WhatsApp message
4. Add to the `features` array:

```json
{
  "type": "FeatureCollection",
  "metadata": { ... },
  "features": [
    // ... existing routes ...
    {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [[PASTE FROM WHATSAPP]]
      },
      "properties": {
        "name": "Route Name from WhatsApp",
        "description": "Description from WhatsApp",
        "approved_date": "2026-02-10",
        "category": "bike-train",
        "difficulty": "Easy"
      }
    }
  ]
}
```

5. **Commit:** "Add route: [Route Name]"
6. Route goes live in 2-3 minutes!

**Option B: Local Edit**

```bash
cd anmore-bike
git pull
# Edit public/routes.json in your editor
git add public/routes.json
git commit -m "Add route: [Route Name]"
git push
```

### Step 4: Notify User

Reply in WhatsApp:
```
✅ Your route "[Route Name]" has been approved and is now live on anmore.bike!

You can see it at:
https://jpgaviria2.github.io/anmore-bike/bike-train.html

Thank you for contributing to Anmore's bike network! 🚴‍♂️
```

---

## 📊 Quick Stats

**To see total approved routes:**
```bash
cd anmore-bike
cat public/routes.json | grep -c '"type": "Feature"'
```

**To view routes.json:**
- GitHub: https://github.com/jpgaviria2/anmore-bike/blob/main/public/routes.json
- Live: https://jpgaviria2.github.io/anmore-bike/routes.json

---

## 🔧 Troubleshooting

### User Issues

**"I don't see the Submit button!"**
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Clear browser cache
- Try a different browser

**"WhatsApp didn't open"**
- Check if pop-ups are blocked
- Click the address bar to allow pop-ups
- Try clicking the button again

**"My drawing disappeared!"**
- Drawings are not saved automatically
- Submit immediately after drawing
- Or use the "Download GeoJSON" option as backup

### Admin Issues

**"routes.json won't save!"**
- Validate JSON: https://jsonlint.com/
- Check for missing commas between features
- Ensure all brackets are closed

**"Route not showing on website!"**
- Wait 2-3 minutes for GitHub Pages to rebuild
- Hard refresh the page (Ctrl+Shift+R)
- Check GitHub Actions: https://github.com/jpgaviria2/anmore-bike/actions

**"Coordinates are backwards!"**
- GeoJSON format: [longitude, latitude] (not lat, lon)
- If route appears in wrong location, swap the coordinates

---

## 💡 Tips

### For Users
- Draw routes in the direction you ride them
- Add markers for important intersections or hazards
- Be descriptive in your route name ("Sunnyside to School" > "Route 1")
- Double-check your route before submitting

### For Admin
- Batch multiple approvals in one commit
- Use consistent category names
- Keep descriptions concise (1-2 sentences)
- If unsure about a route, ask the submitter for clarification

---

## 🎯 Success Metrics

**After first week:**
- [ ] 5+ routes submitted
- [ ] 3+ routes approved
- [ ] Multiple users participating
- [ ] Zero technical issues

**After first month:**
- [ ] 20+ routes approved
- [ ] Routes from all categories (bike-train, recreation, commute)
- [ ] Community feedback incorporated
- [ ] System runs smoothly

---

**Questions?** Contact JP via WhatsApp: +1 (778) 384-1055
