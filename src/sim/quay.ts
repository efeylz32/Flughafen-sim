import { COAST_ROW, GRID_H, GRID_W } from './data';

// Kaimauern können an jeder Küste stehen. Jede Küste ist eine Linie von Feldern.
// Ein Platz an der Kaikante heißt q = Seite * QS + Position entlang der Küste.
// Aufeinanderfolgende q liegen nebeneinander, so lassen sich Liegeplätze wie auf
// einer geraden Linie suchen.

export const QS = 64;
/** Seiten: Wasser liegt im Norden, Süden, Westen oder Osten des Kais */
export const N = 0;
export const S = 1;
export const W = 2;
export const E = 3;
export const SIDES = [N, S, W, E] as const;
export const Q_MAX = 4 * QS;

/** Richtung vom Kai zum Wasser */
export const OUT: [number, number][] = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

const LINE = [COAST_ROW, GRID_H - 4, 2, GRID_W - 3];

/** Gültiger Bereich der Position je Seite (Ecken gehören zur Nord- bzw. keiner Seite) */
function range(side: number): [number, number] {
  if (side === N) return [0, GRID_W - 1];
  if (side === S) return [3, GRID_W - 4];
  return [COAST_ROW + 1, GRID_H - 5];
}

export const sideOf = (q: number) => Math.floor(q / QS);
export const posOf = (q: number) => q % QS;
export const isVertical = (side: number) => side === W || side === E;

/** Feld zur Kaiposition oder null */
export function qTile(q: number): [number, number] | null {
  if (q < 0 || q >= Q_MAX) return null;
  const side = sideOf(q);
  const p = posOf(q);
  const [a, b] = range(side);
  if (p < a || p > b) return null;
  return isVertical(side) ? [LINE[side], p] : [p, LINE[side]];
}

/** Kaiposition eines Feldes (unabhängig davon, ob dort Wasser liegt) oder -1 */
export function qOf(x: number, y: number): number {
  for (const side of SIDES) {
    const p = isVertical(side) ? y : x;
    const l = isVertical(side) ? x : y;
    if (l !== LINE[side]) continue;
    const [a, b] = range(side);
    if (p >= a && p <= b) return side * QS + p;
  }
  return -1;
}

/** Wasserfeld vor dem Kai: Abstand 1..3 nach draußen. Liefert q oder -1. */
export function qOfWater(x: number, y: number): number {
  for (const side of SIDES) {
    const [dx, dy] = OUT[side];
    for (let d = 1; d <= 3; d++) {
      const q = qOf(x - dx * d, y - dy * d);
      if (q >= 0 && sideOf(q) === side) return q;
    }
  }
  return -1;
}

/** Liegeplatz eines Schiffs: linke obere Ecke und Ausrichtung */
export function berthPose(q: number): { x: number; y: number; vert: boolean } {
  const side = sideOf(q);
  const p = posOf(q);
  if (side === N) return { x: p, y: COAST_ROW - 2, vert: false };
  if (side === S) return { x: p, y: GRID_H - 3, vert: false };
  if (side === W) return { x: 0, y: p, vert: true };
  return { x: GRID_W - 2, y: p, vert: true };
}

/** Wegpunkte von der Reede (oben im Wasser) zum Liegeplatz */
export function approach(q: number): [number, number][] {
  const side = sideOf(q);
  const pose = berthPose(q);
  if (side === N) return [[pose.x, pose.y]];
  if (side === W) return [[0, 2.5], [0, pose.y]];
  if (side === E) return [[GRID_W - 2, 2.5], [GRID_W - 2, pose.y]];
  return [[0, 2.5], [0, GRID_H - 3], [pose.x, pose.y]];
}

/** Wohin ein Schiff nach dem Ablegen fährt */
export function departure(q: number, x: number, y: number): [number, number] {
  const side = q < 0 ? N : sideOf(q);
  if (side === W || side === E) return [x, GRID_H + 8];
  return [GRID_W + 8, y];
}
