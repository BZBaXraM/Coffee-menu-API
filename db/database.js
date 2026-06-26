const Database = require('better-sqlite3');
const path = require('path');

let db;

function getDB() {
  if (!db) {
    db = new Database(process.env.DB_PATH || path.join(__dirname, 'menu.db'));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDB() {
  const db = getDB();

  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '🍽️',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS dishes (
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
      is_available INTEGER DEFAULT 1,
      is_featured INTEGER DEFAULT 0,
      spice_level INTEGER DEFAULT 0,
      is_vegetarian INTEGER DEFAULT 0,
      is_vegan INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS promotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      discount_percent INTEGER DEFAULT 0,
      dish_ids TEXT DEFAULT '[]',
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
      customer_phone TEXT,
      notes TEXT,
      status TEXT DEFAULT 'new',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrations for existing databases
  const orderCols = db.prepare("PRAGMA table_info(orders)").all().map(c => c.name);
  if (!orderCols.includes('customer_phone')) {
    db.exec('ALTER TABLE orders ADD COLUMN customer_phone TEXT');
  }

  // Size variants (e.g. milkshakes S/M). JSON array of { label, price } in AZN.
  const dishCols = db.prepare("PRAGMA table_info(dishes)").all().map(c => c.name);
  if (!dishCols.includes('sizes')) {
    db.exec("ALTER TABLE dishes ADD COLUMN sizes TEXT DEFAULT '[]'");
  }

  // Professional category icons: built-in lucide SVG (icon_type='svg', icon_key)
  // or a custom uploaded image (icon_type='image', icon_url). The legacy `icon`
  // emoji column is kept as a fallback.
  const catCols = db.prepare("PRAGMA table_info(categories)").all().map(c => c.name);
  if (!catCols.includes('icon_type')) db.exec("ALTER TABLE categories ADD COLUMN icon_type TEXT DEFAULT 'svg'");
  if (!catCols.includes('icon_key')) db.exec("ALTER TABLE categories ADD COLUMN icon_key TEXT");
  if (!catCols.includes('icon_url')) db.exec("ALTER TABLE categories ADD COLUMN icon_url TEXT");

  // Backfill lucide icon_key for categories that still only have the legacy
  // emoji (idempotent — only fills rows with no icon_key yet).
  const emojiToKey = { '☕': 'espresso', '🧊': 'iced', '⭐': 'signature', '🥤': 'milkshake', '🍵': 'tea', '🥐': 'sweets', '➕': 'addons' };
  const setKey = db.prepare("UPDATE categories SET icon_type = 'svg', icon_key = ? WHERE icon = ? AND (icon_key IS NULL OR icon_key = '')");
  for (const [emoji, key] of Object.entries(emojiToKey)) setKey.run(key, emoji);

  // Heal the default menu_url on installs that were seeded before production
  // deployment (the seed below is INSERT OR IGNORE, so it won't overwrite an
  // existing row). Only the old localhost default is replaced — a custom value
  // set by the operator is left untouched.
  db.prepare("UPDATE settings SET value = 'https://coffee-menu.bahram.site' WHERE key = 'menu_url' AND value = 'http://localhost:5173'").run();

  // Seed demo content (categories/dishes/promo) ONLY on an empty DB in
  // development. In production an empty DB is left empty on purpose — the menu
  // is filled via the admin panel. This prevents a reset/fresh prod volume from
  // auto-populating broken-image seed drinks (the seed dishes point at local
  // /uploads/*.png that don't exist on prod).
  const count = db.prepare('SELECT COUNT(*) as c FROM categories').get();
  if (count.c === 0 && process.env.NODE_ENV !== 'production') seedData(db);

  // WhatsApp number is fixed for all installations (not editable from admin).
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('whatsapp_number', ?)").run('+994519923208');

  const defaults = {
    restaurant_name: JSON.stringify({ en: 'Coffee In Lab', ru: 'Coffee In Lab', az: 'Coffee In Lab', tr: 'Coffee In Lab' }),
    whatsapp_number: '+994519923208',
    phone: '+994519923208',
    instagram: '@coffee.in.lab',
    wifi_name: 'CoffeeInLab_Guest',
    wifi_password: 'goodcoffee',
    opening_hours: JSON.stringify({ monday: '08:00–22:00', tuesday: '08:00–22:00', wednesday: '08:00–22:00', thursday: '08:00–22:00', friday: '08:00–23:00', saturday: '09:00–23:00', sunday: '09:00–22:00' }),
    menu_url: 'https://coffee-menu.bahram.site',
    admin_password: 'admin123',
    primary_language: 'en',
    currency_rates: JSON.stringify({ AZN: 1, USD: 0.588, EUR: 0.541, GBP: 0.461, AED: 2.16, TRY: 20.1, RUB: 54.2 }),
    accent_color: '#9C6B3F',
    show_currency_selector: '1',
    show_language_selector: '1',
    address: 'Bakı, Azərbaycan',
    logo_image: '',
    hero_image: '',
  };

  const ins = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(defaults)) ins.run(k, v);

  // Attach real dish photos (idempotent — only sets when the dish still has no image).
  const dishPhotos = {
    'Cappuccino': '/uploads/cappuccino.png',
    'Cold Brew': '/uploads/cold_brew.png',
    'Tiramisu Latte': '/uploads/tiramisu_latte.png',
    'Cheesecake': '/uploads/cheesecake.png',
    'Espresso': '/uploads/espresso.png',
    'Iced Americano': '/uploads/iced_americano.png',
    'Caramel Latte': '/uploads/caramel_latte.png',
    'Banana Milkshake': '/uploads/banana_milkshake.png',
    'Double Espresso': '/uploads/double_espresso.png',
    'Extra Espresso Shot': '/uploads/extra_espresso_shot.png',
    'English Breakfast': '/uploads/english_breakfast.png',
    'Butter Croissant': '/uploads/butter_croissant.png',
    'Americano': '/uploads/americano.png',
    'Iced Latte': '/uploads/iced_latte.png',
    'Iced Mocha': '/uploads/iced_mocha.png',
    'Hazelnut Latte': '/uploads/hazelnut_latte.png',
    'Vanilla Milkshake': '/uploads/vanilla_milkshake.png',
    'Earl Grey': '/uploads/earl_grey.png',
    'Chocolate Croissant': '/uploads/chocolate_croissant.png',
    'Flavored Syrup': '/uploads/flavored_syrup.png',
    'Spanish Latte': '/uploads/spanish_latte.png',
    'Chocolate Milkshake': '/uploads/chocolate_milkshake.png',
    'Green Tea': '/uploads/green_tea.png',
    'Cookies': '/uploads/cookies.png',
    'Raf': '/uploads/raf.png',
    'Vanilla Cold Brew': '/uploads/vanilla_cold_brew.png',
    'Pistachio Latte': '/uploads/pistachio_latte.png',
    'Strawberry Milkshake': '/uploads/strawberry_milkshake.png',
    'Chamomile': '/uploads/chamomile.png',
    'Mint Tea': '/uploads/mint_tea.png',
    'Oat / Almond Milk': '/uploads/oat_almond_milk.png',
    'Whipped Cream': '/uploads/whipped_cream.png',
    'Brownie': '/uploads/brownie.png',
    'Fruit Tea': '/uploads/fruit_tea.png',
    'Hot Chocolate': '/uploads/hot_chocolate.png',
  };
  const setImg = db.prepare("UPDATE dishes SET image = ? WHERE json_extract(name, '$.en') = ? AND (image IS NULL OR image = '')");
  for (const [name, img] of Object.entries(dishPhotos)) setImg.run(img, name);

  // Backfill milkshake size variants on existing DBs (idempotent — only when the
  // dish still has no sizes). Fresh installs already get these via seedData.
  const milkshakeSizes = JSON.stringify([{ label: 'S', price: 4 }, { label: 'M', price: 5 }]);
  const milkshakeNames = ['Banana Milkshake', 'Vanilla Milkshake', 'Chocolate Milkshake', 'Strawberry Milkshake'];
  const setSizes = db.prepare("UPDATE dishes SET sizes = ? WHERE json_extract(name, '$.en') = ? AND (sizes IS NULL OR sizes = '' OR sizes = '[]')");
  for (const name of milkshakeNames) setSizes.run(milkshakeSizes, name);

  // Normalize any local /uploads/* image to its Cloudinary delivery URL when
  // Cloudinary is configured. The "coffee" folder holds one asset per file
  // (public_id = filename without extension), and the version segment is
  // optional for delivery, so the URL is fully deterministic — no re-upload
  // needed. This fixes production DBs that were seeded before the migration.
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const folder = process.env.CLOUDINARY_FOLDER || 'coffee';
  if (cloud) {
    const localRows = db.prepare("SELECT id, image FROM dishes WHERE image LIKE '/uploads/%'").all();
    const toCloud = db.prepare('UPDATE dishes SET image = ? WHERE id = ?');
    for (const row of localRows) {
      const fileName = row.image.replace('/uploads/', '');
      toCloud.run(`https://res.cloudinary.com/${cloud}/image/upload/${folder}/${fileName}`, row.id);
    }
  }
}

function seedData(db) {
  const t = (obj) => JSON.stringify(obj);

  const cats = [
    { name: t({ en: 'Espresso Based', ru: 'На эспрессо', az: 'Espresso Əsaslı', tr: 'Espresso Bazlı' }), icon: '☕', icon_key: 'espresso', sort_order: 1 },
    { name: t({ en: 'Iced Coffees', ru: 'Холодный кофе', az: 'Buzlu Qəhvələr', tr: 'Buzlu Kahveler' }), icon: '🧊', icon_key: 'iced', sort_order: 2 },
    { name: t({ en: 'Signature Drinks', ru: 'Фирменные напитки', az: 'İmza İçkilər', tr: 'İmza İçecekler' }), icon: '⭐', icon_key: 'signature', sort_order: 3 },
    { name: t({ en: 'Milkshakes', ru: 'Молочные коктейли', az: 'Milkşeyklər', tr: 'Milkshake' }), icon: '🥤', icon_key: 'milkshake', sort_order: 4 },
    { name: t({ en: 'Tea Selection', ru: 'Чайная карта', az: 'Çay Seçimi', tr: 'Çay Seçkisi' }), icon: '🍵', icon_key: 'tea', sort_order: 5 },
    { name: t({ en: 'Sweets & Extras', ru: 'Сладости и закуски', az: 'Şirniyyat və Əlavələr', tr: 'Tatlılar ve Ekstralar' }), icon: '🥐', icon_key: 'sweets', sort_order: 6 },
    { name: t({ en: 'Add-ons', ru: 'Дополнения', az: 'Əlavələr', tr: 'İlaveler' }), icon: '➕', icon_key: 'addons', sort_order: 7 },
  ];

  const insCat = db.prepare("INSERT INTO categories (name, icon, icon_type, icon_key, sort_order) VALUES (?, ?, 'svg', ?, ?)");
  const ids = cats.map(c => insCat.run(c.name, c.icon, c.icon_key, c.sort_order).lastInsertRowid);
  const [espressoId, icedId, signatureId, shakeId, teaId, sweetsId, addonId] = ids;

  const dishes = [
    // Espresso Based
    { category_id: espressoId, name: t({ en: 'Espresso', ru: 'Эспрессо', az: 'Espresso', tr: 'Espresso' }), description: t({ en: 'Single shot of pure espresso.', ru: 'Одна порция чистого эспрессо.', az: 'Saf espressonun tək shotu.', tr: 'Saf espresso tek shot.' }), ingredients: t({ en: ['Espresso'], ru: ['Эспрессо'], az: ['Espresso'], tr: ['Espresso'] }), price: 2.5, weight: 30, calories: 5, is_vegetarian: 1, is_vegan: 1, sort_order: 1 },
    { category_id: espressoId, name: t({ en: 'Double Espresso', ru: 'Двойной эспрессо', az: 'İkiqat Espresso', tr: 'Double Espresso' }), description: t({ en: 'Double shot for extra energy.', ru: 'Двойная порция для бодрости.', az: 'Əlavə enerji üçün ikiqat shot.', tr: 'Ekstra enerji için çift shot.' }), ingredients: t({ en: ['Espresso'], ru: ['Эспрессо'], az: ['Espresso'], tr: ['Espresso'] }), price: 3.5, weight: 60, calories: 10, is_vegetarian: 1, is_vegan: 1, sort_order: 2 },
    { category_id: espressoId, name: t({ en: 'Americano', ru: 'Американо', az: 'Amerikano', tr: 'Americano' }), description: t({ en: 'Espresso diluted with hot water.', ru: 'Эспрессо, разбавленный горячей водой.', az: 'İsti su ilə durulaşdırılmış espresso.', tr: 'Sıcak suyla seyreltilmiş espresso.' }), ingredients: t({ en: ['Espresso', 'Hot water'], ru: ['Эспрессо', 'Горячая вода'], az: ['Espresso', 'İsti su'], tr: ['Espresso', 'Sıcak su'] }), price: 3, weight: 240, calories: 10, is_vegetarian: 1, is_vegan: 1, sort_order: 3 },
    { category_id: espressoId, name: t({ en: 'Cappuccino', ru: 'Капучино', az: 'Kapuçino', tr: 'Cappuccino' }), description: t({ en: 'Espresso with equal parts steamed milk & milk foam.', ru: 'Эспрессо с молоком и молочной пеной.', az: 'Bərabər nisbətdə süd və süd köpüyü ilə espresso.', tr: 'Eşit oranda buharlı süt ve köpükle espresso.' }), ingredients: t({ en: ['Espresso', 'Steamed milk', 'Milk foam'], ru: ['Эспрессо', 'Молоко', 'Молочная пена'], az: ['Espresso', 'Buxarlı süd', 'Süd köpüyü'], tr: ['Espresso', 'Buharlı süt', 'Süt köpüğü'] }), price: 4, weight: 200, calories: 120, is_vegetarian: 1, is_featured: 1, sort_order: 4 },
    { category_id: espressoId, name: t({ en: 'Raf', ru: 'Раф', az: 'Raf', tr: 'Raf' }), description: t({ en: 'Espresso with cream, vanilla sugar & milk.', ru: 'Эспрессо со сливками, ванильным сахаром и молоком.', az: 'Qaymaq, vanil şəkəri və süd ilə espresso.', tr: 'Krema, vanilyalı şeker ve sütle espresso.' }), ingredients: t({ en: ['Espresso', 'Cream', 'Vanilla sugar', 'Milk'], ru: ['Эспрессо', 'Сливки', 'Ванильный сахар', 'Молоко'], az: ['Espresso', 'Qaymaq', 'Vanil şəkəri', 'Süd'], tr: ['Espresso', 'Krema', 'Vanilyalı şeker', 'Süt'] }), price: 4.5, weight: 250, calories: 220, is_vegetarian: 1, sort_order: 5 },
    { category_id: espressoId, name: t({ en: 'Flat White', ru: 'Флэт Уайт', az: 'Flat White', tr: 'Flat White' }), description: t({ en: 'Smooth ristretto with steamed milk.', ru: 'Мягкий ристретто с молоком.', az: 'Buxarlı süd ilə yumşaq ristretto.', tr: 'Buharlı sütle yumuşak ristretto.' }), ingredients: t({ en: ['Ristretto', 'Steamed milk'], ru: ['Ристретто', 'Молоко'], az: ['Ristretto', 'Buxarlı süd'], tr: ['Ristretto', 'Buharlı süt'] }), price: 4.5, weight: 180, calories: 130, is_vegetarian: 1, sort_order: 6 },
    { category_id: espressoId, name: t({ en: 'Hot Chocolate', ru: 'Горячий шоколад', az: 'İsti Şokolad', tr: 'Sıcak Çikolata' }), description: t({ en: 'Rich & creamy chocolate drink.', ru: 'Насыщенный сливочный шоколадный напиток.', az: 'Zəngin və kremvari şokolad içkisi.', tr: 'Yoğun ve kremalı çikolata içeceği.' }), ingredients: t({ en: ['Milk', 'Dark chocolate', 'Cocoa'], ru: ['Молоко', 'Тёмный шоколад', 'Какао'], az: ['Süd', 'Tünd şokolad', 'Kakao'], tr: ['Süt', 'Bitter çikolata', 'Kakao'] }), price: 5, weight: 250, calories: 300, allergens: '["Dairy"]', is_vegetarian: 1, sort_order: 7 },

    // Iced Coffees
    { category_id: icedId, name: t({ en: 'Iced Americano', ru: 'Айс Американо', az: 'Buzlu Amerikano', tr: 'Buzlu Americano' }), description: t({ en: 'Espresso over ice with cold water.', ru: 'Эспрессо со льдом и холодной водой.', az: 'Buz və soyuq su üzərində espresso.', tr: 'Buz ve soğuk suyla espresso.' }), ingredients: t({ en: ['Espresso', 'Cold water', 'Ice'], ru: ['Эспрессо', 'Холодная вода', 'Лёд'], az: ['Espresso', 'Soyuq su', 'Buz'], tr: ['Espresso', 'Soğuk su', 'Buz'] }), price: 3.5, weight: 300, calories: 10, is_vegetarian: 1, is_vegan: 1, sort_order: 1 },
    { category_id: icedId, name: t({ en: 'Iced Latte', ru: 'Айс Латте', az: 'Buzlu Latte', tr: 'Buzlu Latte' }), description: t({ en: 'Espresso with cold milk served over ice.', ru: 'Эспрессо с холодным молоком и льдом.', az: 'Buz üzərində soyuq süd ilə espresso.', tr: 'Buz üzerinde soğuk sütle espresso.' }), ingredients: t({ en: ['Espresso', 'Cold milk', 'Ice'], ru: ['Эспрессо', 'Холодное молоко', 'Лёд'], az: ['Espresso', 'Soyuq süd', 'Buz'], tr: ['Espresso', 'Soğuk süt', 'Buz'] }), price: 4.5, weight: 350, calories: 130, is_vegetarian: 1, sort_order: 2 },
    { category_id: icedId, name: t({ en: 'Iced Mocha', ru: 'Айс Мокка', az: 'Buzlu Mokka', tr: 'Buzlu Mocha' }), description: t({ en: 'Chocolate, espresso & cold milk over ice.', ru: 'Шоколад, эспрессо и холодное молоко со льдом.', az: 'Buz üzərində şokolad, espresso və soyuq süd.', tr: 'Buz üzerinde çikolata, espresso ve soğuk süt.' }), ingredients: t({ en: ['Espresso', 'Chocolate', 'Cold milk', 'Ice'], ru: ['Эспрессо', 'Шоколад', 'Холодное молоко', 'Лёд'], az: ['Espresso', 'Şokolad', 'Soyuq süd', 'Buz'], tr: ['Espresso', 'Çikolata', 'Soğuk süt', 'Buz'] }), price: 4.5, weight: 350, calories: 220, allergens: '["Dairy"]', is_vegetarian: 1, sort_order: 3 },
    { category_id: icedId, name: t({ en: 'Cold Brew', ru: 'Колд Брю', az: 'Cold Brew', tr: 'Cold Brew' }), description: t({ en: 'Slow brewed for 12 hours. Smooth & rich.', ru: 'Медленно настоянный 12 часов. Мягкий и насыщенный.', az: '12 saat dəmlənmiş. Yumşaq və zəngin.', tr: '12 saat demlenmiş. Yumuşak ve yoğun.' }), ingredients: t({ en: ['Cold brew coffee', 'Ice'], ru: ['Кофе колд брю', 'Лёд'], az: ['Cold brew qəhvə', 'Buz'], tr: ['Cold brew kahve', 'Buz'] }), price: 4.5, weight: 350, calories: 15, is_vegetarian: 1, is_vegan: 1, is_featured: 1, sort_order: 4 },
    { category_id: icedId, name: t({ en: 'Vanilla Cold Brew', ru: 'Ванильный Колд Брю', az: 'Vanilli Cold Brew', tr: 'Vanilyalı Cold Brew' }), description: t({ en: 'Cold brew with vanilla syrup & cream.', ru: 'Колд брю с ванильным сиропом и сливками.', az: 'Vanil siropu və qaymaqla cold brew.', tr: 'Vanilya şurubu ve kremayla cold brew.' }), ingredients: t({ en: ['Cold brew coffee', 'Vanilla syrup', 'Cream', 'Ice'], ru: ['Кофе колд брю', 'Ванильный сироп', 'Сливки', 'Лёд'], az: ['Cold brew qəhvə', 'Vanil siropu', 'Qaymaq', 'Buz'], tr: ['Cold brew kahve', 'Vanilya şurubu', 'Krema', 'Buz'] }), price: 5, weight: 350, calories: 160, is_vegetarian: 1, sort_order: 5 },

    // Signature Drinks
    { category_id: signatureId, name: t({ en: 'Caramel Latte', ru: 'Карамельный латте', az: 'Karamel Latte', tr: 'Karamel Latte' }), description: t({ en: 'Caramel syrup with latte.', ru: 'Латте с карамельным сиропом.', az: 'Karamel siropu ilə latte.', tr: 'Karamel şuruplu latte.' }), ingredients: t({ en: ['Espresso', 'Milk', 'Caramel syrup'], ru: ['Эспрессо', 'Молоко', 'Карамельный сироп'], az: ['Espresso', 'Süd', 'Karamel siropu'], tr: ['Espresso', 'Süt', 'Karamel şurubu'] }), price: 4.75, weight: 300, calories: 240, is_vegetarian: 1, sort_order: 1 },
    { category_id: signatureId, name: t({ en: 'Hazelnut Latte', ru: 'Ореховый латте', az: 'Fındıqlı Latte', tr: 'Fındıklı Latte' }), description: t({ en: 'Hazelnut syrup with latte.', ru: 'Латте с фундучным сиропом.', az: 'Fındıq siropu ilə latte.', tr: 'Fındık şuruplu latte.' }), ingredients: t({ en: ['Espresso', 'Milk', 'Hazelnut syrup'], ru: ['Эспрессо', 'Молоко', 'Фундучный сироп'], az: ['Espresso', 'Süd', 'Fındıq siropu'], tr: ['Espresso', 'Süt', 'Fındık şurubu'] }), price: 4.75, weight: 300, calories: 240, allergens: '["Nuts"]', is_vegetarian: 1, sort_order: 2 },
    { category_id: signatureId, name: t({ en: 'Spanish Latte', ru: 'Испанский латте', az: 'İspan Latte', tr: 'İspanyol Latte' }), description: t({ en: 'Sweet & creamy latte.', ru: 'Сладкий сливочный латте.', az: 'Şirin və kremvari latte.', tr: 'Tatlı ve kremalı latte.' }), ingredients: t({ en: ['Espresso', 'Milk', 'Condensed milk'], ru: ['Эспрессо', 'Молоко', 'Сгущённое молоко'], az: ['Espresso', 'Süd', 'Qatılaşdırılmış süd'], tr: ['Espresso', 'Süt', 'Yoğunlaştırılmış süt'] }), price: 4.75, weight: 300, calories: 260, is_vegetarian: 1, sort_order: 3 },
    { category_id: signatureId, name: t({ en: 'Tiramisu Latte', ru: 'Тирамису латте', az: 'Tiramisu Latte', tr: 'Tiramisu Latte' }), description: t({ en: 'Inspired by classic tiramisu.', ru: 'Вдохновлён классическим тирамису.', az: 'Klassik tiramisudan ilhamla.', tr: 'Klasik tiramisudan esinlenildi.' }), ingredients: t({ en: ['Espresso', 'Milk', 'Tiramisu syrup', 'Cocoa'], ru: ['Эспрессо', 'Молоко', 'Сироп тирамису', 'Какао'], az: ['Espresso', 'Süd', 'Tiramisu siropu', 'Kakao'], tr: ['Espresso', 'Süt', 'Tiramisu şurubu', 'Kakao'] }), price: 5.25, weight: 300, calories: 280, is_vegetarian: 1, is_featured: 1, sort_order: 4 },
    { category_id: signatureId, name: t({ en: 'Pistachio Latte', ru: 'Фисташковый латте', az: 'Püstə Latte', tr: 'Antep Fıstıklı Latte' }), description: t({ en: 'Pistachio & white chocolate.', ru: 'Фисташка и белый шоколад.', az: 'Püstə və ağ şokolad.', tr: 'Antep fıstığı ve beyaz çikolata.' }), ingredients: t({ en: ['Espresso', 'Milk', 'Pistachio syrup', 'White chocolate'], ru: ['Эспрессо', 'Молоко', 'Фисташковый сироп', 'Белый шоколад'], az: ['Espresso', 'Süd', 'Püstə siropu', 'Ağ şokolad'], tr: ['Espresso', 'Süt', 'Fıstık şurubu', 'Beyaz çikolata'] }), price: 5.25, weight: 300, calories: 290, allergens: '["Nuts","Dairy"]', is_vegetarian: 1, sort_order: 5 },

    // Milkshakes — come in two sizes (S 400ml / M 500ml). `price` mirrors the S price.
    { category_id: shakeId, name: t({ en: 'Banana Milkshake', ru: 'Банановый коктейль', az: 'Banan Milkşeyk', tr: 'Muzlu Milkshake' }), description: t({ en: 'Creamy banana milkshake.', ru: 'Сливочный банановый коктейль.', az: 'Kremvari banan milkşeyk.', tr: 'Kremalı muzlu milkshake.' }), ingredients: t({ en: ['Banana', 'Milk', 'Ice cream'], ru: ['Банан', 'Молоко', 'Мороженое'], az: ['Banan', 'Süd', 'Dondurma'], tr: ['Muz', 'Süt', 'Dondurma'] }), price: 4, weight: 400, calories: 350, allergens: '["Dairy"]', is_vegetarian: 1, sizes: t([{ label: 'S', price: 4 }, { label: 'M', price: 5 }]), sort_order: 1 },
    { category_id: shakeId, name: t({ en: 'Vanilla Milkshake', ru: 'Ванильный коктейль', az: 'Vanil Milkşeyk', tr: 'Vanilyalı Milkshake' }), description: t({ en: 'Classic vanilla milkshake.', ru: 'Классический ванильный коктейль.', az: 'Klassik vanil milkşeyk.', tr: 'Klasik vanilyalı milkshake.' }), ingredients: t({ en: ['Vanilla ice cream', 'Milk'], ru: ['Ванильное мороженое', 'Молоко'], az: ['Vanil dondurması', 'Süd'], tr: ['Vanilyalı dondurma', 'Süt'] }), price: 4, weight: 400, calories: 340, allergens: '["Dairy"]', is_vegetarian: 1, sizes: t([{ label: 'S', price: 4 }, { label: 'M', price: 5 }]), sort_order: 2 },
    { category_id: shakeId, name: t({ en: 'Chocolate Milkshake', ru: 'Шоколадный коктейль', az: 'Şokolad Milkşeyk', tr: 'Çikolatalı Milkshake' }), description: t({ en: 'Rich chocolate milkshake.', ru: 'Насыщенный шоколадный коктейль.', az: 'Zəngin şokolad milkşeyk.', tr: 'Yoğun çikolatalı milkshake.' }), ingredients: t({ en: ['Chocolate ice cream', 'Milk', 'Cocoa'], ru: ['Шоколадное мороженое', 'Молоко', 'Какао'], az: ['Şokolad dondurması', 'Süd', 'Kakao'], tr: ['Çikolatalı dondurma', 'Süt', 'Kakao'] }), price: 4, weight: 400, calories: 380, allergens: '["Dairy"]', is_vegetarian: 1, sizes: t([{ label: 'S', price: 4 }, { label: 'M', price: 5 }]), sort_order: 3 },
    { category_id: shakeId, name: t({ en: 'Strawberry Milkshake', ru: 'Клубничный коктейль', az: 'Çiyələk Milkşeyk', tr: 'Çilekli Milkshake' }), description: t({ en: 'Strawberry milkshake.', ru: 'Клубничный коктейль.', az: 'Çiyələk milkşeyk.', tr: 'Çilekli milkshake.' }), ingredients: t({ en: ['Strawberry', 'Ice cream', 'Milk'], ru: ['Клубника', 'Мороженое', 'Молоко'], az: ['Çiyələk', 'Dondurma', 'Süd'], tr: ['Çilek', 'Dondurma', 'Süt'] }), price: 4, weight: 400, calories: 350, allergens: '["Dairy"]', is_vegetarian: 1, sizes: t([{ label: 'S', price: 4 }, { label: 'M', price: 5 }]), sort_order: 4 },

    // Tea Selection
    { category_id: teaId, name: t({ en: 'English Breakfast', ru: 'Английский завтрак', az: 'İngilis Səhər Çayı', tr: 'İngiliz Kahvaltı Çayı' }), description: t({ en: 'Classic full-bodied black tea.', ru: 'Классический насыщенный чёрный чай.', az: 'Klassik dolğun qara çay.', tr: 'Klasik dolgun siyah çay.' }), ingredients: t({ en: ['Black tea'], ru: ['Чёрный чай'], az: ['Qara çay'], tr: ['Siyah çay'] }), price: 2.5, weight: 250, calories: 2, is_vegetarian: 1, is_vegan: 1, sort_order: 1 },
    { category_id: teaId, name: t({ en: 'Earl Grey', ru: 'Эрл Грей', az: 'Earl Grey', tr: 'Earl Grey' }), description: t({ en: 'Black tea with bergamot.', ru: 'Чёрный чай с бергамотом.', az: 'Berqamotlu qara çay.', tr: 'Bergamotlu siyah çay.' }), ingredients: t({ en: ['Black tea', 'Bergamot'], ru: ['Чёрный чай', 'Бергамот'], az: ['Qara çay', 'Berqamot'], tr: ['Siyah çay', 'Bergamot'] }), price: 2.5, weight: 250, calories: 2, is_vegetarian: 1, is_vegan: 1, sort_order: 2 },
    { category_id: teaId, name: t({ en: 'Green Tea', ru: 'Зелёный чай', az: 'Yaşıl Çay', tr: 'Yeşil Çay' }), description: t({ en: 'Light & refreshing green tea.', ru: 'Лёгкий освежающий зелёный чай.', az: 'Yüngül və təravətli yaşıl çay.', tr: 'Hafif ve ferahlatıcı yeşil çay.' }), ingredients: t({ en: ['Green tea'], ru: ['Зелёный чай'], az: ['Yaşıl çay'], tr: ['Yeşil çay'] }), price: 2.5, weight: 250, calories: 2, is_vegetarian: 1, is_vegan: 1, sort_order: 3 },
    { category_id: teaId, name: t({ en: 'Chamomile', ru: 'Ромашковый', az: 'Çobanyastığı', tr: 'Papatya' }), description: t({ en: 'Soothing caffeine-free herbal tea.', ru: 'Успокаивающий травяной чай без кофеина.', az: 'Sakitləşdirici kofeinsiz bitki çayı.', tr: 'Yatıştırıcı kafeinsiz bitki çayı.' }), ingredients: t({ en: ['Chamomile flowers'], ru: ['Цветы ромашки'], az: ['Çobanyastığı çiçəkləri'], tr: ['Papatya çiçekleri'] }), price: 2.5, weight: 250, calories: 2, is_vegetarian: 1, is_vegan: 1, sort_order: 4 },
    { category_id: teaId, name: t({ en: 'Mint Tea', ru: 'Мятный чай', az: 'Nanə Çayı', tr: 'Nane Çayı' }), description: t({ en: 'Fresh & aromatic mint tea.', ru: 'Свежий ароматный мятный чай.', az: 'Təzə və ətirli nanə çayı.', tr: 'Taze ve aromatik nane çayı.' }), ingredients: t({ en: ['Mint leaves'], ru: ['Листья мяты'], az: ['Nanə yarpaqları'], tr: ['Nane yaprakları'] }), price: 2.5, weight: 250, calories: 2, is_vegetarian: 1, is_vegan: 1, sort_order: 5 },
    { category_id: teaId, name: t({ en: 'Fruit Tea', ru: 'Фруктовый чай', az: 'Meyvə Çayı', tr: 'Meyve Çayı' }), description: t({ en: "Ask our staff for today's flavors.", ru: 'Спросите у персонала о вкусах дня.', az: 'Günün dadları üçün işçilərimizdən soruşun.', tr: 'Günün aromaları için personelimize sorun.' }), ingredients: t({ en: ['Dried fruits', 'Herbs'], ru: ['Сухофрукты', 'Травы'], az: ['Qurudulmuş meyvələr', 'Otlar'], tr: ['Kuru meyveler', 'Otlar'] }), price: 3, weight: 250, calories: 5, is_vegetarian: 1, is_vegan: 1, sort_order: 6 },

    // Sweets & Extras
    { category_id: sweetsId, name: t({ en: 'Butter Croissant', ru: 'Круассан с маслом', az: 'Kərə Yağlı Kruassan', tr: 'Tereyağlı Kruvasan' }), description: t({ en: 'Flaky all-butter croissant.', ru: 'Слоёный масляный круассан.', az: 'Qatlı kərə yağlı kruassan.', tr: 'Katmer tereyağlı kruvasan.' }), ingredients: t({ en: ['Flour', 'Butter', 'Yeast'], ru: ['Мука', 'Масло', 'Дрожжи'], az: ['Un', 'Kərə yağı', 'Maya'], tr: ['Un', 'Tereyağı', 'Maya'] }), price: 2.5, weight: 70, calories: 270, allergens: '["Gluten","Dairy"]', is_vegetarian: 1, sort_order: 1 },
    { category_id: sweetsId, name: t({ en: 'Chocolate Croissant', ru: 'Шоколадный круассан', az: 'Şokoladlı Kruassan', tr: 'Çikolatalı Kruvasan' }), description: t({ en: 'Croissant filled with chocolate.', ru: 'Круассан с шоколадной начинкой.', az: 'Şokolad dolğulu kruassan.', tr: 'Çikolata dolgulu kruvasan.' }), ingredients: t({ en: ['Flour', 'Butter', 'Dark chocolate'], ru: ['Мука', 'Масло', 'Тёмный шоколад'], az: ['Un', 'Kərə yağı', 'Tünd şokolad'], tr: ['Un', 'Tereyağı', 'Bitter çikolata'] }), price: 3, weight: 80, calories: 320, allergens: '["Gluten","Dairy"]', is_vegetarian: 1, sort_order: 2 },
    { category_id: sweetsId, name: t({ en: 'Cookies', ru: 'Печенье', az: 'Peçenye', tr: 'Kurabiye' }), description: t({ en: 'Freshly baked cookies.', ru: 'Свежеиспечённое печенье.', az: 'Təzə bişirilmiş peçenye.', tr: 'Taze pişmiş kurabiye.' }), ingredients: t({ en: ['Flour', 'Butter', 'Sugar', 'Chocolate chips'], ru: ['Мука', 'Масло', 'Сахар', 'Шоколадная крошка'], az: ['Un', 'Kərə yağı', 'Şəkər', 'Şokolad parçaları'], tr: ['Un', 'Tereyağı', 'Şeker', 'Çikolata parçaları'] }), price: 2, weight: 60, calories: 250, allergens: '["Gluten","Dairy"]', is_vegetarian: 1, sort_order: 3 },
    { category_id: sweetsId, name: t({ en: 'Cheesecake', ru: 'Чизкейк', az: 'Çizkeyk', tr: 'Cheesecake' }), description: t({ en: 'Creamy New York style cheesecake.', ru: 'Сливочный чизкейк по-нью-йоркски.', az: 'Kremvari Nyu-York üslublu çizkeyk.', tr: 'Kremalı New York usulü cheesecake.' }), ingredients: t({ en: ['Cream cheese', 'Biscuit base', 'Sugar'], ru: ['Сливочный сыр', 'Печенье', 'Сахар'], az: ['Krem pendir', 'Peçenye əsası', 'Şəkər'], tr: ['Krem peynir', 'Bisküvi tabanı', 'Şeker'] }), price: 4.5, weight: 150, calories: 400, allergens: '["Gluten","Dairy","Eggs"]', is_vegetarian: 1, is_featured: 1, sort_order: 4 },
    { category_id: sweetsId, name: t({ en: 'Brownie', ru: 'Брауни', az: 'Brauni', tr: 'Brownie' }), description: t({ en: 'Fudgy chocolate brownie.', ru: 'Шоколадный брауни.', az: 'Yumşaq şokoladlı brauni.', tr: 'Yoğun çikolatalı brownie.' }), ingredients: t({ en: ['Dark chocolate', 'Butter', 'Flour', 'Eggs'], ru: ['Тёмный шоколад', 'Масло', 'Мука', 'Яйца'], az: ['Tünd şokolad', 'Kərə yağı', 'Un', 'Yumurta'], tr: ['Bitter çikolata', 'Tereyağı', 'Un', 'Yumurta'] }), price: 3.5, weight: 120, calories: 420, allergens: '["Gluten","Dairy","Eggs"]', is_vegetarian: 1, sort_order: 5 },

    // Add-ons
    { category_id: addonId, name: t({ en: 'Extra Espresso Shot', ru: 'Доп. шот эспрессо', az: 'Əlavə Espresso Shot', tr: 'Ekstra Espresso Shot' }), description: t({ en: 'An extra shot of espresso.', ru: 'Дополнительная порция эспрессо.', az: 'Əlavə bir espresso shotu.', tr: 'Ekstra bir espresso shot.' }), ingredients: t({ en: ['Espresso'], ru: ['Эспрессо'], az: ['Espresso'], tr: ['Espresso'] }), price: 1, weight: 30, calories: 5, is_vegetarian: 1, is_vegan: 1, sort_order: 1 },
    { category_id: addonId, name: t({ en: 'Flavored Syrup', ru: 'Сироп со вкусом', az: 'Dadlı Sirop', tr: 'Aromalı Şurup' }), description: t({ en: 'Vanilla, Caramel or Hazelnut.', ru: 'Ваниль, карамель или фундук.', az: 'Vanil, karamel və ya fındıq.', tr: 'Vanilya, karamel veya fındık.' }), ingredients: t({ en: ['Flavored syrup'], ru: ['Ароматный сироп'], az: ['Dadlı sirop'], tr: ['Aromalı şurup'] }), price: 0.75, weight: 20, calories: 50, is_vegetarian: 1, is_vegan: 1, sort_order: 2 },
    { category_id: addonId, name: t({ en: 'Oat / Almond Milk', ru: 'Овсяное / Миндальное молоко', az: 'Yulaf / Badam Südü', tr: 'Yulaf / Badem Sütü' }), description: t({ en: 'Plant-based milk alternative.', ru: 'Растительная альтернатива молоку.', az: 'Bitki əsaslı süd alternativi.', tr: 'Bitkisel süt alternatifi.' }), ingredients: t({ en: ['Oat milk or almond milk'], ru: ['Овсяное или миндальное молоко'], az: ['Yulaf və ya badam südü'], tr: ['Yulaf veya badem sütü'] }), price: 1, weight: 50, calories: 30, allergens: '["Nuts"]', is_vegetarian: 1, is_vegan: 1, sort_order: 3 },
    { category_id: addonId, name: t({ en: 'Whipped Cream', ru: 'Взбитые сливки', az: 'Çırpılmış Qaymaq', tr: 'Krem Şanti' }), description: t({ en: 'A topping of whipped cream.', ru: 'Топпинг из взбитых сливок.', az: 'Çırpılmış qaymaq əlavəsi.', tr: 'Krem şanti eklemesi.' }), ingredients: t({ en: ['Whipped cream'], ru: ['Взбитые сливки'], az: ['Çırpılmış qaymaq'], tr: ['Krem şanti'] }), price: 0.75, weight: 30, calories: 80, allergens: '["Dairy"]', is_vegetarian: 1, sort_order: 4 },
  ];

  const insDish = db.prepare(`INSERT INTO dishes (category_id, name, description, ingredients, price, old_price, weight, calories, protein, fat, carbs, allergens, sizes, is_featured, spice_level, is_vegetarian, is_vegan, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const d of dishes) {
    insDish.run(d.category_id, d.name, d.description || null, d.ingredients || null, d.price, d.old_price || null, d.weight || null, d.calories || null, d.protein || null, d.fat || null, d.carbs || null, d.allergens || '[]', d.sizes || '[]', d.is_featured || 0, d.spice_level || 0, d.is_vegetarian || 0, d.is_vegan || 0, d.sort_order || 0);
  }

  db.prepare(`INSERT INTO promotions (title, description, discount_percent, is_active, sort_order) VALUES (?, ?, ?, ?, ?)`).run(
    JSON.stringify({ en: 'Good Ideas Start With Great Coffee ☕', ru: 'Хорошие идеи начинаются с отличного кофе ☕', az: 'Yaxşı fikirlər əla qəhvə ilə başlayır ☕', tr: 'İyi fikirler harika kahveyle başlar ☕' }),
    JSON.stringify({ en: '15% off all signature drinks today!', ru: 'Сегодня 15% скидка на все фирменные напитки!', az: 'Bu gün bütün imza içkilərə 15% endirim!', tr: 'Bugün tüm imza içeceklerde %15 indirim!' }),
    15, 1, 1
  );
}

module.exports = { getDB, initDB };
