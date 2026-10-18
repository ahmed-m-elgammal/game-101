/**
 * scene.js — T3.9: the minimal narrative scene renderer (Chronicle seed).
 * [GDD] §14.2 shape, §3 choice format, §11.2 plate slot. Phase 6 grows this
 * into the campaign; Phase 8 (T8.2) styles it into the full Chronicle.
 *
 * Scenes are DATA (story schema T0.3 family — the `scene` kind lands with
 * this task). The renderer validates through logic.sceneShape before any
 * DOM exists, and every string reaches the page through textContent — the
 * same XSS discipline as the duel screen (prose is data).
 */

import { el, clear } from '../dom.js';
import { sceneShape } from '../logic.js';

/**
 * Render a scene node.
 * @param {object} node - raw scene node (schema: `scene`)
 * @param {{onChoice?: function(choice), onDuel?: function(duelId)}} handlers
 * @returns {HTMLElement}
 */
export function renderScene(node, handlers = {}) {
  const scene = sceneShape(node); // throws on malformed input — never renders garbage
  const root = el('section', { className: 'scene', attrs: { 'data-scene': scene.id } });

  if (scene.plate) {
    // §11.2: act plates are real files (T8.9) — the slot is built now and
    // degrades to a framed placeholder when the asset has not landed yet.
    const plate = el('img', {
      className: 'scene-plate',
      attrs: { loading: 'lazy', decoding: 'async', alt: `${scene.heading} — act plate`, src: scene.plate },
    });
    plate.addEventListener('error', () => plate.remove());
    root.append(plate);
  }

  root.append(el('h2', { className: 'scene-heading', text: scene.heading }));

  for (const p of scene.prose) {
    const block = el('p', { className: 'scene-prose' + (p.spoken ? ' scene-prose--spoken' : '') });
    if (p.speaker) block.append(el('span', { className: 'speaker', text: p.speaker }));
    block.append(el('span', { text: p.text })); // textContent — the only path
    root.append(block);
  }

  if (scene.choices.length) {
    const tray = el('div', { className: 'choice-tray', attrs: { role: 'group', 'aria-label': 'Choices' } });
    for (const c of scene.choices) {
      const btn = el('button', { className: 'choice-btn', attrs: { 'data-choice': c.id } });
      btn.append(el('span', { text: c.label }));
      btn.append(el('span', { className: 'c-tally', text: `${c.tally} +1` }));
      if (c.gift) btn.append(el('div', { className: 'scene-gift', text: c.gift }));
      btn.addEventListener('click', () => {
        tray.remove(); // a choice is made once; the scene remembers it
        handlers.onChoice && handlers.onChoice(c);
      });
      tray.append(btn);
    }
    root.append(tray);
  }

  if (scene.duelId) {
    const tray = el('div', { className: 'choice-tray' });
    const btn = el('button', { className: 'choice-btn', text: 'Light the candle.' , attrs: { 'data-duel': scene.duelId } });
    btn.addEventListener('click', () => handlers.onDuel && handlers.onDuel(scene.duelId));
    tray.append(btn);
    root.append(tray);
  }

  return root;
}

/** Mount helper for the boot shell. */
export function mountScene(container, node, handlers) {
  clear(container);
  container.append(renderScene(node, handlers));
}
