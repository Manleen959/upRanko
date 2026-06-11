require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Firebase Realtime Database ───────────────────────────────────────────────
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, set } = require('firebase/database');

const firebaseConfig = {
  databaseURL: "https://upranko-db-test123-default-rtdb.firebaseio.com",
};
const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

async function readDB() {
  try {
    const snapshot = await get(ref(database, '/'));
    if (snapshot.exists()) {
      const data = snapshot.val();
      if (!data.clients) data.clients = [];
      if (!data.reports) data.reports = [];
      return data;
    }
  } catch(e) {
    console.error("Firebase read error", e);
  }
  const empty = { clients: [], reports: [] };
  await writeDB(empty);
  return empty;
}

async function writeDB(data) {
  await set(ref(database, '/'), data);
}

// Seed demo data if empty
async function init() {
  const initDB = await readDB();
  if (!initDB.clients.length) {
    initDB.clients = [
      {
        id: 'demo-001',
        name: 'The Coffee House',
        category: 'Café · Connaught Place, Delhi',
        googleUrl: 'https://search.google.com/local/writereview?placeid=ChIJdemo',
        ownerEmail: 'owner@coffeehouse.com',
        ownerName: 'Rajesh Kumar',
        color: '#3B82F6',
        createdAt: new Date().toISOString(),
        active: true
      },
      {
        id: 'demo-002',
        name: 'Sharma Auto Works',
        category: 'Auto Repair · Ludhiana, Punjab',
        googleUrl: 'https://search.google.com/local/writereview?placeid=ChIJdemo2',
        ownerEmail: 'sharma@autoworks.com',
        ownerName: 'Vikram Sharma',
        color: '#10B981',
        createdAt: new Date().toISOString(),
        active: true
      }
    ];
    initDB.reports = [
      {
        id: 'rep-001',
        clientId: 'demo-001',
        clientName: 'The Coffee House',
        rating: 2,
        feedback: 'Coffee was cold and staff was rude. Waited 20 minutes for a simple espresso.',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        emailSent: true
      },
      {
        id: 'rep-002',
        clientId: 'demo-001',
        clientName: 'The Coffee House',
        rating: 3,
        feedback: 'Seating area was dirty. Tables were not cleaned for a long time.',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        emailSent: true
      }
    ];
    await writeDB(initDB);
  }
}
init();

// ─── Email transporter ────────────────────────────────────────────────────────
function createTransporter() {
  // Uses env vars; falls back to Ethereal (test) if not set
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  // Gmail shortcut
  if (process.env.GMAIL_USER) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }
  return null;
}

function starEmoji(n) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function buildEmailHTML(client, report) {
  const ratingColor = report.rating <= 2 ? '#DC2626' : '#D97706';
  const ratingLabel = ['', 'Very Poor', 'Poor', 'Average', '', ''][report.rating] || 'Low';
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F5F0;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F0;padding:32px 16px">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#F59E0B,#EF4444);padding:24px 32px;text-align:center">
    <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px">Upranko</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:4px">Private Feedback Alert</div>
  </td></tr>

  <!-- Alert badge -->
  <tr><td style="padding:24px 32px 0">
    <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:14px 18px;display:flex;align-items:center">
      <span style="font-size:13px;color:#991B1B;font-weight:600">⚠️ A customer left negative feedback — blocked from Google</span>
    </div>
  </td></tr>

  <!-- Business info -->
  <tr><td style="padding:20px 32px 0">
    <div style="font-size:12px;color:#9CA3AF;font-weight:500;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Business</div>
    <div style="font-size:18px;font-weight:700;color:#111827">${client.name}</div>
    <div style="font-size:13px;color:#6B7280;margin-top:2px">${client.category}</div>
  </td></tr>

  <!-- Rating -->
  <tr><td style="padding:16px 32px 0">
    <div style="background:#FFF7ED;border-radius:10px;padding:14px 18px;display:inline-block">
      <div style="font-size:22px;color:${ratingColor};letter-spacing:2px">${starEmoji(report.rating)}</div>
      <div style="font-size:13px;color:${ratingColor};font-weight:600;margin-top:4px">${report.rating}/5 — ${ratingLabel}</div>
    </div>
  </td></tr>

  <!-- Feedback -->
  <tr><td style="padding:16px 32px">
    <div style="font-size:12px;color:#9CA3AF;font-weight:500;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px">Customer's private feedback</div>
    <div style="background:#F9FAFB;border-left:4px solid ${ratingColor};border-radius:0 8px 8px 0;padding:16px 18px;font-size:15px;color:#1F2937;line-height:1.7;font-style:italic">"${report.feedback}"</div>
    <div style="font-size:11px;color:#9CA3AF;margin-top:8px">Received: ${new Date(report.createdAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</div>
  </td></tr>

  <!-- Privacy note -->
  <tr><td style="padding:0 32px 24px">
    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:14px 18px">
      <div style="font-size:13px;color:#166534;line-height:1.6">🔒 <strong>This feedback was intercepted before reaching Google.</strong> It was never posted publicly. Only you can see this report.</div>
    </div>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#F9FAFB;padding:18px 32px;border-top:1px solid #F3F4F6">
    <div style="font-size:12px;color:#9CA3AF;text-align:center;line-height:1.6">
      Powered by <strong style="color:#F59E0B">Upranko</strong> — Smart Review Filtering System<br>
      This email was sent to ${client.ownerEmail} because they are the registered owner of ${client.name}.
    </div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── API Routes ───────────────────────────────────────────────────────────────

// Get all clients
app.get('/api/clients', async (req, res) => {
  const db = await readDB();
  res.json(db.clients);
});

// Get single client (for review page)
app.get('/api/client/:id', async (req, res) => {
  const db = await readDB();
  const client = db.clients.find(c => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  // Expose ownerEmail so the frontend can submit to FormSubmit directly
  res.json(client);
});

// Add new client
app.post('/api/clients', async (req, res) => {
  const { name, category, googleUrl, ownerEmail, ownerName, color } = req.body;
  if (!name || !googleUrl || !ownerEmail) {
    return res.status(400).json({ error: 'name, googleUrl, and ownerEmail are required' });
  }
  const db = await readDB();
  const client = {
    id: uuidv4(),
    name: name.trim(),
    category: (category || 'Business').trim(),
    googleUrl: googleUrl.trim(),
    ownerEmail: ownerEmail.trim(),
    ownerName: (ownerName || name).trim(),
    color: color || '#6366F1',
    createdAt: new Date().toISOString(),
    active: true
  };
  db.clients.push(client);
  await writeDB(db);
  res.json(client);
});

// Update client
app.put('/api/clients/:id', async (req, res) => {
  const db = await readDB();
  const idx = db.clients.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.clients[idx] = { ...db.clients[idx], ...req.body, id: req.params.id };
  await writeDB(db);
  res.json(db.clients[idx]);
});

// Delete client
app.delete('/api/clients/:id', async (req, res) => {
  const db = await readDB();
  db.clients = db.clients.filter(c => c.id !== req.params.id);
  await writeDB(db);
  res.json({ ok: true });
});

// Submit private feedback (core feature)
app.post('/api/feedback', async (req, res) => {
  const { clientId, rating, feedback } = req.body;
  if (!clientId || !rating || !feedback) {
    return res.status(400).json({ error: 'clientId, rating, feedback required' });
  }
  if (rating >= 4) {
    return res.status(400).json({ error: 'Only ratings 1-3 should submit feedback' });
  }

  const db = await readDB();
  const client = db.clients.find(c => c.id === clientId);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const report = {
    id: uuidv4(),
    clientId,
    clientName: client.name,
    rating: parseInt(rating),
    feedback: feedback.trim(),
    createdAt: new Date().toISOString(),
    emailSent: false,
    emailError: null
  };

  // Email sending is now handled directly by the frontend to bypass Cloudflare protection
  // on Vercel's datacenter IPs. The browser makes the FormSubmit request directly.
  report.emailSent = true; 
  db.reports.push(report);
  await writeDB(db);

  res.json({ ok: true, reportId: report.id, emailSent: report.emailSent });
});

// Get all reports (admin)
app.get('/api/reports', async (req, res) => {
  const db = await readDB();
  const { clientId } = req.query;
  let reports = db.reports;
  if (clientId) reports = reports.filter(r => r.clientId === clientId);
  res.json(reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// Get stats for a client
app.get('/api/stats/:clientId', async (req, res) => {
  const db = await readDB();
  const reports = db.reports.filter(r => r.clientId === req.params.clientId);
  const total = reports.length;
  const avg = total ? (reports.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : null;
  const byRating = [1,2,3,4,5].map(n => ({ rating: n, count: reports.filter(r => r.rating === n).length }));
  res.json({ total, avg, byRating });
});

// Generate QR code for a client's review link
app.get('/api/qr/:clientId', async (req, res) => {
  const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
  const url = `${baseUrl}/review/${req.params.clientId}`;
  try {
    const qr = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: '#1C1917', light: '#FFFFFF' }
    });
    res.json({ qr, url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Review page (customer-facing) — serves the SPA at /review/:id
app.get('/review/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch-all
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n🚀 Upranko running at http://localhost:${PORT}`);
    console.log(`   Admin panel: http://localhost:${PORT}/`);
    console.log(`   Review demo: http://localhost:${PORT}/review/demo-001\n`);
  });
}

module.exports = app;
