# ENGINE_RULES.md — The determinism coding standard

The product promise is that the same seed + the same builds produce byte-identical fights on every device, forever ([GDD] §10.3, §10.12; TASKS.md T0.4). These rules are enforced by `tools/check-bans.js` in CI and by the Phase 1 ban suite (T1.9). They apply to `engine/`, `rng/`, `sim/` — and, for the network bans, to the entire repository.

## Purity rules (fight math must be a pure function of `(state, input, seed)`)

1. **No `Math.random()`** anywhere in `engine/`, `rng/`, `sim/`. All randomness flows through the mulberry32 stream and the six Measure shapes (`[GDD] §10.3–10.5`).
2. **No wall-clock reads**: no `Date.now()`, no `new Date()`, no `performance.now()` in fight paths. Hour slots for the Choir Floor derive from **UTC epoch hours** (`[GDD] §10.12`) — DST-immune, device-independent.
3. **No locale-dependent formatting** (`toLocaleString`, `toLocaleLowerCase`, `Intl.*`) inside the engine; numbers format at the UI layer with explicit, fixed rules.
4. **Fixed iteration orders**: iterate arrays, or sort object keys explicitly. Never depend on object key insertion order for math.
5. **Exactly one rounding point** at the final line of the damage pipeline (`[GDD] §15.1`); mitigation is **summed before application**; Fortune is clamped `[0.88, 1.12]` and shared fight-wide.
6. **True damage never crits, never jitters, never Fortune-scales** (`[GDD] §10.9` rules 2–3).
7. **No hidden modifiers**: every multiplier that touches a number must originate from a mark, a vow, a status, a Rite, or Fortune — all panel/meter-visible (`[GDD] §10.9` rule 8).

## Zero-network rules (the brand promise)

8. **No `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, or http(s) module imports anywhere** in the shipped game. All assets are self-hosted; total weight ≈ 1.9 MB. The single allowlist is this tool's own source, which necessarily contains the ban patterns.
9. **Provisional constants live in one place**: any `PROVISIONAL:D#` number (see DECISIONS.md) gets a single source (Phase 1 will add `data/config.js`); it is never spread through the codebase.

## The honesty firewall (T5.6, [GDD] §12.3 rules 4–5)

The Echo AI reads the opponent **only through `visibleOf()`** (`engine/ai.js`) — the frozen projection of what the fighter panel shows: HP, Resolve, status chips with values, the D10 temperature bar when one is exposed, and the defender's mitigation **constants** (public math; never the vow/gear identities that produce them). Rules, enforced by `tests/phase5-honesty.test.js`:

10. **The projection is the only target view.** The decision layer (`chooseVerse`, every doctrine in `engine/doctrines.js`, the T5.7 scripts) receives the raw actor (an AI may know its own build) but the opponent only as the frozen projection. `Object.isFrozen` is deep — the view cannot be mutated or grafted open.
11. **No hidden reads, by architecture.** The AI layer imports no vow/gear accessors (`data/vows.js`, `data/items.js`) and contains no raw `opponent.sheet` / `target.sheet` reads. Both are source-scanned in CI alongside the purity bans.
12. **Poison-equality is the proof.** Two boards identical in every visible field but structurally different underneath (different hand, vow, gear, cooldowns, flags) must produce byte-identical score tables and the same pick — through the default scorer and all four doctrines. Any hidden read would leak into the numbers and fail the pin.

## CI gate order

`tools/check-bans.js` (purity + network) → `node --test tests/` → schema validation (T0.3) → `tools/audit-amendment.js` (spec hygiene) → `tools/check-inventory.js` (advisory until Phase 6, `--strict` blocks at Phase 10).
