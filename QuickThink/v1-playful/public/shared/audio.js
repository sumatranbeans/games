// Quick Think - Audio System
// Procedural audio using Web Audio API for background music and sound effects

class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.currentMusic = null;
    this.isMuted = false;
    this.isInitialized = false;

    // Volume levels
    this.volumes = {
      master: 0.7,
      music: 0.3,
      sfx: 0.6
    };
  }

  // Must be called after user interaction (click/tap)
  async init() {
    if (this.isInitialized) return;

    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();

      // Create gain nodes
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volumes.master;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.volumes.music;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.volumes.sfx;
      this.sfxGain.connect(this.masterGain);

      this.isInitialized = true;
      console.log('Audio system initialized');
    } catch (e) {
      console.warn('Audio initialization failed:', e);
    }
  }

  // Resume context if suspended (required by browsers)
  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  // Toggle mute
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : this.volumes.master;
    }
    return this.isMuted;
  }

  // Set volume (0-1)
  setVolume(type, value) {
    this.volumes[type] = Math.max(0, Math.min(1, value));
    if (type === 'master' && this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : this.volumes.master;
    } else if (type === 'music' && this.musicGain) {
      this.musicGain.gain.value = this.volumes.music;
    } else if (type === 'sfx' && this.sfxGain) {
      this.sfxGain.gain.value = this.volumes.sfx;
    }
  }

  // ==================== SOUND EFFECTS ====================

  // Play a chime (player joined, success)
  playChime(frequency = 880, duration = 0.15) {
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.5, this.ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Play ascending chime (player join)
  playPlayerJoin() {
    if (!this.ctx || this.isMuted) return;

    [440, 550, 660].forEach((freq, i) => {
      setTimeout(() => this.playChime(freq, 0.12), i * 80);
    });
  }

  // Play game start jingle
  playGameStart() {
    if (!this.ctx || this.isMuted) return;

    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => this.playChime(freq, 0.2), i * 100);
    });
  }

  // Play whoosh (category reveal, transitions)
  playWhoosh() {
    if (!this.ctx || this.isMuted) return;

    const duration = 0.3;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    // White noise approximation with oscillator
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2000, this.ctx.currentTime + duration * 0.3);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + duration);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(3000, this.ctx.currentTime + duration * 0.3);
    filter.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + duration);
    filter.Q.value = 1;

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Play countdown tick
  playTick(pitch = 1) {
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 800 * pitch;

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  // Play GO! sound
  playGo() {
    if (!this.ctx || this.isMuted) return;

    // Chord burst
    [523, 659, 784].forEach(freq => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    });
  }

  // Play urgent beep (timer warning)
  playUrgent() {
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.value = 880;

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.setValueAtTime(0, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  // Play buzzer (time's up)
  playBuzzer() {
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 150;

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  // Play card flip sound
  playCardFlip() {
    if (!this.ctx || this.isMuted) return;

    // Quick noise burst
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    source.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.value = 2000;
    gain.gain.value = 0.3;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    source.start();
  }

  // Play success ding (unique answer)
  playSuccess() {
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.setValueAtTime(1100, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  // Play fail buzz (duplicate answer)
  playFail() {
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 180;

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  // Play point tally tick
  playPointTick() {
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 1200 + Math.random() * 200;

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  // Play victory fanfare
  playVictory() {
    if (!this.ctx || this.isMuted) return;

    const notes = [
      { freq: 523, time: 0 },
      { freq: 659, time: 0.15 },
      { freq: 784, time: 0.3 },
      { freq: 1047, time: 0.5 },
      { freq: 784, time: 0.65 },
      { freq: 1047, time: 0.8 }
    ];

    notes.forEach(note => {
      setTimeout(() => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.value = note.freq;

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
      }, note.time * 1000);
    });
  }

  // ==================== BACKGROUND MUSIC ====================

  // Stop current music
  stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.forEach(node => {
        try {
          node.stop();
        } catch (e) {}
      });
      this.currentMusic = null;
    }
  }

  // Play lobby music - chill, anticipatory
  playLobbyMusic() {
    if (!this.ctx || this.isMuted) return;
    this.stopMusic();

    const nodes = [];

    // Simple ambient pad
    const createPad = (freq, detune = 0) => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = detune;

      filter.type = 'lowpass';
      filter.frequency.value = 800;

      gain.gain.value = 0.08;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start();
      nodes.push(osc);
      return osc;
    };

    // Create warm pad chord (C major 7)
    createPad(130.81); // C3
    createPad(164.81, 5); // E3
    createPad(196.00, -5); // G3
    createPad(246.94); // B3

    // Add subtle LFO modulation
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.2;
    lfoGain.gain.value = 3;
    lfo.connect(lfoGain);
    nodes.forEach(osc => {
      if (osc.detune) {
        lfoGain.connect(osc.detune);
      }
    });
    lfo.start();
    nodes.push(lfo);

    this.currentMusic = nodes;
  }

  // Play gameplay music - upbeat, energetic
  playGameplayMusic() {
    if (!this.ctx || this.isMuted) return;
    this.stopMusic();

    const nodes = [];
    const now = this.ctx.currentTime;

    // Bass line with simple pattern
    const bass = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();

    bass.type = 'triangle';
    bass.frequency.value = 110;
    bassGain.gain.value = 0.12;

    bass.connect(bassGain);
    bassGain.connect(this.musicGain);
    bass.start();
    nodes.push(bass);

    // Rhythmic pulse
    const pulse = () => {
      if (!this.currentMusic || !this.currentMusic.includes(bass)) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.value = 220;

      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);

      setTimeout(pulse, 500);
    };

    setTimeout(pulse, 250);

    this.currentMusic = nodes;
  }

  // Play tense music - for typing phase
  playTenseMusic() {
    if (!this.ctx || this.isMuted) return;
    this.stopMusic();

    const nodes = [];

    // Tense drone
    const drone = this.ctx.createOscillator();
    const droneGain = this.ctx.createGain();

    drone.type = 'sawtooth';
    drone.frequency.value = 55;
    droneGain.gain.value = 0.06;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    drone.connect(filter);
    filter.connect(droneGain);
    droneGain.connect(this.musicGain);
    drone.start();
    nodes.push(drone);

    // Pulsing high note
    const highOsc = this.ctx.createOscillator();
    const highGain = this.ctx.createGain();
    const highLfo = this.ctx.createOscillator();
    const highLfoGain = this.ctx.createGain();

    highOsc.type = 'sine';
    highOsc.frequency.value = 440;
    highGain.gain.value = 0.04;

    highLfo.frequency.value = 4;
    highLfoGain.gain.value = 0.03;

    highLfo.connect(highLfoGain);
    highLfoGain.connect(highGain.gain);

    highOsc.connect(highGain);
    highGain.connect(this.musicGain);

    highOsc.start();
    highLfo.start();
    nodes.push(highOsc, highLfo);

    this.currentMusic = nodes;
  }

  // Play reveal music - dramatic
  playRevealMusic() {
    if (!this.ctx || this.isMuted) return;
    this.stopMusic();

    const nodes = [];

    // Suspenseful low pad
    [65.41, 77.78, 98].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.06;

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start();
      nodes.push(osc);
    });

    this.currentMusic = nodes;
  }

  // Crossfade to new music
  async crossfadeTo(musicType) {
    if (!this.ctx || !this.musicGain) return;

    // Fade out current
    const fadeTime = 0.5;
    this.musicGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeTime);

    await new Promise(r => setTimeout(r, fadeTime * 1000));

    // Play new music
    switch (musicType) {
      case 'lobby':
        this.playLobbyMusic();
        break;
      case 'gameplay':
        this.playGameplayMusic();
        break;
      case 'tense':
        this.playTenseMusic();
        break;
      case 'reveal':
        this.playRevealMusic();
        break;
      case 'none':
        this.stopMusic();
        break;
    }

    // Fade in
    this.musicGain.gain.linearRampToValueAtTime(this.volumes.music, this.ctx.currentTime + fadeTime);
  }
}

// Global instance
const audioManager = new AudioManager();

// Auto-init on first user interaction
let audioInitPromise = null;
function ensureAudioInit() {
  if (audioManager.isInitialized) {
    return Promise.resolve();
  }
  if (!audioInitPromise) {
    audioInitPromise = audioManager.init().then(() => audioManager.resume());
  }
  return audioInitPromise;
}

['click', 'touchstart', 'keydown'].forEach(event => {
  document.addEventListener(event, async function initAudio() {
    await ensureAudioInit();
    document.removeEventListener(event, initAudio);
  }, { once: true });
});
