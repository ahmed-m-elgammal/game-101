/**
 * components.js — T3.3/T3.4/T3.5/T3.7/T3.8 renderers.
 *
 * Render-only layer ([GDD] §15): no logic, no engine calls, no clocks. Every
 * function here takes plain data (shaped by ui/logic.js) and returns DOM
 * built exclusively through ui/dom.js — textContent APIs only, so prose and
 * player-entered text can never inject markup (T3.3 XSS discipline).
 *
 * §11.5 geometry lives in base.css tokens; these functions only decide
 * structure and which token a piece of data wears.
 */

import { el, svg, text, clear } from '../dom.js';
import { STATUS_GLYPHS, STATUS_COLORS, logClass, versePreview } from '../logic.js';

/** Status chip (§11.4/§11.5): glyph + name + turns + the one number. */
export function chipView(c) {
  const glyph = STATUS_GLYPHS[c.key];
  const color = STATUS_COLORS[c.key] || 'var(--bone-dim)';
  const parts = [c.key];
  if (c.turns != null) parts.push(`${c.turns}t`);
  if (c.num != null) parts.push(String(c.num));
  const node = el('span', {
    className: `chip${c.key === 'hush' ? ' chip--hush' : ''}`,
    attrs: { 'data-status': c.key },
    style: { 'border-color': `color-mix(in srgb, ${color} 50%, transparent)`, background: `color-mix(in srgb, ${color} 8%, transparent)` },
  });
  if (c.key === 'hush') node.style.setProperty('background', 'var(--soot-3)');
  if (glyph) node.append(svg(glyph.d, { filled: glyph.filled }));
  node.append(text(c.label || parts.join(' ')));
  return node;
}

/** One fighter panel: name, sub, HP bar, HP number, pips, chips. */
export function fighterPanel(f, opts = {}) {
  const instant = !!opts.instantHp; // DoT ticks bypass the 220ms drain
  const panel = el('section', {
    className: `panel panel--${f.side === 'a' ? 'player' : 'enemy'}`,
    attrs: { 'data-side': f.side },
  });
  panel.append(
    el('div', { className: 'fighter-name', text: f.sheet.name }),
    el('div', { className: 'fighter-sub', text: `${f.sheet.className} · L${f.sheet.level}${f.sheet.vowName ? ' · ' + f.sheet.vowName : ''}` }),
  );

  const hpNum = el('span', { className: 'hp-num', text: `${Math.max(0, Math.round(f.hp))} / ${Math.round(f.maxHp)}` });
  const fill = el('div', {
    className: 'hpbar-fill' + (instant ? ' hpbar-fill--instant' : ''),
    style: { width: '100%' },
  });
  fill.dataset.hp = String(f.hp);
  panel.append(
    el('div', { className: 'hpbar' }, [fill]),
    el('div', { className: 'row' }, [hpNum]),
  );
  panel._hpNum = hpNum;
  panel._hpFill = fill;

  const pips = el('div', { className: 'pips', attrs: { role: 'img', 'aria-label': `Resolve ${f.resolve} of 10` } });
  panel._pips = pips;
  panel.append(pips);

  const chips = el('div', { className: 'chips' });
  panel._chips = chips;
  panel.append(chips);
  return panel;
}

/** In-place panel refresh (structure stable across the whole fight). */
export function updateFighterPanel(panel, f, chips, opts = {}) {
  panel._hpNum.textContent = `${Math.max(0, Math.round(f.hp))} / ${Math.round(f.maxHp)}`;
  panel._hpFill.dataset.hp = String(f.hp);
  panel._hpFill.style.width = `${Math.max(0, Math.min(100, (f.hp / f.maxHp) * 100))}%`;
  panel._hpFill.classList.toggle('hpbar-fill--instant', !!opts.instantHp);
  clear(panel._pips);
  const r = Math.max(0, Math.min(10, f.resolve));
  for (let i = 0; i < 10; i++) {
    const frac = r - i;
    const pip = el('span', { className: 'pip' });
    if (frac >= 1) pip.classList.add('pip--full');
    else if (frac > 0) pip.classList.add('pip--partial');
    panel._pips.append(pip);
  }
  clear(panel._chips);
  for (const c of chips || []) panel._chips.append(chipView(c));
}

/** Verse tray: 4 slots + Strike. cost/cooldown stay readable at 38%. */
export function verseTray(onPick) {
  const tray = el('div', { className: 'verse-tray', attrs: { role: 'group', 'aria-label': 'Verses' } });
  tray._onPick = onPick;
  return tray;
}

/** (Re)fill the tray from legalVerses + cooldowns + resolve. */
export function updateVerseTray(tray, legal, allVerses, cooldowns, resolve) {
  clear(tray);
  for (const v of legal) {
    const cd = cooldowns[v.id] || 0;
    const affordable = resolve >= v.cost;
    const btn = el('button', {
      className: 'verse-btn',
      attrs: { 'data-verse': v.id, disabled: cd > 0 || !affordable ? '' : null },
    });
    btn.append(el('span', { className: 'v-name', text: v.name }));
    if (cd > 0) {
      btn.append(el('span', { className: 'v-cd', text: `${cd}` }));
      const sweep = el('span', { className: 'v-sweep', style: { transform: `scaleX(${Math.min(1, cd / Math.max(1, v.cd || 1))})` } });
      btn.append(sweep);
    } else {
      btn.append(el('span', { className: 'v-cost', text: v.cost === 0 ? '—' : String(v.cost) }));
    }
    const preview = el('span', { className: 'v-preview' });
    for (const p of versePreview(v)) preview.append(el('span', { text: p.label, style: { color: previewColor(p.key) } }));
    btn.append(preview);
    if (v.line) btn.append(el('span', { className: 'v-line', text: v.line }));
    btn.addEventListener('click', () => tray._onPick && tray._onPick(v.id));
    tray.append(btn);
  }
}

const PREVIEW_COLORS = {
  bleed: 'var(--st-bleed)', burn: 'var(--st-burn)', curse: 'var(--st-curse)', fray: 'var(--st-fray)',
  hush: 'var(--st-hush)', brace: 'var(--st-brace)', ward: 'var(--st-brace)', thorns: 'var(--st-thorns)',
  stun: 'var(--st-stun)', heal: 'var(--st-brace)', resolve: 'var(--st-rite)', cleanse: 'var(--st-brace)',
  damage: 'var(--bone-dim)', strike: 'var(--bone-dim)',
};
function previewColor(key) { return PREVIEW_COLORS[key] || 'var(--bone-dim)'; }

/** Log gutter: append-only. Entries carry [round n] + the type border. */
export function logGutter() {
  return el('div', { className: 'log', attrs: { 'aria-live': 'polite', 'data-testid': 'log' } });
}

export function appendLogEntry(gutter, entry) {
  const row = el('div', { className: `log-entry ${logClass(entry)}`, attrs: { 'data-round': String(entry.r) } });
  row.append(el('span', { className: 'log-r', text: `[round ${entry.r}]` }));
  row.append(el('span', { className: 'log-text', text: entry.text })); // textContent — prose is data
  gutter.append(row);
  while (gutter.childNodes.length > 120) gutter.removeChild(gutter.firstChild); // §14.3 "last several events"
  gutter.scrollTop = gutter.scrollHeight;
  return row;
}

/** Wax Meter (§10.6): the only animated element in combat. */
export function waxMeter() {
  const wrap = el('div', { className: 'waxbar', attrs: { 'data-testid': 'wax' } });
  const label = el('span', { className: 'round-counter', text: 'WAX' });
  const rail = el('div', { className: 'wax' });
  const fill = el('div', { className: 'wax-fill', style: { width: '50%' } });
  const hairline = el('div', { className: 'wax-hairline' });
  rail.append(fill, hairline);
  const num = el('span', { className: 'wax-num', text: '1.00' });
  wrap.append(label, rail, num);
  wrap._fill = fill;
  wrap._num = num;
  wrap._rail = rail;
  return wrap;
}

export function updateWaxMeter(wrap, geom) {
  wrap._fill.style.width = `${geom.pct}%`;
  wrap._num.textContent = geom.value.toFixed(2);
  wrap._rail.classList.toggle('wax--hot', !!geom.hot);
  wrap._rail.classList.toggle('wax--cold', !!geom.cold);
  wrap._fill.style.width = `${geom.pct}%`;
}

/** Reading card (§10.8/§11.5): always present on desktop; one tap-line on mobile. */
export function readingCard(view) {
  const card = el('aside', { className: 'reading', attrs: { 'data-testid': 'reading' } });
  const toggle = el('button', { className: 'reading-toggle', attrs: { 'aria-expanded': 'false' } });
  const body = el('div', { className: 'reading-body' });
  card.append(toggle, body);
  card._toggle = toggle;
  card._body = body;
  toggle.addEventListener('click', () => {
    const open = card.classList.toggle('reading--open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  updateReadingCard(card, view);
  return card;
}

export function updateReadingCard(card, view) {
  card._toggle.textContent = `READING — ${view.head}`;
  clear(card._body);
  card._body.append(
    el('div', { className: 'r-label', text: 'READING' }),
    el('div', { className: 'r-head', text: view.head }),
    el('div', { className: 'r-threat', text: view.threat }),
    el('div', { className: 'r-expect', text: view.expect }),
  );
  if (view.sync) card._body.append(el('div', { className: 'r-sync', text: view.sync }));
  if (view.seed) card._body.append(el('div', { className: 'r-seed', text: view.seed }));
}

/** Hint layer (T3.6): dismissable, non-blocking. */
export function hintView(hint, onDismiss) {
  const node = el('div', { className: 'hint', attrs: { 'data-hint': hint.id, role: 'note' } });
  const x = el('button', { className: 'hint-x', text: '×', attrs: { 'aria-label': 'Dismiss hint' } });
  x.addEventListener('click', () => { node.remove(); onDismiss && onDismiss(hint.id); });
  node.append(x, el('span', { className: 'hint-label', text: 'Maren' }), text(hint.text));
  return node;
}

/** Post-fight report (§10.7/§14.7). */
export function reportView(parts) {
  const node = el('section', { className: 'report', attrs: { 'data-testid': 'report' } });
  if (parts.lastBell) node.append(el('div', { className: 'last-bell', text: '— LAST BELL —' }));
  const verdict = el('div', { className: 'verdict' });
  verdict.append(text(parts.verdict.text));
  if (parts.verdict.key === 'favored-lost') {
    // D23: the "open it" link — routes to the Reading, not to shame
    const link = el('a', { className: 'link', text: ' open it.', attrs: { href: '#reading' } });
    link.addEventListener('click', (e) => { e.preventDefault(); parts.onOpenReading && parts.onOpenReading(); });
    verdict.append(link);
  }
  node.append(verdict);
  if (parts.calibration) node.append(el('div', { className: 'calibration', text: parts.calibration }));
  node.append(el('div', {
    className: 'report-totals',
    // result.display already carries the "MEASURE · XXXX-XXXX" prefix
    text: `rounds ${parts.rounds} · you dealt ${parts.totals.a} · you took ${parts.totals.b} · ${parts.display}`,
  }));
  const tray = el('div', { className: 'choice-tray' });
  const rebell = el('button', { className: 'choice-btn', text: parts.lost ? 'Re-bell. The candle is still lit.' : 'Fight again.' });
  rebell.addEventListener('click', () => parts.onRebell && parts.onRebell());
  tray.append(rebell);
  const leave = el('button', { className: 'choice-btn', text: parts.lost ? 'Back to the crypt (no punishment)' : 'Back to the crypt' });
  leave.addEventListener('click', () => parts.onExit && parts.onExit());
  tray.append(leave);
  node.append(tray);
  return node;
}
