const { getDgcDB } = require('../db/dgc');

// Admin auth for Driver Game Center routes. Identical to the coffee adminAuth
// but checks the password against the DGC settings table (its own admin_password).
function dgcAuth(req, res, next) {
  const password = req.headers['x-admin-password'] || req.body?.password;
  const db = getDgcDB();
  const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_password');
  if (setting && password === setting.value) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

module.exports = { dgcAuth };
