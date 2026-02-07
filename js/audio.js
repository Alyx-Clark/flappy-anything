export class AudioManager {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('flappy-muted') === 'true';
    this.theme = null;
  }

  ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setTheme(theme) {
    this.theme = theme;
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('flappy-muted', this.muted);
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  play(sound) {
    if (this.muted || !this.theme) return;
    this.ensureContext();

    const params = this.theme.sounds[sound];
    if (!params) return;

    if (sound === 'crash') {
      this.playCrash(params);
    } else if (sound === 'score') {
      this.playScore(params);
    } else {
      this.playTone(params);
    }
  }

  playTone(p) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = p.wave;
    osc.frequency.setValueAtTime(p.freq, t);
    if (p.freqEnd) {
      osc.frequency.linearRampToValueAtTime(p.freqEnd, t + p.duration);
    }

    gain.gain.setValueAtTime(p.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + p.duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + p.duration);
  }

  playScore(p) {
    const t = this.ctx.currentTime;

    // Two-tone chime
    for (let i = 0; i < p.freqs.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = p.wave;
      osc.frequency.setValueAtTime(p.freqs[i], t + i * p.spacing);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(p.volume, t + i * p.spacing + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * p.spacing + p.duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + i * p.spacing);
      osc.stop(t + i * p.spacing + p.duration);
    }
  }

  playCrash(p) {
    const t = this.ctx.currentTime;
    const dur = p.duration;

    // Noise burst
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(p.noiseVolume, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noise.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(t);

    // Low thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(p.thudFreq, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + dur);
    gain.gain.setValueAtTime(p.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  }
}
