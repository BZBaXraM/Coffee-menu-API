const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDB } = require('../db/database');
const { adminAuth } = require('../middleware/auth');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Remove a previously uploaded file from disk (only local /uploads paths)
function deleteUpload(image) {
  if (!image || !image.startsWith('/uploads/')) return;
  const file = path.join(__dirname, '..', image);
  fs.promises.unlink(file).catch(() => {});
}

router.use(adminAuth);

// Categories
router.get('/categories', (req, res) => {
  res.json(getDB().prepare('SELECT * FROM categories ORDER BY sort_order').all());
});
router.post('/categories', (req, res) => {
  const db = getDB();
  const { name, icon, sort_order } = req.body;
  const result = db.prepare('INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)').run(name, icon || '🍽️', sort_order || 0);
  res.json({ id: result.lastInsertRowid });
});
router.put('/categories/:id', (req, res) => {
  const { name, icon, sort_order, is_active } = req.body;
  getDB().prepare('UPDATE categories SET name=?, icon=?, sort_order=?, is_active=? WHERE id=?').run(name, icon, sort_order, is_active, req.params.id);
  res.json({ ok: true });
});
router.delete('/categories/:id', (req, res) => {
  getDB().prepare('DELETE FROM categories WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// Dishes
router.get('/dishes', (req, res) => {
  const db     = getDB();
  const page   = Math.max(1, parseInt(req.query.page  || 1));
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit || 20)));
  const offset = (page - 1) * limit;
  const total  = db.prepare('SELECT COUNT(*) as n FROM dishes').get().n;
  const items  = db.prepare('SELECT * FROM dishes ORDER BY category_id, sort_order, id LIMIT ? OFFSET ?').all(limit, offset);
  res.json({ items, total, page, totalPages: Math.ceil(total / limit) || 1, limit });
});
router.post('/dishes', upload.single('image'), (req, res) => {
  const db = getDB();
  const d = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;
  const result = db.prepare(`
    INSERT INTO dishes (category_id, name, description, ingredients, price, old_price, weight, calories, protein, fat, carbs, allergens, image, is_available, is_featured, spice_level, is_vegetarian, is_vegan, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(d.category_id, d.name, d.description || null, d.ingredients || null, d.price, d.old_price || null, d.weight || null, d.calories || null, d.protein || null, d.fat || null, d.carbs || null, d.allergens || '[]', image, d.is_available ?? 1, d.is_featured ?? 0, d.spice_level ?? 0, d.is_vegetarian ?? 0, d.is_vegan ?? 0, d.sort_order ?? 0);
  res.json({ id: result.lastInsertRowid });
});
router.put('/dishes/:id', upload.single('image'), (req, res) => {
  const db = getDB();
  const d = req.body;
  const existing = db.prepare('SELECT image FROM dishes WHERE id=?').get(req.params.id);
  // image resolution: new upload > explicit value (empty string = removed) > keep existing
  let image;
  if (req.file) image = `/uploads/${req.file.filename}`;
  else if (d.image !== undefined) image = d.image || null;
  else image = existing?.image || null;
  // delete the old file when it is being replaced or removed
  if (existing?.image && existing.image !== image) deleteUpload(existing.image);
  db.prepare(`
    UPDATE dishes SET category_id=?, name=?, description=?, ingredients=?, price=?, old_price=?, weight=?, calories=?, protein=?, fat=?, carbs=?, allergens=?, image=?, is_available=?, is_featured=?, spice_level=?, is_vegetarian=?, is_vegan=?, sort_order=? WHERE id=?
  `).run(d.category_id, d.name, d.description || null, d.ingredients || null, d.price, d.old_price || null, d.weight || null, d.calories || null, d.protein || null, d.fat || null, d.carbs || null, d.allergens || '[]', image, d.is_available ?? 1, d.is_featured ?? 0, d.spice_level ?? 0, d.is_vegetarian ?? 0, d.is_vegan ?? 0, d.sort_order ?? 0, req.params.id);
  res.json({ ok: true });
});
router.delete('/dishes/:id', (req, res) => {
  const db = getDB();
  const existing = db.prepare('SELECT image FROM dishes WHERE id=?').get(req.params.id);
  db.prepare('DELETE FROM dishes WHERE id=?').run(req.params.id);
  if (existing?.image) deleteUpload(existing.image);
  res.json({ ok: true });
});

// Promotions
router.get('/promotions', (req, res) => {
  res.json(getDB().prepare('SELECT * FROM promotions ORDER BY sort_order').all());
});
router.post('/promotions', upload.single('image'), (req, res) => {
  const d = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;
  const result = getDB().prepare(`INSERT INTO promotions (title, description, discount_percent, dish_ids, category_id, image, start_date, end_date, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(d.title, d.description || null, d.discount_percent || 0, d.dish_ids || '[]', d.category_id || null, image, d.start_date || null, d.end_date || null, d.is_active ?? 1, d.sort_order ?? 0);
  res.json({ id: result.lastInsertRowid });
});
router.put('/promotions/:id', upload.single('image'), (req, res) => {
  const d = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : (d.image || null);
  getDB().prepare(`UPDATE promotions SET title=?, description=?, discount_percent=?, dish_ids=?, category_id=?, image=?, start_date=?, end_date=?, is_active=?, sort_order=? WHERE id=?`).run(d.title, d.description || null, d.discount_percent || 0, d.dish_ids || '[]', d.category_id || null, image, d.start_date || null, d.end_date || null, d.is_active ?? 1, d.sort_order ?? 0, req.params.id);
  res.json({ ok: true });
});
router.delete('/promotions/:id', (req, res) => {
  getDB().prepare('DELETE FROM promotions WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// Orders
router.get('/orders', (req, res) => {
  const db = getDB();
  const page   = Math.max(1, parseInt(req.query.page  || 1));
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit || 20)));
  const offset = (page - 1) * limit;
  const total  = db.prepare('SELECT COUNT(*) AS c FROM orders').get().c;
  const items  = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
  res.json({ items, total, page, totalPages: Math.ceil(total / limit) || 1, limit });
});
router.put('/orders/:id/status', (req, res) => {
  getDB().prepare('UPDATE orders SET status=? WHERE id=?').run(req.body.status, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
