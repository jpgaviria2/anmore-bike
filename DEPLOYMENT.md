# GitHub Pages Deployment Guide

## ✅ Code Successfully Pushed!

Your anmore.bike website has been pushed to: https://github.com/jpgaviria2/anmore-bike

## 🚀 Enable GitHub Pages (Final Steps)

### 1. Configure GitHub Pages

1. Go to: https://github.com/jpgaviria2/anmore-bike/settings/pages
2. Under **Source**, select: `GitHub Actions`
3. Click **Save**

### 2. Workflow Will Auto-Deploy

The GitHub Actions workflow will automatically:
- Build the Astro site
- Deploy to GitHub Pages
- Make it live at: **https://jpgaviria2.github.io/anmore-bike/**

### 3. Monitor Deployment

- Check deployment status: https://github.com/jpgaviria2/anmore-bike/actions
- First deployment takes ~2-3 minutes
- Green checkmark = successful deployment

### 4. Access Your Live Site

Once deployed, visit: **https://jpgaviria2.github.io/anmore-bike/**

## 📝 Configuration Applied

- **Site URL**: `https://jpgaviria2.github.io`
- **Base Path**: `/anmore-bike`
- **GitHub Actions**: Configured for automatic deployment on push to main

## 🔄 Future Updates

To update the live site:

```bash
# Make your changes, then:
git add .
git commit -m "Your update message"
git push
```

The site will automatically rebuild and deploy!

## 🌐 Optional: Custom Domain

To use **anmore.bike** domain:

1. Go to: https://github.com/jpgaviria2/anmore-bike/settings/pages
2. Under **Custom domain**, enter: `anmore.bike`
3. Add DNS records at your domain registrar:
   ```
   Type: A
   Host: @
   Value: 185.199.108.153
   
   Type: A
   Host: @
   Value: 185.199.109.153
   
   Type: A
   Host: @
   Value: 185.199.110.153
   
   Type: A
   Host: @
   Value: 185.199.111.153
   
   Type: CNAME
   Host: www
   Value: jpgaviria2.github.io
   ```
4. Update `astro.config.mjs`:
   ```javascript
   export default defineConfig({
     site: 'https://anmore.bike',
     base: '/',  // Remove /anmore-bike
     ...
   });
   ```

## ✅ What's Deployed

- ✅ All 7 pages (home, trail-building, pump-track, bike-train, clinics, afterschool, leaderboard)
- ✅ Full Nostr integration with encrypted form submissions
- ✅ PWA with offline support
- ✅ OpenStreetMap metadata collection
- ✅ Profile system with privacy controls
- ✅ Real-time contributor leaderboard

## 🔒 Security Note

The `.env` file is NOT deployed (it's in `.gitignore`). The monitoring script (`monitor.js`) should be run on a separate server, not on GitHub Pages.

## 📊 Monitor Server Setup

For receiving form submissions, run `monitor.js` on a separate server:

```bash
# On your server (not GitHub Pages):
git clone https://github.com/jpgaviria2/anmore-bike.git
cd anmore-bike
npm install
echo "NOSTR_NSEC=YOUR_NSEC_KEY_HERE" > .env  # Replace with your actual nsec (keep private!)
node scripts/monitor.js
```

---

**Next Step**: Visit https://github.com/jpgaviria2/anmore-bike/settings/pages and set source to "GitHub Actions"
