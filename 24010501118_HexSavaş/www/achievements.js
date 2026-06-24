const ACHIEVEMENT_DEFS = [
  {id: 'first_win', title: 'İlk Zafer', desc: '1 savaş kazan', icon: '🥇',
   target: 1, getProgress: (d) => d.totalWins || 0},
  {id: 'killer_100', title: 'Savaş Makinesi', desc: '100 öldürmeye ulaş', icon: '⚔️',
   target: 100, getProgress: (d) => d.totalKills || 0},
  {id: 'survivor_10', title: 'Hayatta Kalan', desc: '10 raunda ulaş', icon: '🛡️',
   target: 10, getProgress: (d) => d.bestRound || 0},
  {id: 'rich_king', title: 'Zengin Kral', desc: 'Aynı anda 50 altına sahip ol', icon: '💰',
   target: 50, getProgress: (d) => d.maxGold || 0},
  {id: 'master', title: 'Üstat', desc: 'İlk Tier 3 üniteyi oluştur', icon: '⭐',
   target: 1, getProgress: (d) => d.tier3Created || 0},
  {id: 'dragon_slayer', title: 'Dragon Slayer', desc: 'İlk bossu yen', icon: '🐉',
   target: 1, getProgress: (d) => d.bossKills || 0},
  {id: 'streak_5', title: 'Seriler', desc: '5 seri zafer kazan', icon: '🔥',
   target: 5, getProgress: (d) => d.bestStreak || 0},
  {id: 'endless_20', title: 'Sonsuz Güç', desc: '20 raunda ulaş', icon: '💎',
   target: 20, getProgress: (d) => d.bestRound || 0},
  {id: 'legend_50', title: 'Efsane', desc: '50 raunda ulaş', icon: '👑',
   target: 50, getProgress: (d) => d.bestRound || 0},
  {id: 'god_100', title: 'Yarı Tanrı', desc: '100 raunda ulaş', icon: '⚡',
   target: 100, getProgress: (d) => d.bestRound || 0},
  {id: 'titan_150', title: 'Titan', desc: '150 raunda ulaş', icon: '🪐',
   target: 150, getProgress: (d) => d.bestRound || 0},
  {id: 'ascended_200', title: 'Ölümsüz', desc: '200 raunda ulaş', icon: '♾️',
   target: 200, getProgress: (d) => d.bestRound || 0},
  // === YENİ BAŞARIMLAR ===
  {id: 'collector_5', title: 'Koleksiyoncu', desc: 'Aynı anda 5 üniteye sahip ol', icon: '📦',
   target: 5, getProgress: (d) => d.maxUnits || 0},
  {id: 'gold_hoard_100', title: 'Altın İmparatoru', desc: 'Tek seferde 100 altına ulaş', icon: '🏦',
   target: 100, getProgress: (d) => d.maxGold || 0},
  {id: 'triple_merge', title: 'Üçlü Birleşim', desc: 'İlk birleşimi yap', icon: '🔱',
   target: 1, getProgress: (d) => d.mergesTotal || 0},
  {id: 'no_loss_10', title: 'Yenilmez', desc: '10 round kayıpsız geç', icon: '🏅',
   target: 10, getProgress: (d) => d.bestStreak || 0},
  {id: 'killer_500', title: 'Savaş Lordu', desc: '500 öldürmeye ulaş', icon: '💀',
   target: 500, getProgress: (d) => d.totalKills || 0},
  {id: 'full_board', title: 'Tam Kadro', desc: 'Tüm oyuncu hücrelerini doldur', icon: '🎯',
   target: 1, getProgress: (d) => d.fullBoard || 0},
  {id: 'boss_slayer_10', title: 'Ejderha Avcısı', desc: '10 Boss yen', icon: '🐲',
   target: 10, getProgress: (d) => d.bossKills || 0},
  {id: 'win_streak_20', title: 'Yenilmez Ordu', desc: '20 savaşlık galibiyet serisi yap', icon: '🏆',
   target: 20, getProgress: (d) => d.bestStreak || 0},
  {id: 'killer_1000', title: 'Kıyım', desc: '1000 düşman öldür', icon: '🩸',
   target: 1000, getProgress: (d) => d.totalKills || 0},
  {id: 'gold_hoard_200', title: 'Altın Dağı', desc: 'Tek seferde 200 altın biriktir', icon: '⛰️',
   target: 200, getProgress: (d) => d.maxGold || 0}
];

class AchievementManager {
  constructor() {
    this.unlocked = [];
    this.stats = {
      totalWins: 0, totalKills: 0, bestRound: 0, maxGold: 0,
      tier3Created: 0, bossKills: 0, bestStreak: 0,
      maxUnits: 0, mergesTotal: 0, fullBoard: 0
    };
    this.load();
  }

  load() {
    try {
      const data = localStorage.getItem('hexSavas_achievements');
      if (data) this.unlocked = JSON.parse(data);
      const stats = localStorage.getItem('hexSavas_achStats');
      if (stats) this.stats = { ...this.stats, ...JSON.parse(stats) };
    } catch(e) {}
    this.checkAll();
  }

  checkAll() {
    let updated = false;
    ACHIEVEMENT_DEFS.forEach(def => {
      if (!this.isUnlocked(def.id) && def.getProgress) {
        if (def.getProgress(this.stats) >= def.target) {
          this.unlocked.push(def.id);
          updated = true;
        }
      }
    });
    if (updated) this.save();
  }

  save() {
    try {
      localStorage.setItem('hexSavas_achievements', JSON.stringify(this.unlocked));
      localStorage.setItem('hexSavas_achStats', JSON.stringify(this.stats));
      if (typeof leaderboardManager !== 'undefined') leaderboardManager.syncDataToServer();
    } catch(e) {}
  }

  isUnlocked(id) {
    return this.unlocked.includes(id);
  }

  unlock(id) {
    if (this.isUnlocked(id)) return;
    this.unlocked.push(id);
    this.save();
    
    const def = ACHIEVEMENT_DEFS.find(a => a.id === id);
    if(def) this.showToast(def);
    
    // Mücevher ödülü (treasury.js)
    if(typeof storeManager !== 'undefined' && typeof ACHIEVEMENT_GEM_REWARDS !== 'undefined') {
      const gemReward = ACHIEVEMENT_GEM_REWARDS[id];
      if(gemReward && gemReward > 0) {
        setTimeout(() => {
          storeManager.addGems(gemReward, `Başarım: ${def ? def.title : id}`);
        }, 1000); // Toast'tan 1s sonra göster
      }
    }
  }

  check(event, data) {
    switch(event) {
      case 'win':
        this.stats.totalWins++;
        if(data.streak > this.stats.bestStreak) this.stats.bestStreak = data.streak;
        this.unlock('first_win');
        if(data.streak >= 5) this.unlock('streak_5');
        if(data.streak >= 10) this.unlock('no_loss_10');
        if(data.streak >= 20) this.unlock('win_streak_20');
        break;
      case 'kill':
        this.stats.totalKills = data.totalKills;
        if(data.totalKills >= 100) this.unlock('killer_100');
        if(data.totalKills >= 500) this.unlock('killer_500');
        if(data.totalKills >= 1000) this.unlock('killer_1000');
        break;
      case 'round':
        if(data.round > this.stats.bestRound) this.stats.bestRound = data.round;
        if(data.round >= 10) this.unlock('survivor_10');
        if(data.round >= 20) this.unlock('endless_20');
        if(data.round >= 50) this.unlock('legend_50');
        if(data.round >= 100) this.unlock('god_100');
        if(data.round >= 150) this.unlock('titan_150');
        if(data.round >= 200) this.unlock('ascended_200');
        break;
      case 'gold':
        if(data.gold > this.stats.maxGold) this.stats.maxGold = data.gold;
        if(data.gold >= 50) this.unlock('rich_king');
        if(data.gold >= 100) this.unlock('gold_hoard_100');
        if(data.gold >= 200) this.unlock('gold_hoard_200');
        break;
      case 'merge_tier3':
        this.stats.tier3Created++;
        this.stats.mergesTotal++;
        this.unlock('master');
        this.unlock('triple_merge');
        break;
      case 'merge':
        this.stats.mergesTotal++;
        this.unlock('triple_merge');
        break;
      case 'boss_kill':
        this.stats.bossKills++;
        this.unlock('dragon_slayer');
        if(this.stats.bossKills >= 10) this.unlock('boss_slayer_10');
        break;
      case 'units':
        if(data.count > this.stats.maxUnits) this.stats.maxUnits = data.count;
        if(data.count >= 5) this.unlock('collector_5');
        // Full board check (21 cells = 7 cols * 3 player rows)
        if(data.count >= 21) { this.stats.fullBoard = 1; this.unlock('full_board'); }
        break;
    }
    this.save();
  }

  showToast(def) {
    const container = document.getElementById('achievement-toast');
    if(!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.innerHTML = `<div class="toast-icon">${def.icon}</div>
                       <div class="toast-content">
                         <div class="toast-title">Başarım Açıldı!</div>
                         <div class="toast-desc">${def.title}</div>
                       </div>`;
    
    container.appendChild(toast);
    
    // Play sound if available
    if(typeof AudioManager !== 'undefined') AudioManager.play('merge');

    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 500);
    }, 3500);
  }

  renderToDOM(elementId) {
    const el = document.getElementById(elementId);
    if(!el) return;
    
    el.innerHTML = '';

    // Özet kartı
    const totalCount = ACHIEVEMENT_DEFS.length;
    const unlockedCount = ACHIEVEMENT_DEFS.filter(d => this.isUnlocked(d.id)).length;
    const pct = Math.round((unlockedCount / totalCount) * 100);
    let totalGemsEarned = 0;
    ACHIEVEMENT_DEFS.forEach(d => { if(this.isUnlocked(d.id) && typeof ACHIEVEMENT_GEM_REWARDS !== 'undefined') totalGemsEarned += (ACHIEVEMENT_GEM_REWARDS[d.id] || 0); });

    const summary = document.createElement('div');
    summary.className = 'ach-summary';
    summary.innerHTML = `
      <div class="ach-summary-left">
        <div class="ach-summary-big">${unlockedCount}<span class="ach-summary-slash">/${totalCount}</span></div>
        <div class="ach-summary-lbl">Başarım Açıldı</div>
      </div>
      <div class="ach-summary-bar-wrap">
        <div class="ach-summary-bar"><div class="ach-summary-fill" style="width:${pct}%"></div></div>
        <div class="ach-summary-pct">%${pct}</div>
      </div>
      <div class="ach-summary-right">
        <div class="ach-summary-gems">💎 ${totalGemsEarned}</div>
        <div class="ach-summary-lbl">Kazanılan</div>
      </div>
    `;
    el.appendChild(summary);

    const grid = document.createElement('div');
    grid.className = 'achievements-grid';

    ACHIEVEMENT_DEFS.forEach(def => {
      const unlocked = this.isUnlocked(def.id);
      const card = document.createElement('div');
      card.className = 'ach-card' + (unlocked ? ' unlocked' : '');
      
      let progress = 0;
      let progressPct = 0;
      let progressText = '';
      if(def.getProgress && def.target) {
        progress = Math.min(def.getProgress(this.stats), def.target);
        progressPct = Math.min(100, Math.round((progress / def.target) * 100));
        progressText = `${progress}/${def.target}`;
      }
      
      const barColor = unlocked ? '#0f8' : (progressPct > 50 ? '#fa0' : '#0cf');
      const gemReward = (typeof ACHIEVEMENT_GEM_REWARDS !== 'undefined') ? (ACHIEVEMENT_GEM_REWARDS[def.id] || 0) : 0;
      
      card.innerHTML = `<div class="ach-icon">${unlocked ? def.icon : '🔒'}</div>
                        <div class="ach-info">
                          <div class="ach-title">${def.title} ${gemReward ? `<span class="ach-gem-reward">${gemReward}💎</span>` : ''}</div>
                          <div class="ach-desc">${def.desc}</div>
                          <div class="ach-progress-wrap">
                            <div class="ach-progress-bar">
                              <div class="ach-progress-fill" style="width:${progressPct}%;background:${barColor}"></div>
                            </div>
                            <span class="ach-progress-text">${unlocked ? '✅ Tamamlandı' : progressText}</span>
                          </div>
                        </div>`;
      grid.appendChild(card);
    });
    el.appendChild(grid);
  }
}

window.achievementManager = new AchievementManager();
