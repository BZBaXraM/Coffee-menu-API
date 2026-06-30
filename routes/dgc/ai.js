const express = require('express');
const { getDgcDB } = require('../../db/dgc');
const router = express.Router();

function nameOf(row) {
  try { const n = JSON.parse(row.name); return n.en || n.az || Object.values(n)[0]; }
  catch { return row.name; }
}
function descOf(row) {
  if (!row.description) return '';
  try { const d = JSON.parse(row.description); return d.en || d.az || Object.values(d)[0] || ''; }
  catch { return row.description; }
}

function getAllItems() {
  return getDgcDB().prepare('SELECT * FROM items WHERE is_available = 1').all();
}

// Full picture of what the club offers: the menu, the bookable cabinets (with
// hourly rates) and the ready-made cabinet sets — so the AI can answer about
// everything in the Game Center, not just drinks.
function getClubContext(items) {
  const db = getDgcDB();
  const cabinets = db.prepare('SELECT * FROM cabinets WHERE is_active = 1 ORDER BY sort_order, id').all();
  const sets = db.prepare('SELECT * FROM sets WHERE is_active = 1 ORDER BY sort_order, id').all();

  const menuLines = items
    .map((d) => `- ${nameOf(d)}: ${d.price} AZN${d.is_hookah ? ' (hookah)' : ''}${d.scope === 'cabinet' ? ' [cabinet only]' : ''}`)
    .join('\n');
  const cabinetLines = cabinets
    .map((c) => `- ${nameOf(c)}: ${c.capacity} seats, ${c.hourly_rate} AZN/hour, currently ${c.status}`)
    .join('\n');
  const setLines = sets
    .map((s) => `- ${nameOf(s)}: ${s.price} AZN${s.includes_hookah ? ' (includes hookah)' : ''}${descOf(s) ? ` — ${descOf(s)}` : ''}`)
    .join('\n');

  return [
    `MENU:\n${menuLines || '- (none)'}`,
    `CABINETS (private gaming rooms, billed per hour):\n${cabinetLines || '- (none)'}`,
    `CABINET SETS (ready-made combos):\n${setLines || '- (none)'}`,
  ].join('\n\n');
}

function extractMentionedItems(reply, items) {
  const replyLower = reply.toLowerCase();
  return items.filter((d) => {
    let names;
    try { names = JSON.parse(d.name); } catch { names = { en: d.name }; }
    return Object.values(names).some((n) => n && replyLower.includes(n.toLowerCase()));
  });
}

router.post('/chat', async (req, res) => {
  const { message, language = 'az', history = [] } = req.body;
  const allItems = getAllItems();
  const clubContext = getClubContext(allItems);

  const systemPrompt = `You are a friendly host at "Driver Game Center", a gaming club. The club offers private gaming cabinets rented by the hour, cabinet sets (combos), hookah, cold drinks, hot drinks, snacks, food and desserts. Answer about anything the club offers — cabinets, prices, sets, hookah and the menu — plus recommendations. Be concise and helpful. Respond in language: ${language}.

${clubContext}

Rules:
- Only answer questions about the Driver Game Center (its cabinets, sets, hookah, food, drinks, prices and recommendations).
- Recommend cabinets, sets or menu items based on the guest's preferences and group size.
- Hookah and some items are available only inside a cabinet — mention that when relevant.
- If asked about price or hourly cabinet rates, answer precisely.
- Keep responses short (2-4 sentences max).
- CRITICAL: You CANNOT add items to the cart, open cabinets, or place orders. Never say "I added X to your cart" or "I opened a cabinet".
- When you mention a menu item that exists, it will automatically be shown to the guest with an "Add to cart" button — you do NOT need to tell them to tap a card.
- Never pretend to confirm or complete an order or booking.
- Never show internal IDs to the guest.`;

  try {
    const baseUrl = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map((h) => ({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages, stream: false }),
    });

    if (!response.ok) {
      const body = await response.text();
      const err = new Error(`Groq HTTP ${response.status}: ${body}`);
      err.status = response.status;
      throw err;
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not process your request.';
    res.json({ reply, dishes: extractMentionedItems(reply, allItems) });
  } catch (err) {
    const msg = err.message || '';
    const offlinePatterns = ['ECONNREFUSED', 'RESOURCE_EXHAUSTED', 'quota', 'UNAUTHENTICATED', 'API key', 'PERMISSION_DENIED'];
    const degradedStatus = [401, 403, 429, 500, 502, 503].includes(err.status);
    if (
      err.name === 'TimeoutError' ||
      err.code === 'ECONNREFUSED' ||
      err.code === 'ENOTFOUND' ||
      degradedStatus ||
      offlinePatterns.some((p) => msg.includes(p) || err.code === p)
    ) {
      console.error('[dgc/ai/chat] degraded:', msg);
      res.json({ reply: 'AI assistant is currently unavailable. Please ask the staff for recommendations.', offline: true });
    } else {
      console.error('[dgc/ai/chat] error:', msg);
      res.status(500).json({ error: msg });
    }
  }
});

router.post('/recommend', (req, res) => {
  const { cartItems = [] } = req.body;
  const db = getDgcDB();
  const cartIds = cartItems.map((i) => i.id).filter(Boolean);
  const items = db.prepare(
    'SELECT * FROM items WHERE is_available = 1 AND id NOT IN (' +
      (cartIds.length ? cartIds.map(() => '?').join(',') : '0') +
      ') ORDER BY is_featured DESC, RANDOM() LIMIT 3'
  ).all(...cartIds);
  res.json(items);
});

module.exports = router;
