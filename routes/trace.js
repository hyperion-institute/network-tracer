const express = require('express');
const router = express.Router();
const { runTraceroute } = require('../services/traceroute');
const { lookupIp } = require('../services/geoip');

// --- Very simple in-memory rate limiter (fine for a small demo/single server) ---
const RATE_LIMIT = 5; // max requests
const WINDOW_MS = 60 * 1000; // per 1 minute, per client IP
const requestLog = new Map();

function isRateLimited(clientIp) {
  const now = Date.now();
  const recent = (requestLog.get(clientIp) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  requestLog.set(clientIp, recent);
  return recent.length > RATE_LIMIT;
}

// --- Block tracing to private / loopback / reserved addresses (anti-SSRF) ---
const PRIVATE_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^localhost$/i,
];

function isPrivateOrReserved(host) {
  return PRIVATE_PATTERNS.some((re) => re.test(host));
}

// --- Loose validation: only allow characters valid in a domain/IP, ---
// --- which also blocks shell metacharacters before they reach spawn() ---
function isValidTarget(target) {
  return typeof target === 'string' && target.length <= 253 && /^[a-zA-Z0-9.\-:]+$/.test(target);
}

router.post('/', async (req, res) => {
  const clientIp = req.ip;

  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a minute and try again.' });
  }

  const { target } = req.body || {};

  if (!target || !isValidTarget(target)) {
    return res.status(400).json({ error: 'Invalid target. Please enter a valid domain or IP address.' });
  }

  if (isPrivateOrReserved(target)) {
    return res.status(400).json({ error: 'Tracing private/internal addresses is not allowed.' });
  }

  try {
    const hops = await runTraceroute(target);

    // Enrich each hop with geolocation data (skip hops that timed out / have no IP)
    const enrichedHops = await Promise.all(
      hops.map(async (hop) => {
        if (!hop.ip) return hop;
        const geo = await lookupIp(hop.ip);
        return { ...hop, ...geo };
      })
    );

    res.json({ target, hops: enrichedHops });
  } catch (err) {
    console.error('Traceroute error:', err.message);
    res.status(500).json({ error: 'Failed to run traceroute. Is traceroute installed on the server?' });
  }
});

module.exports = router;
