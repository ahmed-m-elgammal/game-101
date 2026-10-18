/**
 * controller.js — T3.3/T3.4/T3.5/T3.6/T3.7: binds the engine session to the
 * duel screen. Render-only UI ([GDD] §15): the controller mutates nothing in
 * the engine except calling step()/submitChoice(); all it adds is
 * presentation (hints, the Reading, the report) and the run-state memory the
 * spec asks the UI to keep (D18 fight history, dismissed hints).
 *
 * Render contract: after EVERY atomic engine step (one round header, one AI
 * verse, or the resolution of the player's choice) the visible state is
 * re-synced — one DOM pass per event, well under the 16ms budget (T3.8).
 * DoT ticks update the HP bar instantly (no 220ms drain) so the player can
 * count them (§10.6/§11.5).
 */

import { createSession, step, submitChoice, legalVerses, resultsOf } from '../../engine/fight.js';
import { chips as chipsOf } from '../../engine/status.js';
import { runReading } from '../../reading.js';
import { waxGeom, formatReading, verdictOf, calibrationFor, nextHint } from '../logic.js';
import { el, clear } from '../dom.js';
import {
  fighterPanel, updateFighterPanel,
  verseTray, updateVerseTray,
  logGutter, appendLogEntry,
  waxMeter, updateWaxMeter,
  readingCard, updateReadingCard,
  hintView, reportView,
} from './components.js';

export class DuelController {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.root - mount point (cleared)
   * @param {object} opts.buildA - player build (side a, manual)
   * @param {object} opts.buildB - enemy build (side b)
   * @param {object} opts.tuning - tuning object (CANON or session overrides)
   * @param {number} opts.seed - fight seed
   * @param {object} [opts.store] - persistence (hints, fight history)
   * @param {function} [opts.onExit] - "back to the crypt"
   * @param {function} [opts.autoPick] - selftest driver: (legal) => verseId
   */
  constructor(opts) {
    this.opts = opts;
    this.session = createSession(opts.buildA, opts.buildB, {
      seed: opts.seed,
      tuning: opts.tuning,
      manualSide: opts.autoPick ? null : 'a',
    });
    this.reading = runReading(opts.buildA, opts.buildB, { n: 200, tuning: opts.tuning });
    this.expected = this.reading.winAPct / 100;
    this.logSeen = 0;
    this.hintSeen = (opts.store && opts.store.get('hints')) || {};
    this.reportShown = false;
    this.mount();
    this.hintEvent({ type: 'fight_start' });
    this.pump();
  }

  /* -- structure ---------------------------------------------------------- */

  mount() {
    const s = this.session;
    this.root = this.opts.root;
    clear(this.root);
    this.root.className = 'screen';

    this.readingEl = readingCard(formatReading(this.reading, s.fighters.a.sheet, s.fighters.b.sheet, s.display));
    this.root.append(this.readingEl);

    this.roundCounter = el('span', { className: 'round-counter', text: 'ROUND 0' });
    this.wax = waxMeter();
    this.roundbar = el('div', { className: 'roundbar wax-strip' }, [this.roundCounter, this.wax]);
    this.root.append(this.roundbar);

    this.panelA = fighterPanel(s.fighters.a);
    this.panelB = fighterPanel(s.fighters.b);
    this.logEl = logGutter();
    this.center = el('div', { className: 'duel-center' }, [this.logEl]);
    this.grid = el('div', { className: 'duel-grid' }, [this.panelA, this.center, this.panelB]);
    this.root.append(this.grid);

    this.hintAnchor = el('div', {});
    this.tray = verseTray((id) => this.pick(id));
    this.reportAnchor = el('div', {});
    this.root.append(this.hintAnchor, this.tray, this.reportAnchor);

    this.syncAll();
  }

  /* -- engine driving ------------------------------------------------------ */

  /** Step the engine until it needs a human (or autoPick) or the fight ends. */
  pump() {
    for (let guard = 0; guard < 5000; guard++) {
      if (this.session.state.over) break;
      const moved = step(this.session);
      if (moved) { this.syncAll(); continue; }
      if (this.opts.autoPick && this.session.state.phase === 'await_input') {
        const f = this.session.state.current;
        const legal = legalVerses(this.session, f);
        if (legal.length && submitChoice(this.session, this.opts.autoPick(legal)).ok) {
          this.hintEvent({ type: 'first_choice' });
          this.syncAll();
          continue;
        }
      }
      break; // await_input (human)
    }
    this.syncAll();
    if (this.session.state.over && !this.reportShown) {
      this.reportShown = true;
      this.finish();
    }
  }

  pick(verseId) {
    if (this.session.state.over) return;
    const res = submitChoice(this.session, verseId);
    if (!res.ok) {
      // untrusted input path — the engine already rejects with a reason
      this.showError(res.error);
      return;
    }
    this.hintEvent({ type: 'first_choice' });
    this.pump();
  }

  showError(msg) {
    let note = this.root.querySelector('.submit-error');
    if (!note) {
      note = el('div', { className: 'submit-error', attrs: { role: 'status' } });
      this.tray.before(note);
    }
    note.textContent = `The verse will not take: ${msg}.`;
  }

  /* -- rendering ------------------------------------------------------------ */

  syncAll() {
    const s = this.session;
    const a = s.fighters.a;
    const b = s.fighters.b;
    const newEntries = s.log.slice(this.logSeen);
    const instant = newEntries.some((e) => e.kind === 'dot');
    updateFighterPanel(this.panelA, a, chipsOf(a), { instantHp: instant });
    updateFighterPanel(this.panelB, b, chipsOf(b), { instantHp: instant });
    for (const e of newEntries) appendLogEntry(this.logEl, e);
    this.logSeen = s.log.length;
    updateWaxMeter(this.wax, waxGeom(s.state.fortune));
    this.roundCounter.textContent = `ROUND ${s.state.round}`;
    updateReadingCard(this.readingEl, formatReading(this.reading, a.sheet, b.sheet, s.display));
    this.syncTray();
    this.scanHints(newEntries);
  }

  syncTray() {
    const s = this.session.state;
    if (s.over || s.phase !== 'await_input') {
      updateVerseTray(this.tray, [], null, {}, 0); // empty tray during resolve
      return;
    }
    const f = s.current || this.session.pendingChoice;
    const legal = legalVerses(this.session, f);
    updateVerseTray(this.tray, legal, f.sheet.verses, f.cooldowns, f.resolve);
  }

  /* -- hints (T3.6) ---------------------------------------------------------- */

  hintEvent(event) {
    const next = nextHint(this.hintSeen, event);
    if (!next) return;
    this.hintSeen = next.seen;
    if (this.opts.store) this.opts.store.set('hints', this.hintSeen);
    clear(this.hintAnchor);
    this.hintAnchor.append(hintView(next, () => {
      clear(this.hintAnchor);
    }));
  }

  scanHints(entries) {
    for (const e of entries) {
      if (e.side !== 'b' || e.kind !== 'status') continue;
      if (/braces/.test(e.text)) this.hintEvent({ type: 'enemy_brace' });
      if (/Ward/.test(e.text)) this.hintEvent({ type: 'enemy_ward' });
    }
  }

  /* -- report (T3.7) ----------------------------------------------------------- */

  finish() {
    const result = resultsOf(this.session);
    const verdict = verdictOf(result, 'a', this.expected);
    const history = (this.opts.store && this.opts.store.get('fights')) || [];
    history.push({ expected: this.expected, won: result.winner === 'a' });
    if (this.opts.store) this.opts.store.set('fights', history);
    const calibration = calibrationFor(history);
    const lost = result.winner !== 'a';

    clear(this.tray);
    clear(this.hintAnchor);
    this.reportAnchor.append(reportView({
      verdict,
      lastBell: result.lastBell,
      calibration,
      rounds: result.rounds,
      totals: result.totals,
      display: result.display,
      lost,
      onOpenReading: () => {
        this.readingEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        this.readingEl.classList.add('reading--open');
      },
      onRebell: () => this.opts.onRebell && this.opts.onRebell(),
      onExit: () => this.opts.onExit && this.opts.onExit(),
    }));

    // D18 honesty note: the calibration line is the whole point of tracking
    // history — when the run crosses a multiple of ten, the report says what
    // the record shows, or says nothing. (Nothing is the honest default.)
  }

  /* -- selftest support --------------------------------------------------------- */

  snapshot() {
    const s = this.session;
    const ch = (f) => chipsOf(f).map((c) => `${c.key}:${c.num == null ? '-' : c.num}:${c.turns == null ? '-' : c.turns}`);
    const enabled = [...this.tray.querySelectorAll('button:not([disabled])')].map((b) => b.getAttribute('data-verse'));
    return {
      round: s.state.round,
      phase: s.state.over ? 'over' : s.state.phase,
      hpA: s.fighters.a.hp, hpB: s.fighters.b.hp,
      resA: s.fighters.a.resolve, resB: s.fighters.b.resolve,
      chipsA: ch(s.fighters.a), chipsB: ch(s.fighters.b),
      wax: waxGeom(s.state.fortune).pct.toFixed(2),
      enabled,
      logLen: s.log.length,
      over: s.state.over,
      winner: s.state.winner,
      verdict: s.state.over ? verdictOf(resultsOf(s), 'a', this.expected).key : null,
    };
  }
}
