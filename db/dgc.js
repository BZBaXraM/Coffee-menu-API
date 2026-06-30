// Driver Game Center (DGC) database module.
//
// Fully isolated from the coffee menu: its own SQLite file (dgc.db) and its own
// schema. Mirrors the coffee patterns (multilingual JSON content, key-value
// settings, Cloudinary-with-local-fallback image URLs) but adds gaming-club
// concepts: cabinets (private rooms billed by the hour), cabinet sets (combos),
// and a cabinet-only hookah section.
const Database = require('better-sqlite3');
const path = require('path');

let db;

function getDgcDB() {
  if (!db) {
    db = new Database(process.env.DGC_DB_PATH || path.join(__dirname, 'dgc.db'));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDgcDB() {
  const db = getDgcDB();

  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '🍽️',
      icon_type TEXT DEFAULT 'svg',
      icon_key TEXT,
      icon_url TEXT,
      scope TEXT DEFAULT 'menu',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER REFERENCES categories(id),
      name TEXT NOT NULL,
      description TEXT,
      ingredients TEXT,
      price REAL NOT NULL,
      old_price REAL,
      weight INTEGER,
      calories INTEGER,
      protein REAL,
      fat REAL,
      carbs REAL,
      allergens TEXT DEFAULT '[]',
      sizes TEXT DEFAULT '[]',
      image TEXT,
      scope TEXT DEFAULT 'both',
      is_hookah INTEGER DEFAULT 0,
      is_available INTEGER DEFAULT 1,
      is_featured INTEGER DEFAULT 0,
      spice_level INTEGER DEFAULT 0,
      is_vegetarian INTEGER DEFAULT 0,
      is_vegan INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      old_price REAL,
      item_ids TEXT DEFAULT '[]',
      includes_hookah INTEGER DEFAULT 0,
      image TEXT,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cabinets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      capacity INTEGER DEFAULT 4,
      hourly_rate REAL DEFAULT 0,
      image TEXT,
      status TEXT DEFAULT 'closed',
      opened_at TEXT,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cabinet_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cabinet_id INTEGER REFERENCES cabinets(id),
      opened_at TEXT NOT NULL,
      closed_at TEXT,
      duration_minutes INTEGER,
      hourly_rate REAL,
      cost REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS promotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      discount_percent INTEGER DEFAULT 0,
      item_ids TEXT DEFAULT '[]',
      category_id INTEGER,
      image TEXT,
      start_date TEXT,
      end_date TEXT,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      items TEXT NOT NULL,
      total REAL,
      currency TEXT DEFAULT 'AZN',
      table_number TEXT,
      cabinet_id INTEGER,
      customer_phone TEXT,
      notes TEXT,
      status TEXT DEFAULT 'new',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed demo content only on a fresh DB.
  const cloudinaryReady = !!process.env.CLOUDINARY_CLOUD_NAME;
  const allowSeed = process.env.NODE_ENV !== 'production' || cloudinaryReady;
  const count = db.prepare('SELECT COUNT(*) AS c FROM categories').get();
  if (count.c === 0 && allowSeed) seedData(db);

  // Default settings (seed-once; admin-editable thereafter).
  const defaults = {
    restaurant_name: JSON.stringify({ en: 'Driver Game Center', ru: 'Driver Game Center', az: 'Driver Game Center', tr: 'Driver Game Center' }),
    whatsapp_number: '+994708797497',
    phone: '+994708797497',
    instagram: '@driver.game.center',
    wifi_name: 'DriverGC_Guest',
    wifi_password: 'gameon',
    opening_hours: JSON.stringify({ monday: '12:00–02:00', tuesday: '12:00–02:00', wednesday: '12:00–02:00', thursday: '12:00–02:00', friday: '12:00–04:00', saturday: '12:00–04:00', sunday: '12:00–02:00' }),
    menu_url: 'https://game-center.bahram.site',
    admin_password: 'admin123',
    primary_language: 'az',
    currency_rates: JSON.stringify({ AZN: 1, USD: 0.588, EUR: 0.541, GBP: 0.461, AED: 2.16, TRY: 20.1, RUB: 54.2 }),
    accent_color: '#7C3AED',
    neon_color: '#00E5FF',
    show_currency_selector: '1',
    show_language_selector: '1',
    address: 'Bakı, Azərbaycan',
    logo_image: '',
    hero_image: '',
  };
  const ins = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(defaults)) ins.run(k, v);

  // Heal a default menu_url that points at the API host or the old shared
  // menyuqr.com domain instead of the dedicated gaming-club frontend.
  const frontendMenuUrl = 'https://game-center.bahram.site';
  db.prepare("UPDATE settings SET value = ? WHERE key = 'menu_url' AND value IN ('http://localhost:5174', 'http://localhost:3000', 'https://www.menyuqr.com', 'https://www.menyuqr.com/driver-game-center')").run(frontendMenuUrl);

  // Normalize any local /uploads-dgc/* image to its Cloudinary delivery URL when
  // Cloudinary is configured (same deterministic mapping as the coffee menu).
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const folder = 'driver-game-center';
  if (cloud) {
    for (const table of ['items', 'sets', 'cabinets', 'promotions']) {
      const stmt = db.prepare(`UPDATE ${table} SET image = ? WHERE id = ?`);
      const rows = db.prepare(`SELECT id, image FROM ${table} WHERE image LIKE '/uploads-dgc/%'`).all();
      for (const row of rows) {
        const fileName = row.image.replace('/uploads-dgc/', '');
        stmt.run(`https://res.cloudinary.com/${cloud}/image/upload/${folder}/${fileName}`, row.id);
      }
    }
  }
}

function seedData(db) {
  const t = (obj) => JSON.stringify(obj);

  // Main-menu categories are scope 'both' (visible on the table menu AND inside
  // cabinets). The Hookah category is 'cabinet' — only shown when ordering from
  // a cabinet QR.
  const cats = [
    { name: t({ en: 'Cold Drinks', ru: 'Холодные напитки', az: 'Soyuq İçkilər', tr: 'Soğuk İçecekler' }), icon: '🥤', icon_key: 'iced', scope: 'both', sort_order: 1 },
    { name: t({ en: 'Hot Drinks', ru: 'Горячие напитки', az: 'İsti İçkilər', tr: 'Sıcak İçecekler' }), icon: '☕', icon_key: 'espresso', scope: 'both', sort_order: 2 },
    { name: t({ en: 'Snacks / Crackers', ru: 'Снеки / Крекеры', az: 'Snacklar / Krekerlər', tr: 'Atıştırmalık / Kraker' }), icon: '🍿', icon_key: 'sweets', scope: 'both', sort_order: 3 },
    { name: t({ en: 'Food', ru: 'Еда', az: 'Yeməklər', tr: 'Yemekler' }), icon: '🍔', icon_key: 'signature', scope: 'both', sort_order: 4 },
    { name: t({ en: 'Premium Hookahs', ru: 'Премиум кальяны', az: 'Premium Qəlyanlar', tr: 'Premium Nargileler' }), icon: '💨', icon_key: 'signature', scope: 'both', sort_order: 5 },
    { name: t({ en: 'Desserts', ru: 'Десерты', az: 'Desertlər', tr: 'Tatlılar' }), icon: '🍰', icon_key: 'sweets', scope: 'both', sort_order: 6 },
    { name: t({ en: 'Hookah', ru: 'Кальян', az: 'Qəlyan', tr: 'Nargile' }), icon: '💨', icon_key: 'signature', scope: 'cabinet', sort_order: 7 },
  ];
  const insCat = db.prepare("INSERT INTO categories (name, icon, icon_type, icon_key, scope, sort_order) VALUES (?, ?, 'svg', ?, ?, ?)");
  const ids = cats.map((c) => insCat.run(c.name, c.icon, c.icon_key, c.scope, c.sort_order).lastInsertRowid);
  const [coldId, hotId, snackId, foodId, premHookahId, dessertId, hookahId] = ids;

  const items = [
    // Cold Drinks
    { category_id: coldId, name: t({ en: 'Cola', ru: 'Кола', az: 'Kola', tr: 'Kola' }), price: 2.5, weight: 330, scope: 'both', sort_order: 1 },
    { category_id: coldId, name: t({ en: 'Iced Lemonade', ru: 'Холодный лимонад', az: 'Buzlu Limonad', tr: 'Buzlu Limonata' }), price: 4, weight: 400, scope: 'both', is_featured: 1, sort_order: 2 },
    { category_id: coldId, name: t({ en: 'Energy Drink', ru: 'Энергетик', az: 'Enerji İçkisi', tr: 'Enerji İçeceği' }), price: 4.5, weight: 350, scope: 'both', sort_order: 3 },

    // Hot Drinks
    { category_id: hotId, name: t({ en: 'Espresso', ru: 'Эспрессо', az: 'Espresso', tr: 'Espresso' }), price: 2.5, weight: 30, scope: 'both', sort_order: 1 },
    { category_id: hotId, name: t({ en: 'Cappuccino', ru: 'Капучино', az: 'Kapuçino', tr: 'Cappuccino' }), price: 4, weight: 200, scope: 'both', sort_order: 2 },
    { category_id: hotId, name: t({ en: 'Black Tea', ru: 'Чёрный чай', az: 'Qara Çay', tr: 'Siyah Çay' }), price: 2, weight: 250, scope: 'both', sort_order: 3 },

    // Snacks / Crackers
    { category_id: snackId, name: t({ en: 'Nachos', ru: 'Начос', az: 'Naços', tr: 'Nachos' }), price: 6, weight: 200, scope: 'both', sort_order: 1 },
    { category_id: snackId, name: t({ en: 'Salted Crackers', ru: 'Солёные крекеры', az: 'Duzlu Krekerlər', tr: 'Tuzlu Kraker' }), price: 3, weight: 100, scope: 'both', sort_order: 2 },

    // Food
    { category_id: foodId, name: t({ en: 'Cheeseburger', ru: 'Чизбургер', az: 'Çizburger', tr: 'Çizburger' }), price: 9, weight: 300, scope: 'both', is_featured: 1, sort_order: 1 },
    { category_id: foodId, name: t({ en: 'Club Sandwich', ru: 'Клаб-сэндвич', az: 'Klub Sendviç', tr: 'Kulüp Sandviç' }), price: 8, weight: 280, scope: 'both', sort_order: 2 },
    { category_id: foodId, name: t({ en: 'French Fries', ru: 'Картофель фри', az: 'Kartof Fri', tr: 'Patates Kızartması' }), price: 5, weight: 200, scope: 'both', sort_order: 3 },

    // Premium Hookahs (menu category, orderable anywhere as a product line)
    { category_id: premHookahId, name: t({ en: 'Premium Hookah — Mint', ru: 'Премиум кальян — Мята', az: 'Premium Qəlyan — Nanə', tr: 'Premium Nargile — Nane' }), price: 25, scope: 'both', is_hookah: 1, sort_order: 1 },
    { category_id: premHookahId, name: t({ en: 'Premium Hookah — Double Apple', ru: 'Премиум кальян — Двойное яблоко', az: 'Premium Qəlyan — İkiqat Alma', tr: 'Premium Nargile — Çift Elma' }), price: 25, scope: 'both', is_hookah: 1, is_featured: 1, sort_order: 2 },

    // Desserts
    { category_id: dessertId, name: t({ en: 'Cheesecake', ru: 'Чизкейк', az: 'Çizkeyk', tr: 'Cheesecake' }), price: 6, weight: 150, scope: 'both', sort_order: 1 },
    { category_id: dessertId, name: t({ en: 'Chocolate Brownie', ru: 'Шоколадный брауни', az: 'Şokoladlı Brauni', tr: 'Çikolatalı Brownie' }), price: 5.5, weight: 140, scope: 'both', sort_order: 2 },

    // Hookah (cabinet-only)
    { category_id: hookahId, name: t({ en: 'Classic Hookah', ru: 'Классический кальян', az: 'Klassik Qəlyan', tr: 'Klasik Nargile' }), price: 20, scope: 'cabinet', is_hookah: 1, sort_order: 1 },
    { category_id: hookahId, name: t({ en: 'Fruit Bowl Hookah', ru: 'Кальян на фрукте', az: 'Meyvəli Qəlyan', tr: 'Meyveli Nargile' }), price: 30, scope: 'cabinet', is_hookah: 1, is_featured: 1, sort_order: 2 },
  ];

  const insItem = db.prepare(`INSERT INTO items (category_id, name, description, ingredients, price, old_price, weight, calories, allergens, sizes, scope, is_hookah, is_featured, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const itemIds = items.map((d) => insItem.run(
    d.category_id, d.name, d.description || null, d.ingredients || null, d.price, d.old_price || null,
    d.weight || null, d.calories || null, d.allergens || '[]', d.sizes || '[]',
    d.scope || 'both', d.is_hookah || 0, d.is_featured || 0, d.sort_order || 0,
  ).lastInsertRowid);

  // Reference a few item ids for the sets (by their seed index above).
  const byIdx = (i) => itemIds[i];
  const cheeseburger = byIdx(8), fries = byIdx(10), nachos = byIdx(6), cola = byIdx(0),
        lemonade = byIdx(1), classicHookah = byIdx(15), fruitHookah = byIdx(16);

  const sets = [
    {
      name: t({ en: 'Solo Gamer', ru: 'Соло геймер', az: 'Tək Oyunçu', tr: 'Tek Oyuncu' }),
      description: t({ en: 'Burger, fries and a cold drink for one.', ru: 'Бургер, картофель фри и холодный напиток.', az: 'Bir nəfər üçün burger, kartof fri və soyuq içki.', tr: 'Bir kişilik burger, patates ve soğuk içecek.' }),
      price: 14, item_ids: t([cheeseburger, fries, cola]), includes_hookah: 0, sort_order: 1,
    },
    {
      name: t({ en: 'Duo Pack', ru: 'Дуо набор', az: 'Cüt Dəst', tr: 'İkili Paket' }),
      description: t({ en: 'Nachos, two cold drinks and snacks to share.', ru: 'Начос, два холодных напитка и снеки.', az: 'Naços, iki soyuq içki və snacklar.', tr: 'Nachos, iki soğuk içecek ve atıştırmalık.' }),
      price: 22, item_ids: t([nachos, cola, lemonade]), includes_hookah: 0, sort_order: 2,
    },
    {
      name: t({ en: 'Chill & Smoke', ru: 'Чилл и кальян', az: 'Dincəl və Qəlyan', tr: 'Keyif & Nargile' }),
      description: t({ en: 'Classic hookah with nachos and a drink.', ru: 'Классический кальян с начос и напитком.', az: 'Klassik qəlyan, naços və içki.', tr: 'Klasik nargile, nachos ve içecek.' }),
      price: 32, item_ids: t([classicHookah, nachos, cola]), includes_hookah: 1, sort_order: 3,
    },
    {
      name: t({ en: 'Premium Squad', ru: 'Премиум отряд', az: 'Premium Komanda', tr: 'Premium Takım' }),
      description: t({ en: 'Fruit hookah, burgers, fries and drinks for the squad.', ru: 'Кальян на фрукте, бургеры, фри и напитки.', az: 'Meyvəli qəlyan, burgerlər, fri və içkilər.', tr: 'Meyveli nargile, burgerler, patates ve içecekler.' }),
      price: 55, old_price: 65, item_ids: t([fruitHookah, cheeseburger, fries, lemonade]), includes_hookah: 1, sort_order: 4,
    },
  ];
  const insSet = db.prepare('INSERT INTO sets (name, description, price, old_price, item_ids, includes_hookah, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const s of sets) insSet.run(s.name, s.description, s.price, s.old_price || null, s.item_ids, s.includes_hookah, s.sort_order);

  const cabinets = [
    { name: t({ en: 'Cabinet 1', ru: 'Кабинет 1', az: 'Kabinet 1', tr: 'Kabin 1' }), capacity: 4, hourly_rate: 10, sort_order: 1 },
    { name: t({ en: 'Cabinet 2', ru: 'Кабинет 2', az: 'Kabinet 2', tr: 'Kabin 2' }), capacity: 4, hourly_rate: 10, sort_order: 2 },
    { name: t({ en: 'VIP Cabinet', ru: 'VIP кабинет', az: 'VIP Kabinet', tr: 'VIP Kabin' }), capacity: 8, hourly_rate: 18, sort_order: 3 },
  ];
  const insCab = db.prepare('INSERT INTO cabinets (name, capacity, hourly_rate, sort_order) VALUES (?, ?, ?, ?)');
  for (const c of cabinets) insCab.run(c.name, c.capacity, c.hourly_rate, c.sort_order);

  db.prepare('INSERT INTO promotions (title, description, discount_percent, is_active, sort_order) VALUES (?, ?, ?, ?, ?)').run(
    JSON.stringify({ en: 'Game On — Premium Squad Set 🎮', ru: 'Игра началась — набор Premium Squad 🎮', az: 'Oyun Başlasın — Premium Squad Set 🎮', tr: 'Oyun Başlasın — Premium Squad Set 🎮' }),
    JSON.stringify({ en: 'Save 10₼ on the Premium Squad set tonight!', ru: 'Сэкономьте 10₼ на наборе Premium Squad сегодня!', az: 'Bu axşam Premium Squad setində 10₼ qənaət edin!', tr: 'Bu gece Premium Squad setinde 10₼ tasarruf!' }),
    15, 1, 1,
  );
}

module.exports = { getDgcDB, initDgcDB };
