# DECISIONS.md — The Ashen Choir: Decision Record

**Status:** ACTIVE · v1.0 · recorded 2026-10-18
**Authority:** The owner delegated full decision authority for this project on 2026-10-18 ("it's your game — you make the calls for any decision"). Every verdict below is recorded under that delegation. Any verdict may be overturned by a later dated entry appended to §9; until then it is binding on all implementation tasks.
**Source register:** `documentation/00_Design_Review_and_Change_Log.md` §0.4 (D1–D32), `TASKS.md` §0.1–§0.2 (N1–N4, micro-gates).
**Rule of effect:** a verdict tagged **APPROVED** is buildable now in the stated scope. **APPROVED (SPEC) / BUILD POST-LAUNCH** means the design is final and documented, but implementation waits for its Phase 11 entry condition. **PROVISIONAL** means the number is final unless telemetry/playtest contradicts it (then it is a one-line change at its single source).

---

## 1. The fast path (resolves every critical finding F1–F6, F12)

| # | Verdict | Rationale (short) | Unblocks |
|---|---|---|---|
| **D7** | **APPROVED** — the +2 edge is intentional. Canon formula: `budget(L) = 27 (class base) + 4 (creation) + 2 (the practice of the dead) + 2 × (L−1)` = **33 + 2(L−1)** (N5). Mother Bell carries a declared +4 hybrid override, like its HP override. Zero sheet edits. | All 19 statrows already conform; naming the edge protects the feel (enemies punch at weight-class+1) and makes the doc tell the truth. | T1.9, T2.3, T4.6, T4.12 |
| **D8** | **APPROVED** — one Fatigue schedule: telegraph `TOLL IN 3/2/1` on r13–15; true damage **2/4/8/16/32** on r16–20 (cumulative 62); at end of r20 **THE LAST BELL** — higher HP% wins, exact ties → defender, report marks `LAST BELL`. The linear "+2/round" sentence is struck. | Round-20 assert becomes true by construction; the last three rounds become the mandatory decision point the telegraph promises. | T1.7, T2.2 |
| **D1** | **APPROVED** — the campaign delivers **L9** by the Bellmouth; the finale crosses into **L10**. The §13 sentence "tuned to finish around level 7" is struck. | The act table, the roster (L9–L10 enemies in Act III) and the 9-chapter XP walk (01 R1) all agree; only the stale sentence disagreed. | T4.10, T6.9, T2.5 |
| **D3** | **APPROVED** — Ch3 Devotion grants **the Twin Ledger**: a second saved loadout, swappable free at shrines and pre-fight, Floor-compatible after the ending. It is never a reshaping discount (reshaping is already free). | Pays Devotion in *flexibility*, the option's stated fantasy; stays valuable all run including the Floor. | T5.3, T6.5 |
| **D13** | **APPROVED — option A, the Blank Ledger.** Memories = the nine chapter choices; 1 memory per purchase; selling marks the choice *—sold—* in the Orrery, keeps tally contributions and rewards, and **closes the Unmake path for that run**. Never restocks. Pell warns once, in fiction. | The game's one sink that *means* something: a stat line weighed against a page of your own epilogue. Self-balancing, ~zero code. | T6.12, T6.8 |

---

## 2. Full decision register — verdicts

| # | Topic | Verdict | Notes |
|---|---|---|---|
| D1 | Campaign level target | **APPROVED** — L9/L10 (§1) | Strike §13 "finish at 7" |
| D2 | Over-level handling | **APPROVED** — soft level-sync | +1 stat / +4% HP per level over band, cap 3; over-levelled chapters pay 25% XP and advance Floor pity +1; "better gear" line struck (contradicted fixed loot) |
| D3 | Ch3-Devotion reward | **APPROVED** — Twin Ledger (§1) | |
| D4 | Duplicates + bare paths | **APPROVED** — cut **Ysolde's Vow relic row** (§8.3) and **Keeper's Ring vow row** (§7.2); keep the story vow (unified name: **Ysolde's Vow**) and the relic (**Vigil's Ring**); grant **Oren's Post** (while Braced, cannot be Stunned) to Ch8-Mercy | Item count reconciles 41 → **40**; see §6 |
| D5 | Tallies of the City | **APPROVED** — all 9 objectives | +5 XP, one deed, one Maren line each; max +45 XP/run |
| D6 | L7 shrine inscriptions | **APPROVED** — add | One data row per class |
| D7 | The +2 budget edge | **APPROVED** (§1) | |
| D8 | Fatigue + The Last Bell | **APPROVED** (§1) | |
| D9 | Loss loop depth | **APPROVED — all three:** infinite free retries (the "one per chapter" limit is struck); **Maren's Whisper** at loss 3 (axis) and loss 4 (slot swap); **Dampened Bell** assist offered at loss 4 (−15% enemy dmg/HP, profile-marked `dampened`, never pushed, disables nothing, Echo sheets exported at full stats so the Floor stays level) | If any loss penalty is ever added, the Whisper system is deleted — they are substitutes |
| D10 | Mother Bell wall | **APPROVED — authored levers:** while molten, reflect income doubles (Warden path); Curse+Fray held simultaneously forces a one-round cool window (Cantor path). DoT classes remain the easiest intended clear | |
| D11 | Corvane retry semantics | **APPROVED — lock:** counterbuild seeded from the player's build string at chapter start, locked for the run; first loss reveals the axis and the counter-table row that fired | Kills the re-roll exploit |
| D12 | Bram HP | **APPROVED — 120** (`PROVISIONAL:D12`) | Revisit on Phase-10 first-attempt telemetry; he must teach the candle, not spend it |
| D13 | Memory market | **APPROVED — Blank Ledger** (§1) | |
| D14 | Vendor stock | **APPROVED — the 3 listed market items:** Choir-Scale Blade, Reliquary Lantern, Hourglass of Ash | All already market-sourced in §8 |
| D15 | Floor drop pool | **APPROVED — the unlived-path pool:** choice-items from paths not taken (×2 class-affinity weighting), then the 2 Floor-native items; pity 30 shared, reset on drop; dry pool → +1 **Wax bank** per win, 30 banked = first drop of the next content tier | One source of truth with the Codex ghost list |
| D16 | Toll decay + recasts | **APPROVED — ship in v1.0:** repeat wins ±2 flat; NPC losses ×0.5; imported Echoes full Elo both ways; **recasts** (rating >150 below your Toll → +1 level, one counter-verse, re-anchor at your Toll −100, new history line, ≤3 each, level cap 10 binds — recasts stop at L10) | Ladder depth to ~1900 with zero new assets |
| D17 | Vigil's Rest | **APPROVED — cost 2** (effect unchanged, CD 3) | Required for the "no net-positive Resolve loops" assert to pass |
| D18 | The Chronicle | **APPROVED — full** | Biography + calibration line + re-bell framing |
| D19 | Deeds | **APPROVED — all ten** | Diegetic, no toasts, no mechanics |
| D20 | The Ward | **APPROVED — default ON** for the first chapter after binding, then player-set, never pushed | Decline >+300; overnight NPC losses halved, night-capped at −15 |
| D21 | Creation presets | **APPROVED — ship the four named presets** | Fully editable; respec promise stated on-screen |
| D22 | Vow suffixes | **APPROVED — ship 11** | One suffix per story vow, global, appended once |
| D23 | Shame line | **APPROVED — re-word** to *"You were favored and lost. The Reading knows why — open it."* | Same truth, routes to the fix |
| D24 | The Second Verse (NG+) | **APPROVED (SPEC) / BUILD POST-LAUNCH** — spec final ([05] R1 + §4.6 of v1.0.1); implementation is **T11.2**, out of the v1.0 release | NG+ "dominant act" = the act with the most re-bells, tie → Act III (§4 below) |
| D25 | The Echo Codex | **APPROVED — ghosts + matrix, ships in v1.0** (T8.6) | Five tabs; no progress bars, no percentages, no prompts; ghosts and the drop pool share one source of truth |
| D26 | Recast patches | **APPROVED (philosophy) / BUILD POST-LAUNCH** — patches are recastings; changelogs as ledger prose; cadence owner-set (T11.3) | |
| D27 | Unmake discoverability | **APPROVED — 3-phase schedule**; phase-1 flag (sealed) ships in v1.0 at T10.6; phases 2–3 are T11.4, post-launch | |
| D28 | Fifth class | **DEFERRED — re-decide post-launch;** the requirements list ([05] R8) is the gate any proposal must pass | Explicitly out of v1.0 scope |
| D29 | Measurement | **APPROVED — all three:** opt-in local counters (off by default, v1.0), save-code census (inherent to public codes), cohort playtests (post-launch process, T11.5 expansion) | Zero tracking; the game never phones home |
| D30 | The Kept Name (Ch7-Ruthless) | **APPROVED — adopt as a story vow:** "The first debuff you apply each fight costs 1 less Resolve." | Vow count reconciles to **24**; see §6 |
| D31 | Pinned micro-numbers | **APPROVED — confirmed as provisional:** Ilvane Phase II heals **20%** of damage dealt `[A4]`; Corvane's Blade wording = ×1.6, ×1.8 below 50% HP, ×2.0 below 25%; Choristers' Inheritance = debuffs carry at current potency, durations refreshed to 2, Bleed cap 5 as normal | Single-source constants; one-line changes |
| D32 | Manual-parity policy | **APPROVED:** manual play is always reward-parity or better than offline resolution — same XP table, same drop roll, same Toll math | Applies to hourly challengers and every future reward |

---

## 3. Audit clarifications (N1–N4)

| # | Verdict |
|---|---|
| **N1** | The §12.6 example Echo Code violates its own validator (alloc sums 18 > 16 at L7). **Fix the example to sum 16 — `{vig:3, mig:0, wit:9, grd:1, hst:3}` — and do NOT loosen the validator.** |
| **N2** | One term everywhere: **Choir Floor**. The §13 "arena" sentences are corrected in v1.0.1. |
| **N3** | The Reaper of the Silt "fights in threes" is **flavor, not mechanics** — a single build with a single HP line (§9.1 #4). A parenthetical note is added in §3; no sequential spec. |
| **N4** | Pell's **Ledger's Ward**: steals the **most recent slotted verse you cast**, casts it **once, immediately, at 100% coefficient with Pell's own stats**, then it goes on his normal cooldown. The Ch3 prose ("removes one of your verses' cooldowns for two turns") is re-worded to match. |
| **N5** | *(Found by the T0.3 schema validator on first run.)* The review corpus's harness-assert paste-block says `budget(L) = 35 + 2(L−1)`; the true constant is **33** — `budget(L) = 27 (base) + 4 (creation) + 2 (practice) + 2×(L−1)` — which every canon row conforms to (Bram 33 at L1, Ilvane 51 at L10). Ruled: **33 + 2(L−1)** everywhere (v1.0.1 §9 note and §15.3 assert); the corpus docs stay frozen as inputs, this file and v1.0.1 carry the correction. |

---

## 4. Micro-gates

| Gate | Verdict |
|---|---|
| Dominant-tally tie (epilogue filtering) | **Mercy > Devotion > Ruthless**, tie recorded in the save |
| Unmake "Burn verses" reading | **Unlocked** (not cast) Burn-tagged verses < 3 |
| Toll Elo floor | **100**; losses below the floor pay 0 |
| NG+ "dominant act" (D24) | The act with the most re-bells; tie → Act III |

---

## 5. Assumption register (A1–A12) — ratified

All twelve assumptions in `documentation/00` §0.5 are **ratified as working truth** for implementation (A1 act-table levels; A2 Ch1 item mapping Ruthless→Mace, Mercy→Shroud, Devotion→Shovel; A3 boss-role XP slots; A4 heal 20%; A5 Bram 120 target; A6 Mother Bell hybrid override; A7 Floor pays at parity; A8 Ash Inheritance = 1 mark, 2 if Unmake; A9 recasts keep the authored weakness; A10 the 3 vendor items; A11 story-vow canon per §6 below; A12 patch cadence owner-set, data-file only). Corrections move numbers, never designs; each is re-verified at the task that consumes it.

---

## 6. Reconciliation arithmetic (forced by D4 + D30 together)

- **Vows:** §7.2's story table held 11 rows. D4 removes *Keeper's Ring* (−1); D4 grants *Oren's Post* (+1); D30 grants *The Kept Name* (+1) → **12 story vows**. Total = **24 vows (12 class + 12 story)**. This supersedes finding F25's snapshot count of 23; every count site in v1.0.1 (header, §7.2, §16, Appendix B, §17) is updated to 24, and the content-inventory tracker (T0.5) targets 24.
- **Items:** D4 deletes the duplicate *Ysolde's Vow* relic row → **40 items (13 + 13 + 14)**. Every count site updated to 40; tracker targets 40.
- **Shrines:** F24 → **ten shrines** (nine chapter shrines and the crypt's hidden tenth).

---

## 7. Engineering clarifications (delegated calls within TASKS.md execution)

| # | Call |
|---|---|
| ENG-1 | Schema location: top-level **`data/schemas/`** (matching the [GDD] §15 module layout), not `src/data/schemas/` — TASKS.md T0.3's path was the outlier. |
| ENG-2 | Toolchain: **zero runtime dependencies**; tests via the Node built-in runner (`npm test` = `node --test tests/`); no `npm ci` lockfile step is required while the dependency count is zero. |
| ENG-3 | Default branch: **`main`**. Every work session ("call") ends with a commit + push to `github.com/ahmed-m-elgammal/game-101`. |
| ENG-4 | CI gate order: purity/network bans → unit tests → schema validation → amendment audit → content inventory (advisory until Phase 6, blocking at Phase 10). |
| ENG-5 | `PROVISIONAL:D#` constants live in exactly one file (`data/config.js` when Phase 1 starts) until their telemetry verdict lands. |
| ENG-7 | **Engine silent mode (T2.1/T2.4):** `createSession(..., { silent: true })` disables log-line allocation for harness-scale runs. Logging never feeds back into the math; byte-identical results with/without are asserted in the Phase-2 suite. |
| ENG-8 | **Harness fixture thresholds (T2.2):** the anti-lock bounds are harness-side assert constants, not canon — stun-skip ≤ 40% of victim turns (mechanistic ceiling ≈ 33% under the two-turn re-lock rule), hush-starved victim still casts ≥ 20% non-Strike verses, sustain/turtle builds ≤ 58% (the §15.3 PvP cap itself), zero-damage stall ≤ 35%. Status lean-win/lean-loss existence judged at ≥55% / ≤45%. All recorded here so they are never silent. |

---

## 8. Deferred register (explicitly out of the v1.0 release)

| Item | Entry condition |
|---|---|
| D24 — The Second Verse (T11.2) | v1.0 shipped + T10.7 baseline recorded |
| D26 — Recast patches (T11.3) | v1.0 shipped; cadence owner-set |
| D27 phases 2–3 (T11.4) | Month 2 / month 3 post-launch |
| D28 — Fifth class (T11.7) | Post-launch re-decision against the [05] R8 requirements list |
| D29 expansion (T11.5) | Post-launch cohort program |
| T11.1 shared ladder, T11.6 audio | Owner call; everything works without them |

---

## 9. Amendment log (append-only)

| Date | Entry |
|---|---|
| 2026-10-18 | Initial record: D1–D32, N1–N4, 4 micro-gates, A1–A12 ratified, reconciliations (24 vows / 40 items / 10 shrines), ENG-1–5. Owner delegation noted in the header. |
| 2026-10-18 | **N5** recorded: budget constant corrected 35 → **33** (`33 + 2(L−1)`); caught by the T0.3 schema validator's first run (the enemy-conformance rule did its job before Phase 1 even exists). v1.0.1 §9 + §15.3 corrected; Phase-0 execution completed (T0.1–T0.5). |
| 2026-10-18 | **N6** recorded (Phase 1, T1.9): Ban 1's "total fight damage variance ≤ ±12%" is **unsatisfiable as a max−min reading** — measured 55% max−min spread per fight-length across 10k seeds, dominated by overkill and kill-timing, not by the bounded randomness. **Ruled metric (per-length σ reading):** for contested fights (≥6 rounds, n≥50 per bucket) the per-length standard deviation stays ≤ 12% of mean (measured ≤ 3.7%); the structural bounds — Fortune hard-band [0.88, 1.12] every fight, zero fights > 20 rounds — are asserted separately and hold exactly. Short fights (≤5 rounds) measure σ ≈ 12.3%; logged for Phase-10 telemetry. Also records the L1-Ashblade "MIG 12" example reconciliation (cap-10 makes MIG 10 the max at L1; 108-HP assert holds with HST/VIG creation). |
| 2026-10-18 | **ENG-6** recorded: verse data rows aligned to the frozen T0.3 schema (field names `cls` / `unlockLevel` / `cd: 0` for "none"); op-code vocabulary extended additively with `selfTrue` (Fan the Flames self-damage); Phase-0 schema otherwise untouched and CI-enforced. |
| 2026-10-18 | **N7** recorded (Phase 2, first matrix runs — the harness's reason to exist). The published §15.3 targets are NOT met by fixture content in three places, measured and frozen: **(a) class-dominance** — standard-profile matrix (L1/3/5/7/9/10, n=200) gives Ashblade **90.2%** overall (cap 58%), Cinder Witch 76.3%, Hollow Cantor 24.4%, Gravewarden 9.1%; the canon counter-web expects Cinder > Ashblade, but the bleed engine out-races burn and ignores mitigation. **(b) zero-damage stall** — a utility-only Gravewarden (Strike fallback only) beats Cantor aggressive **75.0%** at L5 (n=2000) by winning the Last Bell HP race: Cantor damage cannot crack Brace + Ward mitigation. **(c) heal-sustain** — a Long Dark mason measures **64.3%** vs Ashblade aggressive (cap 58%). Everything else §15.3 promises holds today: mirrors 52.4% (band 47–53), fights avg 8.9 rounds (band 7–12), zero fights > 20, Last-Bell 2.08% (≤ 5%), per-length σ ≤ 7.5% (≤ 12%, N6 metric), Fortune clamp exact. **Ruling:** the three failing rows stay ENCODED as live asserts and run as declared KNOWN-GAP advisories (`KNOWN_GAPS` in `harness/asserts.js`); no canon constant was retuned to pass. Promotion back to hard gates happens at the Phase-4 content/tuning wave (**T4.12**) — the debt is visible, tracked, and dated. Harness fixture thresholds recorded as ENG-8; engine silent mode as ENG-7. |
| 2026-10-18 | **N8 recorded — Phases 0–2 re-test wave** (1,078 new tests across 7 suites; full suite 1,145/1,145 green; bans/amendment/inventory gates green). Nine confirmed bugs found and fixed, each traced to canon or a recorded call, none a silent retune: **(1) vow source-routing (F-STATUS-1)** — Red Tide's "+1 Bleed tick", Kindling's "+1 Resolve on YOUR Burn tick", and Silence's "Hush −3" were read from the VICTIM's vow mods instead of the APPLIER's; all three vows were no-ops in practice. Fixed by storing the source's values on the status at application time (bleed `{tickBonus}`, burn `{kindling, srcSide}`, hush `{mod}`) and routing the Kindling resolve event to the source fighter — matching [GDD] §7.1 vow texts verbatim. **(2) F-STATUS-2**: `tuning.statusTurns.bleed` was dead config (hardcoded 3 in `applyBleed`) — wired through; canon default unchanged. **(3) F-STATUS-3**: `chips()` passed the whole status board to the stun-turn helper → `NaN` chip turns; fixed. **(4) F-DAMAGE-1**: the crit threshold `critChance × 100` suffered float inflation (0.05+0.02 → 7.000…001) so every affected crit chance ran one percentage point hot (7% rolled 8%, 12% → 13%, 15% → 16%); fixed with `Math.round` to the whole percent Band(100) speaks in. **(5) F-FIGHT-1**: Ilvane's LEARNED verse was accepted by `submitChoice` and the AI pool but missing from the exported `legalVerses` (the manual UI's source); appended. **(6) F-FIGHT-2**: `submitChoice` with an unknown verse id crashed the engine (`getVerse` throw) instead of the structured `{ok:false}` every other invalid input returns; guarded. **(7) F-FIGHT-3**: Ilvane learn tie-break — the header recorded "earliest first-cast of the tied" but the code implemented loadout order; first-cast rounds are now tracked and the recorded rule implemented (loadout order remains the final determinism anchor). **(8) F-PRESET-1**: `mirrorPreset` slotted verses above their unlock level at L1–L4 (an L1 ashblade carried red_flurry, unlock 5) — illegal loadouts skewing the roster's L1 probes; unlock-legality backfill added (L5+ unchanged). **(9) F-VALID-1 / F-CACHE-1/2**: the T0.3 validator crashed on rows missing `alloc`/`verses`/`gear` instead of rejecting them; `diffTuning(undefined)` and the tuning-less Reading path crashed; all three hardened to the documented contracts. **Balance deltas from the vow fixes (measured, full gate)**: Ashblade 90.2% → **91.1%** (Red Tide tick now live — N7 class-dominance debt slightly deeper); heal-sustain 64.3% → **59.0%** (bleed pressure cracks the turtle — now at the 58% boundary, still advisory: promotion stays a T4.12 call); zero-damage 75.0% → **72.5%**; fight length 8.9 → **8.77**; mirrors 52.9%; σ 7.43%. No canon constant retuned; N7 rows remain encoded advisories. Also hardened the sync transform (per-file path fixes — a latent global-application bug my sim.js change exposed) and pinned documented engine quirks (negative weights, empty Measure tables, fnv1a misuse, AI-scorer heuristics pending T5.4) as explicit regression pins. |

*Nothing in this file invents content: every verdict adopts a specced proposal from the review corpus or a default already named in `TASKS.md`. The canon design document, as amended by `THE-ASHEN-CHOIR-v1.0.1.md`, remains the single source of design truth.*
| 2026-10-18 | **ENG-9 + N9 recorded (Phase 3, T3.6).** **ENG-9 — scripted opener hook:** enemies may carry a deterministic `script` queue consumed one entry per AI turn; a trailing `*` marks a repeating doctrine verse ("cast whenever legal"). The hook can never make the AI cast an illegal verse (illegal entries drop to the scorer; the §10.9 bans hold under scripting). Bram ships `['sepulchral_spikes', 'hold_the_line*']` — §9.1's "Sepulchral Spikes on turn 1. Then Brace and outlast." The full doctrine/scripting engine remains **T5.7** and supersedes this hook. **N9 — the tutorial hand-sim band does not survive contact:** [02] §6.2 predicted ~8–12 rounds for the Bram tutorial (at 120 HP post-D12); the implemented engine measures **5.3 average** over a 30-seed sweep with the canon example build (§5.8/§10.8's own "Ashblade · Red Tide · Rend / Opening Cut / Flay / Drink Deep"). Cause traced, not tuned: the hand-sim predates the cap-10 reconciliation (it budgeted MIG 12 → Rend 15.8 raw) and under-counted Flay's stack accumulation; Bram DOES execute his doctrine (braces in 30/30 measured fights, direct hits land at 5–9 through the wall), but Red Tide bleed — canon-exact per §5.4/§5.5 (stacks × (2 + 0.18 × source MIG), Red Tide's +1 tick now live per N8) — reaches ~29 true/turn by round 5 and melts the 120-HP wall. The engine matches canon §5.4/§5.5 exactly; the DISCREPANCY is between the review corpus's hand arithmetic and the implemented rules, the same class of finding as N7. **Ruling:** no constant retuned (D12's 120 HP stays PROVISIONAL pending Phase-10 telemetry; the bleed formula is verbatim canon); the tutorial-length debt is numbered, pinned as a regression band in tests/phase3-ui.test.js (measured 5.3, pinned 4–8), and routed to **T4.12** alongside N7 — the tuning wave decides whether Bram's HP/kit grows (a data row change) or the band is re-declared. The tutorial still teaches the verbs: Brace demonstrably halves incoming steel, Ward demonstrably absorbs, and the loss path is a free Re-bell. |
