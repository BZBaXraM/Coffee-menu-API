const express = require('express');
const { getDB } = require('../db/database');
const router = express.Router();

router.post('/', (req, res) => {
  const { items, total, currency, table_number, customer_phone, notes } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'No items' });
  const db = getDB();
  const result = db.prepare('INSERT INTO orders (items, total, currency, table_number, customer_phone, notes) VALUES (?, ?, ?, ?, ?, ?)').run(JSON.stringify(items), total, currency || 'AZN', table_number || null, customer_phone || null, notes || null);

  const { broadcast } = require('../index');
  broadcast({
    type: 'new_order',
    order: {
      id: result.lastInsertRowid,
      items,
      total,
      currency: currency || 'AZN',
      table_number: table_number || null,
      customer_phone: customer_phone || null,
      notes: notes || null,
      created_at: new Date().toISOString(),
    },
  });

  res.json({ id: result.lastInsertRowid });
});

module.exports = router;
