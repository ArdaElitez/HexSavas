const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hexsavas';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB veritabanına bağlanıldı!'))
  .catch(err => console.error('❌ MongoDB bağlantı hatası:', err));

// Mongoose Schema
const playerSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  usernameLower: { type: String, required: true, unique: true },
  password: { type: String },
  deviceId: { type: String, required: true },
  bestScore: { type: Number, default: 0 },
  bestRound: { type: Number, default: 0 },
  totalWins: { type: Number, default: 0 },
  totalKills: { type: Number, default: 0 },
  totalGames: { type: Number, default: 0 },
  registeredAt: { type: Date, default: Date.now },
  scores: [{
    score: Number,
    round: Number,
    wins: Number,
    kills: Number,
    date: { type: Date, default: Date.now }
  }],
  gameData: { type: Object, default: {} }
});

const Player = mongoose.model('Player', playerSchema);

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json'
};

// === DATA HELPERS ===
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function sendJSON(res, statusCode, obj) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(obj));
}

// === API HANDLERS ===

// POST /api/register  { username, password, deviceId }
async function handleRegister(req, res) {
  try {
    const body = await readBody(req);
    const { username, password, deviceId } = body;
    if (!username || !deviceId) return sendJSON(res, 400, { error: 'Kullanıcı adı ve cihaz ID gerekli' });
    if (username !== '__check__' && (!password || password.length < 4)) return sendJSON(res, 400, { error: 'Şifre en az 4 karakter olmalı' });

    const name = username.trim();
    if (name.length < 2 || name.length > 20) return sendJSON(res, 400, { error: 'Kullanıcı adı 2-20 karakter olmalı' });
    if (!/^[a-zA-Z0-9_çÇğĞıİöÖşŞüÜ]+$/.test(name)) return sendJSON(res, 400, { error: 'Sadece harf, rakam ve _ kullanılabilir' });

    const nameLower = name.toLowerCase();

    // Aynı deviceId ile daha önce kayıt varsa onu döndür
    const existingDevice = await Player.findOne({ deviceId });
    if (existingDevice) {
      return sendJSON(res, 200, { ok: true, username: existingDevice.username, existing: true, gameData: existingDevice.gameData || {} });
    }

    // Kullanıcı adı alınmış mı kontrol et
    const existingName = await Player.findOne({ usernameLower: nameLower });
    if (existingName) {
      return sendJSON(res, 409, { error: 'Bu kullanıcı adı zaten alınmış!' });
    }

    // Yeni oyuncu oluştur
    const newPlayer = new Player({
      username: name,
      usernameLower: nameLower,
      password: password,
      deviceId: deviceId,
      gameData: {}
    });
    await newPlayer.save();
    
    sendJSON(res, 201, { ok: true, username: name, gameData: {} });
  } catch (err) {
    console.error(err);
    sendJSON(res, 500, { error: 'Sunucu hatası' });
  }
}

// POST /api/login { username, password, deviceId }
async function handleLogin(req, res) {
  try {
    const body = await readBody(req);
    const { username, password, deviceId } = body;
    if (!username || !password || !deviceId) return sendJSON(res, 400, { error: 'Kullanıcı adı, şifre ve cihaz ID gerekli' });

    const nameLower = username.trim().toLowerCase();
    const player = await Player.findOne({ usernameLower: nameLower });
    
    if (!player) {
      return sendJSON(res, 404, { error: 'Kullanıcı bulunamadı' });
    }
    
    // Eski şifresiz hesaplara ilk girişte şifre atama
    if (!player.password) {
      player.password = password;
      player.deviceId = deviceId;
      await player.save();
      return sendJSON(res, 200, { ok: true, username: player.username, deviceId: player.deviceId, gameData: player.gameData || {} });
    }
    
    if (player.password !== password) {
      return sendJSON(res, 401, { error: 'Hatalı şifre' });
    }
    
    // Şifre doğru, deviceId güncelle
    player.deviceId = deviceId;
    await player.save();
    
    sendJSON(res, 200, { ok: true, username: player.username, deviceId: player.deviceId, gameData: player.gameData || {} });
  } catch (err) {
    console.error(err);
    sendJSON(res, 500, { error: 'Sunucu hatası' });
  }
}

// POST /api/score  { deviceId, round, wins, kills }
async function handleSubmitScore(req, res) {
  try {
    const body = await readBody(req);
    const { deviceId, round, wins, kills } = body;
    if (!deviceId) return sendJSON(res, 400, { error: 'Cihaz ID gerekli' });

    const player = await Player.findOne({ deviceId });
    if (!player) return sendJSON(res, 404, { error: 'Oyuncu bulunamadı. Önce kayıt ol.' });

    const score = (round || 0) * 100 + (wins || 0) * 50 + (kills || 0) * 10;
    const entry = {
      score,
      round: round || 0,
      wins: wins || 0,
      kills: kills || 0,
      date: new Date()
    };

    player.scores.push(entry);
    // Son 50 skoru tut
    if (player.scores.length > 50) player.scores = player.scores.slice(-50);

    player.totalGames++;
    if (score > player.bestScore) player.bestScore = score;
    if ((round || 0) > player.bestRound) player.bestRound = round;
    player.totalWins = (player.totalWins || 0) + (wins || 0);
    player.totalKills = (player.totalKills || 0) + (kills || 0);

    await player.save();

    // Sıralamayı bul
    const rankCount = await Player.countDocuments({ bestScore: { $gt: player.bestScore } });
    const rank = rankCount + 1;

    sendJSON(res, 200, { ok: true, score, rank });
  } catch (err) {
    console.error(err);
    sendJSON(res, 500, { error: 'Sunucu hatası' });
  }
}

// POST /api/sync  { deviceId, gameData }
async function handleSyncData(req, res) {
  try {
    const body = await readBody(req);
    const { deviceId, gameData } = body;
    if (!deviceId) return sendJSON(res, 400, { error: 'Cihaz ID gerekli' });
    if (!gameData) return sendJSON(res, 400, { error: 'gameData gerekli' });

    const player = await Player.findOne({ deviceId });
    if (!player) return sendJSON(res, 404, { error: 'Oyuncu bulunamadı.' });

    player.gameData = gameData;
    await player.save();

    sendJSON(res, 200, { ok: true });
  } catch (err) {
    console.error(err);
    sendJSON(res, 500, { error: 'Sunucu hatası' });
  }
}


function getSortField(sortBy) {
  switch (sortBy) {
    case 'round': return 'bestRound';
    case 'wins': return 'totalWins';
    case 'kills': return 'totalKills';
    default: return 'bestScore';
  }
}

// GET /api/leaderboard?sort=score|round|wins|kills&limit=50
async function handleGetLeaderboard(req, res) {
  try {
    const parsed = url.parse(req.url, true);
    const sortBy = parsed.query.sort || 'score';
    const limit = Math.min(parseInt(parsed.query.limit) || 50, 100);

    const field = getSortField(sortBy);
    const sortObj = {};
    sortObj[field] = -1;

    const players = await Player.find()
      .sort(sortObj)
      .limit(limit)
      .select('username bestScore bestRound totalWins totalKills totalGames -_id');

    const total = await Player.countDocuments();

    sendJSON(res, 200, { players, total, sortBy });
  } catch (err) {
    console.error(err);
    sendJSON(res, 500, { error: 'Sunucu hatası' });
  }
}

// GET /api/player/:username
async function handleGetPlayer(req, res, username) {
  try {
    const player = await Player.findOne({ usernameLower: username.toLowerCase() });
    if (!player) return sendJSON(res, 404, { error: 'Oyuncu bulunamadı' });

    const rankCount = await Player.countDocuments({ bestScore: { $gt: player.bestScore } });
    const rank = rankCount + 1;

    sendJSON(res, 200, {
      username: player.username,
      bestScore: player.bestScore,
      bestRound: player.bestRound,
      totalWins: player.totalWins || 0,
      totalKills: player.totalKills || 0,
      totalGames: player.totalGames || 0,
      registeredAt: player.registeredAt,
      recentScores: (player.scores || []).slice(-10).reverse(),
      rank: rank
    });
  } catch (err) {
    console.error(err);
    sendJSON(res, 500, { error: 'Sunucu hatası' });
  }
}

// GET /api/check/:username
async function handleCheckUsername(req, res, username) {
  try {
    const exists = await Player.findOne({ usernameLower: username.toLowerCase() });
    sendJSON(res, 200, { available: !exists });
  } catch (err) {
    console.error(err);
    sendJSON(res, 500, { error: 'Sunucu hatası' });
  }
}

// GET /api/delete/:username?secret=...
async function handleDeleteUser(req, res, username) {
  try {
    const parsed = url.parse(req.url, true);
    const secret = parsed.query.secret;

    if (secret !== 'hexsavas_sil') {
      return sendJSON(res, 403, { error: 'Yetkisiz erişim. Şifre (secret) hatalı!' });
    }

    const nameLower = username.toLowerCase();
    const deleted = await Player.findOneAndDelete({ usernameLower: nameLower });

    if (!deleted) {
      return sendJSON(res, 404, { error: 'Bu kullanıcı adında bir oyuncu bulunamadı.' });
    }

    sendJSON(res, 200, { ok: true, message: `${username} adlı oyuncu başarıyla silindi.` });
  } catch (err) {
    console.error(err);
    sendJSON(res, 500, { error: 'Sunucu hatası' });
  }
}

// === SERVER ===
const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // === API ROUTES ===
  if (pathname === '/api/register' && req.method === 'POST') return handleRegister(req, res);
  if (pathname === '/api/login' && req.method === 'POST') return handleLogin(req, res);
  if (pathname === '/api/score' && req.method === 'POST') return handleSubmitScore(req, res);
  if (pathname === '/api/sync' && req.method === 'POST') return handleSyncData(req, res);
  if (pathname === '/api/leaderboard' && req.method === 'GET') return handleGetLeaderboard(req, res);

  const playerMatch = pathname.match(/^\/api\/player\/(.+)$/);
  if (playerMatch && req.method === 'GET') return handleGetPlayer(req, res, decodeURIComponent(playerMatch[1]));

  const checkMatch = pathname.match(/^\/api\/check\/(.+)$/);
  if (checkMatch && req.method === 'GET') return handleCheckUsername(req, res, decodeURIComponent(checkMatch[1]));

  const deleteMatch = pathname.match(/^\/api\/delete\/(.+)$/);
  if (deleteMatch && req.method === 'GET') return handleDeleteUser(req, res, decodeURIComponent(deleteMatch[1]));

  // === STATIC FILES ===
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(__dirname, filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType + '; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 Hex Savaş Sunucusu çalışıyor!`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${getLocalIP()}:${PORT}`);
  console.log(`   API:     http://localhost:${PORT}/api/leaderboard`);
});

function getLocalIP() {
  const os = require('os');
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}
