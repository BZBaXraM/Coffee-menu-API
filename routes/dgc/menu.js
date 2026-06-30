const express = require('express');
const { getDgcDB } = require('../../db/dgc');
const router = express.Router();

// scope filter: `menu` (table QR) returns rows tagged 'menu' or 'both';
// `cabinet` (cabinet QR) returns everything ('menu','both','cabinet').
function scopeClause(scope, col = 'scope') {
  if (scope === 'cabinet') return { sql: '', params: [] }; // cabinets see all scopes
  // default: table menu — hide cabinet-only rows
  return { sql: `AND ${col} IN ('menu', 'both')`, params: [] };
}

router.get('/categories', (req, res) => {
  const db = getDgcDB();
  const { sql } = scopeClause(req.query.scope);
  const cats = db.prepare(`SELECT * FROM categories WHERE is_active = 1 ${sql} ORDER BY sort_order`).all();
  res.json(cats);
});

router.get('/items', (req, res) => {
  const db = getDgcDB();
  const { category_id, featured, search, scope } = req.query;
  const page = Math.max(1, parseInt(req.query.page || 1));
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || 12)));
  const offset = (page - 1) * limit;

  let where = 'is_available = 1';
  const params = [];
  const sc = scopeClause(scope);
  where += ` ${sc.sql}`;

  if (category_id) { where += ' AND category_id = ?'; params.push(category_id); }
  if (featured === '1') where += ' AND is_featured = 1';
  if (search) {
    where += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const total = db.prepare(`SELECT COUNT(*) AS c FROM items WHERE ${where}`).get(...params).c;
  const items = db.prepare(`SELECT * FROM items WHERE ${where} ORDER BY is_featured DESC, sort_order, id LIMIT ? OFFSET ?`).all(...params, limit, offset);
  res.json({ items, total, page, totalPages: Math.ceil(total / limit) || 1, limit });
});

router.get('/items/:id', (req, res) => {
  const item = getDgcDB().prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.get('/sets', (req, res) => {
  const sets = getDgcDB().prepare('SELECT * FROM sets WHERE is_active = 1 ORDER BY sort_order, id').all();
  res.json(sets);
});

router.get('/promotions', (req, res) => {
  const db = getDgcDB();
  const now = new Date().toISOString().split('T')[0];
  const promos = db.prepare(`
    SELECT * FROM promotions
    WHERE is_active = 1
      AND (start_date IS NULL OR start_date <= ?)
      AND (end_date IS NULL OR end_date >= ?)
    ORDER BY sort_order
  `).all(now, now);
  res.json(promos);
});

module.exports = router;
