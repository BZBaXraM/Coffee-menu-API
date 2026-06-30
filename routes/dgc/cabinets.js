const express = require('express');
const { getDgcDB } = require('../../db/dgc');
const router = express.Router();

// Enrich a cabinet row with live timer info when it is open.
function withLiveStatus(cab) {
  if (!cab) return cab;
  if (cab.status === 'open' && cab.opened_at) {
    const elapsedMs = Date.now() - new Date(cab.opened_at).getTime();
    const elapsedMinutes = Math.max(0, Math.round(elapsedMs / 60000));
    return { ...cab, elapsed_minutes: elapsedMinutes, running_cost: estimateCost(elapsedMinutes, cab.hourly_rate) };
  }
  return { ...cab, elapsed_minutes: 0, running_cost: 0 };
}

// Cost = hourly_rate × hours, hours rounded up to the next started hour.
function estimateCost(minutes, hourlyRate) {
  const hours = Math.max(1, Math.ceil(minutes / 60));
  return +(hours * (hourlyRate || 0)).toFixed(2);
}

router.get('/', (req, res) => {
  const cabs = getDgcDB().prepare('SELECT * FROM cabinets WHERE is_active = 1 ORDER BY sort_order, id').all();
  res.json(cabs.map(withLiveStatus));
});

router.get('/:id', (req, res) => {
  const cab = getDgcDB().prepare('SELECT * FROM cabinets WHERE id = ?').get(req.params.id);
  if (!cab) return res.status(404).json({ error: 'Not found' });
  res.json(withLiveStatus(cab));
});

module.exports = router;
module.exports.withLiveStatus = withLiveStatus;
module.exports.estimateCost = estimateCost;
