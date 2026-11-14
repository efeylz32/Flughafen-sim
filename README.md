# Hafen-Imperium (Arbeitstitel)

Ein Browser-Tycoon für Handy und PC: Baue aus einem kleinen Anleger einen Containerhafen und
beseitige die Engpässe, bevor die Schiffe zu lange liegen.

**Stand: spielbarer Prototyp mit fünf Hafenstufen.** Die Kette ist
Schiff → Kran → Trucks → Stapelplatz → Trucks → Gate oder Bahn. Die langsamste Stufe bestimmt den Durchsatz.
Das Spielkonzept steht im Doc „Hafen-Imperium: Spielkonzept“.

| Stufe | Name | Ab umgeschlagenen Containern | Neu |
|---|---|---|---|
| 1 | Anleger | 0 | Kai, Kran, Straße, Stapelplatz, Gate, Trucks |
| 2 | Regionalhafen | 1.200 | Export (Schiffe beladen), Verträge mit Reedereien, Containerbrücke, Wetter |
| 3 | Handelshafen | 6.000 | Kühlfracht mit Kühlplätzen, Gleisanschluss, Baggern für große Schiffe |
| 4 | Seehafen | 18.000 | Fahrerlose Fahrzeuge, 4 Verträge |
| 5 | Weltklasse-Hafen | 45.000 | 5 Verträge |

- **Export:** Schiffe wollen auch beladen werden. Export-Container kommen über das Gate, Trucks bringen sie zum Kran (250 € pro Stück).
- **Verträge:** Feste Anläufe einer Reederei. Pünktlich abgefertigt gibt es Bonus, sonst Strafe.
- **Wetter:** Bei Sturm stehen die Kräne (die Liegezeit läuft dann nicht), bei Nebel läuft kein Schiff ein. Es gibt zwei Stunden Vorwarnung.
- **Kühlfracht:** Kühlcontainer brauchen Kühlplätze und verderben dort nach 10 Stunden. Sie bringen 400 €.
- **Bahn:** Gleisanschluss am rechten Kartenrand. Alle 6 Stunden holt ein Zug bis zu 40 Container.
- **Große Schiffe:** 300 Container, brauchen 6 Kai-Felder in einer Reihe und ausgebaggertes Wasser davor.
- **Verarbeitung (ab Stufe 2):** Die Packhalle packt Container aus, die Veredelung macht aus zwei davon Fertigware für 900 €. Trucks fahren die Ware dazwischen.
- **Aufgaben für Trucks:** Jeder Truck fährt auf Automatik oder bekommt eine feste Aufgabe (Kran räumen, Ausgang, Export, Verarbeitung). Feste Aufgaben sind 25 % schneller und sparen die Funkzeit der Leitstelle.
- **Personal und Schwierigkeit:** Fahrer, Kranführer und Gate-Kräfte kosten Stundenlohn und können krank werden. Drei Schwierigkeitsgrade im Menü.
- **Aufrüsten:** Kran oder Truck mit „Ansehen“ antippen und im Info-Blatt aufrüsten.

Alle Werte stehen in `src/sim/data.ts`. Das Balancing ist grob und noch nicht durch Spielen abgestimmt.

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
- **Neuer leerer Hafen:** Mit 19 geführten Missionen vom ersten Kai-Feld bis zum Weltklasse-Hafen.

## Bedienung

| | Handy | PC |
|---|---|---|
| Bauen | Werkzeug unten wählen, tippen oder ziehen | Linksklick oder ziehen |
| Verschieben | zwei Finger (mit „Ansehen“ auch einer) | Rechts- oder Mittelklick ziehen |
| Zoomen | zwei Finger spreizen | Mausrad |
| Info | „Ansehen“ wählen, Schiff oder Gebäude antippen | Klick |

Tasten: Leertaste Pause, `1` `2` `3` Tempo 1×/3×/8×, `Strg+Z` rückgängig, `O` Engpass auf der Karte einfärben, `M` Ton,
`V` `K` `C` `R` `Y` `G` `T` `X` Werkzeuge, `Esc` abbrechen.

**Rückgängig** nimmt den letzten Bauschritt zurück (ein gezogener Strich zählt als ein Schritt) und erstattet die vollen Kosten.
Das geht 4 Spielstunden lang, danach bleibt nur der Abriss mit 50 % Erstattung.

Der Spielstand wird automatisch im Browser gespeichert (`localStorage`).

## Aufbau

```
src/sim/      Simulation in reinem TypeScript, kein Browser-Code (testbar, headless)
  data.ts       alle Balancing-Werte
  sim.ts        Spielzustand, Bauen, Ticks, Jobs der Trucks, Schiffe, Verträge, Wetter, Stufen, Speichern
  missions.ts   Tutorial-Missionen
  demo.ts       Demo-Hafen
src/render/   PixiJS-Darstellung und Kamera (Gelände, Schiffe, Kräne, Trucks, Tag und Nacht)
src/audio/    Klänge, im Browser erzeugt (Web Audio, keine Audiodateien)
src/ui/       HUD (DOM) und Eingabe (Maus, Touch)
src/game.ts   Spielschleife und Zustand zwischen UI und Simulation
tests/        Vitest
```

Die Simulation läuft mit festem Takt (10 Ticks pro Sekunde bei 1×, 1 Tick = 0,4 Spielminuten).
Die Darstellung liest nur, die UI schickt nur Befehle. `?debug` an der URL stellt `window.__game` bereit.
