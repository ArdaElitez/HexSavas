const META_UPGRADES = [
  {
    id: 'starting_gold',
    name: 'Tüccar',
    desc: 'Oyuna ekstra altınla başlarsın.',
    icon: '💰',
    maxLevel: 20,
    costFn: (lvl) => 50 * (lvl + 1),
    effectFn: (lvl) => `+${lvl} Başlangıç Altını`,
    valFn: (lvl) => lvl
  },
  {
    id: 'crit_chance',
    name: 'Ölümcül Vuruş',
    desc: 'Tüm birliklerin kritik vurma şansı kazanır.',
    icon: '⚔️',
    maxLevel: 10,
    costFn: (lvl) => 200 * (lvl + 1),
    effectFn: (lvl) => `+%${lvl} Kritik Şansı`,
    valFn: (lvl) => lvl / 100
  },
  {
    id: 'max_hp',
    name: 'Demir Beden',
    desc: 'Tüm birliklerin maksimum canı artar.',
    icon: '🛡️',
    maxLevel: 20,
    costFn: (lvl) => 50 * (lvl + 1),
    effectFn: (lvl) => `+%${lvl * 2} Maksimum HP`,
    valFn: (lvl) => lvl * 0.02
  },
  {
    id: 'shop_luck',
    name: 'Şanslı Zarlar',
    desc: 'Dükkanda yüksek seviye karakter çıkma ihtimali artar.',
    icon: '🎲',
    maxLevel: 10,
    costFn: (lvl) => 300 * (lvl + 1),
    effectFn: (lvl) => `+%${lvl * 2} Şans`,
    valFn: (lvl) => lvl * 0.02
  },
  {
    id: 'boss_slayer',
    name: 'Boss Avcısı',
    desc: 'Bosslara karşı ekstra hasar verirsin.',
    icon: '👹',
    maxLevel: 10,
    costFn: (lvl) => 100 * (lvl + 1),
    effectFn: (lvl) => `+%${lvl * 3} Hasar`,
    valFn: (lvl) => lvl * 0.03
  },
  {
    id: 'free_reroll',
    name: 'Bedava Yenileme',
    desc: 'Her tur ilk dükkan yenilemesi (reroll) ücretsiz olur.',
    icon: '🔄',
    maxLevel: 1,
    costFn: (lvl) => 2000,
    effectFn: (lvl) => lvl > 0 ? `Aktif` : `Pasif`,
    valFn: (lvl) => lvl > 0
  }
];

class MetaManager {
  constructor() {
    this.souls = 0;
    this.upgrades = {};
    this.load();
  }

  load() {
    try {
      const data = localStorage.getItem('hexSavas_meta');
      if (data) {
        const parsed = JSON.parse(data);
        this.souls = parsed.souls || 0;
        this.upgrades = parsed.upgrades || {};
      }
    } catch (e) {
      console.warn('MetaManager load error:', e);
    }
    // Set defaults
    META_UPGRADES.forEach(u => {
      if (this.upgrades[u.id] === undefined) {
        this.upgrades[u.id] = 0;
      }
    });
  }

  save() {
    try {
      localStorage.setItem('hexSavas_meta', JSON.stringify({
        souls: this.souls,
        upgrades: this.upgrades
      }));
      if (typeof leaderboardManager !== 'undefined') leaderboardManager.syncDataToServer();
    } catch (e) {
      console.warn('MetaManager save error:', e);
    }
  }

  addSouls(amount) {
    if (amount <= 0) return;
    this.souls += amount;
    this.save();
    this.updateUI();
  }

  getEffect(id) {
    const lvl = this.upgrades[id] || 0;
    const upgrade = META_UPGRADES.find(u => u.id === id);
    if (!upgrade) return 0;
    return upgrade.valFn(lvl);
  }

  buyUpgrade(id) {
    const lvl = this.upgrades[id] || 0;
    const upgrade = META_UPGRADES.find(u => u.id === id);
    if (!upgrade || lvl >= upgrade.maxLevel) return false;

    const cost = upgrade.costFn(lvl);
    if (this.souls >= cost) {
      this.souls -= cost;
      this.upgrades[id] = lvl + 1;
      this.save();
      this.renderToDOM('meta-list');
      this.updateUI();
      
      if(typeof AudioManager !== 'undefined') AudioManager.play('merge'); // Use merge sound for upgrade
      return true;
    }
    return false;
  }

  updateUI() {
    const els = document.querySelectorAll('.soul-count-val');
    els.forEach(el => el.textContent = this.souls.toLocaleString('tr-TR'));
  }

  renderToDOM(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.innerHTML = '';
    
    META_UPGRADES.forEach(u => {
      const currentLvl = this.upgrades[u.id] || 0;
      const isMax = currentLvl >= u.maxLevel;
      const cost = isMax ? 'MAKS' : u.costFn(currentLvl);
      const canAfford = !isMax && this.souls >= cost;
      
      const card = document.createElement('div');
      card.className = `meta-card ${isMax ? 'maxed' : (canAfford ? 'affordable' : 'locked')}`;
      
      const lvlPct = isMax ? 100 : Math.round((currentLvl / u.maxLevel) * 100);
      const nextEffect = isMax ? '' : u.effectFn(currentLvl + 1);
      
      card.innerHTML = `
        <div class="meta-icon">${u.icon}</div>
        <div class="meta-info">
          <div class="meta-name">${u.name} <span class="meta-lvl">Lv. ${currentLvl}/${u.maxLevel}</span></div>
          <div class="meta-desc">${u.desc}</div>
          <div class="meta-effect">Şu anki: <b>${u.effectFn(currentLvl)}</b></div>
          ${!isMax ? `<div class="meta-next">Sonraki: <b>${nextEffect}</b></div>` : ''}
          <div class="meta-lvl-bar"><div class="meta-lvl-fill" style="width:${lvlPct}%"></div></div>
        </div>
        <button class="meta-buy-btn ${canAfford ? '' : 'disabled'}" onclick="metaManager.buyUpgrade('${u.id}')" ${!canAfford ? 'disabled' : ''}>
          ${isMax ? '✅ MAKS' : `${cost} 👻`}
        </button>
      `;
      
      el.appendChild(card);
    });
    
    this.updateUI();
  }
}

window.metaManager = new MetaManager();
