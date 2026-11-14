import { Renderer, View } from './render/renderer';
import { BuildTool, GRID_H, GRID_W, SHIP_LEN, T, TICKS_PER_SEC, TILE, Tool } from './sim/data';
import { buildDemo } from './sim/demo';
import { Sim } from './sim/sim';
import type { UI } from './ui/ui';

const SAVE_KEY = 'hafen-imperium-save-v1';
export const PAINT_TOOLS: Tool[] = ['kai', 'road', 'yard', 'demolish'];

export class Game {
  sim = new Sim();
  renderer = new Renderer();
  ui!: UI;
  /** 0 = Pause */
  speed = 1;
  lastSpeed = 1;
  tool: Tool = 'view';
  overlay = true;
  selected: View['selected'] = null;
  hover: View['hover'] = null;

  private acc = 0;
  private time = 0;
  private saveTimer = 0;
  private started = false;

  async start(host: HTMLElement) {
    await this.renderer.init(host);
    this.renderer.app.ticker.add((tk) => this.frame(tk.deltaMS / 1000));
    this.fitCamera();
    this.started = true;
  }

  private frame(dtSec: number) {
    dtSec = Math.min(dtSec, 0.1);
    this.time += dtSec;
    if (this.speed > 0) {
      this.acc += dtSec * TICKS_PER_SEC * this.speed;
      let n = 0;
      while (this.acc >= 1 && n < 400) {
        this.sim.tick();
        this.acc -= 1;
        n++;
      }
      if (n >= 400) this.acc = 0;
    }
    this.renderer.draw(this.sim, {
      overlay: this.overlay,
      tool: this.tool,
      hover: this.hover,
      selected: this.selected,
      alpha: this.speed > 0 ? this.acc : 1,
      time: this.time,
    });
    for (const e of this.sim.drainEvents()) this.ui.toast(e.text, e.kind);
    this.ui.update(dtSec);
    this.saveTimer += dtSec;
    if (this.saveTimer > 20) {
      this.saveTimer = 0;
      this.save();
    }
  }

  // ───────────────────────── Zustand ─────────────────────────

  setSpeed(s: number) {
    if (s > 0) this.lastSpeed = s;
    this.speed = s;
    this.ui.refreshSpeed();
  }
  togglePause() {
    this.setSpeed(this.speed === 0 ? this.lastSpeed : 0);
  }
  setTool(t: Tool) {
    this.tool = t;
    this.hover = null;
    this.ui.refreshTools();
  }
  toggleOverlay() {
    this.overlay = !this.overlay;
    this.ui.refreshOverlay();
  }

  newGame(mode: 'empty' | 'demo') {
    this.sim = new Sim(Math.floor(Math.random() * 1e9));
    if (mode === 'demo') buildDemo(this.sim);
    this.selected = null;
    this.hover = null;
    this.acc = 0;
    this.setTool('view');
    this.setSpeed(1);
    this.fitCamera();
    this.save();
  }

  /** Passt die Kamera an den Platz an, den HUD und Werkzeugleiste frei lassen. */
  fitCamera() {
    const w = window.innerWidth;
    const wide = w >= 760;
    this.renderer.fitCamera({ left: wide ? 350 : 0, top: wide ? 70 : 300, right: wide ? 70 : 0, bottom: 120 });
  }

  hasSave(): boolean {
    try {
      return localStorage.getItem(SAVE_KEY) !== null;
    } catch {
      return false;
    }
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.sim.serialize()));
    } catch {
      /* Speichern ist optional (privater Modus, volle Quote) */
    }
  }

  load(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data?.v !== 1) return false;
      this.sim = Sim.deserialize(data);
      this.selected = null;
      this.acc = 0;
      this.fitCamera();
      return true;
    } catch {
      return false;
    }
  }

  // ───────────────────────── Aktionen ─────────────────────────

  /** Wendet das aktive Werkzeug auf ein Feld an. Liefert den Fehlergrund oder null bei Erfolg. */
  applyTool(x: number, y: number): string | null {
    if (this.tool === 'view') return null;
    const res = this.tool === 'demolish' ? this.sim.demolish(x, y) : this.sim.build(this.tool as BuildTool, x, y);
    return res.ok ? null : (res.reason ?? 'Nicht möglich');
  }

  previewOk(x: number, y: number): boolean {
    if (this.tool === 'view') return true;
    if (this.tool === 'demolish') return this.sim.canDemolish(x, y).ok;
    return this.sim.canBuild(this.tool as BuildTool, x, y).ok;
  }

  /** Wählt das Objekt an Weltposition (Pixel) aus. */
  pick(wx: number, wy: number) {
    const tx = Math.floor(wx / TILE);
    const ty = Math.floor(wy / TILE);
    const sim = this.sim;
    for (const s of sim.ships) {
      if (wx >= s.x * TILE && wx <= (s.x + SHIP_LEN) * TILE && wy >= s.y * TILE && wy <= (s.y + 2) * TILE) {
        this.selected = { kind: 'ship', id: s.id };
        return;
      }
    }
    for (const t of sim.trucks) {
      const cx = (t.fx + 0.5) * TILE;
      const cy = (t.fy + 0.5) * TILE;
      if (Math.abs(wx - cx) < 14 && Math.abs(wy - cy) < 14) {
        this.selected = { kind: 'truck', id: t.id };
        return;
      }
    }
    if (tx < 0 || ty < 0 || tx >= GRID_W || ty >= GRID_H) {
      this.selected = null;
      return;
    }
    const c = sim.craneAt(tx, ty);
    if (c) {
      this.selected = { kind: 'crane', id: c.id };
      return;
    }
    const g = sim.gateAt(tx, ty);
    if (g) {
      this.selected = { kind: 'gate', id: g.id };
      return;
    }
    if (sim.kind[sim.idx(tx, ty)] === T.Yard) {
      this.selected = { kind: 'yard', id: sim.idx(tx, ty) };
      return;
    }
    this.selected = null;
  }

  get isStarted(): boolean {
    return this.started;
  }
}
