const express = require('express');
const QRCode = require('qrcode');
const { getDB } = require('../db/database');
const { adminAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/public', (req, res) => {
  const db = getDB();
  const rows = db.prepare("SELECT key, value FROM settings WHERE key IN ('restaurant_name','phone','instagram','wifi_name','wifi_password','opening_hours','accent_color','show_currency_selector','show_language_selector','primary_language','currency_rates','whatsapp_number','address','logo_image','hero_image')").all();
  const result = {};
  for (const r of rows) result[r.key] = r.value;
  res.json(result);
});

router.get('/', adminAuth, (req, res) => {
  const rows = getDB().prepare('SELECT * FROM settings').all();
  const result = {};
  for (const r of rows) result[r.key] = r.value;
  res.json(result);
});

router.put('/', adminAuth, (req, res) => {
  const db = getDB();
  const update = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const updateMany = db.transaction((data) => {
    for (const [k, v] of Object.entries(data)) {
      if (k !== 'admin_password' || v) update.run(k, v);
    }
  });
  updateMany(req.body);
  res.json({ ok: true });
});

router.post('/qrcode', adminAuth, async (req, res) => {
  const { url, table } = req.body;
  const db = getDB();
  const menuUrl = url || db.prepare("SELECT value FROM settings WHERE key='menu_url'").get()?.value || 'https://coffee-menu.bahram.site';
  const fullUrl = table ? `${menuUrl}?table=${table}` : menuUrl;
  try {
    const dataUrl = await QRCode.toDataURL(fullUrl, { width: 400, margin: 2, color: { dark: '#1A1A2E', light: '#FFFFFF' } });
    res.json({ qr: dataUrl, url: fullUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
