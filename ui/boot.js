/**
 * boot.js — the playable slice shell (T3.6 flow, T3.9 scene, selftest hook).
 *
 *   TITLE → SCENE (Ch1 opening, canon §3) → DUEL (tutorial: Ashblade vs
 *   Hollowed Sexton Bram) → REPORT → Re-bell / back to the crypt.
 *
 * The tutorial build is FIXED (creation is T8.1): the canon L1 Ashblade
 * example (108 HP assert) with the four starting Ashblade verses, and the
 * §9.1 #1 Bram row (budget(1)=33, 120 HP PROVISIONAL:D12) with the scripted
 * opener ENG-9 carries: Sepulchral Spikes on turn 1, then Brace and outlast.
 *
 * ?selftest=1 runs two full scripted duels headlessly in a scratch root and
 * renders PASS/FAIL with the state-sequence hash — the fixed-seed "renders
 * identical UI state sequences" acceptance check (T3.3), readable by any
 * headless browser.
 */

import { CANON } from '../data/config.js';
import { L1_ASHBLADE, BRAM } from '../data/presets.js';
import { deriveSeed, fnv1a } from '../rng/index.js';
import { resultsOf } from '../engine/fight.js';
import { el, clear } from './dom.js';
import { createStorage } from './store.js';
import { DuelController } from './duel/controller.js';
import { mountScene } from './scene/scene.js';
import { CH1_OPENING } from './scene/fixture.js';
import { sceneShape } from './logic.js';

const app = document.getElementById('app');
const store = createStorage();

/** Bram with the §9.1 doctrine wired through the ENG-9 hook: Spikes on
 *  turn 1, then Hold the Line (Brace) whenever it is legal — "Brace and
 *  outlast". The '*' tail repeats until T5.7's doctrine engine supersedes. */
function tutorialEnemy() {
  return { ...BRAM, script: ['sepulchral_spikes', 'hold_the_line*'] };
}

function tutorialSeed() {
  // Deterministic per run: the deriveSeed contract over the two builds plus
  // a re-bell counter — same session, same seed; a Re-bell moves one step.
  const bell = store.get('rebells', 0);
  return deriveSeed(L1_ASHBLADE, BRAM, bell, 'tutorial');
}

/* -- screens -------------------------------------------------------------- */

function titleScreen() {
  clear(app);
  const screen = el('section', { className: 'screen', attrs: { 'data-screen': 'title' } });
  const key = el('img', {
    className: 'title-art',
    attrs: { src: 'assets/art/plates/title.webp', alt: '', decoding: 'async' },
  });
  key.addEventListener('error', () => key.remove());
  const mark = el('h1', { className: 'wordmark', text: 'The Ashen Choir' });
  const sub = el('p', {
    className: 'fighter-sub',
    text: 'a build-driven, text-carved duel RPG · first playable slice (Phases 1–4)',
  });
  const tray = el('div', { className: 'choice-tray' });
  const btn = el('button', { className: 'choice-btn', text: 'Light the candle.' });
  btn.addEventListener('click', () => sceneScreen());
  tray.append(btn);
  screen.append(key, mark, sub, tray);
  app.append(screen);
}

function sceneScreen() {
  clear(app);
  const holder = el('section', { className: 'screen', attrs: { 'data-screen': 'scene' } });
  app.append(holder);
  // a made choice is remembered — the scene re-renders without its tray
  const made = (store.get('tallies', []) || []).some((t) => String(t.id).startsWith('ch1_'));
  const node = made ? { ...CH1_OPENING, choices: [] } : CH1_OPENING;
  mountScene(holder, node, {
    onChoice: (choice) => {
      const tallies = store.get('tallies', []);
      tallies.push({ id: choice.id, tally: choice.tally });
      store.set('tallies', tallies);
      sceneScreen(); // re-render without the choice tray
    },
    onDuel: () => duelScreen(),
  });
}

let controller = null;

function duelScreen() {
  clear(app);
  const holder = el('section', { attrs: { 'data-screen': 'duel' } });
  app.append(holder);
  controller = new DuelController({
    root: holder,
    // the tutorial build carries the Ch1 start item (§3: "a candle in your
    // hand that will not go out") — the Candle of Saint Orrin's deterministic
    // once-per-fight save is part of the first fight's teaching
    buildA: { ...L1_ASHBLADE, items: ['candle_of_saint_orrin'] },
    buildB: tutorialEnemy(),
    tuning: CANON,
    seed: tutorialSeed(),
    store,
    onExit: titleScreen,
    onRebell: () => {
      store.set('rebells', store.get('rebells', 0) + 1);
      duelScreen();
    },
  });
}

/* -- selftest (T3.3 acceptance: fixed-seed UI state sequence equality) ----- */

function selftest() {
  clear(app);
  const out = el('pre', {
    className: 'mono',
    attrs: { 'data-testid': 'selftest' },
    style: { padding: '16px', whiteSpace: 'pre-wrap' },
  });
  app.append(out);

  // Two full scripted duels on detached roots at the same fixed seed: the
  // rendered UI is a pure projection of the session log + results, so the
  // two captures must be byte-identical (T3.3 acceptance).
  const a = capture(20261018);
  const b = capture(20261018);
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  const hash = (fnv1a(sa) >>> 0).toString(16).padStart(8, '0');
  const pass = sa === sb;
  out.textContent = [
    `SELFTEST ${pass ? 'PASS' : 'FAIL'}`,
    `hash ${hash}`,
    `rounds ${a.results.rounds} · winner ${a.results.winner} · lastBell ${a.results.lastBell} · log lines ${a.log.length}`,
    `fortune ends ${a.results.fortune.toFixed(2)} · track points ${a.results.fortuneTrack.length}`,
    pass ? 'two fixed-seed duels produced byte-identical UI state sequences' : 'SEQUENCES DIVERGED — investigate before shipping',
  ].join('\n');
  out.dataset.pass = pass ? 'true' : 'false';
}

function capture(seed) {
  const root = el('div');
  const probe = new DuelController({
    root,
    buildA: { ...L1_ASHBLADE, items: ['candle_of_saint_orrin'] },
    buildB: tutorialEnemy(),
    tuning: CANON,
    seed,
    store: createStorage({ getItem: () => null, setItem: () => {}, removeItem: () => {} }),
    autoPick: (legal) => legal[legal.length - 1].id, // deterministic: most expensive legal verse
  });
  const r = resultsOf(probe.session);
  return {
    log: probe.session.log.map((e) => `${e.r}|${e.kind}|${e.side}|${e.text}`),
    results: { winner: r.winner, rounds: r.rounds, lastBell: r.lastBell, fortune: r.fortune, fortuneTrack: r.fortuneTrack },
  };
}

/* -- boot ------------------------------------------------------------------- */

const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
if (params && params.get('selftest')) selftest();
else titleScreen();
