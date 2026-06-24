const UNIT_SKINS = {
  'Savaşçı': [
    {id:'default', name:'Savaşçı Çırağı', icon:'swords', emoji:'🤺', color:'#e74c3c', rarity:'common'}, // Fencer
    {id:'fire', name:'Ateş Savaşçısı', icon:'local_fire_department', emoji:'☄️', color:'#ff6b6b', reqLevel: 5, rarity:'rare'}, // Comet/Fireball
    {id:'samurai', name:'Ronin Samuray', icon:'sports_martial_arts', emoji:'👺', color:'#e91e63', reqLevel: 15, rarity:'rare'}, // Tengu Mask
    {id:'dragon_rider', name:'Ejderha Süvarisi', icon:'whatshot', emoji:'🐉', color:'#d32f2f', reqAchievement: 'boss_slayer_10', rarity:'epic'}, // Dragon
    {id:'demon', name:'Şeytan Kılıcı', icon:'skull', emoji:'🔱', color:'#b71c1c', reqAchievement: 'killer_500', rarity:'epic'}, // Trident
    {id:'light', name:'Işık Savaşçısı', icon:'light_mode', emoji:'🌟', color:'#ffd54f', reqAchievement: 'win_streak_20', aura:true, rarity:'legendary'}, // Glowing Star
    {id:'galaxy', name:'Galaksi Savaşçısı', icon:'public', emoji:'🌌', color:'#9c27b0', reqAchievement: 'titan_150', aura:true, rarity:'mythic'}, // Galaxy
    // === SANDIK ÖZEL SKİNLER ===
    {id:'ch_gladiator', name:'Gladyatör', emoji:'🗡️', color:'#8d6e63', rarity:'common', chestOnly:true, chestTier:'bronze'},
    {id:'ch_steel', name:'Çelik Yumruk', emoji:'🦿', color:'#78909c', rarity:'rare', chestOnly:true, chestTier:'silver'},
    {id:'ch_golden_knight', name:'Altın Şampiyon', emoji:'🏆', color:'#ffc107', rarity:'epic', chestOnly:true, chestTier:'gold'},
    {id:'ch_blood_king', name:'Kan Kralı', emoji:'👑', color:'#c62828', aura:true, rarity:'legendary', chestOnly:true, chestTier:'gold'},
    {id:'ch_celestial_w', name:'Cennet Savaşçısı', emoji:'👼', color:'#e1f5fe', aura:true, rarity:'legendary', chestOnly:true, chestTier:'legendary'},
    {id:'ch_void_slayer', name:'Boşluk Katili', emoji:'🕳️', color:'#1a0033', aura:true, rarity:'mythic', chestOnly:true, chestTier:'legendary'}
  ],
  'Okçu': [
    {id:'default', name:'Acemi Okçu', icon:'my_location', emoji:'🏹', color:'#2ecc71', rarity:'common'}, // Bow
    {id:'forest', name:'Orman Elfi', icon:'park', emoji:'🧝', color:'#00e676', reqLevel: 5, rarity:'rare'}, // Elf
    {id:'sniper', name:'Keskin Nişancı', icon:'center_focus_strong', emoji:'🦅', color:'#1b5e20', reqLevel: 20, rarity:'rare'}, // Eagle
    {id:'dark_elf', name:'Karanlık Elf', icon:'dark_mode', emoji:'🕸️', color:'#004d40', reqAchievement: 'first_win', rarity:'epic'}, // Spiderweb
    {id:'phoenix', name:'Anka Okçusu', icon:'flutter_dash', emoji:'🐦‍🔥', color:'#ff9100', reqAchievement: 'no_loss_10', aura:true, rarity:'legendary'}, // Phoenix (if supported) or Fire bird
    {id:'hunter_king', name:'Avcı Kral', icon:'military_tech', emoji:'🦁', color:'#ffea00', reqAchievement: 'boss_slayer_10', aura:true, rarity:'legendary'}, // Lion
    {id:'cosmic', name:'Kozmik Avcı', icon:'flare', emoji:'🌠', color:'#ff00ff', reqAchievement: 'god_100', aura:true, rarity:'mythic'},
    // === SANDIK ÖZEL SKİNLER ===
    {id:'ch_scout', name:'İzci', emoji:'🐾', color:'#795548', rarity:'common', chestOnly:true, chestTier:'bronze'},
    {id:'ch_moon_archer', name:'Ay Okçusu', emoji:'🌙', color:'#7e57c2', rarity:'rare', chestOnly:true, chestTier:'silver'},
    {id:'ch_wind_arrow', name:'Rüzgar Okçusu', emoji:'🌬️', color:'#80deea', rarity:'epic', chestOnly:true, chestTier:'gold'},
    {id:'ch_star_hunter', name:'Yıldız Avcısı', emoji:'💫', color:'#fff176', aura:true, rarity:'legendary', chestOnly:true, chestTier:'legendary'},
    {id:'ch_divine_bow', name:'Tanrı Okçusu', emoji:'🌈', color:'#ea80fc', aura:true, rarity:'mythic', chestOnly:true, chestTier:'legendary'}
  ],
  'Şövalye': [
    {id:'default', name:'Şehir Muhafızı', icon:'shield', emoji:'💂', color:'#3498db', rarity:'common'}, // Guard
    {id:'castle', name:'Kale Muhafızı', icon:'fort', emoji:'🧱', color:'#448aff', reqLevel: 10, rarity:'rare'}, // Brick wall
    {id:'ice', name:'Buz Şövalyesi', icon:'ac_unit', emoji:'❄️', color:'#00b0ff', reqAchievement: 'survivor_10', rarity:'epic'}, // Snowflake
    {id:'dark_knight', name:'Kara Şövalye', icon:'nights_stay', emoji:'♟️', color:'#1a237e', reqLevel: 25, rarity:'epic'}, // Black chess pawn
    {id:'void', name:'Boşluk Şövalyesi', icon:'cyclone', emoji:'🌌', color:'#311b92', reqAchievement: 'legend_50', aura:true, rarity:'legendary'}, // Milky way
    {id:'mecha', name:'Mecha Şövalye', icon:'smart_toy', emoji:'🦾', color:'#00e5ff', reqAchievement: 'gold_hoard_200', aura:true, rarity:'legendary'}, // Robot arm
    {id:'blackhole', name:'Kara Delik Şövalyesi', icon:'blur_on', emoji:'🕳️', color:'#000000', reqAchievement: 'ascended_200', aura:true, rarity:'mythic'},
    // === SANDIK ÖZEL SKİNLER ===
    {id:'ch_bronze_guard', name:'Bronz Muhafız', emoji:'🪖', color:'#a1887f', rarity:'common', chestOnly:true, chestTier:'bronze'},
    {id:'ch_crystal', name:'Kristal Şövalye', emoji:'💠', color:'#b2ebf2', rarity:'rare', chestOnly:true, chestTier:'silver'},
    {id:'ch_sun_knight', name:'Güneş Şövalyesi', emoji:'☀️', color:'#ffb300', rarity:'epic', chestOnly:true, chestTier:'gold'},
    {id:'ch_diamond', name:'Elmas Şövalye', emoji:'💎', color:'#e0f7fa', aura:true, rarity:'legendary', chestOnly:true, chestTier:'legendary'},
    {id:'ch_infinity', name:'Sonsuzluk Şövalyesi', emoji:'♾️', color:'#b2ff59', aura:true, rarity:'mythic', chestOnly:true, chestTier:'legendary'}
  ],
  'Büyücü': [
    {id:'default', name:'Büyücü Çırağı', icon:'auto_fix_high', emoji:'🧙‍♂️', color:'#9b59b6', rarity:'common'}, // Mage
    {id:'blood_mage', name:'Kan Büyücüsü', icon:'bloodtype', emoji:'🧛', color:'#d50000', reqLevel: 10, rarity:'rare'}, // Vampire
    {id:'moon', name:'Ay Büyücüsü', icon:'brightness_3', emoji:'🦉', color:'#e040fb', reqLevel: 20, rarity:'rare'}, // Owl
    {id:'necro', name:'Nekromansir', icon:'skull', emoji:'🧟', color:'#4a148c', reqAchievement: 'killer_100', rarity:'epic'}, // Zombie
    {id:'arcane', name:'Kadim Büyücü', icon:'menu_book', emoji:'📜', color:'#aa00ff', reqAchievement: 'gold_hoard_100', aura:true, rarity:'legendary'}, // Scroll
    {id:'time_lord', name:'Zaman Lordu', icon:'hourglass_empty', emoji:'🕰️', color:'#f50057', reqAchievement: 'win_streak_20', aura:true, rarity:'legendary'}, // Mantelpiece clock
    {id:'universal', name:'Evrensel Bilge', icon:'all_inclusive', emoji:'⚛️', color:'#00ffff', reqAchievement: 'titan_150', aura:true, rarity:'mythic'},
    // === SANDIK ÖZEL SKİNLER ===
    {id:'ch_apprentice', name:'Simyacı', emoji:'🧪', color:'#aed581', rarity:'common', chestOnly:true, chestTier:'bronze'},
    {id:'ch_ice_mage', name:'Buz Büyücüsü', emoji:'🧊', color:'#81d4fa', rarity:'rare', chestOnly:true, chestTier:'silver'},
    {id:'ch_storm_mage', name:'Fırtına Büyücüsü', emoji:'⛈️', color:'#5c6bc0', rarity:'rare', chestOnly:true, chestTier:'silver'},
    {id:'ch_fire_lord', name:'Ateş Lordu', emoji:'🌋', color:'#ff6e40', rarity:'epic', chestOnly:true, chestTier:'gold'},
    {id:'ch_dark_lord', name:'Karanlık Lord', emoji:'🌑', color:'#212121', aura:true, rarity:'legendary', chestOnly:true, chestTier:'legendary'},
    {id:'ch_cosmic_sage', name:'Kozmik Bilge', emoji:'🪬', color:'#7c4dff', aura:true, rarity:'mythic', chestOnly:true, chestTier:'legendary'}
  ],
  'Berserker': [
    {id:'default', name:'Kızgın Savaşçı', icon:'hardware', emoji:'🪓', color:'#e67e22', rarity:'common'}, // Axe
    {id:'hammer', name:'Çekiç Ustası', icon:'gavel', emoji:'⚒️', color:'#ff9100', reqLevel: 5, rarity:'rare'}, // Hammer and pick
    {id:'pirate', name:'Korsan Kaptan', icon:'anchor', emoji:'🏴‍☠️', color:'#ff6d00', reqLevel: 15, rarity:'rare'}, // Pirate flag
    {id:'volcano', name:'Volkan', icon:'volcano', emoji:'🌋', color:'#ff3d00', reqAchievement: 'streak_5', rarity:'epic'}, // Volcano
    {id:'inferno', name:'Cehennem Ateşi', icon:'whatshot', emoji:'🔥', color:'#dd2c00', reqAchievement: 'dragon_slayer', aura:true, rarity:'legendary'}, // Fire
    {id:'chaos', name:'Kaos Baltası', icon:'storm', emoji:'🌪️', color:'#ff0000', reqAchievement: 'killer_1000', aura:true, rarity:'legendary'}, // Tornado
    {id:'destroyer', name:'Yok Edici', icon:'explosion', emoji:'💥', color:'#ffffff', reqAchievement: 'ascended_200', aura:true, rarity:'mythic'},
    // === SANDIK ÖZEL SKİNLER ===
    {id:'ch_woodcutter', name:'Oduncu', emoji:'🪵', color:'#6d4c41', rarity:'common', chestOnly:true, chestTier:'bronze'},
    {id:'ch_viking', name:'Viking', emoji:'⛏️', color:'#90a4ae', rarity:'rare', chestOnly:true, chestTier:'silver'},
    {id:'ch_wolf', name:'Kurt Savaşçı', emoji:'🐺', color:'#546e7a', rarity:'rare', chestOnly:true, chestTier:'silver'},
    {id:'ch_titan', name:'Titan', emoji:'💪', color:'#ff8a65', rarity:'epic', chestOnly:true, chestTier:'gold'},
    {id:'ch_warlord', name:'Savaş Tanrısı', emoji:'👹', color:'#d50000', aura:true, rarity:'legendary', chestOnly:true, chestTier:'legendary'},
    {id:'ch_ragnarok', name:'Ragnarök', emoji:'🔥', color:'#ff1744', aura:true, rarity:'mythic', chestOnly:true, chestTier:'legendary'}
  ],
  'Şifacı': [
    {id:'default', name:'Köy Şifacısı', icon:'healing', emoji:'🩹', color:'#1abc9c', rarity:'common'}, // Bandage
    {id:'nature', name:'Doğa Ruhu', icon:'eco', emoji:'🌱', color:'#69f0ae', reqLevel: 5, rarity:'rare'}, // Seedling
    {id:'fairy', name:'Orman Perisi', icon:'emoji_nature', emoji:'🧚‍♀️', color:'#1de9b6', reqLevel: 20, rarity:'rare'}, // Fairy
    {id:'angel', name:'Melek', icon:'volunteer_activism', emoji:'🪽', color:'#00e5ff', reqAchievement: 'rich_king', rarity:'epic'}, // Wing
    {id:'spirit', name:'Ruh Şifacısı', icon:'self_improvement', emoji:'🧘', color:'#f48fb1', reqAchievement: 'collector_5', aura:true, rarity:'legendary'}, // Meditating
    {id:'yggdrasil', name:'Yggdrasil Ruhu', icon:'forest', emoji:'🦌', color:'#76ff03', reqAchievement: 'legend_50', aura:true, rarity:'legendary'}, // Deer
    {id:'time_healer', name:'Zaman Şifacısı', icon:'history', emoji:'⏳', color:'#00ffff', reqAchievement: 'god_100', aura:true, rarity:'mythic'},
    // === SANDIK ÖZEL SKİNLER ===
    {id:'ch_herb', name:'Bitki Şifacısı', emoji:'🌿', color:'#66bb6a', rarity:'common', chestOnly:true, chestTier:'bronze'},
    {id:'ch_mermaid', name:'Su Perisi', emoji:'🧜‍♀️', color:'#4dd0e1', rarity:'rare', chestOnly:true, chestTier:'silver'},
    {id:'ch_tree', name:'Hayat Ağacı', emoji:'🌳', color:'#2e7d32', rarity:'epic', chestOnly:true, chestTier:'gold'},
    {id:'ch_phoenix_heal', name:'Anka Şifacısı', emoji:'🦚', color:'#ff6f00', aura:true, rarity:'legendary', chestOnly:true, chestTier:'gold'},
    {id:'ch_divine_heal', name:'İlahi Şifacı', emoji:'🕊️', color:'#fafafa', aura:true, rarity:'legendary', chestOnly:true, chestTier:'legendary'},
    {id:'ch_eternal', name:'Ölümsüz Şifacı', emoji:'🔮', color:'#e040fb', aura:true, rarity:'mythic', chestOnly:true, chestTier:'legendary'}
  ]
};


class SkinManager {
  constructor() {
    this.equipped = {};
    this.load();
  }

  load() {
    try {
      const data = localStorage.getItem('hexSavas_skins');
      if(data) this.equipped = JSON.parse(data);
    } catch(e) {}
  }

  save() {
    try {
      localStorage.setItem('hexSavas_skins', JSON.stringify(this.equipped));
      if (typeof leaderboardManager !== 'undefined') leaderboardManager.syncDataToServer();
    } catch(e) {}
  }

  equip(unitName, skinId) {
    this.equipped[unitName] = skinId;
    this.save();
    
    // Apply immediately to current game if running
    if(typeof playerUnits !== 'undefined') {
       playerUnits.forEach(u => {
         if(u.name === unitName) {
            const skin = this.getSkinDef(unitName, skinId);
            if(skin) {
               u.emoji = skin.emoji;
               u.color = skin.color;
               u.hasAura = skin.aura || false;
            }
         }
       });
       if(typeof render === 'function') render();
    }
  }

  getSkinDef(unitName, skinId) {
    if(!UNIT_SKINS[unitName]) return null;
    return UNIT_SKINS[unitName].find(s => s.id === skinId) || UNIT_SKINS[unitName][0];
  }

  getActiveSkin(unitName) {
    const skinId = this.equipped[unitName] || 'default';
    return this.getSkinDef(unitName, skinId);
  }

  isUnlocked(skin) {
    if(skin.id === 'default') return true;
    // Sandıktan açılmış mı?
    if(typeof treasuryManager !== 'undefined' && treasuryManager.hasInInventory) {
       // Tüm üniteleri kontrol et
       for(const unitName in UNIT_SKINS) {
          if(UNIT_SKINS[unitName].some(s => s.id === skin.id)) {
             if(treasuryManager.hasInInventory(unitName, skin.id)) return true;
          }
       }
    }
    // Sandık özel skinler SADECE sandıktan açılır
    if(skin.chestOnly) return false;
    if(skin.reqLevel) {
       if(typeof globalStats !== 'undefined' && globalStats.bestRound >= skin.reqLevel) return true;
    }
    if(skin.reqAchievement) {
       if(typeof achievementManager !== 'undefined' && achievementManager.isUnlocked(skin.reqAchievement)) return true;
    }
    return false;
  }

  renderToDOM(elementId) {
    const el = document.getElementById(elementId);
    if(!el) return;
    
    el.innerHTML = '';
    
    for(const unitName in UNIT_SKINS) {
       const group = document.createElement('div');
       group.className = 'skin-group';
       group.innerHTML = `<h3 class="sg-title">${unitName} Skinleri</h3>`;
       
       const list = document.createElement('div');
       list.className = 'skin-list';
       
       const rarityOrder = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 };
       const sortedSkins = [...UNIT_SKINS[unitName]].sort((a, b) => {
           const rarityA = rarityOrder[a.rarity || 'common'] || 0;
           const rarityB = rarityOrder[b.rarity || 'common'] || 0;
           return rarityA - rarityB;
       });
       
       sortedSkins.forEach(skin => {
          const unlocked = this.isUnlocked(skin);
          const active = (this.equipped[unitName] || 'default') === skin.id;
          
          const card = document.createElement('div');
          card.className = `skin-card ${unlocked ? '' : 'locked'} ${active ? 'active' : ''}`;
          
          // Kilit açma şartı açıklaması
          let reqText = '';
          if(!unlocked) {
            if(skin.chestOnly) {
              const tierNames = {bronze:'🟫 Bronz', silver:'🥈 Gümüş', gold:'🥇 Altın', legendary:'💜 Efsanevi'};
              reqText = `${tierNames[skin.chestTier] || '🎁'} Sandıktan Açılır`;
            } else if(skin.reqLevel) {
              const currentLevel = (typeof globalStats !== 'undefined') ? globalStats.bestRound : 0;
              reqText = `Raund ${skin.reqLevel} (${currentLevel}/${skin.reqLevel})`;
            } else if(skin.reqAchievement) {
              const achDef = typeof ACHIEVEMENT_DEFS !== 'undefined' ? 
                ACHIEVEMENT_DEFS.find(a => a.id === skin.reqAchievement) : null;
              reqText = achDef ? `Başarım: ${achDef.title}` : 'Başarım';
            }
          }
          
          let rarityName = 'YAYGIN';
          if(skin.rarity === 'rare') rarityName = 'NADİR';
          if(skin.rarity === 'epic') rarityName = 'DESTANSI';
          if(skin.rarity === 'legendary') rarityName = 'EFSANEVİ';
          if(skin.rarity === 'mythic') rarityName = 'MİTİK';
          
          let baseType = typeof UNIT_TYPES !== 'undefined' ? UNIT_TYPES.find(t=>t.name===unitName) : null;
          let emj = skin.emoji || (baseType ? baseType.emoji : '⭐');
          
          const imgHtml = unlocked ? emj : '🔒';
          
          card.innerHTML = `
             <div class="skin-rarity-tag rarity-${skin.rarity||'common'}">${rarityName}</div>
             <div class="skin-icon" style="background:${unlocked ? skin.color : '#333'}">
                ${imgHtml}
                ${skin.aura && unlocked ? '<div class="skin-aura-glow" style="box-shadow:0 0 15px '+skin.color+';"></div>' : ''}
             </div>
             <div class="skin-name">${skin.name}</div>
             ${!unlocked ? `<div class="skin-req">${reqText}</div>` : ''}
             ${active ? '<div class="skin-active-badge">✓ Aktif</div>' : ''}
          `;
          
          if(unlocked && !active) {
             card.onclick = () => {
                this.equip(unitName, skin.id);
                this.renderToDOM(elementId); // Re-render
             };
          }
          
          list.appendChild(card);
       });
       
       group.appendChild(list);
       el.appendChild(group);
    }
  }
}

window.skinManager = new SkinManager();
