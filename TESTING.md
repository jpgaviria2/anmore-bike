# Testing & Debugging Guide

## Nostr DM Flow Testing

### Quick Test Tools

1. **Node.js Test Script**
   ```bash
   node scripts/test-nostr-dm.js
   ```
   Tests keypair generation, encryption, and DM publishing to relays.

2. **Browser Test Page**
   ```bash
   open scripts/test-browser-flow.html
   ```
   Interactive tests for:
   - Profile & keypair generation
   - Nsec login
   - Encrypted DM sending
   - Modal functions

3. **Monitor Script** (receives DMs)
   ```bash
   node scripts/monitor.js
   ```
   Listens for incoming form submissions and displays them.

### Current Status (Feb 6, 2026)

✅ **Working:**
- Keypair generation
- Message encryption (NIP-04)
- Event signing
- Publishing to all 4 relays (100% success rate)
- Monitor script running and listening

⚠️ **Issues Found:**

1. **Relay subscription warnings** - Some relays return filter parse errors on initial connection, but subscription still works
2. **Profile requirement** - App requires profile creation before sending, which is good UX
3. **Nsec modal not showing** - `showNsecModal()` function exists but might not be triggered correctly

### Why DMs Might Not Be Received

**Check these in order:**

1. **Is monitor.js running?**
   ```bash
   node scripts/monitor.js
   ```
   Should show: "✅ Subscription active, listening for new submissions..."

2. **Is .env configured?**
   ```bash
   cat .env
   ```
   Should contain: `NOSTR_NSEC=nsec1...`

3. **Does npub match?**
   - Config npub: `npub19djteyezrkn9ppg6gjfsxl59pgxrwh76uju60lxtcvr5svj3cmlsf54ca2`
   - .env nsec should decode to the same npub

4. **Test direct send:**
   - Open `scripts/test-browser-flow.html`
   - Click "Generate Keypair"
   - Click "Send Encrypted DM"
   - Check monitor.js terminal for received message

### Testing Checklist for Form Submissions

- [ ] Profile modal appears on first form access
- [ ] User can create profile (name, opt-in, etc.)
- [ ] Keypair is generated and stored in sessionStorage
- [ ] Drawing tools work on map
- [ ] Form validates required fields
- [ ] Submit shows progress indicator
- [ ] DM is encrypted and sent to relays
- [ ] Nsec modal appears on first successful submission
- [ ] "has_submitted" flag set in localStorage
- [ ] Monitor receives and decrypts the message
- [ ] HTML-formatted submission displays correctly

### Common Issues & Fixes

**Issue: Nsec modal not showing**
- Check: `localStorage.getItem('has_submitted')` should be null on first submit
- Check: `(window as any).showNsecModal` function exists
- Fix: Clear localStorage and try again: `localStorage.clear()`

**Issue: Login with nsec not working**
- Check: Nsec format is correct (starts with `nsec1`)
- Check: ProfileModal component is included in Layout
- Test: Use test page to validate nsec decoding works

**Issue: No DMs received in monitor**
- Check: Relays are accessible (test with `node scripts/test-nostr-dm.js`)
- Check: Keypair match between sender and receiver
- Check: Monitor running with correct NOSTR_NSEC in .env
- Note: Relay filter warnings can be ignored if "Subscription active" appears

**Issue: Map not displaying**
- Check: Leaflet CDN scripts loaded (view page source)
- Check: Browser console for "✅ Leaflet and Leaflet.draw loaded"
- Check: Map div has height: `class="h-[500px] md:h-[600px]"`

### Profile Kind Prerequisite?

**No profile kind (kind 0) is required** for sending DMs (kind 4). The app works correctly:
1. User creates local profile (stored in localStorage)
2. Profile data is included in the encrypted DM content
3. No need to publish profile to relays first

This is intentional for privacy - users can submit anonymously without revealing identity on public relays.

### Automated Testing TODO

- [ ] E2E test with Playwright for form submission flow
- [ ] Unit tests for nostr.ts encryption/decryption
- [ ] Unit tests for profile.ts storage functions
- [ ] Integration test for monitor.js receiving
- [ ] Mock relay server for faster tests
- [ ] CI/CD GitHub Actions workflow

### Debugging Commands

```bash
# Check what's in localStorage (in browser console)
localStorage.getItem('anmore_user_profile')
localStorage.getItem('has_submitted')
sessionStorage.getItem('nostr_secret_key')

# Check if functions exist (in browser console)
typeof window.showNsecModal
typeof window.showProfileModal
typeof window.showLoginModal

# Monitor relay traffic (in monitor.js)
# Add this after line 58:
console.log('Subscription filter:', {
  kinds: [4],
  '#p': [publicKey],
  since: Math.floor(Date.now() / 1000) - 86400
});

# Test from preview server
npm run preview
# Open: http://localhost:4321/anmore-bike/trail-building
# Open browser DevTools console to see debug logs
```

### Next Steps

1. Test full flow in browser (use test page first)
2. Verify nsec modal shows after first submission
3. Add visual feedback for relay connection status
4. Add retry logic if all relays fail
5. Deploy monitor.js with PM2 or similar for 24/7 uptime
