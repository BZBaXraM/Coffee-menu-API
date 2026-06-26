require('dotenv').config();
// .env.local overrides .env (local secrets / per-machine config, gitignored)
require('dotenv').config({ path: '.env.local', override: true });
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const { initDB } = require('./db/database');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const PORT = process.env.PORT || 3000;

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(msg);
  });
}

module.exports = { broadcast };

initDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

app.use('/api/menu', require('./routes/menu'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/settings', require('./routes/settings'));

// Serve the built React SPA from the same host as the API so a single domain
// (e.g. coffee-menu.bahram.site) answers both `/` (menu, incl. QR deep links
// like /?table=1) and `/api/*`. The build can sit next to the server (Docker
// copies it to client/dist or public/) or in the sibling client/ workspace
// during local production testing. Override with CLIENT_DIST if needed.
const clientDist = [
  process.env.CLIENT_DIST,
  path.join(__dirname, 'client/dist'),
  path.join(__dirname, 'public'),
  path.join(__dirname, '../client/dist'),
].find((dir) => dir && fs.existsSync(path.join(dir, 'index.html')));

if (clientDist) {
  app.use(express.static(clientDist));
  // Express 5 / path-to-regexp no longer accepts a bare '*' path string, so use a
  // middleware fallback to serve the SPA for client-side routes like /admin and
  // QR deep links. /api, /uploads, /ws and /api-docs are already handled above.
  app.use((req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  console.log(`🌐 Serving SPA from ${clientDist}`);
} else {
  console.log('ℹ️  No client build found — running API-only');
}

let shuttingDown = false;
function handleServerError(err) {
  if (err.code === 'EADDRINUSE') {
    if (shuttingDown) return;
    shuttingDown = true;
    console.error(`\n❌ Port ${PORT} is already in use. Stop the existing process first:\n   lsof -ti:${PORT} | xargs kill\n`);
    process.exit(1);
  } else {
    throw err;
  }
}

server.on('error', handleServerError);
// ws re-emits the server's 'error' on the WebSocketServer instance, so it needs
// its own handler — otherwise EADDRINUSE crashes here before handleServerError runs.
wss.on('error', handleServerError);

server.listen(PORT, () => {
  console.log(`✅ QR Menu backend running on port ${PORT}`);
});
