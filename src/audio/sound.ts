// Alle Klänge werden im Browser erzeugt (Web Audio). Es gibt keine Audiodateien.

export type Sfx =
  | 'click'
  | 'build'
  | 'buildBig'
  | 'truck'
  | 'demolish'
  | 'error'
  | 'undo'
  | 'coin'
  | 'shipDone'
  | 'horn'
  | 'mission'
  | 'bad'
  | 'day'
  | 'train'
  | 'thunder'
  | 'foghorn'
  | 'level'
  | 'upgrade';

const KEY = 'hafen-imperium-sound';

/** Mindestabstand in Sekunden, damit sich schnelle Wiederholungen nicht stapeln. */
const GAP: Partial<Record<Sfx, number>> = {
  build: 0.05,
  demolish: 0.07,
  coin: 0.16,
  error: 0.25,
  horn: 2.5,
  bad: 0.6,
  shipDone: 0.4,
  train: 1.5,
  thunder: 2,
  foghorn: 2,
};

interface ToneOpts {
  type?: OscillatorType;
  vol?: number;
  /** Start in Sekunden ab jetzt */
  at?: number;
  /** Zielfrequenz für ein Gleiten */
  to?: number;
  attack?: number;
}

export class Sound {
  enabled = true;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private last: Partial<Record<Sfx, number>> = {};
  private ambGain: GainNode | null = null;
  private ambFilter: BiquadFilterNode | null = null;
  private storm = false;

  constructor() {
    try {
      this.enabled = localStorage.getItem(KEY) !== '0';
    } catch {
      /* ohne Speicher bleibt der Ton an */
    }
  }

  /** Startet den Ton. Browser erlauben das nur aus einer Nutzeraktion heraus (Tippen, Taste). */
  unlock() {
    if (!this.enabled) return;
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.9;
        this.master.connect(this.ctx.destination);
        this.startAmbient();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    try {
      localStorage.setItem(KEY, on ? '1' : '0');
    } catch {
      /* Einstellung gilt dann nur für diese Sitzung */
    }
    if (on) this.unlock();
    else if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  /** Pausiert den Ton, solange der Tab im Hintergrund ist. */
  setHidden(hidden: boolean) {
    if (!this.ctx || !this.enabled) return;
    if (hidden && this.ctx.state === 'running') void this.ctx.suspend();
    else if (!hidden && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private noiseBuffer(): AudioBuffer {
    const ctx = this.ctx!;
    if (!this.noiseBuf) {
      const len = ctx.sampleRate * 2;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noiseBuf;
  }

  /** Leises Meeresrauschen, das langsam an- und abschwillt. */
  private startAmbient() {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    const gain = ctx.createGain();
    gain.gain.value = 0.05;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.11;
    const depth = ctx.createGain();
    depth.gain.value = 0.03;
    lfo.connect(depth).connect(gain.gain);
    src.connect(lp).connect(gain).connect(this.master!);
    src.start();
    lfo.start();
    this.ambGain = gain;
    this.ambFilter = lp;
    this.setStorm(this.storm);
  }

  /** Bei Sturm wird das Rauschen lauter und heller (Wind und Regen). */
  setStorm(on: boolean) {
    this.storm = on;
    if (!this.ctx || !this.ambGain || !this.ambFilter) return;
    const t = this.ctx.currentTime;
    this.ambGain.gain.setTargetAtTime(on ? 0.15 : 0.05, t, 1.2);
    this.ambFilter.frequency.setTargetAtTime(on ? 1700 : 520, t, 1.2);
  }

  private tone(freq: number, dur: number, o: ToneOpts = {}) {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + (o.at ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol ?? 0.1, t0 + (o.attack ?? 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master!);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  private noise(dur: number, o: { vol?: number; freq?: number; type?: BiquadFilterType; at?: number } = {}) {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + (o.at ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    const f = ctx.createBiquadFilter();
    f.type = o.type ?? 'lowpass';
    f.frequency.value = o.freq ?? 800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.vol ?? 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.master!);
    src.start(t0, Math.random());
    src.stop(t0 + dur + 0.03);
  }

  play(name: Sfx) {
    const ctx = this.ctx;
    if (!this.enabled || !ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const gap = GAP[name] ?? 0.03;
    if (now - (this.last[name] ?? -9) < gap) return;
    this.last[name] = now;
    const jitter = 1 + (Math.random() - 0.5) * 0.08;

    switch (name) {
      case 'click':
        this.tone(720, 0.05, { type: 'triangle', vol: 0.07, to: 940 });
        break;
      case 'build':
        this.noise(0.07, { vol: 0.22, freq: 1100 });
        this.tone(150 * jitter, 0.11, { vol: 0.26, to: 85 });
        break;
      case 'buildBig':
        this.noise(0.12, { vol: 0.26, freq: 700 });
        this.tone(110, 0.2, { vol: 0.3, to: 60 });
        this.tone(540, 0.09, { type: 'square', vol: 0.035, at: 0.03 });
        this.tone(810, 0.16, { type: 'triangle', vol: 0.05, at: 0.06 });
        break;
      case 'truck':
        this.tone(95, 0.22, { type: 'sawtooth', vol: 0.07, to: 150 });
        this.tone(880, 0.06, { type: 'square', vol: 0.03, at: 0.2 });
        this.tone(880, 0.06, { type: 'square', vol: 0.03, at: 0.3 });
        break;
      case 'demolish':
        this.noise(0.2, { vol: 0.28, freq: 520 });
        this.tone(120 * jitter, 0.2, { vol: 0.22, to: 48 });
        break;
      case 'error':
        this.tone(160, 0.09, { type: 'square', vol: 0.06 });
        this.tone(140, 0.12, { type: 'square', vol: 0.06, at: 0.1 });
        break;
      case 'undo':
        this.tone(640, 0.13, { type: 'triangle', vol: 0.1, to: 320 });
        break;
      case 'coin':
        this.tone(1320 * jitter, 0.05, { vol: 0.035 });
        this.tone(1760 * jitter, 0.1, { vol: 0.04, at: 0.045 });
        break;
      case 'shipDone':
        this.noise(0.05, { vol: 0.08, freq: 5000, type: 'highpass' });
        this.tone(988, 0.08, { type: 'triangle', vol: 0.11 });
        this.tone(1319, 0.3, { type: 'triangle', vol: 0.12, at: 0.08 });
        this.tone(1976, 0.35, { vol: 0.05, at: 0.08 });
        break;
      case 'horn': {
        const t0 = now;
        const g = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 460;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.14);
        g.gain.setValueAtTime(0.12, t0 + 0.75);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.25);
        for (const f of [98, 147.5]) {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = f;
          osc.connect(lp);
          osc.start(t0);
          osc.stop(t0 + 1.3);
        }
        lp.connect(g).connect(this.master!);
        break;
      }
      case 'mission':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.22, { type: 'triangle', vol: 0.11, at: i * 0.09 }));
        break;
      case 'bad':
        this.tone(392, 0.16, { type: 'triangle', vol: 0.1 });
        this.tone(311, 0.3, { type: 'triangle', vol: 0.1, at: 0.15 });
        break;
      case 'day':
        this.tone(880, 0.9, { vol: 0.05 });
        this.tone(1320, 0.9, { vol: 0.03, at: 0.02 });
        break;
      case 'train':
        // Zweiklang-Pfeife, zweimal
        for (const at of [0, 0.42]) {
          this.tone(622, 0.3, { type: 'triangle', vol: 0.08, at, attack: 0.03 });
          this.tone(740, 0.3, { type: 'triangle', vol: 0.07, at, attack: 0.03 });
        }
        break;
      case 'thunder':
        this.noise(1.6, { vol: 0.5, freq: 160 });
        this.noise(0.5, { vol: 0.25, freq: 420, at: 0.05 });
        this.tone(58, 1.3, { vol: 0.3, to: 34 });
        break;
      case 'foghorn':
        this.tone(73, 1.6, { type: 'sawtooth', vol: 0.09, attack: 0.25 });
        this.tone(110, 1.6, { type: 'sine', vol: 0.09, attack: 0.25 });
        break;
      case 'level':
        [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', vol: 0.12, at: i * 0.11 }));
        this.tone(1318.5, 0.7, { vol: 0.08, at: 0.55 });
        this.tone(1568, 0.7, { vol: 0.06, at: 0.55 });
        break;
      case 'upgrade':
        this.noise(0.1, { vol: 0.18, freq: 2400, type: 'highpass' });
        this.tone(440, 0.12, { type: 'triangle', vol: 0.1, to: 880 });
        this.tone(1175, 0.3, { type: 'triangle', vol: 0.09, at: 0.11 });
        break;
    }
  }
}
