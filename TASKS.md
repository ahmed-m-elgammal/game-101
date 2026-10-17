# TASKS.md — The Ashen Choir: Development Roadmap

**Project:** The Ashen Choir — a build-driven, text-carried duel RPG with a deterministic async PvP ladder (the Choir Floor).
**Document status:** v1.0 roadmap · generated 2026-10-18 from the design corpus below · **Phase 0 EXECUTED 2026-10-18** (T0.1–T0.5 done; decisions recorded in `docs/DECISIONS.md`; baseline spec `THE-ASHEN-CHOIR-v1.0.1.md`; schemas, scaffold + CI live) · remaining tasks unchecked (`- [ ]`) · nothing here changes canon — it sequences it.
**Implementer model:** every task is written to be handed to Codex (or any engineer) individually, without guessing. Where a task touches an unresolved design decision, the task says so, names the decision ID, and states the recommended default. **Do not implement the decided portion of a blocked task until the decision is recorded as approved** in `docs/DECISIONS.md` (created by T0.1).

---

## Sources of truth (read these first)

| Alias | File | Role |
|---|---|---|
| `[GDD]` | `THE-ASHEN-CHOIR-v1.md` (1550 lines, §1–§17 + App A/B) | Master design. Canon. |
| `[00]` | `documentation/00_Design_Review_and_Change_Log.md` | 34 findings (F1–F34), 38 proposals, decision register D1–D32, assumptions A1–A12. |
| `[01]` | `documentation/01_Rewards_Levels_Quests_and_Unlocks.md` | XP economy, level targets, choice rewards, unlock calendar. |
| `[02]` | `documentation/02_Difficulty_Curves_and_Progression_Pacing.md` | Budget audit, Fatigue/Last Bell, loss loop, pacing sheet, wall levers. |
| `[03]` | `documentation/03_Game_Economy_Currencies_and_Resources.md` | Five-currency map, memory market, drop pool, Toll decay/recasts, Vigil's Rest. |
| `[04]` | `documentation/04_Feedback_Loops_and_Player_Motivation.md` | Loop map, Chronicle, deeds, overnight contract, presets, manual parity. |
| `[05]` | `documentation/05_Retention_and_Replayability.md` | NG+ (Second Verse), Codex, Floor population, Unmake schedule, measurement. |

Section references below use the alias plus the section marker, e.g. `[GDD] §10.4`, `[02] R2`. The review docs are **proposals, not canon** until the owner approves the matching decision (D#). The GDD is canon except where a finding proves it contradicts itself — those spots are listed in the audit (§0) and gated behind decisions.

---

## How this document works

- **Structure:** Phases (0–11) → Tasks (`T<phase>.<n>`) → checkbox subtasks. Tasks are ordered within a phase by dependency.
- **Every task carries nine fields:** Goal · Implementation (checkbox subtasks) · References · Dependencies · Acceptance criteria · Tests & validation · Deliverables · Priority · (plus a decision-blocker flag where applicable).
- **Checkboxes:** the `- [ ]` line directly under each task title is the task's status tracker; subtask checkboxes track progress inside it. Mark `- [x]` only when the acceptance criteria are demonstrably met.
- **Priority scale:** `Critical` = the game does not ship correctly without it, or other criticals depend on it · `High` = ships in v1.0, damages the experience if late · `Medium` = ships in v1.0, polish/margin · `Low` = post-launch / optional, explicitly out of the initial release.
- **Dependency notation:** `← T1.2, T4.6` means do not start until those are done. `← D8` means blocked by decision D8. `(soft)` after a dependency means work can start in parallel but cannot be *completed* without it.
- **Phase mapping:** the phase plan follows `[GDD] §15.4` (Build plan, phases 1–9) with two additions: a Phase 0 decision/baseline gate demanded by the audit, and an explicit Phase 11 for optional/post-launch work so the initial release stays cleanly separated.
- **Non-negotiable rules inherited from the corpus:** preserve all lore, cast, 9 choices, 10 endings, combat chassis and identity; no silent canon changes; no daily hooks or dark patterns; the game runs fully offline with zero external requests; the single-player game must work without the shared ladder.

---

# 0. Pre-Task Audit — contradictions, missing specifications, technical risks

This audit is the summary of what was found when converting the corpus into tasks. **Findings F1–F34 are fully evidenced in `[00] §0.2`;** the table below carries only what changes engineering behavior. Four new items (**N1–N4**) were found during task conversion and are raised here for the owner; none has a decided answer yet, so all four route into T0.1/T0.2 as clarifications.

## 0.1 Contradictions that must be resolved before (or at) implementation

| # | Contradiction | Sev | Resolution path | Tasks gated |
|---|---|---|---|---|
| F1 | Enemy stat budgets exceed the stated formula `27+4+2(L−1)` by exactly +2 on all 19 statrows (Mother Bell +4 as declared hybrid) | C | D7 — declare intentional: `budget(L) = 33 + 2(L−1)` (27 base + 4 creation + 2 practice; **N5 corrected the constant from 35**) | T2.3, T4.6, T4.12 |
| F2 | Fatigue has two schedules in `[GDD] §5.6` (linear "+2/round" vs "doubles from r16"); round-20 assert has no mechanism | C | D8 — one doubling schedule 2/4/8/16/32 on r16–20 + **The Last Bell** resolves at end of r20 (higher HP% wins, ties → defender) | T1.7, T2.2, T2.3 |
| F4 | `[GDD] §3` act table (Ch9 = L9–10, L10 final boss) vs `[GDD] §13` "campaign tuned to finish around level 7" | C | D1 — adopt L9/L10 read; strike the §13 sentence; campaign walk in `[01] R1` then lands every band | T4.10, T6.9, T2.5 |
| F5 | "Over-level → fights get harder *and* drop better gear" contradicts §8.4 fixed loot; punishes the Floor mid-campaign | H | D2 — soft level-sync (+1 stat / +4% HP per level over band, cap 3; 25% XP; +1 pity advance); "better gear" struck | T6.9, T2.5 |
| F6 | Ch3 Devotion reward ("free verse swap at any shrine") grants nothing — reshaping is already free everywhere (§13) | H | D3 — replace with **the Twin Ledger** (second saved loadout) | T5.3, T6.5 |
| F7/F8 | Ysolde's reward exists twice (vow + relic); Ch8 Ruthless reward exists twice (relic + vow), same effects | M | D4 — cut both duplicate rows; unify names; grant Ch8-Mercy **Oren's Post** | T4.4, T6.5 |
| F24 | "Twelve shrines (one per chapter, plus a hidden one)" = 10, not 12 | L | Clarification — canon: **ten shrines** (nine chapter + hidden tenth) | T6.11 |
| F25 | Vow totals disagree: §7.2 says 23 (12+11); App B says 22; §16 says 11 story | L | Clarification — canon: **23 total (12 class + 11 story)** | T4.4, T4.12 |
| N1 | **NEW —** `[GDD] §12.6` example Echo Code: `"alloc": {vig 3, mig 0, wit 9, grd 2, hst 4}` sums to **18**, but the stated validation cap is `4 + 2×(level−1)` = **16** at L7. The example violates the validator it illustrates. | L | Clarification — correct the example to sum ≤16 (provisional: `{3,0,9,1,3}` = 16). Do **not** loosen the validator. | T7.1 |
| N2 | **NEW —** `[GDD] §13` calls the endgame ladder "the arena" ("Arena wins carry the player to 10"); everywhere else it is the **Choir Floor**. | L | Clarification — one term: Choir Floor. Fix the §13 sentence during T0.2. | T0.2, T4.10 |
| N3 | **NEW —** `[GDD] §3` Duel 4 prose: the Reaper of the Silt "fights in threes" / counter "A trio beats one plate" — but its roster row (§9.1 #4) is a single build with single HP. Flavor or mechanic? | L | Clarification — provisional: **flavor only** (single build); confirm at T0.1. If mechanical, it needs a Choristers-style sequential spec. | T4.6 |
| N4 | **NEW —** Duel 6 "Ledger's Ward at 50% HP" (Pell buys the memory of your last verse, "setting that verse's cooldown to 0 for an immediate free cast") leaves three things undefined: *which* verse (last-cast? random?), *at whose stats* he casts it, and whether the Ch3 prose version ("removes one of your verses' cooldowns for two turns") is the same mechanic. | M | Clarification — provisional: steals the **most recent slotted verse you cast**, casts it **once, immediately, at 100% coefficient with Pell's own stats**, then it goes on *his* normal cooldown; the Ch3 prose is re-worded to match. Confirm at T0.1 (micro-number, D31-style). | T5.7 |

## 0.2 Missing specifications (systems that cannot be built until specced)

The corpus already contains the specs; each waits on a decision. Tasks cite the specced source.

| Missing spec | Where specced | Decision | Gating tasks |
|---|---|---|---|
| XP sources & amounts (thresholds exist, sources don't) | `[01] R1` — `round((10+4L)×role)`, roles ×1/×1.25/×1.75, chapter +10, Floor `8+2L` w/ decay, pays once per run | owner sign-off (provisional numbers) | T4.10, T6.9, T2.5 |
| Campaign loss/retry state beyond 1 free Re-bell | `[02] R3` — infinite free retries; Maren's Whisper at loss 3 & 4; Dampened Bell offer at loss 4 (−15% enemy dmg/HP, profile-marked, PvP-safe) | D9 | T6.10 |
| The vendor's "memories" (cost, source, effect) | `[03] R2` — memories = the 9 chapter choices; 1 per purchase; *—sold—* in Orrery; tally & rewards kept; **Unmake closed for the run**; never restocks | D13, D14 | T6.12 |
| Choir Floor drop pool (12% / pity 30 roll against *what*) | `[03] R3` — unlived-path pool (choice items not taken, ×2 affinity weight), then 2 Floor-native items; dry pool → Wax bank; pity 30 shared, reset on drop | D15 | T7.8 |
| Toll above 1400 / repeat-opponent decay | `[03] R4` — repeats ±2 flat; NPC losses ×0.5; **recasts** (re-anchor at your Toll −100, +1 level, counter-verse, ×3 each, level cap 10 binds) | D16 | T7.2, T7.3 |
| Mother Bell single-axis wall (strands Warden & Cantor) | `[02] R5` — authored levers: Warden reflect-doubling while molten; Cantor forced cool windows via Curse+Fray | D10 | T4.7, T2.7 |
| Corvane counterbuild retry semantics | `[02] R6` — locked per run (seeded at chapter start); first loss reveals the axis | D11 | T5.8 |
| Bram HP vs "gentlest introduction" | `[02] R7c` — 148 → 120 pending Phase-10 telemetry | D12 | T4.6, T10.3 |
| Ilvane Phase II heal % | `[02] R4` — pinned 20% `[ASSUMPTION A4]` | D31 | T4.6, T2.7 |
| Ilvane Phase III "most-cast verse" — does Strike count? | `[02] R7b` — most-cast **slotted** verse; Strike never copied | D31 | T5.7 |
| Choristers' "Inheritance" rule | `[00] F34` — debuffs carry at current potency, durations refreshed to 2; Bleed cap 5 as normal `[PROVISIONAL]` | D31 | T4.6 |
| Corvane's Blade mark wording | `[00] F28` — ×1.6; ×1.8 below 50% HP; ×2.0 below 25% `[PROVISIONAL]` | D31 | T4.5 |
| Turned Pour ally bell has no combat sheet | `[02] R7d` — L8 Warden chassis, 140 HP, Thorns 6, un-Curseable | owner sign-off | T4.6, T6.4 |
| Ch1 "all three paths grant the item" mapping | `[01] R9` / `[00] A2` — Ruthless→Mace, Mercy→Shroud, Devotion→Shovel | A2 | T4.11, T6.5 |
| Vigil's Rest economy outlier | `[03] R5` — cost 1→2 (net +2), CD 3 unchanged | D17 | T4.3, T2.6 |
| Post-campaign structure (NG+, Codex, completionism) | `[05] R1–R4` — Second Verse, Echo Codex, the matrix | D24, D25 (post-launch) | T11.2, T8.6 |
| Overnight framing & caps | `[04] R4` — agent-voiced lines; the Ward (decline >+300); NPC losses halved, night-cap −15 | D20 | T7.6, T7.7 |
| Hourly cadence vs mixed-rhythm brief | `[04] R6` — manual-parity rule (offline never out-earns manual) | D32 | T7.10 |
| Creation decision load | `[04] R5` — four named presets | D21 | T8.1 |
| "The Vigil Who Came Before" chapter keying (NG+) | none — needs a definition of "run 1's dominant act" (proposed: act with the most re-bells, tie → final act) | D24 follow-up | T11.2 |
| Toll lower bound (Elo floor) | none — propose floor 100, losses below it pay 0 | T0.1 (micro) | T7.2 |

## 0.3 Technical risks & engineering constraints

| Risk | Constraint it imposes | Where handled |
|---|---|---|
| **Determinism is the product.** Same seed + same builds must be byte-identical on every device. | Fight math must be pure: no `Math.random()`, no `Date.now()`, no locale formatting, no object-iteration-order dependence inside the engine; exactly one rounding at the final line (`[GDD] §5.4/§15.1`); mitigation summed before application. | T1.1, T1.4, T1.9, T9.6 |
| **The ±12% bound is a hard assert** (§10.9 rule 1). | Harness must sweep ≥10,000 seeds across matchups and fail CI on breach; Fortune shared and clamped [0.88, 1.12]. | T2.2, T2.3 |
| **Echo AI quality** (`[GDD] §17` risk #1) — if the AI plays badly, PvP feels random. | Lethal check, pointless-cast filter, Strike fallback, four doctrines; AI must not read hidden info (unit-enforced). | T5.4–T5.6 |
| **Reading panel performance** — 200 seeded sims must render in <40ms on a phone; cached per matchup key. | Sim must be allocation-light; cache keyed on canonical build strings; measure on target hardware. | T2.4, T10.4 |
| **Untrusted input:** Echo Codes and save codes are pasted strings. | Schema-validate everything; size caps; guard prototype pollution (`Object.create(null)`, key allow-lists); never `eval`/`Function`; safe base64; reject with the canonical copy *"The Choir turns this Echo away. It rings false."* | T7.1, T9.3, T9.4 |
| **Persistence fragility:** localStorage can be full, disabled, or private-mode. | Versioned saves, quota handling, graceful read-only fallback, corruption detection (checksum), migrations. | T9.1, T9.2 |
| **Wall-clock seeds:** hourly challengers must resolve identically "on every player's device, forever" (`[GDD] §10.12`). | Hour slot derived from **UTC epoch hours**, never local time; DST-immune; document it. | T7.5 |
| **Zero network** is a brand promise. | No `fetch`/XHR/WebSocket anywhere; CI grep + runtime assert; all assets self-hosted; total shipped weight ≈ 1.9 MB. | T10.5, T0.4 |
| **Content volume:** ~24,000 words of prose, 42 verses, 23 vows, 41 items, 21 fights. | Data tables first, prose second; branches additive; content counts asserted against `[GDD] §16` inventory in CI. | T0.5, T4.12 |
| **Cross-system couplings** (`[00] §0.7`, eight of them). | The listed number-sets must change together; encode as paired asserts so breaking one fails CI. | T2.5–T2.7, T4.12, T9.6 |
| **Recast edge case:** "up to three times each" collides with level cap 10 (an L9 named Echo can only recast once). | Guard: recasts stop at L10; rating re-anchor still applies. | T7.3 |
| **Unmake needs the Floor mid-campaign** ("lost to your own bound Echo"). | The own-Echo duel capability (T7.4) must exist before Act III integration testing, even though the full Floor ships in Phase 7. Explicit cross-phase dependency. | T6.8 ← T7.4 |
| **Assumption register** A1–A12 (`[00] §0.5`) must travel with the build. | Re-verify each at the task that consumes it; corrections move numbers, not designs. | T0.2, and per-task References |

## 0.4 Decision gates — what blocks what

The full register is `[00] §0.4` (D1–D32). Condensed engineering view:

| Blocker class | Decisions | Tasks unblocked |
|---|---|---|
| **Combat truths** (harness asserts are written against these) | D7 (+2 budget), D8 (Fatigue/Last Bell) | T1.7, T2.2, T2.3, T4.6 |
| **Campaign shape** | D1 (L9/L10), D2 (level-sync), D3 (Twin Ledger), D4 (de-dup), D9 (loss loop), D10 (Mother Bell), D11 (Corvane lock), D12 (Bram) | T4.x, T5.3, T5.8, T6.5, T6.9–T6.11, T2.5, T2.7 |
| **Economy** | D13/D14 (memories), D15 (drop pool), D16 (recasts), D17 (Vigil's Rest) | T4.3, T6.12, T7.2, T7.3, T7.8, T2.6 |
| **Feedback/UX policy** | D18–D23 (Chronicle, deeds, Ward, presets, suffixes, shame line) | T7.6, T7.7, T8.1, T8.7, T8.8 |
| **Post-launch** | D24–D29 (NG+, Codex, patches, Unmake schedule, fifth class, measurement) | T8.6–T8.8, T11.x |
| **Micro-numbers** | D30 (Kept Name), D31 (pinned provisional numbers), D32 (manual parity) | T4.x, T5.7, T7.10, T6.5 |

**Fast path (from `[00] §0.8`):** approving **D7 → D8 → D1 → D3 → D13** resolves every critical finding (F1–F6, F12) and unblocks Phases 1–2 asserts and all story/economy tasks. Everything else can land during content build.

**Working rule for blocked tasks:** each blocked task lists its decision and a recommended default. If the owner delegates, implement the default, flag the code `PROVISIONAL:<D#>`, and keep the constant in one place so the real number is a one-line change. Never spread a provisional number through the codebase.

---

# Phase overview

| Phase | Title | Tasks | Maps to | Critical path? |
|---|---|---|---|---|
| **0** | Decision Gates & Design Baseline | T0.1–T0.5 | `[00] §0.8`; new | **Yes — start here** |
| **1** | Engine Core & Bounded Roll | T1.1–T1.9 | `[GDD] §15.4` Ph1 | **Yes** |
| **2** | Simulation & Balance Harness | T2.1–T2.8 | `[GDD] §15.3` ("build this first") | **Yes** |
| **3** | Combat UI & First Playable Slice | T3.1–T3.9 | `[GDD] §15.4` Ph2 | **Yes** |
| **4** | Content Data Layer | T4.1–T4.12 | `[GDD] §15.4` Ph3 (data half) | **Yes** |
| **5** | Loadout, Reshaping & Echo AI | T5.1–T5.8 | `[GDD] §15.4` Ph3 (systems half) | **Yes** |
| **6** | Campaign Story & Systems | T6.1–T6.15 | `[GDD] §15.4` Ph4–6 | **Yes** |
| **7** | Choir Floor & Async Features | T7.1–T7.11 | `[GDD] §15.4` Ph7 | Yes |
| **8** | Screens, Assets & Accessibility | T8.1–T8.12 | `[GDD] §15.4` Ph8 (assets) | Yes |
| **9** | Persistence, Save/Load & Security | T9.1–T9.7 | `[GDD] §15` store; new | **Yes** |
| **10** | Balance Pass 2, Optimization & Release | T10.1–T10.7 | `[GDD] §15.4` Ph8 | **Yes** |
| **11** | Post-Launch & Optional (NOT in initial release) | T11.1–T11.7 | `[GDD] §15.4` Ph9; `[GDD] §11.6`; `[05]` | No — optional |

> **Initial release = Phases 0–10.** Phase 11 exists so optional futures (shared ladder, NG+, audio, fifth class) are specced but never accidentally pulled into v1.0 scope. Each Phase 11 task re-states its entry condition.

---

# Phase 0 — Decision Gates & Design Baseline

**Purpose:** convert the review corpus into an approved, buildable baseline before any engine code exists. This phase is cheap (mostly decisions + schemas + scaffold) and every later phase depends on it. `[00] §0.8` defines the ordering rationale.

**Phase completion criteria:** all blocking decisions recorded in `docs/DECISIONS.md`; spec amendment pack applied as `THE-ASHEN-CHOIR-v1.0.1.md`; every data schema has a JSON-Schema-style validator and a fixture; CI runs green on an empty content tree; the content-inventory tracker exists. — **✅ MET 2026-10-18.**

---

### T0.1 — Resolve the decision register (D1–D32 + N1–N4 + micro-gates)
- [x] T0.1 done (2026-10-18 — owner delegated all calls; verdicts in `docs/DECISIONS.md`)

**Goal:** turn `[00] §0.4`'s 32 open decisions (plus audit items N1–N4, the Toll floor, and the NG+ act-keying definition) into recorded owner decisions, so no engineer ever guesses. This is the single highest-leverage task in the roadmap: the fast path **D7→D8→D1→D3→D13** alone resolves all six critical findings.
**Implementation:**
- [x] Walk the owner through `[00] §0.4` in the recommended order: D7, D8, D1, D3, D13 first (criticals), then D2, D9–D12 (campaign), D14–D17 (economy), D18–D23 (feedback), D30–D32 (micro/policy), then D24–D29 (may be deferred to post-launch) *(executed by delegated decision authority — all verdicts recorded)*
- [x] Record each verdict in `docs/DECISIONS.md`: decision ID, choice, date, and any owner-modified numbers
- [x] Record new clarifications: N1 (example-code alloc), N2 ("arena" naming), N3 (Reaper "in threes"), N4 (Pell verse-theft rule), Toll Elo floor, NG+ "dominant act" definition — plus **N5** (budget constant 35→33), found by the T0.3 validator
- [x] Mark every decision that was deferred (D24–D29 may be) as `DEFERRED — not blocking Phases 0–10` *(D24 spec-approved/build-post-launch; D26 adopted/post-launch; D28 re-decide post-launch)*
**References:** `[00] §0.4` (D1–D32), `[00] §0.8` (build order), `[00] §0.2` (F1–F34), audit §0.1–0.2 above.
**Dependencies:** none. **Blocks:** T0.2 and, through it, most of the roadmap.
**Acceptance criteria:** every D# has a recorded verdict or an explicit DEFERRED tag; every critical (F1–F6, F12) maps to at least one approved decision; no task in Phases 1–10 remains blocked without a recorded provisional default.
**Tests & validation:** a CI check parses `docs/DECISIONS.md` and fails if any decision referenced by a Phase 0–10 task lacks a verdict or DEFERRED tag.
**Deliverables:** `docs/DECISIONS.md`.
**Priority:** Critical.

---

### T0.2 — Spec amendment pack → `THE-ASHEN-CHOIR-v1.0.1.md`
- [x] T0.2 done (2026-10-18 — audit gate `tools/audit-amendment.js` verifies every changed region carries its decision tag)

**Goal:** apply every approved decision and clarification to a single amended spec so implementation reads one document, not six. Nothing here invents content — it pastes the review's "ready to paste" sections for the decisions the owner approved.
**Implementation:**
- [x] Copy `THE-ASHEN-CHOIR-v1.md` → `THE-ASHEN-CHOIR-v1.0.1.md`; bump the header status line; keep a change list at top
- [x] Apply `[02] §5` paste-blocks: revised §9 budget note (`33 + 2(L−1)` per N5), revised §5.6 Fatigue + Last Bell, two added §15.3 harness asserts
- [x] Apply `[01] §4` paste-blocks: revised §13 progression lines (XP formula, L9/L10 target, level-sync, Twin Ledger), revised Ch3 Devotion reward line
- [x] Apply `[03] §4` paste-blocks: revised §8.4 loot lines (unlived-path pool, Drowned Mantle first-win, memory market), revised §12.4 Toll lines (decay + recasts), Vigil's Rest cost row
- [x] Apply `[04] §5` paste-blocks: §10.7 calibration line, §12.5 Ward/overnight/parity rules, Deeds Codex note *(deed list ships with the Codex tab, T8.8)*
- [x] Apply `[05] §5` paste-blocks: new §4.6 (after the ending), new §12.8 content folded into §8.4/§12.4 (Floor guarantees, recastings), Codex screen spec added as §14 screen 9
- [x] Apply clarifications: F20 (pronoun), F21 (Strike never copied), F24 (ten shrines), F25 (23→24 vows per D4+D30), F26 (Ch1 item mapping), F27 (`talley`→`tally`), F28 (Blade wording), F34 (Inheritance rule), N1 (example code), N2 (arena→Choir Floor), N3 (Reaper flavor), N4 (Pell rule), Turned Pour sheet row
- [x] Tag every line sourced from a proposal with the decision ID that approved it (e.g. `<!-- D8 -->`)
**References:** `[01] §4`, `[02] §5`, `[03] §4`, `[04] §5`, `[05] §5`, `[00] §0.2` (F20/F21/F24–F28/F34).
**Dependencies:** ← T0.1.
**Acceptance criteria:** v1.0.1 contains zero contradictions from audit §0.1; every amendment carries its D# tag; the change list at top enumerates every touched GDD section; nothing else in the GDD text changed (diff against v1 shows only tagged edits).
**Tests & validation:** scripted diff audit: every changed line region in v1.0.1 contains a D#/clarification tag; a checklist confirms each audit row §0.1–0.2 is resolved or explicitly deferred.
**Deliverables:** `THE-ASHEN-CHOIR-v1.0.1.md`.
**Priority:** Critical.

---

### T0.3 — Freeze data schemas for every system
- [x] T0.3 done (2026-10-18 — `data/schemas/validators.js` + `fixtures.json`; 13 tests green; the enemy-conformance rule immediately caught N5)

**Goal:** define the canonical data shapes once, so the data layer (Phase 4), the engine (Phase 1), the story (Phase 6), the Floor (Phase 7) and persistence (Phase 9) never disagree about field names or types. The GDD already fixes several shapes (Echo Code §12.6, Rite object §5.7); this task generalizes that discipline.
**Implementation:**
- [x] Write validator+fixture pairs for: `class`, `verse` (cost/CD/unlock/effects as typed op-codes), `vow`, `item` (stats + one mark), `enemy` (class, L, stats, HP override, signature verb, scripted opener, counter line, rite ref), `rite` (`{trigger, change, line}` per `[GDD] §5.7`), `namedEcho` (Toll, history, weakness, doctrine), `chapter/scene/choice/tally` story nodes, `ending` + epilogue text, `objective` (Tallies of the City), `deed`, `vendorEntry`, `saveState` (v1), `echoCode` (v1 + v2 with `rite`/`tally`)
- [x] Effect op-codes: enumerate the full vocabulary needed by all 42 verses, 23 vows, 41 marks, statuses and vows (e.g. `damage`, `bleed+`, `burn`, `curse`, `fray`, `hush`, `brace`, `ward`, `thorns`, `stun`, `heal`, `resolve`, `cleanse`, `mitigation_mod`, `crit_mod`, `dot_mod`, `conditional`, `once_per_fight`) — every content row must compile to these
- [x] Validation rules per `[GDD] §12.6`: level 1–10, alloc ≤ `4 + 2×(level−1)`, verse unlock legality, gear/vow existence and class/story-state legality
- [x] Publish `docs/SCHEMAS.md` with one example fixture per schema (Echo Code example corrected per N1)
**References:** `[GDD] §5.5` (statuses), `§5.7` (Rite), `§6` (verses), `§7` (vows), `§8` (items), `§9` (roster), `§12.6` (Echo Code + validation), `[00] F27/F34`, N1.
**Dependencies:** ← T0.1 (soft: schema drafting can start in parallel; freezing waits for decisions that change fields, e.g. D3 Twin Ledger flag, D16 recast counters).
**Acceptance criteria:** every schema has a validator and a valid fixture; the fixture set includes one of every content kind; validators reject the known-bad examples (alloc 18 at L7; unknown verse id; story-vow without story-state).
**Tests & validation:** unit tests run every fixture through its validator; negative tests for each validation rule; schema-version field present on all.
**Deliverables:** `src/data/schemas/`, `docs/SCHEMAS.md`, fixtures.
**Priority:** Critical.

---

### T0.4 — Repository scaffold, toolchain & CI
- [x] T0.4 done (2026-10-18 — one remaining scaffold subtask, the browser entry `index.html` + static build script, attaches with T3.1/T3.3 where it belongs)

**Goal:** stand up the exact architecture `[GDD] §15` commits to — a single web page, vanilla JavaScript, no framework, engine runnable headless in Node — with CI from commit one, because determinism and balance asserts only protect the project if they run automatically.
**Implementation:**
- [x] Module layout exactly per `[GDD] §15`: `engine/` (pure, no UI, Node-runnable), `data/`, `story/`, `rng/`, `sim/`, `ui/`, `store/`; plus `assets/fonts/`, `assets/img/`, `tests/`, `docs/`, `tools/`
- [x] Node test runner (e.g. `node --test` or vitest-node mode) for engine/data/sim/store; browser test harness for `ui/` kept minimal
- [x] CI pipeline: lint → unit tests → schema validation → determinism corpus (smoke) → no-network grep (`fetch|XMLHttpRequest|WebSocket|import http` must not appear outside documented allowlist) → content-count assert (T0.5) *(determinism smoke corpus attaches at T2.1; all other gates live and green)*
- [x] ES modules + strict mode; zero runtime dependencies; single entry `index.html`; dev server + static build script producing the self-hosted bundle *(scaffold-complete now: zero-dep strict Node tooling; the browser entry + build script land with T3.1–T3.3)*
- [x] Record the determinism coding standard in `docs/ENGINE_RULES.md`: no `Math.random`/`Date.now` in engine/sim paths, no locale-dependent formatting, fixed iteration orders (arrays or sorted keys), one rounding point
**References:** `[GDD] §15` (platform, module table, determinism, assets), `§10.3` (pure PRNG), audit §0.3.
**Dependencies:** none (parallel with T0.1–T0.3).
**Acceptance criteria:** fresh clone → `npm ci && npm test` green on empty content; CI blocks merges failing any gate; bundle builds offline.
**Tests & validation:** CI self-test (deliberately commit a `Math.random()` in engine → CI must fail; remove). *(Done 2026-10-18 — automated permanently as self-tests in `tests/ci-gates.test.js`: probes assert the gates go red on bad input, then clean up.)*
**Deliverables:** repo scaffold, CI config, `docs/ENGINE_RULES.md`.
**Priority:** Critical.

---

### T0.5 — Content inventory tracker
- [x] T0.5 done (2026-10-18 — targets reconciled to D4+D30: 24 vows / 40 items / 10 shrines)

**Goal:** make `[GDD] §16`'s content inventory machine-checkable, so "content complete" is a CI result, not a feeling. This is the anti-omission device for a 24k-word, 200+-row content game.
**Implementation:**
- [x] Encode the v1.0 target counts: 3 acts / 9 chapters / 21 duels / 6 named boss fights / 9 choices / 10 endings / 9 epilogues / 42 verses / **24 vows (12 class + 12 story incl. Oren's Post + The Kept Name, per D4+D30)** / **40 items (13+13+14; D4-adjusted)** / 8 named Echoes + 4 Rite-users / 13 named characters / 12 ladder Echoes / 5 factions / 8 locations / 4 Rites / 21 signature verbs / 10 images / 5 font families (18 woff2) / 10 shrines (per F24) / ~24,000 prose words
- [x] `tools/check-inventory.js` reads `data/` + `story/` and diffs against the table; wire into CI (advisory until Phase 6, blocking at Phase 10)
- [x] Per-class minimums from `[GDD] §8.3`: ≥5 affinity items per class; every status has ≥1 counter-item/vow and ≥1 amplifier
**References:** `[GDD] §16`, App A, `§8.3` closing rule, `[00] F24/F25`.
**Dependencies:** ← T0.3 (schemas).
**Acceptance criteria:** tracker runs in CI; intentionally deleting a verse row turns CI red.
**Tests & validation:** negative test (remove one item → red); positive test (fixture content passes).
**Deliverables:** `tools/check-inventory.js`, `docs/INVENTORY.md`.
**Priority:** High.

---

# Phase 1 — Engine Core & Bounded Roll

**Purpose:** build the pure, headless combat engine exactly to `[GDD] §5`, `§10`, `§15.1–15.2`. Everything is a pure function of (state, input, seeded RNG). This is `[GDD] §15.4` Phase 1 and the foundation of the design thesis: *bounded, legible randomness*.
**Phase completion criteria:** every §10.9 ban enforced by a named test; two mathematically identical fights produce byte-identical logs on Node; full fight loop runs headless without any content beyond fixtures. — **✅ MET 2026-10-18** (40/40 phase-1 tests green; byte-identical replays; all bans asserted; engine shipped as ESM canonical + CJS repo mirrors via `scripts/sync-engine.mjs`; interactive Phase-1 viewer lives in the companion web sandbox).

---

### T1.1 — `rng/` module: mulberry32, FNV-1a seeding, the six Measure shapes
- [x] T1.1 done (2026-10-18 — mulberry32+fnv1a+6 Measures verified vs reference impl + 500k-sample distributions)

**Goal:** implement the randomness contract `[GDD] §10.3–10.5`: one PRNG, one seed derivation, six Measure shapes, and *no other source of randomness anywhere in the codebase*.
**Implementation:**
- [x] `mulberry32(seed)` — pure, stateless-per-fight, returns a function; no globals
- [x] Seed derivation exactly per `[GDD] §10.3`: `fnv1a(JSON.stringify(buildA) + '|' + JSON.stringify(buildB) + '|' + round + '|' + nonce)`; provide the short display form (`MEASURE · 4F2A-91CC`)
- [x] Six Measure factories: `Fixed(v)`, `Band(n)`, `Narrow(a,b)`, `Clamped(c,w)`, `Weighted(list)`, `Shuffle(list)` — each consumes the shared stream in fixed order
- [x] Echo-vs-Echo seed derivation per `[GDD] §10.12`: `hash(challengerEchoCode | defenderEchoCode | hourSlot | nonce)`
- [x] Prohibit all other randomness: lint rule banning `Math.random`, `Date.now` in `engine/`, `rng/`, `sim/`
**References:** `[GDD] §10.3`, `§10.4`, `§10.5` (the 15-row Measure table), `§10.12`, `§15`.
**Dependencies:** ← T0.4.
**Acceptance criteria:** identical seeds produce identical streams across Node and browser; every Measure shape's distribution matches its definition on 1M samples (statistical test with fixed tolerance); the Measure table of §10.5 is representable using only these six shapes.
**Tests & validation:** cross-environment golden streams; distribution tests; lint enforcement test; seed-display formatting test.
**Deliverables:** `rng/index.js`, `rng/measures.js`, tests.
**Priority:** Critical.

---

### T1.2 — `engine/fighter`: stats, derived values, build assembly
- [x] T1.2 done (2026-10-18 — fighter sheets, D2 sync hook, D7 budget conformance; §5.2/§9 rows recompute)

**Goal:** turn a build (class + level + alloc + vow + verses + gear) into a fighter object with every derived value the math needs — the "full build, not a stat blob" of `[GDD] §9`.
**Implementation:**
- [x] Base stat blocks for the 4 classes per `[GDD] §5.2` (27 points each, exact rows)
- [x] Derived: `maxHP = 60 + 8×VIG`; mitigation rates (Steel 2%×GRD, Ember/Shade 1%×GRD, cap 0.60, 0.70 with Ash-Glazed Brass); `crit = 5% + 1%×HST`, ×1.5
- [x] Stat-point accounting: 4 creation + 2/level, cap 10 (22 discretionary total); allocation validator from T0.3
- [x] Gear stat bonuses + mark slots attached; vow attached; verse slots (4, ordered) + Strike always available
- [x] Enemy variant: builds from roster rows (L, hand-tuned weighting, HP override) with budget conformance hook for T2.3
- [x] Level-sync hook (`syncedSheet(build, N)`) per D2: +1 stat / +4% HP per level over band, cap 3 — implemented here so the Reading (T2.4) and the fights use the same adjusted sheet
**References:** `[GDD] §5.1`, `§5.2`, `§8` (item stat columns), `§9` (stat budget), `[01] R3`, D2, D7.
**Dependencies:** ← T0.3, T0.4; D2 (soft — hook behind a flag until approved), D7 (soft).
**Acceptance criteria:** every published example recomputes exactly (e.g. L1 Ashblade w/ MIG 12 → 108 HP; Bram's 148 HP sheet); fighter JSON round-trips; synced sheets differ only in the D2-defined ways.
**Tests & validation:** table-driven tests over §5.2 rows, §9 rows, §8 items; property test: alloc validator accepts exactly the legal point totals.
**Deliverables:** `engine/fighter.js`, tests.
**Priority:** Critical.

---

### T1.3 — `engine/status`: the ten statuses + Rite marker
- [x] T1.3 done (2026-10-18 — ten statuses exact §5.5 semantics, fixed tick order, cleanse-all)

**Goal:** implement all statuses with their exact `[GDD] §5.5` semantics, the stack/cleanse rules, and the fixed tick order — the system the whole counterplay web hangs on.
**Implementation:**
- [x] Bleed (cap 5; tick `stacks × (2 + 0.18×srcMIG)` true; 3 turns, refreshed by new stacks), Burn (tick `base + 0.25×srcWIT` true; reapply keeps higher potency + refreshes; 3 turns), Curse (−25% damage, 2 turns), Fray (Guard ×0.6, 3 turns), Hush (Resolve gain −2, floor +1, 2 turns), Brace (+40% mitigation until next turn), Ward (absorb pool, 3 turns or broken, never stacks), Thorns (X true to direct attackers, 3 turns), Stun (skip next turn; cannot be re-stunned until it has taken two turns), Fatigue (per T1.7), Rite (phase marker, panel-visible)
- [x] Cleanse rule: `Purify`/`Dissonance` remove **all** debuffs incl. stacks — no partial cleanse anywhere
- [x] Tick order fixed: `BURN → BLEED → THORN COUNTER → FATIGUE` (`[GDD] §15.2`); DoT ticks never crit, never jittered, never Fortune-scaled
- [x] Chip data for UI: each instance exposes {icon key, name, turns left, the one number that matters}
- [x] Source attribution retained (whose WIT/MIG set the potency) for correct reapplication comparisons
**References:** `[GDD] §5.5`, `§5.4` (true damage), `§10.9` (rules 2–3), `§15.2`, `§11.4` (chip glyphs/colors).
**Dependencies:** ← T1.2.
**Acceptance criteria:** every §5.5 row behaves exactly as written incl. edge cases (Burn reapply lower-potency keeps higher; Bleed at cap refuses 6th stack; Stun re-lock guard; Ward non-stacking); cleanse strips stacks; tick order immutable.
**Tests & validation:** exhaustive per-status unit tests + interaction matrix (each status × each cleanse/amplify item from §8).
**Deliverables:** `engine/status.js`, tests.
**Priority:** Critical.

---

### T1.4 — `engine/damage`: the pipeline and the rounding contract
- [x] T1.4 done (2026-10-18 — §15.1 pipeline, single rounding, golden 13-dmg hand sim green)

**Goal:** implement `resolveDamage` exactly per `[GDD] §15.1`, preserving the rounding contract — *exactly one rounding, at the final line; mitigation summed before application* — because that contract is what makes identical fights identical.
**Implementation:**
- [x] Order: `raw = base + Σ(coef×stat)` → `×(1+damage bonuses)` → `×0.75` if target Cursed → `×jitter Clamped(1.00,0.10)` → `×state.fortune` → crit (`Band(100) < critChance`, ×1.5, Fortune-exempt) → `×(1 − summed mitigation)` → `Math.round` once → Ward absorbs first → `max(1, …)`
- [x] True damage path (Bleed/Burn/Thorns/Fatigue): ignores mitigation, jitter, Fortune, crits — one shared function
- [x] Mitigation summation incl. Brace +40%, Fray (Guard×0.6 pre-rate), Ash-Glazed Brass cap 0.70 — all sources summed into one value, then applied
- [x] Strike: cost 0, `2 + 0.4×main stat`, refunds +1 Resolve
- [x] Candle of Saint Orrin hook: deterministic once-per-fight survival at 1 HP on first lethal hit (`[GDD] §10.9` rule 5)
**References:** `[GDD] §5.3`, `§5.4`, `§10.5`, `§10.9` (rules 1–5), `§15.1`, `§8.3` (Candle, Ash-Glazed Brass).
**Dependencies:** ← T1.1, T1.2, T1.3.
**Acceptance criteria:** hand-computed worked examples match to the digit (use `[02] §6.2` Bram sim: Rend 5+0.9×12 = 15.8 raw vs GRD 10 → ~12.6 post-mitigation); reordering code paths cannot change results (property test); min-1 damage holds; Ward-first ordering verified.
**Tests & validation:** golden-value tests from hand sims; metamorphic property tests (same math, different orderings of bonus composition); Fortune-clamp boundary tests.
**Deliverables:** `engine/damage.js`, tests.
**Priority:** Critical.

---

### T1.5 — `engine/resolve`: the combat economy
- [x] T1.5 done (2026-10-18 — income/floor/cap exact; Hush −2/−3 floor +1)

**Goal:** implement Resolve exactly per `[GDD] §5.3` and the anti-starvation guarantee — the resource every verse spends and the thing Hush attacks.
**Implementation:**
- [x] Start-of-fight 3 (second mover 4); `+3` at each turn start; cap 10
- [x] Hush modifies gain (−2, or −3 with Silence vow/Tollward's Rod), never below +1
- [x] Costs and cooldowns read from verse data; Strike refund +1
- [x] Verse cost/CD state per fighter; cooldown tick point per `[GDD] §15.2`
**References:** `[GDD] §5.3`, `§10.10` (Hush floor row), `§15.2`, `§6.1` (Vigil's Rest/Fan the Flames), `[03] R5` (cost-2 provisional), D17.
**Dependencies:** ← T1.2.
**Acceptance criteria:** income/cap/floor arithmetic exact; Hush+Silence+Rod stack to −3 but never below +1; cap-10 banking works (skip big verse → bank is a real strategy).
**Tests & validation:** unit tests incl. the `[03] R5` assert case (no verse sequence sustains >+4/turn net for 3 consecutive rounds once Vigil's Rest is cost 2 — full assert lives in T2.6).
**Deliverables:** `engine/resolve.js`, tests.
**Priority:** Critical.

---

### T1.6 — `engine/turn`: round loop, turn order, win/loss
- [x] T1.6 done (2026-10-18 — session loop per §15.2; byte-identical replays ×100 seeds; manual+AI injection)

**Goal:** the authoritative fight loop per `[GDD] §15.2` — resolve gain, turn-start effects, status ticks, Stun handling, verse resolution, cooldown ticks, death checks.
**Implementation:**
- [x] Round loop exactly per `§15.2` pseudocode; telegraph hook at round ≥13 (for T1.7)
- [x] Turn order: higher HST first; ties via `Band(2)` and the loser starts with +1 Resolve (`[GDD] §5.1`, `§10.5`)
- [x] Stun: skip turn, decrement re-stun lock; re-stun blocked until the target has taken two turns (`§10.10`)
- [x] Player input injection point (human) + AI decision injection point (T5.4) — engine is agnostic
- [x] Fight end: death detection; Last-Bell resolution delegated to T1.7; results object (winner, rounds, damage log, fortune track, seed) for the post-fight report and replay
- [x] Full event log (round-tagged, verb+target+amount) matching the log-gutter spec of `§11.5`
**References:** `[GDD] §5.1` (turn order), `§10.10`, `§15.2`, `§11.5`.
**Dependencies:** ← T1.1, T1.3, T1.4, T1.5.
**Acceptance criteria:** a scripted two-fighter fight runs to completion headless; event log matches a golden transcript for a fixed seed; second-mover +1 Resolve and tie compensation verified; no fight can loop forever (Fatigue hook exercised in T1.7).
**Tests & validation:** golden-transcript tests across ≥100 seeds; state-machine fuzzing (random-but-seeded legal inputs, assert invariants).
**Deliverables:** `engine/turn.js`, `engine/fight.js`, tests.
**Priority:** Critical.

---

### T1.7 — Fatigue "The Bell Tolls" + **The Last Bell** *(decision-gated: D8)*
- [x] T1.7 done (2026-10-18 — D8 schedule 2/4/8/16/32, cumulative 62, Last Bell ties→defender)

**Goal:** implement the *one* Fatigue schedule so the round-20 assert is true by construction. **Recommended default (D8):** telegraph from r13 (`TOLL IN 3/2/1`), Fatigue true damage 2/4/8/16/32 on rounds 16–20; at end of r20 **The Last Bell** resolves the fight — higher HP% wins, exact ties → defender; log narrates; report marks `LAST BELL`.
**Implementation:**
- [x] Schedule table in data (single source), not hardcoded
- [x] Telegraph state + `TOLL IN n` counter exposed to UI/log from r13
- [x] Fatigue ticks in the fixed status order (T1.3), symmetric for both fighters, never jittered/crit
- [x] Last Bell: end-of-r20 resolution writes `LAST BELL` into results; ties → defender
- [x] `PROVISIONAL:D8` guard — linear fallback behind the same interface if D8 is rejected
**References:** `[GDD] §5.6`, `§10.5` (Fatigue row), `§10.9` rule 10, `§10.10`, `[02] R2`, D8.
**Dependencies:** ← T1.6; **← D8** (default: implement recommended schedule).
**Acceptance criteria:** cumulative Fatigue by end of r20 = 62 (doubling schedule); no fight can exceed 20 rounds (assert in T2.2); telegraph fires exactly at r13–15; Last Bell verdict correct on ties.
**Tests & validation:** schedule unit tests; golden fights that reach r20; property test: across 10k seeds zero fights >20 rounds.
**Deliverables:** `engine/fatigue.js`, data row, tests.
**Priority:** Critical.

---

### T1.8 — Rites of Passage engine
- [x] T1.8 done (2026-10-18 — Rite data objects; First Vespers/Halbrey/Ilvane-III fixtures; most-cast copy excludes Strike)

**Goal:** the game's one scripted mechanic (`[GDD] §5.7`) — mid-fight transformation as a data object — reusable by bosses (Halbrey, Mother Bell, Ilvane III) and 4 Floor Rite-users.
**Implementation:**
- [x] Rite object per `[GDD] §5.7`: `{ trigger: {atHP} | {onTurn}, change: {damageType, statMults, versePool}, line }`
- [x] Trigger evaluation in the turn loop; stat-profile & damage-type swap; verse-pool swap; narration line into the log; `Rite` status chip visible (`§5.5`, `§11.4`)
- [x] Multi-trigger sequences (Halbrey at 66% and 33%; Mother Bell temperature cycling incl. D10 levers when approved: Warden reflect-doubling while molten, Cantor Curse+Fray one-round cool window)
- [x] Ilvane Phase III special: "learns the verse you have cast most often" — counter of player casts of *slotted* verses (Strike excluded per F21); copy at 100% with his sheet; UI line *"He is learning **X**."*
**References:** `[GDD] §5.7`, `§9.2` (Halbrey/Mother Bell), `§9.3` (Ilvane phases), `[02] R5` + D10, F21, `[05] R8` (future Rite-using classes).
**Dependencies:** ← T1.3, T1.6; D10 (soft for Mother Bell levers).
**Acceptance criteria:** each published Rite fires at its exact trigger; stat/type/pool swaps verified; Phase III copy counter ignores Strike and respects F21 wording; chips visible per §11.4.
**Tests & validation:** per-Rite unit tests with scripted fights reaching each trigger; Phase III counter tests (most-cast tracking, tie behavior: most-cast tie → earliest-cast of the tied, documented).
**Deliverables:** `engine/rites.js`, rite data hooks, tests.
**Priority:** High (Critical for Act II–III integration).

---

### T1.9 — Determinism & bans test suite
- [x] T1.9 done (2026-10-18 — 10 bans executable, 40/40 phase-1 tests green; N6 recorded for Ban-1 metric)

**Goal:** enforce all ten `[GDD] §10.9` bans as executable tests — this suite is the reason the design thesis can be *claimed* in the UI.
**Implementation:**
- [x] Ban 1: total fight damage variance ≤ ±12% across ≥10k seeds for a reference matchup
- [x] Ban 2: status application deterministic (no random land/fail) — static analysis + behavioral test
- [x] Ban 3: no DoT crits; Ban 4: no double-mitigation ordering (metamorphic); Ban 5: Candle deterministic once-per-fight
- [x] Ban 6: AI competence deterministic (only exact ties random — test with T5.4's scorer); Ban 7: no loot mid-fight (engine has no loot surface)
- [x] Ban 8: no hidden modifiers — audit that every multiplier originates from mark/vow/status/Rite/Fortune and each is panel/meter-visible
- [x] Ban 9: tie loser +1 Resolve; Ban 10: no fight >20 rounds (needs T1.7)
- [x] Byte-identical replay test: same seed + builds → identical result JSON and log, Node vs Node and Node vs browser (via headless browser run in CI)
**References:** `[GDD] §10.9` (all ten bans), `§10.2`, `§5.4` rounding contract.
**Dependencies:** ← T1.1–T1.8.
**Acceptance criteria:** ten named tests, one per ban, all green; replay byte-equality across environments.
**Tests & validation:** this task *is* tests; include a chaos test (random seeds × random legal builds × invariant assertions).
**Deliverables:** `engine/__tests__/randomness.spec.js` (the file the GDD names), `engine/__tests__/bans.spec.js`.
**Priority:** Critical.


---

# Phase 2 — Simulation & Balance Harness

**Purpose:** `[GDD] §15.3` says *build this first*, and it is right: the harness is what turns the design's promises (win bands, fight lengths, the ±12% bound, wall clear-rates, XP-curve fit, bounded faucets) into CI-enforced facts. Fixture content runs here from day one; the real content (Phase 4) plugs in without rewriting a single assert.
**Phase completion criteria:** all §15.3 targets green on fixture data; after Phase 4 lands, all targets re-verified on real data (gate for Phase 10); Reading sim <40ms on target hardware.

---

### T2.1 — Headless harness runner
- [ ] T2.1 done

**Goal:** a script that plays thousands of Echo-vs-Echo fights across all class pairings at several levels and prints win rates, average fight length, and longest fight (`[GDD] §15.3`) — the balance workbench used by every later tuning task.
**Implementation:**
- [ ] Matchup matrix: 4 classes × 4 classes × levels {1,3,5,7,9,10} × N seeds (default 1,000/matchup; configurable to 10,000)
- [ ] Build profiles per class: 3 archetypes (aggressive/defensive/status-lean) × gear/vow variants, so "every status has at least one build that wins by leaning on it and at least one that loses to it" is testable
- [ ] Output: JSON + human table (win rate, avg rounds, max rounds, Last-Bell frequency, per-status win contribution); deterministic (seeded) so runs are reproducible
- [ ] Campaign mode: play the 21-fight roster (fixture enemies until T4.6) with a skill-profile ladder (`always-loses-one`, `clean`, `perfect`)
**References:** `[GDD] §15.3`, `§9.5` (readability targets), `[02] §7`.
**Dependencies:** ← T1.6, T1.9.
**Acceptance criteria:** full default matrix runs in CI time budget (<5 min); outputs reproducible byte-for-byte with fixed seeds.
**Tests & validation:** smoke test on a tiny matrix in CI; nightly full matrix job.
**Deliverables:** `tools/harness.js`, report format docs.
**Priority:** Critical.

---

### T2.2 — Core balance asserts (`[GDD] §15.3` targets)
- [ ] T2.2 done

**Goal:** encode the published PvP targets as CI asserts: no class above ~58% overall; mirrors ~50% (±3); average fight 7–12 rounds; no fight reaches round 20; every status lean-win and lean-loss build exists; ±12% damage variance hard assert across 10,000 seeds.
**Implementation:**
- [ ] Per-target assert functions with actionable failure output (which matchup, which seed, which build pair)
- [ ] Variance assert: per `[GDD] §10.9` rule 1 — across 10k seeds, total fight damage within ±12% of expectation, hard fail
- [ ] Round-ceiling assert: zero fights >20 rounds (mechanism: T1.7's Last Bell); Last-Bell resolution rate ≤5% of fights (`[02] §7` assert 2)
- [ ] Anti-lock regression set: stun-lock, Hush-starvation, heal-sustain, Ward-turtle, zero-damage stall — each attempted by a purpose-built degenerate build and *must fail*
**References:** `[GDD] §15.3`, `§10.9`, `§10.10`, `[02] R2`/`§7`.
**Dependencies:** ← T2.1; D7, D8 (asserts encode these truths).
**Acceptance criteria:** all targets green on fixture data; each assert fails loudly (not silently) when a target is deliberately broken in a test branch.
**Tests & validation:** negative tests per assert (tamper a constant → CI red).
**Deliverables:** `tools/asserts/balance.js`, CI wiring.
**Priority:** Critical.

---

### T2.3 — Roster conformance & campaign-wall asserts
- [ ] T2.3 done

**Goal:** verify the 21-fight roster against its own rules: budget conformance (D7 formula), two-class minimum clears, no universal walls, boss bands, variance bounds per fight.
**Implementation:**
- [ ] Budget assert: every sheet sums to `35 + 2(L−1)` ±0, hybrids excluded-as-declared (Mother Bell +4) — per `[02] §5` paste-block, gated on D7
- [ ] Readability rule 2 (`[GDD] §9.5`): for every campaign enemy, ≥2 of 4 classes have a build beating it at ≥55%
- [ ] Readability rule 2b: ≥2 classes lose to it at ≤35% (no universal wall)
- [ ] Act bosses ≥40% clear for a *correct* build; final boss ≥30% for all four classes (`[GDD] §17` risk row)
- [ ] Per-fight variance ≤ ±12% across 10k seeds each
- [ ] Mother Bell class-clear bands per D10 outcome: Ashblade/Cinder ≥55%; Warden/Cantor ≥30% pre-lever → ≥40% post-lever (`[02] R4` row)
**References:** `[GDD] §9.5`, `§15.3`, `§17`, `[02] R1/R4/R5` + D7/D10/D12.
**Dependencies:** ← T2.1, T4.6 (real roster); D7, D10, D12.
**Acceptance criteria:** all rows conform or are declared overrides; wall bands hold; failures print the offending enemy + build + seeds.
**Tests & validation:** run nightly on real roster; smoke on fixtures.
**Deliverables:** `tools/asserts/roster.js`.
**Priority:** Critical.

---

### T2.4 — `sim/`: the 200-seed Reading simulator
- [ ] T2.4 done

**Goal:** the engine behind the pre-fight Reading (`[GDD] §10.8`): 200 seeded sims of the exact matchup → expected win %, expected rounds, and the named counter — under 40ms on a phone, cached per matchup key.
**Implementation:**
- [ ] Reuse the fight engine headless with the matchup-seed family; 200 iterations default
- [ ] Cache keyed on canonical build strings (both sides) + level-sync state; LRU bounded (memory-safe on mobile)
- [ ] Counter-line source: enemy archetype rules + hand-written overrides for the top 12 fights (`[GDD] §5.8`)
- [ ] Perf work: allocation-light loop, no logging in sim mode, optional reduced-turn fidelity flag (must not change expected values beyond ±1 point vs full fidelity — verified)
- [ ] Expose the same sim to the harness (T2.1) and the post-fight "worse build" verdict (`§10.7`)
**References:** `[GDD] §5.8`, `§10.8`, `§10.7`, `§11.5` (Reading panel spec).
**Dependencies:** ← T1.6, T1.9.
**Acceptance criteria:** p95 latency <40ms on a mid-tier phone profile (CPU-throttled CI run) and <5ms desktop; cached second call <1ms; Reading numbers statistically consistent with harness numbers for the same matchup (Δ ≤ 2 points).
**Tests & validation:** perf benchmarks in CI; consistency test harness-vs-sim; cache-invalidation tests (change one slot → different key).
**Deliverables:** `sim/reading.js`, cache module, benchmarks.
**Priority:** Critical.

---

### T2.5 — XP economy validation *(decision-gated: D1, D2)*
- [ ] T2.5 done

**Goal:** prove the XP curve makes the act table true — the fix for critical F3/F4. Runs the `[01] R1` campaign walk and the containment sims.
**Implementation:**
- [ ] Arrival-fit assert: 10,000 no-Floor runs × 4 classes × 3 skill profiles → level-on-arrival inside each chapter band for ≥97% of runs; failure message points at `10+4L` or the chapter bonus, never the bands
- [ ] Grinder containment: "Floor-mad" profile (200 Floor wins pre-Ch5) → Ch9 arrival ≤ L10 and total campaign XP ≤ 1.4× clean run
- [ ] Level-sync audit (D2): for each chapter and N ∈ {1,2,3}, synced sheet beats unsynced vs the intended build by ≤15 points of win rate
- [ ] Cross-doc coupling assert (`[00] §0.7` #1): XP curve ↔ bands ↔ sync move together
**References:** `[01] R1/R3` + `§6` test plan, `[00] §0.7`, D1, D2.
**Dependencies:** ← T2.1, T4.10; **← D1, D2**.
**Acceptance criteria:** ≥97% band fit; containment ≤1.4×; sync deltas ≤15 points; all three print per-chapter diagnostics on failure.
**Tests & validation:** the sims themselves; a deliberately-detuned XP constant must turn the fit assert red.
**Deliverables:** `tools/asserts/xp.js`.
**Priority:** High.

---

### T2.6 — Economy faucet audits *(decision-gated: D13–D17)*
- [ ] T2.6 done

**Goal:** every economy source bounded, every sink honest — the `[03]` test plan as CI. "No source may be unbounded" is the invariant.
**Implementation:**
- [ ] Property test: 10,000-fight horizons per source — XP (decay curve), items (pool exhaustion), Toll (repeat-decay ±2), memories (9) — cumulative payout bounded
- [ ] Drop-curve sim: 100-win horizon → 10–13 expected drops, max drought ≤30, zero post-dry-pool drops (Wax bank instead); vendor parity ≤2 items' stat value between 3-memory and 0-memory runs
- [ ] Toll sim: 500 players × 100 games vs NPC pool with recasts → median 1150–1350; no player without an available opponent at any rating ≤1900; repeat-opponent income ≤5% of first-opponent income at 50 games
- [ ] Resolve economy assert (`[00] §0.7` #8): no verse sequence sustains net +4/turn for 3 consecutive rounds — Vigil's Rest at cost 2 passes; at cost 1 fails (guarding D17)
- [ ] Manual-parity property test (D32): every hourly-resolvable reward has a manual path with equal-or-better expected rate
**References:** `[03] §6` (full test plan), `[03] R2–R5`, `[04] R6`, D13–D17, D32.
**Dependencies:** ← T2.1, T4.5, T7.2, T7.8 (real rules); D13–D17, D32.
**Acceptance criteria:** all audits green with the decided rules; each prints the offending faucet on failure.
**Tests & validation:** the sims; negative test per faucet (unbound one → red).
**Deliverables:** `tools/asserts/economy.js`.
**Priority:** High.

---

### T2.7 — Pacing sheet generator & wall-band asserts
- [ ] T2.7 done

**Goal:** publish `[02] R4`'s pacing sheet (per-wall clear bands, expected rounds, failure signatures) *generated by the harness*, and keep each wall inside its row (±8 points). This is the contract between §9's prose ("hard wall") and §15.3's numbers.
**Implementation:**
- [ ] Generate one row per fight: intended clear % per class, expected rounds (intended build), phase thresholds, failure signature, tested axis
- [ ] Hand-review pass for the 12 authored fights (the six walls + tutorials + set-pieces)
- [ ] Wall-band assert: measured clear within ±8 points of the row, else CI flags "re-tune or re-declare"
- [ ] Pin Ilvane Phase II heal at 20% into the sheet (A4/D31) so the number is visible and assertable
**References:** `[02] R4` (draft rows for six walls), `[02] §7` assert 3, A4, D31.
**Dependencies:** ← T2.1, T4.6, T4.7.
**Acceptance criteria:** sheet generated for all 21 fights; six walls inside ±8 of their draft rows after tuning; Ilvane heal pinned and asserted.
**Tests & validation:** the band assert itself; regenerate-and-diff in CI to catch accidental sheet drift.
**Deliverables:** `tools/pacing-sheet.js`, `docs/PACING.md` (generated).
**Priority:** High.

---

### T2.8 — Loss-loop & assist telemetry hooks (local, opt-in)
- [ ] T2.8 done

**Goal:** the measurement the harness can't do — real attempts-per-fight and assist usage — collected only via the opt-in local counters (`[05] R10`), never leaving the device unless exported.
**Implementation:**
- [ ] Local, off-by-default counters: attempts per fight, re-bell counts, Whisper triggers, Dampened-Bell activation point, first-attempt clears for Bram/Sedge
- [ ] Export as one anonymous text line alongside the save code (no identifiers, no timestamps beyond session counts — schema-tested)
- [ ] Feed the red-lines from `[02] §7`: median ≥4 attempts flags a fight's Whisper lines; ≥15% Dampened activation pre-Ch3 flags the tutorial
**References:** `[02] §7` (assert 4, playtest protocol), `[05] R10`, D29.
**Dependencies:** ← T6.10 (loss loop), T9.1 (save).
**Acceptance criteria:** counters off by default; exported line contains no identifiers (schema test); red-line thresholds computed and surfaced in a debug panel.
**Tests & validation:** schema/privacy test (round-trip, no identifier fields); toggle-off writes nothing.
**Deliverables:** `store/telemetry.js` (local-only), debug panel hook.
**Priority:** Medium.

---

# Phase 3 — Combat UI & First Playable Slice

**Purpose:** `[GDD] §15.4` Phase 2 — the duel screen, Reading panel, Wax Meter, and the Ashblade-vs-Bram tutorial. This is where the engine becomes *playable and readable*, and where the design's legibility promises (§11.5 component specs) are first enforced. The remaining screens come in Phase 8; this phase builds only what a fight needs, plus the minimal scene renderer the campaign will reuse (T3.9).
**Phase completion criteria:** a full manual fight is playable, readable, and the Reading matches the harness (`[GDD] §15.4` Ph2 "done when"); mobile duel layout passes; the tutorial fight teaches the verbs.

---

### T3.1 — Design tokens & global styles
- [ ] T3.1 done

**Goal:** the soot/bone/tallow visual system of `[GDD] §11.3–11.4` as CSS custom properties + base components, so every later screen is assembled from the same tokens. The one saturated-color rule (status colors only) is enforced here.
**Implementation:**
- [ ] Color tokens exactly per `[GDD] §11.3` (`--soot #0d0b0a` … `--wax-gold #d9b168`)
- [ ] Type scale per `§11.1` (1.25 ratio, 16px base, `--t-display 30/34` … `--t-num 15/20 mono`); body never below 16px; numbers always mono (tabular figures); enemy names Cinzel small-caps; wordmark banned >4 words
- [ ] Status color/glyph mapping per `§11.4` (11 rows, glyphs as CSS/inline SVG only — no image files, legible at 14px)
- [ ] Ash-parchment texture background at 6% opacity, `repeat`
- [ ] Component primitives per `§11.5`: HP bar (4px, 220ms drain, instant on DoT), Resolve pips (10 × 6px), status chips (20px), Wax Meter, verse button, log gutter, Reading card
**References:** `[GDD] §11.1`, `§11.3`, `§11.4`, `§11.5`, `§14` (visual direction).
**Dependencies:** ← T0.4.
**Acceptance criteria:** token sheet matches §11.3 hex values exactly; a rendered sample page shows every component per §11.5 specs; no saturated color outside status chips (audited via CSS lint).
**Tests & validation:** visual snapshot tests of the sample page; contrast check ≥4.5:1 for body text (accessibility baseline).
**Deliverables:** `ui/tokens.css`, `ui/base.css`, sample page.
**Priority:** Critical.

---

### T3.2 — Fonts pipeline (5 families, 18 woff2, self-hosted)
- [ ] T3.2 done

**Goal:** ship `[GDD] §11.1`'s type stack offline: UnifrakturMaguntia (wordmark), Cinzel (display), EB Garamond (body), JetBrains Mono (numerals), Source Serif 4 (accessibility swap) — subsets, licenses, fallback stacks.
**Implementation:**
- [ ] Download/compile latin + latin-ext woff2 subsets (18 files, ~60–90 KB each, total ≈733 KB) into `assets/fonts/`
- [ ] `fonts.css` with `font-display: swap`; fallback stacks exactly per `§11.1`
- [ ] Include the 5 OFL licence files
- [ ] Accessibility hooks: `--font-body` swap to Source Serif 4 + 17px→19px in accessibility mode (T8.11); blackletter replaced by Cinzel wordmark
- [ ] Verify zero runtime font fetches (self-hosted only)
**References:** `[GDD] §11.1` (table + fallback stacks), App A (font manifest), `§15` (asset rules).
**Dependencies:** ← T0.4.
**Acceptance criteria:** all 18 woff2 load from `assets/fonts/` with no network requests; fallback rendering verified by blocking fonts in a test; license files present; weight budget logged.
**Tests & validation:** asset-manifest test (T10.5) counts files/sizes; visual snapshots with fonts on/off.
**Deliverables:** `assets/fonts/`, `ui/fonts.css`.
**Priority:** High.

---

### T3.3 — Duel screen: fighter panels, verse buttons, log gutter
- [ ] T3.3 done

**Goal:** the primary play surface per `[GDD] §14.3` + `§11.5`: two fighter panels (HP bar, Resolve pips, status chips), the Reading card slot, Wax Meter slot, event log, and 4 verse buttons + Strike with cost/cooldown/one-line effect.
**Implementation:**
- [ ] Fighter panels per `§11.5`: HP bar drain 220ms, never animated on DoT ticks (instant, countable); Resolve pips (full/partial/empty per spec); status chips with icon/name/turns/the-one-number
- [ ] Verse buttons: Cinzel label, mono cost badge, cooldown sweep overlay, 12px status-preview row; disabled at 38% opacity (cost/CD stay readable)
- [ ] Log gutter: `[round n] verb + target + amount`, 1px left border in damage-type color; prose entries italic, borderless
- [ ] State binding to `engine/fight` results stream; no logic in the UI layer (render-only)
- [ ] XSS discipline: all prose/data rendered via text-content APIs, never raw HTML from data
**References:** `[GDD] §14.3`, `§11.5`, `§11.4` (chip colors), `§10.6` (DoT instant rule).
**Dependencies:** ← T1.6, T3.1.
**Acceptance criteria:** every §11.5 component spec honored; a fixed-seed fight renders identical UI state sequences in a headless browser test; DoT ticks update instantly (frame-checked); disabled-button opacity rule verified.
**Tests & validation:** component tests; scripted-fight visual sequence test; snapshot tests desktop + 390px mobile.
**Deliverables:** `ui/duel/*`, tests.
**Priority:** Critical.

---

### T3.4 — Wax Meter + Fortune wiring
- [ ] T3.4 done

**Goal:** the game's only animated element and its only admission of randomness (`[GDD] §10.6`): a 3px×160px gauge spanning 88–112% with a 100% hairline, tallow-gold fill, soft glow at extremes, under the round counter.
**Implementation:**
- [ ] Bind to `state.fortune` each damaging instance; hairline at 100%; extremes glow
- [ ] Mobile rule (`§14`): always visible, never scrolled away
- [ ] Reset to 1.00 at fight start (engine guarantees; UI reflects)
**References:** `[GDD] §10.6`, `§11.5` (Wax Meter row), `§14` (mobile note).
**Dependencies:** ← T1.4, T3.3.
**Acceptance criteria:** meter tracks fortune exactly (unit-bound via engine events); clamps render at 88/112 without overflow; reset verified per fight.
**Tests & validation:** event-driven UI tests; visual snapshot at extremes.
**Deliverables:** `ui/duel/wax-meter.js`, styles.
**Priority:** Critical.

---

### T3.5 — Reading panel
- [ ] T3.5 done

**Goal:** the single most important UI element (`[GDD] §10.8`): bordered card above the fight — enemy name/class/level, one-line threat, expected outcome (win %, ~rounds), named counter in `--tallow`, and the `MEASURE` seed. Always present, never collapsed (desktop).
**Implementation:**
- [ ] Bind T2.4 sim output + archetype threat line + hand-written overrides for top 12 fights
- [ ] Display adjusted sheet when level-sync is active (D2) — honesty about scaling is the brand
- [ ] Mobile: collapses to one line, tap to expand (`§14`)
- [ ] Phase III spoiler discipline: says "he learns your best verse" without naming it (`§17` risk row)
**References:** `[GDD] §5.8`, `§10.8`, `§11.5`, `§14`, `§17`.
**Dependencies:** ← T2.4, T3.3.
**Acceptance criteria:** displayed win % matches sim cache exactly; seed string matches engine seed; sync adjustments visible; counter line renders for every enemy with one defined.
**Tests & validation:** data-binding tests; golden screenshots per enemy archetype.
**Deliverables:** `ui/duel/reading.js`.
**Priority:** Critical.

---

### T3.6 — Tutorial fight integration: Ashblade vs Bram
- [ ] T3.6 done

**Goal:** the first playable fight (`[GDD] §15.4` Ph2 "done when"): a fresh Ashblade against Hollowed Sexton Bram, teaching Brace/Ward/armor — with the candle rule, the scripted opener (Spikes turn 1, then Brace), and Maren's tutorial narration.
**Implementation:**
- [ ] Wire creation → fight with fixed tutorial build; enemy sheet from T4.6 (or fixture at 120 HP per D12 default)
- [ ] Scripted-opener support from T5.7 (Bram: Spikes t1, then Brace-and-outlast doctrine)
- [ ] Tutorial hint layer: first-fight prompts for verse buttons, Resolve pips, the Reading (dismissable, non-blocking)
- [ ] Candle of Saint Orrin present (Ch1 start item) with its deterministic save
- [ ] Loss path exercises the loss loop (T6.10) — infinite retry, no punishment
**References:** `[GDD] §3` Ch1, `§9.1` row 1, `§15.4` Ph2, `[02] R7c`/D12, `[02] §6.2` hand-sim.
**Dependencies:** ← T3.3–T3.5, T4.6 (soft: fixture enemy acceptable), T5.7 (soft: scripted opener), T6.10 (soft).
**Acceptance criteria:** fight completable win or loss; tutorial teaches the three verbs per the §9.1 "Teaches" note; hand-sim expectations (~8–12 rounds, Brace matters) reproduced; first-attempt clear ≥70% in playtest (T10.2 target).
**Tests & validation:** end-to-end headless playthrough; scripted-input UI test; telemetry check (first-attempt counters).
**Deliverables:** tutorial integration, hint layer.
**Priority:** Critical.

---

### T3.7 — Post-fight report ("the Ledger" verdict lines)
- [ ] T3.7 done

**Goal:** the five verdict lines of `[GDD] §10.7` computed from the Fortune track + sim, including the fifth line that links the Reading when a favored player loses — plus the `[04] R8` re-wording and calibration line when approved.
**Implementation:**
- [ ] Five verdicts: wax ran level / cold-but-won / hot-won / cold-lost / favored-and-lost (links Reading)
- [ ] D23 default: favored line reads *"You were favored and lost. The Reading knows why — open it."*
- [ ] D18 calibration line after every 10 fights (`[04] §5` paste-block), rendered only when the accuracy assert (T2.8-adjacent) holds
- [ ] `LAST BELL` marker support from T1.7
**References:** `[GDD] §10.7`, `§14.7`, `[04] R2/R8`, `[02] R2` (Last Bell marker).
**Dependencies:** ← T1.6, T2.4, T3.3; D18, D23 (defaults implemented).
**Acceptance criteria:** verdict selection matches the §10.7 table exactly on constructed fortune outcomes; link opens the Reading; calibration line appears only after fight 10 and only when the claim is true (assert).
**Tests & validation:** table-driven verdict tests; UI integration test.
**Deliverables:** `ui/duel/report.js`.
**Priority:** High.

---

### T3.8 — Duel screen mobile layout
- [ ] T3.8 done

**Goal:** the `[GDD] §14` mobile spec: single column, fighter panels stacked above the log, verse buttons 2×2 with Strike full-width beneath, Reading collapsed to one tap-line, Wax Meter always visible.
**Implementation:**
- [ ] Responsive breakpoint implementation of the duel screen only (other screens in T8.10)
- [ ] Touch targets ≥44px; cooldown/cost badges remain legible at 38% disabled opacity
- [ ] Performance pass: fight UI re-renders <16ms per event on a throttled mobile profile
**References:** `[GDD] §14` (Mobile paragraph), `§11.5`.
**Dependencies:** ← T3.3–T3.5.
**Acceptance criteria:** 390px-wide layout matches the spec; no horizontal scroll; Wax Meter pinned; tap-to-expand Reading works.
**Tests & validation:** mobile snapshot tests; touch-target audit; throttled-CPU render timing.
**Deliverables:** mobile styles for duel screen.
**Priority:** High.

---

### T3.9 — Minimal narrative scene renderer (Chronicle seed)
- [ ] T3.9 done

**Goal:** the smallest story surface the campaign needs: prose paragraphs, choice buttons, and a chapter header with act plate hook. This is the seed that Phase 6 builds on and Phase 8 (T8.2) fully styles as the Chronicle screen.
**Implementation:**
- [ ] Render scene nodes from the story schema (T0.3): prose blocks, speaker-tagged lines, choice buttons (3 options), mechanical-gift notes
- [ ] Act plate image slot with `loading="lazy"` (`§11.2`)
- [ ] Choice → tally/reward emission point (wired to story state in Phase 6)
- [ ] Same XSS discipline as T3.3 (prose is data)
**References:** `[GDD] §14.2`, `§3` (choice format), `§11.2` (plates).
**Dependencies:** ← T0.3, T3.1.
**Acceptance criteria:** a 3-choice scene renders from fixture data; buttons emit the correct choice events; plate lazy-loads.
**Tests & validation:** fixture-scene render tests; event emission tests.
**Deliverables:** `ui/scene/*`.
**Priority:** Critical (unblocks Phase 6).


---

# Phase 4 — Content Data Layer

**Purpose:** every number and name in `[GDD] §5–§9` as validated data: classes, 42 verses, 23 vows, 41 items, the 21-fight roster, Rites, named Echoes, Corvane's counter table, XP tables, and the generated Vigil's Calendar. `[GDD] §17` risk #5 says it directly: *write the data tables first, the prose second.*
**Phase completion criteria:** T0.5's inventory check green; every row schema-valid; budget conformance (T2.3) green on the real roster; the Calendar generates byte-identical to the tables.

---

### T4.1 — `data/` module architecture & loaders
- [ ] T4.1 done

**Goal:** load, validate, and index all content at boot with schema enforcement and clear failure modes — bad data fails loudly at load, never mysteriously mid-fight.
**Implementation:**
- [ ] Loaders for every T0.3 schema; validation at import; frozen indexes by id and by (class, level) for unlock queries
- [ ] Immutable data objects (no runtime mutation of content); engine reads, never writes
- [ ] Fixture mode: a parallel minimal dataset for engine/harness tests
- [ ] Data-version stamp saved into save states (for T9.1 migrations)
**References:** `[GDD] §15` (data module), T0.3 schemas.
**Dependencies:** ← T0.3, T0.4.
**Acceptance criteria:** malformed row → load error naming file/field; indexes serve unlock/affinity queries correctly; fixtures load independently of real content.
**Tests & validation:** loader tests incl. every negative-validation case; immutability test (Object.freeze checks).
**Deliverables:** `data/index.js`, loaders, fixtures.
**Priority:** Critical.

---

### T4.2 — Classes & the class-kit matrix
- [ ] T4.2 done

**Goal:** the four classes exactly per `[GDD] §5.2` (base stats, damage types, identity), plus the 4×4 signature-interaction matrix that the pre-fight Reading surfaces.
**Implementation:**
- [ ] Base stat rows: Ashblade 6/8/2/4/7 · Cinder Witch 5/2/9/3/8 · Gravewarden 9/5/2/8/3 · Hollow Cantor 7/2/8/4/6
- [ ] Damage-type mapping (MIG→Steel+Bleed, WIT→Ember/Shade+Burn+Wards per §5.1) and class identity strings
- [ ] Kit-vs-kit matrix (§5.2 NEW table) as data for the Reading panel
- [ ] Creation constraints: 4 free points, class-fixed pools
**References:** `[GDD] §5.1`, `§5.2` incl. kit matrix.
**Dependencies:** ← T4.1.
**Acceptance criteria:** rows match §5.2 exactly; matrix cells render in Reading fixtures; totals = 27 each (assert).
**Tests & validation:** table-diff tests against §5.2; sum asserts.
**Deliverables:** `data/classes.js`.
**Priority:** Critical.

---

### T4.3 — Verses: 6 common + 36 class verses
- [ ] T4.3 done

**Goal:** all 42 verses as effect-op-code data (T0.3 vocabulary), with unlock levels, costs, cooldowns, and exact numbers from `[GDD] §6`. Priority order semantics (slot order = Echo AI priority) preserved in the schema.
**Implementation:**
- [ ] Common hymns per §6.1 — incl. **Vigil's Rest at cost 2** per D17 default (`PROVISIONAL:D17`); Strike defined as always-available, not a slot
- [ ] Ashblade §6.2 (9), Cinder Witch §6.3 (9), Gravewarden §6.4 (9), Hollow Cantor §6.5 (9) — every base, coefficient, cost, CD, unlock level L1–L7, and special (per-hit crits on Red Flurry; Reap the Red stack consumption; Conflagration +50% vs burning; Requiem per-distinct-debuff; Seventh Verse consume; Ledger's Ward is enemy-side, not here)
- [ ] Effect compilation: each verse's effect string compiles to the T0.3 op-codes; anything not expressible → schema gap → fix schema, not the verse
- [ ] Unlock table: 3 verses at L1, then L2–L7 one per level (ninth verse at L7)
**References:** `[GDD] §6.1–6.5` (all tables), `§6` verse-count table, `[03] R5`, D17.
**Dependencies:** ← T4.1, T0.3.
**Acceptance criteria:** 42 rows compile; every effect op-code path exercised by at least one verse; counts per §6 table (6/9/9/9/9); cost/CD values diff clean against §6.
**Tests & validation:** automated table-diff of every row against the GDD source; compile tests; unlock-calendar integration check (T4.11).
**Deliverables:** `data/verses/*.js`.
**Priority:** Critical.

---

### T4.4 — Vows: 12 class + 11 story (de-duplicated)
- [ ] T4.4 done

**Goal:** all 23 vows (`[00]` F25 canon) with exact effects, including the D4 de-duplication: cut the *Ysolde's Vow* relic row (§8.3) and the *Keeper's Ring* vow row (§7.2); unify Ninth Sister's Vow naming; add **Oren's Post** to Ch8-Mercy.
**Implementation:**
- [ ] 12 class vows per `[GDD] §7.1` (Red Tide, Duelist, Hunger / Slow Ash, Pyre, Kindling / Bastion, Thorn-Bearer, Long Dark / Last Hymn, Echoing Grief, Silence)
- [ ] 11 story vows per §7.2 with source tags — with D4 edits: Ninth Sister's Vow (unified name), Warden's Oath, Ledger's Price, Grey Duelist, Twelve Tolls, The Turned Pour, Fixed Point, No Paper, **Oren's Post** ("while Braced, you cannot be Stunned" — grants Ch8-Mercy its missing reward), The Long Walk Down, The Counter-Voice (Unmake; hidden verse pool per §7.2/§4.4)
- [ ] Keeper's Ring removed (relic Vigil's Ring is the canonical Ch8-Ruthless reward); Ysolde relic row removed
- [ ] Story-vow availability flags (class-gated where specified, e.g. Ninth Sister's Vow = Cantor; Warden's Oath = Gravewarden)
- [ ] Vow-effect op-codes validated against the T0.3 vocabulary
**References:** `[GDD] §7.1`, `§7.2`, `[01] R5`, `[00] F7/F8/F25`, D4.
**Dependencies:** ← T4.1; **← D4**.
**Acceptance criteria:** exactly 23 vows; no effect-id shared by two rewards with the same source chapter (the `[01] §6` reward-integrity assert); story gating correct; Counter-Voice excluded from creation/pickers.
**Tests & validation:** reward-integrity unit tests (a: no duplicate effect-id+source; b: every choice path grants exactly one tier-appropriate reward; c: every Source string resolves).
**Deliverables:** `data/vows/*.js`.
**Priority:** Critical.

---

### T4.5 — Items: the hand-written library with marks
- [ ] T4.5 done

**Goal:** all items from `[GDD] §8` (canon tables: 13 weapons / 13 vestments / 15 relics = 41) with stats, one mark each, affinity, and source — **no random stats ever** — including the F28 Blade wording and the D4 cuts (post-cut reconciliation to 40 items, see Implementation).
**Implementation:**
- [ ] Weapons per `[GDD] §8.1` (13 rows); Vestments §8.2 (13); Relics §8.3 (15 minus the cut Ysolde's Vow row per D4) — **post-D4 count reconciles to 40 items** (13+13+14); record the final target count in DECISIONS.md, update T0.5's tracker and the §16 diff accordingly, and note in the v1.0.1 spec that the §16 "41 items" figure becomes 40 unless the owner adds a replacement relic (owner's call at T0.1)
- [ ] Mark op-codes: execute thresholds (Mace <35% HP), crit-scaling (Corvane's Blade per F28 provisional: ×1.6; ×1.8 <50%; ×2.0 <25%), start-of-fight states, immunities (Deaf Wax, Tide-Soaked), mitigation-cap raises (Ash-Glazed Brass 70%), Fatigue reduction (Thimble Coat −2), Ward-vs-DoT absorb (Founder's Leather), pity/first-win sources per D15
- [ ] Affinity field per the "it fits" rule; ≥5 affinity items per class (T0.5 assert)
- [ ] Source strings validated against the fight/choice/vendor registry (the `[01] §6` assert 4c)
- [ ] Drowned Mantle source pinned: "guaranteed first Floor win" per D15/`[03] R6`
**References:** `[GDD] §8.1–8.3`, `§8.4`, `[00] F14/F28`, `[03] R3/R6`, D4, D15.
**Dependencies:** ← T4.1; D4, D15 (soft).
**Acceptance criteria:** every row matches §8 tables (post-D4 diff documented); marks compile to op-codes; affinity minimums hold; source resolution 100%.
**Tests & validation:** table-diff tests; mark-behavior unit tests (each mark exercised once in a scripted fight).
**Deliverables:** `data/items/*.js`, count reconciliation note.
**Priority:** Critical.

---

### T4.6 — Enemy roster: 21 builds, verbs, counters, scripted openers
- [ ] T4.6 done

**Goal:** all 21 campaign fights as full builds per `[GDD] §9` — stats, HP (incl. overrides 300/420), signature verbs, Reading counters, scripted openers, and the special-mechanics set (Choristers ×3 + Inheritance, Pell's Ledger's Ward, Corvane variable build, First Movement fixed opening, the Turned Pour ally sheet).
**Implementation:**
- [ ] 19 statrows from §9.1–9.3 verbatim; budget conformance assert wired (35 + 2(L−1), D7)
- [ ] HP values incl. Choristers 3×44, Unbound Chorus 3×55; boss overrides Mother Bell 300, Ilvane 420
- [ ] Signature verbs as AI scripts (T5.7 consumes): Bram Spikes-t1; Sedge Opening Cut opener; Brack Hush-t1 + Tolling Bell; Choristers sequential ×3 with **Inheritance** per F34 provisional (debuffs carry at potency, durations refreshed to 2, Bleed cap 5); Pell **Ledger's Ward** at 50% (30 Ward + verse-theft per N4 provisional); First Vespers Rite at 50%; Sable Mend-the-Mortar rhythm; Ysolde UNSANCTIONED Burn (+3 potency, tick costs 1 Resolve); Grast Thorns+Brace+Gravebind; Halbrey Rites at 66%/33%; Mother Bell temperature Rite; Yune mimic (last verse at 80%); First Movement fixed 3-turn opening (pronoun "it", F20); Tide-Bound SALT-SOAKED Burn (ignores Ward+mitigation, 4 turns); Oren Gravebind + 4 HP regen/turn; Chorus ×3 one-signature-verse each; Ilvane's Second no-debuff burst; Ilvane 3 phases (heal 20% per A4, summons at 50%/25%, Phase III copy per F21)
- [ ] Corvane: per-class generated sheets (class chosen by T5.8), stats from budget formula at L7
- [ ] Reaper of the Silt per N3 provisional (flavor only — single build); revisit if owner rules otherwise
- [ ] **Turned Pour ally sheet** per `[02] R7d`: L8 Warden chassis, 140 HP, Thorns 6, once-per-round attack, cannot be targeted by Ilvane's Curse
- [ ] Bram HP field parameterized for D12 (default 120)
- [ ] Reading counter lines for all 21 + archetype rules engine hooks
**References:** `[GDD] §9.1–9.3`, `§9.5`, `[02] R1/R7`, `[00] F20/F21/F22/F34`, N3, N4, D7, D12, A3/A4.
**Dependencies:** ← T4.1, T1.8; D7, D12 (soft — defaults).
**Acceptance criteria:** 21 rows load; budget assert green; every signature verb has a script + a Reading counter; special mechanics reproduce their GDD prose; inventory counts (21 duels, 21 verbs) green in T0.5.
**Tests & validation:** table-diff per row; scripted-fight tests per signature verb; budget conformance; Choristers Inheritance state tests.
**Deliverables:** `data/enemies/*.js`, `data/rites/*.js` (boss rites here or T4.7), counter-line table.
**Priority:** Critical.

---

### T4.7 — Rites data: Halbrey, Mother Bell (+D10 levers), Ilvane III, Floor Rite-users
- [ ] T4.7 done

**Goal:** the four published boss Rites as `{trigger, change, line}` data plus the Floor's 4 Rite-user Echoes — the authored-feel mechanic of `[GDD] §5.7`.
**Implementation:**
- [ ] Halbrey: at 66% and 33% HP — Steel → Shade → Ember with matching stat shifts
- [ ] Mother Bell temperature: molten >50% (50% less direct damage, Thorns 8, casts Crypt Door) ↔ cooled <50% (+30% damage taken, Shade+Curse); **D10 levers when approved**: Warden reflect-doubling while molten; Cantor Curse+Fray → one-round cool window ("the note souring")
- [ ] Ilvane Phase III: copy of most-cast slotted verse at 100% (T1.8 counter)
- [ ] 4 Floor Rite-users: authored sheets with weaknesses (data rows; names/lines written with prose pass)
- [ ] Temperature bar data exposure for the UI (`§9.2` #14: "the game shows the temperature as a bar")
**References:** `[GDD] §5.7`, `§9.2` rows 13–14, `§9.3` #21, `§9.4`, `[02] R5`, D10.
**Dependencies:** ← T1.8, T4.6; **← D10** (levers).
**Acceptance criteria:** each Rite fires at exact triggers; Mother Bell bands meet T2.7's row (≥55% DoT classes; ≥40% Warden/Cantor post-lever); temperature bar state exposed.
**Tests & validation:** scripted fights to each trigger; wall-band asserts (T2.3/T2.7).
**Deliverables:** `data/rites/*.js`, Rite-user Echo rows.
**Priority:** High.

---

### T4.8 — Named Echoes: 8 + 4 Rite-users
- [ ] T4.8 done

**Goal:** the Floor's parish per `[GDD] §9.4`: eight hand-built NPC Echoes rated 800–1400, each with name, class, level, Toll, history line, and a **deliberate weakness** that teaches — plus the 4 Rite-users from T4.7.
**Implementation:**
- [ ] The eight: Brother Ash (Warden L8, 1080, regen-reliant, cannot be debuffed → DoT beats him) · Salt Widow (Witch L9, 1240, no mitigation) · Tollward Vane (Cantor L8, 940, slow/low-HST) · Sixth Swineherd (Ashblade L6, 860, all-in zero defence) · Mother Corvane (Ashblade L8, 1120, telegraphed crits) · Hollow Bishop (Warden L8, 980, refuses healing, pure mitigation) · Unpaid Bell (Cantor L9, 1180, 3-turn setup) · Widow Sedge (Ashblade L7, 1020, Resolve-steal then folds <30% HP)
- [ ] Each as a full legal build (T5.1 validation) with doctrine + scripted tendencies; weaknesses implemented as *real mechanical gaps*, not labels
- [ ] History lines + weakness text as data (Codex + Ledger consume them)
**References:** `[GDD] §9.4` (full table), `§12.4`, `[05] R5` (population floor).
**Dependencies:** ← T4.1, T5.1 (validation), T4.7 (Rite-users).
**Acceptance criteria:** 8 rows exactly per §9.4 (names/Toll/classes verbatim); each weakness demonstrably exploitable in a harness test (e.g. DoT build beats Ash at ≥70% while a control build does not); population floor ≥12 rows exist (T7.11 assert).
**Tests & validation:** per-Echo weakness-exploit sims; build-legality validation; Codex data completeness.
**Deliverables:** `data/named-echoes/*.js`.
**Priority:** Critical.

---

### T4.9 — Corvane counterbuild table + per-run lock *(decision-gated: D11)*
- [ ] T4.9 done

**Goal:** the counter table of `[GDD] §9.2` as data + the lock rule from `[02] R6`: counterbuild seeded from the player's build string at chapter start, locked for the run; first loss reveals the fired axis.
**Implementation:**
- [ ] Six lean-tag rules (Bleed/shred → Cantor w/ Curse+Purify+Bleed-burner; Burn/DoT → Warden sustain; Ward/Thorns/tank → Witch burst; Curse/Hush/debuff → Ashblade burst; Crit/burst → Warden Bastion+Fracture hold-6; Drain/lifesteal → Witch race) + unrecognized → neutral pool
- [ ] Lean-tag detection from the player's slotted verses + vow + marks (tag table per verse/mark)
- [ ] Seeding: chapter-start seed from build string (deterministic, D11 lock); Re-bell does not re-pick
- [ ] First-loss reveal line + counter-table row exposure to the Reading
- [ ] Pre-fight announcement line: *"Corvane has watched you fight. He has brought something that answers it."*
**References:** `[GDD] §3` Ch5, `§9.2` counter table, `[02] R6`, D11.
**Dependencies:** ← T4.6, T5.7; **← D11** (default: lock).
**Acceptance criteria:** identical build → identical counterbuild for the whole run; tag rules match the table's "why it hurts" logic; reveal fires exactly once; farm-exploit test (loss + Re-bell ×20 → same counter every time).
**Tests & validation:** determinism tests across seeds; tag-detection unit tests per lean.
**Deliverables:** `data/corvane.js`, selection logic hook.
**Priority:** High.

---

### T4.10 — XP tables, level bands & role map *(decision-gated: D1)*
- [ ] T4.10 done

**Goal:** the XP economy of `[01] R1` as data — the system F3 found missing — plus the L9/L10 campaign target (D1) and the Choir-Floor terminology fix (N2).
**Implementation:**
- [ ] Thresholds (canon): 0, 40, 100, 180, 280, 400, 540, 700, 880, 1080 (level cap 10)
- [ ] Per-fight formula: `round((10 + 4×enemy_level) × role)`; roles: regular ×1.00, complication ×1.25, boss ×1.75; chapter completion +10; choices pay 0
- [ ] Role map for all 21 fights per `[01] R1` (second slot of 2-fight chapters = boss role per A3; middle of 3-fight = complication)
- [ ] Floor XP: `8 + 2×level(O)` first win per opponent per run; repeats 50% (min 4); 25% if level(O) ≤ your level − 2; first bind +15; first imported-code fight +10; pays once per fight per run
- [ ] Stat points: +2 per level at thresholds; verse unlock calendar wiring (L1–L7)
- [ ] Target line (D1): "campaign naturally delivers L9 by the Bellmouth; the finale crosses into L10"
**References:** `[01] R1/R2/R8` + campaign walk table, `[GDD] §13`, A1/A3, D1, N2.
**Dependencies:** ← T4.1; **← D1**; sign-off on provisional XP numbers.
**Acceptance criteria:** the `[01] R1` nine-chapter walk reproduces exactly (56/76/146/106/106/175/133/137/207 cumulative → 1142, L10 after the boss); role map covers 21/21 fights.
**Tests & validation:** walk-reproduction test; T2.5 arrival-fit assert; role-map completeness check.
**Deliverables:** `data/progression.js`.
**Priority:** Critical.

---

### T4.11 — The Vigil's Calendar (generated unlock/reward table)
- [ ] T4.11 done

**Goal:** `[01] R9` — one generated table listing per chapter: verses unlocked, items sourced, vows earned, systems opened, and per-path choice rewards (fixing F26: Ch1 Ruthless→Mace, Mercy→Shroud, Devotion→Shovel per A2).
**Implementation:**
- [ ] Generator reads data/ + story/ and emits the Calendar (Hymnal screen consumes it in T8.3)
- [ ] CI byte-diff: Calendar output must match the item/vow/verse tables (`[01] §6` assert 5)
- [ ] Choice-item mapping explicit for every chapter (kills the F26 ambiguity everywhere)
**References:** `[01] R9`, `[00] F26`, A2.
**Dependencies:** ← T4.3, T4.4, T4.5, T6.5 (choice rewards).
**Acceptance criteria:** generated Calendar covers 9 chapters × all reward columns; byte-diff green; Ch1 mapping row explicit.
**Tests & validation:** the byte-diff assert; golden snapshot.
**Deliverables:** `tools/calendar.js`, generated `data/calendar.json`.
**Priority:** Medium.

---

### T4.12 — Content QA gate: counts, legality, reward-integrity
- [ ] T4.12 done

**Goal:** the CI gate that makes "content complete" objective: inventory counts (T0.5), schema validity, reward integrity, cross-doc couplings (`[00] §0.7`) — all green before story integration begins.
**Implementation:**
- [ ] T0.5 inventory diff green on real content (42 verses / 23 vows / final item count per T4.5's D4 reconciliation / 21 fights / 8+4 Echoes / 10 endings / 9 epilogues / 9 choices)
- [ ] Reward-integrity asserts (a/b/c) from `[01] §6`
- [ ] Coupling asserts: XP↔bands↔sync; Fatigue↔fight-length; loss-loop↔XP; drop-pool↔Codex-ghosts (one source of truth); Toll↔overnight caps; manual-parity; Vigil's-Rest↔resolve assert
- [ ] Every status has ≥1 counter and ≥1 amplifier across items+vows (`[GDD] §8.3` closing rule)
- [ ] Affinity coverage: ≥5 items per class
**References:** `[GDD] §8.3`, `§16`, `[00] §0.7`, `[01] §6`.
**Dependencies:** ← T4.2–T4.11, T0.5.
**Acceptance criteria:** all gates green; deliberately breaking any one row turns CI red.
**Tests & validation:** the gate itself + negative tests.
**Deliverables:** `tools/asserts/content.js`, CI wiring.
**Priority:** Critical.

---

# Phase 5 — Loadout, Reshaping & Echo AI

**Purpose:** `[GDD] §15.4` Phase 3's systems half — "any build can be assembled and sent to fight." Build assembly + the Hymnal's logic layer, the Twin Ledger, the Echo AI with its honesty rules, the four doctrines, and enemy AI scripting.
**Phase completion criteria:** any legal build assembles from data and fights under all four doctrines; AI honesty tests green; every enemy signature verb plays correctly under AI control.

---

### T5.1 — Build assembly & validation
- [ ] T5.1 done

**Goal:** the single function that turns (class, level, alloc, vow, 4 ordered verses, 3 gear, doctrine) into a validated fighter — used by creation, the Hymnal, Echo Codes, and every harness profile. One validator, everywhere.
**Implementation:**
- [ ] Legality: level 1–10; alloc ≤ `4 + 2×(level−1)` (and N1: the validator stays strict); verse unlock + class/common legality; vow class/story-state legality; gear ids exist; doctrine exists
- [ ] Ordered verse slots (priority semantics); Strike implicit
- [ ] Story-state parameter: which story vows are earned this run (injected by campaign state)
- [ ] Canonical serialization (stable key order) — the string the RNG seeds from and the Echo Code encodes
**References:** `[GDD] §12.6` (validation list), `§12.1`, `§6` (priority order), N1.
**Dependencies:** ← T4.1–T4.5, T0.3.
**Acceptance criteria:** rejects every illegal combination with a specific reason code; canonical form stable across runs (golden strings); used by T7.1/T2.1 with zero divergence.
**Tests & validation:** exhaustive legality tests incl. boundary levels; serialization stability tests.
**Deliverables:** `engine/build.js`.
**Priority:** Critical.

---

### T5.2 — Hymnal logic: slots, reshaping, Reshape Ledger
- [ ] T5.2 done

**Goal:** the loadout logic of `[GDD] §13`/`§14.4`: free re-slotting, vow swap, stat reassignment at shrines/arena-bouts; every reshape recorded with timestamp and before/after; one-click rewind; the bound Echo changes only on re-bind.
**Implementation:**
- [ ] Reshape modes: at any shrine (campaign) or between Floor bouts; free, unlimited
- [ ] Reshape Ledger: append-only entries {timestamp, before, after}; rewind to any entry
- [ ] Re-bind gate: Floor Echo updates only on explicit re-bind
- [ ] Creation-time respec promise hook (used by T8.1 presets)
**References:** `[GDD] §13` (Reshaping, Reshape Ledger, Shrines), `§14.4`, `[01] §1.5` (protect list).
**Dependencies:** ← T5.1.
**Acceptance criteria:** rewind restores byte-identical loadouts; bound Echo divergence only via re-bind (state test); ledger survives save/load (T9.1).
**Tests & validation:** state-machine tests; rewind round-trip; save integration.
**Deliverables:** `store/loadout.js` (logic) + hooks.
**Priority:** Critical.

---

### T5.3 — The Twin Ledger *(decision-gated: D3)*
- [ ] T5.3 done

**Goal:** the Ch3-Devotion replacement reward per `[01] R4`: a second saved loadout, swappable free at shrines *and* on the pre-fight Reading screen, Floor-compatible (Echo binds whichever is active), available after the ending.
**Implementation:**
- [ ] Loadout slots: 1 by default; 2 with the Twin Ledger flag; swap UI points wired (shrine + Reading screen)
- [ ] Floor re-bind semantics with two loadouts; post-ending availability
- [ ] `PROVISIONAL:D3` fallback if rejected: once-per-fight Act II re-slot variant specced in `[01] R4` — do not build without a decision
**References:** `[01] R4`, `§4` paste-block, D3, F6.
**Dependencies:** ← T5.2; **← D3** (default: Twin Ledger).
**Acceptance criteria:** second slot appears only when earned; swaps preserve the Reshape Ledger's per-slot history; Echo binds the active loadout (state test).
**Tests & validation:** slot-state tests; Floor integration test; reward-grant integration from T6.5.
**Deliverables:** Twin Ledger feature module.
**Priority:** High.

---

### T5.4 — Echo AI: scoring, lethal check, pointless-cast filter
- [ ] T5.4 done

**Goal:** the shared AI rules of `[GDD] §12.3` — deterministic scoring, lethal check first, no pointless casts, Strike fallback — the quality bar §17 lists as risk #1.
**Implementation:**
- [ ] Fixed scoring formula per verse from visible state (own HP/Resolve/statuses, opponent's *visible* HP/statuses/Resolve); only exact ties random (`Band(k)` among equals)
- [ ] Rule 1 lethal check: any usable damaging verse expected to kill → cast it
- [ ] Rule 2 pointless-cast filter: no re-applying active debuffs, no heal above 65% HP, no cleanse when clean, no Thorns when up, no Resolve verse above 3
- [ ] Rule 3 Strike fallback when nothing useful/affordable
- [ ] Expected-damage estimator shared with T2.4's sim (one implementation)
**References:** `[GDD] §12.3` rules 1–3, `§10.9` rule 6, `§17` risk table.
**Dependencies:** ← T5.1, T1.6.
**Acceptance criteria:** scoring deterministic for fixed state; ties only among exact equals; the five pointless-cast cases each verified; fallback fires when broke/locked.
**Tests & validation:** golden-state scoring tests; property test (no state yields nondeterministic choice except tie); misuse detector from harness output ("which verses the AI misuses").
**Deliverables:** `engine/ai.js`.
**Priority:** Critical.

---

### T5.5 — Doctrines: Hymnal, Predator, Bulwark, Cantor's Hand
- [ ] T5.5 done

**Goal:** the four behavior profiles of `[GDD] §12.2`, layered over T5.4's shared rules.
**Implementation:**
- [ ] Hymnal: strict slot-order playback
- [ ] Predator: highest-damage affordable verse; defends only below 30% HP
- [ ] Bulwark: defensive verses first when <70% HP or no Ward/Brace active; else Hymnal
- [ ] Cantor's Hand: blends Hymnal with the verse most likely punished by the opponent's active statuses (reserved for Rite-users + one named Echo per §12.2)
- [ ] Doctrine selection stored on the Echo; used identically by campaign enemies (via T5.7) and Floor Echoes
**References:** `[GDD] §12.2`, `§12.3`.
**Dependencies:** ← T5.4.
**Acceptance criteria:** doctrine behavior differences measurable in harness (win-rate deltas by matchup); each doctrine's stated rule verified by scripted scenarios.
**Tests & validation:** per-doctrine scenario tests; harness doctrine-comparison report.
**Deliverables:** `engine/doctrines.js`.
**Priority:** Critical.

---

### T5.6 — AI honesty enforcement (no hidden information)
- [ ] T5.6 done

**Goal:** enforce `[GDD] §12.3` rules 4–5 by construction and by test: the AI may read only visible statuses/HP/Resolve — never slotted verses, vow, gear, or future casts. This is what keeps the ladder honest.
**Implementation:**
- [ ] Information firewall: AI scoring receives a redacted state view (type-level enforcement where possible)
- [ ] Unit test: hidden-info presence must not change AI decisions (same visible state, different hidden hands → identical choices)
- [ ] Lint/architecture test: `engine/ai.js` imports no gear/vow-pool accessors
**References:** `[GDD] §12.3` rules 4–5, `§17` risk table.
**Dependencies:** ← T5.4, T5.5.
**Acceptance criteria:** firewall test green; architecture test green; documented in ENGINE_RULES.md.
**Tests & validation:** the two tests above; adversarial review note in docs.
**Deliverables:** firewall + tests.
**Priority:** Critical.

---

### T5.7 — Enemy AI scripting: signature verbs, openers, mimics
- [ ] T5.7 done

**Goal:** enemies are "full builds, not stat blobs" — each one's signature verb and scripted opener implemented as data the doctrine layer executes (Bram t1 Spikes; Brack t1 Hush; Pell Ledger's Ward at 50% per N4; Yune's mimic at 80%; First Movement's fixed learnable opening; Ysolde's UNSANCTIONED burn; Oren's regen+Stun; Ilvane's three phases incl. Phase III copy rules).
**Implementation:**
- [ ] Scripted-opener DSL: turn-keyed actions before doctrine takes over
- [ ] Conditional scripts: HP-threshold triggers (Pell 50%, First Vespers 50%), turn-count triggers (First Movement turns 1–3), counter-verse triggers (Yune: copy last player-cast verse at 80% — define "last cast" incl. Strike handling per F21 spirit; N4 provisional for Pell's theft)
- [ ] Ilvane Phase II summon points (50%/25%) + heal 20% (A4); Phase III via T1.8
- [ ] Ally-side support: Turned Pour bell as an allied fighter entity (T6.4 consumes)
**References:** `[GDD] §9.1–9.3` (all signature verbs), `[00] F20/F21/F34`, N4, A4.
**Dependencies:** ← T5.4, T5.5, T4.6, T1.8.
**Acceptance criteria:** every one of the 21 signature verbs observable in a scripted fight; openers fire exactly on script; mimic power = 80% verified; UNSANCTIONED Resolve-drain verified.
**Tests & validation:** per-enemy scripted-fight tests (21 golden scenarios); parameterized power checks.
**Deliverables:** `engine/ai-scripts.js`, per-enemy script rows.
**Priority:** Critical.

---

### T5.8 — Corvane selection integration *(with T4.9, D11)*
- [ ] T5.8 done

**Goal:** execute the counterbuild selection at fight start — tag detection over the player's build, seeded pick, run-lock, reveal-on-loss — end to end in the Ch5 flow.
**Implementation:**
- [ ] Fight-start hook: read tags → pick row (weighted; unrecognized → neutral pool) → generate Corvane's sheet at L7 from the class template
- [ ] Lock storage in run state (chapter-start seed); Re-bell preserves
- [ ] Loss hook: first loss → Reading gains the axis line + fired row
**References:** `[GDD] §9.2`, `[02] R6`, D11.
**Dependencies:** ← T4.9, T5.7; D11.
**Acceptance criteria:** end-to-end Ch5 integration test: same run → same counter across retries + sessions; neutral-pool fallback works; reveal fires once.
**Tests & validation:** integration + determinism tests; exploit regression (retry-farming impossible).
**Deliverables:** Corvane integration module.
**Priority:** High.


---

# Phase 6 — Campaign Story & Systems

**Purpose:** `[GDD] §15.4` Phases 4–6: the nine-chapter campaign as data + the systems that surround it — XP/level-sync, the loss loop, shrines, the memory market, optional objectives, Maren, and all ten endings. Content rule from `[GDD] §17`: branches are additive; nothing canon is rewritten.
**Phase completion criteria:** start-to-finish playable campaign for all four classes; every ending reachable and its epilogue matches the tally (`[GDD] §15.4` Ph6 "done when"); XP walk lands every band (T2.5 green on real data); the Ch4 branch visibly changes Ch6's fight list.

---

### T6.1 — Story data model & run state
- [ ] T6.1 done

**Goal:** chapters/scenes/choices/tallies/endings as data (per `[GDD] §15`'s `story` module), plus the run-state object every system reads: level/XP, chapter progress, tallies, choices made, items, flags (Corvane spared, Ysolde's fate, pour turned, Oren sent up), re-bind rights, memory-sold marks, Unmake eligibility inputs.
**Implementation:**
- [ ] Story node schema instances: 9 chapters × (prologue scenes, duel nodes, choice node, shrine node) — additive branch model per §17
- [ ] Tally state: hidden Mercy/Ruthless/Devotion counters; never rendered in play (§4.1) — only the epilogue reveal
- [ ] Flag registry for cross-chapter consequences (Ch4→Ch6 fight-list change; Ch8→Ch9 Oren; Ch6→Ch9 ally bell; Corvane → ladder Echo)
- [ ] Run state serialization shape (feeds T9.1 save schema)
**References:** `[GDD] §3`, `§4.1`, `§15` (story module), `[04] §1.2` (campaign loop).
**Dependencies:** ← T0.3, T4.1.
**Acceptance criteria:** full 9-chapter graph loads with all branches; flags typed and documented; tally counters invisible to UI layer (architecture test).
**Tests & validation:** graph-walk tests (every chapter reachable in order); flag-injection tests.
**Deliverables:** `story/model.js`, run-state module.
**Priority:** Critical.

---

### T6.2 — Act I implementation (Chapters 1–3, Duels 1–7)
- [ ] T6.2 done

**Goal:** The Waking, playable end to end: crypt waking prose, Bram and Sedge, the Salt Road and its gate choice, the Drowned Nave with Pell's mid-fight theft, First Vespers two-phase boss, the three Ch3 choices with their (post-D3) rewards, and the Choir Floor unlock gate.
**Implementation:**
- [ ] Chapter scenes + prose from `[GDD] §3` Act I (Maren's Ch1–3 lines; choice texts verbatim)
- [ ] Duels 1–7 wired: enemy rows (T4.6), scripted AI (T5.7), fixed loot per §8.4
- [ ] Ch1 choice with all three paths granting their item (A2 mapping: Ruthless→Pallbearer's Mace, Mercy→Sexton's Shroud, Devotion→Grave-Shovel of Bram) — the F26 fix is player-visible here
- [ ] Ch3 rewards: Ruthless→Cantor's Tuning Fork; Mercy→+1 stat point; Devotion→**Twin Ledger** (D3)
- [ ] Ch2 choice per §3 (open gate / pay the toll in memories / sing the gate open) — note: the "pay the toll in memories" option here is narrative-only; the *vendor* mechanic is Ch5 (T6.12); keep them distinct
- [ ] Choir Floor unlock at Act I end (feature-flag: Floor UI arrives in Phase 7; state flag set here)
- [ ] Post-act state per `[GDD] §3`: class, vow, stat spread, 3 items, working 4-verse loadout, Floor unlocked
**References:** `[GDD] §3` Act I (all), `§8.4`, `[01] §4`, D3.
**Dependencies:** ← T6.1, T3.6/T3.9, T4.6, T5.7, T6.5, T6.9.
**Acceptance criteria:** full Act I walkthrough automated (seeded inputs) with every branch; rewards land exactly as decided; Floor-unlock flag set; `[01] R1` XP walk matches for Act I rows.
**Tests & validation:** automated act playthrough × 3 choice paths × 4 classes; reward-integration asserts.
**Deliverables:** Act I story data + integration.
**Priority:** Critical.

---

### T6.3 — Act II implementation (Chapters 4–6, Duels 8–14, branching)
- [ ] T6.3 done

**Goal:** The Turning: Ysolde's branch (the first choice that visibly changes Chapter 6's fight list), the Wick Market and Corvane's counter-duel, the Bellfoundry with Halbrey's Rite intro, Mother Bell's temperature fight, and the furnace choice with its three permanent consequences.
**Implementation:**
- [ ] Chapters 4–6 scenes/choices verbatim from `[GDD] §3`; Maren Ch4–6 class lines
- [ ] Duels 8–14 wired incl. Corvane (T5.8) and Mother Bell (T4.7); Rite of Passage UI teach moment (Halbrey) per `§3` Ch6
- [ ] **Ch4 branch mechanics** per §3: Mercy → Order whole → Ch6 fielded Wardens arrive as *allies* (four instead of two, ally-state) ; Ruthless → Marrow-Furnace + fractured Order; Devotion → Ysolde's Vow + quieter road
- [ ] Ch5 outcomes: contract (Ledger's Price vow, per class list), take his blade (Corvane's Blade + he dies), spare (he becomes a named Echo on the player's ladder — flag for T7.4)
- [ ] Ch6 outcomes: quench (Cassock's Gate key, Halbrey hates you), feed (+1 permanent starting Resolve forever — Twelve Tolls territory; verify vow/reward split per §7.2), turn (ally bell in Ch9)
- [ ] Vendor opens in Act II (T6.12 integration point)
**References:** `[GDD] §3` Act II, `§5.7`, `§9.2`, `§7.2`, `[02] R5`.
**Dependencies:** ← T6.2, T4.7, T4.9, T5.8, T6.12 (soft).
**Acceptance criteria:** Ch4 choice changes Ch6 fight list exactly as §3 specifies (regression test locked); all nine Act II outcome combinations land their flags/rewards; Mother Bell passes its wall-band row.
**Tests & validation:** branch-matrix automated playthroughs (3 paths × key branches); flag-propagation asserts.
**Deliverables:** Act II story data + branch integration.
**Priority:** Critical.

---

### T6.4 — Act III implementation (Chapters 7–9, Duels 15–21, finale)
- [ ] T6.4 done

**Goal:** The Choir: the Orrery reveal, Yune's mimic fight, First Movement, the Lower Silence descent with Oren, and the Bellmouth — Unbound Chorus, Ilvane's Second, and the three-phase Pale Cantor, ending in the final choice.
**Implementation:**
- [ ] Chapters 7–9 scenes/choices verbatim; Maren Ch7–9 lines incl. the Ch7 reveal-in-combat framing
- [ ] Duels 15–21 wired; **Turned Pour ally bell** fights on the player's side in Duel 21 when the Ch6-Devotion flag is set (T4.6 sheet)
- [ ] Ch7 outcomes: read the name (Fixed Point vow, D30's Kept Name for Ruthless when approved — provisional: Ruthless grants **The Kept Name**: first debuff applied each fight costs 1 less Resolve), burn the record (No Paper vow), keep the name
- [ ] Ch8 outcomes: send Oren up (she waits at the top of the stair in Ch9 — changes that fight; Oren's Post vow per D4), take the Gate ring (**Vigil's Ring** relic, canonical per D4), walk past (The Long Walk Down vow)
- [ ] Ch9: Oren-present variant of the finale when sent up; Ilvane three phases (T1.8/T5.7); final choice node with the hidden fourth option hook (T6.8)
- [ ] Duel 20 "no debuffs at all" verified as a genuine change of pace
**References:** `[GDD] §3` Act III, `§4.4` (fourth thing), `§9.3`, `[00] F10/D30`, D4.
**Dependencies:** ← T6.3, T4.6–T4.8, T5.7.
**Acceptance criteria:** all Ch7/Ch8 reward paths land; Oren variant changes Duel 21 (state assert); ally-bell integration in Duel 21; final choice reaches all three endings + hidden hook.
**Tests & validation:** Act III branch playthroughs; ally-integration test; phase-transition asserts.
**Deliverables:** Act III story data + finale integration.
**Priority:** Critical.

---

### T6.5 — The nine choices: rewards, tallies, consequences
- [ ] T6.5 done

**Goal:** the choice system as one table-driven system: 9 choices × 3 options → tally increments + rewards + flags, exactly per `[GDD] §3` and the D3/D4/D30 corrections. Choices never pay XP; tallies never shown in play.
**Implementation:**
- [ ] Choice table (data): per option — tally +1, reward id, flag ids, prose pointer
- [ ] Reward wiring: items (Ch1 ×3 mapping, Tuning Fork, Marrow-Furnace, Corvane's Blade, Vigil's Ring), stat point (Ch3 Mercy), Twin Ledger (Ch3 Devotion, D3), story vows (Ch4/5/6/7/8 per §7.2), permanent +1 starting Resolve (Ch6 Ruthless — implemented as the Twelve Tolls effect source), ally states (Corvane spared, pour turned, Oren sent up)
- [ ] D4 additions: Oren's Post (Ch8 Mercy); D30 provisional: The Kept Name (Ch7 Ruthless)
- [ ] Every path grants exactly one tier-appropriate reward — never zero, never two (`[01] §6` assert 4b)
- [ ] Tally counters + the permanent ladder-profile line format `Tally: Mercy 4 · Ruthless 2 · Devotion 3` (§4.1) — display deferred to epilogue/profile
**References:** `[GDD] §3` (all nine choices), `§4.1`, `§7.2`, `[01] R4/R5`, `[00] F10/F26`, D3, D4, D30, A2.
**Dependencies:** ← T6.1, T4.4, T4.5, T5.3.
**Acceptance criteria:** 27 option rows complete; reward-integrity asserts green; tallies hidden from play UI (architecture test); every reward id resolves.
**Tests & validation:** table-completeness test; per-choice integration tests; hiddenness architecture test.
**Deliverables:** `story/choices.js`, reward wiring.
**Priority:** Critical.

---

### T6.6 — Tallies → epilogue reveal
- [ ] T6.6 done

**Goal:** the epilogue reveal sequence per `[GDD] §4.1`: Maren reads the tally off the ledger; the dominant tally (with tie rules) selects the epilogue variant; the tally line becomes permanent on the profile.
**Implementation:**
- [ ] Dominant-tally resolution incl. tie rule (needs T0.1 micro-decision; provisional: ties resolve in priority order Mercy > Devotion > Ruthless and are recorded in DECISIONS.md — note §3's nine choices make exact 3-3-3 ties possible)
- [ ] Reveal scene: ledger framing, then the epilogue text (T6.7)
- [ ] Profile line formatting; title application (T6.7)
**References:** `[GDD] §4.1`, `§14.8`.
**Dependencies:** ← T6.5.
**Acceptance criteria:** all 9 tally outcomes (and ties) map to the correct epilogue; tie rule documented + decided; reveal plays once per run and persists.
**Tests & validation:** tally-resolution table tests incl. tie cases.
**Deliverables:** reveal sequence module.
**Priority:** Critical.

---

### T6.7 — Endings: nine epilogues + titles + carry-over rules
- [ ] T6.7 done

**Goal:** the three final paths × three tallies = nine epilogues (3 paragraphs each per §4.1: what you did / Verrow / the people), the 9+1 title table (§4.3), and the post-ending carry-over rules of §4.5 (A-Mercy re-bind lock; B/C re-bind at will; Echo survives the ending).
**Implementation:**
- [ ] Epilogue texts verbatim from `[GDD] §4.2` (A-Mercy/Ruthless/Devotion, B×3, C×3) — content pass writes them into story data
- [ ] Titles per §4.3 (incl. Cantor of Ash verbatim + its "never explained" rule)
- [ ] Carry-over state machine per §4.5: ending → re-bind rights (A-Mercy locked w/ Kept Echo framing per `[05] R9`; B/C open; Unmake both + ladder line), Echo survival, title/tally permanence
- [ ] The Orrery recap data (nine decisions in order — screen in T8.6)
**References:** `[GDD] §4.1–4.3`, `§4.5`, `§14.8`, `[05] R9`.
**Dependencies:** ← T6.6.
**Acceptance criteria:** 9 epilogues + 10 titles render; §4.5 rules enforced in state tests (A-Mercy cannot re-bind; the lock copy is in-fiction voice); title table exact.
**Tests & validation:** ending-matrix tests (3 paths × 3 tallies × carry-over); content diff vs §4.2.
**Deliverables:** endings content + carry-over module.
**Priority:** Critical.

---

### T6.8 — The Unmake ending (hidden) *(depends on T7.4 for its gate condition)*
- [ ] T6.8 done

**Goal:** the run-gated hidden ending per `[GDD] §4.4`: gate = Devotion ≥3 AND Mercy ≥3 AND unlocked Burn verses <3 AND lost to your own bound Echo ≥1; appears as "the fourth thing"; Phase III changes; Unmake epilogue; The Counter-Voice title; the §7.2 Counter-Voice vow (hidden second verse pool on the Echo).
**Implementation:**
- [ ] Gate evaluator over run state + persistent records (lost-to-own-Echo count — requires the T7.4 own-Echo duel capability; cross-phase dependency called out in the audit)
- [ ] "Burn verses unlocked" counter: verses from the Witch Burn set actually *unlocked* (not cast) — spec note: unlock = level-reached; confirm exact reading at T0.1 (provisional: unlocked Burn-tagged class verses < 3)
- [ ] Fourth-thing option rendering (only when gate met); Phase III modification; Unmake epilogue + title + vow
- [ ] D27 schedule hook: launch flag per `[05] R7` phase 1 = sealed (exists, nothing points at it)
- [ ] `[05] R1` legibility hook (post-month-3 or first cryptic discovery): Orrery annotates unmet conditions in plain sight — flag-gated
**References:** `[GDD] §4.4`, `§7.2`, `[05] R7/R1`, D27, `[02] §7` (P≈1–3% reachable assert).
**Dependencies:** ← T6.7, T7.4 (own-Echo losses), T5.2 (binding).
**Acceptance criteria:** gate deterministic across 10k simulated runs with P(reachable) ≈ 1–3%; zero reachable runs without the lost-to-own-Echo condition (thesis condition load-bearing); fourth thing never renders unmet; title/vow apply correctly.
**Tests & validation:** gate sims; negative tests per condition; flag-schedule tests.
**Deliverables:** Unmake module + content.
**Priority:** Critical.

---

### T6.9 — XP payment, level-ups & level-sync *(decision-gated: D1, D2)*
- [ ] T6.9 done

**Goal:** pay XP per `[01] R1` (once per fight per run), apply level-ups (stat points +2, verse unlocks), and enforce the D2 soft level-sync in campaign fights — with the Reading showing adjusted sheets.
**Implementation:**
- [ ] Payment hooks: duel clear (role-multiplied), chapter completion +10, Floor payments (T7.9); anti-double-dip: first clear only per run
- [ ] Level-up pipeline: threshold crossing → +2 stat points (allocation UI deferred to shrine/Hymnal), unlock notices (verse rows; L7 consolidation inscription hook per `[01] R6`)
- [ ] Level-sync (D2): N = player level − band ceiling, cap 3; +1 stat (heaviest) / +4% HP per N; 25% XP for over-levelled chapters; +1 Floor pity advance per over-levelled chapter completed; "better gear" clause **struck** (F5)
- [ ] Synced sheets rendered in the Reading (T3.5) and asserted in T2.5
**References:** `[01] R1/R2/R3`, `[GDD] §13`, `§3.0`, D1, D2, `[01] R6`/D6.
**Dependencies:** ← T4.10, T6.1; **← D1, D2**.
**Acceptance criteria:** XP ledger correct across a full automated run (matches T2.5 walk); sync triggers only above band; over-level XP 25%; pity +1 fires; no other fight math touched by sync beyond the defined deltas.
**Tests & validation:** ledger unit tests; sync boundary tests (band edge ±1 level); integration with T2.5 asserts.
**Deliverables:** progression engine integration.
**Priority:** Critical.

---

### T6.10 — The loss loop: retries, Maren's Whisper, Dampened Bell *(decision-gated: D9)*
- [ ] T6.10 done

**Goal:** the complete loss loop of `[02] R3`, resolving critical F11: infinite free retries (the §10.11 one-per-chapter limit removed per D9); Maren's Whisper hint lines at loss 3 and 4; the Dampened Bell assist offered at loss 4 (−15% enemy dmg/HP, profile-marked `dampened`, never pushed, PvP-safe).
**Implementation:**
- [ ] Retry flow: any campaign loss → re-fight with new seed; story never resets; re-bells recorded in the Vigil Ledger (`[GDD] §10.11`)
- [ ] Whisper data: per-enemy lines (loss-3 axis line from the counter column; loss-4 slot-swap line) — string data per enemy, ~2×21 rows written in prose pass
- [ ] Corvane special: first loss reveals the counter axis (T5.8) instead of a generic whisper
- [ ] Dampened Bell: Settings toggle, discoverable only after a 4th loss on any fight; −15% enemy damage & HP; permanent `dampened` profile mark; disables nothing; **does not travel into Echo sheets** (assist-integrity invariant: exports byte-match full-stat sheets)
- [ ] No XP/loss penalties anywhere (coupling `[00] §0.7` #3: whistles exist *because* XP never punishes)
**References:** `[GDD] §10.11`, `[02] R3`, D9, `[02] §7` (assist integrity), `[00] §0.7`.
**Dependencies:** ← T6.2 (first fights), T3.5 (Reading), T9.1 (profile mark); **← D9**.
**Acceptance criteria:** loss → retry preserves all story/reward state (regression test); whisper lines fire at exactly 3rd/4th losses; Dampened offer only at 4th loss; dampened Echo export equals full-stat export (byte test); no penalty paths exist.
**Tests & validation:** loss-loop state tests ×(1,2,3,4+) losses; integrity invariant test; whisper content completeness (21×2 lines).
**Deliverables:** loss-loop module, whisper data, assist toggle.
**Priority:** High.

---

### T6.11 — Shrines: ten sites, reshaping, inscriptions
- [ ] T6.11 done

**Goal:** the shrine system per `[GDD] §13` (F24-corrected: **ten** shrines — nine chapter + hidden tenth): reshaping entry points, story-vow granting, and the L7 consolidation inscriptions per `[01] R6`/D6.
**Implementation:**
- [ ] Ten shrine nodes in story data, each with inscription line; the hidden tenth placed per lore pass
- [ ] Shrine interactions: open Hymnal reshape (T5.2), grant earned story vows (with source line), Twin Ledger swap point (T5.3)
- [ ] D6 inscriptions: the four L7 per-class lines framing the ninth-verse unlock (*"The Ashblade's last verse is the one she swore she'd never need"* et al.)
- [ ] Between-bout shrine access on the Floor (§13)
**References:** `[GDD] §13`, `[00] F24`, `[01] R6`, D6.
**Dependencies:** ← T5.2, T6.2–T6.4; D6.
**Acceptance criteria:** exactly 10 shrines exist; story-vow grants occur at shrines per §7.2 sources; L7 inscriptions render per class; Floor-bout reshaping works.
**Tests & validation:** shrine-node census; grant-flow tests; inscription rendering.
**Deliverables:** shrine content + flow integration.
**Priority:** High.

---

### T6.12 — The memory market (Pell's stall) *(decision-gated: D13, D14)*
- [ ] T6.12 done

**Goal:** the game's only sink, fully specified per `[03] R2`: memories = the nine chapter choices (visible in the Orrery as sealed lines); Act II vendor sells 3 fixed items at one memory each; selling marks the choice *—sold—* (prose remains, tally & rewards remain), closes Unmake for the run, never restocks; the vendor warns exactly once in fiction.
**Implementation:**
- [ ] Memory inventory derived from choices made (cannot sell before the chapter completes; cannot sell what you haven't lived)
- [ ] Vendor stock per D14 default: Choir-Scale Blade, Reliquary Lantern, Hourglass of Ash (all market-sourced in §8); 0–3 purchases; no haggling/restock; owned items not re-sold
- [ ] *—sold—* marks in Orrery data; Maren's final ledger line when any sold (*"Three pages of you are in his book, not yours."*); vendor warning line once
- [ ] Unmake gate linkage: any sold memory → run cannot reach Unmake (T6.8 gate input)
- [ ] What selling never touches: stats, verses, granted gear, story flags, ally states, tallies
**References:** `[03] R2` + `§4` paste-block, `§5.1` worked example, D13, D14, A10.
**Dependencies:** ← T6.5, T6.8; **← D13, D14**.
**Acceptance criteria:** purchase flow bounded by memory count; sold marks render; Unmake closure verified in gate tests; tally/reward retention verified post-sale; zero restock paths.
**Tests & validation:** vendor state tests; gate-integration tests; disclosure-line rendering tests.
**Deliverables:** vendor module + content.
**Priority:** High.

---

### T6.13 — Tallies of the City: nine optional objectives *(decision-gated: D5)*
- [ ] T6.13 done

**Goal:** `[01] R7`'s nine one-line optional objectives (fight modifiers, not fetch quests), each worth +5 XP + a deed entry + one Maren line — featherweight, ignorable, fixing Ch1–2's on-rails deadness.
**Implementation:**
- [ ] Nine objective rows per the `[01] R7` table (condition per chapter: candleless kill; ≤6-Resolve turns; all-slotted-cast; no-loss to Ch4 shrine; crit in final round; Mother Bell ≤12 rounds; no consecutive repeats; zero Ward; Phase-III answer verse used)
- [ ] Objective evaluation hooks in the fight engine (condition predicates, all deterministic)
- [ ] Rewards: +5 XP (within the +45 cap the curve absorbs), deed entry (T8.8), Maren line
- [ ] Presentation: single line on chapter-opening prose; no trackers, no nagging
**References:** `[01] R7`, D5, `[04] R3` (deed integration).
**Dependencies:** ← T6.2–T6.4, T6.9; **← D5**.
**Acceptance criteria:** all nine evaluate correctly (true/false in scripted fights); rewards land; nothing compels (no badges/toasts); XP cap respected.
**Tests & validation:** per-objective predicate tests incl. negative cases.
**Deliverables:** objectives data + evaluation module.
**Priority:** Medium.

---

### T6.14 — Maren system: class lines, vow suffixes, whisper content
- [ ] T6.14 done

**Goal:** Maren's rule (`[GDD] §2.6`) as a content system: one class-keyed line per chapter (4 classes × 9 chapters), optional vow suffixes per `[04] R7`/D22 (11 global suffixes, appended once when first earned), plus the loss-loop whisper lines (T6.10) and objective lines (T6.13) under one voice owner.
**Implementation:**
- [ ] 36 class-chapter lines from `[GDD] §2.6` + prose pass for the remainder
- [ ] 11 vow suffixes (one per story vow, global) per `[04] R7`; appended to her next line after earning
- [ ] Second-verse variants reserved as data slots (T11.2)
- [ ] Tone guard: she never explains the system, only the player (editorial rule in content review)
**References:** `[GDD] §2.6`, `[04] R7`, D22.
**Dependencies:** ← T6.2–T6.4, T6.10; D22.
**Acceptance criteria:** 36/36 class lines present; 11 suffixes fire exactly once each; no system-explanations pass content review.
**Tests & validation:** content-completeness census; suffix-fire tests.
**Deliverables:** Maren content tables.
**Priority:** High.

---

### T6.15 — Post-campaign state & the Orrery data
- [ ] T6.15 done

**Goal:** everything §4.5 promises after an ending, as state: ending + title permanent on profile; bound Echo survives; re-bind rights per ending (Kept Echo framing per `[05] R9`: *"The Kept Echo — the last Echo in Verrow. It fights because it chooses to."* + white-candle mark); Orrery recap data (tallies, ending, title, nine decisions in order).
**Implementation:**
- [ ] Post-ending state transitions incl. Floor re-bind rights matrix (A-Mercy lock in in-fiction voice, not a greyed button)
- [ ] Orrery data assembly (screen in T8.6); Codex "The Nine" tab feed (per-run Orrery scrolls kept across runs — T11.2 consumes)
- [ ] Unmake profile line (*"The Counter-Voice · the Hymn is over · their Echo is still fighting."*)
**References:** `[GDD] §4.5`, `§14.8`, `[05] R1/R9`, D25.
**Dependencies:** ← T6.7, T6.8, T7.2 (profile).
**Acceptance criteria:** ending matrix produces correct post-state for all 10 endings; Kept Echo lock enforced with the crest copy; Orrery data complete for every run.
**Tests & validation:** post-state matrix tests; Orrery-data completeness per run type.
**Deliverables:** post-campaign state module.
**Priority:** High.


---

# Phase 7 — Choir Floor & Async Features

**Purpose:** `[GDD] §15.4` Phase 7 — the async PvP loop end to end: Echo Codes, Toll/Elo with decay and recasts, the Floor's two play modes, hourly deterministic challengers, the Vigil Ledger, the Ward, drops, and the population guarantees. The single-player game must work fully without the shared ladder (`[GDD] §12.7`) — this phase *is* that single-player version.
**Phase completion criteria:** async loop works end to end (`[GDD] §15.4` Ph7 "done when"); Echo Codes validate/reject correctly; Toll/recast sims green; Floor never below 12 Echoes; manual parity asserted.

---

### T7.1 — Echo Codes: v2 serialization, validation, error voice
- [ ] T7.1 done

**Goal:** the player-to-player economy of `[GDD] §12.6`: build → JSON → base64 code → paste → validate → challenge. v2 adds `"rite"` and `"tally"` (spelling fixed per F27). Untrusted-input security rules apply (audit §0.3).
**Implementation:**
- [ ] v1 schema fields (v, name, cls, level, alloc, vow, verses, gear, doctrine) + v2 (`rite`, `tally`) — versioned envelope, forward-compatible parse
- [ ] Validation per §12.6: level 1–10; alloc ≤ `4+2×(level−1)` (N1: the GDD's own example is corrected, not the validator); verse unlock/class legality; gear/vow existence + story-state legality; doctrine known
- [ ] Security: size cap (e.g. ≤4 KB pre-encode), strict key allow-list, prototype-pollution guard (`Object.create(null)` + hasOwnProperty checks), safe base64 (no atob crashes on junk), no eval anywhere; all parse errors → the canonical rejection copy: *"The Choir turns this Echo away. It rings false."* (never raw error text)
- [ ] Copy/import UX data hooks (screen in T8.4); round-trip identity guaranteed
**References:** `[GDD] §12.6`, `[00] F27`, N1, `[03] R8`, audit §0.3 (security).
**Dependencies:** ← T5.1, T0.3.
**Acceptance criteria:** round-trip byte-identity for all fixture builds; every invalid class rejected with the canonical copy; fuzz suite (10k random strings/mutations) produces zero crashes; oversized codes rejected cleanly.
**Tests & validation:** round-trip, fuzzing, security (pollution attempts, deep nesting, unicode), version-negotiation tests.
**Deliverables:** `store/echo-code.js`, security tests.
**Priority:** Critical.

---

### T7.2 — Toll: Elo, matchmaking, decay rules *(decision-gated: D16)*
- [ ] T7.2 done

**Goal:** rating per `[GDD] §12.4` (Elo, K=32, start 1000, ±150 suggestions) plus the `[03] R4` honesty rules: repeat wins vs the same opponent ±2 flat; NPC losses ×0.5; imported-Echo fights full Elo both ways; proposed floor 100 (T0.1 micro-gate).
**Implementation:**
- [ ] Elo engine with expected-score math; K=32; per-opponent-per-run first-win tracking
- [ ] Suggestion pool: within ~150 Toll from the parish (T7.11 guarantees non-empty); deterministic ordering for UI stability
- [ ] Loss rules: NPC half-loss; imported full; floor-clamped
- [ ] Manual vs hourly resolution pay identical (parity input for T7.10)
**References:** `[GDD] §12.4`, `[03] R4`/`§4` paste-block, D16, `[00] §0.7` #6.
**Dependencies:** ← T7.4, T4.8; **← D16**.
**Acceptance criteria:** Elo arithmetic exact on golden cases; repeat-income decay verified (≤5% of first-opponent income at 50 games — T2.6 assert); floor enforced; imported fights full-swing.
**Tests & validation:** golden Elo cases; decay property tests; T2.6 Toll sim.
**Deliverables:** `engine/toll.js`.
**Priority:** Critical.

---

### T7.3 — Recasts: the ladder that climbs *(decision-gated: D16)*
- [ ] T7.3 done

**Goal:** `[03] R4`'s recast system: when your Toll exceeds a named Echo's rating by >150, it returns recast — +1 level, one counter-verse swapped, rating re-anchored at your Toll −100, one new history line ("Brother Ash has been listening.") — up to three times each, **level cap 10 binds** (edge case from the audit).
**Implementation:**
- [ ] Recast trigger check after Toll changes; per-Echo recast counter; L10 stop guard (an L9 Echo recasts once; rating re-anchor still applies at cap)
- [ ] Counter-verse swap: pick the meta answer from its class pool (authored per Echo; data not heuristic, so the lesson survives per A9)
- [ ] New history lines (3 tiers × 8 Echoes = content rows); Codex "Echoes Met" integration
- [ ] Weakness preservation invariant (A9): recasts change level/verse/rating, never the lesson — asserted
**References:** `[03] R4`, A9, D16, `[05] R3` (skill mountain).
**Dependencies:** ← T7.2, T4.8; **← D16**.
**Acceptance criteria:** ladder reaches ~1900 in sim (T2.6); weakness-exploit tests still pass post-recast; cap edge handled; history lines render.
**Tests & validation:** recast state-machine tests; cap-edge tests; weakness-preservation asserts; T2.6 Toll sim with recasts.
**Deliverables:** recast module + content rows.
**Priority:** High.

---

### T7.4 — Floor logic: two play modes + own-Echo duels
- [ ] T7.4 done

**Goal:** the Floor's mechanics per `[GDD] §12.4`: duel it yourself (manual play vs its AI) or send your Echo (AI vs AI, instant resolve with replay); suggested opponents; binding/re-binding; **and** the own-Echo duel capability the Unmake gate needs (cross-phase dependency from the audit).
**Implementation:**
- [ ] Mode A: player-controlled fighter vs Echo AI (full duel UI path)
- [ ] Mode B: Echo vs Echo resolved instantly via seed; replayable record stored (`§10.12` — the log is a record, not a simulation)
- [ ] Bind/re-bind flow from the Hymnal (T5.2); bound Echo state on profile; Corvane-spared integration (joins ladder as named Echo — flag from T6.3)
- [ ] Own-Echo duel: challenge your own bound Echo (satisfies the Unmake condition; record loss count persistently)
- [ ] Challenge result records → Vigil Ledger + Toll + drops hooks
**References:** `[GDD] §12.4`, `§10.12`, `§4.4` (own-Echo loss condition), `[05] §1.2`.
**Dependencies:** ← T5.4/T5.5, T7.2, T6.1.
**Acceptance criteria:** both modes produce identical determinism guarantees; own-Echo losses persist and feed T6.8; Corvane-spared appears on the ladder; replays byte-identical on re-open.
**Tests & validation:** mode-parity determinism tests; own-Echo persistence; bind-state tests.
**Deliverables:** Floor engine module.
**Priority:** Critical.

---

### T7.5 — Hourly challengers: deterministic wall-clock seeds
- [ ] T7.5 done

**Goal:** "while you were away" per `[GDD] §12.5`: one challenger per real hour, up to 6 pending resolved on next visit, results written to the Vigil Ledger; challenger + result deterministic from the hour so every device agrees forever (`§10.12`).
**Implementation:**
- [ ] Hour slot from **UTC epoch hours** (audit §0.3: never local time — DST/timezone-immune); challenger selection seeded `hash(hourSlot)`
- [ ] Pending queue: resolve up to 6 oldest on visit; each resolves via the fight engine (defender = bound Echo; challenger = parish Echo or imported code per selection rules)
- [ ] Resolution = real fights (not fabricated narratives): engine results → ledger lines
- [ ] The Ward filter (T7.7) applied before resolution; manual-parity hooks (T7.10)
- [ ] Overnight stakes (D20 defaults): NPC losses halved + night-cap −15 Toll from hourly challenges; never pity/drop loss
**References:** `[GDD] §12.5`, `§10.12`, `[04] R4`, D20, audit §0.3.
**Dependencies:** ← T7.4, T7.7.
**Acceptance criteria:** same hour → same challenger + same result on two devices (test via fixed clock injection); cap-6 enforced; queue survives restarts; Ward-declined hours produce the *"No one came. The Floor is quiet. She waited anyway."* line class.
**Tests & validation:** clock-injection tests (DST boundaries, year boundaries); queue persistence; determinism cross-checks.
**Deliverables:** hourly resolver module.
**Priority:** Critical.

---

### T7.6 — Vigil Ledger: records, retention, agent-voiced framing
- [ ] T7.6 done

**Goal:** the ledger of `[GDD] §12.5` + `§14.7`: results from challenges while away + post-fight Wax reports; last 20 kept; `[04] R4` framing rules — the Echo is always the agent (*held / fell / answered / refused to fall*), losses get one line of consequence, not judgment.
**Implementation:**
- [ ] Entry model: hour, challenger, result, Toll delta, one authored line (per named challenger string table; determinism makes authored lines safe)
- [ ] Retention: last 20 entries; older entries compress into summary counts (Codex "Echoes Met" feeds on lifetime records)
- [ ] Re-bell records appear here (`§10.11`) framed as effort (`[04] R2`)
- [ ] Post-fight report integration (T3.7 verdicts)
**References:** `[GDD] §12.5`, `§10.11`, `§14.7`, `[04] R4`, D18/D20 (soft).
**Dependencies:** ← T7.5, T3.7.
**Acceptance criteria:** 20-entry retention verified; no bystander-voiced loss lines in content (tone lint list); ledger survives save/load; re-bell framing present.
**Tests & validation:** retention tests; content tone lint (forbidden-phrase list); persistence tests.
**Deliverables:** ledger module + line content.
**Priority:** High.

---

### T7.7 — The Ward *(decision-gated: D20)*
- [ ] T7.7 done

**Goal:** `[04] R4`'s consent rule: your Echo declines challengers rated >300 above her; default ON for the first chapter after binding; always player-settable; never pushed.
**Implementation:**
- [ ] Ward flag on the Echo; filter in T7.5 selection; declined hours get the quiet line
- [ ] Default-ON window: first chapter after first bind, then reverts to player-set (state machine)
- [ ] Copy: *"She will not answer challengers rated more than 300 above her."*
**References:** `[04] R4` + `§5` paste-block, D20.
**Dependencies:** ← T7.5; **← D20** (default: ON first chapter).
**Acceptance criteria:** >+300 challengers never resolve while Ward on; default window correct; toggle persists; declined-hours line renders.
**Tests & validation:** filter boundary tests (±300 exactly); default-window state tests.
**Deliverables:** Ward module + copy.
**Priority:** High.

---

### T7.8 — Drops: unlived-path pool, pity, Wax bank *(decision-gated: D15)*
- [ ] T7.8 done

**Goal:** the Floor drop system resolved per `[03] R3`: 12% per win from the **unlived-path pool** (choice items from paths not taken, ×2 class-affinity weighting), then the two Floor-native items (Drowned Mantle guaranteed on first Floor win; Salt Widow's Comb from the named-Echo source), pity at 30 wins shared and reset on drop, dry-pool → visible +1 Wax bank per win (30 banked = first item of the next content tier/NG+).
**Implementation:**
- [ ] Pool builder from run state: choice items not earned this run (one source of truth with the Codex ghost list — coupling `[00] §0.7` #5)
- [ ] Roll + weighting; pity counter; Wax bank state; no drops mid-fight (ban 7)
- [ ] Vendor items excluded from the pool (they stay Pell's — `[03] §5.2`)
- [ ] Drop display: roll shown in the Ledger (`[GDD] §10.5` loot row)
**References:** `[GDD] §8.4`, `§10.5`, `[03] R3/R6`, `§5.2`, D15, `[00] §0.7` #5.
**Dependencies:** ← T7.4, T6.5 (choice state), T4.5; **← D15**.
**Acceptance criteria:** pool contents exactly = unearned choice items + 2 Floor-native (sim assert); pity never lies (≤30 drought — T2.6); dry-pool stops rolls and banks Wax; affinity weighting measurable in sim.
**Tests & validation:** drop-curve sims; pool-construction unit tests; one-source-of-truth assert vs Codex ghosts.
**Deliverables:** drop module.
**Priority:** High.

---

### T7.9 — Floor XP & first-time rewards
- [ ] T7.9 done

**Goal:** the Floor's XP faucet per `[01] R1/R8`: `8 + 2×level(O)` first win per opponent per run; repeats 50% (min 4); 25% vs opponents ≥2 levels below; first Echo bound +15; first imported-code fight +10; pays once per fight per run; identical for manual and hourly resolution.
**Implementation:**
- [ ] Payment calculator + once-per-run ledger; onboarding rewards (bind/import) with their ledger lines (*"Your Echo takes its place on the Floor. It does not look up."*)
- [ ] Parity with T7.5 hourly path (same calculator)
**References:** `[01] R1` (Floor block), `[01] R8`, A7.
**Dependencies:** ← T7.4, T4.10, T6.9.
**Acceptance criteria:** calculator matches `[01] R1` examples (Brother Ash first win 24 XP, repeat 12); onboarding rewards fire exactly once; manual/hourly parity exact.
**Tests & validation:** calculator unit tests vs worked examples; parity property test.
**Deliverables:** Floor XP integration.
**Priority:** High.

---

### T7.10 — Manual-parity enforcement *(decision-gated: D32)*
- [ ] T7.10 done

**Goal:** `[04] R6` as an executable guarantee: every reward obtainable from hourly-challenger resolution is obtainable at equal or better rate through manual play. Offline time is a bonus, never a yield advantage — the anti-FOMO guarantee in mechanism form.
**Implementation:**
- [ ] Property test over the reward tables (XP, drops, Toll): manual path expected rate ≥ hourly path rate for every reward kind
- [ ] Guard test against future regressions: any new reward source must register a manual path or fail CI
**References:** `[04] R6`, D32, `[00] §0.7` #7, `[03] A7`.
**Dependencies:** ← T7.5, T7.8, T7.9; **← D32**.
**Acceptance criteria:** parity property test green; registry enforced in CI; documented in ENGINE_RULES.md.
**Tests & validation:** the property test + a deliberately offline-only fake reward (CI must fail).
**Deliverables:** parity test suite.
**Priority:** Medium.

---

### T7.11 — Floor population guarantee *(per `[05] R5`)*
- [ ] T7.11 done

**Goal:** the Floor never falls below its parish: ≥8 named + 4 Rite-users + recast variants in the single-player phase; if the shared ladder ever ships (T11.1), imported Echoes *add*, never substitute — `floor_population ≥ 12 at all times, both phases`.
**Implementation:**
- [ ] Boot-time assert + runtime guard; degrade-to-single-player behavior if any future shared source dies (no empty floor)
- [ ] Suggestion pool derives only from guaranteed parish when imports absent
**References:** `[GDD] §9.4`, `§12.7`, `[05] R5` + `§5` paste-block.
**Dependencies:** ← T4.8, T7.4.
**Acceptance criteria:** `floor_population ≥ 12` assert at boot (both phases); removal of all imports leaves 12+; recast variants count toward the floor.
**Tests & validation:** boot assert; degradation simulation.
**Deliverables:** population guard.
**Priority:** Medium.

---

# Phase 8 — Screens, Assets & Accessibility

**Purpose:** `[GDD] §15.4` Phase 8's asset/screen half — the remaining seven screens of `§14`, the image pipeline of `§11.2`, responsive layouts, the accessibility mode, and the feedback-layer features (Chronicle, Deeds). The duel screen already exists (Phase 3); everything else lands here.
**Phase completion criteria:** all eight `§14` screens shipped and styled; assets reproduce Appendix A exactly; accessibility mode on; mobile layouts pass at 390px; the whole game playable start-to-finish in the browser.

---

### T8.1 — Title & creation screen *(with D21 presets)*
- [ ] T8.1 done

**Goal:** `[GDD] §14.1`: the wordmark, name entry, class cards (crests), vow picker, 4 free points — plus `[04] R5`'s four named presets ("The four shapes of the Vigil") with the on-screen respec promise.
**Implementation:**
- [ ] Layout per §14.1; crest images (T8.9) on class cards; wordmark on title
- [ ] D21 presets: Ashblade *"The Duelist's Debt"* (MIG/HST), Gravewarden *"The Long Door"* (VIG/GRD), Witch *"The Kindling Curve"* (WIT/HST), Cantor *"The Held Note"* (WIT/VIG) — fully editable before the first fight; one-line shrine promise on screen
- [ ] Creation validation via T5.1; name → save identity
- [ ] Second-verse entry point reserved (T11.2 flag)
**References:** `[GDD] §14.1`, `[04] R5` (provisional spreads), D21.
**Dependencies:** ← T5.1, T3.1, T8.9 (soft).
**Acceptance criteria:** presets apply + remain editable; validation rejects illegal spreads with inline reasons; creation → tutorial flow seamless; time-to-first-fight cut ≥60% vs free allocation (playtest target from `[04] §6`).
**Tests & validation:** preset/validations tests; flow test; A/B timing in playtest protocol.
**Deliverables:** title/creation screens.
**Priority:** High.

---

### T8.2 — Chronicle screen (campaign narrative)
- [ ] T8.2 done

**Goal:** the full `[GDD] §14.2` Chronicle: campaign narrative with choice buttons, act plate behind, Maren's line — styled up from T3.9's renderer with the complete visual treatment.
**Implementation:**
- [ ] Act plates (T8.9) as chapter headers with lazy loading; type hierarchy per §11.1
- [ ] Choice buttons w/ hover/focus states; made-choice history visible in-run (re-read past scenes)
- [ ] Maren's per-chapter line presentation; objective line slot (T6.13)
- [ ] Progress model: chapter → scene → duel → shrine transitions
**References:** `[GDD] §14.2`, `§11.1/11.2`.
**Dependencies:** ← T3.9, T6.2–T6.4, T8.9.
**Acceptance criteria:** all 9 chapters render with plates; choice flow correct end-to-end; re-read works; lazy-load verified.
**Tests & validation:** render tests per chapter; navigation state tests; snapshot suite.
**Deliverables:** Chronicle screen.
**Priority:** Critical.

---

### T8.3 — Hymnal screen (loadout UI)
- [ ] T8.3 done

**Goal:** `[GDD] §14.4`: verse slots with arrow reordering (order = Echo priority), vow picker, gear slots, stat allocation, the Reshape Ledger with rewind, the generated Vigil's Calendar (T4.11), and the Twin Ledger swap when owned.
**Implementation:**
- [ ] Bind T5.2/T5.3 logic; slot reordering with immediate priority feedback
- [ ] Stat allocation UX: point pool, stat descriptions (§5.1), derived-value preview (HP/mitigation/crit update live)
- [ ] "Kept" row: owned-but-unslottable items collapsed with Codex link (`[03] R7`, fixing the dead-inventory UX tax P6)
- [ ] Calendar panel (T4.11) with per-chapter unlock/reward view
**References:** `[GDD] §14.4`, `§13`, `[03] R7`, `[01] R9`.
**Dependencies:** ← T5.2, T5.3, T4.11, T8.6 (Codex link, soft).
**Acceptance criteria:** every reshape op reachable; rewind one-click; live derived preview correct; kept-row behavior per spec; Calendar byte-matches generator.
**Tests & validation:** interaction tests; derived-preview math tests; rewind UX test.
**Deliverables:** Hymnal screen.
**Priority:** Critical.

---

### T8.4 — Choir Floor screen + Your Echo screen
- [ ] T8.4 done

**Goal:** `[GDD] §14.5`/`§14.6`: ladder list with challenge buttons, import-a-code box, current Toll; doctrine picker, Echo Code with copy button, bind/re-bind.
**Implementation:**
- [ ] Floor list: parish + imports, Toll-sorted, suggestion highlighting (±150), challenge (mode A/B) buttons; the Ward note display (T7.7)
- [ ] Import box: paste → validate (T7.1) → canonical rejection or challenge-ready Echo
- [ ] Your Echo: doctrine picker (4 doctrines w/ plain-language behavior lines), Echo Code display + copy, bind/re-bind, Twin Ledger awareness
- [ ] Kept Echo state renders the crest line, not a disabled button (T6.15)
**References:** `[GDD] §14.5`, `§14.6`, `§12.2`, `§12.6`.
**Dependencies:** ← T7.4, T7.1, T7.2, T6.15.
**Acceptance criteria:** full bind→challenge→result loop from UI; import rejection copy exact; copy-button produces valid codes; doctrine changes re-bind correctly.
**Tests & validation:** UI integration tests; clipboard round-trip; rejection-path tests.
**Deliverables:** Floor + Your Echo screens.
**Priority:** Critical.

---

### T8.5 — Vigil Ledger screen
- [ ] T8.5 done

**Goal:** `[GDD] §14.7` as a screen: results from challenges while away + the post-fight Wax reports + re-bell records, with the `[04] R4` agent-voiced framing.
**Implementation:**
- [ ] Ledger list view (20 entries + summary), entry detail with replay-view link for mode-B fights
- [ ] Wax report section; re-bell count framed as effort (`[04] R2`)
- [ ] Overnight-return presentation: newest-first, quiet-line class when nothing came
**References:** `[GDD] §14.7`, `§12.5`, `[04] R2/R4`.
**Dependencies:** ← T7.6.
**Acceptance criteria:** entries render in order with authored lines; replay view reproduces the stored fight byte-identically; empty-return line renders.
**Tests & validation:** render tests; replay-integrity test.
**Deliverables:** Ledger screen.
**Priority:** High.

---

### T8.6 — Orrery screen + Echo Codex *(with D25)*
- [ ] T8.6 done

**Goal:** `[GDD] §14.8` Orrery (tallies, ending, title, the nine decisions in order) + the `[05] R4` Codex: five tabs (Relics & Marks / Verses & Vows / Deeds / Echoes Met / The Nine), ghost silhouettes naming their source, the completionism matrix shown honestly, **no progress bars, no percentages, no prompts**.
**Implementation:**
- [ ] Orrery: the run's nine decisions + ending + title; *—sold—* marks (T6.12); Unmake condition annotation when flag active (T6.8)
- [ ] Codex tabs: ownership from save; ghosts from the same source of truth as the drop pool (coupling `[00] §0.7` #5); matrix table per `[05] R2` (41 items → 3 runs; titles → 9–10) rendered as plain numbers
- [ ] Echoes Met: fought records incl. recast tiers; imported-code guest-book lines (*"Mourne, a Cantor. Challenged twice. Held once."*)
- [ ] The Nine: per-run Orrery scrolls retained across runs (read-only until T11.2 exists)
- [ ] D25 default: ghosts + matrix (not mere ownership lists)
**References:** `[GDD] §14.8`, `[05] R2/R4` + `§5` paste-block, D25, `[00] §0.7` #5.
**Dependencies:** ← T6.15, T7.3, T7.8, T8.8 (Deeds tab).
**Acceptance criteria:** five tabs complete; ghost lines name sources; matrix numbers match the computed table; zero progress-bar/percentage elements (UI lint rule); sold-marks render.
**Tests & validation:** tab-content completeness tests; coupling assert (pool == ghosts); UI lint.
**Deliverables:** Orrery + Codex screens.
**Priority:** High.

---

### T8.7 — Chronicle feedback screen *(with D18)*
- [ ] T8.7 done

**Goal:** `[04] R2`'s run-long feedback axis: the build's biography (five-milestone auto-diff), the calibration line (expected-vs-actual, fight-10+), and the re-bell count framed as effort — generated entirely from tracked data.
**Implementation:**
- [ ] Biography: creation/Ch3/Ch6/Ch9/final-bind diffs in prose (*"At the crypt you were 6/12/2/4/7…"*), verse-drop detection from cast counts
- [ ] Calibration line rendering gated on the accuracy assert (correlation ≥0.6 over 20+ fights — `[04] §7` assert 2: the claim must be *true*)
- [ ] Re-bell framing line; link from post-fight report (T3.7)
- [ ] D23 shame-line re-word applied here and in T3.7
**References:** `[04] R2/R8` + `§5` paste-block, D18, D23.
**Dependencies:** ← T3.7, T2.8 (counters), T5.2.
**Acceptance criteria:** biography text generated for full runs; calibration line only when true (assert); re-bell line renders; report link works.
**Tests & validation:** generation tests vs tracked data; calibration truthiness assert.
**Deliverables:** Chronicle feedback screen.
**Priority:** Medium.

---

### T8.8 — Deeds *(with D19)*
- [ ] T8.8 done

**Goal:** `[04] R3`'s ten diegetic deeds as ledger entries with one Maren line each — no toasts, no mechanics, no gating; listed publicly in the Codex from the start.
**Implementation:**
- [ ] The ten: The Wax Ran Level · Over the Trace · Counted · The Unwalled · Five Voices (per-class equivalents) · The Long Note · The Vigil Kept · The Kind Hand · The Counter-Voice's Shadow · Practice of the Dead
- [ ] Trigger evaluation hooks (deterministic, from fight/run data); discovery line appears dated in the Vigil Ledger
- [ ] Codex tab (T8.6) + coverage asserts: every deed >0% unlock across 10k sim runs; none >90%
**References:** `[04] R3` + `§5` paste-block, D19, `[04] §7` assert 3.
**Dependencies:** ← T7.3 (Practice of the Dead needs recasts), T6.8 (Shadow deed), T8.6.
**Acceptance criteria:** 10 deeds fire correctly incl. per-class Five Voices variants; coverage band asserts green; zero toast/notification UI (lint).
**Tests & validation:** per-deed trigger tests; coverage sims; UI lint.
**Deliverables:** deeds module + content.
**Priority:** Medium.

---

### T8.9 — Image pipeline: the ten plates/crests
- [ ] T8.9 done

**Goal:** produce and integrate the exact ten-file manifest of `[GDD] §11.2`/App A: wordmark (true alpha), 3 act plates, 4 crests, sigil, texture — all WebP, build-time generated, committed to the repo, one warm-accent art direction.
**Implementation:**
- [ ] Generate per the per-asset brief (`§11.2`): wordmark keyed from flat-white render (alpha from darkness, unpremultiplied — the §11.2 wordmark-key note), act plates 1920×640, crests/sigil 512×512, tileable texture 1024×1024
- [ ] Common prompt prefix with the single-warm-accent rule; off-palette outputs rejected in review, not tweaked
- [ ] WebP quality 82–93; targets: total ≈1.17 MB; act plates load only on chapter open (`loading="lazy"`)
- [ ] Asset-manifest test: file list + dimensions + sizes match App A within tolerance
**References:** `[GDD] §11.2` (manifest, briefs, wordmark key), App A.
**Dependencies:** ← T0.4 (soft: UI can stub during development).
**Acceptance criteria:** ten files at spec dimensions/sizes; wordmark composites over any background (alpha test); lazy-load verified; palette review pass documented.
**Tests & validation:** manifest test; visual review checklist; alpha compositing test.
**Deliverables:** `assets/img/*` (10 WebP).
**Priority:** High.

---

### T8.10 — Responsive layouts, all screens
- [ ] T8.10 done

**Goal:** the `§14` mobile direction across every screen: single column, stacked panels, the Reading collapse, Wax Meter always visible, Hymnal/Floor/Codex usable one-handed at 390px; desktop multi-column preserved.
**Implementation:**
- [ ] Per-screen mobile layouts (duel done in T3.8): creation, Chronicle, Hymnal, Floor, Your Echo, Ledger, Orrery/Codex
- [ ] Touch targets ≥44px; no horizontal scroll at 390px; plates art-directed for narrow crops
- [ ] Performance: screen transitions <100ms on throttled mobile profile
**References:** `[GDD] §14` (mobile paragraph), `§11.5`.
**Dependencies:** ← T8.1–T8.6, T3.8.
**Acceptance criteria:** 390px snapshot suite green for all screens; no scroll-locked critical info; touch audit clean.
**Tests & validation:** snapshot tests; touch-target audit; throttle timings.
**Deliverables:** responsive styles.
**Priority:** High.

---

### T8.11 — Accessibility mode & settings
- [ ] T8.11 done

**Goal:** the `§11.1` accessibility mode (Source Serif 4 body swap, 17→19px, Cinzel wordmark replacing blackletter) plus the Settings surface gathering every player-facing toggle: Ward (T7.7), Dampened Bell (T6.10), opt-in counters (T2.8), accessibility, and the honest one-line counter description.
**Implementation:**
- [ ] Accessibility toggle implementing the §11.1 swap exactly; persists across sessions
- [ ] Settings screen with grouped toggles; each with its one-line honest description (*"Counts sittings and fights on this device. Never leaves it unless you send it."*)
- [ ] Keyboard navigation + focus rings (tallow) for all interactive elements; reduced-motion honored for the Wax Meter
- [ ] Status legibility at 14px re-verified in accessibility mode
**References:** `[GDD] §11.1` (accessibility mode), `§14`, `[05] R10`, `[04] R4`.
**Dependencies:** ← T3.1, T3.2, T6.10, T7.7, T2.8.
**Acceptance criteria:** mode swap verified visually; all toggles persist + function; full keyboard playthrough of a fight possible; reduced-motion test passes.
**Tests & validation:** toggle persistence tests; keyboard navigation audit; contrast re-check in accessibility mode.
**Deliverables:** settings screen + a11y layer.
**Priority:** High.

---

### T8.12 — Tone pass: reports, ledger lines, shame-line, suffixes
- [ ] T8.12 done

**Goal:** one editorial sweep so the game's most-read text surfaces carry the decided tone: the five verdict lines (+D23 re-word), ledger agent-voiced lines (T7.6 content), Maren suffixes (T6.14), deed lines, whisper lines — consistency of voice, no contempt, route-to-fix framing.
**Implementation:**
- [ ] Read every player-visible string through the `[04]` tone rules; the shame line replaced with *"You were favored and lost. The Reading knows why — open it."* if D23 approved
- [ ] Forbidden-pattern lint list (no blame-the-RNG phrasing, no streak language, no FOMO verbs)
- [ ] Proofing pass on the ~24k-word prose corpus for consistency (names, terms: Choir Floor not "arena" per N2)
**References:** `[04] R8`, `§2.6`, `[00] §0.6` (tone stance), N2.
**Dependencies:** ← T3.7, T6.14, T7.6, T8.8.
**Acceptance criteria:** lint list green across all string tables; D23 wording applied; terminology consistent (N2 fixed everywhere).
**Tests & validation:** string-table lint; terminology grep; editorial sign-off checklist.
**Deliverables:** tone pass report + edits.
**Priority:** Medium.


---

# Phase 9 — Persistence, Save/Load & Security

**Purpose:** the `store` module of `[GDD] §15`: local saves, save-code export/import, Echo Codes already handled (T7.1), and the hardening work — versioning, corruption safety, quota failures, cross-run isolation, and the regression corpus that keeps determinism honest forever.
**Phase completion criteria:** save round-trips byte-stable across versions; corrupt/hostile inputs never crash the game; the regression corpus (golden fights + golden saves) runs in CI.

---

### T9.1 — Save model, versioning & migrations
- [ ] T9.1 done

**Goal:** the canonical save state (run state + loadouts + Reshape Ledger + Floor state + Codex/Deeds + settings + profile) with a version field and a migration chain, so future balance patches (recast patches, T11.3) never strand a player's heirloom.
**Implementation:**
- [ ] Schema per T0.3 `saveState`; versioned envelope `{v, data, checksum}`; migration registry vN→vN+1 with tests per step
- [ ] Data-version stamp from T4.1 recorded; unknown-version handling (refuse + honest message, never guess)
- [ ] What persists: everything needed by §4.5 carry-over, Unmake records (own-Echo losses), Ward state, pity/Wax bank, telemetry counters (if opted in)
- [ ] Deterministic serialization (stable key order) — save hashes are stable
**References:** `[GDD] §15` (store), T0.3, `[05] R1` (cross-run needs), T11.3 (patch migrations).
**Dependencies:** ← T0.3, T4.1, T5.2, T6.1, T7.x states.
**Acceptance criteria:** round-trip identity on fixture saves; migration chain tested v1→vN; unknown version refuses cleanly; serialization stable across sessions.
**Tests & validation:** round-trip tests; migration tests incl. hostile payloads; stability tests.
**Deliverables:** `store/save.js`, migrations.
**Priority:** Critical.

---

### T9.2 — localStorage persistence & failure handling
- [ ] T9.2 done

**Goal:** browser persistence that fails gracefully: quota exceeded, storage disabled/private mode, multi-tab writes, and manual save/export prompts when auto-save can't run.
**Implementation:**
- [ ] Auto-save points (fight end, chapter events, reshape, bind); debounced writes; checksum verify on read
- [ ] Quota/private-mode handling: read-only mode warning with export-your-save prompt; never lose the session silently
- [ ] Multi-tab guard: last-writer-wins with explicit conflict notice (single-player game; keep simple, be honest)
- [ ] Corruption path: checksum mismatch → attempt migration salvage → else offer export of raw state + fresh start
**References:** `[GDD] §15` ("saves to the browser"), audit §0.3.
**Dependencies:** ← T9.1.
**Acceptance criteria:** forced-quota test preserves the session with an export prompt; corrupted save produces salvage-or-export, never a blank screen; no data loss on reload during any tested flow.
**Tests & validation:** storage-mock failure tests (quota, disabled, garbage); reload-interruption tests at each save point.
**Deliverables:** `store/persist.js`.
**Priority:** Critical.

---

### T9.3 — Save-code export/import
- [ ] T9.3 done

**Goal:** the "export and import a save code" promise of `[GDD] §15`: encoded, checksummed, versioned save strings a player can paste to move devices — with the same security posture as Echo Codes.
**Implementation:**
- [ ] Export: compress (if warranted) → base64 → prefixed code with version + checksum; size guard
- [ ] Import: strict validation, migration chain application, checksum verify; all failures → honest copy, never partial imports
- [ ] Privacy note: save codes contain the run's story — one line telling players that before sharing
**References:** `[GDD] §15`, T9.1, audit §0.3.
**Dependencies:** ← T9.1.
**Acceptance criteria:** round-trip identity across devices/browsers (test matrix); corrupted/hostile codes rejected with canonical copy; version downgrade attempts refused.
**Tests & validation:** round-trip matrix; fuzzing; migration-on-import tests.
**Deliverables:** `store/save-code.js`.
**Priority:** Critical.

---

### T9.4 — Untrusted-input security sweep
- [ ] T9.4 done

**Goal:** consolidate the security posture across Echo Codes (T7.1), save codes (T9.3), and any pasted/loaded content: validation-first, allow-list keys, no code execution, no prototype pollution, size caps, safe decode.
**Implementation:**
- [ ] Central `store/safe-parse.js` used by every ingestion point; deny-by-default schema validation
- [ ] Pollution tests (`__proto__`, `constructor`, deeply-nested bombs), decode bombs, unicode edge cases
- [ ] Documentation: threat model note in `docs/ENGINE_RULES.md` (offline game; the attacker model is hostile pastes)
**References:** audit §0.3, `[GDD] §12.6`, T7.1.
**Dependencies:** ← T7.1, T9.3.
**Acceptance criteria:** fuzz suite (≥50k mutations) zero crashes, zero prototype contamination; all ingestion points route through safe-parse (architecture test).
**Tests & validation:** fuzzing in CI; architecture lint (no direct JSON.parse of untrusted strings).
**Deliverables:** safe-parse module + threat-model doc.
**Priority:** Critical.

---

### T9.5 — Cross-run isolation (Second-Verse-ready)
- [ ] T9.5 done

**Goal:** `[05] §7` assert 2, built now so NG+ (T11.2) can never corrupt run 1: run-2 saves must not mutate run-1 state (Orrery, Echo, title, Codex history); the Ash Inheritance is the only permitted cross-run write (when it exists).
**Implementation:**
- [ ] Run-scoped state container with an immutable completed-run archive
- [ ] Regression test: simulate run-2 start/finish → run-1 archive hash unchanged
**References:** `[05] §7` assert 2, `[05] R1`.
**Dependencies:** ← T9.1, T6.15.
**Acceptance criteria:** archive immutability test green; container API makes cross-run writes impossible without the sanctioned path.
**Tests & validation:** isolation regression test; API-level write-guard tests.
**Deliverables:** run-isolation layer.
**Priority:** Medium.

---

### T9.6 — Regression corpus & determinism CI
- [ ] T9.6 done

**Goal:** the permanent regression net: golden fights (seed + builds → byte-identical result JSON), golden saves, golden Reading outputs, and the balance asserts from Phase 2 — all gated on every commit.
**Implementation:**
- [ ] Corpus builder: N canonical matchups × seeds → stored goldens; diff test with actionable seed-level failure output ("here's the seed, here's what should have happened" — the §10.3 bug-report promise, applied to ourselves)
- [ ] Cross-environment byte-equality: Node vs headless browser run in CI
- [ ] Phase-2 asserts wired as a CI stage (smoke matrix per commit; full matrix nightly)
**References:** `[GDD] §10.3`, `§15` (determinism), `[02] §7`.
**Dependencies:** ← T1.9, T2.x, T9.1.
**Acceptance criteria:** any engine change that alters a golden output fails CI with the exact seed; browser/Node equality green.
**Tests & validation:** the corpus itself; corpus-regeneration tooling with review gate.
**Deliverables:** `tests/golden/`, corpus tooling.
**Priority:** Critical.

---

### T9.7 — Error handling & edge-case sweep
- [ ] T9.7 done

**Goal:** the known edge cases from the audit, closed systematically: clock skew/DST (hourly seeds), level-cap edges (recasts, stat points at 10), zero-length states (no choices yet, empty ledger, dry pools), huge values (Toll caps, XP caps), locale-dependent formatting banned in logic, NaN guards on every stat computation.
**Implementation:**
- [ ] Checklist sweep per module with tests added to the corpus
- [ ] Global error boundary: unexpected exceptions → honest crash screen with export-current-state option (no silent resets)
**References:** audit §0.3, `[03] R4` (cap edge), T7.5 (clock).
**Dependencies:** ← all systems (soft); run after feature-freeze of Phase 8.
**Acceptance criteria:** checklist 100% covered by tests; crash screen tested via fault injection; no locale-dependent behavior in engine (lint).
**Tests & validation:** the sweep tests; fault-injection tests.
**Deliverables:** edge-case test suite + crash boundary.
**Priority:** High.

---

# Phase 10 — Balance Pass 2, Optimization & Release

**Purpose:** `[GDD] §15.4` Phase 8's closing half — the five-person playtest, the second balance pass with real telemetry, the performance budget, the zero-network audit, and the release checklist that verifies the overall Definition of Done.
**Phase completion criteria:** playtested by at least five people (`[GDD] §15.4` Ph8 "done when"); all harness targets green on final data; performance budget met; DoD checklist signed.

---

### T10.1 — Internal full-campaign builds & integration hardening
- [ ] T10.1 done

**Goal:** the whole game assembled — creation → campaign → Floor → ending → post-campaign — as a daily-playable internal build, with cross-system integration issues (the couplings of `[00] §0.7`) hunted in real play, not just sims.
**Implementation:**
- [ ] Build pipeline producing the complete offline bundle; versioned internal releases
- [ ] Integration test marathon: 4 classes × 3 ending paths automated end-to-end; Unmake path scripted; every choice-path reward verified in-situ
- [ ] Cross-system bug bash: XP+sync+calendar; drops+Codex ghosts; Ward+hourly+ledger; memory market+Unmake gate; deeds+Chronicle
**References:** `[00] §0.7` (eight couplings), `[GDD] §15.4` Ph4–7 "done when" rows.
**Dependencies:** ← Phases 4–9 core tasks.
**Acceptance criteria:** automated end-to-end matrix green (≥12 full-run paths); zero known coupling breaks; daily build stable for one week.
**Tests & validation:** the marathon suite; crash-rate tracking in internal use.
**Deliverables:** release-candidate builds + integration report.
**Priority:** Critical.

---

### T10.2 — Five-tester playtest protocol
- [ ] T10.2 done

**Goal:** the `[GDD] §15.4` Ph8 gate — five real humans, run as the merged protocol from `[01]–[05]` test plans: onboarding timing, tutorial clears, wall interviews, vendor hesitation, overnight-return feelings, post-campaign questions.
**Implementation:**
- [ ] Script per tester: creation timing (T8.1 A/B), Bram/Sedge first-attempt clears (targets ≥75%/≥70%), act-boss "what would you change?" interviews, Pell hesitation beat (`[03] §6`), overnight-return check (`[04] §6`), Ilvane Phase III comprehension question (`[02] §6`), post-ending "what did you do next?" (`[05] §7`)
- [ ] Capture red-lines: Reading-trust ≥80% agreement; verdict-tone abandonment check; deed-hunting watch
- [ ] Findings triaged into balance changes (T10.3) or content fixes; every red-line metric logged
**References:** `[01] §6`, `[02] §6–7`, `[03] §6`, `[04] §6–7`, `[05] §7`, `[GDD] §15.4`.
**Dependencies:** ← T10.1.
**Acceptance criteria:** five testers complete ≥Act II; all protocol questions answered and logged; no red-line metric breached without a tracked fix.
**Tests & validation:** the protocol itself; findings ledger.
**Deliverables:** playtest report + triage list.
**Priority:** Critical.

---

### T10.3 — Balance pass 2
- [ ] T10.3 done

**Goal:** act on playtest + harness data without breaking the published truths: tune within the pacing rows (T2.7), re-verify every Phase-2 assert, and resolve the deferred numeric decisions (D12 Bram telemetry; Vigil's Rest slot-rate check per `[03] R5`; Mother Bell lever effectiveness per D10).
**Implementation:**
- [ ] Telemetry review (T2.8 exports + interviews) → tuning table
- [ ] Re-run full harness matrix + wall-band asserts; any row drift >8 points → re-tune or re-declare (documented)
- [ ] Verify the six-critical fixes in live play (XP walk, Fatigue, budget, loss loop, memory market, level target)
**References:** `[02] §7` red-lines, `[03] R5` provisional band, `[00] §0.8`.
**Dependencies:** ← T10.2, T2.2/T2.3/T2.7.
**Acceptance criteria:** all §15.3 targets green post-tuning; pacing rows within ±8; red-lines cleared or explicitly accepted by owner.
**Tests & validation:** full matrix rerun; golden-corpus regeneration with review.
**Deliverables:** balance change log + retuned data.
**Priority:** Critical.

---

### T10.4 — Performance optimization
- [ ] T10.4 done

**Goal:** meet the numbers the design promised: <40ms Reading on a phone (T2.4), instant DoT updates, <16ms UI event renders (T3.8), fast boot, and the ~1.9 MB shipped-weight budget (`[GDD] §15`).
**Implementation:**
- [ ] Boot profile: parse/validate data, first-paint target <1.5s on mid-tier mobile
- [ ] Fight loop: allocation profiling; no per-frame garbage in long fights; Last-Bell/20-round worst case smooth
- [ ] Weight budget: fonts ≈733 KB + images ≈1.17 MB + code ≤ ~100 KB gz ≈ 1.9 MB total; lazy plates enforced
- [ ] Cache behavior: Reading LRU verified under memory pressure
**References:** `[GDD] §10.8`, `§15`, `§11.2`, T2.4/T3.8 budgets.
**Dependencies:** ← T8.9, T8.10 (soft).
**Acceptance criteria:** budgets met on the target-device profile; regressions caught by CI perf jobs (budgets asserted, not aspirational).
**Tests & validation:** perf benchmarks in CI (throttled CPU), weight audit script.
**Deliverables:** perf report + optimizations.
**Priority:** High.

---

### T10.5 — Zero-network audit & packaging
- [ ] T10.5 done

**Goal:** the brand promise made mechanical: no external request at any point (`[GDD] §15`), everything self-hosted, ships as a static bundle that runs from `file://` or any static host.
**Implementation:**
- [ ] Static analysis: no fetch/XHR/WebSocket/dynamic-remote-import anywhere (CI grep with allowlist)
- [ ] Runtime assert: instrumented network stack in test build must record zero requests during a full automated playthrough
- [ ] Packaging: single-page bundle + `assets/` tree; offline smoke test (airplane-mode playthrough)
- [ ] License bundle: 5 OFL files + asset credits shipped
**References:** `[GDD] §11`, `§15`, App A.
**Dependencies:** ← T0.4, T8.9, T10.1.
**Acceptance criteria:** zero recorded requests across the automated playthrough; bundle runs offline; licenses present.
**Tests & validation:** the runtime network assert in CI; airplane-mode manual QA.
**Deliverables:** packaging + audit report.
**Priority:** Critical.

---

### T10.6 — Release checklist & Definition-of-Done verification
- [ ] T10.6 done

**Goal:** the final gate: verify the roadmap's overall Definition of Done (§ below) line by line, publish the release notes as the first "recasting" ledger entry (`[05] R6` philosophy — the changelog is in-world), and cut v1.0.
**Implementation:**
- [ ] DoD checklist executed with evidence links (tests, reports, playtest sign-offs)
- [ ] Release notes: plain-language lines for any player-facing formula (honesty contract outranks fiction)
- [ ] Launch flags set per D27 phase 1 (Unmake sealed), D29 counters off-by-default, Ward default-ON window armed
- [ ] Tag + archive: repo, bundle, goldens, playtest report
**References:** `[GDD] §15.4`, `[05] R6/R7/R10`, DoD section below.
**Dependencies:** ← T10.1–T10.5.
**Acceptance criteria:** every DoD row has evidence; release notes written; v1.0 tagged.
**Tests & validation:** checklist audit (second reviewer).
**Deliverables:** v1.0 release.
**Priority:** Critical.

---

### T10.7 — Post-release observation window (no-tracking measurement)
- [ ] T10.7 done

**Goal:** the `[05] R10` program, run honestly: opt-in counters export review, save-code census read from public code threads, cohort interviews at 1 week / 1 month / 3 months with the Phase-8 tester cohort; the one metric that matters: **second-verse starts per finished campaign > 0.5** (target when T11.2 ships).
**Implementation:**
- [ ] Collect exported counter lines voluntarily shared; census scrape of public code posts (title/Toll/build distributions)
- [ ] Cohort protocol per `[05] §7`: 1-week "what did you do after the ending?", 1-month second-verse start rate, 3-month honest churn list
- [ ] Red-line watch: second-verse starts <25% → revisit post-campaign structure; Floor-touch <50% among finishers → first-bind flow
**References:** `[05] R10` + `§7`, D29.
**Dependencies:** ← T10.6 (launch), T2.8.
**Acceptance criteria:** measurement plan executed as documented; no tracking beyond opt-in/census (privacy schema tests remain green); findings feed the T11 backlog.
**Tests & validation:** privacy schema tests; protocol logs.
**Deliverables:** observation report(s).
**Priority:** Medium.

---

# Phase 11 — Post-Launch & Optional Features (NOT in the initial release)

**Purpose:** everything `[GDD] §17` leaves open and the review specs for later — kept out of v1.0 scope by design. Each task names its entry condition. None blocks the Definition of Done.

---

### T11.1 — Shared ladder with real players *(GDD Phase 9 — optional)*
- [ ] T11.1 done (optional)

**Goal:** `[GDD] §12.7`: if hosted with shared storage, players bind Echoes to a shared list; challengers write result records; defenders read them on next visit. **Entry condition:** owner decision + a hosting commitment. The single-player game must already work fully without it (it does).
**Implementation (sketch, gated):**
- [ ] Shared list storage + result-record protocol; Echo population *adds* to the parish (T7.11 invariant holds in both phases)
- [ ] Full Elo between imported Echoes (T7.2 rule already specced); abuse controls (rate limits, validation re-runs server-side)
- [ ] Degrade-to-single-player guarantee tested (dead shared ladder → parish floor)
**References:** `[GDD] §12.7`, `§17` open decision 1, `[05] R5`.
**Dependencies:** ← T7.x complete; owner go/no-go.
**Acceptance criteria:** imported Echoes appear alongside (never instead of) the parish; a dead shared source degrades to single-player behavior; full-Elo rules apply between imports; T7.11's ≥12 invariant holds in both phases.
**Tests & validation:** both-phase population asserts; degradation simulation; Elo parity tests.
**Deliverables:** shared-ladder module (optional build).
**Priority:** Low (post-launch).

---

### T11.2 — The Second Verse (NG+) *(decision-gated: D24)*
- [ ] T11.2 done (optional)

**Goal:** `[05] R1`: after any ending — new Vigil, carried title/tally history/Echo/Codex; run 1's Echo returns as a named challenger (The Vigil Who Came Before); Ash Inheritance (one item's mark as a ghost-mark; two if run 1 was Unmake); nine one-line "the city remembers" variants; Unmake-hunting legibility. **Entry condition:** D24 approved + T10.7 baseline recorded.
**Implementation (sketch, gated):**
- [ ] Second-verse run state on the T9.5 isolation layer; creation entry point on the title screen
- [ ] The Vigil Who Came Before: generated named Echo from save data (honest rating; history line *"It fights the way you fought. You wrote it. It has not forgotten."*); chapter keying per the T0.1-defined "dominant act" rule
- [ ] Ash Inheritance ghost-mark mechanics (mark-only carry; never stats — A8); Kept-Echo/A-Mercy edge: what the lock means for run-2 binding needs a ruling at D24 time
- [ ] Nine chapter variant lines + Maren Ch1 second-verse line (content pass)
**References:** `[05] R1` + `§5` paste-block, `§6.2`, A8, D24, T9.5.
**Dependencies:** ← T9.5, T10.7; **← D24**.
**Acceptance criteria:** run-1 archive hash unchanged across a full simulated run 2; Ash Inheritance grants mark-only benefits (A8); the challenger's rating is harness-honest; Kept-Echo edge ruled and implemented per D24.
**Tests & validation:** isolation regression suite; ghost-mark unit tests; generated-Echo legality validation.
**Deliverables:** Second Verse module + content pack.
**Priority:** Low (post-launch).

---

### T11.3 — Recast patches: balance updates as fiction *(decision-gated: D26)*
- [ ] T11.3 done (optional)

**Goal:** `[05] R6`: every balance patch is a recasting — sheets re-tuned, one new Echo bound per patch, changelog written as ledger prose with plain-language lines for formula changes (honesty outranks fiction). Mechanism = data files + save migrations (T9.1), no server.
**Implementation (sketch, gated):**
- [ ] Patch format: sheet diffs, one new Echo row, changelog lines; migration steps per save version
- [ ] Wax-bank payout hook: banked Wax grants the first item of the new tier at bind (T7.8's dry-pool promise kept)
**References:** `[05] R6`, `[03] R3` (Wax bank), A12, D26.
**Dependencies:** ← T9.1, T7.8; **← D26** (cadence owner-set).
**Acceptance criteria:** a test patch migrates an old save without loss; changelog renders as ledger prose with plain-language formula lines; Wax-bank payout fires on the new tier at bind.
**Tests & validation:** migration round-trip tests; patch-format schema tests.
**Deliverables:** patch tooling + format spec.
**Priority:** Low (post-launch).

---

### T11.4 — Unmake discoverability phases 2–3 *(decision-gated: D27)*
- [ ] T11.4 done (optional)

**Goal:** `[05] R7`'s schedule after launch: month 2 — Unmake players' ladder lines become public/copyable via codes (the title advertises itself); month 3 — the Shadow deed goes live for everyone (seeing the condition met-but-untriggered in the Orrery). Phase 1 (sealed) ships with v1.0 per T10.6.
**Implementation (sketch, gated):**
- [ ] Flag flips per schedule; Orrery annotation rendering; code-card inclusion of the Counter-Voice line
**References:** `[05] R7`, D27, `[04] R3` (Shadow deed).
**Dependencies:** ← T6.8, T8.8; **← D27**.
**Acceptance criteria:** flag flips render exactly at the scheduled boundaries; the Orrery annotation never appears before month 3 (or first cryptic discovery); the Counter-Voice line travels through Echo codes.
**Tests & validation:** schedule-flag tests; code-card content tests.
**Deliverables:** discoverability flag pack.
**Priority:** Low (post-launch).

---

### T11.5 — Measurement program expansion *(decision-gated: D29)*
- [ ] T11.5 done (optional)

**Goal:** full `[05] R10` adoption once there is post-launch data: counters + census + cohorts feeding a standing balance-review cadence (pairs with T11.3 patches).
**Implementation (sketch, gated):** cohort retention; census dashboards built from voluntarily shared codes; the >0.5 second-verse target tracked.
**References:** `[05] R10`, D29.
**Dependencies:** ← T10.7.
**Acceptance criteria:** all three channels produce reports; zero identifiers in any collected data (privacy schema tests stay green); the >0.5 second-verse target tracked once T11.2 ships.
**Tests & validation:** privacy schema tests; protocol logs.
**Deliverables:** measurement program + reports.
**Priority:** Low (post-launch).

---

### T11.6 — Audio pass (v1.1) *(explicitly out of v1 scope per `[GDD] §11.6`)*
- [ ] T11.6 done (optional)

**Goal:** the reserved v1.1 pass: three ambience beds (crypt, foundry, bellmouth) + one 2-second bell toll for the Fatigue telegraph. Not required for ship; not specced beyond `[GDD] §11.6`.
**Implementation (sketch, gated):** asset pass + one telegraph SFX hook; zero scope creep into combat UI animation rules.
**References:** `[GDD] §11.6`.
**Dependencies:** ← v1.0 shipped.
**Acceptance criteria:** assets self-hosted within the weight budget; the telegraph SFX fires only on the Fatigue telegraph; the Wax Meter remains the only *animated* element in combat UI (`§11.5`).
**Tests & validation:** asset-manifest test; animation-rule lint.
**Deliverables:** v1.1 audio pass.
**Priority:** Low (post-launch).

---

### T11.7 — Fifth class gate *(decision-gated: D28 — re-decide post-launch)*
- [ ] T11.7 done (optional)

**Goal:** if the owner ever wants a fifth class, it must pass the `[05] R8` requirements list — a content project at Act II weight, not a patch: 9 verses incl. two NEW-tier innovations; 3 class vows, one defining a *new* Phase III answer (a third pole on the gear-vs-verses axis, e.g. power held in status economics/denial); a Corvane counter-row; a Reading archetype; ≥6 affinity items rebalanced; the 4×5 kit matrix; a Maren line-set.
**Implementation (sketch, gated):** requirements checklist as the entry gate; then a dedicated roadmap (this one does not scope it).
**References:** `[GDD] §17` open decision 3, `[05] R8`, D28.
**Dependencies:** ← owner decision post-launch.
**Acceptance criteria:** the requirements checklist passes fully before any build work; the harness targets extend to a fifth class without amending the four existing classes' results.
**Tests & validation:** checklist gate; full harness matrix re-run at 5×5.
**Deliverables:** fifth-class requirements gate + (if approved) a dedicated roadmap.
**Priority:** Low (post-launch).

---

# Phase completion criteria (consolidated)

| Phase | Complete when |
|---|---|
| **0** | All D1–D32 + N1–N4 verdicts recorded in `docs/DECISIONS.md`; v1.0.1 spec committed with tagged amendments; schemas frozen with validators + fixtures; CI green on empty content; inventory tracker live. |
| **1** | All ten §10.9 bans enforced by named tests; engine headless in Node; byte-identical replays across environments; Fatigue/Last Bell schedule asserted. |
| **2** | All §15.3 targets green on fixtures (re-verified on real data in Phase 10); ±12% variance assert green; Reading sim <40ms p95; XP fit/containment, economy faucet, and wall-band asserts green once their phases feed them. |
| **3** | A full manual fight playable and readable; Reading matches harness (`[GDD] §15.4` Ph2); tutorial teaches the verbs; mobile duel layout passes. |
| **4** | Content counts match `[GDD] §16` (T0.5 green); all rows schema-valid; budget conformance green; Calendar byte-diff green; reward-integrity asserts green. |
| **5** | Any legal build assembles and fights under all four doctrines; AI honesty tests green; all 21 signature verbs play; Corvane lock exploit-proof. |
| **6** | Campaign playable start-to-finish for all four classes; all 10 endings reachable, epilogue matches tally (`[GDD] §15.4` Ph6); Ch4 branch changes Ch6 fight list (regression-locked); XP walk lands bands; loss loop complete. |
| **7** | Async loop end to end (`[GDD] §15.4` Ph7); Echo Codes validate with canonical rejection; Toll/recast sims green; population ≥12; manual parity property test green; hourly determinism cross-device green. |
| **8** | All eight `§14` screens shipped; asset manifest reproduced (10 WebP + 18 woff2); accessibility mode on; 390px snapshots green; tone lint green. |
| **9** | Save round-trip + migrations green; hostile-input fuzz zero crashes; regression corpus (goldens) CI-gated; edge-case checklist closed; crash boundary tested. |
| **10** | Five-tester protocol complete (`[GDD] §15.4` Ph8 gate); balance pass 2 done with all targets green; performance budget met; zero-network runtime assert green; DoD signed; v1.0 tagged. |
| **11** | n/a — optional; each task defines its own entry condition and is excluded from v1.0 DoD. |

---

# Definition of Done — The Ashen Choir v1.0

The game is done when **all** of the following hold. Each is verifiable; each maps to tasks above.

1. **Determinism.** Same seed + same builds + same doctrine produce byte-identical fights on every device (`[GDD] §10.3`, T1.9, T9.6). All ten §10.9 bans enforced by tests.
2. **Balance truths.** All `[GDD] §15.3` targets green: no class >58% PvP; mirrors ~50%; fights 7–12 rounds average; zero fights >20 rounds; ±12% variance assert green across 10k seeds; every enemy ≥2 classes ≥55% and ≤35% for ≥2 classes; act bosses ≥40% correct-build clear; Ilvane ≥30% all classes (T2.2, T2.3, T2.7).
3. **Campaign complete.** 9 chapters, 21 duels, 9 choices, all 10 endings reachable with epilogue matched to tally; Unmake gate deterministic P≈1–3% and never without the lost-to-own-Echo condition (T6.2–T6.8).
4. **Economy honest.** XP walk lands every act band ≥97%; every faucet bounded (T2.5, T2.6); loss loop has no penalties and an opt-in assist (T6.10); the memory market's costs are real and disclosed (T6.12).
5. **Floor alive.** Async loop end-to-end offline; ≥12 Echoes always; recasts climb to ~1900; manual parity enforced (T7.2–T7.11).
6. **Readable everywhere.** All eight `§14` screens shipped; status chips/Wax Meter/Reading per `§11.5`; mobile 390px layouts pass; accessibility mode on (Phases 3 + 8).
7. **Persistence safe.** Versioned saves with migrations; corruption → salvage-or-export, never data loss; Echo/save codes hostile-input fuzzed with canonical rejections (T9.1–T9.4).
8. **Offline & light.** Zero external requests at any point (runtime-asserted); self-hosted assets ≈1.9 MB; OFL licenses bundled (T10.5).
9. **Playtested.** Five-tester protocol complete; red-line metrics cleared or owner-accepted; balance pass 2 applied and re-asserted (T10.2, T10.3).
10. **Canon intact.** Content inventory matches `[GDD] §16`; every amendment traceable to a recorded decision; no silent changes; assumption register A1–A12 re-verified (T0.1–T0.5, T4.12).

---

# Critical dependency graph (spine)

```
T0.1 decisions ──► T0.2 v1.0.1 spec ──► (everything content-shaped)
T0.3 schemas ─┐
T0.4 repo/CI ─┴─► T1.1 rng ─► T1.2 fighter ─► T1.3 status ─► T1.4 damage ─► T1.5 resolve ─► T1.6 turn ─► T1.7 fatigue/LastBell
                                                                                                            │
                                                    T1.8 rites ◄────────────────────────────────────────────┘
                                                                                                            │
                 T2.1 harness ◄── T1.9 bans/determinism ◄──────────────────────────────────────────────────┘
                    │
                    ├─► T2.2 core asserts ←(D7,D8)
                    ├─► T2.4 Reading sim ──────────────► T3.5 Reading panel ─┐
                    ├─► T2.5 XP fit ←(D1,D2)+T4.10                           │
                    ├─► T2.6 faucets ←(D13–D17)+T7.x                         │
                    └─► T2.7 pacing sheet ←T4.6/T4.7                         │
                                                                             ▼
T4.1 loaders ─► T4.2 classes ─► T4.3 verses ─► T4.4 vows ─► T4.5 items ─► T4.6 roster ─► T4.7 rites
   │                                                               │                        │
   │                                                               ▼                        │
   │                                              T5.1 build ─► T5.2 hymnal ─► T5.3 twin(D3)│
   │                                                   │                                    │
   │                                                   ▼                                    │
   │                                        T5.4 AI ─► T5.5 doctrines ─► T5.6 firewall      │
   │                                                   │                                    │
   │                                                   ▼                                    ▼
   │                                        T5.7 enemy scripts ◄────────────────────────────┘
   │                                                   │
   ▼                                                   ▼
T4.10 XP(D1) ─► T6.1 story model ─► T6.2 Act I ─► T6.3 Act II ─► T6.4 Act III ─► T6.7 endings ─► T6.15 post-campaign
                                        │             │              │             └► T6.8 Unmake ←(T7.4!)
                                        └► T6.5 choices ─► T6.6 reveal    └► T6.10 loss loop(D9) … T6.11 shrines, T6.12 vendor(D13), T6.13 objectives(D5), T6.14 Maren

T5.1+T4.8 ─► T7.1 codes ─► T7.2 Toll(D16) ─► T7.3 recasts ─┐
T5.4/T5.5 ──────────────────────► T7.4 floor modes ────────┼─► T7.5 hourly ─► T7.6 ledger ─► T7.7 Ward(D20)
T6.5 ──────────────────────────► T7.8 drops(D15) ─► T7.9 floor XP ─► T7.10 parity(D32) ─► T7.11 population

T3.1 tokens ─► T3.2 fonts ─► T3.3 duel UI ─► T3.4 wax ─► T3.6 tutorial ─► (playable slice)
T3.9 scene renderer ─► T8.2 chronicle; T8.1 creation(D21); T8.3 hymnal; T8.4 floor UI; T8.5 ledger UI;
T8.6 orrery+codex(D25); T8.7 chronicle-feedback(D18); T8.8 deeds(D19); T8.9 images; T8.10 responsive; T8.11 a11y; T8.12 tone

T9.1 save ─► T9.2 persist ─► T9.3 save-code ─► T9.4 security ─► T9.5 isolation ─► T9.6 corpus ─► T9.7 edges
ALL ─► T10.1 integration ─► T10.2 playtest ─► T10.3 balance2 ─► T10.4 perf ─► T10.5 offline audit ─► T10.6 release ─► T10.7 observation
Optional: T11.1 ladder · T11.2 NG+(D24) · T11.3 patches(D26) · T11.4 unmake sched(D27) · T11.5 measurement(D29) · T11.6 audio · T11.7 5th class(D28)
```

**Longest chain (critical path):** T0.1 → T0.3/T0.4 → T1.1–T1.9 → T2.1 → T4.1–T4.6 → T5.1/T5.4 → T6.1 → T6.2 → T6.3 → T6.4 → T6.7/T6.8 → T10.1 → T10.2 → T10.3 → T10.6. UI (T3.x) parallelizes with Phase 4; the Floor (T7.x) parallelizes with Acts II–III once T5.4 exists; assets (T8.9) parallelize with everything after T0.4.

**One known cross-phase hazard:** T6.8 (Unmake) consumes T7.4's own-Echo duel. Recommendation: pull the minimal own-Echo challenge path forward with Act III integration testing rather than reordering the phases.

---

# Unresolved decisions blocking implementation (owner checklist)

**RESOLVED 2026-10-18** — the owner delegated all calls; every verdict below was adopted as the recommended default (with the noted D24/D26/D28 deferrals) and is recorded, with rationale and reconciliations, in `docs/DECISIONS.md`. This table is now historical; consult DECISIONS.md as the live record. **Bold** = was on the critical fast path.

| Decision | Topic | Blocks (earliest) | Recommended default if delegated |
|---|---|---|---|
| **D7** | +2 enemy budget = "the practice of the dead" | T1.9, T2.3, T4.6, T4.12 | Approve `[02] R1` |
| **D8** | Fatigue doubling + The Last Bell | T1.7, T2.2 | Approve `[02] R2` |
| **D1** | Campaign targets L9/L10 (strike "finish at 7") | T4.10, T6.9, T2.5 | Adopt L9/L10 `[01] R2` |
| **D3** | Ch3-Devotion → the Twin Ledger | T5.3, T6.5 | Approve `[01] R4` |
| **D13** | Memory market = Blank Ledger + Unmake gate | T6.12, T6.8 | Approve `[03] R2` option A |
| D2 | Soft level-sync cap +3 | T6.9, T2.5 | Approve `[01] R3` |
| D9 | Loss loop: retries + Whisper + Dampened Bell | T6.10 | All three `[02] R3` |
| D4 | De-dup Ysolde/Gate rewards; grant Oren's Post | T4.4, T6.5 | Approve `[01] R5` |
| D10 | Mother Bell authored levers | T4.7, T2.7 | Levers `[02] R5` |
| D11 | Corvane counterbuild locked per run | T5.8 | Lock `[02] R6` |
| D12 | Bram 148 → 120 HP | T4.6, T10.3 | 120 pending telemetry |
| D14 | Vendor stock (3 market items) | T6.12 | Listed 3 |
| D15 | Unlived-path drop pool + Wax bank | T7.8 | Approve `[03] R3` |
| D16 | Toll decay + recasts now | T7.2, T7.3 | Ship now `[03] R4` |
| D17 | Vigil's Rest cost 2 | T4.3, T2.6 | Cost 2 `[03] R5` |
| D18 | Chronicle (full) | T8.7 | Full `[04] R2` |
| D19 | Deeds (all ten) | T8.8 | All ten |
| D20 | The Ward default-ON first chapter | T7.7 | Default ON then player-set |
| D21 | Creation presets | T8.1 | Ship presets |
| D22 | Vow suffixes (11) | T6.14 | Ship |
| D23 | Shame-line re-word | T3.7/T8.12 | Re-word |
| D24 | Second Verse NG+ (post-launch) | T11.2 | Ship as specced, post-launch |
| D25 | Codex ghosts + matrix | T8.6 | Ghosts + matrix |
| D26 | Recast patches philosophy | T11.3 | Adopt, cadence owner-set |
| D27 | Unmake 3-phase schedule | T10.6 flag, T11.4 | 3 phases |
| D28 | Fifth class | T11.7 | Re-decide post-launch |
| D29 | Measurement (counters+census+cohorts) | T2.8, T10.7 | All three |
| D30 | The Kept Name (Ch7-Ruthless reward) | T6.5 | Adopt |
| D31 | Pinned micro-numbers (heal 20%, Blade wording, Inheritance) | T4.5–T4.7, T5.7 | Confirm as provisional |
| D32 | Manual-parity policy | T7.10 | Adopt |
| N1 | Example Echo Code alloc fix | T7.1 | Fix example, keep validator |
| N2 | "Arena" → Choir Floor terminology | T0.2, T4.10 | Fix term |
| N3 | Reaper "fights in threes" = flavor | T4.6 | Flavor only |
| N4 | Pell verse-theft rule | T5.7 | Most-recent slotted verse, 100%, his stats |
| micro | Dominant-tally tie rule (epilogue) | T6.6 | Mercy > Devotion > Ruthless, recorded |
| micro | Unmake "Burn verses unlocked" reading | T6.8 | Unlocked (not cast) Burn-tagged verses < 3 |
| micro | Toll Elo floor | T7.2 | Floor 100, losses below pay 0 |
| micro | NG+ "dominant act" definition | T11.2 | Act with most re-bells, tie → Act III |

---

# Recommended implementation order (executive view)

1. **Week-zero block — decide and freeze.** Run the fast path **D7 → D8 → D1 → D3 → D13** (≈2 hours of owner time) plus the micro-gates; commit `DECISIONS.md`, the v1.0.1 spec, schemas, and the repo scaffold (T0.1–T0.5). Nothing else starts faster than this.
2. **Engine first, content second.** T1.1–T1.9 pure and headless; the ban suite (T1.9) lands before any content depends on it. In parallel: T3.1/T3.2 (tokens/fonts) and T8.9 (images) — the only long-lead non-code items.
3. **Harness before tuning.** T2.1/T2.2/T2.4 with fixture data; the Reading sim arrives early enough that every later design conversation happens with numbers on the table.
4. **First playable slice.** T3.3–T3.6 — Ashblade vs Bram playable. From here the project has a demo that proves the thesis; playtest cadence can start informally.
5. **Content data wave.** T4.1–T4.12 (the big transcription wave: 42 verses, 23 vows, 41 items, 21 fights, 8+4 Echoes). T4.12's CI gate closes the wave; then T2.3/T2.5/T2.6/T2.7 re-run on real data.
6. **AI and loadout.** T5.1–T5.8. The honesty firewall (T5.6) and enemy scripts (T5.7) are the quality gate for everything the Floor will later do.
7. **Campaign wave.** T6.1–T6.15 in act order, with choices/rewards (T6.5) wired early because every act consumes it. Loss loop (T6.10) lands with Act I so no tester ever meets the undefined-loss cliff.
8. **Floor wave.** T7.1–T7.11 — codes and AI exist by now, so the Floor is assembly, not invention. Pull T7.4's own-Echo duel forward for T6.8's gate testing.
9. **Screens wave.** T8.1–T8.12 — most logic exists; this is binding + polish + assets + accessibility.
10. **Hardening wave.** T9.1–T9.7 — persistence, security, corpus, edge sweep.
11. **Ship wave.** T10.1–T10.7 — integration marathon, five testers, balance pass 2, perf, offline audit, release. **Phase 11 stays untouched until v1.0 is out the door.**

**Major risks to manage throughout:** (a) determinism regressions — the corpus (T9.6) is the insurance and must never be bypassed; (b) Echo AI quality — the harness misuse detector is the early warning; (c) content-volume fatigue — data tables before prose, inventory CI as the scoreboard; (d) provisional-number sprawl — every `PROVISIONAL:D#` constant lives in one config until decided; (e) scope creep from Phase 11 — the release checklist (T10.6) explicitly verifies optional features stayed optional.

*End of TASKS.md. Build order, blockers, and canon mapping above; when a decision lands, mark it in `docs/DECISIONS.md`, flip the task's gate, and the roadmap does the rest.*
