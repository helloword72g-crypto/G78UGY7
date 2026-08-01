require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const { initDb, getSettings, updateSettings, recordVisit, recordClick, getAnalytics } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-secret-in-production';

app.set('trust proxy', 1); // needed on Render so secure cookies work behind their proxy

app.use(express.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8 // 8 hours
  }
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

function isValidWaNumber(number) {
  return /^[1-9][0-9]{9,14}$/.test((number || '').trim());
}

// Wraps an async route handler so rejected promises become clean 500s
// instead of crashing the server or hanging the request.
function asyncRoute(fn) {
  return (req, res) => {
    fn(req, res).catch((err) => {
      console.error(err);
      res.status(500).json({ error: 'Server error. Check the server logs.' });
    });
  };
}

/* ---------------- Public API ---------------- */

// Current public settings (whatsapp number, rate, site name)
app.get('/api/settings', asyncRoute(async (req, res) => {
  const s = await getSettings();
  res.json(s);
}));

// Track a page visit
app.post('/api/track/visit', asyncRoute(async (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const pagePath = (req.body && req.body.path) || '/';
  await recordVisit(ua, pagePath);
  res.json({ ok: true });
}));

// Track a WhatsApp button click
app.post('/api/track/click', asyncRoute(async (req, res) => {
  const source = (req.body && req.body.source) || 'unknown';
  await recordClick(source);
  res.json({ ok: true });
}));

/* ---------------- Admin API ---------------- */

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: 'Incorrect password' });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/admin/check', (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.isAdmin) });
});

app.get('/api/admin/analytics', requireAuth, asyncRoute(async (req, res) => {
  const analytics = await getAnalytics();
  res.json(analytics);
}));

app.post('/api/admin/settings', requireAuth, asyncRoute(async (req, res) => {
  const { whatsappNumber, baseRate, siteName } = req.body || {};
  const cleanNumber = (whatsappNumber || '').replace(/[^0-9]/g, '');

  if (!isValidWaNumber(cleanNumber)) {
    return res.status(400).json({ error: 'Invalid WhatsApp number. Use country code + number, 10-15 digits, no + or spaces.' });
  }
  const rate = parseFloat(baseRate);
  if (isNaN(rate) || rate <= 0) {
    return res.status(400).json({ error: 'Invalid rate.' });
  }
  const name = (siteName || '').trim() || 'Crypto Sultan';

  const updated = await updateSettings({ whatsappNumber: cleanNumber, baseRate: rate, siteName: name });
  res.json({ ok: true, settings: updated });
}));

/* ---------------- Static files ---------------- */
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

/* ---------------- Startup ---------------- */
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Crypto Sultan server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database. Check DATABASE_URL.', err);
    process.exit(1);
  });
