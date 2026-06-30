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
const { initDgcDB } = require('./db/dgc');

const app = express();
const server = http.createServer(app);
// Two WebSocket channels share one HTTP server: '/ws' (coffee orders) and
// '/dgc/ws' (Driver Game Center cabinet timers + orders). Attaching two
// path-bound WebSocketServers to the same server makes them fight over the
// upgrade handshake (each aborts the other's path with HTTP 400), so both use
// noServer mode and a single upgrade router dispatches by pathname.
const wss = new WebSocketServer({ noServer: true });
const dgcWss = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, socket, head) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname === '/ws') {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  } else if (pathname === '/dgc/ws') {
    dgcWss.handleUpgrade(req, socket, head, (ws) => dgcWss.emit('connection', ws, req));
  } else {
    socket.destroy();
  }
});
const PORT = process.env.PORT || 3000;

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(msg);
  });
}

function broadcastDgc(data) {
  const msg = JSON.stringify(data);
  dgcWss.clients.forEach(client => {
    if (client.readyState === 1) client.send(msg);
  });
}

module.exports = { broadcast, broadcastDgc };

initDB();
initDgcDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Driver Game Center local image fallback (mirrors /uploads for the coffee menu).
app.use('/uploads-dgc', express.static(path.join(__dirname, 'uploads-dgc')));
// Fresh checkouts keep seeded menu photos in drink-photo/, while DB rows use
// /uploads/*.png. Keep those public URLs working without requiring a copy step.
app.use('/uploads', express.static(path.join(__dirname, 'drink-photo')));
app.use('/drink-photo', express.static(path.join(__dirname, 'drink-photo')));
app.use('/samples', express.static(path.join(__dirname, 'samples')));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

app.use('/api/menu', require('./routes/menu'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/settings', require('./routes/settings'));

// Driver Game Center (gaming club) — fully isolated from the coffee menu above.
app.use('/api/dgc/menu', require('./routes/dgc/menu'));
app.use('/api/dgc/cabinets', require('./routes/dgc/cabinets'));
app.use('/api/dgc/orders', require('./routes/dgc/orders'));
app.use('/api/dgc/ai', require('./routes/dgc/ai'));
app.use('/api/dgc/settings', require('./routes/dgc/settings'));
app.use('/api/dgc/admin', require('./routes/dgc/admin'));

const clientDist = path.join(__dirname, 'client/dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // Express 5 / path-to-regexp no longer accepts a bare '*' path string, so use a
  // middleware fallback to serve the SPA for client-side routes like /admin.
  app.use((req, res) => res.sendFile(path.join(clientDist, 'index.html')));
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
dgcWss.on('error', handleServerError);

server.listen(PORT, () => {
  console.log(`✅ QR Menu backend running on port ${PORT}`);
});
