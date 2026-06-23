# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-featured QR menu system for a **specialty coffee shop ("Coffee In Lab")**. Customers scan a QR code → mobile-first coffee menu opens with dish cards, AI barista chat, multi-language (EN/RU/AZ/TR), cart, and WhatsApp ordering. The menu is coffee-only (espresso, iced coffee, signature lattes, milkshakes, tea, sweets, add-ons — no alcohol). Built with Express 5 (backend) + React 18 + Vite + **Tailwind CSS v4** (frontend) + SQLite.

## Commands

```bash
# Install all dependencies
bun install && cd client && bun install

# Run both servers in development
# Terminal 1 – backend (port 3000):
node --watch index.js

# Terminal 2 – frontend (port 5173):
cd client && bun run dev

# Build frontend for production
cd client && bun run build

# Production (serves built frontend from Express):
NODE_ENV=production node index.js
```

The Vite dev server proxies `/api` and `/uploads` to `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env` before first run:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Backend port |
| `NODE_ENV` | `development` | `production` serves built frontend from Express |
| `GROQ_API_KEY` | — | Groq API key for AI chat (required for AI features) |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq model used by the AI chat |
| `GROQ_BASE_URL` | `https://api.groq.com/openai/v1` | Groq OpenAI-compatible API base URL |

## Architecture

```
/                     ← Express 5 backend (CommonJS)
  index.js            ← Entry point, initializes DB, mounts routes
  swagger.js          ← OpenAPI 3.0 spec (swagger-jsdoc)
  db/database.js      ← SQLite setup (better-sqlite3) + seed data
  routes/             ← menu.js, admin.js, ai.js, orders.js, settings.js
  middleware/auth.js  ← Admin password check via x-admin-password header
  uploads/            ← Dish photos stored here (served as static)
  docs/               ← Project documentation & prompt history
  samples/            ← Sample dish images

client/               ← React 18 + Vite (ES modules)
  src/
    main.jsx          ← ReactDOM entry (wraps App in AppProvider + CartProvider)
    App.jsx           ← Routes: / (menu) and /admin
    api.js            ← Thin fetch helpers (api(), adminHeaders(), jsonHeaders())
    i18n.js           ← UI strings for EN/RU/AZ/TR + LANGUAGES/CURRENCIES lists (no locale files)
    context/
      AppContext.jsx  ← Language, currency, theme, settings, tl(), convertPrice(), formatPrice()
      CartContext.jsx ← Cart state (items, add, remove, updateQty, clear), persisted to localStorage
    components/       ← Navbar, CategoryFilter, DishCard, DishModal, CartDrawer, AIChat,
                         PromotionBanner, RestaurantInfo, Pagination
    pages/
      MenuPage.jsx    ← Main menu view (composes all customer components)
      AdminPage.jsx   ← Full admin panel (dishes, categories, promos, orders, settings, QR)
    index.css         ← Tailwind v4 entry (@import "tailwindcss") + coffee theme tokens & dark mode
```

## API Documentation (Swagger)

Swagger UI is available at **`http://localhost:3000/api-docs`** when the backend is running.
Raw OpenAPI JSON: `GET /api-docs.json`

To test admin endpoints in Swagger UI: click **Authorize** and enter the admin password (default: `admin123`).

## Key Patterns

**Image hosting (Cloudinary)**: Dish/promotion photos are hosted on Cloudinary (folder `coffee`) and the DB stores the full `https://res.cloudinary.com/...` URL in `dishes.image` / `promotions.image`. `cloudinary.js` configures the SDK from `CLOUDINARY_*` env vars and exposes `uploadImage(fileOrBuffer, publicId)` / `deleteImage(url)` / `isConfigured`. Admin upload routes (`routes/admin.js`) buffer files in memory (`multer.memoryStorage`) and call `persistImage()`, which uploads to Cloudinary when configured and **falls back to writing local `/uploads`** if Cloudinary is unconfigured or the upload fails. The frontend uses `src={dish.image}` directly for both absolute Cloudinary URLs and legacy `/uploads/...` paths. One-time migration of existing local photos: `bun run cloudinary:upload` (uploads `uploads/*.png` → `coffee/` and rewrites the DB URLs). The seed `dishPhotos` map in `db/database.js` still seeds `/uploads/...` as a local fallback for fresh installs.

**Multilingual content**: All dish names/descriptions/ingredients are stored as JSON strings in SQLite. Use `tl(value, language)` from `AppContext` to extract the correct language. Falls back to `en` then `az`.

**Dish cards & modal**: `DishCard` is a Tailwind card with a subtle hover lift (`hover:-translate-y-0.5 hover:shadow-lg`); clicking it opens `DishModal`. `DishModal` is a bottom-sheet (mobile) / centered dialog (desktop) showing the dish image/emoji header, description, dietary badges, an ingredients chip list, and a nutrition grid (calories/protein/fat/carbs) — plus an add-to-cart button.

**Emoji placeholders**: Coffee items have no photos, so `image` is `null` in the seed. `DishCard`/`DishModal`/`CartDrawer`/`AIChat` render the **category emoji** (passed as the `icon` prop, looked up from the categories list in `MenuPage`) when `dish.image` is falsy; otherwise they render `<img src={dish.image}>`. Admins can upload real photos per dish, which then take over.

**Currency conversion**: All prices stored in AZN. `convertPrice(priceAZN)` from `AppContext` multiplies by the rate from the `currency_rates` setting.

**Persistent cart**: `CartContext` initializes `items` from `localStorage` (key `qrmenu_cart`) and writes back on every change via a `useEffect`. The cart therefore survives page reloads, tab closes, and QR re-scans. Reads are wrapped in try/catch and validated as an array.

**Theme (light/dark) & Tailwind tokens**: `AppContext` exposes `theme`, `setTheme`, and `toggleTheme`. The value persists to `localStorage` (key `qrmenu_theme`) and is applied as `data-theme` on `<html>` via a `useEffect`. The palette is a set of CSS variables on `:root` (`--bg`, `--surface`, `--surface-2`, `--text`, `--muted`, `--border`, `--accent`) re-defined under `[data-theme="dark"]`. `index.css` maps these to Tailwind utilities via `@theme inline` (e.g. `bg-bg`, `bg-surface`, `text-ink`, `text-muted`, `border-line`, `bg-accent`, `text-accent-ink`) and registers a class-based dark variant with `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *))`. Toggle UI: a 🌙/☀️ button in the `Navbar` and another in the admin panel header. Note: the per-café `accent_color` setting is applied as an inline `--accent` on `documentElement` and intentionally overrides the theme's default brown in both modes.

**AI chat**: `POST /api/ai/chat` calls Groq's OpenAI-compatible Chat Completions API (`{GROQ_BASE_URL}/chat/completions`) via native `fetch` (no SDK). The system prompt (containing the full menu with dish IDs) is the first `messages` entry with `role: "system"`; conversation history and the new user message follow as `user`/`assistant` roles. Non-streaming (`stream: false`); reply read from `choices[0].message.content`. Model is `llama-3.3-70b-versatile` (override with `GROQ_MODEL`). Returns gracefully (`{ offline: true }`) if auth/quota fails (HTTP 401/403/429/5xx) or the service is unreachable. `POST /api/ai/recommend` suggests dishes not already in cart (no AI call — pure SQLite query).

After the AI reply, `extractMentionedDishes(reply, dishes)` scans the reply text for any dish name across all language variants (en/ru/az/tr) and returns the matching full dish rows. The response shape is `{ reply, dishes: [...] }`. On the frontend (`AIChat.jsx` — a floating ✨ button that opens a chat panel), any dishes returned are rendered as mini-cards directly below the AI message — each card shows the dish photo (or ☕ emoji fallback), name (in current language), price, and a localized `+ Add` button that calls `add(dish)` from `CartContext`. The button briefly shows `✓` for 1.5 s after clicking. Uploaded dish image paths are stored as `/uploads/filename.jpg` (absolute from server root), so `src={dish.image}` is used directly without a prefix.

**Admin auth**: All `/api/admin/*` and `PUT /api/settings` routes require `x-admin-password` header matching the `admin_password` setting (default: `admin123`). Password stored in SQLite settings table. On the frontend, the password is persisted in `sessionStorage` (key `admin_pw`). On page load, if a stored password exists, `AdminPage` silently re-validates it against the server (`checking` state = `true`, renders `null`) and auto-loads all data before showing the panel — preventing a flash of the login form. The login form has a password visibility toggle (👁️/🙈).

**WhatsApp order**: Cart builds a formatted message string and opens `wa.me/{phone}?text={encoded}`. Also saves the order to the `orders` table. The `whatsapp_number` is fixed for all installations (seeded/forced to `+994519923208` in `db/database.js` on every startup via `INSERT OR REPLACE`) and is intentionally **not** editable from the admin panel.

**Table number**: Comes exclusively from the QR code URL parameter (`?table=1`). `CartDrawer` reads it via `new URLSearchParams(window.location.search).get('table')` (memoized) — there is no manual input field. The value is included in the WhatsApp message and saved to `orders.table_number`. In the admin orders list it is displayed as `🪑 #N (QR)` with a "From QR code" tooltip; missing table shows `—`.

**Real-time orders**: Backend uses `ws` package (`WebSocketServer` on path `/ws`, same HTTP server). When a new order is placed, the backend broadcasts `{ type: "new_order" }` to all connected clients. `AdminPage` listens on mount (only when authed) and reloads orders to page 1 on receipt.

**Pagination**: `Pagination` component (`client/src/components/Pagination.jsx`) is used for the orders list in admin. Orders are fetched with `?page=N&limit=20`.

**Default settings**:
- `menu_url`: used for QR code generation (admin-configurable)
- `accent_color`: applied as CSS `--accent` variable at runtime (admin-configurable)
- `whatsapp_number`: for order link — fixed at `+994519923208`, not admin-editable (see WhatsApp order above)
