const QUEST_TYPES = {
  KILL_ENEMIES: 'KILL_ENEMIES',
  MERGE_UNITS: 'MERGE_UNITS',
  BUY_UNITS: 'BUY_UNITS',
  CAST_METEOR: 'CAST_METEOR',
  REACH_ROUND: 'REACH_ROUND',
  CREATE_3_STAR: 'CREATE_3_STAR'
};

const QUEST_POOL = [
  { id: 'q_kill_50', type: QUEST_TYPES.KILL_ENEMIES, target: 50, reward: 25, title: 'Çaylak Katil', icon: '⚔️', desc: '50 düşman öldür' },
  { id: 'q_kill_100', type: QUEST_TYPES.KILL_ENEMIES, target: 100, reward: 50, title: 'Usta Katil', icon: '💀', desc: '100 düşman öldür' },
  { id: 'q_merge_10', type: QUEST_TYPES.MERGE_UNITS, target: 10, reward: 15, title: 'Birleştirici', icon: '🛡️', desc: 'Toplam 10 ünite birleştir' },
  { id: 'q_buy_20', type: QUEST_TYPES.BUY_UNITS, target: 20, reward: 15, title: 'Alışveriş Koliği', icon: '🛒', desc: 'Dükkandan 20 ünite satın al' },
  { id: 'q_meteor_3', type: QUEST_TYPES.CAST_METEOR, target: 3, reward: 20, title: 'Felaket Getiren', icon: '☄️', desc: 'Meteor yeteneğini 3 kez kullan' },
  { id: 'q_round_20', type: QUEST_TYPES.REACH_ROUND, target: 20, reward: 40, title: 'Hayatta Kalan', icon: '🏰', desc: '20. raunda ulaş' },
  { id: 'q_round_50', type: QUEST_TYPES.REACH_ROUND, target: 50, reward: 75, title: 'Efsanevi Direniş', icon: '👑', desc: '50. raunda ulaş' },
  { id: 'q_star_1', type: QUEST_TYPES.CREATE_3_STAR, target: 1, reward: 20, title: 'Altın Oran', icon: '⭐', desc: '1 adet 3-Yıldızlı (Altın) ünite oluştur' },
  { id: 'q_star_3', type: QUEST_TYPES.CREATE_3_STAR, target: 3, reward: 50, title: 'Altın Çağ', icon: '🌟', desc: '3 adet 3-Yıldızlı (Altın) ünite oluştur' }
];

class QuestManager {
  constructor() {
    this.progress = {};
    this.claimed = {};
    this.lastDate = '';
    this.activeQuests = [];
    this.loadData();
    this.checkDailyReset();
  }

  loadData() {
    const data = localStorage.getItem('hexSavas_quests');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        this.progress = parsed.progress || {};
        this.claimed = parsed.claimed || {};
        this.lastDate = parsed.lastDate || '';
        this.activeQuests = parsed.activeQuests || [];
      } catch(e) {
        console.error('Quest verisi okunamadı', e);
      }
    }
  }

  saveData() {
    localStorage.setItem('hexSavas_quests', JSON.stringify({
      progress: this.progress,
      claimed: this.claimed,
      lastDate: this.lastDate,
      activeQuests: this.activeQuests
    }));
  }

  getRandomQuests(count) {
    const shuffled = [...QUEST_POOL].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).map(q => q.id);
  }

  checkDailyReset() {
    const today = new Date().toLocaleDateString();
    if (this.lastDate !== today || this.activeQuests.length === 0) {
      this.progress = {};
      this.claimed = {};
      this.lastDate = today;
      this.activeQuests = this.getRandomQuests(3);
      this.saveData();
    }
  }

  addProgress(type, amount = 1) {
    this.checkDailyReset();
    let updated = false;
    
    // Yalnızca aktif olan günün görevlerinde ilerleme yap
    const currentActiveQuests = QUEST_POOL.filter(q => this.activeQuests.includes(q.id));
    
    currentActiveQuests.filter(q => q.type === type).forEach(q => {
      if (this.claimed[q.id]) return; // Zaten alındı
      const current = this.progress[q.id] || 0;
      if (current < q.target) {
        if(type === QUEST_TYPES.REACH_ROUND) {
          // Reach round is not additive, it's absolute
          if(amount > current) {
             this.progress[q.id] = Math.min(amount, q.target);
             updated = true;
          }
        } else {
          this.progress[q.id] = Math.min(current + amount, q.target);
          updated = true;
        }
        
        // Bildirim göster (opsiyonel)
        if (this.progress[q.id] === q.target && current < q.target) {
          this.showQuestCompleteNotification(q);
        }
      }
    });

    if (updated) {
      this.saveData();
      if(typeof currentScreen !== 'undefined' && currentScreen === 'quests') {
        this.renderToDOM('quests-list');
      }
    }
  }

  showQuestCompleteNotification(quest) {
    if (typeof showPhaseText === 'function') {
      showPhaseText(`GÖREV TAMAMLANDI: ${quest.title}`, '#ffeb3b');
    }
    // Ana menüdeki kırmızı nokta (badge) eklenebilir
    this.updateBadge();
  }

  claimReward(questId) {
    this.checkDailyReset();
    if (this.claimed[questId]) return;
    
    const quest = QUEST_POOL.find(q => q.id === questId);
    if (!quest) return;

    const current = this.progress[questId] || 0;
    if (current >= quest.target) {
      this.claimed[questId] = true;
      
      // Elmas ödülünü ver (Treasury API'si ile)
      if (typeof storeManager !== 'undefined') {
        storeManager.addGems(quest.reward);
        if(typeof showPhaseText === 'function') {
           showPhaseText(`+${quest.reward} ELMAS`, '#0cf');
        }
      }
      
      this.saveData();
      this.renderToDOM('quests-list');
      this.updateBadge();
    }
  }

  updateBadge() {
    let hasClaimable = false;
    const currentActiveQuests = QUEST_POOL.filter(q => this.activeQuests.includes(q.id));
    currentActiveQuests.forEach(q => {
      if (!this.claimed[q.id] && (this.progress[q.id] || 0) >= q.target) {
        hasClaimable = true;
      }
    });

    const badge = document.getElementById('menu-quests-badge');
    if (badge) {
      badge.style.display = hasClaimable ? 'inline-block' : 'none';
    }
  }

  renderToDOM(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    this.checkDailyReset();

    const currentActiveQuests = QUEST_POOL.filter(q => this.activeQuests.includes(q.id));

    // Yenileme sayacı
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const diff = tomorrow - now;
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);

    // Toplam ödül
    let totalReward = 0;
    let claimedReward = 0;
    currentActiveQuests.forEach(q => {
      totalReward += q.reward;
      if (this.claimed[q.id]) claimedReward += q.reward;
    });

    let html = `
      <div class="quest-header">
        <div class="quest-header-left">
          <div class="quest-header-title">📅 Bugünün Görevleri</div>
          <div class="quest-header-timer">⏰ Yenileme: <b>${hours}s ${mins}dk</b></div>
        </div>
        <div class="quest-header-right">
          <div class="quest-header-reward">${claimedReward}/${totalReward} 💎</div>
          <div class="quest-header-sub">Kazanılan</div>
        </div>
      </div>
    `;
    
    currentActiveQuests.forEach(q => {
      const current = this.progress[q.id] || 0;
      const pct = Math.min((current / q.target) * 100, 100);
      const isCompleted = current >= q.target;
      const isClaimed = this.claimed[q.id];

      let btnHtml = '';
      if (isClaimed) {
        btnHtml = `<button class="quest-btn claimed" disabled>ALINDI ✅</button>`;
      } else if (isCompleted) {
        btnHtml = `<button class="quest-btn claimable" onclick="questManager.claimReward('${q.id}')">AL (${q.reward}💎)</button>`;
      } else {
        btnHtml = `<button class="quest-btn" disabled>${current}/${q.target}</button>`;
      }

      html += `
        <div class="quest-card ${isClaimed ? 'claimed-card' : ''}">
          <div class="quest-icon">${q.icon}</div>
          <div class="quest-info">
            <div class="quest-title">${q.title} <span class="quest-reward-tag">${q.reward}💎</span></div>
            <div class="quest-desc">${q.desc}</div>
            <div class="quest-bar-bg">
              <div class="quest-bar-fill" style="width: ${pct}%"></div>
            </div>
          </div>
          <div class="quest-action">
            ${btnHtml}
          </div>
        </div>
      `;
    });

    el.innerHTML = html;
  }
}

const questManager = new QuestManager();
