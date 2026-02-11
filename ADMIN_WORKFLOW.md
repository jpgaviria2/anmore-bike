# Admin Workflow - Route Approval

Quick guide for JP to approve and publish new bike routes.

---

## 📥 Step 1: Review Submission

New route submissions appear as **GitHub Issues** with the label `route-submission`.

**Check these:**
1. Go to: https://github.com/jpgaviria2/anmore-bike/issues?q=is%3Aissue+is%3Aopen+label%3Aroute-submission
2. Open the issue to review:
   - Route name makes sense
   - GeoJSON data is present
   - Safety notes look reasonable
   - Route is appropriate for Anmore

**Decision:**
- ✅ **Approve** → Continue to Step 2
- ❌ **Reject** → Add comment explaining why, close issue with label `rejected`

---

## ✅ Step 2: Add Route to routes.json

### Option A: GitHub Web Interface (Easy)

1. **Open routes.json:**
   - https://github.com/jpgaviria2/anmore-bike/blob/main/public/routes.json

2. **Click "Edit" (pencil icon)**

3. **Copy the GeoJSON from the issue**
   - Find the code block with GeoJSON in the issue
   - Copy just the feature(s), not the whole FeatureCollection wrapper

4. **Add to the features array:**
   ```json
   {
     "type": "FeatureCollection",
     "features": [
       // ... existing routes ...
       {
         "type": "Feature",
         "geometry": {
           "type": "LineString",
           "coordinates": [[...]]
         },
         "properties": {
           "name": "Route Name from Issue",
           "description": "Description from issue",
           "submitted_by": "Name from issue or Anonymous",
           "approved_date": "2026-02-10",
           "difficulty": "Easy",
           "category": "bike-train"
         }
       }
     ]
   }
   ```

5. **Add properties if missing:**
   - `name`: Route name
   - `description`: Brief description
   - `approved_date`: Today's date
   - `category`: bike-train, recreation, commute, or other
   - `difficulty`: Easy, Moderate, or Challenging

6. **Commit:**
   - Commit message: "Add route: [Route Name] (closes #[issue-number])"
   - Click "Commit changes"

### Option B: Command Line (Advanced)

```bash
cd anmore-bike
git pull

# Edit public/routes.json in your editor
# Add the new route to the features array

git add public/routes.json
git commit -m "Add route: [Route Name] (closes #123)"
git push
```

---

## 🎉 Step 3: Close Issue

1. **Go back to the issue**
2. **Add comment:**
   ```
   ✅ Approved and published! Your route is now live at https://jpgaviria2.github.io/anmore-bike/draw-simple.html
   
   Thank you for contributing to Anmore's bike route network! 🚴‍♂️
   ```
3. **Close issue** with label `approved`

---

## 🗺️ Step 4: Verify on Website

1. **Wait 2-3 minutes** for GitHub Pages to rebuild
2. **Open:** https://jpgaviria2.github.io/anmore-bike/draw-simple.html
3. **Check:** New route should appear as green line on the map
4. **Click the route:** Popup should show route details

---

## 🔧 Troubleshooting

### Routes.json validation failed?
- Check JSON syntax: https://jsonlint.com/
- Make sure commas are correct between features
- Ensure all brackets are closed

### Route not appearing on map?
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Check browser console (F12) for errors
- Verify GitHub Pages deployment succeeded: https://github.com/jpgaviria2/anmore-bike/actions

### Wrong route displayed?
- Check coordinates are [longitude, latitude] (not lat, lon)
- Verify GeoJSON type is "LineString" for routes or "Point" for markers

---

## 📊 Quick Stats

**To see how many routes you have:**
```bash
# Count features in routes.json
cat public/routes.json | grep -c '"type": "Feature"'
```

**Or check GitHub:**
- Issues closed with `approved` label = total approved routes

---

## 🎯 Tips

1. **Batch Processing:** Review multiple issues, add all routes at once, single commit
2. **Categories:** Use consistent category names for filtering later
3. **Descriptions:** Keep them concise (1-2 sentences)
4. **Safety:** If safety concerns are serious, ask for more details before approving
5. **Community:** Thank contributors in your closing comments!

---

**Questions?** Check the architecture docs or ping Manager Bot! ☕
