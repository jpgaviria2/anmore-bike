# Anmore.bike

A community-driven platform for bike resources in Anmore, BC using Nostr protocol for decentralized form submissions.

## Features

- 🚴 **Trail Building**: Proposals with comprehensive OpenStreetMap metadata (surface, difficulty, width, access)
- 🎢 **Pump Track**: Location mapping with polygon drawing, design specifications
- 🚂 **Bike Train**: School route coordination with safety features mapping (crossings, traffic calming)
- 🛠️ **Bike Clinics**: Instructor volunteer signup with skills and certifications
- 📚 **Afterschool Programs**: Youth registration with parent/guardian info and medical accommodations
- 🏆 **Leaderboard**: Community contributor rankings with achievement badges
- 🔒 **Privacy-first**: Nostr NIP-04 encryption, no servers, no databases
- 📱 **Mobile-first PWA**: Progressive Web App with offline support
- 💾 **Offline Queue**: Submit forms without internet, auto-sync when online

## Tech Stack

- **Framework**: Astro v5.17.1
- **Styling**: Tailwind CSS v4.1.18
- **Mapping**: Leaflet.js 1.9.4 + Leaflet.draw 1.0.4
- **Protocol**: Nostr (nostr-tools, NIP-04 encryption)
- **PWA**: Service worker with Anmore map tile caching (zoom 10-18)
- **Relays**: relay.anmore.me, relay.damus.io, nos.lol, relay.primal.net

## Quick Start

1. **Clone and install**:
   ```bash
   git clone <repo-url>
   cd Bike-Train
   npm install
   ```

2. **Configure environment** (create `.env` file):
   ```
   NOSTR_NSEC=YOUR_NSEC_KEY_HERE  # Replace with your actual nsec (keep private!)
   ```
   
   > ⚠️ **Security**: Never commit `.env` to git. Use `.env.example` as template.

3. **Start development server**:
   ```bash
   npm run dev
   ```
   
   Open http://localhost:4321

4. **Monitor submissions** (in separate terminal):
   ```bash
   node scripts/monitor.js
   ```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NOSTR_NSEC` | Your Nostr secret key (nsec format) for receiving encrypted form submissions | Yes |

**How to get your nsec**:
1. Visit the site and create a profile (it generates a keypair)
2. Copy the nsec from the profile modal
3. Add to `.env` file

## Project Structure

```
Bike-Train/
├── src/
│   ├── layouts/
│   │   └── Layout.astro          # Base template with PWA setup
│   ├── components/
│   │   ├── Navigation.astro      # Mobile hamburger menu
│   │   └── ProfileModal.astro    # User profile management
│   ├── pages/
│   │   ├── index.astro           # Homepage with sections
│   │   ├── trail-building.astro  # Trail proposals + OSM metadata
│   │   ├── pump-track.astro      # Pump track locations + designs
│   │   ├── bike-train.astro      # School route coordination
│   │   ├── clinics.astro         # Instructor volunteer signup
│   │   ├── afterschool.astro     # Youth program registration
│   │   └── leaderboard.astro     # Contributor rankings
│   └── lib/
│       ├── nostr.ts              # Nostr protocol utilities
│       ├── profile.ts            # Profile management
│       └── offline.ts            # PWA offline queue
├── public/
│   ├── sw.js                     # Service worker
│   └── manifest.json             # PWA manifest
├── scripts/
│   └── monitor.js                # Receive & decrypt submissions
└── .env                          # Environment variables (git-ignored)
```

## Form Submission Flow

1. **User creates profile** → Generates Nostr keypair (npub/nsec)
2. **Fills form** → Collects data + GeoJSON from map interactions
3. **Encrypts** → NIP-04 encryption to recipient npub
4. **Sends DM** → Broadcasts encrypted DM to 3-5 Nostr relays
5. **Monitoring script** → Decrypts with nsec, displays formatted HTML

## Monitoring Submissions

**Start the monitor**:
```bash
node scripts/monitor.js
```

**Features**:
- Real-time decryption of incoming submissions
- HTML formatted display with all form fields
- GeoJSON output for OpenStreetMap import
- Contributor statistics and leaderboard
- Tracks submission counts by form type

**Sample output**:
```
📧 New Submission Received! [Trail Building]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
From: bikeuser (npub1...)
Email: user@example.com
Trail Name: Eagle Ridge Connector
Surface: compacted
MTB Scale: 2
Width: 1.5m
GeoJSON: {"type":"LineString","coordinates":[...]}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Leaderboard:
1. npub1... - 5 contributions
2. npub1... - 3 contributions
```

## OpenStreetMap Contribution Workflow

All form submissions include comprehensive OSM metadata for direct contribution:

1. **Receive submission** via `monitor.js`
2. **Extract GeoJSON** from console output
3. **Import to JOSM or iD editor**:
   - JOSM: File → Open → Paste GeoJSON
   - iD: Background → Custom → Paste GeoJSON URL
4. **Add OSM tags** (already collected in form):
   - Trail: `surface=*, mtb:scale=*, width=*, trail_visibility=*`
   - Pump Track: `leisure=track, sport=bmx, surface=*`
   - Bike Train: `route=bicycle, cycleway=*, crossing=*`
5. **Upload to OpenStreetMap** with changeset comment

**Example OSM tags collected**:
- Trail Building: 15+ fields (surface, mtb:scale, width, access, seasonal, sac_scale)
- Pump Track: 12+ fields (leisure, sport, loop, lit, features array, dimensions)
- Bike Train: 20+ fields (cycleway types, crossings, traffic calming, hazards)

## PWA Features

**Offline Support**:
- Service worker caches static assets
- Map tiles for Anmore area (zoom 10-18)
- IndexedDB queue for offline form submissions
- Auto-sync when connection restored

**Installation**:
- Chrome/Edge: Install prompt appears automatically
- iOS Safari: Share → Add to Home Screen
- Shows offline indicator when disconnected

**Cache Strategy**:
- Static assets: Cache-first
- Map tiles: Cache-first (Anmore bounds only)
- Forms: Network-first with offline queue fallback

## Profile System

**Features**:
- Nostr keypair generation (npub/nsec)
- Opt-in public display name (defaults to "bikeuser")
- nsec display with QR code after first submission
- Login with existing nsec
- LocalStorage persistence

**Privacy**:
- All submissions are NIP-04 encrypted
- Only recipient can decrypt with their nsec
- Contributors can remain anonymous ("bikeuser")
- Nsec stored only in browser LocalStorage

## Development

**Build for production**:
```bash
npm run build
```

**Preview production build**:
```bash
npm run preview
```

**Check TypeScript**:
```bash
npm run astro check
```

## Deployment

**Static site compatible with**:
- Netlify
- Vercel  
- GitHub Pages
- Cloudflare Pages

**Steps**:
1. Build: `npm run build`
2. Deploy `dist/` folder
3. Configure `.env` on your monitoring server (not on static host)

**Note**: The `.env` file is only needed for the monitoring script, not for the deployed website.

## Testing Checklist

- [ ] Create profile and submit each form type
- [ ] Test offline mode (airplane mode → submit → go online)
- [ ] Verify PWA installation on mobile
- [ ] Check leaderboard updates after submissions
- [ ] Test map drawing tools (polyline, polygon, marker)
- [ ] Verify encrypted DMs arrive at recipient
- [ ] Test monitor.js decryption with your nsec
- [ ] Validate OSM GeoJSON output format
- [ ] Test profile login with existing nsec
- [ ] Check responsive design on mobile devices

## Customization

**Add new form pages**:
1. Create `src/pages/your-page.astro`
2. Import Leaflet for maps: `import 'leaflet/dist/leaflet.css'`
3. Use `ProfileModal` component for user management
4. Call `sendEncryptedDM()` with form data
5. Add link in `Navigation.astro`

**Change recipient**:
1. Update `RECIPIENT_NPUB` in `src/lib/nostr.ts`
2. Update `.env` with new nsec for monitoring

**Add relays**:
1. Edit `RELAYS` array in `src/lib/nostr.ts`
2. Must support NIP-04 encrypted DMs

## Troubleshooting

**Forms not submitting**:
- Check browser console for errors
- Verify relay connectivity (check Network tab)
- Ensure profile was created (npub/nsec generated)

**Monitor not receiving**:
- Confirm `.env` has correct nsec matching recipient npub
- Check relay connections in monitor.js output
- Verify nsec format starts with "nsec1"

**Map not loading**:
- Check internet connection (uses OpenStreetMap tiles)
- Verify Leaflet.js and Leaflet.draw scripts loaded
- Check browser console for CORS errors

**PWA not installing**:
- Requires HTTPS (localhost exempt)
- Check manifest.json is accessible
- Verify service worker registered (DevTools → Application)

## Contributing

This is a community project! Contributions welcome:
- Report bugs via Issues
- Suggest features or improvements
- Submit pull requests
- Help with documentation

## License

100% Community Funded, 0 Tax Dollars Used

## Contact

Questions? Submit a form on the site or reach out via Nostr!

**Recipient npub**: `npub19djteyezrkn9ppg6gjfsxl59pgxrwh76uju60lxtcvr5svj3cmlsf54ca2`

---

## 🧞 Astro Commands

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

Want to learn more about Astro? Check [the documentation](https://docs.astro.build) or join the [Discord server](https://astro.build/chat).
