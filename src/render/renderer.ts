import { Application, Container, Graphics, Text } from 'pixi.js';
import { COAST_ROW, GRID_H, GRID_W, SHIP_LEN, T, TILE, YARD_CAP_PER_TILE } from '../sim/data';
import type { Ship, Sim } from '../sim/sim';

export interface View {
  overlay: boolean;
  tool: string;
  hover: { x: number; y: number; ok: boolean } | null;
  selected: { kind: 'ship' | 'crane' | 'gate' | 'yard' | 'truck'; id: number } | null;
  /** Anteil zwischen letztem und nächstem Tick (0..1) für weiche Bewegung. */
  alpha: number;
  time: number;
}

const COLORS = {
  water: [0x57a4d7, 0x59a6d9],
  land: [0x8dc26d, 0x88bd69],
  kai: 0xd5d0c4,
  kaiEdge: 0xa49f93,
  road: 0x5a616b,
  roadMark: 0xe9e4cf,
  yard: 0xd9cba3,
  yardLine: 0xbfae82,
  gate: 0xe5dfcf,
};
const BOX = [0xd9534f, 0x3b82c4, 0xe0a030, 0x2f9e6b, 0x7a5cc7, 0xe8e1cf];

function hash(x: number, y: number): number {
  let h = Math.imul(x + 374761393, 668265263) ^ Math.imul(y + 1274126177, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function utilColor(u: number): number {
  if (u < 0.6) return 0x35b26a;
  if (u < 0.85) return 0xf0b429;
  return 0xe5484d;
}

export class Renderer {
  app!: Application;
  readonly world = new Container();
  private terrain = new Graphics();
  private dyn = new Graphics();
  private labels = new Container();
  private shipLabels = new Map<number, Text>();
  private terrainVersion = -1;
  scale = 1;
  ox = 0;
  oy = 0;

  async init(host: HTMLElement) {
    this.app = new Application();
    await this.app.init({
      resizeTo: host,
      background: 0x58a5d8,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    host.appendChild(this.app.canvas);
    this.app.canvas.style.touchAction = 'none';
    this.world.addChild(this.terrain, this.dyn, this.labels);
    this.app.stage.addChild(this.world);
    this.fitCamera();
    this.app.renderer.on('resize', () => this.clampCamera());
  }

  get viewW(): number {
    return this.app.screen.width;
  }
  get viewH(): number {
    return this.app.screen.height;
  }

  /**
   * Startansicht: Der Hafenbereich (Schiffe, Kai, Straße, Stapelplatz) wird in den
   * Bereich eingepasst, den die Oberfläche frei lässt.
   */
  fitCamera(ins: { left: number; top: number; right: number; bottom: number } = { left: 0, top: 0, right: 0, bottom: 0 }) {
    const x0 = 4;
    const x1 = 28;
    const y0 = COAST_ROW - 3;
    const y1 = COAST_ROW + 8;
    const availW = Math.max(120, this.viewW - ins.left - ins.right);
    const availH = Math.max(120, this.viewH - ins.top - ins.bottom);
    const s = Math.min(availW / ((x1 - x0) * TILE), availH / ((y1 - y0) * TILE));
    this.scale = Math.min(1.5, Math.max(0.42, s));
    this.ox = ins.left + availW / 2 - (((x0 + x1) / 2) * TILE) * this.scale;
    this.oy = ins.top + availH / 2 - (((y0 + y1) / 2) * TILE) * this.scale;
    this.clampCamera();
  }

  private clampCamera() {
    const mw = GRID_W * TILE * this.scale;
    const mh = GRID_H * TILE * this.scale;
    // Die Karte darf weit genug verschoben werden, dass jeder Bereich neben den Bedienelementen liegen kann.
    const padX = this.viewW * 0.5;
    const padY = this.viewH * 0.5;
    this.ox = mw + padX * 2 <= this.viewW ? (this.viewW - mw) / 2 : Math.min(padX, Math.max(this.viewW - mw - padX, this.ox));
    this.oy = mh + padY * 2 <= this.viewH ? (this.viewH - mh) / 2 : Math.min(padY, Math.max(this.viewH - mh - padY, this.oy));
    this.world.position.set(this.ox, this.oy);
    this.world.scale.set(this.scale);
  }

  panBy(dx: number, dy: number) {
    this.ox += dx;
    this.oy += dy;
    this.clampCamera();
  }

  zoomAt(sx: number, sy: number, factor: number) {
    const ns = Math.min(3, Math.max(0.35, this.scale * factor));
    const k = ns / this.scale;
    this.ox = sx - (sx - this.ox) * k;
    this.oy = sy - (sy - this.oy) * k;
    this.scale = ns;
    this.clampCamera();
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx - this.ox) / this.scale, y: (sy - this.oy) / this.scale };
  }
  screenToTile(sx: number, sy: number): { x: number; y: number } {
    const w = this.screenToWorld(sx, sy);
    return { x: Math.floor(w.x / TILE), y: Math.floor(w.y / TILE) };
  }
  tileToScreen(tx: number, ty: number): { x: number; y: number } {
    return { x: tx * TILE * this.scale + this.ox, y: ty * TILE * this.scale + this.oy };
  }

  // ───────────────────────── Zeichnen ─────────────────────────

  draw(sim: Sim, view: View) {
    if (this.terrainVersion !== sim.version) {
      this.drawTerrain(sim);
      this.terrainVersion = sim.version;
    }
    this.drawDynamic(sim, view);
  }

  private drawTerrain(sim: Sim) {
    const g = this.terrain;
    g.clear();
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const i = y * GRID_W + x;
        const px = x * TILE;
        const py = y * TILE;
        const h = hash(x, y);
        switch (sim.kind[i]) {
          case T.Water:
            g.rect(px, py, TILE, TILE).fill(COLORS.water[h & 1]);
            if (h % 5 === 0) g.moveTo(px + 6, py + 14).lineTo(px + 17, py + 14).stroke({ width: 1.5, color: 0xffffff, alpha: 0.22 });
            if (h % 7 === 0) g.moveTo(px + 15, py + 24).lineTo(px + 25, py + 24).stroke({ width: 1.5, color: 0xffffff, alpha: 0.16 });
            break;
          case T.Land:
            g.rect(px, py, TILE, TILE).fill(COLORS.land[h & 1]);
            if (h % 9 === 0) g.circle(px + 8 + (h % 13), py + 10 + (h % 11), 1.6).fill({ color: 0x6aa24d, alpha: 0.8 });
            break;
          case T.Kai:
            g.rect(px, py, TILE, TILE).fill(COLORS.kai);
            g.rect(px, py, TILE, 5).fill(COLORS.kaiEdge);
            g.rect(px + 4, py + TILE - 7, 6, 3).fill({ color: 0xb3ad9f, alpha: 0.8 });
            g.rect(px + TILE - 10, py + TILE - 7, 6, 3).fill({ color: 0xb3ad9f, alpha: 0.8 });
            break;
          case T.Road: {
            g.rect(px, py, TILE, TILE).fill(COLORS.road);
            const r = (dx: number, dy: number) => {
              const nx = x + dx;
              const ny = y + dy;
              return nx >= 0 && ny >= 0 && nx < GRID_W && ny < GRID_H && sim.kind[ny * GRID_W + nx] === T.Road;
            };
            if (r(1, 0) || r(-1, 0)) {
              g.rect(px + 3, py + TILE / 2 - 1, 9, 2).fill(COLORS.roadMark);
              g.rect(px + 20, py + TILE / 2 - 1, 9, 2).fill(COLORS.roadMark);
            }
            if (r(0, 1) || r(0, -1)) {
              g.rect(px + TILE / 2 - 1, py + 3, 2, 9).fill(COLORS.roadMark);
              g.rect(px + TILE / 2 - 1, py + 20, 2, 9).fill(COLORS.roadMark);
            }
            break;
          }
          case T.Yard:
            g.rect(px, py, TILE, TILE).fill(COLORS.yard);
            g.rect(px + 0.5, py + 0.5, TILE - 1, TILE - 1).stroke({ width: 1, color: COLORS.yardLine });
            break;
          case T.Gate:
            g.rect(px, py, TILE, TILE).fill(COLORS.gate);
            for (let s = 0; s < 4; s++) g.rect(px + 2 + s * 7, py + 3, 4, 5).fill(s % 2 === 0 ? 0xd9534f : 0xffffff);
            g.rect(px + 2, py + 3, 28, 5).stroke({ width: 1, color: 0x8a8576 });
            g.roundRect(px + 20, py + 14, 9, 12, 2).fill(0x3b6ea8);
            break;
        }
      }
    }
  }

  private drawDynamic(sim: Sim, view: View) {
    const g = this.dyn;
    g.clear();
    const a = Math.max(0, Math.min(1, view.alpha));

    // Engpass-Overlay
    if (view.overlay) {
      for (let i = 0; i < sim.kind.length; i++) {
        const k = sim.kind[i];
        const x = i % GRID_W;
        const y = (i / GRID_W) | 0;
        let col = -1;
        if (k === T.Road) col = utilColor(sim.stats.trucks);
        else if (k === T.Yard) col = utilColor(sim.stock[i] / YARD_CAP_PER_TILE);
        else if (k === T.Gate) col = utilColor(sim.stats.gate);
        else if (k === T.Kai && sim.craneAt(x, y)) col = utilColor(sim.stats.crane);
        if (col >= 0) g.rect(x * TILE, y * TILE, TILE, TILE).fill({ color: col, alpha: 0.34 });
      }
    }

    // Container auf dem Stapelplatz
    for (const i of sim.yardTileList) {
      const n = sim.stock[i];
      const px = (i % GRID_W) * TILE;
      const py = ((i / GRID_W) | 0) * TILE;
      for (let s = 0; s < Math.min(n, YARD_CAP_PER_TILE); s++) {
        const cx = px + 3 + (s % 3) * 9;
        const cy = py + 5 + Math.floor(s / 3) * 12;
        g.rect(cx, cy, 8, 10).fill(BOX[(hash(i, s) >>> 3) % BOX.length]);
        g.rect(cx, cy, 8, 10).stroke({ width: 0.8, color: 0x000000, alpha: 0.25 });
      }
    }

    // Kräne
    for (const c of sim.cranes) {
      const px = c.x * TILE;
      const py = c.y * TILE;
      const col = c.state === 'working' ? 0x3b82c4 : c.state === 'blocked' ? 0xf0883e : 0x7f8fa6;
      g.rect(px + 3, py + 7, TILE - 6, TILE - 12).fill(0x3a4a63);
      g.rect(px + TILE / 2 - 3, py - TILE * 1.5, 6, TILE * 1.5 + 14).fill(col);
      g.rect(px + 5, py + 7, TILE - 10, 4).fill(col);
      if (c.state === 'working') {
        const hook = ((Math.sin(view.time * 3 + c.id) + 1) / 2) * TILE * 1.2;
        g.rect(px + TILE / 2 - 4, py - hook - 4, 8, 8).fill(0xffd24a);
      }
      for (let s = 0; s < c.buffer; s++) {
        g.rect(px + 3 + s * 7, py + TILE - 6, 6, 5).fill(BOX[(c.id + s) % BOX.length]);
      }
    }

    // Gates: wartende Container und Abfertigung
    for (const gt of sim.gates) {
      const px = gt.x * TILE;
      const py = gt.y * TILE;
      for (let s = 0; s < gt.apron; s++) g.rect(px + 2 + s * 6, py + TILE - 9, 5, 7).fill(BOX[(gt.id + s) % BOX.length]);
      if (gt.proc > 0) g.circle(px + 24.5, py + 20, 2.5).fill(0x35b26a);
    }

    // Schiffe
    const alive = new Set<number>();
    for (const s of sim.ships) {
      alive.add(s.id);
      this.drawShip(g, s, a, view);
    }
    for (const [id, t] of this.shipLabels) {
      if (!alive.has(id)) {
        t.destroy();
        this.shipLabels.delete(id);
      }
    }

    // Trucks
    for (const t of sim.trucks) {
      const fx = t.px + (t.fx - t.px) * a;
      const fy = t.py + (t.fy - t.py) * a;
      const cx = (fx + 0.5) * TILE;
      const cy = (fy + 0.5) * TILE;
      const cos = Math.cos(t.angle);
      const sin = Math.sin(t.angle);
      const rot = (lx: number, ly: number): [number, number] => [cx + lx * cos - ly * sin, cy + lx * sin + ly * cos];
      const poly = (x0: number, y0: number, w: number, h: number): number[] => {
        const p1 = rot(x0, y0);
        const p2 = rot(x0 + w, y0);
        const p3 = rot(x0 + w, y0 + h);
        const p4 = rot(x0, y0 + h);
        return [...p1, ...p2, ...p3, ...p4];
      };
      g.poly(poly(-11, -5, 22, 10)).fill(0xf2f0e6);
      g.poly(poly(-11, -5, 22, 10)).stroke({ width: 1, color: 0x2b2f36 });
      g.poly(poly(5, -5, 6, 10)).fill(0xe0a030);
      for (let s = 0; s < t.load; s++) g.poly(poly(-10 + s * 7.5, -4, 7, 8)).fill(BOX[(t.id + s) % BOX.length]);
    }

    // Auswahl
    if (view.selected) this.drawSelection(g, sim, view.selected, a);

    // Bau-Vorschau
    if (view.hover && view.tool !== 'view') {
      const { x, y, ok } = view.hover;
      if (x >= 0 && y >= 0 && x < GRID_W && y < GRID_H) {
        const col = view.tool === 'demolish' ? 0xe5484d : ok ? 0x35b26a : 0xe5484d;
        g.rect(x * TILE, y * TILE, TILE, TILE).fill({ color: col, alpha: 0.35 });
        g.rect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2).stroke({ width: 2, color: col });
      }
    }
  }

  private drawShip(g: Graphics, s: Ship, a: number, view: View) {
    const x = (s.px + (s.x - s.px) * a) * TILE;
    const y = (s.py + (s.y - s.py) * a) * TILE;
    const w = SHIP_LEN * TILE;
    const h = 2 * TILE;
    const moving = s.state === 'sailing' || s.state === 'leaving' || s.state === 'queued';
    if (moving) {
      const back = s.state === 'queued' ? 0 : 1;
      if (back) {
        g.moveTo(x - 6, y + h * 0.35).lineTo(x - 26, y + h * 0.35).stroke({ width: 2, color: 0xffffff, alpha: 0.35 });
        g.moveTo(x - 6, y + h * 0.65).lineTo(x - 26, y + h * 0.65).stroke({ width: 2, color: 0xffffff, alpha: 0.35 });
      }
    }
    // Rumpf
    const hull = [x, y + h * 0.12, x + w * 0.8, y + h * 0.12, x + w, y + h * 0.5, x + w * 0.8, y + h * 0.88, x, y + h * 0.88];
    g.poly(hull).fill(0x2d3b4e);
    const deck = [x + 3, y + h * 0.2, x + w * 0.78, y + h * 0.2, x + w - 6, y + h * 0.5, x + w * 0.78, y + h * 0.8, x + 3, y + h * 0.8];
    g.poly(deck).fill(s.color);
    // Brücke am Heck
    g.rect(x + 4, y + h * 0.28, 12, h * 0.44).fill(0xf2f0e6);
    g.rect(x + 4, y + h * 0.28, 12, h * 0.44).stroke({ width: 1, color: 0x2b2f36, alpha: 0.5 });
    // Container an Deck (Anteil der Restladung)
    const cols = 8;
    const rows = 3;
    const slots = cols * rows;
    const filled = Math.ceil((s.containers / s.total) * slots);
    let n = 0;
    for (let cx = 0; cx < cols; cx++) {
      for (let cy = 0; cy < rows; cy++) {
        if (n++ >= filled) break;
        const bx = x + 22 + cx * 12.5;
        const by = y + h * 0.26 + cy * 11;
        g.rect(bx, by, 11, 10).fill(BOX[(hash(cx, cy + s.id) >>> 2) % BOX.length]);
        g.rect(bx, by, 11, 10).stroke({ width: 0.8, color: 0x000000, alpha: 0.3 });
      }
    }
    // Namensschild
    let label = this.shipLabels.get(s.id);
    if (!label) {
      label = new Text({
        text: s.name,
        style: { fontFamily: 'system-ui, sans-serif', fontSize: 12, fontWeight: '700', fill: 0xffffff, stroke: { color: 0x1f2b3a, width: 3 } },
      });
      this.labels.addChild(label);
      this.shipLabels.set(s.id, label);
    }
    label.position.set(x + 4, y - 12);
    void view;
  }

  private drawSelection(g: Graphics, sim: Sim, sel: NonNullable<View['selected']>, a: number) {
    let x = 0;
    let y = 0;
    let w = TILE;
    let h = TILE;
    if (sel.kind === 'ship') {
      const s = sim.ships.find((s) => s.id === sel.id);
      if (!s) return;
      x = (s.px + (s.x - s.px) * a) * TILE;
      y = (s.py + (s.y - s.py) * a) * TILE;
      w = SHIP_LEN * TILE;
      h = 2 * TILE;
    } else if (sel.kind === 'crane') {
      const c = sim.cranes.find((c) => c.id === sel.id);
      if (!c) return;
      x = c.x * TILE;
      y = c.y * TILE;
    } else if (sel.kind === 'gate') {
      const gt = sim.gates.find((gt) => gt.id === sel.id);
      if (!gt) return;
      x = gt.x * TILE;
      y = gt.y * TILE;
    } else if (sel.kind === 'yard') {
      x = (sel.id % GRID_W) * TILE;
      y = ((sel.id / GRID_W) | 0) * TILE;
    } else {
      const t = sim.trucks.find((t) => t.id === sel.id);
      if (!t) return;
      x = (t.px + (t.fx - t.px) * a) * TILE;
      y = (t.py + (t.fy - t.py) * a) * TILE;
    }
    g.rect(x - 2, y - 2, w + 4, h + 4).stroke({ width: 2.5, color: 0xffffff });
    g.rect(x - 4, y - 4, w + 8, h + 8).stroke({ width: 1.5, color: 0x2a6fdb, alpha: 0.9 });
  }
}
