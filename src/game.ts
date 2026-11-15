import { Sound } from './audio/sound';
import { Renderer, View } from './render/renderer';
import { BuildTool, DiffId, GRID_H, GRID_W, MapId, ProductId, Role, ROLE_NAMES, T, TICKS_PER_SEC, TILE, Tool, TruckRole } from './sim/data';
import { Progress } from './achievements';
import { CRANE_MODELS, DIFFS, MAPS, movesPerHour, sizeOf, TechId } from './sim/data';
import { buildDemo } from './sim/demo';
import { setupScenario } from './sim/scenario-setup';
import { SCENARIOS } from './sim/scenarios';
import { GameEvent, Removed, Sim } from './sim/sim';
import type { UI } from './ui/ui';

const SAVE_KEY = 'hafen-imperium-save-v1';
export const PAINT_TOOLS: Tool[] = ['kai', 'road', 'yard', 'reefer', 'dredge', 'zone', 'demolish'];

/** So lange (in Spielminuten) lässt sich eine Bauaktion rückgängig machen. */
const UNDO_WINDOW_GM = 240;
const UNDO_MAX = 60;

type UndoAction =
  | { kind: 'build'; tool: BuildTool; x: number; y: number; truckId?: number }
  | { kind: 'demolish'; removed: Removed[] }
  | { kind: 'upgrade'; what: 'crane' | 'truck'; id: number; x: number; y: number };
interface UndoGroup {
  gm: number;
  actions: UndoAction[];
}

export class Game {
  sim = new Sim();
  renderer = new Renderer();
  sound = new Sound();
  ui!: UI;
  /** 0 = Pause */
  speed = 1;
  lastSpeed = 1;
  tool: Tool = 'view';
  progress = new Progress();
  private achTimer = 0;
  /** Engpass-Färbung auf der Karte */
  overlay = false;
  selected: View['selected'] = null;
  hover: View['hover'] = null;
  /** Aufgabe, die die Sammelzuweisung vergibt */
  assignRole: TruckRole = 'crane';
  /** Zone, die das Zonen-Werkzeug vergibt (0 = entfernen) */
  zonePick = 1;
  rect: View['rect'] = null;

  private acc = 0;
  private time = 0;
  private saveTimer = 0;
  private undoStack: UndoGroup[] = [];
  private stroke: UndoGroup | null = null;
  /** Einnahmen pro Feld, die gesammelt als ein aufsteigender Text erscheinen */
  private pending = new Map<number, { x: number; y: number; amount: number; age: number }>();

  async start(host: HTMLElement) {
    await this.renderer.init(host);
    this.renderer.app.ticker.add((tk) => this.frame(tk.deltaMS / 1000));
    this.fitCamera();
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
    for (const e of this.sim.drainEvents()) this.onEvent(e);
    this.flushPending(dtSec);
    this.pruneUndo();

    this.renderer.draw(this.sim, {
      overlay: this.overlay,
      tool: this.tool,
      hover: this.hover,
      selected: this.selected,
      alpha: this.speed > 0 ? this.acc : 1,
      time: this.time,
      dt: dtSec,
      rect: this.rect,
    });
    this.ui.update(dtSec);
    // Erfolge etwa einmal pro Sekunde prüfen
    this.achTimer += dtSec;
    if (this.achTimer > 1) {
      this.achTimer = 0;
      for (const a of this.progress.check(this.sim)) {
        this.ui.toast(`Erfolg: ${a.name} – ${a.text}`, 'good');
        this.sound.play('mission');
      }
    }
    this.saveTimer += dtSec;
    if (this.saveTimer > 20) {
      this.saveTimer = 0;
      this.save();
    }
  }

  private onEvent(e: GameEvent) {
    if (e.text) this.ui.toast(e.text, e.kind);
    switch (e.tag) {
      case 'container': {
        this.sound.play('coin');
        if (e.x !== undefined && e.y !== undefined) this.addPending(e.x, e.y, e.amount ?? 0);
        break;
      }
      case 'export':
        this.sound.play('coin');
        if (e.x !== undefined && e.y !== undefined) this.addPending(e.x, e.y, e.amount ?? 0);
        break;
      case 'train':
        this.sound.play('train');
        if (e.x !== undefined && e.y !== undefined && e.amount) this.renderer.addFloat(e.x, e.y, `+${e.amount.toLocaleString('de-DE')} €`);
        break;
      case 'train-arrive':
        this.sound.play('train');
        break;
      case 'level':
        this.sound.play('level');
        this.ui.showLevelUp();
        break;
      case 'won': {
        this.sound.play('mission');
        const s = this.sim;
        const sc = SCENARIOS.find((x) => x.id === s.scenario);
        this.progress.addRecord({
          title: sc ? `Szenario: ${sc.name}` : `${DIFFS[s.diff].name} · ${MAPS[s.map].name}`,
          day: s.day,
          handled: s.handled,
          money: Math.round(s.money - s.loan),
          date: new Date().toISOString().slice(0, 10),
        });
        this.ui.showEnd();
        break;
      }
      case 'lost':
        this.sound.play('bad');
        this.ui.showEnd();
        break;
      case 'debt':
      case 'broken':
        this.sound.play('bad');
        break;
      case 'decision':
        this.sound.play('mission');
        this.ui.showDecision();
        break;
      case 'weather-warn':
        this.sound.play('bad');
        break;
      case 'weather-start':
        this.sound.play(this.sim.weather === 'storm' ? 'thunder' : 'foghorn');
        this.sound.setStorm(this.sim.weather === 'storm');
        break;
      case 'weather-end':
        this.sound.setStorm(false);
        break;
      case 'spoil':
        this.sound.play('bad');
        break;
      case 'contract':
        this.sound.play('mission');
        break;
      case 'ship-done':
        this.sound.play('shipDone');
        if (e.x !== undefined && e.y !== undefined) this.renderer.addFloat(e.x - 0.5, e.y, `+${(e.amount ?? 0).toLocaleString('de-DE')} €`);
        break;
      case 'ship-arrived':
        this.sound.play('horn');
        break;
      case 'ship-late':
      case 'ship-cancel':
        this.sound.play('bad');
        break;
      case 'mission':
        this.sound.play('mission');
        break;
      case 'day':
        this.sound.play('day');
        this.ui.showDayReport();
        break;
    }
  }

  private addPending(x: number, y: number, amount: number) {
    const key = y * GRID_W + x;
    const p = this.pending.get(key);
    if (p) p.amount += amount;
    else this.pending.set(key, { x, y, amount, age: 0 });
  }

  private flushPending(dt: number) {
    for (const [key, p] of this.pending) {
      p.age += dt;
      if (p.age < 0.7) continue;
      this.renderer.addFloat(p.x, p.y, `+${p.amount.toLocaleString('de-DE')} €`);
      this.pending.delete(key);
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
  overhaulSelected() {
    const sel = this.selected;
    if (!sel || (sel.kind !== 'crane' && sel.kind !== 'truck')) return;
    const r = this.sim.overhaul(sel.kind, sel.id);
    if (!r.ok) return this.fail(r.reason ?? 'Nicht möglich');
    this.sound.play('upgrade');
    this.ui.toast('Generalüberholung läuft. Das Gerät ist eine Weile außer Betrieb.', 'good');
  }
  buyTech(id: TechId) {
    const r = this.sim.buyTech(id);
    if (!r.ok) return this.fail(r.reason ?? 'Nicht möglich');
    this.sound.play('upgrade');
  }
  /** Dreht das nächste Gebäude (Breite und Höhe tauschen) */
  rotate() {
    const [w, h] = sizeOf(this.tool);
    if (w === h) return;
    this.sim.rot = !this.sim.rot;
    this.hover = null;
    this.ui.refreshTools();
  }
  toggleOverlay() {
    this.overlay = !this.overlay;
    this.ui.refreshOverlay();
  }
  toggleSound() {
    this.sound.toggle();
    this.sound.play('click');
    this.ui.refreshSound();
  }

  /** Startet ein Szenario mit fester Ausgangslage und eigenem Ziel. */
  newScenario(id: string) {
    this.sim = setupScenario(id, Math.floor(Math.random() * 1e9));
    this.resetTransient();
    this.setTool('view');
    this.setSpeed(1);
    this.fitCamera();
    this.save();
  }

  setProduct(plantId: number, p: ProductId) {
    this.sim.setProduct(plantId, p);
    this.sound.play('click');
  }

  newGame(mode: 'empty' | 'demo', diff: DiffId = 'normal', map: MapId = 'coast') {
    // Der Demo-Hafen ist für die Küste gebaut
    this.sim = new Sim(Math.floor(Math.random() * 1e9), diff, mode === 'demo' ? 'coast' : map);
    if (mode === 'demo') buildDemo(this.sim);
    this.sim.limitLand();
    this.resetTransient();
    this.setTool('view');
    this.setSpeed(1);
    this.fitCamera();
    this.save();
  }

  private resetTransient() {
    this.selected = null;
    this.hover = null;
    this.acc = 0;
    this.undoStack = [];
    this.stroke = null;
    this.pending.clear();
    this.sound.setStorm(false);
  }

  /** Passt die Kamera an den Platz an, den HUD und Werkzeugleiste frei lassen. */
  fitCamera() {
    const wide = window.innerWidth >= 760;
    this.renderer.fitCamera({ left: wide ? 350 : 0, top: wide ? 70 : 190, right: wide ? 70 : 0, bottom: 150 });
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
      this.resetTransient();
      this.fitCamera();
      return true;
    } catch {
      return false;
    }
  }

  // ───────────────────────── Bauen und Rückgängig ─────────────────────────

  /** Fasst alles, was bis `endStroke` gebaut wird, zu einem Rückgängig-Schritt zusammen. */
  beginStroke() {
    this.stroke = { gm: this.sim.gm, actions: [] };
  }
  endStroke() {
    if (this.stroke && this.stroke.actions.length) this.pushUndo(this.stroke);
    this.stroke = null;
  }
  private pushUndo(g: UndoGroup) {
    this.undoStack.push(g);
    if (this.undoStack.length > UNDO_MAX) this.undoStack.shift();
  }
  private record(a: UndoAction) {
    if (this.stroke) this.stroke.actions.push(a);
    else this.pushUndo({ gm: this.sim.gm, actions: [a] });
  }
  private pruneUndo() {
    while (this.undoStack.length && this.sim.gm - this.undoStack[0].gm > UNDO_WINDOW_GM) this.undoStack.shift();
  }
  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** Wendet das aktive Werkzeug auf ein Feld an. Liefert den Fehlergrund oder null bei Erfolg. */
  applyTool(x: number, y: number): string | null {
    if (this.tool === 'view' || this.tool === 'assign') return null;
    if (this.tool === 'zone') {
      const r = this.sim.setZone(x, y, this.zonePick);
      if (!r.ok) return r.reason ?? 'Nicht möglich';
      this.sound.play('click');
      return null;
    }
    if (this.tool === 'oneway') {
      const r = this.sim.toggleOneway(x, y);
      if (!r.ok) return r.reason ?? 'Nicht möglich';
      this.sound.play('click');
      return null;
    }
    if (this.tool === 'buyland') {
      const r = this.sim.buyPlot(x);
      if (!r.ok) return r.reason ?? 'Nicht möglich';
      this.sound.play('buildBig');
      this.ui.toast(`Land gekauft: −${r.cost.toLocaleString('de-DE')} €`, 'good');
      return null;
    }
    if (this.tool === 'demolish') {
      const res = this.sim.demolish(x, y);
      if (!res.ok) return res.reason ?? 'Nicht möglich';
      if (res.removed.length) this.record({ kind: 'demolish', removed: res.removed });
      this.sound.play('demolish');
      this.renderer.addPop(x, y, 'demolish');
      return null;
    }
    const tool = this.tool as BuildTool;
    const res = this.sim.build(tool, x, y);
    if (!res.ok) return res.reason ?? 'Nicht möglich';
    this.record({ kind: 'build', tool, x, y, truckId: res.truckId });
    this.sound.play(tool === 'crane' || tool === 'gate' ? 'buildBig' : tool === 'truck' ? 'truck' : 'build');
    this.renderer.addPop(x, y, 'build');
    return null;
  }

  /** Rüstet den ausgewählten Kran oder Truck auf. */
  upgradeSelected() {
    const sel = this.selected;
    if (!sel || (sel.kind !== 'crane' && sel.kind !== 'truck')) return;
    const res = this.sim.upgrade(sel.kind, sel.id);
    if (!res.ok) {
      this.fail(res.reason ?? 'Nicht möglich');
      return;
    }
    const c = sel.kind === 'crane' ? this.sim.cranes.find((c) => c.id === sel.id) : undefined;
    const t = sel.kind === 'truck' ? this.sim.trucks.find((t) => t.id === sel.id) : undefined;
    const x = c ? c.x : t ? Math.round(t.fx) : 0;
    const y = c ? c.y : t ? Math.round(t.fy) : 0;
    this.record({ kind: 'upgrade', what: sel.kind, id: sel.id, x, y });
    this.sound.play('upgrade');
    this.renderer.addPop(x, y, 'build');
    this.ui.toast(c ? `${CRANE_MODELS[c.model].name} in Betrieb: ${movesPerHour(c.model)} Moves pro Stunde` : 'Der Truck fährt jetzt fahrerlos', 'good');
  }

  setAllRoles(role: TruckRole) {
    for (const t of this.sim.trucks) this.sim.setRole(t.id, role);
    this.ui.toast(`Alle Trucks: ${ROLE_NAMES[role].name}`, 'info');
    this.sound.play('click');
  }

  /** Vergibt die gewählte Aufgabe an alle Trucks im Rahmen. */
  assignRect(r: NonNullable<View['rect']>) {
    const x0 = Math.min(r.x0, r.x1);
    const x1 = Math.max(r.x0, r.x1);
    const y0 = Math.min(r.y0, r.y1);
    const y1 = Math.max(r.y0, r.y1);
    let n = 0;
    for (const t of this.sim.trucks) {
      const x = t.tile % GRID_W;
      const y = (t.tile / GRID_W) | 0;
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      this.sim.setRole(t.id, this.assignRole);
      n++;
    }
    if (!n) return this.fail('Kein Truck im Rahmen');
    this.ui.toast(`${n} ${n === 1 ? 'Truck' : 'Trucks'}: ${ROLE_NAMES[this.assignRole].name}`, 'good');
    this.sound.play('upgrade');
  }

  decide(choice: number) {
    this.sim.resolveDecision(choice);
    this.sound.play('click');
  }

  takeLoan() {
    const r = this.sim.takeLoan();
    if (!r.ok) return this.fail(r.reason ?? 'Nicht möglich');
    this.sound.play('coin');
  }
  repayLoan() {
    const r = this.sim.repayLoan();
    if (!r.ok) return this.fail(r.reason ?? 'Nicht möglich');
    this.sound.play('click');
  }

  /** Gibt dem ausgewählten Truck eine feste Aufgabe oder stellt ihn auf Automatik. */
  setTruckRole(role: TruckRole) {
    if (this.selected?.kind !== 'truck') return;
    this.sim.setRole(this.selected.id, role);
    this.sound.play('click');
  }

  hire(role: Role) {
    this.sim.hire(role);
    this.sound.play('click');
  }

  fire(role: Role) {
    const res = this.sim.fire(role);
    if (!res.ok) this.fail(res.reason ?? 'Nicht möglich');
    else this.sound.play('undo');
  }

  acceptContract(id: number) {
    const res = this.sim.acceptContract(id);
    if (!res.ok) this.fail(res.reason ?? 'Nicht möglich');
  }

  cancelContract(id: number) {
    const res = this.sim.cancelContract(id);
    if (!res.ok) this.fail(res.reason ?? 'Nicht möglich');
  }

  /** Meldet einen Fehlversuch mit Text und Ton. */
  fail(reason: string) {
    this.ui.toast(reason, 'bad');
    this.sound.play('error');
  }

  /** Nimmt den letzten Bauschritt zurück. Baukosten werden voll erstattet. */
  undo() {
    this.endStroke();
    const group = this.undoStack.pop();
    if (!group) {
      this.fail('Nichts zum Rückgängigmachen');
      return;
    }
    const before = this.sim.money;
    let reason: string | null = null;
    while (group.actions.length) {
      const a = group.actions[group.actions.length - 1];
      if (a.kind === 'upgrade') {
        const res = this.sim.undoUpgrade(a.what, a.id);
        if (!res.ok) {
          reason = res.reason ?? 'Nicht möglich';
          break;
        }
        this.renderer.addPop(a.x, a.y, 'undo');
      } else if (a.kind === 'build') {
        const res = this.sim.undoBuild(a);
        // Ein Truck, der schon mit seiner Straße verschwunden ist, gilt als erledigt
        if (!res.ok && a.tool !== 'truck') {
          reason = res.reason ?? 'Nicht möglich';
          break;
        }
        this.renderer.addPop(a.x, a.y, 'undo');
      } else {
        const res = this.sim.undoDemolish(a.removed);
        if (!res.ok) {
          reason = res.reason ?? 'Nicht möglich';
          break;
        }
        for (const r of a.removed) this.renderer.addPop(r.x, r.y, 'undo');
      }
      group.actions.pop();
    }
    if (reason) {
      // Was nicht zurückging, bleibt als Schritt erhalten
      this.undoStack.push(group);
      this.fail(`Rückgängig nicht möglich: ${reason}`);
      return;
    }
    const diff = Math.round(this.sim.money - before);
    const money = diff === 0 ? '' : ` (${diff > 0 ? '+' : '−'}${Math.abs(diff).toLocaleString('de-DE')} €)`;
    this.ui.toast(`Rückgängig gemacht${money}`, 'info');
    this.sound.play('undo');
    this.selected = null;
  }

  previewOk(x: number, y: number): boolean {
    if (this.tool === 'view' || this.tool === 'assign') return true;
    if (this.tool === 'zone') {
      const i = this.sim.idx(x, y);
      const k = this.sim.kind[i];
      return k === T.Yard || k === T.Reefer || !!(this.sim.craneAt(x, y) ?? this.sim.gateAt(x, y) ?? this.sim.plantAt(x, y) ?? this.sim.railAt(x, y) ?? this.sim.truckAtTile(i));
    }
    if (this.tool === 'oneway') return this.sim.kind[this.sim.idx(x, y)] === T.Road;
    if (this.tool === 'buyland') return x >= 0 && x < GRID_W && !this.sim.owned[x];
    if (this.tool === 'demolish') return this.sim.canDemolish(x, y).ok;
    return this.sim.canBuild(this.tool as BuildTool, x, y).ok;
  }

  /** Wählt das Objekt an Weltposition (Pixel) aus. */
  pick(wx: number, wy: number) {
    const tx = Math.floor(wx / TILE);
    const ty = Math.floor(wy / TILE);
    const sim = this.sim;
    const before = this.selected;
    this.selected = null;
    for (const s of sim.ships) {
      const b = sim.shipBox(s);
      if (wx >= b.x * TILE && wx <= (b.x + b.w) * TILE && wy >= b.y * TILE && wy <= (b.y + b.h) * TILE) {
        this.selected = { kind: 'ship', id: s.id };
        break;
      }
    }
    if (!this.selected) {
      for (const t of sim.trucks) {
        const cx = (t.fx + 0.5) * TILE;
        const cy = (t.fy + 0.5) * TILE;
        if (Math.abs(wx - cx) < 14 && Math.abs(wy - cy) < 14) {
          this.selected = { kind: 'truck', id: t.id };
          break;
        }
      }
    }
    if (!this.selected && tx >= 0 && ty >= 0 && tx < GRID_W && ty < GRID_H) {
      const c = sim.craneAt(tx, ty);
      const g = sim.gateAt(tx, ty);
      const r = sim.railAt(tx, ty);
      const k = sim.kind[sim.idx(tx, ty)];
      if (c) this.selected = { kind: 'crane', id: c.id };
      else if (g) this.selected = { kind: 'gate', id: g.id };
      else if (r) this.selected = { kind: 'rail', id: r.id };
      else if (sim.plantAt(tx, ty)) this.selected = { kind: 'plant', id: sim.plantAt(tx, ty)!.id };
      else if (k === T.Shop) this.selected = { kind: 'shop', id: sim.shopAt(tx, ty)!.id };
      else if (k === T.Yard) this.selected = { kind: 'yard', id: sim.idx(tx, ty) };
      else if (k === T.Reefer) this.selected = { kind: 'reefer', id: sim.idx(tx, ty) };
    }
    if (this.selected && (this.selected.kind !== before?.kind || this.selected.id !== before?.id)) this.sound.play('click');
  }
}
