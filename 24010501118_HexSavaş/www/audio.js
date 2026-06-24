class AudioManagerClass {
  constructor() {
    this.ctx = null;
    this.sfxVolume = 0.5;
    this.musicVolume = 0.3;
    this.musicOsc = null;
    this.musicGain = null;
    this.isMusicPlaying = false;
    this.initialized = false;
    this.noiseBuffer = null;
  }

  init() {
    if (this.initialized) return;
    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.initialized = true;
      
      // Create noise buffer
      const bufferSize = this.ctx.sampleRate * 2;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  setSfxVolume(v) { this.sfxVolume = parseFloat(v); }
  
  setMusicVolume(v) { 
    this.musicVolume = parseFloat(v);
    if(this.musicGain) {
      this.musicGain.gain.setTargetAtTime(this.musicVolume * 0.1, this.ctx.currentTime, 0.1);
    }
  }

  play(soundName) {
    if (!this.initialized) this.init();
    if (!this.ctx || this.sfxVolume <= 0) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;

    const playTone = (type, freq1, freq2, dur, vol, delay=0) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq1, t + delay);
      if(freq2) osc.frequency.exponentialRampToValueAtTime(freq2, t + delay + dur);
      gain.gain.setValueAtTime(this.sfxVolume * vol, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, t + delay + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + delay);
      osc.stop(t + delay + dur);
    };

    const playNoise = (freq, dur, vol) => {
      if(!this.noiseBuffer) return;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq, t);
      filter.frequency.exponentialRampToValueAtTime(100, t + dur);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.sfxVolume * vol, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + dur);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(t);
      noise.stop(t + dur);
    };

    switch(soundName) {
      case 'attack':
        playTone('square', 200, 40, 0.15, 0.4);
        playNoise(1000, 0.1, 0.3); // Punch
        break;
      case 'heal':
        playTone('sine', 400, 800, 0.3, 0.3);
        playTone('sine', 600, 1200, 0.3, 0.2); // Chime effect
        break;
      case 'death':
        playTone('sawtooth', 100, 10, 0.4, 0.5);
        playNoise(2000, 0.4, 0.6); // Explosion
        break;
      case 'buy':
        // Arpeggio
        playTone('sine', 800, null, 0.1, 0.3);
        playTone('sine', 1200, null, 0.15, 0.3, 0.05);
        break;
      case 'merge':
        // Major chord arpeggio
        playTone('triangle', 440, null, 0.3, 0.4);
        playTone('triangle', 554, null, 0.3, 0.4, 0.1);
        playTone('triangle', 659, null, 0.4, 0.4, 0.2);
        playTone('sine', 880, null, 0.6, 0.4, 0.3);
        break;
      case 'meteor':
        playTone('sine', 150, 10, 1.0, 0.8); // Sub bass drop
        playNoise(5000, 0.8, 1.0); // Big explosion
        break;
    }
  }

  playMusic(type = 'ambient') {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    this.stopMusic();

    if (this.musicVolume <= 0) return;

    this.musicOsc = this.ctx.createOscillator();
    this.musicGain = this.ctx.createGain();
    
    this.musicOsc.connect(this.musicGain);
    this.musicGain.connect(this.ctx.destination);

    const t = this.ctx.currentTime;
    
    if (type === 'boss') {
      this.musicOsc.type = 'sawtooth';
      this.musicOsc.frequency.setValueAtTime(60, t);
    } else {
      this.musicOsc.type = 'sine';
      this.musicOsc.frequency.setValueAtTime(100, t);
    }

    this.musicGain.gain.setValueAtTime(0, t);
    this.musicGain.gain.linearRampToValueAtTime(this.musicVolume * 0.1, t + 2);
    
    // Simple LFO for ambient feel
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = type === 'boss' ? 2 : 0.2;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = type === 'boss' ? 10 : 5;
    
    lfo.connect(lfoGain);
    lfoGain.connect(this.musicOsc.frequency);
    
    lfo.start();
    this.musicOsc.start();
    this.isMusicPlaying = true;
  }

  stopMusic() {
    if (this.musicOsc && this.isMusicPlaying) {
      const t = this.ctx.currentTime;
      this.musicGain.gain.setTargetAtTime(0, t, 0.5);
      setTimeout(() => {
        if(this.musicOsc) {
          this.musicOsc.stop();
          this.musicOsc.disconnect();
          this.musicOsc = null;
        }
      }, 1000);
      this.isMusicPlaying = false;
    }
  }
}

// Create global instance - this is what all other files reference
var AudioManager = new AudioManagerClass();

// Auto-initialize on first user interaction
document.addEventListener('click', () => {
  if (!AudioManager.initialized) {
    AudioManager.init();
    if(window.gameSettings && window.gameSettings.musicVolume > 0) {
       AudioManager.playMusic('ambient');
    }
  }
}, { once: true });
