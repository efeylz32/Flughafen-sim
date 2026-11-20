import { COAST_ROW, GRID_W, LEVELS, LV, PROJECT_IDS, T, TECH_IDS, type BuildTool } from '../src/sim/data';
import { milestoneDone } from '../src/sim/progression';
import { Sim } from '../src/sim/sim';

const k = COAST_ROW;

/**
 * Ein Bot für das ganze Spiel auf jeder Kartengröße: baut ein Raster aus Straßen, füllt es mit Lager,
 * Hallen und Gates, kauft Land, verlängert den Kai, baggert, nimmt große Verträge an, baut Großprojekte
 * und beschließt die Gesetze. Nach einem Gesetz baut er auf der neuen Karte neu auf.
 */
export class GrowBot {
  /** Erste und letzte Landspalte (Insel: Wasser an den Rändern) */
  x0 = 1;
  x1 = 0;
  kaiTo = 0;
  laws: string[] = [];
  log: string[] = [];
  spend = 0;

  constructor(public s: Sim) {
    this.setup();
  }

  private get reserve() {
    return 40_000 * this.s.inflation;
  }

  try(tool: BuildTool, x: number, y: number): boolean {
    const r = this.s.build(tool, x, y);
    if (r.ok) this.spend += r.cost;
    return r.ok;
  }

  /** Grundausbau auf einer (neuen) Karte */
  setup() {
    const s = this.s;
    let x0 = 0;
    while (x0 < GRID_W && s.kind[s.idx(x0, k + 1)] !== T.Land) x0++;
    this.x0 = x0 + 1;
    let x1 = GRID_W - 1;
    while (x1 > 0 && s.kind[s.idx(x1, k + 1)] !== T.Land) x1--;
    this.x1 = x1;
    const a = this.x0 + 1;
    for (let x = a; x < a + 8; x++) this.try('kai', x, k);
    this.kaiTo = a + 8;
    this.try('crane', a + 1, k);
    this.roads();
    for (let x = this.x0 + 1; x <= this.x0 + 12; x++) this.try('yard', x, k + 2);
    this.try('gate', this.x0 + 1, k + 14);
    for (let i = 0; i < 4; i++) this.try('truck', this.x0 + 2 + i, k + 1);
    s.updateMissions(true);
  }

  /** Straßenraster auf eigenem Land: Reihen k+1, k+7, k+13, Spalten alle 13 Felder */
  private roads() {
    const s = this.s;
    for (const y of [k + 1, k + 7, k + 13]) for (let x = this.x0; x <= this.x1; x++) if (s.owned[x]) this.try('road', x, y);
    for (let x = this.x0; x <= this.x1; x += 13) if (s.owned[x]) for (let y = k + 2; y <= k + 13; y++) this.try('road', x, y);
  }

  hour() {
    const s = this.s;
    const R = this.reserve;
    if (s.money < 20_000) s.takeLoan();
    else if (s.loan > 0 && s.money > 2_000_000) s.repayLoan();
    if (s.pending) s.resolveDecision(s.pending.id === 'strike' || s.money > 200_000 ? 0 : 1);
    // Ersatz bei Krankheit, aber höchstens zwei Leute über Bedarf
    for (const r of ['driver', 'crane', 'gate', 'mech'] as const) if (s.staffAvail(r) < s.staffNeed(r) && s.staff[r] < s.staffNeed(r) + 2 && s.money > R) s.hire(r);
    if (s.level >= LV.insurance && s.insurance === 0) s.setInsurance(1);

    // Land kaufen, wenn reichlich Geld da ist, und die Straßen mitziehen
    const free = s.owned.findIndex((v) => !v);
    if (free >= 0 && s.money > s.plotPrice * 3 + 1_000_000 && s.buyPlot(free).ok) this.roads();

    // Verträge: Feeder immer, große nur mit passendem Kai
    // Höchstens ein Vertrag pro Kran, sonst stauen sich die Schiffe
    if ((s.myRate ?? 1) >= 0.4 && s.contracts.length < Math.min(s.maxContracts, s.cranes.length)) {
      const good = (s.myRate ?? 1) >= 0.8;
      const o =
        (good ? s.offers.find((o) => o.ship === 'mega' && s.hasDeepBerth(8)) : undefined) ??
        (good ? s.offers.find((o) => o.ship === 'panamax' && s.hasDeepBerth(6)) : undefined) ??
        s.offers.find((o) => o.ship === 'feeder' && (!o.reefer || s.reeferCapacity >= 12));
      if (o) s.acceptContract(o.id);
    }
    if (s.orders.length < 1) {
      const o = s.orderOffers.find((o) => o.kind !== 'goods' || s.plants.length > 0);
      if (o) s.acceptOrder(o.id);
    }

    // Kai verlängern, wenn Schiffe warten oder große Schiffe kommen sollen
    const queued = s.ships.filter((x) => x.state === 'queued').length;
    if ((queued >= 2 || (s.level >= LV.big && this.kaiTo - this.x0 < 18)) && this.kaiTo + 4 <= this.x1 && s.money > 130_000 + R) {
      for (let x = this.kaiTo; x < this.kaiTo + 4; x++) this.try('kai', x, k);
      this.kaiTo += 4;
      for (let x = this.x0 + 2; x < this.kaiTo; x += 2) if (!s.craneAt(x, k) && !s.craneAt(x - 1, k) && this.try('crane', x, k)) break;
    }
    // Baggern vor dem Kai (ohne Tiefwasserkanal)
    if (s.level >= LV.big && !s.hasProject('canal') && s.money > 200_000 + R) {
      for (let x = this.x0 + 1; x < this.kaiTo; x++) if (s.kind[s.idx(x, k)] === T.Kai && !s.deepAt(x)) this.try('dredge', x, k - 1);
    }

    const st = s.stats;
    // Lager: Reihen k+2..k+4 zuerst, dann Kühl- und Gefahrgutplätze in k+5..k+6
    if (st.yard > 0.7 && s.money > 30_000 + R) this.fillRow([k + 2, k + 3, k + 4, k + 5, k + 6], 'yard', 10);
    if (s.level >= LV.cargo && s.reeferCapacity < 30 && s.money > 100_000 + R) this.fillRow([k + 6], 'reefer', 4);
    if (s.level >= LV.cargo && s.hazCapacity < 8 && s.money > 100_000 + R) this.fillRow([k + 5], 'hazard', 2);
    // Gates unten an Reihe k+13
    // Gates: unter der unteren Straße, sonst unter der mittleren oder über der unteren (Hügel liegen oft im Weg)
    if (st.gate > 0.75 && s.money > 60_000 + R) {
      let built = false;
      for (const y of [k + 14, k + 12, k + 8]) {
        for (let x = this.x0 + 1; x < this.x1 - 1 && !built; x += 2) if (s.owned[x] && s.owned[x + 1] && (x - this.x0) % 13 !== 0 && (x + 1 - this.x0) % 13 !== 0) built = this.try('gate', x, y);
        if (built) break;
      }
    }
    // Trucks, solange sie der Engpass sind
    if (st.trucks > 0.8 && s.jamShare < 0.25 && s.trucks.length < 12 + s.cranes.length * 5 && s.money > 40_000 + R) this.try('truck', this.x0 + 1 + (s.trucks.length % 20), k + 1);
    // Kräne: aufrüsten oder neue an den Kai
    if ((st.crane > 0.85 || queued >= 2) && s.money > 120_000 + R) {
      const c = s.cranes.find((c) => s.canUpgrade('crane', c.id).ok);
      if (c) s.upgrade('crane', c.id);
      else for (let x = this.x0 + 2; x < this.kaiTo; x += 2) if (!s.craneAt(x, k) && !s.craneAt(x - 1, k) && this.try('crane', x, k)) break;
    }
    // Spät im Spiel: alle Kräne zur Super-Brücke
    if (s.level >= LV.mega + 1 && s.money > 6_000_000) {
      const c = s.cranes.find((c) => s.canUpgrade('crane', c.id).ok);
      if (c) s.upgrade('crane', c.id);
    }
    // Werkstätten
    if (s.level >= 2 && s.shops.length < Math.ceil((s.trucks.length + s.cranes.length) / 10) && s.money > 50_000) this.place('workshop', [k + 8, k + 11], 3);
    // Hallen ab Stufe 2: Packhalle, Veredelung, dann Kühl- und Befüllhalle, später ausbauen
    if (s.level >= 3 && s.plants.length < 4 && s.money > 700_000 + R) {
      const want: BuildTool = s.plants.length === 0 ? 'unpack' : s.plants.length === 1 ? 'pack' : s.level >= LV.cargo ? (s.plants.length === 2 ? 'cold' : 'fill') : 'unpack';
      this.place(want, [k + 8, k + 10], 4);
    }
    for (const p of s.plants) {
      const u = s.plantUpgradeInfo(p.id);
      if (u && s.level >= u.level && s.money > u.cost * 2 + R) s.upgradePlant(p.id);
    }
    // Strom, Zoll, Bahn
    if (s.level >= 3 && s.solarTiles < 8 && s.money > 200_000 + R) this.fillRow([k + 15, k + 16], 'solar', 2);
    if (s.level >= 4 && s.batteryCap === 0 && s.money > 200_000 + R) this.fillRow([k + 15, k + 16], 'battery', 1);
    if (s.level >= LV.customs && s.customsTiles < 3 && s.money > 150_000 + R) this.fillRow([k + 14], 'customs', 1);
    if (s.level >= 3 && s.rails.length === 0 && s.owned[GRID_W - 1] && s.money > 500_000 + R) this.try('rail', GRID_W - 1, k + 2);

    // Verbesserungen und Großprojekte
    for (const id of TECH_IDS) {
      if (id === 'akkord' || id === 'diesel') continue;
      const c = s.canBuyTech(id);
      if (c.ok && s.money > c.cost * 2 + R) s.buyTech(id);
    }
    if (!s.projBuild) {
      const id = PROJECT_IDS.find((id) => s.canStartProject(id).ok);
      if (id && s.money > s.projectCost(id) * 1.5 + 2_000_000) s.startProject(id);
    }
    // Wartung abends
    if (s.level >= LV.maint && s.hour >= 20 && s.hour < 21) for (const c of s.cranes) if (c.wear > 0.5 && !c.maintPlan && s.money > R) s.planMaint(c.id);
  }

  /** Gesetz beschließen, wenn genug Geld für den Neuaufbau übrig bleibt. Liefert die neue Sim oder null. */
  maybeExpand(): Sim | null {
    const s = this.s;
    const c = s.canExpand();
    if (!c.ok || s.money < c.cost + 4_000_000) return null;
    const day = s.day;
    this.s = s.expand();
    this.laws.push(`Gesetz ${this.laws.length + 1}: T${day}, Stufe ${s.level}`);
    this.setup();
    return this.s;
  }

  private fillRow(rows: number[], tool: BuildTool, n: number) {
    let done = 0;
    for (const y of rows) {
      for (let x = this.x0 + 1; x <= this.x1 && done < n; x++) {
        if (!this.s.owned[x] || (x - this.x0) % 13 === 0) continue;
        if (this.try(tool, x, y)) done++;
      }
      if (done >= n) return;
    }
  }

  private place(tool: BuildTool, rows: number[], step: number) {
    for (const y of rows) for (let x = this.x0 + 1; x <= this.x1 - 3; x += step) if (this.s.owned[x] && this.try(tool, x, y)) return;
  }
}

/** Was ein Spieler irgendwann schafft: Meilensteine vereinfacht abhaken, sobald die Container reichen */
export function helpMilestones(s: Sim): boolean {
  const nx = LEVELS[s.level];
  if (!nx || s.handled < nx.need || milestoneDone(s)) return false;
  const t = s.level + 1;
  if (t === 3) s.shipsOnTime = Math.max(s.shipsOnTime, 5);
  if (t === 4) s.contractsDone = Math.max(s.contractsDone, 3);
  if (t === 5) s.bigShipsDone = Math.max(s.bigShipsDone, 2);
  if (t === 6) s.reefersHandled = Math.max(s.reefersHandled, 200);
  if (t === 7) s.megaDone = Math.max(s.megaDone, 1);
  if (t === 8) s.trainsDone = Math.max(s.trainsDone, 40);
  if (t === 9) s.ordersDone = Math.max(s.ordersDone, 20);
  if (t === 11) s.megaDone = Math.max(s.megaDone, 10);
  if (t === 12) s.rep = Math.max(s.rep, 90);
  return true;
}

