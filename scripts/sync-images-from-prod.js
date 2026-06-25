// One-off LOCAL helper: pull working dish image URLs from the production API
// into the local menu.db, matched by English dish name. Read-only against prod
// (plain HTTP GET); only the local SQLite file is mutated.
//
//   node scripts/sync-images-from-prod.js
//
// For local-only dishes that have no prod match, it falls back to the
// versionless Cloudinary URL when that asset exists, otherwise clears the image
// (so the card shows the category emoji instead of a broken thumbnail).

const { getDB } = require('../db/database');

const PROD = process.env.PROD_API || 'https://coffee-menu.bahram.site';
const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || 'baxram97';
const FOLDER = process.env.CLOUDINARY_FOLDER || 'coffee';

const enName = (v) => {
  try { return JSON.parse(v)?.en || ''; } catch { return v || ''; }
};

async function urlOk(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  const db = getDB();

  // 1. Fetch prod dishes and build name → image map.
  const res = await fetch(`${PROD}/api/menu/dishes?limit=50&page=1`);
  const { items = [] } = await res.json();
  const prodImg = new Map();
  for (const d of items) {
    const name = enName(d.name);
    if (name && d.image) prodImg.set(name, d.image);
  }
  console.log(`Prod dishes with images: ${prodImg.size}`);

  const rows = db.prepare('SELECT id, name, image FROM dishes').all();
  const update = db.prepare('UPDATE dishes SET image = ? WHERE id = ?');

  let fromProd = 0, fixedVersionless = 0, cleared = 0, kept = 0;

  for (const row of rows) {
    const name = enName(row.name);

    // a) Prefer the exact working URL from prod.
    if (prodImg.has(name)) {
      const url = prodImg.get(name);
      if (url !== row.image) { update.run(url, row.id); }
      fromProd++;
      continue;
    }

    // Local-only dish (not on prod). Keep image if it already loads.
    if (row.image && (await urlOk(row.image))) { kept++; continue; }

    // b) Try the versionless Cloudinary form derived from the filename.
    let candidate = null;
    if (row.image && row.image.includes('res.cloudinary.com')) {
      const file = row.image.split('/').pop();
      candidate = `https://res.cloudinary.com/${CLOUD}/image/upload/${FOLDER}/${file}`;
    } else if (row.image && row.image.startsWith('/uploads/')) {
      const file = row.image.replace('/uploads/', '');
      candidate = `https://res.cloudinary.com/${CLOUD}/image/upload/${FOLDER}/${file}`;
    }

    if (candidate && (await urlOk(candidate))) {
      update.run(candidate, row.id);
      fixedVersionless++;
      continue;
    }

    // c) Nothing works → clear so the card falls back to the emoji.
    if (row.image) { update.run(null, row.id); cleared++; }
  }

  console.log(`✓ synced from prod:        ${fromProd}`);
  console.log(`✓ fixed versionless URL:   ${fixedVersionless}`);
  console.log(`✓ kept (already worked):   ${kept}`);
  console.log(`✓ cleared (→ emoji):       ${cleared}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
