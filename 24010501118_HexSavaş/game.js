let canvas, ctx;
const COLS = 7, ROWS = 8, PLAYER_ROWS = 3; let HEX_SIZE = 36;

let hexCells=[], playerUnits=[], enemyUnits=[], shopSlots=[];
let gold=10, round=1, phase='prep', selectedShopUnit=null, animFrame=null;
let playerLives=5, winStreak=0, totalWins=0, totalKills=0, roundKills=0;
let screenShake=0, shopLocked=false;
let dmgNumbers=[], projectiles=[], deathFx=[], particles=[];
let gameInitialized = false;
let lastMeteorRound = -5;
let hasFreeReroll = false;

// Drag & Drop
let dragUnit=null, dragStartCell=null, isDragging=false, dragMouseX=0, dragMouseY=0;

// Boss & Events
let currentEvent=null, bossHP=null, bossMaxHP=null, isBossRound=false;

// Developer Mode
let secretTapCount = 0;
let secretTapTimer = null;
let devMode = false;

function handleSecretTap() {
  if(phase !== 'prep') return;
  secretTapCount++;
  if(secretTapTimer) clearTimeout(secretTapTimer);
  secretTapTimer = setTimeout(() => { secretTapCount = 0; }, 1500);
  
  if(secretTapCount >= 7 && !devMode) {
    devMode = true;
    showPhaseText('🔧 GELİŞTİRİCİ MODU AÇIK!', '#f0f');
    document.getElementById('dev-menu').style.display = 'flex';
  }
}

function devAutoWin() {
  if(phase !== 'prep') return;
  // Düşmanları hızlıca oluştur ve hemen kazan
  spawnEnemies();
  phase = 'combat';
  updatePhaseUI();
  enemyUnits.forEach(e => e.hp = 0);
  endCombat(true);
}

function devMaxUnits() {
  if(phase !== 'prep') return;
  playerUnits.forEach(u => {
    if(u.tier < 5) {
       const diff = 5 - u.tier;
       u.tier = 5;
       u.maxHp = Math.round(u.maxHp * Math.pow(2, diff));
       u.hp = u.maxHp;
       u.atk = Math.round(u.atk * Math.pow(2, diff));
    }
  });
  showPhaseText('💪 TÜMÜ MAX SEVİYE (5 YILDIZ)!', '#d0d');
  saveGameState();
  render();
}

// Combat Stats
let combatLog=[];

const IMAGE_ASSETS = {
  'warrior': 'assets/skins/icon_warrior.png',
  'archer': 'assets/skins/icon_archer.png',
  'knight': 'assets/skins/icon_knight.png',
  'mage': 'assets/skins/icon_mage.png',
  'berserker': 'assets/skins/icon_berserker.png',
  'healer': 'assets/skins/icon_healer.png',
  'samurai': 'assets/skins/icon_samurai.png',
  'timelord': 'assets/skins/icon_timelord.png',
  'necro': 'assets/skins/icon_necro.png',
  'chaos': 'assets/skins/icon_chaos.png'
};
const loadedImages = {};

function preloadImages(callback) {
  let loaded = 0;
  const keys = Object.keys(IMAGE_ASSETS);
  if(keys.length === 0) { callback(); return; }
  keys.forEach(k => {
    const img = new Image();
    img.onload = () => {
      loadedImages[k] = img;
      loaded++;
      if(loaded === keys.length) callback();
    };
    img.onerror = () => {
      console.warn("Resim yuklenemedi: " + IMAGE_ASSETS[k]);
      loaded++;
      if(loaded === keys.length) callback();
    };
    img.src = IMAGE_ASSETS[k];
  });
}

const UNIT_TYPES = [
  {name:'Savaşçı',icon:'swords',emoji:'⚔️',assetId:'warrior',color:'#e74c3c',hp:120,atk:18,spd:1.2,range:1,cost:2, origin:'insan', class:'savasci',
   ability:{id:'armorBreak',name:'Zırh Kırma',icon:'🔨',desc:'Her saldırıda hedefin savunması %10 azalır'}},
  {name:'Okçu',icon:'my_location',emoji:'🏹',assetId:'archer',color:'#2ecc71',hp:80,atk:22,spd:1.0,range:3,cost:3, origin:'orman', class:'avci',
   ability:{id:'doubleShot',name:'Çift Atış',icon:'🎯',desc:'%25 ihtimalle 2 ok atar'}},
  {name:'Şövalye',icon:'shield',emoji:'🛡️',assetId:'knight',color:'#3498db',hp:200,atk:10,spd:0.8,range:1,cost:3, origin:'insan', class:'muhafiz',
   ability:{id:'shieldBlock',name:'Kalkan Bloğu',icon:'🛡️',desc:'İlk 3 saldırıyı %50 azaltır'}},
  {name:'Büyücü',icon:'auto_fix_high',emoji:'🔮',assetId:'mage',color:'#9b59b6',hp:70,atk:30,spd:0.7,range:3,cost:4, origin:'ates', class:'buyucu',
   ability:{id:'aoe',name:'Alan Hasarı',icon:'💥',desc:'Komşu düşmanlara %40 hasar'}},
  {name:'Berserker',icon:'hardware',emoji:'🪓',assetId:'berserker',color:'#e67e22',hp:100,atk:25,spd:1.5,range:1,cost:3, origin:'ates', class:'savasci',
   ability:{id:'rage',name:'Öfke',icon:'🔥',desc:'HP %30 altında ATK x1.8'}},
  {name:'Şifacı',icon:'healing',emoji:'💚',assetId:'healer',color:'#1abc9c',hp:90,atk:5,spd:0.6,range:2,cost:3,healer:true, origin:'orman', class:'buyucu',
   ability:{id:'revitalize',name:'Canlandırma',icon:'✨',desc:'Savaş başında müttefiklere %15 kalkan'}},
];

const SYNERGIES = {
  insan: { name: 'İnsan', desc: '2: Takım +%15 HP', req: 2 },
  ates: { name: 'Ateş', desc: '2: Ateşlere +%25 ATK', req: 2 },
  orman: { name: 'Orman', desc: '2: Ormanlara +%20 Hız', req: 2 },
  savasci: { name: 'Savaşçı', desc: '2: %20 Kritik Şansı', req: 2 },
  buyucu: { name: 'Büyücü', desc: '2: Büyücülere +%30 ATK', req: 2 },
  muhafiz: { name: 'Muhafız', desc: '1: 50 Kalkan', req: 1 },
  avci: { name: 'Avcı', desc: '1: +%10 ATK', req: 1 }
};

const BOSS_TYPES = [
  // === TIER 1: Erken Oyun (Round 5-20) ===
  {name:'Orman Kurdu',icon:'pets',emoji:'🐺',color:'#8d6e63',hp:500,atk:30,spd:1.0,range:1,cost:0,bossRound:1,
   ability:{id:'rage',name:'Vahşi Öfke',icon:'🔥',desc:'HP %30 altında ATK x1.8'}},
  {name:'Taş Golem',icon:'landscape',emoji:'🗿',color:'#9e9e9e',hp:900,atk:18,spd:0.4,range:1,cost:0,bossRound:2,
   ability:{id:'earthquake',name:'Deprem',icon:'💥',desc:'Devasa HP, yavaş ama güçlü'}},
  {name:'Zehir Yılanı',icon:'coronavirus',emoji:'🐍',color:'#4caf50',hp:550,atk:28,spd:0.9,range:2,cost:0,bossRound:3,
   ability:{id:'poison',name:'Zehir',icon:'☠️',desc:'Saldırılar zehir bırakır, her tur ekstra hasar'}},
  {name:'Buz Devesi',icon:'ac_unit',emoji:'🦣',color:'#81d4fa',hp:800,atk:22,spd:0.5,range:1,cost:0,bossRound:4,
   ability:{id:'frost',name:'Buz Zırhı',icon:'❄️',desc:'İlk 5 saldırıyı %50 azaltır'}},

  // === TIER 2: Orta Oyun (Round 25-40) ===
  {name:'Ejderha',icon:'local_fire_department',emoji:'🐉',color:'#ff4400',hp:1000,atk:42,spd:0.6,range:2,cost:0,bossRound:5,
   ability:{id:'fireBreath',name:'Ateş Nefesi',icon:'🔥',desc:'Tüm düşmanlara alan hasarı'}},
  {name:'Ölüm Lordu',icon:'skull',emoji:'💀',color:'#7b1fa2',hp:750,atk:38,spd:0.8,range:2,cost:0,bossRound:6,
   ability:{id:'lifesteal',name:'Can Çalma',icon:'🩸',desc:'Her öldürmede HP yeniler'}},
  {name:'Fırtına Cini',icon:'bolt',emoji:'🌩️',color:'#ffc107',hp:650,atk:48,spd:1.1,range:3,cost:0,bossRound:7,
   ability:{id:'aoe',name:'Yıldırım Çarpması',icon:'⚡',desc:'Komşu düşmanlara %40 hasar'}},
  {name:'Gölge Suikastçı',icon:'dark_mode',emoji:'🥷',color:'#37474f',hp:600,atk:55,spd:1.4,range:1,cost:0,bossRound:8,
   ability:{id:'armorBreak',name:'Zırh Delici',icon:'🗡️',desc:'Her saldırıda hedefin savunması %10 azalır'}},

  // === TIER 3: Geç Oyun (Round 45-60) ===
  {name:'Lav Golem',icon:'volcano',emoji:'🌋',color:'#ff6f00',hp:1400,atk:35,spd:0.45,range:1,cost:0,bossRound:9,
   ability:{id:'fireBreath',name:'Magma Patlaması',icon:'🔥',desc:'Tüm düşmanlara alan hasarı'}},
  {name:'Vampir Lord',icon:'bloodtype',emoji:'🧛',color:'#b71c1c',hp:850,atk:45,spd:0.9,range:2,cost:0,bossRound:10,
   ability:{id:'lifesteal',name:'Kan Emme',icon:'🩸',desc:'Verdiği hasarın %30\'unu HP olarak çalar'}},
  {name:'Kraken',icon:'water_drop',emoji:'🐙',color:'#1565c0',hp:1200,atk:40,spd:0.55,range:3,cost:0,bossRound:11,
   ability:{id:'aoe',name:'Dokunaç Darbesi',icon:'🌊',desc:'Komşu düşmanlara %40 hasar'}},
  {name:'Kemik Ejderhası',icon:'bone',emoji:'🦴',color:'#efebe9',hp:1100,atk:50,spd:0.7,range:2,cost:0,bossRound:12,
   ability:{id:'fireBreath',name:'Ölüm Nefesi',icon:'💀',desc:'Tüm düşmanlara alan hasarı'}},

  // === TIER 4: Endgame (Round 65-80) ===
  {name:'Cehennem Lordu',icon:'local_fire_department',emoji:'😈',color:'#d50000',hp:1600,atk:52,spd:0.65,range:2,cost:0,bossRound:13,
   ability:{id:'fireBreath',name:'Cehennem Ateşi',icon:'🔥',desc:'Tüm düşmanlara alan hasarı'}},
  {name:'Kadim Titan',icon:'filter_hdr',emoji:'🏔️',color:'#5d4037',hp:2200,atk:30,spd:0.35,range:1,cost:0,bossRound:14,
   ability:{id:'earthquake',name:'Kıyamet Depremi',icon:'💥',desc:'Devasa HP, yavaş ama güçlü'}},
  {name:'Ruh Yiyici',icon:'ghost',emoji:'👻',color:'#ce93d8',hp:900,atk:60,spd:1.2,range:2,cost:0,bossRound:15,
   ability:{id:'lifesteal',name:'Ruh Hasadı',icon:'🩸',desc:'Öldürdüğü hedeflerden HP çalar'}},
  {name:'Kaos Büyücüsü',icon:'cyclone',emoji:'🧙',color:'#aa00ff',hp:800,atk:70,spd:0.8,range:3,cost:0,bossRound:16,
   ability:{id:'aoe',name:'Kaos Fırtınası',icon:'🌀',desc:'Komşu düşmanlara %40 hasar'}},

  // === TIER 5: Ultra Endgame (Round 85-100) ===
  {name:'Kıyamet Ejderhası',icon:'whatshot',emoji:'🐲',color:'#ff1744',hp:2000,atk:65,spd:0.7,range:3,cost:0,bossRound:17,
   ability:{id:'fireBreath',name:'Kıyamet Ateşi',icon:'🔥',desc:'Tüm düşmanlara alan hasarı'}},
  {name:'Dünya Yılanı',icon:'pest_control',emoji:'🐲',color:'#1b5e20',hp:2500,atk:40,spd:0.5,range:2,cost:0,bossRound:18,
   ability:{id:'poison',name:'Kozmik Zehir',icon:'☠️',desc:'Saldırılar zehir bırakır, her tur ekstra hasar'}},
  {name:'Zamansız Hükümdar',icon:'hourglass_empty',emoji:'👑',color:'#ffd600',hp:1800,atk:75,spd:1.0,range:2,cost:0,bossRound:19,
   ability:{id:'lifesteal',name:'Zaman Çalma',icon:'⏳',desc:'Her öldürmede HP yeniler ve hızlanır'}},
  {name:'Kaos Tanrısı',icon:'brightness_3',emoji:'🌑',color:'#311b92',hp:3000,atk:55,spd:0.6,range:3,cost:0,bossRound:20,
   ability:{id:'fireBreath',name:'Evrensel Yıkım',icon:'💥',desc:'Tüm düşmanlara alan hasarı — Son Boss'}},
];

const EVENTS = [
  {id:'goldRain',name:'Altın Yağmuru',icon:'🌧️',desc:'+5 ekstra altın!',color:'#ffd700'},
  {id:'doubleDmg',name:'Çift Hasar',icon:'⚡',desc:'Tüm üniteler x2 hasar!',color:'#ff4444'},
  {id:'armoredFront',name:'Zırhlı Cephe',icon:'🛡️',desc:'Oyuncu üniteleri +%30 HP!',color:'#4488ff'},
  {id:'fateRoll',name:'Kader Zarı',icon:'🎲',desc:'Rastgele bir ünite Tier+1!',color:'#aa44ff'},
  {id:'necromancy',name:'Nekromansi',icon:'💀',desc:'İlk ölen ünite geri döner!',color:'#66bb6a'},
];

// === PARTICLES ===
function initParticles(){particles=[];for(let i=0;i<40;i++)particles.push({x:Math.random()*canvas.clientWidth,y:Math.random()*canvas.clientHeight,r:Math.random()*1.5+0.5,dx:(Math.random()-0.5)*0.3,dy:(Math.random()-0.5)*0.3,alpha:Math.random()*0.3+0.05})}
function updateParticles(){if(typeof gameSettings!=='undefined'&&!gameSettings.particles)return;for(const p of particles){p.x+=p.dx;p.y+=p.dy;if(p.x<0)p.x=canvas.clientWidth;if(p.x>canvas.clientWidth)p.x=0;if(p.y<0)p.y=canvas.clientHeight;if(p.y>canvas.clientHeight)p.y=0}}
function drawParticles(){
  if(typeof gameSettings !== 'undefined' && !gameSettings.particles) return;
  for(const p of particles){ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(0,200,255,${p.alpha})`;ctx.fill()}
}

// === HEX MATH ===
function hexToPixel(col,row){
  const w=HEX_SIZE*2, h=Math.sqrt(3)*HEX_SIZE;
  const drawnWidth = ( (COLS - 1) * 1.5 + Math.sqrt(3) ) * HEX_SIZE;
  const drawnHeight = ( (ROWS - 1) * Math.sqrt(3) + Math.sqrt(3)/2 + 3.5 ) * HEX_SIZE;
  const oX = (canvas.width / (window.devicePixelRatio || 1) - drawnWidth) / 2 + (Math.sqrt(3)/2) * HEX_SIZE;
  const oY = (canvas.height / (window.devicePixelRatio || 1) - drawnHeight) / 2 + HEX_SIZE * 1.8;
  return{x:col*w*0.75+oX, y:row*h+(col%2?h/2:0)+oY};
}
function pixelToHex(px,py){let c=null,m=Infinity;for(const h of hexCells){const d=Math.hypot(h.x-px,h.y-py);if(d<m){m=d;c=h}}return m<HEX_SIZE?c:null}
function offsetToCube(c,r){const x=c,z=r-(c-(c&1))/2;return{x,y:-x-z,z}}
function hexDist(a,b){const ac=offsetToCube(a.col,a.row),bc=offsetToCube(b.col,b.row);return Math.max(Math.abs(ac.x-bc.x),Math.abs(ac.y-bc.y),Math.abs(ac.z-bc.z))}

function buildGrid(){
  hexCells=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const{x,y}=hexToPixel(c,r);
    hexCells.push({col:c,row:r,x,y,side:r>=ROWS-PLAYER_ROWS?'player':(r<PLAYER_ROWS?'enemy':'neutral'),unit:null});
  }
}

// === DRAWING ===
const MathCos = Math.cos, MathSin = Math.sin, MathPI = Math.PI;
const HEX_CORNERS = [];
for(let i=0;i<6;i++){
  const a=MathPI/180*(60*i-30);
  HEX_CORNERS.push({x: MathCos(a), y: MathSin(a)});
}

function drawHex(cx,cy,sz,fill,stroke,lw){
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const hx=cx+sz*HEX_CORNERS[i].x, hy=cy+sz*HEX_CORNERS[i].y;
    if(i===0) ctx.moveTo(hx,hy); else ctx.lineTo(hx,hy);
  }
  ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill()}
  if(stroke) {
     ctx.lineWidth = lw||1;
     ctx.strokeStyle = stroke;
     if(typeof gameSettings !== 'undefined' && gameSettings.particles && lw > 1) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = (lw||1) + 4;
        ctx.stroke();
        ctx.restore();
     }
     ctx.stroke();
  }
}

function drawHexPath(cx,cy,sz){
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const hx=cx+sz*HEX_CORNERS[i].x, hy=cy+sz*HEX_CORNERS[i].y;
    if(i===0) ctx.moveTo(hx,hy); else ctx.lineTo(hx,hy);
  }
  ctx.closePath();
}

function drawUnit(u){
  const px=u.drawX??u.cell.x, py=u.drawY??u.cell.y;
  const sx=u.hitShake?Math.sin(performance.now()*0.05)*(u.hitShake--):0;
  
  let tColor = u.tier===5 ? '#ff00ff' : (u.tier===4 ? '#ff8c00' : (u.tier===3 ? '#ffd700' : (u.tier===2 ? '#e0e0e0' : (u.team==='player'?'#0cf':'#f44'))));
  
  // Aura for rare skins
  if(u.hasAura) {
     ctx.save();
     ctx.translate(px+sx, py);
     ctx.rotate(performance.now()*0.001);
     drawHexPath(0, 0, HEX_SIZE*0.8);
     ctx.strokeStyle = u.color; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
     if (typeof gameSettings !== 'undefined' && gameSettings.particles) {
         ctx.save(); ctx.globalAlpha = 0.3; ctx.lineWidth = 6; ctx.stroke(); ctx.restore();
     }
     ctx.stroke();
     ctx.restore();
  }

  // Draw 3D Podium base
  drawHexPath(px+sx, py + HEX_SIZE*0.12, HEX_SIZE*0.65); // shadow offset
  ctx.fillStyle='#111';ctx.fill();
  
  drawHexPath(px+sx, py, HEX_SIZE*0.65);
  ctx.fillStyle='#222';ctx.fill();
  
  ctx.strokeStyle=tColor;
  ctx.lineWidth=u.tier>=3?3:2;
  ctx.stroke();
  
  const emjSize = HEX_SIZE * (u.tier>=3?0.8:0.7);
  ctx.font='900 ' + emjSize + 'px "Segoe UI Emoji", "Apple Color Emoji", serif';
  ctx.textAlign='center';ctx.textBaseline='middle';
  
  // Emojilere hafif bir gölge vererek 3D podyumun üzerinde parlamalarını sağlıyoruz
  if (typeof gameSettings !== 'undefined' && gameSettings.particles) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 8;
    ctx.fillText(u.emoji,px+sx,py-HEX_SIZE*0.1);
    ctx.restore();
  } else {
    ctx.fillText(u.emoji,px+sx,py-HEX_SIZE*0.1);
  }
  
  let baseStar = HEX_SIZE * 0.4;
  let starFontSize = baseStar;
  if (u.tier === 3) starFontSize = baseStar * 0.9;
  if (u.tier === 4) starFontSize = baseStar * 0.8;
  if (u.tier >= 5) starFontSize = baseStar * 0.7;
  ctx.font = '900 ' + starFontSize + 'px sans-serif'; 
  
  let stars='';for(let i=0;i<u.tier;i++)stars+='★';
  
  ctx.save();
  if (typeof gameSettings !== 'undefined' && gameSettings.particles) {
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
  }
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000';
  ctx.fillStyle = tColor;
  
  // Taşan yıldızları sıkıştırmak için maxWidth kullanıyoruz
  const maxStarWidth = HEX_SIZE * 1.4;
  ctx.strokeText(stars, px+sx, py - HEX_SIZE*0.65, maxStarWidth);
  ctx.fillText(stars, px+sx, py - HEX_SIZE*0.65, maxStarWidth);
  ctx.restore();
  
  const bw=HEX_SIZE*0.9,bh=HEX_SIZE*0.12,bx=px-bw/2,by=py+HEX_SIZE*0.45,hr=Math.max(0,u.hp/u.maxHp);
  ctx.fillStyle='#222';ctx.fillRect(bx,by,bw,bh);
  ctx.fillStyle=hr>0.5?'#0c6':hr>0.25?'#fa0':'#f22';ctx.fillRect(bx,by,bw*hr,bh);
  
  const nameSize = HEX_SIZE * 0.22;
  ctx.font='600 ' + nameSize + 'px Orbitron,sans-serif';ctx.fillStyle='#fff';
  ctx.fillText(u.name,px,py+HEX_SIZE*0.7);
  
  if(u.atkTimer>0.7&&u.target&&u.target.hp>0){
    const tx=u.target.drawX??u.target.cell.x,ty=u.target.drawY??u.target.cell.y;
    ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(tx,ty);
    ctx.strokeStyle=tColor;
    ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.stroke();ctx.setLineDash([]);
  }
}

function drawProjectiles(){
  const now=performance.now();
  projectiles=projectiles.filter(p=>now-p.t<p.dur);
  ctx.globalCompositeOperation = (typeof gameSettings!=='undefined' && !gameSettings.particles) ? 'source-over' : 'lighter';
  for(const p of projectiles){
    const age=(now-p.t)/p.dur;
    const x=p.sx+(p.tx-p.sx)*age, y=p.sy+(p.ty-p.sy)*age-Math.sin(age*Math.PI)*20;
    
    // Trail
    ctx.beginPath();
    ctx.moveTo(p.sx+(p.tx-p.sx)*Math.max(0, age-0.2), p.sy+(p.ty-p.sy)*Math.max(0, age-0.2) - Math.sin(Math.max(0, age-0.2)*Math.PI)*20);
    ctx.lineTo(x,y);
    ctx.strokeStyle = p.color || (p.heal?'#0f8':'#ff0');
    ctx.lineWidth = 3;
    ctx.globalAlpha = (1-age)*0.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x,y,5,0,Math.PI*2);
    ctx.fillStyle='#fff';
    if(typeof gameSettings !== 'undefined' && gameSettings.particles) {
       ctx.save();
       ctx.fillStyle=p.heal?'#0f8':'#f80';
       ctx.globalAlpha=0.5;
       ctx.beginPath();
       ctx.arc(x,y,9,0,Math.PI*2);
       ctx.fill();
       ctx.restore();
    }
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drawDeathFx(){
  const now=performance.now();
  deathFx=deathFx.filter(d=>now-d.t<600);
  ctx.globalCompositeOperation = (typeof gameSettings!=='undefined' && !gameSettings.particles) ? 'source-over' : 'lighter';
  for(const d of deathFx){
    const age=(now-d.t)/600;
    for(let i=0;i<d.parts.length;i++){
      const pp=d.parts[i];
      pp.dy += 0.05; // Gravity
      const x=d.x+pp.dx*age*40, y=d.y+pp.dy*age*40;
      ctx.globalAlpha=(1-age)*0.8;
      ctx.fillStyle=d.color;
      ctx.beginPath();ctx.arc(x,y,3*(1-age),0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drawDmgNumbers(){
  const now=performance.now();
  if(typeof gameSettings!=='undefined'&&!gameSettings.dmgNumbers){dmgNumbers=dmgNumbers.filter(d=>now-d.t<900);return;}
  dmgNumbers=dmgNumbers.filter(d=>now-d.t<900);
  for(const d of dmgNumbers){
    const age=(now-d.t)/900;
    let scale = 1;
    if (age < 0.15) scale = 1 + (age / 0.15) * 0.5;
    else scale = 1.5 - ((age - 0.15) / 0.85) * 0.5;
    
    const isBig = d.val > 30 && !d.heal;
    if (isBig) scale *= 1.3;

    ctx.globalAlpha=1-age;
    ctx.font=`bold ${Math.floor(14 * scale)}px Orbitron,sans-serif`;
    ctx.fillStyle=d.heal?'#0f8':(isBig?'#fa0':'#f44');
    ctx.textAlign='center';
    
    ctx.fillText((d.heal?'+':'-')+d.val,d.x,d.y-age*40);
    ctx.globalAlpha=1;
  }
}

function render(){
  ctx.save();
  if (screenShake > 0 && (typeof gameSettings==='undefined'||gameSettings.screenShake!==false)) {
    const dx = (Math.random() - 0.5) * screenShake;
    const dy = (Math.random() - 0.5) * screenShake;
    ctx.translate(dx, dy);
    screenShake *= 0.9;
    if (screenShake < 0.5) screenShake = 0;
  }
  
  ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);
  updateParticles();drawParticles();
  // divider (gizlendi)
  // hex cells
  for(const c of hexCells){
    let f,s;
    if(c.side==='player'){f='rgba(0,100,200,0.06)';s='rgba(0,180,255,0.18)'}
    else if(c.side==='enemy'){f='rgba(200,40,40,0.05)';s='rgba(255,60,60,0.15)'}
    else{f='rgba(255,255,255,0.02)';s='rgba(255,255,255,0)'}
    if(phase==='prep'&&selectedShopUnit&&c.side==='player'&&!c.unit){f='rgba(0,255,130,0.12)';s='rgba(0,255,130,0.4)'}
    // Drag highlight
    if(isDragging&&dragUnit&&c.side==='player'){
      if(!c.unit||c.unit===dragUnit){f='rgba(0,255,130,0.15)';s='rgba(0,255,130,0.5)'}
      else{f='rgba(255,200,0,0.12)';s='rgba(255,200,0,0.4)'} // swap target
    }
    drawHex(c.x,c.y,HEX_SIZE-2,f,s,2);
  }
  // units
  for(const u of[...playerUnits,...enemyUnits]){
    if(u.hp>0&&u!==dragUnit)drawUnit(u);
  }
  // Draw dragged unit at mouse position
  if(isDragging&&dragUnit&&dragUnit.hp>0){
    const origX=dragUnit.drawX,origY=dragUnit.drawY;
    dragUnit.drawX=dragMouseX;dragUnit.drawY=dragMouseY;
    ctx.globalAlpha=0.7;
    drawUnit(dragUnit);
    ctx.globalAlpha=1;
    dragUnit.drawX=origX;dragUnit.drawY=origY;
  }
  drawProjectiles();drawDeathFx();drawDmgNumbers();
  // Boss HP bar
  if(isBossRound&&phase==='combat'){
    const boss=enemyUnits.find(u=>u.isBoss&&u.hp>0);
    if(boss){
      const bw=canvas.clientWidth*0.6,bh=10,bx=(canvas.clientWidth-bw)/2,by=12;
      const hr=Math.max(0,boss.hp/boss.maxHp);
      ctx.fillStyle='#222';ctx.fillRect(bx,by,bw,bh);
      ctx.fillStyle='#f22';ctx.fillRect(bx,by,bw*hr,bh);
      ctx.strokeStyle='#f80';ctx.lineWidth=2;ctx.strokeRect(bx,by,bw,bh);
      ctx.font='10px sans-serif';ctx.fillStyle='#fff';
      ctx.textAlign='center';
      ctx.fillText(`${boss.emoji} ${boss.name} — ${boss.hp}/${boss.maxHp}`,canvas.clientWidth/2,by+bh+14);
    }
  }
  ctx.restore();
}

// === RESIZE ===
function resize(){
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.scale(dpr, dpr);
  
  const maxW = rect.width * 0.95;
  const maxH = rect.height * 0.95;
  const wHex = maxW / ( (COLS - 1) * 1.5 + Math.sqrt(3) );
  const hHex = maxH / ( (ROWS - 1) * Math.sqrt(3) + Math.sqrt(3)/2 + 3.5 );
  HEX_SIZE = Math.min(wHex, hHex, 55);
  
  buildGrid();initParticles();
  for(const u of[...playerUnits,...enemyUnits]){const cell=hexCells.find(c=>c.col===u.cell.col&&c.row===u.cell.row);if(cell){u.cell=cell;cell.unit=u;u.drawX=cell.x;u.drawY=cell.y}}
  render();
}
// Only add standard resize listener for fallback
window.addEventListener('resize', resize);

// Use ResizeObserver for guaranteed layout
const battlefieldObserver = new ResizeObserver(() => {
  if (phase === 'prep' && typeof currentScreen !== 'undefined' && currentScreen === 'game') {
    resize();
  }
});
window.addEventListener('DOMContentLoaded', () => {
  const bf = document.getElementById('battlefield');
  if(bf) battlefieldObserver.observe(bf);
});

// === UI ===
function updateGoldUI(){document.getElementById('gold-val').textContent=gold}
function updateLivesUI(){
  const el=document.getElementById('lives-bar');el.innerHTML='';
  for(let i=0;i<5;i++){const h=document.createElement('span');h.className='heart'+(i>=playerLives?' lost':'');h.textContent='❤️';el.appendChild(h)}
}
function updateStreakUI(){
  const el=document.getElementById('streak-tag');
  if(winStreak>=2){el.style.display='inline';el.textContent=`🔥 ${winStreak} SERİ`}else{el.style.display='none'}
}
function updatePhaseUI(){
  const tag=document.getElementById('phase-tag'),rnd=document.getElementById('round-val');
  rnd.textContent=round;
  if(phase==='prep'){tag.textContent='RAUND ' + round + ' - HAZIRLIK';tag.className='phase-label phase-prep'}
  else{tag.textContent='RAUND ' + round + ' - SAVAŞ';tag.className='phase-label phase-combat'}
}

// === SHOP ===
function generateShop(){
  shopSlots=[];
  let luck = 0;
  if(typeof metaManager !== 'undefined') luck = metaManager.getEffect('shop_luck');
  
  for(let i=0;i<4;i++){
    let t=UNIT_TYPES[Math.floor(Math.random()*UNIT_TYPES.length)];
    if(luck > 0 && Math.random() < luck) {
       const betterTypes = UNIT_TYPES.filter(u => u.cost >= 3);
       if(betterTypes.length > 0) t = betterTypes[Math.floor(Math.random() * betterTypes.length)];
    }
    shopSlots.push({...t,sold:false});
  }
  renderShop();
}
function renderShop(){
  const el=document.getElementById('shop');el.innerHTML='';
  shopSlots.forEach((s,i)=>{
    const c=document.createElement('div');
    c.className='shop-card';if(s.sold)c.classList.add('sold');
    if(i===selectedShopUnit?.idx)c.style.borderColor='#0f8';
    
    let emj=s.emoji, col=s.color;
    if(typeof skinManager!=='undefined') {
       const skin = skinManager.getActiveSkin(s.name);
       if(skin) { emj=skin.emoji; col=skin.color; }
    }
    
    const abilityHtml=s.ability?`<div class="sc-ability"><span>${s.ability.icon}</span> ${s.ability.name}</div>`:'';
    const imgHtml = `<div class="sc-icon" style="background:${col}">${emj}</div>`;
    
    c.innerHTML=`<div class="sc-cost">${s.cost}💰</div>${imgHtml}<div class="sc-name">${s.name}</div><div class="sc-stats">❤️${s.hp} ⚔️${s.atk}<br>Menzil:${s.range}</div>${abilityHtml}`;
    if(!s.sold)c.onclick=()=>buyUnit(i);
    el.appendChild(c);
  });
}
function buyUnit(idx){
  if(phase!=='prep')return;const s=shopSlots[idx];if(s.sold||gold<s.cost)return;
  selectedShopUnit={...s,idx};
  document.getElementById('hint-text').textContent=`${s.name} seçildi — tahtaya tıkla`;
  renderShop();render();
}
function refreshShop(){
  if(phase!=='prep')return;
  
  let isFree = false;
  if(typeof hasFreeReroll !== 'undefined' && hasFreeReroll) {
    isFree = true;
    hasFreeReroll = false;
  }
  
  if(!isFree && gold<1) return;
  if(!isFree) {
    gold--;
    updateGoldUI();
  } else {
    showPhaseText('🆓 Bedava Yenileme!', '#0f8');
  }
  
  selectedShopUnit=null;
  if(shopLocked) toggleShopLock();
  generateShop();
  saveGameState();
  render();
}

function toggleShopLock() {
  shopLocked = !shopLocked;
  const btn = document.getElementById('btn-lock');
  if (shopLocked) {
    btn.textContent = '🔒';
    btn.style.background = '#d90';
    btn.style.borderColor = '#fa0';
  } else {
    btn.textContent = '🔓';
    btn.style.background = '#555';
    btn.style.borderColor = '#777';
  }
}

function checkMerge() {
  let merged = false;
  const groups = {};
  playerUnits.forEach(u => {
    const key = u.name + '_' + u.tier;
    if(!groups[key]) groups[key] = [];
    groups[key].push(u);
  });
  
  for(const key in groups) {
    if(groups[key].length >= 3 && groups[key][0].tier < 5) {
      const toMerge = groups[key].slice(0, 3);
      toMerge.forEach(u => {
        u.cell.unit = null;
        playerUnits = playerUnits.filter(p => p !== u);
      });
      const targetCell = toMerge[2].cell; 
      const base = toMerge[2];
      const newUnit = {...base, tier: base.tier+1, hp: Math.round(base.maxHp * 2), maxHp: Math.round(base.maxHp * 2), atk: Math.round(base.atk * 2), cell: targetCell, drawX: targetCell.x, drawY: targetCell.y, hitShake: 0};
      targetCell.unit = newUnit;
      playerUnits.push(newUnit);
      
      for(let i=0; i<3; i++) {
         const fromCell = toMerge[i].cell;
         if(fromCell !== targetCell) {
             projectiles.push({sx:fromCell.x, sy:fromCell.y, tx:targetCell.x, ty:targetCell.y, t:performance.now(), dur:300, heal:false, color:'#ffd700'});
         }
      }
      setTimeout(() => {
         deathFx.push({x: targetCell.x, y: targetCell.y, t: performance.now(), color: '#ffd700', parts: Array.from({length:20},()=>({dx:Math.random()*6-3,dy:Math.random()*6-3}))});
      }, 300);
      
      document.getElementById('hint-text').textContent=`⭐ ${base.name} Seviye ${newUnit.tier} oldu!`;
      if(typeof AudioManager!=='undefined')AudioManager.play('merge');
      if(typeof achievementManager!=='undefined') {
        achievementManager.check('merge');
        if(newUnit.tier===3) achievementManager.check('merge_tier3');
      }
      if(typeof questManager!=='undefined') {
        questManager.addProgress('MERGE_UNITS', 1);
        if(newUnit.tier===3) questManager.addProgress('CREATE_3_STAR', 1);
      }

      merged = true;
      break;
    }
  }
  if (merged) {
    saveGameState();
    render();
    checkMerge();
  }
}

function placeUnit(cell){
  if(!selectedShopUnit||cell.side!=='player'||cell.unit)return;
  const s=selectedShopUnit;gold-=s.cost;shopSlots[s.idx].sold=true;updateGoldUI();renderShop();
  
  let emj=s.emoji, col=s.color;
  if(typeof skinManager!=='undefined') {
     const skin = skinManager.getActiveSkin(s.name);
     if(skin) { emj=skin.emoji; col=skin.color; }
  }

  const hpBonus = typeof metaManager !== 'undefined' ? metaManager.getEffect('max_hp') : 0;
  const finalMaxHp = Math.round(s.hp * (1 + hpBonus));

  const unit={name:s.name, origin:s.origin, class:s.class, emoji:emj,color:col,hp:finalMaxHp,maxHp:finalMaxHp,atk:s.atk,spd:s.spd,range:s.range,cost:s.cost,healer:s.healer||false,team:'player',cell,target:null,atkTimer:0,drawX:cell.x,drawY:cell.y,hitShake:0,tier:1,ability:s.ability||null,shieldCharges:s.ability&&s.ability.id==='shieldBlock'?3:0,armorDebuff:0,combatStats:{damageDealt:0,damageTaken:0,healed:0,kills:0}};
  cell.unit=unit;playerUnits.push(unit);selectedShopUnit=null;
  document.getElementById('hint-text').textContent='Dükkandan ünite al, tahtaya tıklayarak yerleştir';
  if(typeof AudioManager!=='undefined')AudioManager.play('buy');
  if(typeof questManager!=='undefined') questManager.addProgress('BUY_UNITS', 1);
  if(typeof achievementManager!=='undefined'){
    achievementManager.check('gold', {gold});
    achievementManager.check('units', {count: playerUnits.length});
  }
  saveGameState();
  renderShop();render();
  checkMerge();
}

function sellUnit(cell){
  if(phase!=='prep'||!cell.unit||cell.unit.team!=='player')return;
  const u=cell.unit;
  let totalCost = u.cost;
  if(u.tier === 2) totalCost *= 3;
  if(u.tier === 3) totalCost *= 9;
  const refund=Math.max(1,Math.floor(totalCost/2));
  gold+=refund;cell.unit=null;playerUnits=playerUnits.filter(p=>p!==u);
  updateGoldUI();
  if(typeof achievementManager!=='undefined') achievementManager.check('gold', {gold});
  saveGameState();
  render();
  document.getElementById('hint-text').textContent=`${u.name} satıldı! +${refund}💰`;
}

// === ENEMY ===
function spawnEnemies(){
  enemyUnits=[];for(const c of hexCells)if(c.side==='enemy')c.unit=null;
  isBossRound=(round%5===0&&round>0);
  const cells=hexCells.filter(c=>c.side==='enemy').sort(()=>Math.random()-0.5);

  const getEnemyTier = (rnd) => {
    let eTier=1; let rand = Math.random();
    if(rnd > 180) { eTier = rand < 0.8 ? 5 : 4; }
    else if(rnd > 140) { if(rand < 0.5) eTier=5; else eTier=4; }
    else if(rnd > 100) { if(rand < 0.2) eTier=5; else if(rand < 0.6) eTier=4; else eTier=3; }
    else if(rnd > 80) { if(rand < 0.1) eTier=5; else if(rand < 0.4) eTier=4; else if(rand < 0.8) eTier=3; else eTier=2; }
    else if(rnd > 60) { if(rand < 0.2) eTier=4; else if(rand < 0.6) eTier=3; else if(rand < 0.9) eTier=2; }
    else if(rnd > 40) { if(rand < 0.1) eTier=4; else if(rand < 0.4) eTier=3; else if(rand < 0.8) eTier=2; }
    else if(rnd > 20) { if(rand < 0.2) eTier=3; else if(rand < 0.6) eTier=2; }
    else if(rnd > 5) { if(rand < 0.2) eTier=2; }
    return eTier;
  };

  if(isBossRound){
    const bossIndex = (Math.floor(round / 5) - 1) % BOSS_TYPES.length;
    const cycleCount = Math.floor((Math.floor(round / 5) - 1) / BOSS_TYPES.length); 
    const bt = BOSS_TYPES[bossIndex];
    
    let sc = 1;
    if (round <= 50) sc += (round - 1) * 0.04;
    else if (round <= 100) sc += 49 * 0.04 + (round - 50) * 0.06;
    else sc += 49 * 0.04 + 50 * 0.06 + (round - 100) * 0.1;
    
    if(cycleCount > 0) sc *= Math.pow(1.5, cycleCount);
    
    const shieldCharges = (bt.ability && (bt.ability.id === 'frost' || bt.ability.id === 'shieldBlock')) ? 5 : 0;
    
    const boss={name:bt.name,emoji:bt.emoji,color:bt.color,hp:Math.round(bt.hp*sc),maxHp:Math.round(bt.hp*sc),atk:Math.round(bt.atk*sc),spd:bt.spd,range:bt.range,cost:0,healer:false,team:'enemy',cell:cells[0],target:null,atkTimer:0,drawX:cells[0].x,drawY:cells[0].y,hitShake:0,tier:3,isBoss:true,ability:bt.ability,shieldCharges:shieldCharges,armorDebuff:0,combatStats:{damageDealt:0,damageTaken:0,healed:0,kills:0}};
    cells[0].unit=boss;enemyUnits.push(boss);
    
    const minionCount = Math.min(1 + Math.floor(round / 5), 16);
    for(let i=1;i<=minionCount&&i<cells.length;i++){
      const t=UNIT_TYPES[Math.floor(Math.random()*UNIT_TYPES.length)];
      let eTier = getEnemyTier(round);
      let mSc = sc * 0.35; 
      if(eTier === 2) mSc *= 1.5; else if(eTier === 3) mSc *= 2.2; else if(eTier === 4) mSc *= 4.0; else if(eTier === 5) mSc *= 7.0;
      const u={name:t.name,emoji:t.emoji,color:t.color,hp:Math.round(t.hp*mSc),maxHp:Math.round(t.hp*mSc),atk:Math.round(t.atk*mSc),spd:t.spd,range:t.range,cost:t.cost,healer:t.healer||false,team:'enemy',cell:cells[i],target:null,atkTimer:0,drawX:cells[i].x,drawY:cells[i].y,hitShake:0,tier:eTier,ability:t.ability,shieldCharges:0,armorDebuff:0,combatStats:{damageDealt:0,damageTaken:0,healed:0,kills:0}};
      cells[i].unit=u;enemyUnits.push(u);
    }
    if(typeof AudioManager!=='undefined')AudioManager.playMusic('boss');
    
    // Boss numarasını göster
    const bossNum = bossIndex + 1;
    const totalBosses = BOSS_TYPES.length;
    showPhaseText(`👹 BOSS ${bossNum}/${totalBosses}: ${bt.name}!`,'#ff4400');
  } else {
    // Normal roundlar — dengeli ama giderek çok zorlaşan düşman sayısı (Max 18 düşman)
    const count=Math.min(2+Math.floor(round/2),18);
    for(let i=0;i<count&&i<cells.length;i++){
      const t=UNIT_TYPES[Math.floor(Math.random()*UNIT_TYPES.length)];
      let sc = 1;
      if (round <= 50) sc += (round - 1) * 0.02;
      else if (round <= 100) sc += 49 * 0.02 + (round - 50) * 0.03;
      else sc += 49 * 0.02 + 50 * 0.03 + (round - 100) * 0.05;

      let eTier = getEnemyTier(round);
      if(eTier === 2) sc *= 1.5;
      else if(eTier === 3) sc *= 2.2;
      else if(eTier === 4) sc *= 4.0;
      else if(eTier === 5) sc *= 7.0;
      const u={name:t.name,emoji:t.emoji,color:t.color,hp:Math.round(t.hp*sc),maxHp:Math.round(t.hp*sc),atk:Math.round(t.atk*sc),spd:t.spd,range:t.range,cost:t.cost,healer:t.healer||false,team:'enemy',cell:cells[i],target:null,atkTimer:0,drawX:cells[i].x,drawY:cells[i].y,hitShake:0,tier:eTier,ability:t.ability,shieldCharges:t.ability&&t.ability.id==='shieldBlock'?3:0,armorDebuff:0,combatStats:{damageDealt:0,damageTaken:0,healed:0,kills:0}};
      cells[i].unit=u;enemyUnits.push(u);
    }
  }
}

function updateSynergies() {
  const activeSynergies = {};
  const counts = {};
  const uniqueUnits = [];
  const seen = new Set();
  playerUnits.forEach(u => {
    if(!seen.has(u.name)) { seen.add(u.name); uniqueUnits.push(u); }
  });
  
  uniqueUnits.forEach(u => {
    if(u.origin) counts[u.origin] = (counts[u.origin] || 0) + 1;
    if(u.class) counts[u.class] = (counts[u.class] || 0) + 1;
  });
  
  const el = document.getElementById('synergy-list');
  let activeCount = 0;
  if(el) {
    el.innerHTML = '';
    for(const k in SYNERGIES) {
      const syn = SYNERGIES[k];
      const count = counts[k] || 0;
      const isActive = count >= syn.req;
      if(isActive) activeCount++;
      if (count > 0) {
        const div = document.createElement('div');
        div.style.fontSize = '10px';
        div.style.padding = '4px';
        div.style.borderRadius = '4px';
        div.style.background = isActive ? 'rgba(0,200,100,0.3)' : 'rgba(100,100,100,0.3)';
        div.style.color = isActive ? '#0f8' : '#aaa';
        div.style.border = isActive ? '1px solid #0f8' : '1px solid #666';
        div.innerHTML = `<b>${syn.name} (${count}/${syn.req})</b><br><span style="font-size:9px">${syn.desc}</span>`;
        el.appendChild(div);
        if(isActive) activeSynergies[k] = true;
      }
    }
  }
  const btn = document.getElementById('btn-synergy-toggle');
  if(btn) {
    btn.innerHTML = `📊 SİNERJİLER ${activeCount > 0 ? `<span style="color:#0f8">(${activeCount})</span>` : ''}`;
  }
  return activeSynergies;
}

function castMeteor() {
  if (phase !== 'combat') return;
  const btn = document.getElementById('btn-meteor');
  if (btn.disabled) return;
  btn.disabled = true;
  btn.style.filter = 'grayscale(100%)';
  if(typeof AudioManager!=='undefined')AudioManager.play('attack');
  
  screenShake = 15;
  const now = performance.now();
  lastMeteorRound = round;
  if(typeof questManager !== 'undefined') questManager.addProgress('CAST_METEOR', 1);
  
  enemyUnits.forEach(e => {
    if(e.hp > 0) {
      const dmg = Math.round((100 + (round * 20)) * 0.5);
      const wasAlive = e.hp > 0;
      e.hp -= dmg;
      e.combatStats.damageTaken += dmg;
      e.hitShake = 10;
      dmgNumbers.push({x:e.drawX, y:e.drawY-10, val:dmg, heal:false, t:now});
      deathFx.push({x:e.drawX, y:e.drawY, t:now, color:'#ff4400', parts:Array.from({length:15},()=>({dx:Math.random()*4-2,dy:Math.random()*4-2}))});
      
      if (wasAlive && e.hp <= 0) {
        roundKills++; totalKills++;
        if(typeof achievementManager!=='undefined') achievementManager.check('kill', {totalKills});
      }
    }
  });
}

// === COMBAT ===
function startCombat(){
  roundKills=0; // Reset per-round kill counter
  console.log('startCombat called, phase:', phase, 'units:', playerUnits.filter(u=>u.hp>0).length);
  
  // If phase is stuck on 'combat' from a previous crashed combat, force reset
  if(phase === 'combat') {
    console.warn('Phase was stuck on combat, resetting...');
    if(animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    phase = 'prep';
  }
  
  if(phase!=='prep'||playerUnits.filter(u=>u.hp>0).length===0) {
    console.warn('startCombat blocked: phase=', phase, 'alive units=', playerUnits.filter(u=>u.hp>0).length);
    return;
  }
  phase='combat';selectedShopUnit=null;updatePhaseUI();spawnEnemies();render();
  
  // Events
  currentEvent = null;
  if (Math.random() < 0.3) {
    currentEvent = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    showPhaseText(`🌟 ETKİNLİK: ${currentEvent.name}!`, currentEvent.color);
    if(currentEvent.id === 'goldRain') gold += 5;
    else if(currentEvent.id === 'armoredFront') {
      playerUnits.forEach(u => { u.maxHp = Math.round(u.maxHp*1.3); u.hp = u.maxHp; });
    }
  } else if(!isBossRound) {
    showPhaseText('⚔️ SAVAŞ!','#f44');
  }

  // Pre-combat Abilities
  // Savaş başlarken oyuncu ünitelerinin başlangıç konumlarını kaydet
  playerUnits.forEach(u => u.startCell = u.cell);

  document.getElementById('spell-panel').style.display = 'block';
  const meteorBtn = document.getElementById('btn-meteor');
  if(meteorBtn) { 
    if (round - lastMeteorRound >= 5) {
      meteorBtn.disabled = false; 
      meteorBtn.style.filter = 'none'; 
    } else {
      meteorBtn.disabled = true;
      meteorBtn.style.filter = 'grayscale(100%)';
    }
  }
  
  const activeSynergies = updateSynergies();

  [...playerUnits, ...enemyUnits].forEach(u => {
    if(u.ability && u.ability.id === 'revitalize') {
      const allies = u.team === 'player' ? playerUnits : enemyUnits;
      allies.forEach(a => { a.hp = Math.min(a.maxHp, Math.round(a.hp + a.maxHp * 0.15)); });
      if(typeof AudioManager!=='undefined')AudioManager.play('heal');
    }
    // Ensure combat properties exist
    if(!u.combatStats) u.combatStats = {damageDealt:0,damageTaken:0,healed:0,kills:0};
    if(u.armorDebuff === undefined) u.armorDebuff = 0;
    if(u.shieldCharges === undefined) u.shieldCharges = 0;
    u.atkTimer = 0;
    u.target = null;
    
    u.critChance = 0;
    u.atkMult = 1;
    
    if (u.team === 'player') {
      if (activeSynergies.insan) { u.maxHp = Math.round(u.maxHp * 1.15); u.hp = u.maxHp; }
      if (activeSynergies.ates && u.origin === 'ates') u.atkMult += 0.25;
      if (activeSynergies.orman && u.origin === 'orman') u.spd *= 1.20;
      if (activeSynergies.savasci && u.class === 'savasci') u.critChance += 0.20;
      if (activeSynergies.buyucu && u.class === 'buyucu') u.atkMult += 0.30;
      if (activeSynergies.muhafiz && u.class === 'muhafiz') {
         u.hp += 50; u.maxHp += 50;
         dmgNumbers.push({x:u.cell.x, y:u.cell.y-10, val:50, heal:true, t:performance.now()});
      }
      if (activeSynergies.avci && u.class === 'avci') u.atkMult += 0.10;
    }
  });

  document.getElementById('btn-fight').disabled=true;
  document.getElementById('btn-refresh').disabled=true;
  const speedMult = gameSettings ? parseFloat(gameSettings.combatSpeed) || 1 : 1;
  let last=performance.now();
  let moveAccum = 0;

  let combatRunning = true;

  function loop(now){
    if(!combatRunning) return; // STOP if combat already ended

    try {
      const dt=Math.min((now-last)/1000, 0.25);
      last=now;
      const dtScaled = dt * speedMult;
      const ap=playerUnits.filter(u=>u.hp>0),ae=enemyUnits.filter(u=>u.hp>0);
      
      if(ap.length===0||ae.length===0){
        combatRunning = false;
        endCombat(ap.length>0);
        return; // STOP - don't schedule next frame
      }

      const allUnits = [...ap,...ae];

      // === PHASE 1: Assign targets ===
      for(const u of allUnits){
        if(u.hp<=0)continue;
        if(!u.target || u.target.hp<=0) {
          if(u.healer){
            const allies=u.team==='player'?ap.filter(a=>a.hp>0&&a!==u):ae.filter(a=>a.hp>0&&a!==u);
            let best=null, minRatio=Infinity;
            for(let i=0; i<allies.length; i++) {
               let ratio = allies[i].hp / allies[i].maxHp;
               if(ratio < minRatio) { minRatio=ratio; best=allies[i]; }
            }
            u.target=best;
          } else {
            const enemies=u.team==='player'?ae:ap;
            let best=null, minDist=Infinity;
            for(let i=0; i<enemies.length; i++) {
               let d = hexDist(u.cell, enemies[i].cell);
               if(d < minDist) { minDist=d; best=enemies[i]; }
            }
            u.target=best;
          }
        }
      }

      // === PHASE 2: Attack ===
      for(const u of allUnits){
        if(u.hp<=0||!u.target||u.target.hp<=0)continue;
        const dist=hexDist(u.cell,u.target.cell);
        if(dist<=u.range){
          u.atkTimer += dtScaled * u.spd;
          if(u.atkTimer>=1){
            u.atkTimer=0;
            const sx=u.drawX!==undefined?u.drawX:u.cell.x;
            const sy=u.drawY!==undefined?u.drawY:u.cell.y;
            const tx=u.target.drawX!==undefined?u.target.drawX:u.target.cell.x;
            const ty=u.target.drawY!==undefined?u.target.drawY:u.target.cell.y;

            // Lunge animation
            u.lungeX = (tx - sx) * 0.3;
            u.lungeY = (ty - sy) * 0.3;

            if(u.healer){
              const ha = Math.max(1, Math.round(u.atk * 0.4)); // Healer nerfed
              u.target.hp=Math.min(u.target.maxHp,u.target.hp+ha);
              u.combatStats.healed += ha;
              dmgNumbers.push({x:tx+(Math.random()-0.5)*20,y:ty-10,val:ha,heal:true,t:now});
              projectiles.push({sx,sy,tx,ty,t:now,dur:300,heal:true});
              if(typeof AudioManager!=='undefined')AudioManager.play('heal');
            } else {
              let dmgMult = 1;
              if(currentEvent && currentEvent.id === 'doubleDmg') dmgMult = 2;
              if(u.ability && u.ability.id === 'rage' && u.hp < u.maxHp * 0.3) dmgMult *= 1.8;
              let dmg = Math.round((u.atk + Math.floor(Math.random()*6)) * dmgMult * (u.atkMult || 1));
              
              let baseCrit = u.critChance || 0;
              if(u.team === 'player' && typeof metaManager !== 'undefined') {
                 baseCrit += metaManager.getEffect('crit_chance');
              }
              if(baseCrit > 0 && Math.random() < baseCrit) {
                 dmg = Math.round(dmg * 1.5);
              }
              
              if(u.team === 'player' && u.target && u.target.isBoss && typeof metaManager !== 'undefined') {
                 dmg = Math.round(dmg * (1 + metaManager.getEffect('boss_slayer')));
              }
              
              if(u.ability && u.ability.id === 'armorBreak') {
                u.target.armorDebuff = (u.target.armorDebuff||0) + 0.1;
              }
              if(u.target.armorDebuff > 0) dmg = Math.round(dmg * (1 + u.target.armorDebuff));
              if(u.target.shieldCharges > 0) {
                dmg = Math.round(dmg * 0.5);
                u.target.shieldCharges--;
              }
              if(u.ability && u.ability.id === 'lifesteal') {
                u.hp = Math.min(u.maxHp, u.hp + Math.round(dmg * 0.3));
              }

              u.target.hp -= dmg;
              if (dmg >= 25) screenShake = Math.max(screenShake, 3);
              u.combatStats.damageDealt += dmg;
              u.target.combatStats.damageTaken += dmg;
              u.target.hitShake = 6;
              dmgNumbers.push({x:tx+(Math.random()-0.5)*20,y:ty-10,val:dmg,heal:false,t:now});
              projectiles.push({sx,sy,tx,ty,t:now,dur:250,heal:false,color:u.color});
              if(typeof AudioManager!=='undefined')AudioManager.play('attack');

              // AOE
              if(u.ability && (u.ability.id === 'aoe' || u.ability.id === 'fireBreath')) {
                const enList = u.team==='player'?ae:ap;
                for(const e of enList){
                  if(e.hp>0 && e !== u.target && hexDist(e.cell, u.target.cell) <= 1){
                    const aoeDmg = Math.round(dmg * 0.4);
                    e.hp -= aoeDmg;
                    u.combatStats.damageDealt += aoeDmg;
                    e.combatStats.damageTaken += aoeDmg;
                    dmgNumbers.push({x:e.drawX||e.cell.x,y:(e.drawY||e.cell.y)-10,val:aoeDmg,heal:false,t:now});
                  }
                }
              }

              // Double shot
              if(u.ability && u.ability.id === 'doubleShot' && Math.random() < 0.25 && u.target && u.target.hp > 0) {
                const ct = u.target;
                setTimeout(() => {
                  if(ct && ct.hp > 0) {
                    ct.hp -= dmg;
                    dmgNumbers.push({x:tx,y:ty-10,val:dmg,heal:false,t:performance.now()});
                    projectiles.push({sx,sy,tx,ty,t:performance.now(),dur:250,heal:false,color:u.color});
                  }
                }, 150);
              }

              // Check kill
              if(u.target.hp<=0){
                screenShake = Math.max(screenShake, 6);
                if(u.team==='player'){
                  roundKills++;
                  totalKills++;
                  if(typeof achievementManager!=='undefined') achievementManager.check('kill', {totalKills});
                  if(typeof questManager!=='undefined') questManager.addProgress('KILL_ENEMIES', 1);
                }
                u.combatStats.kills++;
                if(typeof AudioManager!=='undefined')AudioManager.play('death');
                if(u.target.isBoss && typeof achievementManager!=='undefined') achievementManager.check('boss_kill');
                if(currentEvent && currentEvent.id === 'necromancy' && !u.target.revived) {
                  u.target.hp = Math.round(u.target.maxHp * 0.5);
                  u.target.revived = true;
                  dmgNumbers.push({x:tx,y:ty-10,val:'💀 DİRİLDİ',heal:true,t:now});
                } else {
                  deathFx.push({x:tx,y:ty,t:now,color:u.target.color,parts:Array.from({length:8},()=>({dx:Math.random()*2-1,dy:Math.random()*2-1}))});
                  if(u.target.cell) u.target.cell.unit=null;
                }
              }
            }
          }
        }
      }

      // === PHASE 3: Movement ===
      moveAccum += dtScaled;
      if(moveAccum >= 0.1) {
        moveAccum = 0;
        for(const u of allUnits){
          if(u.hp<=0||!u.target||u.target.hp<=0)continue;
          const dist=hexDist(u.cell,u.target.cell);
          if(dist>u.range){
            if(Math.random() > u.spd * 0.8) continue;
            const nb=hexCells.filter(c=>hexDist(u.cell,c)===1&&!c.unit);
            if(nb.length){
              const currentDist = hexDist(u.cell, u.target.cell);
              let candidates = nb.filter(c => hexDist(c, u.target.cell) < currentDist);
              if (candidates.length === 0 && Math.random() < 0.3) {
                 candidates = nb.filter(c => hexDist(c, u.target.cell) === currentDist);
              }
              if(candidates.length > 0){
                const best = candidates[Math.floor(Math.random() * candidates.length)];
                u.cell.unit=null;u.cell=best;best.unit=u;
              }
            }
          }
        }
      }

      // === PHASE 4: Smooth animation ===
      for(const u of allUnits){
        if(u.lungeX) u.lungeX *= 0.8;
        if(u.lungeY) u.lungeY *= 0.8;
        if(Math.abs(u.lungeX)<0.1) u.lungeX = 0;
        if(Math.abs(u.lungeY)<0.1) u.lungeY = 0;
        
        const targetX = u.cell.x + (u.lungeX||0);
        const targetY = u.cell.y + (u.lungeY||0);
        if(u.drawX!==undefined){
          u.drawX+=(targetX-u.drawX)*0.2;
          u.drawY+=(targetY-u.drawY)*0.2;
        }
      }

      render();
      if(combatRunning) animFrame=requestAnimationFrame(loop);
    } catch(err) {
      console.error('Combat loop error:', err);
      // Only continue loop if combat hasn't ended
      if(combatRunning) {
        render();
        animFrame=requestAnimationFrame(loop);
      }
    }
  }
  animFrame=requestAnimationFrame(loop);
}

function endCombat(won){
  // Cancel any pending animation frame
  if(animFrame){cancelAnimationFrame(animFrame);animFrame=null;}
  phase='prep';
  document.getElementById('spell-panel').style.display = 'none';
  
  if(won){
     winStreak++;totalWins++;
     // Dengeli altın: base 3 + round katkısı (maks 25) + seri bonusu (maks 5)
     let reward = 3 + Math.min(Math.floor(round * 0.3), 25) + Math.min(winStreak, 5);
     // Boss öldürmede bonus altın
     if(isBossRound) reward += 5;
     gold+=reward;
     const bossText = isBossRound ? '🏆 BOSS YENİLDİ!' : '🏆 ZAFER!';
     showPhaseText(`${bossText} +${reward}💰`,'#0f8');
     if(typeof AudioManager!=='undefined'){
       AudioManager.play('buy');
       if(isBossRound) AudioManager.playMusic('ambient');
     }
  } else {
     winStreak=0;playerLives--;gold+=6;
     showPhaseText('💀 YENİLGİ! +6💰','#f44');
     if(typeof AudioManager!=='undefined'){
       AudioManager.play('death');
       if(isBossRound) AudioManager.playMusic('ambient');
     }
  }
  
  if(typeof achievementManager!=='undefined'){
     if(won) achievementManager.check('win', {streak: winStreak});
     achievementManager.check('round', {round});
     achievementManager.check('gold', {gold});
     achievementManager.check('units', {count: playerUnits.filter(u=>u.hp>0).length});
  }

  if(typeof updateCombatStatsUI === 'function') updateCombatStatsUI(playerUnits);

  // Round sadece kazanıldığında artar
  if(won) {
    round++;
    if(typeof metaManager !== 'undefined') hasFreeReroll = metaManager.getEffect('free_reroll');
    if(typeof achievementManager!=='undefined') achievementManager.check('round', {round});
    if(typeof questManager!=='undefined') questManager.addProgress('REACH_ROUND', round);
  }
  
  // Update global stats
  if(typeof globalStats!=='undefined'){
    if(round>globalStats.bestRound)globalStats.bestRound=round;
    globalStats.totalWins=globalStats.totalWins+(won?1:0);
    globalStats.totalKills+=roundKills; // Sadece bu roundun kill'lerini ekle
    if(typeof saveData==='function')saveData();
  }
  
  // === MÜCEVHER KAZANIMI (Çok zor) ===
  if(typeof storeManager !== 'undefined' && won) {
    // Normal zafer: sadece 1 mücevher
    storeManager.addGems(1, 'Savaş Zaferi');
    
    // Boss öldürme: +3 ekstra (toplam 4)
    if(isBossRound) {
      storeManager.addGems(3, 'Boss Yenildi!');
      
      // === META-PROGRESSION ===
      if(typeof metaManager !== 'undefined') {
        const soulAmount = Math.max(1, Math.floor((round - 1) / 5)); // round has already been incremented, so we use round-1
        metaManager.addSouls(soulAmount);
        setTimeout(() => {
          showPhaseText(`+${soulAmount} 👻 Boss Ruhu!`, '#0f8');
        }, 1500);
      }
    }
    
    // 10+ zafer serisi bonusu: +2 (çok nadir)
    if(winStreak >= 10 && winStreak % 10 === 0) {
      storeManager.addGems(2, `${winStreak} Seri Bonus!`);
    }
    
    // Her 25 raundda milestone: +5
    if(round > 0 && round % 25 === 0) {
      storeManager.addGems(5, `${round}. Raund Milestone`);
    }
    
    // Gem UI güncelle
    storeManager.updateGemUI();
  }
  
  // Reset battlefield
  playerUnits=playerUnits.filter(u=>u.hp>0);
  enemyUnits=[];
  
  // Clear ALL cells
  for(const c of hexCells) c.unit=null;
  
  // Place surviving player units back to their starting positions
  for(const u of playerUnits){
    if(u.startCell) {
      u.cell = u.startCell;
      u.startCell.unit = u;
      u.drawX = u.startCell.x;
      u.drawY = u.startCell.y;
    } else {
      // Fallback in case startCell is missing
      const emptyCell = hexCells.find(c=>c.side==='player'&&!c.unit);
      if(emptyCell){
        u.cell = emptyCell; emptyCell.unit = u;
        u.drawX = emptyCell.x; u.drawY = emptyCell.y;
      }
    }
    u.target=null;
    u.atkTimer=0;
    u.hp=u.maxHp; // Round bittiğinde tam can
  }
  
  // Clear visual effects
  dmgNumbers=[];
  projectiles=[];
  deathFx=[];
  
  setTimeout(()=>{
    if(playerLives<=0){
      clearGameState();
      showGameOver();
      return;
    }
    
    // === POVERTY PROTECTION ===
    // Minimum gold guarantee: always have at least 3 gold (enough for cheapest unit)
    if(gold < 3) {
      const bonus = 3 - gold;
      gold = 3;
      showPhaseText(`💸 Yardım! +${bonus}💰`, '#ffd700');
    }
    
    // If player has NO units AND low gold, give a free warrior
    if(playerUnits.length === 0 && gold < 4) {
      const freeType = UNIT_TYPES[0]; // Savaşçı (cheapest)
      const freeCell = hexCells.filter(c => c.side === 'player' && !c.unit)[0];
      if(freeCell) {
        const freeUnit = {
          name:freeType.name, origin:freeType.origin, class:freeType.class, emoji:freeType.emoji, color:freeType.color,
          hp:freeType.hp, maxHp:freeType.hp, atk:freeType.atk, spd:freeType.spd,
          range:freeType.range, cost:freeType.cost, healer:false, team:'player',
          cell:freeCell, target:null, atkTimer:0, drawX:freeCell.x, drawY:freeCell.y,
          hitShake:0, tier:1, ability:freeType.ability||null, shieldCharges:0,
          armorDebuff:0, combatStats:{damageDealt:0,damageTaken:0,healed:0,kills:0}
        };
        freeCell.unit = freeUnit;
        playerUnits.push(freeUnit);
        showPhaseText('🎁 Bedava Savaşçı!', '#0cf');
      }
    }
    
    if(!shopLocked) generateShop();
    else { renderShop(); toggleShopLock(); } // Unlock it after preserving it for one round
    updateGoldUI();updatePhaseUI();updateLivesUI();updateStreakUI();
    saveGameState();
    document.getElementById('btn-fight').disabled=false;
    document.getElementById('btn-refresh').disabled=false;
    render();
  },1500);
}

function showPhaseText(t,c){const el=document.getElementById('phase-overlay');el.textContent=t;el.style.color=c;el.style.opacity=1;setTimeout(()=>el.style.opacity=0,1200)}

function surrenderGame() {
  if (phase !== 'prep') {
    showPhaseText('Sadece hazırlık aşamasında pes edebilirsin!', '#f44');
    return;
  }
  if (!confirm("Pes etmek istediğine emin misin? Bu oyun sonlanacak ve skorun kaydedilecek.")) return;
  
  // Cancel any lingering combat animation just in case
  if(animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
  
  clearGameState();
  showGameOver();
}

function showGameOver(){
  document.getElementById('gameover').classList.add('show');
  document.getElementById('go-rounds').textContent=round;
  document.getElementById('go-wins').textContent=totalWins;
  document.getElementById('go-kills').textContent=totalKills;
  
  const guestWarning = document.getElementById('go-guest-warning');
  if (guestWarning) {
    if (typeof leaderboardManager!=='undefined' && !leaderboardManager.username) {
      guestWarning.style.display = 'block';
    } else {
      guestWarning.style.display = 'none';
    }
  }

  if(typeof updateMenuStats==='function')updateMenuStats();
  // Online sıralama tablosuna skor gönder
  if(typeof leaderboardManager!=='undefined' && leaderboardManager.username) {
    leaderboardManager.submitScore(round, totalWins, totalKills).then(result => {
      if(result.ok) console.log('Skor gönderildi! Sıra:', result.rank);
      else console.warn('Skor gönderilemedi:', result.error);
    });
  }
}

// restartGame defined below at end of file

// === INPUT ===
function saveGameState(){
  if(typeof updateSynergies === 'function') updateSynergies();
  if(playerLives <= 0) { clearGameState(); return; }
  const state = {
    gold, round, playerLives, winStreak, totalWins, totalKills, shop: shopSlots, lastMeteorRound,
    units: playerUnits.map(u=>({
      name: u.name, emoji: u.emoji, color: u.color, hp: u.hp, maxHp: u.maxHp, atk: u.atk,
      spd: u.spd, range: u.range, cost: u.cost, healer: u.healer||false, tier: u.tier||1,
      col: u.cell.col, row: u.cell.row,
      ability: u.ability||null, shieldCharges: u.shieldCharges||0,
      origin: u.origin, class: u.class
    }))
  };
  localStorage.setItem('hexSavas_activeRun', JSON.stringify(state));
}

function clearGameState(){
  localStorage.removeItem('hexSavas_activeRun');
}

function idleLoop(){if(phase==='prep'&&typeof currentScreen!=='undefined'&&currentScreen==='game')render();requestAnimationFrame(idleLoop)}

function initGame(){
  console.log('initGame called');
  
  // Cancel any lingering combat animation
  if(animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
  
  canvas = document.getElementById('hex-canvas');
  ctx = canvas.getContext('2d');
  
  if(typeof metaManager !== 'undefined') {
    gold = 10 + metaManager.getEffect('starting_gold');
    hasFreeReroll = metaManager.getEffect('free_reroll');
  } else {
    gold = 10;
  }
  
  round=1;phase='prep';playerLives=5;winStreak=0;totalWins=0;totalKills=0;
  lastMeteorRound=-5;
  playerUnits=[];enemyUnits=[];selectedShopUnit=null;dmgNumbers=[];projectiles=[];deathFx=[];
  hexCells=[];
  resize();
  for(const c of hexCells)c.unit=null;
  
  const savedRun = localStorage.getItem('hexSavas_activeRun');
  let restored = false;
  if(savedRun){
    try {
      const state = JSON.parse(savedRun);
      gold = state.gold; round = state.round; playerLives = state.playerLives; 
      winStreak = state.winStreak; totalWins = state.totalWins || 0; totalKills = state.totalKills || 0;
      lastMeteorRound = state.lastMeteorRound || -5;
      if(state.shop && state.shop.length>0) shopSlots = state.shop;
      state.units.forEach(su=>{
        const cell = hexCells.find(c=>c.col===su.col && c.row===su.row);
        if(cell){
          // Geriye dönük uyumluluk: Eski kayıtlarda origin ve class yoksa ekle
          if (!su.origin || !su.class) {
             const baseDef = UNIT_TYPES.find(t => t.name === su.name);
             if (baseDef) {
                 su.origin = baseDef.origin;
                 su.class = baseDef.class;
             }
          }
          // Restore ability from save or look up from UNIT_TYPES
          let ability = su.ability || null;
          if(!ability){
            const baseType = UNIT_TYPES.find(t=>t.name===su.name);
            if(baseType) ability = baseType.ability || null;
          }
          const u = {
            ...su, tier: su.tier||1, team:'player', cell, target:null, atkTimer:0,
            drawX:cell.x, drawY:cell.y, hitShake:0, healer: su.healer||false,
            ability: ability,
            combatStats:{damageDealt:0,damageTaken:0,healed:0,kills:0},
            armorDebuff: 0,
            shieldCharges: su.shieldCharges || (ability && ability.id==='shieldBlock' ? 3 : 0)
          };
          cell.unit = u; playerUnits.push(u);
        }
      });
      restored = true;
      checkMerge();
    } catch(e) { 
      console.error('Restore error, clearing corrupt save:', e);
      localStorage.removeItem('hexSavas_activeRun');
    }
  }
  
  if(!restored) generateShop();
  else renderShop();
  
  updateGoldUI();updateLivesUI();updateStreakUI();updatePhaseUI();
  if(typeof updateSynergies === 'function') updateSynergies();
  if(typeof storeManager !== 'undefined') storeManager.updateGemUI();
  document.getElementById('btn-fight').disabled=false;
  document.getElementById('btn-refresh').disabled=false;
  render();
  if(!gameInitialized){
    canvas.addEventListener('mousedown',e=>{
      if(phase!=='prep')return;
      const r=canvas.getBoundingClientRect();
      dragMouseX=e.clientX-r.left; dragMouseY=e.clientY-r.top;
      const cell=pixelToHex(dragMouseX,dragMouseY);
      if(cell&&cell.side==='player'){
        if(selectedShopUnit&&!cell.unit){
          placeUnit(cell);
        }else if(!selectedShopUnit&&cell.unit){
          isDragging=true; dragUnit=cell.unit; dragStartCell=cell;
          document.getElementById('sell-zone').style.display='block';
        }
      }
    });
    canvas.addEventListener('mousemove',e=>{
      const r=canvas.getBoundingClientRect();
      const mx=e.clientX-r.left, my=e.clientY-r.top;
      const cell=pixelToHex(mx,my);
      const tt=document.getElementById('tooltip');
      if(isDragging){
        dragMouseX=mx; dragMouseY=my;
        tt.style.display='none';
        
        // Highlight sell zone if hovering
        const sz = document.getElementById('sell-zone');
        const szRect = sz.getBoundingClientRect();
        if(e.clientX >= szRect.left && e.clientX <= szRect.right && e.clientY >= szRect.top && e.clientY <= szRect.bottom) {
          sz.classList.add('active');
        } else {
          sz.classList.remove('active');
        }
        return;
      }
      if(cell&&cell.unit){
        const u=cell.unit;tt.style.display='block';tt.style.left=(e.clientX+12)+'px';tt.style.top=(e.clientY-40)+'px';
        const abDesc=u.ability?`<br>✨ Yetenek: <b>${u.ability.name}</b><br><span style="font-size:9px;color:#aaa">${u.ability.desc}</span>`:'';
        tt.querySelector('.tt-name').textContent=`${u.emoji} ${u.name}`;tt.querySelector('.tt-name').style.color=u.team==='player'?'#0cf':'#f66';
        tt.querySelector('.tt-stat').innerHTML=`❤️ ${u.hp}/${u.maxHp}<br>⚔️ Saldırı: ${u.atk}<br>📏 Menzil: ${u.range}${abDesc}<br>${u.team==='player'?'💡 Sağ tıkla: Sat':''}`;
        const tr=tt.getBoundingClientRect();if(tr.right>window.innerWidth)tt.style.left=(e.clientX-tr.width-8)+'px';if(tr.bottom>window.innerHeight)tt.style.top=(e.clientY-tr.height-8)+'px'
      }
      else tt.style.display='none';
    });
    canvas.addEventListener('mouseup',e=>{
      if(!isDragging)return;
      isDragging=false;
      const sz = document.getElementById('sell-zone');
      const szRect = sz.getBoundingClientRect();
      const dropOnSell = (e.clientX >= szRect.left && e.clientX <= szRect.right && e.clientY >= szRect.top && e.clientY <= szRect.bottom);
      
      sz.style.display='none';
      sz.classList.remove('active');
      
      const r=canvas.getBoundingClientRect();
      
      // Check if dropped on sell zone
      if(dropOnSell) {
        // Güvenli geri koy ki sellUnit doğru çalışsın
        dragUnit.drawX=dragStartCell.x; dragUnit.drawY=dragStartCell.y;
        dragUnit.cell=dragStartCell; dragStartCell.unit=dragUnit;
        sellUnit(dragStartCell);
        dragUnit=null; dragStartCell=null;
        saveGameState(); render();
        return;
      }

      const cell=pixelToHex(e.clientX-r.left,e.clientY-r.top);
      if(cell&&cell.side==='player'){
        if(!cell.unit){
          dragStartCell.unit=null; cell.unit=dragUnit; dragUnit.cell=cell; dragUnit.drawX=cell.x; dragUnit.drawY=cell.y;
        }else if(cell.unit!==dragUnit){
          const target=cell.unit;
          dragStartCell.unit=target; target.cell=dragStartCell; target.drawX=dragStartCell.x; target.drawY=dragStartCell.y;
          cell.unit=dragUnit; dragUnit.cell=cell; dragUnit.drawX=cell.x; dragUnit.drawY=cell.y;
        }else{
          // Aynı hücreye bırakıldı
          dragUnit.drawX=dragStartCell.x; dragUnit.drawY=dragStartCell.y;
        }
      }else{
        // Geçersiz alana bırakıldı, birliği geri koy
        if(dragUnit && dragStartCell){
          dragUnit.drawX=dragStartCell.x; dragUnit.drawY=dragStartCell.y;
          dragUnit.cell=dragStartCell; dragStartCell.unit=dragUnit;
        }
      }
      dragUnit=null; dragStartCell=null;
      saveGameState(); render();
    });
    canvas.addEventListener('contextmenu',e=>{
      e.preventDefault();
      if(isDragging){
        isDragging=false;
        // Güvenli iptal: birliği orijinal yerine geri koy
        if(dragUnit && dragStartCell){
          dragUnit.drawX=dragStartCell.x; dragUnit.drawY=dragStartCell.y;
          dragUnit.cell=dragStartCell; dragStartCell.unit=dragUnit;
        }
        dragUnit=null; dragStartCell=null;
        render();
        return;
      }
      const r=canvas.getBoundingClientRect();
      const cell=pixelToHex(e.clientX-r.left,e.clientY-r.top);
      if(cell)sellUnit(cell);
    });

    // === TOUCH EVENT HANDLERS (Mobil/APK desteği) ===
    let touchDragTimeout = null;
    canvas.addEventListener('touchstart',e=>{
      e.preventDefault(); // Sayfa kaymasını engelle
      if(phase!=='prep')return;
      const touch=e.touches[0];
      const r=canvas.getBoundingClientRect();
      dragMouseX=touch.clientX-r.left; dragMouseY=touch.clientY-r.top;
      const cell=pixelToHex(dragMouseX,dragMouseY);
      if(cell&&cell.side==='player'){
        if(selectedShopUnit&&!cell.unit){
          placeUnit(cell);
        }else if(!selectedShopUnit&&cell.unit){
          isDragging=true; dragUnit=cell.unit; dragStartCell=cell;
          document.getElementById('sell-zone').style.display='block';
        }
      }
    },{passive:false});

    canvas.addEventListener('touchmove',e=>{
      e.preventDefault(); // Sayfa kaymasını engelle
      if(!isDragging)return;
      const touch=e.touches[0];
      const r=canvas.getBoundingClientRect();
      dragMouseX=touch.clientX-r.left; dragMouseY=touch.clientY-r.top;
      
      const sz = document.getElementById('sell-zone');
      const szRect = sz.getBoundingClientRect();
      if(touch.clientX >= szRect.left && touch.clientX <= szRect.right && touch.clientY >= szRect.top && touch.clientY <= szRect.bottom) {
        sz.classList.add('active');
      } else {
        sz.classList.remove('active');
      }
    },{passive:false});

    canvas.addEventListener('touchend',e=>{
      e.preventDefault();
      if(!isDragging){
        // Tap to place selected shop unit
        if(selectedShopUnit && e.changedTouches.length>0){
          const touch=e.changedTouches[0];
          const r=canvas.getBoundingClientRect();
          const cell=pixelToHex(touch.clientX-r.left,touch.clientY-r.top);
          if(cell&&cell.side==='player'&&!cell.unit) placeUnit(cell);
        }
        return;
      }
      isDragging=false;
      const sz = document.getElementById('sell-zone');
      const szRect = sz.getBoundingClientRect();
      let dropOnSell = false;
      let touch = null;
      if(e.changedTouches.length>0){
        touch=e.changedTouches[0];
        dropOnSell = (touch.clientX >= szRect.left && touch.clientX <= szRect.right && touch.clientY >= szRect.top && touch.clientY <= szRect.bottom);
      }
      
      sz.style.display='none';
      sz.classList.remove('active');
      
      if(touch){
        const r=canvas.getBoundingClientRect();
        
        if(dropOnSell) {
          dragUnit.drawX=dragStartCell.x; dragUnit.drawY=dragStartCell.y;
          dragUnit.cell=dragStartCell; dragStartCell.unit=dragUnit;
          sellUnit(dragStartCell);
          dragUnit=null; dragStartCell=null;
          saveGameState(); render();
          return;
        }
        
        const cell=pixelToHex(touch.clientX-r.left,touch.clientY-r.top);
        if(cell&&cell.side==='player'){
          if(!cell.unit){
            dragStartCell.unit=null; cell.unit=dragUnit; dragUnit.cell=cell; dragUnit.drawX=cell.x; dragUnit.drawY=cell.y;
          }else if(cell.unit!==dragUnit){
            const target=cell.unit;
            dragStartCell.unit=target; target.cell=dragStartCell; target.drawX=dragStartCell.x; target.drawY=dragStartCell.y;
            cell.unit=dragUnit; dragUnit.cell=cell; dragUnit.drawX=cell.x; dragUnit.drawY=cell.y;
          }else{
            // Aynı hücreye bırakıldı, geri koy
            dragUnit.drawX=dragStartCell.x; dragUnit.drawY=dragStartCell.y;
          }
        }else{
          // Geçersiz yere bırakıldı, geri koy
          dragUnit.drawX=dragStartCell.x; dragUnit.drawY=dragStartCell.y;
          dragUnit.cell=dragStartCell; dragStartCell.unit=dragUnit;
        }
      }else{
        // Touch bilgisi yok, güvenli geri koy
        if(dragUnit && dragStartCell){
          dragUnit.drawX=dragStartCell.x; dragUnit.drawY=dragStartCell.y;
          dragUnit.cell=dragStartCell; dragStartCell.unit=dragUnit;
        }
      }
      dragUnit=null; dragStartCell=null;
      saveGameState(); render();
    },{passive:false});

    canvas.addEventListener('touchcancel',e=>{
      // Dokunma iptal edildi, birliği güvenle geri koy
      if(isDragging && dragUnit && dragStartCell){
        isDragging=false;
        dragUnit.drawX=dragStartCell.x; dragUnit.drawY=dragStartCell.y;
        dragUnit.cell=dragStartCell; dragStartCell.unit=dragUnit;
        dragUnit=null; dragStartCell=null;
        render();
      }
    });

    window.addEventListener('resize',()=>{if(canvas)resize()});
    idleLoop();
    gameInitialized=true;
  }
}

function restartGame(){
  document.getElementById('gameover').classList.remove('show');
  clearGameState();
  initGame();
}
