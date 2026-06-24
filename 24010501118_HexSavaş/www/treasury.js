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

class TreasuryManager {
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
      const data = localStorage.getItem('hexSavas_treasury');
      if (data) {
        const parsed = JSON.parse(data);
        this.gems = parsed.gems || 0;
        this.inventory = parsed.inventory || [];
        this.chestHistory = parsed.chestHistory || [];
        this.gemHistory = parsed.gemHistory || [];
        this.pityCounter = parsed.pityCounter || 0;
        this.totalChestsOpened = parsed.totalChestsOpened || 0;
      }
    } catch (e) { console.warn('Treasury load error:', e); }
  }

  save() {
    try {
      localStorage.setItem('hexSavas_treasury', JSON.stringify({
        gems: this.gems,
        inventory: this.inventory,
        chestHistory: this.chestHistory.slice(-50),
        gemHistory: this.gemHistory.slice(-100),
        pityCounter: this.pityCounter,
        totalChestsOpened: this.totalChestsOpened
      }));
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

    // Mücevher göstergesi
    const gemBar = document.createElement('div');
    gemBar.className = 'treasury-gem-bar';
    gemBar.innerHTML = `
      <div class="treasury-gem-display">
        <span class="treasury-gem-icon">💎</span>
        <span class="treasury-gem-count" id="treasury-gem-count">${this.gems.toLocaleString('tr-TR')}</span>
        <span class="treasury-gem-label">Mücevher</span>
      </div>
      <div class="treasury-pity-info">
        <span class="pity-label">Garanti sayacı</span>
        <div class="pity-bar-wrap">
          <div class="pity-bar-fill" style="width:${Math.min(100, (this.pityCounter / 30) * 100)}%"></div>
        </div>
        <span class="pity-count">${this.pityCounter}/30</span>
      </div>
    `;
    el.appendChild(gemBar);

    // Tab sistemi
    const tabs = document.createElement('div');
    tabs.className = 'treasury-tabs';
    tabs.innerHTML = `
      <button class="treasury-tab ${this.currentTab === 'chests' ? 'active' : ''}" onclick="treasuryManager.switchTab('chests')">🎁 SANDIKLAR</button>
      <button class="treasury-tab ${this.currentTab === 'inventory' ? 'active' : ''}" onclick="treasuryManager.switchTab('inventory')">📦 ENVANTER</button>
      <button class="treasury-tab ${this.currentTab === 'history' ? 'active' : ''}" onclick="treasuryManager.switchTab('history')">📜 GEÇMİŞ</button>
    `;
    el.appendChild(tabs);

    // Tab içeriği
    const content = document.createElement('div');
    content.className = 'treasury-content';
    content.id = 'treasury-tab-content';
    el.appendChild(content);

    this._renderTab(content);
  }

  switchTab(tab) {
    this.currentTab = tab;
    const content = document.getElementById('treasury-tab-content');
    if (content) this._renderTab(content);

    // Tab butonlarını güncelle
    document.querySelectorAll('.treasury-tab').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.includes(
        tab === 'chests' ? 'SANDIKLAR' : tab === 'inventory' ? 'ENVANTER' : 'GEÇMİŞ'
      ));
    });
  }

  _renderTab(container) {
    switch (this.currentTab) {
      case 'chests': this._renderChests(container); break;
      case 'inventory': this._renderInventory(container); break;
      case 'history': this._renderHistory(container); break;
    }
  }

  _renderChests(container) {
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'chest-grid';

    CHEST_TYPES.forEach(chest => {
      const canAfford = this.gems >= chest.cost;
      const card = document.createElement('div');
      card.className = `chest-card ${canAfford ? '' : 'locked'} chest-tier-${chest.id}`;

      // Drop oranları açıklaması
      let dropInfo = '';
      for (const [rarity, chance] of Object.entries(chest.drops)) {
        const pct = (chance * 100).toFixed(1);
        dropInfo += `<span class="chest-drop-item" style="color:${RARITY_COLORS[rarity]}">${RARITY_NAMES[rarity]}: ${pct}%</span>`;
      }

      card.innerHTML = `
        <div class="chest-card-glow" style="background:radial-gradient(circle, ${chest.glowColor}, transparent 70%)"></div>
        <div class="chest-card-emoji">${chest.emoji}</div>
        <div class="chest-card-name">${chest.name}</div>
        <div class="chest-card-cost">${chest.cost} 💎</div>
        <div class="chest-card-drops">${dropInfo}</div>
        <button class="chest-buy-btn ${canAfford ? '' : 'disabled'}" 
                onclick="treasuryManager.buyAndOpenChest('${chest.id}')"
                ${canAfford ? '' : 'disabled'}>
          ${canAfford ? '🔓 AÇ' : '🔒 YETERSİZ'}
        </button>
      `;
      grid.appendChild(card);
    });

    container.appendChild(grid);

    // İstatistikler
    const stats = document.createElement('div');
    stats.className = 'chest-stats';
    stats.innerHTML = `
      <div class="chest-stat-item">📊 Toplam Açılan: <b>${this.totalChestsOpened}</b></div>
      <div class="chest-stat-item">📦 Koleksiyon: <b>${this.inventory.length}</b> skin</div>
    `;
    container.appendChild(stats);
  }

  _renderInventory(container) {
    container.innerHTML = '';

    if (this.inventory.length === 0) {
      container.innerHTML = `
        <div class="treasury-empty">
          <div class="treasury-empty-icon">📦</div>
          <div class="treasury-empty-text">Envanterin Boş</div>
          <div class="treasury-empty-sub">Sandık açarak skin koleksiyonunu büyüt!</div>
        </div>
      `;
      return;
    }

    // Ünite bazlı grupla
    const groups = {};
    this.inventory.forEach(item => {
      if (!groups[item.unitName]) groups[item.unitName] = [];
      groups[item.unitName].push(item);
    });

    for (const unitName in groups) {
      const group = document.createElement('div');
      group.className = 'inv-group';

      const title = document.createElement('h3');
      title.className = 'sg-title';
      title.textContent = `${unitName} Skinleri`;
      group.appendChild(title);

      const list = document.createElement('div');
      list.className = 'inv-list';

      groups[unitName].forEach(item => {
        const skinDef = this._findSkinDef(item.unitName, item.skinId);
        if (!skinDef) return;

        const isEquipped = typeof skinManager !== 'undefined' &&
          (skinManager.equipped[item.unitName] || 'default') === item.skinId;

        const card = document.createElement('div');
        card.className = `inv-card ${isEquipped ? 'equipped' : ''}`;

        card.innerHTML = `
          <div class="inv-rarity-tag rarity-${item.rarity}">${RARITY_NAMES[item.rarity]}</div>
          <div class="inv-icon" style="background:${skinDef.color}">
            ${skinDef.emoji}
            ${skinDef.aura ? '<div class="skin-aura-glow" style="box-shadow:0 0 15px ' + skinDef.color + ';"></div>' : ''}
          </div>
          <div class="inv-name">${skinDef.name}</div>
          ${isEquipped ? '<div class="inv-equipped-badge">✓ Kuşanıldı</div>' : ''}
        `;

        if (!isEquipped && typeof skinManager !== 'undefined') {
          card.onclick = () => {
            skinManager.equip(item.unitName, item.skinId);
            this._renderInventory(container);
          };
        }

        list.appendChild(card);
      });

      group.appendChild(list);
      container.appendChild(group);
    }
  }

  _renderHistory(container) {
    container.innerHTML = '';

    if (this.gemHistory.length === 0 && this.chestHistory.length === 0) {
      container.innerHTML = `
        <div class="treasury-empty">
          <div class="treasury-empty-icon">📜</div>
          <div class="treasury-empty-text">Henüz İşlem Yok</div>
          <div class="treasury-empty-sub">Savaşarak mücevher kazan ve sandık aç!</div>
        </div>
      `;
      return;
    }

    // Mücevher geçmişi
    if (this.gemHistory.length > 0) {
      const section = document.createElement('div');
      section.className = 'history-section';
      section.innerHTML = '<h3 class="sg-title">💎 Mücevher Geçmişi</h3>';

      const list = document.createElement('div');
      list.className = 'history-list';

      this.gemHistory.slice(0, 20).forEach(entry => {
        const row = document.createElement('div');
        row.className = `history-row ${entry.type === 'earn' ? 'earn' : 'spend'}`;
        const d = new Date(entry.date);
        const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        row.innerHTML = `
          <span class="history-icon">${entry.type === 'earn' ? '⬆️' : '⬇️'}</span>
          <span class="history-reason">${entry.reason}</span>
          <span class="history-amount ${entry.type}">${entry.type === 'earn' ? '+' : '-'}${entry.amount} 💎</span>
          <span class="history-time">${timeStr}</span>
        `;
        list.appendChild(row);
      });

      section.appendChild(list);
      container.appendChild(section);
    }

    // Sandık geçmişi
    if (this.chestHistory.length > 0) {
      const section = document.createElement('div');
      section.className = 'history-section';
      section.innerHTML = '<h3 class="sg-title">🎁 Sandık Geçmişi</h3>';

      const list = document.createElement('div');
      list.className = 'history-list';

      this.chestHistory.slice(0, 20).forEach(entry => {
        const row = document.createElement('div');
        row.className = 'history-row chest-history';
        row.innerHTML = `
          <span class="history-icon">${entry.skinEmoji}</span>
          <span class="history-reason">
            <b style="color:${RARITY_COLORS[entry.rarity]}">${entry.skinName}</b>
            <span class="history-sub">${entry.unitName} — ${entry.chestName}</span>
          </span>
          <span class="history-badge ${entry.isDuplicate ? 'duplicate' : 'new'}">${entry.isDuplicate ? `TEKRAR +${entry.gemRefund}💎` : '✨ YENİ'}</span>
        `;
        list.appendChild(row);
      });

      section.appendChild(list);
      container.appendChild(section);
    }
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
    this.renderToDOM('treasury-list');
  }
}

window.treasuryManager = new TreasuryManager();
