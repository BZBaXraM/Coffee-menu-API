const express = require('express');
const QRCode = require('qrcode');
const { getDgcDB } = require('../../db/dgc');
const { dgcAuth } = require('../../middleware/dgcAuth');

const router = express.Router();

const PRIVATE_KEYS = new Set(['admin_password']);
const RESTAURANT_SLUG = 'driver-game-center';

function readSettings(db) {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const { key, value } of rows) out[key] = value;
  return out;
}

router.get('/public', (req, res) => {
  const all = readSettings(getDgcDB());
  const out = {};
  for (const [key, value] of Object.entries(all)) {
    if (!PRIVATE_KEYS.has(key)) out[key] = value;
  }
  res.json(out);
});

router.get('/', dgcAuth, (req, res) => {
  res.json(readSettings(getDgcDB()));
});

router.put('/', dgcAuth, (req, res) => {
  const db = getDgcDB();
  const body = req.body || {};
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  const save = db.transaction((entries) => {
    for (const [key, value] of entries) {
      if (key === 'password') continue; // reserved: used by dgcAuth body fallback
      const stored = typeof value === 'string' ? value : JSON.stringify(value);
      upsert.run(key, stored);
    }
  });
  save(Object.entries(body));
  res.json(readSettings(db));
});

// Generate a PNG data-URL QR code for the menu URL. The slug is added to the
// path so the QR opens the gaming-club menu directly. Supports an optional
// `table` or `cabinet` query param (cabinet QRs unlock the cabinet-only menu).
router.post('/qrcode', dgcAuth, async (req, res) => {
  const db = getDgcDB();
  const { url, table, cabinet } = req.body || {};
  const base = url || db.prepare("SELECT value FROM settings WHERE key = 'menu_url'").get()?.value || '';
  if (!base) return res.status(400).json({ error: 'No menu_url configured' });

  let target = base.replace(/\/+$/, '');
  if (!new RegExp(`/${RESTAURANT_SLUG}(/|\\?|$)`).test(target)) {
    target = `${target}/${RESTAURANT_SLUG}`;
  }
  const qs = [];
  if (table != null && table !== '') qs.push(`table=${encodeURIComponent(table)}`);
  if (cabinet != null && cabinet !== '') qs.push(`cabinet=${encodeURIComponent(cabinet)}`);
  if (qs.length) target = `${target}${target.includes('?') ? '&' : '?'}${qs.join('&')}`;

  try {
    const qr = await QRCode.toDataURL(target, { width: 512, margin: 2 });
    res.json({ qr, url: target });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

module.exports = router;
