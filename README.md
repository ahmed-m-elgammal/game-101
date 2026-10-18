# The Ashen Choir

**A build-driven, text-carried duel RPG with a deterministic async PvP ladder (the Choir Floor).**
3 Acts · 9 Chapters · 21 campaign duels · 4 classes · 10 endings (3 paths × 3 variants + 1 hidden) · 24 vows · 40 items · ~1.9 MB of self-hosted assets · zero external dependencies · fully offline.

| | |
|---|---|
| **Status** | **Phases 0–3 complete** — decision baseline, engine core, balance harness, and the Combat UI & First Playable Slice (`ui/` + `tools/build-site.js`): the Ashblade-vs-Bram tutorial is playable, offline, in a browser. Next: Phase 4 content data layer. |
| **Design doc (canon)** | [`THE-ASHEN-CHOIR-v1.0.1.md`](THE-ASHEN-CHOIR-v1.0.1.md) — v1.0 with every approved decision applied and tagged. The untouched v1.0 is kept alongside for diffing. |
| **Decision record** | [`docs/DECISIONS.md`](docs/DECISIONS.md) — verdicts on D1–D32, N1–N4, micro-gates, assumption register, reconciliations (24 vows / 40 items / 10 shrines). |
| **Roadmap** | [`TASKS.md`](TASKS.md) — 12 phases, 110 tasks, dependency-aware, written so each task can be implemented without guessing. |
| **Review corpus** | [`documentation/`](documentation/) — 00 change log (findings F1–F34, proposals, decisions) + five systems docs (01–05). |

## Repository map

```
THE-ASHEN-CHOIR-v1.md          canon v1.0 (frozen, for diffing)
THE-ASHEN-CHOIR-v1.0.1.md      amended baseline — the spec implementation reads
TASKS.md                       the development roadmap (phases 0–11)
docs/DECISIONS.md              every decision, recorded and dated
docs/ENGINE_RULES.md           the determinism coding standard (CI-enforced)
docs/SCHEMAS.md                frozen data shapes + Echo Code validation rules
docs/INVENTORY.md              content inventory targets (CI-tracked)
data/schemas/                  validators + fixtures (T0.3)
documentation/                 the review corpus (00–05)
engine/ rng/ sim/ story/ ui/ store/   module layout per [GDD] §15 (Phase 1 fills them)
tools/                         CI gates: check-bans, audit-amendment, check-inventory
tests/                         node --test suites (schemas + gate self-tests)
```

## Working agreements

- **Decision authority** was delegated to the design lead on 2026-10-18; every call is recorded in `docs/DECISIONS.md` and may be overturned by a dated entry there.
- **Every work session ends with a commit + push to this repo** (branch `main`), so the roadmap, the decision record and the code never drift apart.
- **CI gates from commit one**: purity bans (`Math.random`/wall-clock in engine paths), zero-network ban (no `fetch`/XHR/WebSocket anywhere), schema validation, spec-amendment audit (every change to the design doc carries its decision tag), content inventory (advisory until Phase 6, blocking at Phase 10).
- **Initial release = Phases 0–10.** Phase 11 (shared ladder, NG+, audio, fifth class) is specced in `TASKS.md` and explicitly out of v1.0 scope.

## Commands

```bash
npm test          # unit tests (schemas, CI-gate self-tests)
npm run ci        # bans + tests + inventory (what CI runs)
npm run audit:amendment   # verify the design doc's every change is decision-tagged
```

No dependencies. Node ≥ 18.
