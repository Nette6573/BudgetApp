# BudgetApp v2 — Upgrade Guide

## What's New in v2

| Feature | Details |
|---|---|
| **6 Themes** | Dark, Light, Ocean, Forest, Sunset, Midnight — saved to device |
| **10 Currencies** | USD, EUR, GBP, JMD, CAD, AUD, INR, NGN, ZAR, BRL |
| **Settings Page** | Change username, email, password in-app |
| **PWA Support** | Install on phone/tablet from browser — no App Store needed |
| **Toast Notifications** | Success/error feedback on every action |
| **Better Mobile Nav** | Hamburger menu for small screens |
| **Improved Cards** | Color-coded, cleaner item cards with color bars |
| **Profile Update API** | New `/api/profile` endpoint |

---

## Running Locally

### 1. Server
```bash
cd server
npm install
node server.js
# Runs on http://localhost:5000
```

### 2. Client
```bash
cd client
npm install
npm start
# Runs on http://localhost:3000
```

---

## 📱 Installing as a Phone/Tablet App (PWA)

No App Store needed — just use the browser:

**Android (Chrome/Edge):**
1. Open the app in Chrome
2. Tap the menu (⋮) → "Add to Home screen"
3. Or tap the install icon (⊕) in the address bar
4. Tap "Install" — done!

**iPhone/iPad (Safari):**
1. Open the app in Safari
2. Tap the Share button (□↑) at the bottom
3. Scroll down → "Add to Home Screen"
4. Tap "Add" — done!

**Desktop (Chrome/Edge):**
1. Look for the install icon (⊕) in the address bar
2. Click "Install"

The app will open full-screen like a native app, with its own icon.

---

## 🌐 Free Hosting Options

### Option A: Vercel (frontend) + Render (backend) — RECOMMENDED

**Frontend on Vercel (free):**
1. Push client folder to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import repo
3. Set Build Command: `npm run build`
4. Set Output Directory: `build`
5. Deploy — you get a free `yourapp.vercel.app` URL

**Backend on Render (free):**
1. Push server folder to GitHub  
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect repo, set Start Command: `node server.js`
4. Free tier (note: spins down after 15min inactivity — first request may be slow)
5. Update the `baseURL` in client `App.js` to your Render URL

**Database on Render:**
- The SQLite file works fine on Render's free tier
- For production, consider upgrading to Render's PostgreSQL (free 90 days)

---

### Option B: Railway (easiest full-stack, free credits)
1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Add both `client` and `server` as services
4. Railway gives $5/month free credit — enough for light use

---

### Option C: Netlify (frontend) + Supabase (backend)
- Replace SQLite with Supabase's free PostgreSQL
- Use Supabase's built-in Auth instead of JWT
- Netlify hosts the React frontend for free

---

## Environment Variables

For production, set these on your hosting platform:

**Server:**
```
JWT_SECRET=your-long-random-secret-string-here
PORT=5000
```

**Client** (create `.env` in client folder):
```
REACT_APP_API_URL=https://your-backend-url.com/api
```

Then update `App.js` line:
```js
const API = axios.create({ baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api' });
```

---

## File Structure

```
budgetapp-upgraded/
├── client/
│   ├── public/
│   │   ├── index.html        ← PWA meta tags added
│   │   ├── manifest.json     ← PWA manifest (NEW)
│   │   └── service-worker.js ← Offline support (NEW)
│   └── src/
│       ├── App.js            ← Full upgraded app
│       └── App.css           ← 6 themes + responsive styles
└── server/
    └── server.js             ← API + new /profile endpoint
```
