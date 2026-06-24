// ===== SCREEN NAVIGATION & SETTINGS =====

let currentScreen = 'menu';
let gameSettings = {
  combatSpeed: 1,
  particles: true,
  dmgNumbers: true,
  screenShake: true,
  sfxVolume: 0.5,
  musicVolume: 0.3
};
let globalStats = { bestRound: 0, totalWins: 0, totalKills: 0 };

// --- Load saved data ---
function loadData() {
  try {
    const s = localStorage.getItem('hexSavas_settings');
    if (s) gameSettings = { ...gameSettings, ...JSON.parse(s) };
    const st = localStorage.getItem('hexSavas_stats');
    if (st) globalStats = { ...globalStats, ...JSON.parse(st) };
  } catch (e) {}
  applySettingsToUI();
  updateMenuStats();
}

function saveData() {
  try {
    localStorage.setItem('hexSavas_settings', JSON.stringify(gameSettings));
    localStorage.setItem('hexSavas_stats', JSON.stringify(globalStats));
    if (typeof leaderboardManager !== 'undefined') leaderboardManager.syncDataToServer();
  } catch (e) {}
}

function saveSetting(key, val) {
  if (val === 'true') val = true;
  if (val === 'false') val = false;
  if (!isNaN(val) && typeof val === 'string' && val !== '') val = parseFloat(val);
  gameSettings[key] = val;
  saveData();
}

function applySettingsToUI() {
  const sp = document.getElementById('set-speed');
  const p = document.getElementById('set-particles');
  const dm = document.getElementById('set-dmgnums');
  const sh = document.getElementById('set-shake');
  const sfx = document.getElementById('set-sfx');
  const music = document.getElementById('set-music');
  if (sp) sp.value = gameSettings.combatSpeed;
  if (p) p.checked = gameSettings.particles;
  if (dm) dm.checked = gameSettings.dmgNumbers;
  if (sh) sh.checked = gameSettings.screenShake;
  if (sfx) {
     sfx.value = gameSettings.sfxVolume !== undefined ? gameSettings.sfxVolume : 0.5;
     if(typeof AudioManager!=='undefined')AudioManager.setSfxVolume(sfx.value);
  }
  if (music) {
     music.value = gameSettings.musicVolume !== undefined ? gameSettings.musicVolume : 0.3;
     if(typeof AudioManager!=='undefined')AudioManager.setMusicVolume(music.value);
  }
}

function updateMenuStats() {
  const br = document.getElementById('stat-best-round');
  const tw = document.getElementById('stat-total-wins');
  const tk = document.getElementById('stat-total-kills');
  if (br) br.textContent = globalStats.bestRound;
  if (tw) tw.textContent = globalStats.totalWins;
  if (tk) tk.textContent = globalStats.totalKills;
}

function resetStats() {
  if (!confirm('Tüm istatistikler sıfırlanacak. Emin misin?')) return;
  globalStats = { bestRound: 0, totalWins: 0, totalKills: 0 };
  saveData();
  updateMenuStats();
  // achievementManager stats sıfırla
  if(typeof achievementManager !== 'undefined' && achievementManager.stats) {
    achievementManager.stats.bestRound = 0;
    achievementManager.stats.totalWins = 0;
    achievementManager.stats.totalKills = 0;
    achievementManager.save();
  }
}

// --- Screen Navigation ---
function navigateTo(screenId) {
  const screens = document.querySelectorAll('.screen');
  const current = document.querySelector('.screen.active');

  if (current) {
    current.classList.add('fade-out');
    current.classList.remove('active');
    setTimeout(() => { current.classList.remove('fade-out'); current.style.display = 'none'; }, 300);
  }

  setTimeout(() => {
    const next = document.getElementById('screen-' + screenId);
    if (!next) return;
    next.style.display = 'flex';
    next.classList.add('active', 'fade-in');
    setTimeout(() => next.classList.remove('fade-in'), 400);
    currentScreen = screenId;

    if (screenId === 'game') {
      if (typeof initGame === 'function') {
          const runInit = () => requestAnimationFrame(() => requestAnimationFrame(initGame));
          if (document.fonts) {
              document.fonts.ready.then(runInit);
          } else {
              runInit();
          }
      }
    }
    if (screenId === 'menu') {
      updateMenuStats();
    }
    if (screenId === 'settings') {
      applySettingsToUI();
      if(typeof updateSettingsAccountUI === 'function') updateSettingsAccountUI();
    }
    if (screenId === 'achievements') {
      if(typeof achievementManager !== 'undefined') achievementManager.renderToDOM('achievements-list');
    }
    if (screenId === 'skins') {
      if(typeof skinManager !== 'undefined') skinManager.renderToDOM('skins-list');
    }
    if (screenId === 'meta') {
      if(typeof metaManager !== 'undefined') metaManager.renderToDOM('meta-list');
    }
    if (screenId === 'leaderboard') {
      if(typeof leaderboardManager !== 'undefined') {
        // Otomatik çerez doğrulama
        if (leaderboardManager.username) {
          leaderboardManager.verifyUsername().then(() => {
            leaderboardManager.renderToDOM('leaderboard-list');
          });
        } else {
          leaderboardManager.renderToDOM('leaderboard-list');
        }
      }
    }
    if (screenId === 'store') {
      if(typeof storeManager !== 'undefined') {
        storeManager.updateGemUI();
        storeManager.renderToDOM('store-list');
      }
    }
    if (screenId === 'quests') {
      if(typeof questManager !== 'undefined') questManager.renderToDOM('quests-list');
    }
    if (screenId === 'settings') {
      // Artık istatistik bölümü kaldırıldı, sadece ayarları yükle
    }
  }, current ? 300 : 0);
}

function goToMenuFromGameOver() {
  document.getElementById('gameover').classList.remove('show');
  navigateTo('menu');
}

// --- BG Particles (for menu/settings screens) ---
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');
let bgParticles = [];

function initBgParticles() {
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
  bgParticles = [];
  for (let i = 0; i < 60; i++) {
    bgParticles.push({
      x: Math.random() * bgCanvas.width,
      y: Math.random() * bgCanvas.height,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.25 + 0.05
    });
  }
}

function bgLoop() {
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

  let isBoss = false;
  if (typeof isBossRound !== 'undefined' && typeof phase !== 'undefined') {
    isBoss = (isBossRound && phase === 'combat');
  }
  
  const baseColor = isBoss ? '255,50,50' : '0,200,255';
  const speedMult = isBoss ? 3 : 1;

  // subtle grid pattern
  bgCtx.strokeStyle = `rgba(${baseColor},0.015)`;
  bgCtx.lineWidth = 1;
  for (let x = 0; x < bgCanvas.width; x += 60) {
    bgCtx.beginPath(); bgCtx.moveTo(x, 0); bgCtx.lineTo(x, bgCanvas.height); bgCtx.stroke();
  }
  for (let y = 0; y < bgCanvas.height; y += 60) {
    bgCtx.beginPath(); bgCtx.moveTo(0, y); bgCtx.lineTo(bgCanvas.width, y); bgCtx.stroke();
  }

  // particles
  if (gameSettings.particles !== false) {
    for (const p of bgParticles) {
      p.x += p.dx * speedMult; p.y += p.dy * speedMult;
      if (p.x < 0) p.x = bgCanvas.width;
      if (p.x > bgCanvas.width) p.x = 0;
      if (p.y < 0) p.y = bgCanvas.height;
      if (p.y > bgCanvas.height) p.y = 0;
      bgCtx.beginPath();
      bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      bgCtx.fillStyle = `rgba(${baseColor},${p.alpha})`;
      bgCtx.fill();
    }
  }

  // draw connecting lines between close particles
  if (gameSettings.particles !== false) {
    bgCtx.strokeStyle = `rgba(${baseColor},0.03)`;
    bgCtx.lineWidth = 0.5;
    for (let i = 0; i < bgParticles.length; i++) {
      for (let j = i + 1; j < bgParticles.length; j++) {
        const d = Math.hypot(bgParticles[i].x - bgParticles[j].x, bgParticles[i].y - bgParticles[j].y);
        if (d < 120) {
          bgCtx.beginPath();
          bgCtx.moveTo(bgParticles[i].x, bgParticles[i].y);
          bgCtx.lineTo(bgParticles[j].x, bgParticles[j].y);
          bgCtx.stroke();
        }
      }
    }
  }

  requestAnimationFrame(bgLoop);
}

window.addEventListener('resize', () => {
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
});

// --- Account Actions ---
async function updateSettingsAccountUI() {
  const desc = document.getElementById('account-desc');
  const btn = document.getElementById('account-action-btn');
  if(!desc || !btn) return;
  
  if (typeof leaderboardManager !== 'undefined') {
    if (leaderboardManager.username) {
      const verified = await leaderboardManager.verifyUsername();
      if (verified) {
        desc.innerHTML = `Mevcut Hesap: <b style="color:#0f8">${leaderboardManager.username}</b>`;
        btn.textContent = 'ÇIKIŞ YAP';
        btn.style.background = '#e74c3c';
        btn.style.boxShadow = '0 4px 10px rgba(231,76,60,0.3)';
        return;
      }
    }
  }
  desc.textContent = 'Sıralamaya girmek için kayıt ol!';
  btn.textContent = 'GİRİŞ YAP / KAYIT OL';
  btn.style.background = '#00ccff';
  btn.style.boxShadow = '0 4px 10px rgba(0,204,255,0.3)';
}

async function handleAccountAction() {
  if (typeof leaderboardManager === 'undefined') return;
  
  if (leaderboardManager.username) {
    if(confirm('Çıkış yapmak istediğine emin misin? (Skorların güvende kalır)')) {
      leaderboardManager.logout();
    }
  } else {
    const success = await leaderboardManager.showUsernameModal();
    if (success) updateSettingsAccountUI();
  }
}

// --- INIT ---
loadData();
initBgParticles();
bgLoop();
if(typeof storeManager !== 'undefined') storeManager.updateGemUI();

