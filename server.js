const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');
const INDEX_PATH = path.join(__dirname, 'public', 'index.html');
const ADMIN_PASSWORD = 'oscar2026';

const db = {
  read() {
    if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ users: {}, winners: {} }, null, 2));
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  },
  write(data) { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); }
};

const NOMINATIONS = {
  "Best Picture": ["Bugonia", "Frankenstein", "F1", "Hamnet", "Marty Supreme", "One Battle After Another", "The Secret Agent", "Sentimental Value", "Sinners", "Train Dreams"],
  "Best Actor": ["Timothée Chalamet - Marty Supreme", "Leonardo DiCaprio - One Battle After Another", "Ethan Hawke - Blue Moon", "Michael B Jordan - Sinners", "Wagner Moura - The Secret Agent"],
  "Best Actress": ["Jessie Buckley - Hamnet", "Rose Byrne - If I Had Legs I'd Kick You", "Kate Hudson - Song Sung Blue", "Renate Reinsve - Sentimental Value", "Emma Stone - Bugonia"],
  "Best Supporting Actress": ["Elle Fanning - Sentimental Value", "Inga Ibsdotter Lilleaas - Sentimental Value", "Amy Madigan - Weapons", "Wunmi Mosaku - Sinners", "Teyana Taylor - One Battle After Another"],
  "Best Supporting Actor": ["Benicio del Toro - One Battle After Another", "Jacob Elordi - Frankenstein", "Delroy Lindo - Sinners", "Sean Penn - One Battle After Another", "Stellan Skarsgård - Sentimental Value"],
  "Best Director": ["Paul Thomas Anderson - One Battle After Another", "Ryan Coogler - Sinners", "Josh Safdie - Marty Supreme", "Joachim Trier - Sentimental Value", "Chloé Zhao - Hamnet"],
  "Best Adapted Screenplay": ["Bugonia", "Frankenstein", "Hamnet", "One Battle After Another", "Train Dreams"],
  "Best Original Screenplay": ["Blue Moon", "It Was Just an Accident", "Marty Supreme", "Sentimental Value", "Sinners"],
  "Best Original Song": ["Dear Me - Diane Warren: Relentless", "Golden - KPop Demon Hunters", "I Lied to You - Sinners", "Sweet Dreams of Joy - Viva Verdi!", "Train Dreams - Train Dreams"],
  "Best Original Score": ["Bugonia", "Frankenstein", "Hamnet", "One Battle After Another", "Sinners"],
  "Best International Feature": ["It Was Just an Accident", "Sentimental Value", "Sirât", "The Secret Agent", "The Voice of Hind Rajab"],
  "Best Animated Feature": ["Arco", "Elio", "KPop Demon Hunters", "Little Amélie or the Character of Rain", "Zootopia 2"],
  "Best Documentary Feature": ["Come See Me in the Good Light", "Cutting Through the Rocks", "Mr. Nobody Against Putin", "The Alabama Solution", "The Perfect Neighbor"],
  "Best Costume Design": ["Avatar: Fire and Ash", "Frankenstein", "Hamnet", "Marty Supreme", "Sinners"],
  "Best Make-Up and Hairstyling": ["Frankenstein", "Kokuho", "Sinners", "The Smashing Machine", "The Ugly Stepsister"],
  "Best Production Design": ["Frankenstein", "Hamnet", "Marty Supreme", "One Battle After Another", "Sinners"],
  "Best Sound": ["Frankenstein", "F1", "One Battle After Another", "Sinners", "Sirât"],
  "Best Film Editing": ["F1", "Marty Supreme", "One Battle After Another", "Sentimental Value", "Sinners"],
  "Best Cinematography": ["Frankenstein", "Marty Supreme", "One Battle After Another", "Sinners", "Train Dreams"],
  "Best Visual Effects": ["Avatar: Fire and Ash", "F1", "Jurassic World Rebirth", "Sinners", "The Lost Bus"],
  "Best Live Action Short": ["A Friend of Dorothy", "Butcher's Stain", "Jane Austen's Period Drama", "The Singers", "Two People Exchanging Saliva"],
  "Best Animated Short": ["Butterfly", "Forevergreen", "Retirement Plan", "The Girl Who Cried Pearls", "The Three Sisters"],
  "Best Documentary Short": ["All the Empty Rooms", "Armed Only with a Camera: The Life and Death of Brent Renaud", "Children No More: Were and Are Gone", "The Devil Is Busy", "Perfectly a Strangeness"],
  "Best Casting": ["Hamnet", "Marty Supreme", "One Battle After Another", "Sinners", "The Secret Agent"]
};

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(); } });
  });
}

function getQuery(url) {
  const idx = url.indexOf('?');
  if (idx === -1) return {};
  return Object.fromEntries(new URLSearchParams(url.slice(idx)));
}

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  const method = req.method;

  // Serve index.html for root or any non-API path
  if (!url.startsWith('/api/')) {
    try {
      const html = fs.readFileSync(INDEX_PATH, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } catch {
      res.writeHead(404); res.end('Not found');
    }
    return;
  }

  // API routes
  if (method === 'GET' && url === '/api/nominations') {
    return json(res, 200, NOMINATIONS);
  }

  if (method === 'GET' && url === '/api/winners') {
    return json(res, 200, db.read().winners);
  }

  if (method === 'GET' && url.match(/^\/api\/user\/[^/]+$/)) {
    const name = decodeURIComponent(url.split('/')[3]).toLowerCase().trim();
    const user = db.read().users[name];
    if (!user) return json(res, 404, { error: 'User not found' });
    return json(res, 200, user);
  }

  if (method === 'POST' && url.match(/^\/api\/user\/[^/]+\/guesses$/)) {
    const name = decodeURIComponent(url.split('/')[3]).toLowerCase().trim();
    if (!name) return json(res, 400, { error: 'Name required' });
    const body = await parseBody(req);
    const data = db.read();
    if (data.users[name] && data.users[name].locked) return json(res, 403, { error: 'Guesses are locked' });
    data.users[name] = { displayName: body.displayName || name, guesses: body.guesses || {}, locked: false };
    db.write(data);
    return json(res, 200, { ok: true });
  }

  if (method === 'POST' && url.match(/^\/api\/user\/[^/]+\/lock$/)) {
    const name = decodeURIComponent(url.split('/')[3]).toLowerCase().trim();
    const data = db.read();
    if (!data.users[name]) return json(res, 404, { error: 'User not found' });
    data.users[name].locked = true;
    db.write(data);
    return json(res, 200, { ok: true });
  }

  if (method === 'POST' && url === '/api/admin/winner') {
    const body = await parseBody(req);
    if (body.password !== ADMIN_PASSWORD) return json(res, 401, { error: 'Wrong password' });
    const data = db.read();
    data.winners[body.category] = body.winner;
    db.write(data);
    return json(res, 200, { ok: true });
  }

  if (method === 'GET' && url === '/api/admin/users') {
    const query = getQuery(req.url);
    if (query.password !== ADMIN_PASSWORD) return json(res, 401, { error: 'Wrong password' });
    const data = db.read();
    const summary = Object.entries(data.users).map(([, u]) => ({ name: u.displayName, locked: u.locked, guesses: u.guesses }));
    return json(res, 200, summary);
  }

  if (method === 'GET' && url === '/api/scoreboard') {
    const data = db.read();
    const scores = Object.entries(data.users)
      .filter(([, u]) => u.locked)
      .map(([, u]) => {
        let correct = 0, total = 0;
        for (const [cat, winner] of Object.entries(data.winners)) { if (winner) { total++; if (u.guesses[cat] === winner) correct++; } }
        return { name: u.displayName, correct, total };
      })
      .sort((a, b) => b.correct - a.correct);
    return json(res, 200, scores);
  }

  json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => console.log(`Oscar party server running on http://localhost:${PORT}`));

