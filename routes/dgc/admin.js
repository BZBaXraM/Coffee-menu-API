const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDgcDB } = require('../../db/dgc');
const { dgcAuth } = require('../../middleware/dgcAuth');
const cloudinary = require('../../cloudinary');
const { withLiveStatus, estimateCost } = require('./cabinets');
const router = express.Router();

const CLOUD_FOLDER = 'driver-game-center';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const uploadsDir = path.join(__dirname, '../../uploads-dgc');

// Persist an uploaded file → Cloudinary (folder driver-game-center); falls back
// to local /uploads-dgc on failure or when Cloudinary is unconfigured.
async function persistImage(file) {
  if (!file) return null;
  if (cloudinary.isConfigured) {
    try {
      const publicId = file.originalname.replace(/\.[^.]+$/, '').replace(/\s/g, '_') + '-' + Date.now();
      return await cloudinary.uploadImage(file.buffer, publicId, CLOUD_FOLDER);
    } catch (err) {
      console.error('Cloudinary upload failed, falling back to local disk:', err.message);
    }
  }
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const filename = `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`;
  fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
  return `/uploads-dgc/${filename}`;
}

function deleteUpload(image) {
  if (!image) return;
  if (image.startsWith('/uploads-dgc/')) {
    fs.promises.unlink(path.join(uploadsDir, image.replace('/uploads-dgc/', ''))).catch(() => {});
  } else if (image.includes('res.cloudinary.com')) {
    cloudinary.deleteImage(image).catch(() => {});
  }
}

router.use(dgcAuth);

// ── Categories ──────────────────────────────────────────────────────────────
router.get('/categories', (req, res) => {
  res.json(getDgcDB().prepare('SELECT * FROM categories ORDER BY sort_order').all());
});
router.post('/categories', upload.single('iconFile'), async (req, res) => {
  const db = getDgcDB();
  const { name, icon, icon_type, icon_key, scope, sort_order } = req.body;
  const icon_url = req.file ? await persistImage(req.file) : (req.body.icon_url || null);
  const result = db.prepare("INSERT INTO categories (name, icon, icon_type, icon_key, icon_url, scope, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(name, icon || '🍽️', icon_type || 'svg', icon_key || null, icon_url, scope || 'menu', sort_order || 0);
  res.json({ id: result.lastInsertRowid });
});
router.put('/categories/:id', upload.single('iconFile'), async (req, res) => {
  const db = getDgcDB();
  const { name, icon, icon_type, icon_key, scope, sort_order, is_active } = req.body;
  const existing = db.prepare('SELECT icon_url FROM categories WHERE id=?').get(req.params.id);
  let icon_url;
  if (req.file) icon_url = await persistImage(req.file);
  else if (req.body.icon_url !== undefined) icon_url = req.body.icon_url || null;
  else icon_url = existing?.icon_url || null;
  if (existing?.icon_url && existing.icon_url !== icon_url) deleteUpload(existing.icon_url);
  db.prepare('UPDATE categories SET name=?, icon=?, icon_type=?, icon_key=?, icon_url=?, scope=?, sort_order=?, is_active=? WHERE id=?')
    .run(name, icon, icon_type || 'svg', icon_key || null, icon_url, scope || 'menu', sort_order, is_active, req.params.id);
  res.json({ ok: true });
});
router.delete('/categories/:id', (req, res) => {
  const db = getDgcDB();
  const existing = db.prepare('SELECT icon_url FROM categories WHERE id=?').get(req.params.id);
  db.prepare('DELETE FROM categories WHERE id=?').run(req.params.id);
  if (existing?.icon_url) deleteUpload(existing.icon_url);
  res.json({ ok: true });
});

// ── Items ───────────────────────────────────────────────────────────────────
router.get('/items', (req, res) => {
  const db = getDgcDB();
  const page = Math.max(1, parseInt(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || 20)));
  const offset = (page - 1) * limit;
  const total = db.prepare('SELECT COUNT(*) AS n FROM items').get().n;
  const items = db.prepare('SELECT * FROM items ORDER BY category_id, sort_order, id LIMIT ? OFFSET ?').all(limit, offset);
  res.json({ items, total, page, totalPages: Math.ceil(total / limit) || 1, limit });
});
router.post('/items', upload.single('image'), async (req, res) => {
  const db = getDgcDB();
  const d = req.body;
  const image = await persistImage(req.file);
  const result = db.prepare(`
    INSERT INTO items (category_id, name, description, ingredients, price, old_price, weight, calories, protein, fat, carbs, allergens, sizes, image, scope, is_hookah, is_available, is_featured, spice_level, is_vegetarian, is_vegan, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(d.category_id, d.name, d.description || null, d.ingredients || null, d.price, d.old_price || null, d.weight || null, d.calories || null, d.protein || null, d.fat || null, d.carbs || null, d.allergens || '[]', d.sizes || '[]', image, d.scope || 'both', d.is_hookah ?? 0, d.is_available ?? 1, d.is_featured ?? 0, d.spice_level ?? 0, d.is_vegetarian ?? 0, d.is_vegan ?? 0, d.sort_order ?? 0);
  res.json({ id: result.lastInsertRowid });
});
router.put('/items/:id', upload.single('image'), async (req, res) => {
  const db = getDgcDB();
  const d = req.body;
  const existing = db.prepare('SELECT image FROM items WHERE id=?').get(req.params.id);
  let image;
  if (req.file) image = await persistImage(req.file);
  else if (d.image !== undefined) image = d.image || null;
  else image = existing?.image || null;
  if (existing?.image && existing.image !== image) deleteUpload(existing.image);
  db.prepare(`
    UPDATE items SET category_id=?, name=?, description=?, ingredients=?, price=?, old_price=?, weight=?, calories=?, protein=?, fat=?, carbs=?, allergens=?, sizes=?, image=?, scope=?, is_hookah=?, is_available=?, is_featured=?, spice_level=?, is_vegetarian=?, is_vegan=?, sort_order=? WHERE id=?
  `).run(d.category_id, d.name, d.description || null, d.ingredients || null, d.price, d.old_price || null, d.weight || null, d.calories || null, d.protein || null, d.fat || null, d.carbs || null, d.allergens || '[]', d.sizes || '[]', image, d.scope || 'both', d.is_hookah ?? 0, d.is_available ?? 1, d.is_featured ?? 0, d.spice_level ?? 0, d.is_vegetarian ?? 0, d.is_vegan ?? 0, d.sort_order ?? 0, req.params.id);
  res.json({ ok: true });
});
router.delete('/items/:id', (req, res) => {
  const db = getDgcDB();
  const existing = db.prepare('SELECT image FROM items WHERE id=?').get(req.params.id);
  db.prepare('DELETE FROM items WHERE id=?').run(req.params.id);
  if (existing?.image) deleteUpload(existing.image);
  res.json({ ok: true });
});

// ── Cabinet Sets ────────────────────────────────────────────────────────────
router.get('/sets', (req, res) => {
  res.json(getDgcDB().prepare('SELECT * FROM sets ORDER BY sort_order, id').all());
});
router.post('/sets', upload.single('image'), async (req, res) => {
  const d = req.body;
  const image = await persistImage(req.file);
  const result = getDgcDB().prepare('INSERT INTO sets (name, description, price, old_price, item_ids, includes_hookah, image, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(d.name, d.description || null, d.price, d.old_price || null, d.item_ids || '[]', d.includes_hookah ?? 0, image, d.is_active ?? 1, d.sort_order ?? 0);
  res.json({ id: result.lastInsertRowid });
});
router.put('/sets/:id', upload.single('image'), async (req, res) => {
  const db = getDgcDB();
  const d = req.body;
  const existing = db.prepare('SELECT image FROM sets WHERE id=?').get(req.params.id);
  let image;
  if (req.file) image = await persistImage(req.file);
  else if (d.image !== undefined) image = d.image || null;
  else image = existing?.image || null;
  if (existing?.image && existing.image !== image) deleteUpload(existing.image);
  db.prepare('UPDATE sets SET name=?, description=?, price=?, old_price=?, item_ids=?, includes_hookah=?, image=?, is_active=?, sort_order=? WHERE id=?')
    .run(d.name, d.description || null, d.price, d.old_price || null, d.item_ids || '[]', d.includes_hookah ?? 0, image, d.is_active ?? 1, d.sort_order ?? 0, req.params.id);
  res.json({ ok: true });
});
router.delete('/sets/:id', (req, res) => {
  const db = getDgcDB();
  const existing = db.prepare('SELECT image FROM sets WHERE id=?').get(req.params.id);
  db.prepare('DELETE FROM sets WHERE id=?').run(req.params.id);
  if (existing?.image) deleteUpload(existing.image);
  res.json({ ok: true });
});

// ── Cabinets ────────────────────────────────────────────────────────────────
router.get('/cabinets', (req, res) => {
  const cabs = getDgcDB().prepare('SELECT * FROM cabinets ORDER BY sort_order, id').all();
  res.json(cabs.map(withLiveStatus));
});
router.post('/cabinets', upload.single('image'), async (req, res) => {
  const d = req.body;
  const image = await persistImage(req.file);
  const result = getDgcDB().prepare('INSERT INTO cabinets (name, description, capacity, hourly_rate, image, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(d.name, d.description || null, d.capacity ?? 4, d.hourly_rate ?? 0, image, d.is_active ?? 1, d.sort_order ?? 0);
  res.json({ id: result.lastInsertRowid });
});
router.put('/cabinets/:id', upload.single('image'), async (req, res) => {
  const db = getDgcDB();
  const d = req.body;
  const existing = db.prepare('SELECT image FROM cabinets WHERE id=?').get(req.params.id);
  let image;
  if (req.file) image = await persistImage(req.file);
  else if (d.image !== undefined) image = d.image || null;
  else image = existing?.image || null;
  if (existing?.image && existing.image !== image) deleteUpload(existing.image);
  db.prepare('UPDATE cabinets SET name=?, description=?, capacity=?, hourly_rate=?, image=?, is_active=?, sort_order=? WHERE id=?')
    .run(d.name, d.description || null, d.capacity ?? 4, d.hourly_rate ?? 0, image, d.is_active ?? 1, d.sort_order ?? 0, req.params.id);
  res.json({ ok: true });
});
router.delete('/cabinets/:id', (req, res) => {
  const db = getDgcDB();
  const existing = db.prepare('SELECT image FROM cabinets WHERE id=?').get(req.params.id);
  db.prepare('DELETE FROM cabinets WHERE id=?').run(req.params.id);
  if (existing?.image) deleteUpload(existing.image);
  res.json({ ok: true });
});

// Cabinet timer: open starts a session, close computes duration + cost.
function broadcastCabinet(id) {
  const cab = getDgcDB().prepare('SELECT * FROM cabinets WHERE id=?').get(id);
  const { broadcastDgc } = require('../../index');
  broadcastDgc({ type: 'cabinet_update', cabinet: withLiveStatus(cab) });
  return cab;
}

router.post('/cabinets/:id/open', (req, res) => {
  const db = getDgcDB();
  const cab = db.prepare('SELECT * FROM cabinets WHERE id=?').get(req.params.id);
  if (!cab) return res.status(404).json({ error: 'Not found' });
  if (cab.status === 'open') return res.status(409).json({ error: 'Cabinet already open' });
  db.prepare("UPDATE cabinets SET status='open', opened_at=? WHERE id=?").run(new Date().toISOString(), req.params.id);
  res.json(withLiveStatus(broadcastCabinet(req.params.id)));
});

router.post('/cabinets/:id/close', (req, res) => {
  const db = getDgcDB();
  const cab = db.prepare('SELECT * FROM cabinets WHERE id=?').get(req.params.id);
  if (!cab) return res.status(404).json({ error: 'Not found' });
  if (cab.status !== 'open' || !cab.opened_at) return res.status(409).json({ error: 'Cabinet is not open' });

  const closedAt = new Date();
  const durationMinutes = Math.max(0, Math.round((closedAt.getTime() - new Date(cab.opened_at).getTime()) / 60000));
  const cost = estimateCost(durationMinutes, cab.hourly_rate);
  db.prepare('INSERT INTO cabinet_sessions (cabinet_id, opened_at, closed_at, duration_minutes, hourly_rate, cost) VALUES (?, ?, ?, ?, ?, ?)')
    .run(cab.id, cab.opened_at, closedAt.toISOString(), durationMinutes, cab.hourly_rate, cost);
  db.prepare("UPDATE cabinets SET status='closed', opened_at=NULL WHERE id=?").run(req.params.id);
  broadcastCabinet(req.params.id);
  res.json({ ok: true, duration_minutes: durationMinutes, hourly_rate: cab.hourly_rate, cost });
});

router.get('/cabinets/:id/sessions', (req, res) => {
  const rows = getDgcDB().prepare('SELECT * FROM cabinet_sessions WHERE cabinet_id=? ORDER BY created_at DESC LIMIT 100').all(req.params.id);
  res.json(rows);
});

// ── Promotions ──────────────────────────────────────────────────────────────
router.get('/promotions', (req, res) => {
  res.json(getDgcDB().prepare('SELECT * FROM promotions ORDER BY sort_order').all());
});
router.post('/promotions', upload.single('image'), async (req, res) => {
  const d = req.body;
  const image = await persistImage(req.file);
  const result = getDgcDB().prepare('INSERT INTO promotions (title, description, discount_percent, item_ids, category_id, image, start_date, end_date, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(d.title, d.description || null, d.discount_percent || 0, d.item_ids || '[]', d.category_id || null, image, d.start_date || null, d.end_date || null, d.is_active ?? 1, d.sort_order ?? 0);
  res.json({ id: result.lastInsertRowid });
});
router.put('/promotions/:id', upload.single('image'), async (req, res) => {
  const d = req.body;
  const image = req.file ? await persistImage(req.file) : (d.image || null);
  getDgcDB().prepare('UPDATE promotions SET title=?, description=?, discount_percent=?, item_ids=?, category_id=?, image=?, start_date=?, end_date=?, is_active=?, sort_order=? WHERE id=?')
    .run(d.title, d.description || null, d.discount_percent || 0, d.item_ids || '[]', d.category_id || null, image, d.start_date || null, d.end_date || null, d.is_active ?? 1, d.sort_order ?? 0, req.params.id);
  res.json({ ok: true });
});
router.delete('/promotions/:id', (req, res) => {
  getDgcDB().prepare('DELETE FROM promotions WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── Orders ──────────────────────────────────────────────────────────────────
const ORDER_STATUSES = ['new', 'preparing', 'ready', 'done', 'cancelled'];

function orderFilters({ status, date }) {
  const where = [];
  const params = [];
  if (ORDER_STATUSES.includes(status)) { where.push('status = ?'); params.push(status); }
  if (date === 'today') {
    where.push("date(created_at, 'localtime') = date('now', 'localtime')");
  } else if (date === 'yesterday') {
    where.push("date(created_at, 'localtime') = date('now', 'localtime', '-1 day')");
  } else if (date === 'month') {
    where.push("strftime('%Y-%m', created_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')");
  }
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

router.get('/orders', (req, res) => {
  const db = getDgcDB();
  const page = Math.max(1, parseInt(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || 20)));
  const offset = (page - 1) * limit;
  const { sql, params } = orderFilters(req.query);
  const total = db.prepare(`SELECT COUNT(*) AS c FROM orders ${sql}`).get(...params).c;
  const items = db.prepare(`SELECT * FROM orders ${sql} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
  res.json({ items, total, page, totalPages: Math.ceil(total / limit) || 1, limit });
});

router.get('/orders/stats', (req, res) => {
  const db = getDgcDB();
  const date = ['today', 'yesterday', 'month'].includes(req.query.date) ? req.query.date : 'today';
  const { sql, params } = orderFilters({ date });
  const row = db.prepare(
    `SELECT COUNT(*) AS count,
            COALESCE(SUM(CASE WHEN status = 'done' THEN total ELSE 0 END), 0) AS revenue,
            COALESCE(SUM(CASE WHEN status NOT IN ('done', 'cancelled') THEN total ELSE 0 END), 0) AS expectedRevenue,
            COALESCE(SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END), 0) AS newCount,
            COALESCE(SUM(CASE WHEN status = 'preparing' THEN 1 ELSE 0 END), 0) AS preparingCount,
            COALESCE(SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END), 0) AS deliveredCount
     FROM orders ${sql}`
  ).get(...params);
  const currency = db.prepare(`SELECT currency FROM orders ${sql} ORDER BY created_at DESC LIMIT 1`).get(...params)?.currency || 'AZN';
  res.json({ date, ...row, currency });
});

router.put('/orders/:id/status', (req, res) => {
  getDgcDB().prepare('UPDATE orders SET status=? WHERE id=?').run(req.body.status, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
