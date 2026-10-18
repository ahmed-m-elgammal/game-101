/**
 * store.js — tiny run-state persistence for the playable slice.
 * T3.7 needs per-fight history (the D18 calibration line); T3.6 needs
 * dismissed hints to stay dismissed. Everything is local-only, non-tracking
 * (the T2.9 telemetry contract: toggle-off writes nothing — nothing here is
 * telemetry at all, just the two UI memories the spec asks for).
 *
 * Injectable backend so tests / the sandbox can pass a Map — the module
 * itself never touches globals at import time.
 */

const KEY = 'ashen.v1';

export function createStorage(backend) {
  const has = typeof localStorage !== 'undefined';
  const ls = backend || (has ? localStorage : null);

  function read() {
    if (!ls) return {};
    try {
      const raw = ls.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {}; // corrupted or blocked storage = fresh state, never a crash
    }
  }

  function write(state) {
    if (!ls) return;
    try { ls.setItem(KEY, JSON.stringify(state)); } catch { /* quota/blocked = ignore */ }
  }

  return {
    get(key, fallback) {
      const s = read();
      return s[key] !== undefined ? s[key] : fallback;
    },
    set(key, value) {
      const s = read();
      s[key] = value;
      write(s);
    },
    clear() {
      if (ls) { try { ls.removeItem(KEY); } catch { /* ignore */ } }
    },
  };
}
