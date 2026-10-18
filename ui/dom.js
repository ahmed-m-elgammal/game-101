/**
 * dom.js — T3.3 XSS discipline, in one place.
 *
 * RULE ([GDD] §15 / TASKS T3.3/T3.9): all prose and data are rendered via
 * text-content APIs. This module is the ONLY way UI code touches the DOM;
 * it never assigns markup through the HTML-injection properties, never
 * parses raw HTML from data, and the tools/check-bans.js UI pass enforces
 * those bans at the gate.
 *
 * Every render* function in the UI returns Elements built here, so a fight
 * log line that quotes player text is inert by construction — prose is data.
 */

const doc = typeof document !== 'undefined' ? document : null;

/** SVG namespace helpers for the §11.4 chip glyphs (no image files, ever). */
const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Build an element.
 * @param {string} tag
 * @param {object} [attrs] - className, text, html NEVER, attrs, style, on{}
 * @param {Array<Node|string>} [children]
 */
export function el(tag, attrs, children) {
  const node = doc.createElement(tag);
  if (attrs) {
    if (attrs.className != null) node.className = attrs.className;
    if (attrs.id != null) node.id = attrs.id;
    if (attrs.text != null) node.textContent = String(attrs.text); // the only text path
    if (attrs.attrs) {
      for (const [k, v] of Object.entries(attrs.attrs)) {
        if (v == null) continue;
        node.setAttribute(k, String(v)); // setAttribute coerces — never parses HTML
      }
    }
    if (attrs.style) {
      for (const [k, v] of Object.entries(attrs.style)) {
        if (v == null) continue;
        node.style.setProperty(k, String(v));
      }
    }
    const handlers = attrs.on;
    if (handlers) {
      for (const [name, fn] of Object.entries(handlers)) node.addEventListener(name, fn);
    }
  }
  if (children) {
    for (const child of children) {
      if (child == null) continue;
      node.append(typeof child === 'string' ? text(child) : child);
    }
  }
  return node;
}

/** A text node — the safe leaf for anything that came from data. */
export function text(value) {
  return doc.createTextNode(String(value));
}

/** Inline SVG glyph (§11.4): paths drawn with currentColor, no files. */
export function svg(pathD, attrs) {
  const svgEl = doc.createElementNS(SVG_NS, 'svg');
  svgEl.setAttribute('viewBox', '0 0 12 12');
  svgEl.setAttribute('aria-hidden', 'true');
  svgEl.setAttribute('class', 'chip-glyph');
  const shape = doc.createElementNS(SVG_NS, 'path');
  shape.setAttribute('d', pathD);
  shape.setAttribute('fill', 'none');
  shape.setAttribute('stroke', 'currentColor');
  shape.setAttribute('stroke-width', attrs && attrs.filled ? '0' : '1.2');
  if (attrs && attrs.filled) shape.setAttribute('fill', 'currentColor');
  svgEl.append(shape);
  return svgEl;
}

/** Clear a node (render functions re-mount into stable containers). */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/** Format a number for the mono contexts (tabular figures). */
export function fmt(n) {
  return String(Math.round(n * 100) / 100);
}
