const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT || 3000);
// Render and most cloud hosts require binding to all interfaces.
const HOST = process.env.HOST || '0.0.0.0';
const GAME_FILE = path.join(__dirname, 'index.html');
const MAX_BODY = 16 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 12;
const requestCounts = new Map();

function send(res, status, payload, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'X-Frame-Options': 'SAMEORIGIN'
  });
  res.end(type.startsWith('application/json') ? JSON.stringify(payload) : payload);
}

function getClientIp(req) {
  // Render supplies this header from its proxy. Only the first address is used.
  const forwarded = req.headers['x-forwarded-for'];
  return (typeof forwarded === 'string' && forwarded.split(',')[0].trim()) || req.socket.remoteAddress || 'unknown';
}

function isRateLimited(ip) {
  const now = Date.now();
  const current = requestCounts.get(ip);
  if (!current || now - current.startedAt >= RATE_LIMIT_WINDOW_MS) {
    requestCounts.set(ip, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_MAX;
}

// Periodically remove old IP buckets so this map stays small on a long-running service.
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of requestCounts) {
    if (now - bucket.startedAt >= RATE_LIMIT_WINDOW_MS * 2) requestCounts.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS).unref();

function getOutputText(data) {
  if (typeof data.output_text === 'string') return data.output_text.trim();
  return (data.output || [])
    .filter(item => item.type === 'message')
    .flatMap(item => item.content || [])
    .filter(part => part.type === 'output_text' && typeof part.text === 'string')
    .map(part => part.text)
    .join('\n')
    .trim();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/api/status') {
    return send(res, 200, { aiConfigured: Boolean(process.env.OPENAI_API_KEY) });
  }

  if (req.method === 'POST' && url.pathname === '/api/passenger-reaction') {
    if (isRateLimited(getClientIp(req))) {
      return send(res, 429, { error: 'Too many AI reaction requests. Please try again shortly.' });
    }
    if (!process.env.OPENAI_API_KEY) {
      return send(res, 503, { error: 'AI is not configured. Using in-game fallback dialogue.' });
    }

    try {
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > MAX_BODY) return send(res, 413, { error: 'Request too large.' });
      }
      const body = JSON.parse(raw || '{}');
      const passenger = body.passenger || {};
      const context = body.context || {};
      if (!passenger.name || !context.event) return send(res, 400, { error: 'Missing passenger or event context.' });

      const prompt = [
        'GAME: Underworld Autowala, a chaotic Indian street-crime auto-rickshaw game.',
        'Write exactly ONE short spoken passenger reaction to the event.',
        'Use natural Mumbai/Hinglish street dialogue in Roman script, like a real passenger speaking.',
        'Stay faithful to the passenger personality. Do not make all passengers sound alike.',
        'Use the supplied live game facts when relevant, especially exact auto health and health percentage.',
        'React to the specific event, not a generic crash. Personality details and game facts are fictional game context.',
        'Keep it punchy: ideally 6–18 words, maximum 24 words. No narration, labels, quotation marks, emojis, or multiple alternatives.',
        'Do not invent a different health value or claim an event that is not in the context.',
        'Avoid slurs, explicit sexual content, and extreme graphic violence.',
        '',
        'PASSENGER:', JSON.stringify(passenger),
        'LIVE GAME CONTEXT:', JSON.stringify(context),
        '',
        'Return only the dialogue line.'
      ].join('\n');

      const apiResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-5.5',
          instructions: 'You are the reactive passenger dialogue writer for a game. Follow the requested voice, personality, and strict one-line output format.',
          input: prompt,
          max_output_tokens: 90,
          store: false
        }),
        signal: AbortSignal.timeout(7000)
      });

      const data = await apiResponse.json().catch(() => ({}));
      if (!apiResponse.ok) {
        console.error('OpenAI API error:', apiResponse.status, data.error?.message || 'Unknown API error');
        return send(res, 502, { error: 'AI service request failed.' });
      }
      const dialogue = getOutputText(data).replace(/[\r\n]+/g, ' ').replace(/^['"“”]+|['"“”]+$/g, '').trim();
      if (!dialogue || dialogue.length > 180) return send(res, 502, { error: 'AI returned an invalid dialogue.' });
      return send(res, 200, { dialogue });
    } catch (error) {
      console.error('Passenger AI error:', error.message);
      return send(res, 502, { error: 'Could not generate passenger dialogue.' });
    }
  }

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    try {
      const html = fs.readFileSync(GAME_FILE);
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN'
      });
      return res.end(html);
    } catch (_) {
      return send(res, 500, { error: 'Game file index.html was not found.' });
    }
  }

  return send(res, 404, { error: 'Not found.' });
});

server.listen(PORT, HOST, () => {
  console.log(`Underworld Autowala is running on ${HOST}:${PORT}`);
  console.log(process.env.OPENAI_API_KEY ? 'Passenger AI: configured' : 'Passenger AI: fallback mode (OPENAI_API_KEY not set)');
});
