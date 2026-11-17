const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT || 3000);
// Render and most cloud hosts require binding to all interfaces.
const HOST = process.env.HOST || '0.0.0.0';
const GAME_FILE = path.join(__dirname, 'index.html');
const MAX_BODY = 16 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 30;
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

  if (req.method === 'POST' && url.pathname === '/api/mission-dialogue') {
    if (isRateLimited(getClientIp(req))) return send(res, 429, { error: 'Too many AI requests.' });
    if (!process.env.OPENAI_API_KEY) return send(res, 503, { error: 'AI is not configured.' });
    try {
      let raw = '';
      for await (const chunk of req) { raw += chunk; if (raw.length > MAX_BODY) return send(res, 413, { error: 'Request too large.' }); }
      const body = JSON.parse(raw || '{}');
      const prompt = [
        'GAME: Underworld Autowala, an Indian street-crime action adventure.',
        'Write a short text-only character conversation in natural Mumbai Hinglish using Roman script.',
        'The rescued character is Brake Fail Bunty, a nervous but funny mechanic.',
        'The player has just rescued him from kidnappers. If firstMeeting is true, Bunty must ask who the player is and how they got inside.',
        'Return valid JSON only: {"lines":[{"speaker":"BRAKE FAIL BUNTY","text":"..."},{"speaker":"YOU","text":"..."},{"speaker":"BRAKE FAIL BUNTY","text":"..."}]}.',
        'Use exactly 3 short lines. Keep dialogue suitable for a teen-rated game. Do not add markdown.',
        'CONTEXT:', JSON.stringify(body)
      ].join('\n');
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST', headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-5.5', instructions: 'You write concise game character dialogue and must return valid JSON only.', input: prompt, max_output_tokens: 260, store: false }),
        signal: AbortSignal.timeout(9000)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return send(res, 502, { error: 'AI dialogue request failed.' });
      const rawText = getOutputText(data).replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
      const parsed = JSON.parse(rawText);
      if (!Array.isArray(parsed.lines) || parsed.lines.length !== 3 || parsed.lines.some(line => !line.speaker || !line.text)) return send(res, 502, { error: 'AI returned invalid dialogue.' });
      return send(res, 200, { lines: parsed.lines });
    } catch (error) {
      console.error('Mission dialogue error:', error.message);
      return send(res, 502, { error: 'Could not generate mission dialogue.' });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/passenger-decision') {
    if (isRateLimited(getClientIp(req))) return send(res, 429, { error: 'Too many AI decision requests.' });
    if (!process.env.OPENAI_API_KEY) return send(res, 503, { error: 'AI is not configured. Using deterministic passenger behaviour.' });
    try {
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > MAX_BODY) return send(res, 413, { error: 'Request too large.' });
      }
      const body = JSON.parse(raw || '{}');
      const passenger = body.passenger || {};
      const context = body.context || {};
      const targets = Array.isArray(body.targets) ? body.targets.slice(0, 8).filter(t => t && typeof t.targetId === 'string' && typeof t.distance === 'number') : [];
      if (!['danger', 'mangesh'].includes(passenger.characterId) || !targets.length) {
        return send(res, 400, { error: 'Missing supported passenger or valid targets.' });
      }
      const expectedAction = passenger.characterId === 'danger' ? 'attack_target' : 'hack_vehicle';
      const prompt = [
        'GAME: Underworld Autowala, a top-down Indian street-crime auto-rickshaw game.',
        'You are making ONE tactical decision for the passenger. The game, not you, executes and validates the action.',
        'Choose only between the allowed action and hold.',
        passenger.characterId === 'danger'
          ? 'DANGER BHAI: choose the most dangerous nearby target for him to shoot. Prefer a rammer or interceptor that threatens the auto. Do not choose a harmless or distant target.'
          : 'MOBILE MANGESH: he has ONE vehicle hack for this ride. Use it only when danger is meaningful, such as multiple pursuing vehicles, a very close pursuer, or critical auto health. Otherwise save it by choosing hold.',
        `Allowed action: ${expectedAction}. Other allowed action: hold.`,
        'targetId must exactly match one of the supplied targetId values. Never invent a target. For hold, use an empty targetId.',
        'Return valid JSON only in this exact shape: {"action":"' + expectedAction + ' or hold","targetId":"exact supplied targetId or empty string"}.',
        'PASSENGER:', JSON.stringify(passenger),
        'LIVE GAME CONTEXT:', JSON.stringify(context),
        'AVAILABLE TARGETS:', JSON.stringify(targets)
      ].join('\n');

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-5.5',
          instructions: 'You are a constrained game AI. Return one valid JSON object only. Never invent targets or actions.',
          input: prompt,
          max_output_tokens: 100,
          store: false
        }),
        signal: AbortSignal.timeout(6200)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return send(res, 502, { error: 'AI decision request failed.' });
      const rawText = getOutputText(data).replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
      const parsed = JSON.parse(rawText);
      const allowedIds = new Set(targets.map(t => t.targetId));
      const action = parsed.action === expectedAction && allowedIds.has(parsed.targetId) ? expectedAction : 'hold';
      const targetId = action === 'hold' ? '' : parsed.targetId;
      return send(res, 200, { action, targetId });
    } catch (error) {
      console.error('Passenger decision error:', error.message);
      return send(res, 502, { error: 'Could not generate passenger decision.' });
    }
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

      const isPickupBriefing = String(context.event || '').toLowerCase().includes('pickup briefing');
      const prompt = [
        'GAME: Underworld Autowala, a chaotic Indian street-crime auto-rickshaw game.',
        isPickupBriefing ? 'Write a short passenger-to-driver pickup conversation/briefing in 1–2 natural spoken sentences.' : 'Write exactly ONE short spoken passenger reaction to the event.',
        'Use natural Mumbai/Hinglish street dialogue in Roman script, like a real passenger speaking.',
        'Stay faithful to the passenger personality. Do not make all passengers sound alike.',
        'Use the supplied live game facts and last-ride memory. If the same passenger rode before, specifically comment on that driving performance and give one practical order for this ride.',
        'For pickup briefings, explain the two shooter cars and two rammer cars accurately: shooters follow and fire but never ram; rammers do not shoot and try to hit the auto.',
        'Avoid repeating any recent dialogue included in the context. Make the line feel fresh and specific.',
        isPickupBriefing ? 'Keep the briefing under 260 characters. No narration, labels, quotation marks, emojis, or multiple alternatives.' : 'Keep it punchy: ideally 6–18 words, maximum 24 words. No narration, labels, quotation marks, emojis, or multiple alternatives.',
        'Do not invent a different health value or claim an event that is not in the context.',
        'Avoid slurs, explicit sexual content, and extreme graphic violence.',
        '',
        'PASSENGER:', JSON.stringify(passenger),
        'LIVE GAME CONTEXT:', JSON.stringify(context),
        '',
        'Return only the dialogue text.'
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
      if (!dialogue || dialogue.length > (isPickupBriefing ? 260 : 180)) return send(res, 502, { error: 'AI returned an invalid dialogue.' });
      return send(res, 200, { dialogue });
    } catch (error) {
      console.error('Passenger AI error:', error.message);
      return send(res, 502, { error: 'Could not generate passenger dialogue.' });
    }
  }


  if (req.method === 'POST' && url.pathname === '/api/mission-director') {
    if (isRateLimited(getClientIp(req))) return send(res, 429, { error: 'Too many mission director requests.' });
    if (!process.env.OPENAI_API_KEY) return send(res, 503, { error: 'AI is not configured. Using local mission director.' });
    try {
      let raw = '';
      for await (const chunk of req) { raw += chunk; if (raw.length > MAX_BODY) return send(res, 413, { error: 'Request too large.' }); }
      const body = JSON.parse(raw || '{}');
      const allowed = ['risky_delivery', 'informant', 'silent_passenger', 'roadblock', 'vip_escort', 'special_request'];
      const eligible = body.specialEligible === true;
      const prompt = [
        'You are the AI Mission Director for Underworld Autowala, a top-down Indian auto-rickshaw action game.',
        'Your job is to adapt normal rides to the driver and occasionally select a supported special mission.',
        'If specialEligible is false, special MUST be false and type must be empty. Return an adaptive enemy plan only.',
        'If specialEligible is true, select exactly one mission type from: ' + allowed.join(', ') + '.',
        'Mission mechanics are constrained: risky_delivery = 105-second delivery deadline; informant = standard delivery with gang chase pressure; silent_passenger = avoid crashes (2 crashes fail bonus); roadblock = one existing road closure is spawned; vip_escort = passenger ally protection/shooting support; special_request = standard delivery with a slightly more impatient passenger.',
        'Never invent new map areas, characters, enemy types, mechanics, or rewards.',
        'Return JSON only with keys: special(boolean), type(string), objective(string max 180 chars), deadline(integer 0-180), bonus(integer 100-500), enemyPlan(one of pressure/intercept/spread), reason(string max 140 chars).',
        'For non-special rides use special=false, type="", deadline=0, bonus=0.',
        'Choose fair difficulty. Reputation is not the only factor; consider recent player failures and style.',
        'INPUT: ' + JSON.stringify({ specialEligible: eligible, reputation: body.reputation, rides: body.rides, history: body.history, passenger: body.passenger, recentSpecialType: body.recentSpecialType })
      ].join('\n');
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-5.5', instructions: 'You are a constrained game-system planner. Return valid JSON only. Never exceed the allowed mechanics or numeric bounds.', input: prompt, max_output_tokens: 180, store: false }),
        signal: AbortSignal.timeout(6000)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return send(res, 502, { error: 'Mission director AI failed.' });
      const parsed = JSON.parse(getOutputText(data).replace(/^```(?:json)?\s*|\s*```$/g, '').trim());
      const special = eligible && parsed.special === true && allowed.includes(parsed.type);
      return send(res, 200, {
        special,
        type: special ? parsed.type : '',
        objective: String(parsed.objective || '').slice(0, 180),
        deadline: special ? Math.max(0, Math.min(180, Number(parsed.deadline) || 0)) : 0,
        bonus: special ? Math.max(100, Math.min(500, Number(parsed.bonus) || 250)) : 0,
        enemyPlan: ['pressure', 'intercept', 'spread'].includes(parsed.enemyPlan) ? parsed.enemyPlan : 'pressure',
        reason: String(parsed.reason || 'Adapted to your recent driving.').slice(0, 140)
      });
    } catch (error) {
      console.error('Mission director error:', error.message);
      return send(res, 502, { error: 'Could not generate mission decision.' });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/enemy-brain') {
    if (isRateLimited(getClientIp(req))) return send(res, 429, { error: 'Too many enemy AI requests.' });
    if (!process.env.OPENAI_API_KEY) return send(res, 503, { error: 'AI is not configured.' });
    try {
      let raw=''; for await (const chunk of req) { raw+=chunk; if(raw.length>MAX_BODY) return send(res,413,{error:'Request too large.'}); }
      const body=JSON.parse(raw||'{}');
      const allowed=['close_pressure','road_intercept','spread_attack'];
      const prompt=['Choose one tactical strategy for enemy drivers in Underworld Autowala.','Use the player history to counter their habits.','Return JSON only: {"strategy":"one_allowed_value"}.','Allowed: '+allowed.join(', '),'PLAYER HISTORY: '+JSON.stringify(body.history||{}),'CURRENT GAME: '+JSON.stringify(body.context||{})].join('\n');
      const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-5.5',instructions:'You are a constrained tactical game AI. Never invent game entities or mechanics. Return valid JSON only.',input:prompt,max_output_tokens:70,store:false}),signal:AbortSignal.timeout(5000)});
      const data=await response.json().catch(()=>({}));if(!response.ok)return send(res,502,{error:'Enemy AI failed.'});
      const parsed=JSON.parse(getOutputText(data).replace(/^```(?:json)?\s*|\s*```$/g,'').trim());
      return send(res,200,{strategy:allowed.includes(parsed.strategy)?parsed.strategy:'close_pressure'});
    } catch(error){console.error('Enemy brain error:',error.message);return send(res,502,{error:'Could not update enemy strategy.'});}
  }

  if (req.method === 'POST' && url.pathname === '/api/enemy-reaction') {
    if (isRateLimited(getClientIp(req))) return send(res,429,{error:'Too many enemy dialogue requests.'});
    if (!process.env.OPENAI_API_KEY) return send(res,503,{error:'AI is not configured.'});
    try {
      let raw=''; for await (const chunk of req) { raw+=chunk; if(raw.length>MAX_BODY)return send(res,413,{error:'Request too large.'}); }
      const body=JSON.parse(raw||'{}');
      const prompt=['Write ONE short natural Mumbai street-gang dialogue line in Roman Hinglish for an enemy driver.','React specifically to the event and the player driving history. Avoid repeating generic taunts.','Return plain text only, maximum 150 characters.','CONTEXT: '+JSON.stringify(body)].join('\n');
      const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-5.5',instructions:'You write concise, varied, teen-rated game dialogue. No markdown, no quotes.',input:prompt,max_output_tokens:70,store:false}),signal:AbortSignal.timeout(5000)});
      const data=await response.json().catch(()=>({}));if(!response.ok)return send(res,502,{error:'Enemy dialogue failed.'});
      const dialogue=getOutputText(data).replace(/[\r\n]+/g,' ').replace(/^['"“”]+|['"“”]+$/g,'').trim();if(!dialogue||dialogue.length>150)return send(res,502,{error:'Invalid enemy dialogue.'});
      return send(res,200,{dialogue});
    } catch(error){console.error('Enemy dialogue error:',error.message);return send(res,502,{error:'Could not generate enemy dialogue.'});}
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
