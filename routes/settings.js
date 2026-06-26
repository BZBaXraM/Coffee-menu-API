const express = require('express');
const QRCode = require('qrcode');
const { getDB } = require('../db/database');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// Keys that must never be exposed to unauthenticated (public) callers.
const PRIVATE_KEYS = new Set(['admin_password']);

function readSettings(db) {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const { key, value } of rows) out[key] = value;
  return out;
}

/**
 * GET /api/settings/public
 * Subset of settings safe for the customer-facing menu (everything except
 * secrets like the admin password).
 */
router.get('/public', (req, res) => {
  const all = readSettings(getDB());
  const out = {};
  for (const [key, value] of Object.entries(all)) {
    if (!PRIVATE_KEYS.has(key)) out[key] = value;
  }
  res.json(out);
});

/**
 * GET /api/settings  (admin)
 * All settings as a key-value object.
 */
router.get('/', adminAuth, (req, res) => {
  res.json(readSettings(getDB()));
});

/**
 * PUT /api/settings  (admin)
 * Upsert any provided key-value pairs.
 */
router.put('/', adminAuth, (req, res) => {
  const db = getDB();
  const body = req.body || {};
  // Don't let the admin password be wiped from a settings save that omits it,
  // but allow an explicit change when a non-empty value is provided.
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  const save = db.transaction((entries) => {
    for (const [key, value] of entries) {
      if (key === 'password') continue; // reserved: used by adminAuth body fallback
      const stored = typeof value === 'string' ? value : JSON.stringify(value);
      upsert.run(key, stored);
    }
  });
  save(Object.entries(body));
  res.json(readSettings(db));
});

/**
 * POST /api/settings/qrcode  (admin)
 * Generate a PNG data-URL QR code for the menu URL, optionally with a table
 * number appended as ?table=N.
 */
router.post('/qrcode', adminAuth, async (req, res) => {
  const db = getDB();
  const { url, table } = req.body || {};
  const base = url || db.prepare("SELECT value FROM settings WHERE key = 'menu_url'").get()?.value || '';
  if (!base) return res.status(400).json({ error: 'No menu_url configured' });

  let target = base;
  if (table != null && table !== '') {
    const sep = target.includes('?') ? '&' : '?';
    target = `${target}${sep}table=${encodeURIComponent(table)}`;
  }

  try {
    const qr = await QRCode.toDataURL(target, { width: 512, margin: 2 });
    res.json({ qr, url: target });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

module.exports = router;
