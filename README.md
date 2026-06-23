# Coffee In Lab — QR Menu

QR menu system for a **specialty coffee shop ("Coffee In Lab")**. Customers scan a QR code → a mobile-first coffee menu opens with dish cards, AI barista chat, multi-language support, cart, and WhatsApp ordering. The menu is coffee-only (espresso, iced coffee, signature lattes, milkshakes, tea, sweets, add-ons — no alcohol).

Built with **Express 5** (backend) + **React 18 + Vite + Tailwind CSS v4** (frontend) + **SQLite**.

## Features

- 📱 **Mobile-first menu** with a warm specialty-coffee look (Playfair Display + Inter, cream/espresso/gold palette)
- 🌗 **Light & dark theme** — toggle in the navbar; choice is saved to `localStorage`
- 🛒 **Persistent cart** — items survive page reloads and revisits (stored in `localStorage`)
- 🤖 **AI barista chat** — Groq Llama-3.3-70B answers questions about the menu and recommends drinks
- 🌍 **4 languages** — EN, RU, AZ, TR
- 💱 **Multi-currency** — prices stored in AZN, converted on the fly
- 💬 **WhatsApp ordering** — cart builds a formatted message and opens `wa.me`; the order is also saved to the DB
- 🛠 **Full admin panel** — drinks, categories, promotions, orders, settings, and QR-code generation
- 📖 **Swagger UI** — interactive API docs

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Express 5 (CommonJS), better-sqlite3 |
| Frontend | React 18, Vite, Tailwind CSS v4, react-router-dom |
| AI | Groq Llama-3.3-70B via OpenAI-compatible REST API (native `fetch`) |
| Docs | swagger-jsdoc + swagger-ui-express |
| Styling | Tailwind CSS v4 with CSS-variable theme tokens |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (or npm) and Node.js

### Install

```bash
bun install && cd client && bun install
# or: bun run install:all
```

### Configure

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Backend port |
| `NODE_ENV` | `development` | `production` serves the built frontend from Express |
| `GROQ_API_KEY` | — | Groq API key (required for AI chat) |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq model used by the AI chat |
| `GROQ_BASE_URL` | `https://api.groq.com/openai/v1` | Groq OpenAI-compatible API base URL |
| `CLOUDINARY_CLOUD_NAME` | — | Cloudinary cloud name (for hosted dish/promo images) |
| `CLOUDINARY_API_KEY` | — | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | — | Cloudinary API secret |

Image hosting is optional: when the `CLOUDINARY_*` vars are set, uploaded dish/promotion photos go to Cloudinary; otherwise they fall back to local `/uploads`.

### Run (development)

```bash
# Terminal 1 — backend (port 3000)
node --watch index.js

# Terminal 2 — frontend (port 5173)
cd client && bun run dev
```

Or run both at once:

```bash
bun run dev:all
```

The Vite dev server proxies `/api` and `/uploads` to `http://localhost:3000`.

### Build & run (production)

```bash
cd client && bun run build
NODE_ENV=production node index.js
```

In production mode Express serves the built frontend from `client/dist`.

## Admin Panel

Open `/admin` and log in with the admin password (default: **`admin123`**, configurable in settings).

From the panel you can manage drinks, categories, promotions, orders (with live updates via WebSocket), café settings (name, accent color, hours, etc.), and generate the menu QR code. (The WhatsApp ordering number is fixed at the system level and not editable here.)

## API Documentation

With the backend running:

- Swagger UI: **http://localhost:3000/api-docs**
- Raw OpenAPI JSON: `GET /api-docs.json`

To test admin endpoints, click **Authorize** in Swagger UI and enter the admin password.

## Project Structure

```
/                     ← Express 5 backend (CommonJS)
  index.js            ← Entry point: initializes DB, mounts routes
  swagger.js          ← OpenAPI 3.0 spec
  db/database.js      ← SQLite setup + seed data
  routes/             ← menu.js, admin.js, ai.js, orders.js, settings.js
  middleware/auth.js  ← Admin password check (x-admin-password header)
  uploads/            ← Dish photos (served as static files)

client/               ← React 18 + Vite + Tailwind CSS v4
  src/
    App.jsx           ← Routes: / (menu) and /admin
    api.js            ← fetch helpers (api(), admin headers)
    i18n.js           ← UI strings for EN/RU/AZ/TR + LANGUAGES/CURRENCIES lists
    context/          ← AppContext (language, currency, theme, settings, tl, convertPrice)
                         CartContext (persistent cart)
    components/       ← Navbar, CategoryFilter, DishCard, DishModal, CartDrawer, AIChat,
                         PromotionBanner, RestaurantInfo, Pagination
    pages/            ← MenuPage, AdminPage
    index.css         ← Tailwind v4 entry + coffee theme tokens (light + dark)
  vite.config.js      ← react + @tailwindcss/vite plugins, /api & /uploads dev proxy
```

## License

ISC
