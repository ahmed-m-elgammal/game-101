# SCHEMAS.md — Frozen data shapes (T0.3)

Every content row and every serialized object in The Ashen Choir validates against one of the schemas in `data/schemas/validators.js` before it ships. Field names are frozen here so the data layer (Phase 4), the engine (Phase 1), the story (Phase 6), the Floor (Phase 7) and persistence (Phase 9) never disagree. Fixtures for every schema live in `data/schemas/fixtures.json`; the CI test suite (`tests/schemas.test.js`) runs each fixture through its validator and rejects the known-bad examples.

## Catalogue

| Schema | Consumed by | Notes |
|---|---|---|
| `class` | engine, data | 27 base points, damage type, ≥9 verse ids |
| `verse` | engine, data | cost/CD/unlock + effects compiled to op-codes |
| `vow` | engine, data | `kind: class \| story`; story vows must name their `source` choice |
| `item` | engine, data | 3 slots; exactly one mark as op-codes; no random stats |
| `enemy` | engine, sim, data | alloc must equal `budget(L) = 35 + 2(L−1)` at ±0 (D7); `hybrid` class carries the declared Mother Bell override (A6) |
| `rite` | engine, data | `{ trigger: {atHP} \| {onTurn}, change: {damageType, statMults, versePool}, line }` per [GDD] §5.7 |
| `namedEcho` | Floor, Codex | toll 100–1900, `recasts` 0–3 (D16), weakness = the lesson |
| `chapter` | story | act/index/band/duels/choice/shrine flag |
| `choice` | story | exactly 3 options, one per tally, each with its reward |
| `objective` | story | Tallies of the City (D5): one line + machine-checkable test + ≤5 XP |
| `deed` | Codex | diegetic only — no currency, no gates (D19) |
| `vendorEntry` | economy | exactly 1 memory; `restock` must be false (D13/D14) |
| `saveState` | store | versioned; `loadouts` grows to 2 with the Twin Ledger (D3) |
| `echoCode` | Floor, security | v1/v2; the validation rules below |

## Echo Code validation rules ([GDD] §12.6, clarified by N1)

1. `level` is 1–10.
2. `sum(alloc) ≤ 4 + 2 × (level − 1)` — the validator is **never loosened**, even for bad doc examples (N1 corrected the spec example to sum 16 at L7).
3. Every verse id exists, is unlocked at that level, and belongs to the class or is common.
4. Every gear id exists.
5. Every vow id exists and is available to that class and story-state — a **story vow requires run story-state**, so bare v1 codes cannot carry one; v2 codes carry `tally`.
6. v2 adds `rite` and `tally`; the tally sums to ≤ 9 (nine choices).
7. An invalid code is rejected with the canonical copy: *"The Choir turns this Echo away. It rings false."*

## Example — v1 Echo Code (N1-corrected)

```json
{
  "v": 1, "name": "Mourne", "cls": "hollow_cantor", "level": 7,
  "alloc": { "vig": 3, "mig": 0, "wit": 9, "grd": 1, "hst": 3 },
  "vow": "silence",
  "verses": ["tolling_bell", "dirge", "requiem", "dissonance"],
  "gear": { "weapon": "tuning_fork", "vestment": "drowned_mantle", "relic": "deaf_wax" },
  "doctrine": "bulwark"
}
```

`alloc` sums to **16** = the L7 cap (`4 + 2×(7−1)`). The v2 shape adds `"rite": null` and `"tally": {"mercy": 3, "ruthless": 2, "devotion": 4}`.

## Effect op-codes

Every verse, vow and mark compiles to this vocabulary: `damage`, `bleed+`, `burn`, `curse`, `fray`, `hush`, `brace`, `ward`, `thorns`, `stun`, `heal`, `resolve`, `cleanse`, `mitigation_mod`, `crit_mod`, `dot_mod`, `conditional`, `once_per_fight`. New op-codes require a schema change (edit `validators.js`, add a fixture, update this list) — never a free-form effect object.
