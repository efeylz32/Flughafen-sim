// Ruhige Hintergrundmusik, im Browser erzeugt (keine Audiodateien).
// Akkordflächen, ein weicher Bass und gezupfte Töne nach Zufall, damit es nie gleich klingt.

const KEY = 'hafen-imperium-music';

/** Frequenz einer MIDI-Note */
const hz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/** Akkordfolge in F-Dur: Fmaj7, Dm7, Bbmaj7, C(add9), dann Am7, Dm7, Gm7, C */
const CHORDS = [
  [53, 57, 60, 64],
  [50, 53, 57, 60],
  [46, 50, 53, 57],
  [48, 52, 55, 62],
  [45, 48, 52, 55],
  [50, 53, 57, 60],
  [43, 46, 50, 53],
  [48, 52, 55, 58],
];
/** Töne für die Melodie (F-Dur pentatonisch, zwei Oktaven) */
const SCALE = [65, 67, 69, 72, 74, 77, 79, 81, 84];

const BPM = 74;
const BEAT = 60 / BPM;

export class Music {
  enabled = true;
  private gain: GainNode | null = null;
  private nextBar = 0;
  private bar = 0;
  private last = 69;

  constructor() {
    try {
      this.enabled = localStorage.getItem(KEY) !== '0';
    } catch {
      /* ohne Speicher bleibt die Musik an */
    }
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    try {
      localStorage.setItem(KEY, on ? '1' : '0');
    } catch {
      /* gilt dann nur für diese Sitzung */
    }
    if (this.gain) {
      const t = this.gain.context.currentTime;
      this.gain.gain.cancelScheduledValues(t);
      this.gain.gain.setTargetAtTime(on ? 0.55 : 0, t, 0.4);
    }
  }

  /** Jedes Bild aufrufen: plant die nächsten Takte voraus, solange der Ton läuft */
  update(ctx: AudioContext | null, out: AudioNode | null) {
    if (!ctx || !out || ctx.state !== 'running') return;
    if (!this.gain) {
      this.gain = ctx.createGain();
      this.gain.gain.value = 0;
      this.gain.gain.setTargetAtTime(this.enabled ? 0.55 : 0, ctx.currentTime, 1.5);
      this.gain.connect(out);
      this.nextBar = ctx.currentTime + 0.3;
    }
    if (!this.enabled) {
      // Leise mitlaufen lassen ist unnötig: einfach nichts mehr planen
      this.nextBar = Math.max(this.nextBar, ctx.currentTime + 0.3);
      return;
    }
    // Nach einer Pause (App im Hintergrund) nicht alle verpassten Takte nachholen
    if (this.nextBar < ctx.currentTime - 1) this.nextBar = ctx.currentTime + 0.2;
    while (this.nextBar < ctx.currentTime + 1.5) {
      this.scheduleBar(ctx, this.nextBar);
      this.nextBar += BEAT * 4;
      this.bar++;
    }
  }

  private scheduleBar(ctx: AudioContext, t0: number) {
    const chord = CHORDS[this.bar % CHORDS.length];
    const dur = BEAT * 4;
    // Fläche: weiche Dreiecks-Oszillatoren durch einen Tiefpass
    for (const n of chord) this.pad(ctx, hz(n + 12), t0, dur * 1.15);
    // Bass auf 1 und 3
    this.pluck(ctx, hz(chord[0] - 12), t0, BEAT * 1.6, 0.16, 'sine');
    this.pluck(ctx, hz(chord[0] - 12), t0 + BEAT * 2, BEAT * 1.4, 0.12, 'sine');
    // Melodie: Achtel mit Pausen, kleine Schritte auf der Tonleiter
    const busy = 0.35 + 0.25 * Math.sin(this.bar / 5);
    for (let i = 0; i < 8; i++) {
      if (Math.random() > busy) continue;
      const idx = SCALE.indexOf(this.last);
      const step = Math.round((Math.random() - 0.5) * 4);
      const j = Math.max(0, Math.min(SCALE.length - 1, (idx < 0 ? 3 : idx) + step));
      this.last = SCALE[j];
      this.pluck(ctx, hz(this.last), t0 + i * (BEAT / 2) + (i % 2 ? 0.03 : 0), BEAT * 1.2, 0.055, 'triangle');
    }
  }

  private pad(ctx: AudioContext, f: number, t: number, dur: number) {
    const o = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const flt = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = 'triangle';
    o2.type = 'sine';
    o.frequency.value = f;
    o2.frequency.value = f * 1.004;
    flt.type = 'lowpass';
    flt.frequency.value = 900;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.022, t + 1.2);
    g.gain.setValueAtTime(0.022, t + dur - 1);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.6);
    o.connect(flt);
    o2.connect(flt);
    flt.connect(g);
    g.connect(this.gain!);
    o.start(t);
    o2.start(t);
    o.stop(t + dur + 0.7);
    o2.stop(t + dur + 0.7);
  }

  private pluck(ctx: AudioContext, f: number, t: number, dur: number, vol: number, type: OscillatorType) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g);
    g.connect(this.gain!);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}
