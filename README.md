# ⭐ Upranko — Smart Review Filtering System

> Protect your Google rating. Intercept negative reviews privately. Boost your stars automatically.

---

## How It Works

```
Customer scans QR / taps link
        │
        ▼
   Rates 1–3 ★ ──────────► Private feedback form
                                  │
                                  ▼
                        Feedback saved to DB
                                  │
                                  ▼
                        Email sent to owner ✉️
                        (Google NEVER sees it)

   Rates 4–5 ★ ──────────► Redirects to Google Maps
                             review form in 3 seconds ✅
```

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure email
```bash
cp .env.example .env
# Edit .env with your Gmail or SMTP credentials
```

**Gmail setup (easiest):**
1. Enable 2-Step Verification on your Google account
2. Go to: https://myaccount.google.com/apppasswords
3. Create an App Password for "Mail"
4. Add to `.env`:
```
GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

### 3. Start the server
```bash
npm start
# Or for development with auto-restart:
npm run dev
```

### 4. Open in browser
```
http://localhost:3000          → Admin Panel
http://localhost:3000/review/demo-001  → Demo review page
```

---

## Admin Panel Features

| Feature | Description |
|---------|-------------|
| **Add Client** | Name, category, Google URL, owner email, brand color |
| **QR Code** | Download a print-ready QR for each client's review link |
| **Copy Link** | One-click copy of the unique review URL |
| **Private Reports** | All blocked feedback, filterable by client/rating |
| **Email status** | See if the owner email was delivered successfully |

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/clients` | List all clients |
| POST | `/api/clients` | Add new client |
| PUT | `/api/clients/:id` | Update client |
| DELETE | `/api/clients/:id` | Delete client |
| GET | `/api/client/:id` | Public client info (for review page) |
| POST | `/api/feedback` | Submit private feedback + send email |
| GET | `/api/reports` | All private reports (admin) |
| GET | `/api/reports?clientId=X` | Filter by client |
| GET | `/api/qr/:clientId` | Generate QR code (base64 PNG) |
| GET | `/api/stats/:clientId` | Rating stats for a client |

---

## Deploying to Production

### Option A: Railway / Render (free tier)
1. Push to GitHub
2. Connect repo to Railway or Render
3. Add environment variables in their dashboard
4. Set `BASE_URL=https://your-app.railway.app`

### Option B: VPS (DigitalOcean, Linode)
```bash
# Install PM2
npm install -g pm2
pm2 start server.js --name upranko
pm2 save
pm2 startup
```

### Option C: Vercel / Netlify
Not recommended (requires serverless rewrite). Stick with Railway/Render/VPS.

---

## Email Providers (Free Tiers)

| Provider | Free emails/month | Setup |
|----------|------------------|-------|
| **Gmail** | 500/day | App Password (see above) |
| **Brevo** (formerly Sendinblue) | 300/day | SMTP credentials |
| **Mailgun** | 100/day | API key + SMTP |
| **Resend** | 3,000/month | API key |

---

## Project Structure

```
upranko/
├── server.js          ← Express backend + all API routes
├── public/
│   └── index.html     ← Complete frontend (admin + review page)
├── data/
│   └── db.json        ← JSON database (auto-created)
├── .env               ← Your secrets (never commit this)
├── .env.example       ← Template for .env
└── package.json
```

---

## Customization

**Change the review threshold** (default: 4+ stars = Google redirect):
In `public/index.html`, find `if (n >= 4)` and change to `if (n >= 5)` for only 5-star redirects.

**Add a custom domain per client**: Set `BASE_URL` in `.env` to your domain.

**Multi-language support**: Replace the text strings in the review page HTML.

---

Built with ❤️ for Upranko
