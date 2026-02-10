  # Testing Guide - Persistent Map Layers

## Overview

This guide explains how to test the complete bike train approval workflow:
1. User submits a bike train route
2. Admin reviews and approves in dashboard
3. Route appears on public map for all users
4. Real-time subscription updates work

---

## 🌐 Deployment URLs

- **Main Site:** https://jpgaviria2.github.io/anmore-bike/
- **Bike Train Page:** https://jpgaviria2.github.io/anmore-bike/bike-train/
- **Admin Dashboard:** https://jpgaviria2.github.io/anmore-bike/admin/
- **GitHub Repository:** https://github.com/jpgaviria2/anmore-bike

---

## 📋 Prerequisites

### For Testing the Full Workflow:

1. **Admin Access:**
   - You need the admin `nsec` (private key)
   - Default admin npub: `npub19djteyezrkn9ppg6gjfsxl59pgxrwh76uju60lxtcvr5svj3cmlsf54ca2`
   - If you don't have the nsec, you can test with your own key (see "Quick Test" below)

2. **Web Browser:**
   - Chrome, Firefox, Safari, or Edge
   - JavaScript enabled
   - LocalStorage enabled

3. **Nostr Relays:**
   - Connected relays:
     - wss://relay.anmore.me
     - wss://relay.damus.io
     - wss://nos.lol
     - wss://relay.primal.net

---

## 🚀 Quick Test (Publish Test Route)

The fastest way to see the feature working is to publish a test approved route:

### Option A: Using Test Script (Requires Node.js)

```bash
# 1. Clone the repository (if not already)
git clone https://github.com/jpgaviria2/anmore-bike.git
cd anmore-bike

# 2. Install dependencies
npm install

# 3. Edit test-publish-approved-route.js
# Replace ADMIN_NSEC with your test nsec

# 4. Run the script
node test-publish-approved-route.js
```

The script will:
- Publish a test bike train route to Nostr relays
- Show success/failure for each relay
- Provide verification instructions

### Option B: Using Admin Dashboard

1. **Get Admin nsec:**
   - If you don't have one, create a test key:
     - Visit https://jpgaviria2.github.io/anmore-bike/bike-train/
     - Click "Login with Key" 
     - A new keypair will be generated
     - **Save the nsec shown** (starts with `nsec1...`)

2. **Update Config (for your own testing):**
   - Fork the repository
   - Edit `src/lib/config.ts`
   - Change `ADMIN_NPUB` to your npub
   - Commit and push to trigger deployment

3. **Use Admin Dashboard:**
   - Go to https://jpgaviria2.github.io/anmore-bike/admin/
   - Enter your admin nsec
   - Click "Login as Admin"

---

## 🧪 Complete Workflow Test

### Step 1: Submit a Bike Train Route (as User)

1. **Open Bike Train Page:**
   - Navigate to https://jpgaviria2.github.io/anmore-bike/bike-train/

2. **Create Profile (if first time):**
   - Click "Login with Key"
   - Enter your name or use default "bikeuser"
   - Check "Display my name publicly" (optional)
   - Click "Create Profile"
   - **SAVE YOUR NSEC** - you'll need it to decrypt responses

3. **Draw Route on Map:**
   - Use the polyline tool (line icon) in the map controls
   - Click points to draw a route (e.g., from home to school)
   - Use the marker tool to add start/end points
   - Click "Finish" when done

4. **Fill Out Form:**
   - **Route Name:** e.g., "Heritage Park to Anmore Elementary"
   - **School:** e.g., "Anmore Elementary"
   - **Days & Times:** e.g., "Monday-Friday, 8:00 AM"
   - **Cycleway Type:** Select infrastructure type
   - **Surface:** Select surface type
   - **Crossings:** Select crossing types present
   - **Traffic Calming:** Select traffic calming features
   - **Additional Info:** Add notes about the route
   - **Email:** (optional) for coordination

5. **Submit:**
   - Click "Submit Bike Train Route"
   - Wait for Nostr DM to publish to relays
   - You should see "Published to X/4 relays"
   - **Success message** appears
   - If first submission, you'll see your nsec - **SAVE IT!**

### Step 2: Review Submission (as Admin)

1. **Open Admin Dashboard:**
   - Navigate to https://jpgaviria2.github.io/anmore-bike/admin/

2. **Login:**
   - Enter admin nsec
   - Click "Login as Admin"
   - You should see "Pending Submissions" page

3. **Load Submissions:**
   - The dashboard queries Nostr relays for encrypted DMs
   - Submissions appear as cards showing:
     - Submission type (Bike Train Route)
     - Timestamp
     - Contributor name
     - Whether map data is included

4. **Review Submission:**
   - Click "Review Submission" on any card
   - Modal opens showing:
     - **Map preview** with route drawn
     - **Form data** in table format
     - **Contributor details**

5. **Approve or Reject:**
   
   **To Approve:**
   - Add admin note (optional): e.g., "Great route! Safe for elementary students."
   - Click "✓ Approve & Publish"
   - Event (kind:30078) is published to relays
   - Success message: "Approved: [Route Name]"
   
   **To Reject:**
   - Click "✗ Reject"
   - Enter rejection reason
   - Encrypted DM sent back to contributor

### Step 3: Verify Public Display

1. **Open Bike Train Page (in new window/tab):**
   - Navigate to https://jpgaviria2.github.io/anmore-bike/bike-train/
   - **Do NOT login** - test as anonymous visitor

2. **Wait for Routes to Load:**
   - Check browser console (F12 → Console tab)
   - You should see:
     ```
     📥 Loading approved routes (category: bike-train)...
     ✅ Found X approved routes
     ✅ Parsed X valid routes
     ```

3. **View Approved Routes:**
   - Look for **green solid lines** on the map
   - These are approved routes (vs blue dashed = user drawings)
   - Routes load automatically on page load

4. **Interact with Routes:**
   - Click on a green route line
   - Popup appears showing:
     - Route name
     - Status: "✅ Approved"
     - Description
     - Admin approval note
     - Approval date
     - Contributor name (if public)

5. **Toggle Layers:**
   - Use layer control (top-right corner of map)
   - Checkboxes:
     - ✅ Approved Routes
     - ✏️ Your Drawing
   - Toggle to show/hide each layer

### Step 4: Test Real-Time Updates

1. **Open Two Browser Windows:**
   - Window 1: Admin dashboard (logged in)
   - Window 2: Bike train page (public view)

2. **Keep Window 2 Open:**
   - Don't refresh the page
   - This tests the subscription feature

3. **Approve New Route in Window 1:**
   - Review and approve a submission
   - Click "Approve & Publish"

4. **Watch Window 2:**
   - Within 5-10 seconds, new route should appear
   - Check browser console for:
     ```
     🆕 New approval received: [event ID]
     ```
   - Route automatically added to map (no refresh needed)

---

## 🔍 Verification Checklist

### ✅ Feature Working If:

- [ ] User can draw and submit bike train routes
- [ ] Encrypted DM sent to admin successfully
- [ ] Admin can login with nsec
- [ ] Admin dashboard loads pending submissions
- [ ] Map preview works in admin modal
- [ ] Approval publishes kind:30078 event to relays
- [ ] Approved routes appear as green lines on public map
- [ ] Route popups show correct details
- [ ] Layer control toggles approved routes
- [ ] Real-time subscription adds new approvals without refresh
- [ ] Rejection sends DM back to contributor

### 🐛 Troubleshooting

**Problem: No approved routes appear**
- Check browser console for errors
- Verify relays are reachable (check network tab)
- Confirm admin npub matches approved events
- Try refreshing page

**Problem: Admin dashboard shows "No pending submissions"**
- Verify submissions were sent (check relay confirmation)
- Check that admin nsec matches recipient npub
- Submissions may have been approved already

**Problem: Real-time updates don't work**
- Check browser console for subscription confirmation
- Ensure WebSocket connections are open (network tab)
- Some relays may not support subscriptions

**Problem: Map doesn't load**
- Check browser console for Leaflet errors
- Verify CDN links are accessible
- Try hard refresh (Ctrl+Shift+R)

---

## 🧰 Testing Tools

### Browser Console Commands

Open browser console (F12) and try these:

```javascript
// Check loaded routes
console.log(window.bikeTrainApprovedLayer);

// Check subscription status
console.log('Subscribed to approvals:', window.bikeTrainSubscription !== undefined);

// Manually load routes
import { loadApprovedRoutes } from './src/lib/routes.ts';
const routes = await loadApprovedRoutes('bike-train');
console.log('Routes:', routes);
```

### Nostr Event Inspection

Use a Nostr client (e.g., https://snort.social, https://iris.to) to:

1. **View Approved Routes:**
   - Search for events from admin npub
   - Filter by kind:30078
   - Check tags: `#t=anmore-bike`, `#category=bike-train`

2. **View Submissions:**
   - Login with contributor nsec
   - Check DMs to admin
   - See approval/rejection responses

---

## 📊 Test Data Examples

### Sample Bike Train Route

**Route Name:** "Sunnyside Safe Route"  
**School:** "Anmore Elementary School"  
**Days:** "Monday-Friday"  
**Times:** "7:45 AM - 8:15 AM"  
**Cycleway Type:** "Residential Street (shared road)"  
**Surface:** "Paved"  
**Crossings:** "Marked crosswalks", "Traffic light"  
**Traffic Calming:** "Speed bumps", "20 km/h zone"  
**Description:** "This route follows quiet residential streets with minimal traffic. Parents meet at Heritage Park and ride together to school. Adult volunteers lead and sweep the group."

### Sample GeoJSON

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [-122.8565, 49.3257],
          [-122.8555, 49.3267],
          [-122.8545, 49.3277]
        ]
      },
      "properties": {
        "name": "Sunnyside Safe Route",
        "cycleway": "shared_lane",
        "surface": "paved",
        "lit": "yes"
      }
    }
  ]
}
```

---

## 🎯 Success Metrics

After testing, you should verify:

1. **Submission Flow:**
   - Encrypted DM successfully sent to admin
   - GeoJSON data preserved correctly
   - Form data captured completely

2. **Admin Workflow:**
   - Dashboard accessible only with valid admin nsec
   - Submissions decrypt correctly
   - Map preview accurate
   - Approval/rejection both work

3. **Public Display:**
   - Approved routes visible to all users
   - Routes styled correctly (green solid)
   - Popups show all details
   - Layer control functional

4. **Real-Time:**
   - Subscription establishes on page load
   - New approvals appear automatically
   - No page refresh needed

5. **Decentralization:**
   - Works with multiple relays (redundancy)
   - No backend server required
   - Data stored on Nostr network
   - Fully client-side operation

---

## 📝 Reporting Issues

If you find bugs or unexpected behavior:

1. **Check browser console** for error messages
2. **Note the exact steps** to reproduce
3. **Capture screenshots** if visual issue
4. **Export Nostr events** if data issue
5. **Report on GitHub:** https://github.com/jpgaviria2/anmore-bike/issues

Include:
- Browser & version
- Operating system
- Error messages
- Expected vs actual behavior

---

## 🚀 Next Steps

After verifying bike train routes work:

1. **Test Trail Building:**
   - Same workflow on `/trail-building/` page
   - Verify category filter works (`category=trail`)

2. **Test Pump Track:**
   - Same workflow on `/pump-track/` page
   - Verify polygon geometry works

3. **Scale Testing:**
   - Approve 10+ routes
   - Verify map performance
   - Check layer control with multiple routes

4. **Cross-Browser:**
   - Test on mobile (iOS Safari, Chrome Android)
   - Test on desktop (Chrome, Firefox, Safari, Edge)

5. **Multi-Admin:**
   - Test with multiple admin keys
   - Verify all admins can approve

---

## 📚 Additional Resources

- **Nostr Protocol:** https://github.com/nostr-protocol/nostr
- **NIP-04 (Encrypted DMs):** https://github.com/nostr-protocol/nips/blob/master/04.md
- **NIP-78 (App Data):** https://github.com/nostr-protocol/nips/blob/master/78.md
- **Leaflet.js Docs:** https://leafletjs.com/reference.html
- **Leaflet.draw Docs:** https://leaflet.github.io/Leaflet.draw/docs/leaflet-draw-latest.html
- **Project Plan:** See `PERSISTENT_MAPS_PLAN.md` in repository

---

**Happy Testing! 🚴‍♂️🚴‍♀️**
