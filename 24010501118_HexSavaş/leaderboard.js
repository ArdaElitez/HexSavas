// ===== ONLINE LEADERBOARD (SIRALAMA TABLOSU) =====

const leaderboardManager = {
  // Sunucu adresi — deploy edildiğinde burası güncellenir
  API_URL: 'https://hex-savas-leaderboard.onrender.com',  // Render sunucu adresi
  
  username: null,
  deviceId: null,
  currentSort: 'score',
  isLoading: false,

  init() {
    // DeviceId oluştur veya yükle
    this.deviceId = localStorage.getItem('hexSavas_deviceId');
    if (!this.deviceId) {
      this.deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('hexSavas_deviceId', this.deviceId);
    }
    this.username = localStorage.getItem('hexSavas_username');
  },

  getApiUrl(path) {
    return (this.API_URL || '') + path;
  },

  _applyGameData(data) {
    if (data.gameData && Object.keys(data.gameData).length > 0) {
      if (data.gameData.meta) localStorage.setItem('hexSavas_meta', JSON.stringify(data.gameData.meta));
      if (data.gameData.treasury) localStorage.setItem('hexSavas_treasury', JSON.stringify(data.gameData.treasury));
      if (data.gameData.achievements) {
        if (data.gameData.achievements.unlocked) localStorage.setItem('hexSavas_achievements', JSON.stringify(data.gameData.achievements.unlocked));
        if (data.gameData.achievements.stats) localStorage.setItem('hexSavas_achStats', JSON.stringify(data.gameData.achievements.stats));
      }
      if (data.gameData.skins) localStorage.setItem('hexSavas_skins', JSON.stringify(data.gameData.skins));
      if (data.gameData.settings) localStorage.setItem('hexSavas_settings', JSON.stringify(data.gameData.settings));
      if (data.gameData.stats) localStorage.setItem('hexSavas_stats', JSON.stringify(data.gameData.stats));
      
      if (typeof window.metaManager !== 'undefined') window.metaManager.load();
      if (typeof window.treasuryManager !== 'undefined') window.treasuryManager.load();
      if (typeof window.achievementManager !== 'undefined') window.achievementManager.load();
      if (typeof window.skinManager !== 'undefined') window.skinManager.load();
      
      if (typeof window.metaManager !== 'undefined') window.metaManager.updateUI();
      if (typeof window.treasuryManager !== 'undefined') window.treasuryManager.updateGemUI();
    }
  },

  async syncDataToServer() {
    if (!this.deviceId || !this.username) return false;
    try {
      const gameData = {
        meta: JSON.parse(localStorage.getItem('hexSavas_meta') || '{}'),
        treasury: JSON.parse(localStorage.getItem('hexSavas_treasury') || '{}'),
        achievements: {
          unlocked: JSON.parse(localStorage.getItem('hexSavas_achievements') || '{}'),
          stats: JSON.parse(localStorage.getItem('hexSavas_achStats') || '{}')
        },
        skins: JSON.parse(localStorage.getItem('hexSavas_skins') || '{}'),
        settings: JSON.parse(localStorage.getItem('hexSavas_settings') || '{}'),
        stats: JSON.parse(localStorage.getItem('hexSavas_stats') || '{}')
      };
      const resp = await fetch(this.getApiUrl('/api/sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: this.deviceId, gameData })
      });
      return resp.ok;
    } catch (e) {
      console.warn('Sync failed:', e);
      return false;
    }
  },

  // === API CALLS ===

  async register(username, password) {
    try {
      const resp = await fetch(this.getApiUrl('/api/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, deviceId: this.deviceId })
      });
      const data = await resp.json();
      if (resp.ok && data.ok) {
        this.username = data.username;
        localStorage.setItem('hexSavas_username', data.username);
        this._applyGameData(data);
        return { ok: true, username: data.username, existing: data.existing };
      }
      return { ok: false, error: data.error || 'Kayıt başarısız' };
    } catch (e) {
      return { ok: false, error: 'Sunucuya bağlanılamıyor' };
    }
  },

  async login(username, password) {
    try {
      const resp = await fetch(this.getApiUrl('/api/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, deviceId: this.deviceId })
      });
      const data = await resp.json();
      if (resp.ok && data.ok) {
        this.username = data.username;
        this.deviceId = data.deviceId;
        localStorage.setItem('hexSavas_username', data.username);
        localStorage.setItem('hexSavas_deviceId', data.deviceId);
        this._applyGameData(data);
        return { ok: true };
      }
      return { ok: false, error: data.error || 'Giriş başarısız' };
    } catch (e) {
      return { ok: false, error: 'Sunucuya bağlanılamıyor' };
    }
  },

  async checkUsername(username) {
    try {
      const resp = await fetch(this.getApiUrl('/api/check/' + encodeURIComponent(username)));
      const data = await resp.json();
      return data.available;
    } catch (e) {
      return null; // bağlantı hatası
    }
  },

  async submitScore(round, wins, kills) {
    if (!this.deviceId) return { ok: false, error: 'Cihaz ID yok' };
    try {
      const resp = await fetch(this.getApiUrl('/api/score'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: this.deviceId, round, wins, kills })
      });
      const data = await resp.json();
      return resp.ok ? { ok: true, score: data.score, rank: data.rank } : { ok: false, error: data.error };
    } catch (e) {
      return { ok: false, error: 'Sunucuya bağlanılamıyor' };
    }
  },

  async getLeaderboard(sort) {
    try {
      const resp = await fetch(this.getApiUrl('/api/leaderboard?sort=' + (sort || 'score') + '&limit=50'));
      const data = await resp.json();
      return data;
    } catch (e) {
      return { players: [], total: 0, error: 'Sunucuya bağlanılamıyor' };
    }
  },

  async getPlayer(username) {
    try {
      const resp = await fetch(this.getApiUrl('/api/player/' + encodeURIComponent(username)));
      if (!resp.ok) return null;
      return await resp.json();
    } catch (e) {
      return null;
    }
  },

  // === KULLANICI ADI MODAL ===
  modalTab: 'register',
  
  switchModalTab(tab) {
    this.modalTab = tab;
    const tabReg = document.getElementById('um-tab-register');
    const tabLog = document.getElementById('um-tab-login');
    if(tabReg) tabReg.classList.toggle('active', tab === 'register');
    if(tabLog) tabLog.classList.toggle('active', tab === 'login');
    
    const tEl = document.getElementById('um-title');
    if(tEl) tEl.textContent = tab === 'register' ? 'HESAP OLUŞTUR' : 'GİRİŞ YAP';
    const dEl = document.getElementById('um-desc');
    if(dEl) dEl.textContent = tab === 'register' ? 'Sıralamaya katılmak için bir isim ve şifre belirle.' : 'Kayıtlı hesabına geri dön.';
    const sEl = document.getElementById('username-submit');
    if(sEl) sEl.textContent = tab === 'register' ? 'KAYIT OL' : 'GİRİŞ YAP';
    
    const stEl = document.getElementById('username-status');
    if(stEl) stEl.textContent = '';
    const errEl = document.getElementById('username-error');
    if(errEl) errEl.textContent = '';
    
    const input = document.getElementById('username-input');
    const passInput = document.getElementById('password-input');
    const btn = document.getElementById('username-submit');
    if(input && btn && passInput) {
      if (tab === 'login') {
        btn.disabled = input.value.trim().length === 0 || passInput.value.trim().length === 0;
      } else {
        btn.disabled = true;
        if (input.value.trim().length > 1) input.dispatchEvent(new Event('input'));
      }
    }
  },

  showUsernameModal() {
    return new Promise((resolve) => {
      const overlay = document.getElementById('username-modal');
      if (!overlay) { resolve(false); return; }
      overlay.style.display = 'flex';

      this.switchModalTab('register');

      const input = document.getElementById('username-input');
      const passInput = document.getElementById('password-input');
      const btn = document.getElementById('username-submit');
      const status = document.getElementById('username-status');
      const errorEl = document.getElementById('username-error');

      input.value = '';
      if(passInput) passInput.value = '';
      errorEl.textContent = '';
      status.textContent = '';
      btn.disabled = true;

      let checkTimeout = null;

      const validateInput = () => {
        const val = input.value.trim();
        const pval = passInput ? passInput.value.trim() : '';
        errorEl.textContent = '';
        
        if (this.modalTab === 'login') {
          btn.disabled = val.length === 0 || pval.length === 0;
          return;
        }

        if (val.length < 2) {
          status.textContent = '';
          btn.disabled = true;
          return;
        }
        if (val.length > 20) {
          status.textContent = '❌ Çok uzun';
          status.style.color = '#f66';
          btn.disabled = true;
          return;
        }
        if (!/^[a-zA-Z0-9_çÇğĞıİöÖşŞüÜ]+$/.test(val)) {
          status.textContent = '❌ Geçersiz karakter';
          status.style.color = '#f66';
          btn.disabled = true;
          return;
        }
        
        status.textContent = '⏳ Kontrol ediliyor...';
        status.style.color = '#8cf';
        btn.disabled = true;

        clearTimeout(checkTimeout);
        checkTimeout = setTimeout(async () => {
          if (this.modalTab !== 'register') return;
          const available = await this.checkUsername(val);
          if (input.value.trim() !== val) return;
          if (available === null) {
            status.textContent = '⚠️ Sunucu bağlantısı yok';
            status.style.color = '#fa0';
            btn.disabled = true;
          } else if (available) {
            status.textContent = '✅ Kullanılabilir!';
            status.style.color = '#0f8';
            btn.disabled = pval.length < 4;
          } else {
            status.textContent = '❌ Bu isim alınmış';
            status.style.color = '#f66';
            btn.disabled = true;
          }
        }, 400);
      };

      input.oninput = validateInput;
      if(passInput) passInput.oninput = validateInput;

      btn.onclick = async () => {
        const val = input.value.trim();
        const pval = passInput ? passInput.value.trim() : '';
        if (!val || btn.disabled) return;
        
        btn.disabled = true;
        btn.textContent = '⏳ Lütfen bekleyin...';
        errorEl.textContent = '';

        if (this.modalTab === 'register') {
          if (pval.length < 4) {
            errorEl.textContent = 'Şifre en az 4 karakter olmalı';
            btn.textContent = 'KAYIT OL';
            btn.disabled = false;
            return;
          }
          const result = await this.register(val, pval);
          if (result.ok) {
            overlay.style.display = 'none';
            resolve(true);
          } else {
            errorEl.textContent = result.error;
            btn.textContent = 'KAYIT OL';
            btn.disabled = false;
          }
        } else {
          const result = await this.login(val, pval);
          if (result.ok) {
            overlay.style.display = 'none';
            resolve(true);
          } else {
            errorEl.textContent = result.error;
            btn.textContent = 'GİRİŞ YAP';
            btn.disabled = false;
          }
        }
      };

      input.onkeydown = (e) => { if (e.key === 'Enter' && !btn.disabled) btn.click(); };
      if(passInput) passInput.onkeydown = (e) => { if (e.key === 'Enter' && !btn.disabled) btn.click(); };
      
      const cancelBtn = document.getElementById('username-cancel');
      if(cancelBtn) {
        cancelBtn.onclick = () => {
          overlay.style.display = 'none';
          resolve(false);
        };
      }
    });
  },

  // Kullanıcı adı var mı diye sunucudan doğrula, yoksa çerezi sil
  async verifyUsername() {
    if (!this.username) return false;
    const player = await this.getPlayer(this.username);
    if (!player) {
      console.warn("Kullanıcı sunucuda bulunamadı, çerez siliniyor.");
      this.username = null;
      localStorage.removeItem('hexSavas_username');
      return false;
    }
    return true;
  },

  logout() {
    this.username = null;
    localStorage.removeItem('hexSavas_username');
    this.deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('hexSavas_deviceId', this.deviceId);
    if (typeof updateSettingsAccountUI === 'function') updateSettingsAccountUI();
  },

  // Sadece modal gösterimi için
  async ensureUsername() {
    if (this.username) {
      const verified = await this.verifyUsername();
      if (verified) return true;
    }
    
    // DeviceId ile daha önce kayıt olmuş mu kontrol et
    const result = await this.register('__check__');
    if (result.ok && result.existing) {
      return true;
    }
    
    // Modal göster
    return await this.showUsernameModal();
  },

  // === UI RENDERING ===

  getMedalEmoji(index) {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `<span class="lb-rank-num">${index + 1}</span>`;
  },

  getSortLabel(sort) {
    switch (sort) {
      case 'score': return 'SKOR';
      case 'round': return 'ROUND';
      case 'wins': return 'ZAFER';
      case 'kills': return 'ÖLDÜRME';
      default: return 'SKOR';
    }
  },

  getSortValue(player, sort) {
    switch (sort) {
      case 'score': return player.bestScore;
      case 'round': return player.bestRound;
      case 'wins': return player.totalWins;
      case 'kills': return player.totalKills;
      default: return player.bestScore;
    }
  },

  getSortIcon(sort) {
    switch (sort) {
      case 'score': return '⭐';
      case 'round': return '🏰';
      case 'wins': return '⚔️';
      case 'kills': return '💀';
      default: return '⭐';
    }
  },

  async renderToDOM(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (this.isLoading) return;
    this.isLoading = true;

    // Loading durumu
    container.innerHTML = `
      <div class="lb-loading">
        <div class="lb-loading-spinner"></div>
        <div class="lb-loading-text">Yükleniyor...</div>
      </div>
    `;

    const result = await this.getLeaderboard(this.currentSort);
    this.isLoading = false;

    if (result.error) {
      container.innerHTML = `
        <div class="lb-empty">
          <div class="lb-empty-icon">📡</div>
          <div class="lb-empty-text">Sunucuya bağlanılamıyor</div>
          <div class="lb-empty-sub">${result.error}</div>
          <button class="lb-retry-btn" onclick="leaderboardManager.renderToDOM('${containerId}')">🔄 Tekrar Dene</button>
        </div>
      `;
      return;
    }

    if (result.players.length === 0) {
      container.innerHTML = `
        <div class="lb-empty">
          <div class="lb-empty-icon">🏆</div>
          <div class="lb-empty-text">Henüz oyuncu yok</div>
          <div class="lb-empty-sub">İlk oyuncu sen ol! Oyunu oyna ve sıralamada yerini al.</div>
        </div>
      `;
      return;
    }

    let html = '';
    result.players.forEach((player, idx) => {
      const isTop3 = idx < 3;
      const medal = this.getMedalEmoji(idx);
      const rankClass = isTop3 ? `lb-row-top lb-rank-${idx + 1}` : '';
      const isMe = this.username && player.username.toLowerCase() === this.username.toLowerCase();
      const meClass = isMe ? 'lb-row-me' : '';
      const sortVal = this.getSortValue(player, this.currentSort);
      const sortIcon = this.getSortIcon(this.currentSort);

      html += `
        <div class="lb-row ${rankClass} ${meClass}" onclick="leaderboardManager.showPlayerProfile('${player.username}')">
          <div class="lb-rank">${medal}</div>
          <div class="lb-info">
            <div class="lb-username">${isMe ? '👤 ' : ''}${player.username}</div>
            <div class="lb-details">
              <span>⭐ ${player.bestScore.toLocaleString('tr-TR')}</span>
              <span>🏰 R${player.bestRound}</span>
              <span>⚔️ ${player.totalWins}W</span>
              <span>💀 ${player.totalKills}K</span>
            </div>
          </div>
          <div class="lb-sort-val">
            <div class="lb-sort-val-num">${sortVal.toLocaleString('tr-TR')}</div>
            <div class="lb-sort-val-lbl">${sortIcon} ${this.getSortLabel(this.currentSort)}</div>
          </div>
        </div>
      `;
    });

    // Toplam oyuncu sayısı
    html += `<div class="lb-total">Toplam ${result.total} oyuncu</div>`;

    container.innerHTML = html;

    // Header stat'larını güncelle
    const bestEl = document.getElementById('lb-best-score');
    const totalEl = document.getElementById('lb-total-games');
    const avgEl = document.getElementById('lb-avg-score');
    if (result.players.length > 0) {
      if (bestEl) bestEl.textContent = result.players[0].bestScore.toLocaleString('tr-TR');
      if (totalEl) totalEl.textContent = result.total;
      const avg = Math.round(result.players.reduce((s, p) => s + p.bestScore, 0) / result.players.length);
      if (avgEl) avgEl.textContent = avg.toLocaleString('tr-TR');
    }
  },

  switchSort(sort) {
    this.currentSort = sort;
    // Tab aktif durumunu güncelle
    document.querySelectorAll('.lb-sort-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sort === sort);
    });
    this.renderToDOM('leaderboard-list');
  },

  async showPlayerProfile(username) {
    const player = await this.getPlayer(username);
    if (!player) return;

    const overlay = document.getElementById('player-profile-modal');
    if (!overlay) return;

    const content = document.getElementById('player-profile-content');
    content.innerHTML = `
      <div class="pp-header">
        <div class="pp-avatar">${username.charAt(0).toUpperCase()}</div>
        <div class="pp-name">${player.username}</div>
        <div class="pp-rank">Sıra: #${player.rank}</div>
      </div>
      <div class="pp-stats">
        <div class="pp-stat">
          <div class="pp-stat-val">${player.bestScore.toLocaleString('tr-TR')}</div>
          <div class="pp-stat-lbl">EN İYİ SKOR</div>
        </div>
        <div class="pp-stat">
          <div class="pp-stat-val">${player.bestRound}</div>
          <div class="pp-stat-lbl">EN İYİ ROUND</div>
        </div>
        <div class="pp-stat">
          <div class="pp-stat-val">${player.totalWins}</div>
          <div class="pp-stat-lbl">ZAFER</div>
        </div>
        <div class="pp-stat">
          <div class="pp-stat-val">${player.totalKills}</div>
          <div class="pp-stat-lbl">ÖLDÜRME</div>
        </div>
      </div>
      <div class="pp-meta">
        <span>🎮 ${player.totalGames} oyun</span>
        <span>📅 ${new Date(player.registeredAt).toLocaleDateString('tr-TR')}</span>
      </div>
      ${player.recentScores.length > 0 ? `
        <div class="pp-recent-title">Son Oyunlar</div>
        <div class="pp-recent">
          ${player.recentScores.map(s => `
            <div class="pp-recent-row">
              <span>⭐ ${s.score}</span>
              <span>🏰 R${s.round}</span>
              <span>⚔️ ${s.wins}W</span>
              <span>💀 ${s.kills}K</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
    overlay.style.display = 'flex';
  }
};

// Başlangıçta init
leaderboardManager.init();
