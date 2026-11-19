import { COAST_ROW, GRID_W } from '../src/sim/data';
import { Sim } from '../src/sim/sim';

const k = COAST_ROW;

/** Ein einfacher, aber vernünftiger Spieler: baut eine Grundkette und behebt dann jede Stunde den Engpass. */
export class Bot {
  gateSlots = [2, 4, 6, 8, 10, 12, 14, 16];
  craneSlots = [3, 7, 5, 9, 11, 15, 13, 17];
  yardRow = k + 2;
  kaiEnd = 10;
  idleSamples = 0;
  idleSum = 0;
  spend: Record<string, number> = {};

  constructor(public s: Sim) {}

  try(tool: Parameters<Sim['build']>[0], x: number, y: number, tag = tool): boolean {
    const r = this.s.build(tool, x, y);
    if (r.ok) this.spend[tag] = (this.spend[tag] ?? 0) + r.cost;
    return r.ok;
  }

  start() {
    const s = this.s;
    for (let x = 2; x < 10; x++) this.try('kai', x, k);
    this.try('crane', this.craneSlots.shift()!, k);
    for (let x = 1; x <= 19; x++) this.try('road', x, k + 1);
    for (let y = k + 2; y <= k + 7; y++) this.try('road', 1, y);
    for (let x = 1; x <= 19; x++) this.try('road', x, k + 7);
    this.addYardRow();
    this.try('gate', this.gateSlots.shift()!, k + 8);
    for (let i = 0; i < 3; i++) this.try('truck', 3 + i, k + 1);
    s.updateMissions(true);
  }

  addYardRow(): boolean {
    if (this.yardRow > k + 6) return false;
    let ok = false;
    for (let x = 2; x <= 13; x++) ok = this.try('yard', x, this.yardRow) || ok;
    this.yardRow++;
    return ok;
  }

  hour() {
    const s = this.s;
    const reserve = 40_000;
    // Geld: Kredit bei Minus, tilgen bei viel Polster
    if (s.money < 10_000) s.takeLoan();
    else if (s.loan > 0 && s.money > 400_000) s.repayLoan();
    // Entscheidungen: meist die sichere Wahl
    if (s.pending) s.resolveDecision(s.pending.id === 'strike' || s.money > 100_000 ? 0 : 1);
    // Werkstatt ab Stufe 2
    if (s.level >= 2 && s.shops.length < Math.ceil((s.trucks.length + s.cranes.length) / 12)) {
      for (const [x, y] of [[15, k + 2], [17, k + 2], [15, k + 4], [17, k + 4]]) if (this.try('workshop', x, y)) break;
    }
    // Ersatz bei Krankheit
    for (const r of ['driver', 'crane', 'gate', 'mech'] as const) {
      if (s.staffAvail(r) < s.staffNeed(r) && s.money > reserve) s.hire(r);
    }
    // Verträge, solange die Pünktlichkeit stimmt
    const rate = s.myRate ?? 1;
    if (rate >= 0.4 && s.contracts.length < s.maxContracts) {
      const o = s.offers.find((o) => o.ship === 'feeder' && !o.reefer);
      if (o) s.acceptContract(o.id);
    }
    // Wartende Schiffe ohne Liegeplatz: Kai verlängern
    if (s.ships.filter((x) => x.state === 'queued').length >= 2 && this.kaiEnd + 4 <= GRID_W && s.money > 200_000) {
      for (let x = this.kaiEnd; x < this.kaiEnd + 4; x++) {
        if (!s.owned[x]) s.buyPlot(x);
        this.try('kai', x, k);
      }
      this.kaiEnd += 4;
      const c = this.craneSlots.find((x) => x < this.kaiEnd && !s.craneAt(x, k));
      if (c !== undefined) this.try('crane', c, k);
    }
    // Engpass beheben: jede Stufe einzeln prüfen, nicht nur die schlimmste
    const st = s.stats;
    if (st.gate > 0.8 && s.money > 20_000 + reserve && this.gateSlots.length) this.try('gate', this.gateSlots.shift()!, k + 8);
    if (st.yard > 0.75 && s.money > 12_000 + reserve) this.addYardRow();
    if (st.trucks > 0.85 && s.jamShare < 0.2 && s.money > 25_000 + reserve && s.trucks.length < 40) this.try('truck', 2 + (s.trucks.length % 17), k + 1);
    // Kleine Verbesserungen, wenn Geld übrig ist
    for (const id of ['spreader', 'scanner', 'engine', 'radio', 'stack', 'sales', 'maint'] as const) {
      const c = s.canBuyTech(id);
      if (c.ok && s.money > c.cost * 3 + reserve) s.buyTech(id);
    }
    if (st.crane > 0.9 && s.money > 150_000 + reserve) {
      const c = s.cranes.find((c) => s.canUpgrade('crane', c.id).ok);
      if (c) s.upgrade('crane', c.id);
      else {
        const x = this.craneSlots.find((x) => x < this.kaiEnd && !s.craneAt(x, k));
        if (x !== undefined) this.try('crane', x, k);
      }
    }
    // Strom ab Stufe 2: Solar und eine Batterie gegen Ausfälle
    if (s.level >= 2 && s.money > 80_000 + reserve && s.solarTiles < 6) {
      for (let x = 15; x <= 19; x++) if (this.try('solar', x, k + 5) || this.try('solar', x, k + 6)) break;
    }
    if (s.level >= 2 && s.batteryCap === 0 && s.money > 100_000 + reserve) this.try('battery', 18, k + 3);
    // Stellplätze für wartende Trucks
    if (s.level >= 2 && s.money > 30_000 + reserve && !this.spend.parking) for (let x = 14; x <= 17; x++) this.try('parking', x, k + 2);
    // Zollhof, Versicherung, Lieferaufträge, Wartung ab Stufe 2
    if (s.level >= 2 && s.customsTiles < 2 && s.money > 60_000 + reserve) this.try('customs', 18 + s.customsTiles, k + 8) || this.try('customs', 18 + s.customsTiles, k + 9);
    if (s.level >= 2 && s.insurance === 0) s.setInsurance(1);
    if (s.orders.length < 1) {
      const o = s.orderOffers.find((o) => o.kind === 'road' || o.kind === 'export');
      if (o) s.acceptOrder(o.id);
    }
    if (s.level >= 2 && s.hour >= 20 && s.hour < 21) for (const c of s.cranes) if (c.wear > 0.5 && !c.maintPlan && s.money > reserve) s.planMaint(c.id);
    // Leerlauf messen
    this.idleSamples++;
    this.idleSum += s.trucks.length ? s.trucks.filter((t) => !t.job && t.wait <= 0).length / s.trucks.length : 0;
  }
}
