// ===== KASA SİSTEMİ — Mücevher, Sandık & Envanter =====

const CHEST_TYPES = [
  {
    id: 'bronze', name: 'Bronz Sandık', emoji: '🟫', cost: 50,
    color: '#cd7f32', glowColor: 'rgba(205,127,50,0.4)',
    guaranteeMin: 'common',
    drops: { common: 0.60, rare: 0.30, epic: 0.08, legendary: 0.018, mythic: 0.002 }
  },
  {
    id: 'silver', name: 'Gümüş Sandık', emoji: '🥈', cost: 150,
    color: '#c0c0c0', glowColor: 'rgba(192,192,192,0.4)',
    guaranteeMin: 'rare',
    drops: { rare: 0.50, epic: 0.35, legendary: 0.12, mythic: 0.03 }
  },
  {
    id: 'gold', name: 'Altın Sandık', emoji: '🥇', cost: 400,
    color: '#ffd700', glowColor: 'rgba(255,215,0,0.5)',
    guaranteeMin: 'epic',
    drops: { epic: 0.50, legendary: 0.35, mythic: 0.15 }
  },
  {
    id: 'legendary', name: 'Efsanevi Sandık', emoji: '💜', cost: 1000,
    color: '#aa00ff', glowColor: 'rgba(170,0,255,0.5)',
    guaranteeMin: 'legendary',
    drops: { legendary: 0.60, mythic: 0.40 }
  }
];

// Nadir → sıra değeri (pity için)
const RARITY_ORDER = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 };
const RARITY_NAMES = { common: 'YAYGIN', rare: 'NADİR', epic: 'DESTANSI', legendary: 'EFSANEVİ', mythic: 'MİTİK' };
const RARITY_COLORS = { common: '#aaa', rare: '#0cf', epic: '#b388ff', legendary: '#ffd700', mythic: '#ff0055' };

// Tekrar düşen skin mücevher karşılıkları
const DUPLICATE_GEM_VALUES = { common: 5, rare: 10, epic: 25, legendary: 60, mythic: 150 };

// Başarım mücevher ödülleri (çok düşük)
const ACHIEVEMENT_GEM_REWARDS = {
  'first_win': 5, 'killer_100': 8, 'survivor_10': 5, 'rich_king': 10,
  'master': 8, 'dragon_slayer': 10, 'streak_5': 5, 'endless_20': 8,
  'legend_50': 15, 'god_100': 25, 'titan_150': 35, 'ascended_200': 50,
  'collector_5': 5, 'gold_hoard_100': 10, 'triple_merge': 3, 'no_loss_10': 10,
  'killer_500': 15, 'full_board': 5, 'boss_slayer_10': 20, 'win_streak_20': 20,
  'killer_1000': 25, 'gold_hoard_200': 15
};

class StoreManager {
  constructor() {
    this.gems = 0;
    this.inventory = [];       // açılmış skin id'leri: [{unitName, skinId, rarity, date}]
    this.chestHistory = [];    // son 50 sandık açma kaydı
    this.gemHistory = [];      // son 100 mücevher işlemi
    this.pityCounter = 0;      // legendary+ garanti sayacı
    this.totalChestsOpened = 0;
    this.currentTab = 'chests';
    this.load();
  }

  load() {
    try {
      let data = localStorage.getItem('hexSavas_store');
      // Eski key'den migration (treasury → store)
      if (!data) {
        data = localStorage.getItem('hexSavas_treasury');
        if (data) localStorage.removeItem('hexSavas_treasury');
      }
      if (data) {
        const parsed = JSON.parse(data);
        this.gems = parsed.gems || 0;
        this.inventory = parsed.inventory || [];
        this.chestHistory = parsed.chestHistory || [];
        this.gemHistory = parsed.gemHistory || [];
        this.pityCounter = parsed.pityCounter || 0;
        this.totalChestsOpened = parsed.totalChestsOpened || 0;
      }
    } catch (e) { console.warn('Store load error:', e); }
  }

  save() {
    try {
      localStorage.setItem('hexSavas_store', JSON.stringify({
        gems: this.gems,
        inventory: this.inventory,
        chestHistory: this.chestHistory.slice(-50),
        gemHistory: this.gemHistory.slice(-100),
        pityCounter: this.pityCounter,
        totalChestsOpened: this.totalChestsOpened
      }));
      if (typeof leaderboardManager !== 'undefined') leaderboardManager.syncDataToServer();
    } catch (e) { console.warn('Treasury save error:', e); }
  }

  // === MÜCEVHER YÖNETİMİ ===
  addGems(amount, reason) {
    if (amount <= 0) return;
    this.gems += amount;
    this.gemHistory.unshift({
      type: 'earn', amount, reason,
      date: new Date().toISOString(),
      balance: this.gems
    });
    this.save();
    this.updateGemUI();
    this.showGemToast(amount, reason);
  }

  spendGems(amount) {
    if (this.gems < amount) return false;
    this.gems -= amount;
    this.gemHistory.unshift({
      type: 'spend', amount, reason: 'Sandık açma',
      date: new Date().toISOString(),
      balance: this.gems
    });
    this.save();
    this.updateGemUI();
    return true;
  }

  // === SANDIK AÇMA ===
  canOpenChest(chestType) {
    const chest = CHEST_TYPES.find(c => c.id === chestType);
    return chest && this.gems >= chest.cost;
  }

  openChest(chestType) {
    const chest = CHEST_TYPES.find(c => c.id === chestType);
    if (!chest || !this.spendGems(chest.cost)) return null;

    this.totalChestsOpened++;
    this.pityCounter++;

    // Pity: 30 sandıkta 1 garanti legendary+
    let forcedRarity = null;
    if (this.pityCounter >= 30) {
      forcedRarity = 'legendary';
      this.pityCounter = 0;
    }

    // Nadir seç
    const rarity = forcedRarity || this._rollRarity(chest.drops);

    // Pity reset on legendary+
    if (RARITY_ORDER[rarity] >= RARITY_ORDER['legendary']) {
      this.pityCounter = 0;
    }

    // Uygun skin seç (sandık tipine göre öncelikli)
    const result = this._pickSkin(rarity, chest.id);

    // Tekrar kontrolü
    const isDuplicate = this.inventory.some(
      i => i.unitName === result.unitName && i.skinId === result.skinId
    );

    let gemRefund = 0;
    if (isDuplicate) {
      gemRefund = DUPLICATE_GEM_VALUES[rarity] || 5;
      this.gems += gemRefund;
    } else {
      this.inventory.push({
        unitName: result.unitName,
        skinId: result.skinId,
        rarity: rarity,
        date: new Date().toISOString()
      });
    }

    const record = {
      chestType: chest.id,
      chestName: chest.name,
      skinName: result.skinName,
      skinEmoji: result.skinEmoji,
      unitName: result.unitName,
      rarity,
      isDuplicate,
      gemRefund,
      date: new Date().toISOString()
    };
    this.chestHistory.unshift(record);
    this.save();
    return record;
  }

  _rollRarity(drops) {
    const rand = Math.random();
    let cumulative = 0;
    for (const [rarity, chance] of Object.entries(drops)) {
      cumulative += chance;
      if (rand <= cumulative) return rarity;
    }
    return Object.keys(drops)[0];
  }

  _pickSkin(rarity, chestType) {
    if (typeof UNIT_SKINS === 'undefined') {
      return { unitName: 'Savaşçı', skinId: 'fire', skinName: 'Ateş Savaşçısı', skinEmoji: '☄️' };
    }

    // 1. Önce bu sandık tipine özel skinleri ara
    const chestExclusive = [];
    for (const unitName in UNIT_SKINS) {
      for (const skin of UNIT_SKINS[unitName]) {
        if (skin.chestOnly && skin.chestTier === chestType && skin.rarity === rarity && skin.id !== 'default') {
          chestExclusive.push({ unitName, skinId: skin.id, skinName: skin.name, skinEmoji: skin.emoji });
        }
      }
    }
    // %70 ihtimalle sandık özel skinlerden seç
    if (chestExclusive.length > 0 && Math.random() < 0.70) {
      return chestExclusive[Math.floor(Math.random() * chestExclusive.length)];
    }

    // 2. Tüm skinlerden (chest-exclusive dahil) uygun rarity olanları bul
    const allCandidates = [];
    for (const unitName in UNIT_SKINS) {
      for (const skin of UNIT_SKINS[unitName]) {
        if (skin.rarity === rarity && skin.id !== 'default') {
          allCandidates.push({ unitName, skinId: skin.id, skinName: skin.name, skinEmoji: skin.emoji });
        }
      }
    }
    if (allCandidates.length === 0) {
      return { unitName: 'Savaşçı', skinId: 'fire', skinName: 'Ateş Savaşçısı', skinEmoji: '☄️' };
    }
    return allCandidates[Math.floor(Math.random() * allCandidates.length)];
  }

  // Envanterde var mı kontrol
  hasInInventory(unitName, skinId) {
    return this.inventory.some(i => i.unitName === unitName && i.skinId === skinId);
  }

  // === UI GÜNCELLEMELER ===
  updateGemUI() {
    const el = document.getElementById('gem-val');
    if (el) el.textContent = this.gems.toLocaleString('tr-TR');
    const menuEl = document.getElementById('menu-gem-val');
    if (menuEl) menuEl.textContent = this.gems.toLocaleString('tr-TR');
  }

  showGemToast(amount, reason) {
    const container = document.getElementById('achievement-toast');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.innerHTML = `<div class="toast-icon">💎</div>
                       <div class="toast-content">
                         <div class="toast-title" style="color:#b388ff">+${amount} Mücevher</div>
                         <div class="toast-desc">${reason}</div>
                       </div>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('hide'); setTimeout(() => toast.remove(), 500); }, 2500);
  }

  // === SANDIK AÇMA ANİMASYONU ===
  async showChestAnimation(record) {
    return new Promise(resolve => {
      const overlay = document.getElementById('chest-open-overlay');
      if (!overlay) { resolve(); return; }

      const chest = CHEST_TYPES.find(c => c.id === record.chestType);
      const rarityColor = RARITY_COLORS[record.rarity] || '#fff';
      const rarityName = RARITY_NAMES[record.rarity] || 'YAYGIN';

      overlay.innerHTML = `
        <div class="chest-anim-container">
          <div class="chest-box" id="chest-anim-box" style="--chest-color:${chest.color}; --chest-glow:${chest.glowColor}">
            <div class="chest-emoji">${chest.emoji}</div>
            <div class="chest-shine"></div>
          </div>
          <div class="chest-reveal" id="chest-reveal" style="display:none">
            <div class="chest-reveal-glow" style="--rarity-color:${rarityColor}"></div>
            <div class="chest-reward-icon">${record.skinEmoji}</div>
            <div class="chest-reward-rarity" style="color:${rarityColor}">${rarityName}</div>
            <div class="chest-reward-name">${record.skinName}</div>
            <div class="chest-reward-unit">${record.unitName} Skini</div>
            ${record.isDuplicate ? `<div class="chest-duplicate">TEKRAR — +${record.gemRefund} 💎</div>` : '<div class="chest-new">✨ YENİ!</div>'}
            <button class="menu-btn primary chest-close-btn" id="chest-close-btn">TAMAM</button>
          </div>
        </div>
      `;
      overlay.style.display = 'flex';

      // Phase 1: Sandık titreme (1s)
      const box = document.getElementById('chest-anim-box');
      box.classList.add('chest-shake');

      // Phase 2: Patlama + reveal (1s sonra)
      setTimeout(() => {
        box.classList.remove('chest-shake');
        box.classList.add('chest-explode');

        // Phase 3: Ödül göster (0.6s sonra)
        setTimeout(() => {
          box.style.display = 'none';
          const reveal = document.getElementById('chest-reveal');
          reveal.style.display = 'flex';
          reveal.classList.add('chest-reveal-in');

          if (typeof AudioManager !== 'undefined') {
            if (RARITY_ORDER[record.rarity] >= RARITY_ORDER['legendary']) {
              AudioManager.play('merge');
            } else {
              AudioManager.play('buy');
            }
          }
        }, 600);
      }, 1000);

      // Kapatma
      overlay.onclick = (e) => {
        if (e.target.id === 'chest-close-btn' || e.target === overlay) {
          overlay.style.display = 'none';
          overlay.onclick = null;
          resolve();
        }
      };
    });
  }

  // === EKRAN RENDER ===
  renderToDOM(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.innerHTML = '';

    // Mücevher göstergesi — premium bar
    const gemBar = document.createElement('div');
    gemBar.className = 'store-gem-bar';
    const pityPct = Math.min(100, (this.pityCounter / 30) * 100);
    gemBar.innerHTML = `
      <div class="store-gem-left">
        <div class="store-gem-diamond">💎</div>
        <div class="store-gem-info">
          <span class="store-gem-count" id="treasury-gem-count">${this.gems.toLocaleString('tr-TR')}</span>
          <span class="store-gem-label">MÜCEVHERLERİN</span>
        </div>
      </div>
      <div class="store-pity">
        <div class="store-pity-header">
          <span class="store-pity-label">EFSANEVİ GARANTİ</span>
          <span class="store-pity-val">${this.pityCounter}/30</span>
        </div>
        <div class="store-pity-bar">
          <div class="store-pity-fill" style="width:${pityPct}%"></div>
        </div>
        ${pityPct >= 80 ? '<div style="font-size:8px;color:#ffd700;text-align:right;margin-top:2px">🔥 Yaklaşıyor!</div>' : ''}
      </div>
    `;
    el.appendChild(gemBar);

    // Tab sistemi
    const tabs = document.createElement('div');
    tabs.className = 'store-tabs';
    const tabDefs = [
      { id: 'chests', label: '🎁 Kasalar' },
      { id: 'gems', label: '💎 Elmas' },
      { id: 'vip', label: '👑 VIP' },
      { id: 'history', label: '📜 Geçmiş' }
    ];
    tabDefs.forEach(t => {
      const btn = document.createElement('button');
      btn.className = `store-tab ${this.currentTab === t.id ? 'active' : ''}`;
      btn.dataset.tab = t.id;
      btn.textContent = t.label;
      btn.onclick = () => this.switchTab(t.id);
      tabs.appendChild(btn);
    });
    el.appendChild(tabs);

    // Tab içeriği
    const content = document.createElement('div');
    content.className = 'store-tab-content';
    content.id = 'treasury-tab-content';
    el.appendChild(content);

    this._renderTab(content);
  }

  switchTab(tab) {
    this.currentTab = tab;
    const content = document.getElementById('treasury-tab-content');
    if (content) this._renderTab(content);

    document.querySelectorAll('.store-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
  }

  _renderTab(container) {
    container.innerHTML = '';
    switch (this.currentTab) {
      case 'chests': this._renderChests(container); break;
      case 'gems': this._renderGemsStore(container); break;
      case 'vip': this._renderVipStore(container); break;
      case 'history': this._renderHistory(container); break;
    }
  }

  // ——— GÜNLÜK ÜCRETSİZ KASA ———
  _canClaimFreeChest() {
    const last = localStorage.getItem('hexSavas_freeChest');
    if (!last) return true;
    const lastDate = new Date(last).toLocaleDateString();
    return lastDate !== new Date().toLocaleDateString();
  }

  _claimFreeChest() {
    if (!this._canClaimFreeChest()) return;
    localStorage.setItem('hexSavas_freeChest', new Date().toISOString());
    // Bronz kasa aç
    this.totalChestsOpened++;
    this.pityCounter++;
    const rarity = this._rollRarity(CHEST_TYPES[0].drops);
    if (RARITY_ORDER[rarity] >= RARITY_ORDER['legendary']) this.pityCounter = 0;
    const result = this._pickSkin(rarity, 'bronze');
    const isDuplicate = this.inventory.some(i => i.unitName === result.unitName && i.skinId === result.skinId);
    let gemRefund = 0;
    if (isDuplicate) { gemRefund = DUPLICATE_GEM_VALUES[rarity] || 5; this.gems += gemRefund; }
    else { this.inventory.push({ unitName: result.unitName, skinId: result.skinId, rarity, date: new Date().toISOString() }); }
    const record = { chestType: 'bronze', chestName: 'Günlük Ücretsiz', skinName: result.skinName, skinEmoji: result.skinEmoji, unitName: result.unitName, rarity, isDuplicate, gemRefund, date: new Date().toISOString() };
    this.chestHistory.unshift(record);
    this.save();
    this.showChestAnimation(record).then(() => this.renderToDOM('store-list'));
  }

  // ——— 10x TOPLU AÇMA ———
  async bulkOpenChest(chestId) {
    const chest = CHEST_TYPES.find(c => c.id === chestId);
    if (!chest) return;
    const totalCost = chest.cost * 10;
    if (this.gems < totalCost) return;

    const results = [];
    for (let i = 0; i < 10; i++) {
      const r = this.openChest(chestId);
      if (r) results.push(r);
      else break;
    }
    if (results.length === 0) return;

    // En iyi sonucu göster
    const best = results.reduce((a, b) => RARITY_ORDER[a.rarity] >= RARITY_ORDER[b.rarity] ? a : b);
    const newCount = results.filter(r => !r.isDuplicate).length;
    const dupGems = results.filter(r => r.isDuplicate).reduce((s, r) => s + r.gemRefund, 0);

    const overlay = document.getElementById('chest-open-overlay');
    if (!overlay) { this.renderToDOM('store-list'); return; }

    const rarityColor = RARITY_COLORS[best.rarity];
    overlay.innerHTML = `
      <div class="store-preview-panel" style="text-align:center">
        <button class="store-preview-close" id="bulk-close">&times;</button>
        <div class="store-preview-glow" style="background:radial-gradient(circle, ${chest.glowColor}, transparent 60%)"></div>
        <div style="font-size:48px;margin-bottom:8px;position:relative;z-index:1">🎁 ×10</div>
        <h3 class="store-preview-title" style="color:${chest.color};font-size:16px">${chest.name} — 10x Sonuç</h3>
        <div style="display:flex;justify-content:center;gap:16px;margin:16px 0;position:relative;z-index:1">
          <div style="text-align:center"><div style="font-size:24px;font-weight:900;color:#0f8">${newCount}</div><div style="font-size:8px;color:#667;font-family:Orbitron">YENİ SKİN</div></div>
          <div style="width:1px;background:rgba(255,255,255,0.1)"></div>
          <div style="text-align:center"><div style="font-size:24px;font-weight:900;color:#b388ff">${dupGems}</div><div style="font-size:8px;color:#667;font-family:Orbitron">TEKRAR 💎</div></div>
        </div>
        <div style="font-size:10px;color:#889;margin-bottom:12px;position:relative;z-index:1">En İyi Drop:</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:10px;padding:12px;background:rgba(0,0,0,0.3);border-radius:10px;border:1px solid rgba(255,255,255,0.06);position:relative;z-index:1">
          <span style="font-size:36px">${best.skinEmoji}</span>
          <div style="text-align:left">
            <div style="color:${rarityColor};font-family:Orbitron;font-size:10px;font-weight:700">${RARITY_NAMES[best.rarity]}</div>
            <div style="color:#fff;font-size:13px;font-weight:700">${best.skinName}</div>
            <div style="color:#778;font-size:10px">${best.unitName}</div>
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin:14px 0;position:relative;z-index:1">
          ${results.map(r => `<span style="font-size:20px;padding:4px;background:rgba(0,0,0,0.3);border-radius:6px;border:1px solid ${RARITY_COLORS[r.rarity]}30" title="${r.skinName}">${r.skinEmoji}</span>`).join('')}
        </div>
        <button class="store-preview-buy" id="bulk-ok" style="margin-top:8px">TAMAM</button>
      </div>
    `;
    overlay.style.display = 'flex';
    if (typeof AudioManager !== 'undefined') AudioManager.play('merge');

    await new Promise(resolve => {
      const close = () => { overlay.style.display = 'none'; resolve(); };
      document.getElementById('bulk-close').onclick = close;
      document.getElementById('bulk-ok').onclick = close;
    });
    this.renderToDOM('store-list');
  }

  // ——— KASALAR ———
  _renderChests(container) {
    // Günlük Ücretsiz Kasa
    const canFree = this._canClaimFreeChest();
    const freeBox = document.createElement('div');
    freeBox.className = 'store-free-chest';
    freeBox.innerHTML = `
      <div class="sfc-left">
        <span class="sfc-emoji">${canFree ? '🎁' : '✅'}</span>
        <div class="sfc-info">
          <div class="sfc-title">${canFree ? 'Günlük Ücretsiz Kasa!' : 'Bugünkü Kasan Açıldı'}</div>
          <div class="sfc-sub">${canFree ? 'Her gün 1 Bronz Kasa hediye' : 'Yarın tekrar gel!'}</div>
        </div>
      </div>
      ${canFree ? '<button class="sfc-btn" onclick="storeManager._claimFreeChest()">ÜCRETSİZ AÇ</button>' : '<span class="sfc-done">✅</span>'}
    `;
    container.appendChild(freeBox);

    // Kasa Grid
    const CHEST_LABELS = { bronze: null, silver: null, gold: '⭐ Popüler', legendary: '🔥 En İyi' };
    const grid = document.createElement('div');
    grid.className = 'store-chest-grid';

    CHEST_TYPES.forEach(chest => {
      const canAfford = this.gems >= chest.cost;
      const canBulk = this.gems >= chest.cost * 10;
      const label = CHEST_LABELS[chest.id];
      const card = document.createElement('div');
      card.className = `store-chest-card chest-tier-${chest.id}`;

      const bestDrop = Object.entries(chest.drops).pop();
      const bestRarityName = RARITY_NAMES[bestDrop[0]];
      const bestRarityColor = RARITY_COLORS[bestDrop[0]];

      card.innerHTML = `
        ${label ? `<div class="store-chest-label">${label}</div>` : ''}
        <div class="store-chest-glow" style="background:radial-gradient(circle, ${chest.glowColor}, transparent 65%)"></div>
        <div class="store-chest-emoji">${chest.emoji}</div>
        <div class="store-chest-name">${chest.name}</div>
        <div class="store-chest-guarantee">
          Min <span style="color:${RARITY_COLORS[chest.guaranteeMin]}">${RARITY_NAMES[chest.guaranteeMin]}</span>
        </div>
        <div class="store-chest-best">
          <span style="color:${bestRarityColor}">${bestRarityName}</span> %${(bestDrop[1] * 100).toFixed(1)}
        </div>
        <div class="store-chest-price">${chest.cost} 💎</div>
        <div class="store-chest-actions">
          <button class="store-preview-btn" onclick="storeManager.previewChest('${chest.id}')">🔍</button>
          <button class="store-buy-btn ${canAfford ? '' : 'disabled'}" 
                  onclick="storeManager.buyAndOpenChest('${chest.id}')"
                  ${canAfford ? '' : 'disabled'}>
            ${canAfford ? '🔓 Aç' : '🔒'}
          </button>
        </div>
        ${chest.cost <= 400 ? `<button class="store-bulk-btn ${canBulk ? '' : 'disabled'}" onclick="storeManager.bulkOpenChest('${chest.id}')" ${canBulk ? '' : 'disabled'}>10x Aç • ${(chest.cost * 10).toLocaleString('tr-TR')}💎</button>` : ''}
      `;
      grid.appendChild(card);
    });
    container.appendChild(grid);

    // İstatistik bar
    const legendaryCount = this.inventory.filter(i => i.rarity === 'legendary' || i.rarity === 'mythic').length;
    const stats = document.createElement('div');
    stats.className = 'store-stats-bar';
    stats.innerHTML = `
      <div class="store-stat"><span class="store-stat-val">${this.totalChestsOpened}</span><span class="store-stat-lbl">AÇILAN</span></div>
      <div class="store-stat-divider"></div>
      <div class="store-stat"><span class="store-stat-val">${this.inventory.length}</span><span class="store-stat-lbl">KOLEKSİYON</span></div>
      <div class="store-stat-divider"></div>
      <div class="store-stat"><span class="store-stat-val" style="color:#ffd700">${legendaryCount}</span><span class="store-stat-lbl">EFSANEVİ+</span></div>
      <div class="store-stat-divider"></div>
      <div class="store-stat"><span class="store-stat-val" style="color:#fa0">${this.pityCounter}</span><span class="store-stat-lbl">GARANTİ</span></div>
    `;
    container.appendChild(stats);
  }

  // ——— MÜCEVHERLER ———
  _renderGemsStore(container) {
    const GEM_PACKS = [
      { id: 'tiny', name: 'Avuç Dolusu', emoji: '💰', gems: 100, price: '₺9.99', bonus: null, color: '#0f8', perGem: '0.10' },
      { id: 'small', name: 'Küçük Hazine', emoji: '💎', gems: 500, price: '₺29.99', bonus: null, color: '#0cf', perGem: '0.06' },
      { id: 'medium', name: 'Büyük Hazine', emoji: '👑', gems: 1200, price: '₺59.99', bonus: '+200', color: '#b388ff', perGem: '0.05' },
      { id: 'large', name: 'Kral Hazinesi', emoji: '🏆', gems: 3000, price: '₺119.99', bonus: '+750', color: '#ffd700', perGem: '0.04' },
    ];

    // Sınırlı süreli teklif
    const deal = document.createElement('div');
    deal.className = 'store-deal-banner';
    deal.innerHTML = `
      <div class="sdb-sparkle">✨</div>
      <div class="sdb-content">
        <div class="sdb-title">🔥 İLK ALIM BONUSU</div>
        <div class="sdb-desc">İlk mücevher alımında <b>2x bonus</b> kazan!</div>
      </div>
      <div class="sdb-sparkle">✨</div>
    `;
    container.appendChild(deal);

    const header = document.createElement('div');
    header.className = 'store-section-header';
    header.innerHTML = `<span class="store-section-icon">💎</span><span>Mücevher Paketleri</span>`;
    container.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'store-gem-grid';

    GEM_PACKS.forEach((pack, i) => {
      const card = document.createElement('div');
      card.className = `store-gem-card ${i === GEM_PACKS.length - 1 ? 'best-value' : ''}`;
      card.innerHTML = `
        ${pack.bonus ? `<div class="store-gem-bonus">${pack.bonus}</div>` : ''}
        <div class="store-gem-pack-emoji">${pack.emoji}</div>
        <div class="store-gem-pack-amount" style="color:${pack.color}">${pack.gems.toLocaleString('tr-TR')}</div>
        <div class="store-gem-pack-name">${pack.name}</div>
        <div class="store-gem-per">~₺${pack.perGem}/💎</div>
        <button class="store-gem-buy-btn" disabled>
          ${pack.price}
        </button>
      `;
      grid.appendChild(card);
    });
    container.appendChild(grid);

    const comingSoon = document.createElement('div');
    comingSoon.className = 'store-coming-soon';
    comingSoon.textContent = '🔒 Gerçek para ile satın alma yakında aktif olacak!';
    container.appendChild(comingSoon);

    // Ücretsiz mücevher kazanma ipuçları
    const tips = document.createElement('div');
    tips.className = 'store-gem-tips';
    tips.innerHTML = `
      <div class="store-section-header"><span class="store-section-icon">🎯</span><span>Ücretsiz Mücevher Kazan</span></div>
      <div class="sgt-list">
        <div class="sgt-item"><span class="sgt-icon">⚔️</span><span class="sgt-text">Savaş kazan</span><span class="sgt-val">+1~5 💎</span></div>
        <div class="sgt-item"><span class="sgt-icon">👹</span><span class="sgt-text">Boss yen</span><span class="sgt-val">+3 💎</span></div>
        <div class="sgt-item"><span class="sgt-icon">📅</span><span class="sgt-text">Günlük görev tamamla</span><span class="sgt-val">+15~75 💎</span></div>
        <div class="sgt-item"><span class="sgt-icon">🏆</span><span class="sgt-text">Başarım aç</span><span class="sgt-val">+3~50 💎</span></div>
      </div>
    `;
    container.appendChild(tips);
  }

  // ——— VIP ———
  _renderVipStore(container) {
    // VIP Pass Kartı
    const vipCard = document.createElement('div');
    vipCard.className = 'store-vip-card';
    vipCard.innerHTML = `
      <div class="store-vip-glow"></div>
      <div class="store-vip-badge">YAKINDA</div>
      <div class="store-vip-header">
        <span class="store-vip-crown">👑</span>
        <div>
          <div class="store-vip-title">HexSavaş VIP Pass</div>
          <div class="store-vip-subtitle">PREMIUM OYUNCU DENEYİMİ</div>
        </div>
      </div>
      <div class="store-vip-perks">
        <div class="store-vip-perk"><span class="svp-icon">💎</span><span>Her gün <b>100 Mücevher</b> hediye</span></div>
        <div class="store-vip-perk"><span class="svp-icon">🎁</span><span>Haftalık <b>Ücretsiz Altın Kasa</b></span></div>
        <div class="store-vip-perk"><span class="svp-icon">⚡</span><span><b>%20</b> daha hızlı savaş</span></div>
        <div class="store-vip-perk"><span class="svp-icon">🎨</span><span><b>VIP özel</b> savaşçı skinleri</span></div>
        <div class="store-vip-perk"><span class="svp-icon">🏆</span><span>Sıralamada <b>VIP rozeti</b></span></div>
        <div class="store-vip-perk"><span class="svp-icon">🔄</span><span>Günlük <b>bedava dükkan yenilemesi</b></span></div>
      </div>
      <div class="store-vip-price-row">
        <div class="store-vip-old-price">₺79.99/ay</div>
        <div class="store-vip-new-price">₺49.99<span>/ay</span></div>
      </div>
      <button class="store-vip-buy-btn" disabled>Yakında • Aylık Abonelik</button>
    `;
    container.appendChild(vipCard);

    // Başlangıç Paketi
    const starterCard = document.createElement('div');
    starterCard.className = 'store-starter-card';
    starterCard.innerHTML = `
      <div class="store-starter-badge">🔥 TEK SEFERLIK</div>
      <div class="store-starter-inner">
        <div class="store-starter-left">
          <div class="store-starter-title">🚀 Başlangıç Paketi</div>
          <div class="store-starter-desc">Oyuna hızlı giriş yap!</div>
          <div class="store-starter-items">
            <span>1000 💎 Mücevher</span>
            <span>1x Efsanevi Kasa 💜</span>
            <span>VIP 3 Günlük Deneme 👑</span>
            <span>500 Boss Ruhu 👻</span>
          </div>
        </div>
        <div class="store-starter-right">
          <div class="store-starter-old">₺89.99</div>
          <div class="store-starter-new">₺49.99</div>
          <div class="store-starter-save">%44 Tasarruf</div>
          <button class="store-gem-buy-btn" disabled style="margin-top:8px;">Yakında</button>
        </div>
      </div>
    `;
    container.appendChild(starterCard);

    // Sezon Paketi
    const seasonCard = document.createElement('div');
    seasonCard.className = 'store-starter-card';
    seasonCard.style.marginTop = '12px';
    seasonCard.innerHTML = `
      <div class="store-starter-badge" style="color:#ffd700;background:rgba(255,215,0,0.12)">⭐ SEZON PAKETİ</div>
      <div class="store-starter-inner">
        <div class="store-starter-left">
          <div class="store-starter-title">🌟 Sezon 1 Özel</div>
          <div class="store-starter-desc">Sınırlı süre — sadece bu sezon!</div>
          <div class="store-starter-items">
            <span>3000 💎 Mücevher</span>
            <span>3x Altın Kasa 🥇</span>
            <span>2x Efsanevi Kasa 💜</span>
            <span>Özel "Ateş Kralı" Skin 🔥</span>
          </div>
        </div>
        <div class="store-starter-right">
          <div class="store-starter-old">₺199.99</div>
          <div class="store-starter-new">₺129.99</div>
          <div class="store-starter-save">%35 Tasarruf</div>
          <button class="store-gem-buy-btn" disabled style="margin-top:8px;">Yakında</button>
        </div>
      </div>
    `;
    container.appendChild(seasonCard);
  }

  // ——— GEÇMİŞ ———
  _renderHistory(container) {
    if (this.gemHistory.length === 0 && this.chestHistory.length === 0) {
      container.innerHTML = `
        <div class="treasury-empty" style="padding-top:40px;">
          <div class="treasury-empty-icon">📜</div>
          <div class="treasury-empty-text">Henüz İşlem Yok</div>
          <div class="treasury-empty-sub">Savaşarak mücevher kazan ve sandık aç!</div>
        </div>
      `;
      return;
    }

    // Kasa Özeti
    if (this.chestHistory.length > 0) {
      const rarityStats = {};
      this.chestHistory.forEach(e => { rarityStats[e.rarity] = (rarityStats[e.rarity] || 0) + 1; });
      const summaryEl = document.createElement('div');
      summaryEl.className = 'store-history-summary';
      summaryEl.innerHTML = `
        <div class="shs-title">📊 Açma İstatistikleri</div>
        <div class="shs-bars">
          ${Object.entries(rarityStats).map(([r, c]) => `
            <div class="shs-row">
              <span class="shs-name" style="color:${RARITY_COLORS[r]}">${RARITY_NAMES[r]}</span>
              <div class="shs-bar"><div class="shs-fill" style="width:${Math.min(100, (c/this.chestHistory.length)*100)}%;background:${RARITY_COLORS[r]}"></div></div>
              <span class="shs-count">${c}</span>
            </div>
          `).join('')}
        </div>
      `;
      container.appendChild(summaryEl);
    }

    // Mücevher geçmişi
    if (this.gemHistory.length > 0) {
      const section = document.createElement('div');
      section.className = 'store-history-section';
      section.innerHTML = '<div class="store-section-header"><span class="store-section-icon">💎</span><span>Mücevher Geçmişi</span></div>';

      const list = document.createElement('div');
      list.className = 'store-history-list';

      this.gemHistory.slice(0, 20).forEach(entry => {
        const row = document.createElement('div');
        row.className = `store-history-row ${entry.type}`;
        const d = new Date(entry.date);
        const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        row.innerHTML = `
          <span class="shr-icon">${entry.type === 'earn' ? '⬆️' : '⬇️'}</span>
          <span class="shr-reason">${entry.reason}<small>${timeStr}</small></span>
          <span class="shr-amount ${entry.type}">${entry.type === 'earn' ? '+' : '-'}${entry.amount} 💎</span>
        `;
        list.appendChild(row);
      });
      section.appendChild(list);
      container.appendChild(section);
    }

    // Sandık geçmişi
    if (this.chestHistory.length > 0) {
      const section = document.createElement('div');
      section.className = 'store-history-section';
      section.innerHTML = '<div class="store-section-header"><span class="store-section-icon">🎁</span><span>Kasa Geçmişi</span></div>';

      const list = document.createElement('div');
      list.className = 'store-history-list';

      this.chestHistory.slice(0, 20).forEach(entry => {
        const row = document.createElement('div');
        row.className = 'store-history-row chest';
        row.innerHTML = `
          <span class="shr-icon">${entry.skinEmoji}</span>
          <span class="shr-reason">
            <b style="color:${RARITY_COLORS[entry.rarity]}">${entry.skinName}</b>
            <small>${entry.unitName} — ${entry.chestName}</small>
          </span>
          <span class="shr-badge ${entry.isDuplicate ? 'dup' : 'new'}">${entry.isDuplicate ? `+${entry.gemRefund}💎` : '✨ YENİ'}</span>
        `;
        list.appendChild(row);
      });
      section.appendChild(list);
      container.appendChild(section);
    }
  }

  // ——— ÖN İZLEME ———
  previewChest(chestId) {
    const chest = CHEST_TYPES.find(c => c.id === chestId);
    if (!chest) return;

    const overlay = document.getElementById('chest-open-overlay');
    if (!overlay) return;

    let dropRows = '';
    for (const [rarity, chance] of Object.entries(chest.drops)) {
      const pct = (chance * 100).toFixed(1);
      const barW = Math.max(3, chance * 100);
      dropRows += `
        <div class="preview-drop-row">
          <span class="preview-drop-name" style="color:${RARITY_COLORS[rarity]}">${RARITY_NAMES[rarity]}</span>
          <div class="preview-drop-bar-bg">
            <div class="preview-drop-bar-fill" style="width:${barW}%; background:${RARITY_COLORS[rarity]}"></div>
          </div>
          <span class="preview-drop-pct">%${pct}</span>
        </div>
      `;
    }

    const canAfford = this.gems >= chest.cost;

    overlay.innerHTML = `
      <div class="store-preview-panel">
        <button class="store-preview-close" onclick="document.getElementById('chest-open-overlay').style.display='none'">&times;</button>
        <div class="store-preview-glow" style="background:radial-gradient(circle, ${chest.glowColor}, transparent 60%)"></div>
        <div class="store-preview-emoji">${chest.emoji}</div>
        <h3 class="store-preview-title" style="color:${chest.color}">${chest.name}</h3>
        <p class="store-preview-guarantee">En az <b style="color:${RARITY_COLORS[chest.guaranteeMin]}">${RARITY_NAMES[chest.guaranteeMin]}</b> garantili</p>
        
        <div class="store-preview-drops">
          <h4 class="store-preview-drops-title">DÜŞME İHTİMALLERİ</h4>
          ${dropRows}
        </div>
        
        <div class="store-preview-footer">
          <button class="store-preview-buy ${canAfford ? '' : 'disabled'}" 
                  onclick="document.getElementById('chest-open-overlay').style.display='none'; storeManager.buyAndOpenChest('${chest.id}');"
                  ${canAfford ? '' : 'disabled'}>
            ${canAfford ? `<span class="spb-price">${chest.cost} 💎</span> SATIN AL VE AÇ` : '🔒 Yetersiz Mücevher'}
          </button>
        </div>
      </div>
    `;
    overlay.style.display = 'flex';
  }

  _findSkinDef(unitName, skinId) {
    if (typeof UNIT_SKINS === 'undefined') return null;
    const skins = UNIT_SKINS[unitName];
    if (!skins) return null;
    return skins.find(s => s.id === skinId) || null;
  }

  // === SATIN AL VE AÇ ===
  async buyAndOpenChest(chestType) {
    if (!this.canOpenChest(chestType)) return;

    const result = this.openChest(chestType);
    if (!result) return;

    // Animasyon göster
    await this.showChestAnimation(result);

    // Ekranı güncelle
    this.renderToDOM('store-list');
  }
}

window.storeManager = new StoreManager();
