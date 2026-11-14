# Hafen-Imperium (Arbeitstitel)

Ein Browser-Tycoon für Handy und PC: Baue aus einem kleinen Anleger einen Containerhafen und
beseitige die Engpässe, bevor die Schiffe zu lange liegen.

**Stand: Phase 0 (Prototyp).** Ein Schiff, ein Container-Fluss:
Schiff → Kran → Trucks → Stapelplatz → Trucks → Gate. Die langsamste Stufe bestimmt den Durchsatz.
Das Spielkonzept steht im Doc „Hafen-Imperium: Spielkonzept“.

## Starten

```bash
npm install
npm run dev      # Entwicklungsserver, auch im lokalen Netz erreichbar (z. B. vom Handy)
npm test         # Simulationstests (ohne Grafik)
npm run build    # Typprüfung und Produktions-Build nach dist/
npm run build:single  # zusätzlich eine einzelne, selbstständige Datei dist/hafen-imperium.html
```

Im Menü gibt es zwei Startarten:

- **Demo-Hafen mit Engpass:** Fertig gebaut, aber mit zu wenig Trucks und nur einem Gate. Finde den Engpass.
- **Neuer leerer Hafen:** Mit acht geführten Missionen vom ersten Kai-Feld bis zum ersten abgefertigten Schiff.

## Bedienung

| | Handy | PC |
|---|---|---|
| Bauen | Werkzeug unten wählen, tippen oder ziehen | Linksklick oder ziehen |
| Verschieben | zwei Finger (mit „Ansehen“ auch einer) | Rechts- oder Mittelklick ziehen |
| Zoomen | zwei Finger spreizen | Mausrad |
| Info | „Ansehen“ wählen, Schiff oder Gebäude antippen | Klick |

Tasten: Leertaste Pause, `1` `2` `3` Tempo 1×/3×/8×, `O` Engpass-Anzeige, `V` `K` `C` `R` `Y` `G` `T` `X` Werkzeuge, `Esc` abbrechen.

Der Spielstand wird automatisch im Browser gespeichert (`localStorage`).

## Aufbau

```
src/sim/      Simulation in reinem TypeScript, kein Browser-Code (testbar, headless)
  data.ts       alle Balancing-Werte
  sim.ts        Spielzustand, Bauen, Ticks, Jobs der Trucks, Speichern
  missions.ts   Tutorial-Missionen
  demo.ts       Demo-Hafen
src/render/   PixiJS-Darstellung und Kamera
src/ui/       HUD (DOM) und Eingabe (Maus, Touch)
src/game.ts   Spielschleife und Zustand zwischen UI und Simulation
tests/        Vitest
```

Die Simulation läuft mit festem Takt (10 Ticks pro Sekunde bei 1×, 1 Tick = 0,4 Spielminuten).
Die Darstellung liest nur, die UI schickt nur Befehle. `?debug` an der URL stellt `window.__game` bereit.
