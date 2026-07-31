const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL is not set. Set it to your PostgreSQL connection string (see .env.example).');
}

// Render's managed Postgres requires SSL for external connections.
// Set PGSSLMODE=disable if you're running a local Postgres without SSL.
const useSSL = process.env.PGSSLMODE !== 'disable';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      whatsapp_number TEXT NOT NULL,
      base_rate NUMERIC NOT NULL,
      site_name TEXT NOT NULL,
      updated_at BIGINT
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS visits (
      id SERIAL PRIMARY KEY,
      ts BIGINT NOT NULL,
      ua TEXT,
      path TEXT
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wa_clicks (
      id SERIAL PRIMARY KEY,
      ts BIGINT NOT NULL,
      source TEXT
    );
  `);

  const existing = await pool.query('SELECT id FROM settings WHERE id = 1');
  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO settings (id, whatsapp_number, base_rate, site_name, updated_at) VALUES (1, $1, $2, $3, $4)`,
      [
        process.env.DEFAULT_WHATSAPP_NUMBER || '91XXXXXXXXXX',
        parseFloat(process.env.DEFAULT_RATE || '97.53'),
        process.env.DEFAULT_SITE_NAME || 'Crypto Sultan',
        Date.now()
      ]
    );
  }
}

async function getSettings() {
  const { rows } = await pool.query('SELECT * FROM settings WHERE id = 1');
  const row = rows[0];
  return {
    whatsappNumber: row.whatsapp_number,
    baseRate: Number(row.base_rate),
    siteName: row.site_name,
    updatedAt: Number(row.updated_at)
  };
}

async function updateSettings({ whatsappNumber, baseRate, siteName }) {
  await pool.query(
    `UPDATE settings SET whatsapp_number = $1, base_rate = $2, site_name = $3, updated_at = $4 WHERE id = 1`,
    [whatsappNumber, baseRate, siteName, Date.now()]
  );
  return getSettings();
}

async function recordVisit(ua, pagePath) {
  await pool.query('INSERT INTO visits (ts, ua, path) VALUES ($1, $2, $3)', [Date.now(), ua || '', pagePath || '/']);
}

async function recordClick(source) {
  await pool.query('INSERT INTO wa_clicks (ts, source) VALUES ($1, $2)', [Date.now(), source || 'unknown']);
}

async function getAnalytics() {
  const totalVisitsRes = await pool.query('SELECT COUNT(*) AS c FROM visits');
  const totalClicksRes = await pool.query('SELECT COUNT(*) AS c FROM wa_clicks');

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayTs = startOfToday.getTime();

  const todayVisitsRes = await pool.query('SELECT COUNT(*) AS c FROM visits WHERE ts >= $1', [todayTs]);
  const todayClicksRes = await pool.query('SELECT COUNT(*) AS c FROM wa_clicks WHERE ts >= $1', [todayTs]);
  const recentVisitsRes = await pool.query('SELECT ts, ua, path FROM visits ORDER BY ts DESC LIMIT 25');

  return {
    totalVisits: Number(totalVisitsRes.rows[0].c),
    totalClicks: Number(totalClicksRes.rows[0].c),
    todayVisits: Number(todayVisitsRes.rows[0].c),
    todayClicks: Number(todayClicksRes.rows[0].c),
    recentVisits: recentVisitsRes.rows.map(r => ({ ts: Number(r.ts), ua: r.ua, path: r.path }))
  };
}

module.exports = { pool, initDb, getSettings, updateSettings, recordVisit, recordClick, getAnalytics };
