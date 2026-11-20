// Ohne eval(), damit das Spiel auch unter strenger Content-Security-Policy läuft (z. B. eingebettet).
import 'pixi.js/unsafe-eval';
import './style.css';
import { Game } from './game';
import { setupInput } from './ui/input';
import { UI } from './ui/ui';

async function boot() {
  // Spielschrift laden, bevor die Karte Texte (Schiffsnamen, Beträge) zeichnet; höchstens kurz warten
  await Promise.race([
    Promise.all(['800 16px "Baloo 2"', '700 16px "Baloo 2"', '700 16px Nunito', '800 16px Nunito'].map((f) => document.fonts.load(f))).catch(() => undefined),
    new Promise((r) => setTimeout(r, 1200)),
  ]);
  const game = new Game();
  const host = document.getElementById('game')!;
  const hud = document.getElementById('hud')!;
  game.ui = new UI(game, hud);
  await game.start(host);
  setupInput(game, host);

  // Ton darf erst nach einer Nutzeraktion starten
  const unlock = () => game.sound.unlock();
  // iPhone und iPad zählen erst das Loslassen als Nutzeraktion, deshalb mehrere Ereignisse
  for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(ev, unlock, { capture: true });
  document.addEventListener('visibilitychange', () => game.sound.setHidden(document.hidden));

  // Beim Verlassen oder Wegwischen speichern, damit nichts verloren geht
  const flush = () => game.save();
  document.addEventListener('visibilitychange', () => document.hidden && flush());
  window.addEventListener('pagehide', flush);

  // Als App installierbar und offline spielbar: Service Worker (nicht in der Einzeldatei-Version)
  const single = (window as unknown as { __SINGLE_FILE__?: boolean }).__SINGLE_FILE__;
  if ('serviceWorker' in navigator && import.meta.env.PROD && !single && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* ohne Service Worker läuft das Spiel trotzdem, nur nicht offline */
    });
  }
  // Der Browser bietet die Installation an: Knopf im Hauptmenü zeigen
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    game.ui.setInstallPrompt(e as unknown as { prompt(): Promise<void> });
  });
  window.addEventListener('appinstalled', () => game.ui.setInstallPrompt(null));

  // Zuerst das Hauptmenü: Weiterspielen, Neues Spiel, Laden
  game.ui.showMenu('main');

  // Test- und Debug-Zugriff: ?debug in der URL
  if (new URLSearchParams(location.search).has('debug')) {
    (window as unknown as { __game: Game }).__game = game;
  }
}

boot();
