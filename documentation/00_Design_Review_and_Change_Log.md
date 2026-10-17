# 00 — Design Review & Change Log

**The Ashen Choir — v1.0 Systems Review by the Systems Design Desk**
**Reviewed against:** `THE-ASHEN-CHOIR-v1.md` (ship candidate) · **Review date:** 2026-10-17 · **Reviewer scope:** rewards/levels/quests/unlocks, difficulty & pacing, economy, feedback & motivation, retention & replayability.

| | |
|---|---|
| **Status of everything below** | Analysis and proposals only. Nothing is canon until you approve it. Per your rules: no implementation, no silent changes, all assumptions labeled. |
| **The five systems documents** | `01_Rewards_Levels_Quests_and_Unlocks.md` · `02_Difficulty_Curves_and_Progression_Pacing.md` · `03_Game_Economy_Currencies_and_Resources.md` · `04_Feedback_Loops_and_Player_Motivation.md` · `05_Retention_and_Replayability.md` |

---

## 0.1 Executive summary

**The verdict first:** The Ashen Choir v1.0 is a genuinely coherent design. The four pillars are load-bearing in the mechanics, not just in the prose: Bounded Roll makes "you can only blame a build" *true*; the vow/gear layer is genuinely load-bearing at the final boss; the Reading panel converts balance math into player trust; and the Echo-as-you conceit turns async PvP into the campaign's meaning rather than its appendix. The writing discipline (fixed loot, no random stats, published seeds, recorded re-bells) is better than most shipped games manage. **Nothing here recommends tearing anything down.**

What the review found instead is that v1.0 is a masterpiece of *systems* with a handful of *gaps* — six of them critical, all of them definitional rather than architectural:

1. **The XP economy does not exist** (thresholds without sources — the one unbuildable system).
2. **The campaign's target level contradicts itself** (§3 says L9–10 at the Bellmouth; §13 says "finishes around level 7").
3. **Fatigue contradicts itself** (linear growth *and* doubling in the same section) and the round-20 assert has no mechanism.
4. **Enemy builds violate their own stated budget by exactly +2, on all 19 stattable rows** — almost certainly an undocumented intentional edge, but currently a lie in the doc.
5. **The one shop's currency ("memories") has no defined cost**, and the Floor's drop pool is undefined.
6. **Losing a campaign fight is undefined** beyond the first free retry.

Around those: two double-granted rewards (Ysolde's Vow; the Gate ring), one reward that grants nothing (Ch3 Devotion, whose "free verse swap" is already free under §13), two choice paths with no mechanical reward at all (Ch8-Mercy, Ch7-Ruthless), an act boss that silently strands two of four classes (Mother Bell), a counter-pick fight whose retry behavior would be farmable, a common verse that flattens loadout diversity (Vigil's Rest), a rating ceiling at 1400 with no endgame above it, and no NG+ despite §17 calling replays the intended model.

**The review's shape:** 34 findings (§0.3), 30 proposals across the five docs (§0.4), 29 decisions awaiting you (§0.5), 12 standing assumptions (§0.6). The recommendations deliberately bias toward *specifying what v1.0 already believes* over adding new systems: the three genuinely new structures proposed (the Twin Ledger, the unlived-path drop pool, the Second Verse) are all re-expressions of mechanics and themes the document already contains.

**Read the docs in this order:** 00 (you are here) → 02 (the combat math and its two critical fixes) → 01 (the XP economy that makes the act table true) → 03 (the two economy specs) → 04 → 05. Cross-references are dense but every doc is self-contained.

---

## 0.2 Findings register

Severity: **C** blocks ship · **H** damages the experience · **M** visible roughness · **L** polish. "Resolution" names the doc/section that specs the fix.

| ID | Finding | Sev | Evidence | Resolution | Status |
|----|---------|-----|----------|------------|--------|
| F1 | Enemy budget formula off by exactly +2 on **all 19** statrows (e.g., Bram 33 vs 31; Oren 49 vs 47; Ilvane 51 vs 49; Mother Bell +4 as a declared hybrid override) | C | §9 formula vs §9 tables, audited row-by-row (02 §6.1) | 02 R1 — declare it intentional: `budget(L) = 27 + 6 (the practice of the dead) + 2(L−1)` | `[CLARIFICATION → D7]` |
| F2 | Fatigue: "grows by 2 each round" *and* "doubles from round 16" in the same section; the harness's "no fight exceeds 20 rounds" assert has no mechanism (linear Fatigue doesn't guarantee it) | C | §5.6 vs §10.9-10, §15.3 | 02 R2 — one doubling schedule (2/4/8/16/32) + **The Last Bell** at end of r20 (higher HP% wins) | `[PROPOSAL → D8]` |
| F3 | XP thresholds exist; **zero XP sources defined** anywhere | C | §13 vs whole doc | 01 R1 — full economy (`10+4L` × role, chapter +10, Floor with per-opponent decay), with a 9-chapter walk that lands every act band | `[PROPOSAL]` |
| F4 | Campaign level target: §3 act table (Ch9 = L9–10, L10 enemies) vs §13 "tuned to finish around level 7" | C | §3.0 table vs §13 line | 01 R2 — strike the §13 sentence; campaign delivers L9, finale crosses into L10 | `[PROPOSAL → D1]` |
| F5 | "Over-level → fights get harder *and* drop better gear" contradicts §8.4 fixed loot (no "better drops" can exist) and punishes engaging with the Floor mid-campaign | H | §3.0 vs §8.4 | 01 R3 — soft level-sync (+1 stat/+4% HP per level over band, cap 3), 25% XP, +1 pity advance; "better gear" struck | `[PROPOSAL → D2]` |
| F6 | Ch3 Devotion reward ("free verse swap at any shrine") is worthless — §13 already makes all reshaping free everywhere | H | §3 Ch3 choice vs §13 | 01 R4 — **the Twin Ledger** (second saved loadout, Floor-compatible) | `[PROPOSAL → D3]` |
| F7 | Ysolde's Vow exists twice: story vow (§7.2, "Ninth Sister's Vow") and relic (§8.3), same source, same effect | M | §7.2 vs §8.3 vs Ch4 prose | 01 R5 — keep the vow, cut the relic, unify the name | `[PROPOSAL → D4]` |
| F8 | Ch8 Ruthless reward exists twice: relic **Vigil's Ring** (§8.3) and story vow **Keeper's Ring** (§7.2), identical effect, same choice | M | §7.2 vs §8.3 vs Ch8 prose | 01 R5 — keep the relic (matches prose), cut the vow | `[PROPOSAL → D4]` |
| F9 | Ch8 **Mercy** path ("send her up first") grants no mechanical reward | M | Ch8 choice + tables | 01 R5 — **Oren's Post** (while Braced, cannot be Stunned) | `[PROPOSAL → D4]` |
| F10 | Ch7 **Ruthless** path ("take the name and keep it") grants no mechanical reward | M | Ch7 choice + tables | 00 — **The Kept Name** (first debuff applied each fight costs 1 less Resolve) | `[PROPOSAL → D30]` |
| F11 | Campaign loss rules undefined beyond 1 free Re-bell; no fail state, no escalation, no assist | C | §10.11 only | 02 R3 — infinite free retries; **Maren's Whisper** hints at loss 3; **Dampened Bell** assist (−15% enemy dmg/HP, profile-marked, PvP-safe) offered at loss 4 | `[PROPOSAL → D9]` |
| F12 | Vendor's "memories" have no defined cost, source, or effect — the game's only sink is unimplementable as written | C | §8.4 | 03 R2 — memories = the nine chapter choices; selling marks *—sold—* in the Orrery, keeps rewards and tallies, **closes Unmake for the run**; never restocks | `[PROPOSAL → D13]` |
| F13 | Floor drop pool undefined (12%/pity-30 rolls against *what*?) | H | §8.4 vs §8 tables | 03 R3 — **the unlived-path pool** (choice-items from paths not taken, ×2 class-affinity weighting, then the 2 Floor-native items; dry-pool → Wax bank) | `[PROPOSAL → D15]` |
| F14 | Drowned Mantle source "Ch3 — Choir Floor" ambiguous (fixed? rolled?) | L | §8.2 | 03 R6 — guaranteed first-Floor-win drop | `[CLARIFICATION]` |
| F15 | Toll has no opponents above 1400 and no repeat-opponent decay — the rating becomes a time measurement | H | §12.4 vs §9.4 | 03 R4 — repeat wins ±2; NPC losses halved; **recasts** (named Echoes re-anchor at your Toll −100, three tiers each, ladder depth to ~1900) | `[PROPOSAL → D16]` |
| F16 | Vigil's Rest (1 cost → +4 Resolve + cleanse, CD 3) is a net +3 economy outlier that auto-slots in every loadout | M | §6.1 vs all class verses | 03 R5 — cost 2 (net +2, still the best economy verse, no longer above class-verse value) | `[PROPOSAL → D17]` |
| F17 | Mother Bell is an undeclared second "one-axis" wall: molten-phase −50% direct damage strands Gravewarden (reflect income too low) and Hollow Cantor (no true damage) | H | §9.2 vs §9.5 rules 2–3 | 02 R5 — authored levers: Thorns-reflect income doubles while molten (Warden); Curse+Fray forces a one-round cool window (Cantor). DoT classes still clear easiest | `[PROPOSAL → D10]` |
| F18 | Corvane's counterbuild retry behavior undefined — re-pick on Re-bell is farmable, lock is a wall for hard-countered builds | H | §9.2 counter table, §10.11 | 02 R6 — counterbuild locked per run (seeded at chapter start); first loss reveals the counter-table row that fired | `[PROPOSAL → D11]` |
| F19 | Bram is "the gentlest possible introduction" while being the highest-HP L1 entity (148) — hand-sim shows the candle is mandatory most runs | M | §9.1 vs §5 math (02 §6.2) | 02 R7c — 148 → 120 HP, pending Phase-8 first-attempt telemetry | `[PROPOSAL → D12]` |
| F20 | "The Pale Cantor, First Movement" (Ilvane's recording) referred to as "she" | L | §9.3 | 02 R7a — "It repeats the exact same opening every time." | `[CLARIFICATION]` |
| F21 | Ilvane Phase III "the verse you have cast most often" — undefined whether Strike counts (if yes, Phase III trivially copies Strike) | L | §9.3 | 02 R7b — "most-cast **slotted** verse; Strike is never copied" | `[CLARIFICATION]` |
| F22 | The Turned Pour ally bell (Ch9) has no combat sheet | M | Ch6 choice vs §9 | 02 R7d — one-row sheet (L8 Warden chassis, 140 HP, Thorns 6, un-Curseable) | `[PROPOSAL]` |
| F23 | Ilvane Phase II "heals for a percentage of damage dealt" — percentage unspecified | M | §9.3 | 02 R4 — pinned at 20% `[ASSUMPTION]`, becomes a pacing-sheet column | `[ASSUMPTION → D31]` |
| F24 | Shrine count: "Twelve shrines across the campaign (one per chapter, plus a hidden one)" = 10, not 12 | L | §13 | 00 — "Ten shrines: nine chapter shrines and the crypt's hidden tenth." | `[CLARIFICATION]` |
| F25 | Vow totals disagree: §7.2 says 23 (12+11); Appendix B says "22, including 10 earned from story"; §16 says 11 story | L | §7.2 vs App B vs §16 | 00 — canon = **23 (12 class + 11 story)** per §7.2's own table; Appendix B and §16 corrected | `[CLARIFICATION]` |
| F26 | Ch1 "All three paths also grant the item" — which item is only implied by §8.1 sources | L | Ch1 prose vs §8.1 | 01 R9 — calendar spells it out: Ruthless→Mace, Mercy→Shroud, Devotion→Grave-Shovel of Bram | `[CLARIFICATION]` |
| F27 | Echo Code v2 schema field `"talley"` | L | §12.6 | 03 R8 — `"tally"`, before anyone hand-writes a parser | `[CLARIFICATION]` |
| F28 | Corvane's Blade mark wording ("Crits deal ×1.6, and +20% more the lower your HP") — ambiguous stack base | L | §8.1 | 00 — "Crits deal ×1.6; below 50% HP this becomes ×1.8, below 25% ×2.0." `[PROVISIONAL]` | `[CLARIFICATION → D31]` |
| F29 | Post-campaign reward ceiling: L10 + full pool + only Toll moving; no second mountain | H | §13/§12 vs §4.5 | 05 R1/R3/R4 — **Second Verse** NG+, the Second Choir (Codex / recast ladder / recast patches), the Echo Codex | `[PROPOSAL → D24/D25]` |
| F30 | NG+ recommended by §17 open decision 2, designed nowhere | H | §17 | 05 R1 — the Vigil Who Came Before + Ash Inheritance | `[PROPOSAL → D24]` |
| F31 | Overnight losses are outside the player's control and unbounded in framing ("Toll −11 while you slept") | H | §12.5 | 04 R4 — **Ledger, not ladder**: agent-voiced loss lines, the Ward (decline >+300), overnight NPC losses halved and night-capped | `[PROPOSAL → D20]` |
| F32 | Hourly challenger loop quietly assumes a cadence; the owner's rhythm call is mixed/no-cadence | M | §12.5 vs brief | 04 R6 — **manual-parity rule**: manual play always reward-parity or better | `[PROPOSAL → D32]` |
| F33 | Creation asks for a build-defining vow + 4 points before any play context | M | §14.1 | 04 R5 — four named presets ("The four shapes of the Vigil"), fully editable, respec promised on-screen | `[PROPOSAL → D21]` |
| F34 | Choristers' "Inheritance" verb (statuses carry across the ×3 sequence) has no spelled rule (do durations refresh? does the third get all stacks?) | L | §9.1 | 00 — "Each chorister inherits the previous one's **debuffs at current potency, with durations refreshed to 2**; Bleed stacks cap at 5 as normal." `[PROVISIONAL]` | `[CLARIFICATION → D31]` |

---

## 0.3 Proposal register

Type: **spec** (new rules/numbers) · **fix** (repairs a finding) · **content** (new strings/rows) · **policy** (a rule about how the game behaves) · **philosophy** (a stance, no code).

| Ref | Proposal | Doc | Type | Effort | One-line |
|-----|----------|-----|------|--------|----------|
| 01-R1 | The XP economy | 01 | spec | S | `10+4L` × role; chapter +10; Floor 8+2L with per-opponent decay; pays once per fight |
| 01-R2 | Level target resolution | 01 | fix | S | Campaign = L9 natural, L10 at the finale; §13 sentence struck |
| 01-R3 | Soft level-sync | 01 | spec | M | +1 stat/+4% HP per level over band, cap 3; 25% XP; +1 pity; Reading shows adjusted sheet |
| 01-R4 | The Twin Ledger | 01 | content | S | Ch3-Devotion → second saved loadout, Floor-compatible |
| 01-R5 | De-duplication + Oren's Post | 01 | fix | S | Cut 2 duplicate rows; grant Ch8-Mercy a vow |
| 01-R6 | L7 consolidation beat | 01 | content | S | Shrine inscriptions frame the final verse unlock |
| 01-R7 | Tallies of the City | 01 | content | M | 9 optional one-line objectives; +5 XP + deed + Maren line each |
| 01-R8 | Floor first-time rewards | 01 | spec | S | First bind +15 XP; first imported code fought +10 |
| 01-R9 | The Vigil's Calendar | 01 | content | S | Generated per-chapter unlock/reward table in the Hymnal |
| 02-R1 | The Echoes' Practice | 02 | fix | S | Budget = 27+6+2(L−1); one sentence, zero sheet edits |
| 02-R2 | Fatigue schedule + The Last Bell | 02 | spec | S | 2/4/8/16/32 on r16–20; r20 resolves to higher HP% |
| 02-R3 | The loss loop (retry / whisper / Dampened Bell) | 02 | spec | M | Infinite retries; hints at loss 3; opt-in assist at loss 4, PvP-safe |
| 02-R4 | The pacing sheet | 02 | spec | S | Per-wall rows: clear bands, expected rounds, failure signatures |
| 02-R5 | Mother Bell levers | 02 | spec | M | Warden reflect-doubling; Cantor forced cool windows |
| 02-R6 | Corvane lock | 02 | policy | S | Counterbuild locked per run; first loss reveals the axis |
| 02-R7 | Small fixes (pronoun / Strike-copy / Bram HP / Turned Pour sheet) | 02 | fix | S | Four one-line repairs |
| 03-R1 | The Five Currencies map | 03 | philosophy | S | Resolve/HP/allocations/slots/Toll — every future balance question is a faucet question |
| 03-R2 | The memory market | 03 | spec | M | 9 memories = the 9 choices; 1 each; *—sold—*; Unmake closes; never restocks |
| 03-R3 | The unlived-path drop pool | 03 | spec | S | 12% drops = the items your choices didn't take; Wax bank on dry pool |
| 03-R4 | Toll: decay + recasts | 03 | spec | M | Repeats ±2; NPC losses half; named Echoes recast ×3 each |
| 03-R5 | Vigil's Rest cost 2 | 03 | fix | S | Net +3 → +2 |
| 03-R6/7/8 | Mantle source · Hymnal "kept" row · `tally` fix | 03 | fix | S | Three one-liners |
| 04-R1 | The loop map | 04 | philosophy | S | Five loops; every future feature must name its loop |
| 04-R2 | The Chronicle | 04 | content | M | Build biography + forecast-calibration line + re-bell framing |
| 04-R3 | Verses of Deed | 04 | content | S | Ten diegetic deeds; no mechanics, no toasts |
| 04-R4 | Ledger, not ladder | 04 | spec | S | Agent-voiced losses; the Ward; overnight-loss caps |
| 04-R5 | Creation presets | 04 | content | S | Four named spreads; respec promised at the moment of maximum fear |
| 04-R6 | Manual-parity rule | 04 | policy | S | Offline time is a bonus, never a yield advantage |
| 04-R7 | Maren reads the vow | 04 | content | S | 11 vow suffixes, appended once |
| 04-R8 | Report tone pass | 04 | fix | S | Calibration line; shame line re-worded to route-to-fix |
| 05-R1 | The Second Verse | 05 | spec | M | NG+: the Vigil Who Came Before + Ash Inheritance |
| 05-R2/R4 | Completionism matrix + the Echo Codex | 05 | content | M | Ghost silhouettes; honest run-count table; The Nine |
| 05-R3 | The Second Choir | 05 | philosophy | S | Three mountains: Codex, recast ladder, recast patches |
| 05-R5/R6 | Floor guarantees + recast patches | 05 | policy | S | ≥12 Echoes forever; changelogs as ledger prose |
| 05-R7 | Unmake discoverability schedule | 05 | policy | S | Sealed → title surfaces → Shadow deed |
| 05-R8 | Fifth-class requirements list | 05 | philosophy | S | The gate any future class must pass |
| 05-R9 | The Kept Echo | 05 | content | S | A-Mercy lock framed as a crest |
| 05-R10 | Measurement without tracking | 05 | policy | M | Opt-in local counters + save-code census + cohorts |

---

## 0.4 Decision register — everything awaiting your call

| # | Decision | Docs | Options | Recommendation |
|---|----------|------|---------|----------------|
| D1 | Campaign level target | 01, 02 | Keep "finishes at L7" (re-band everything) vs adopt L9/L10 | **L9/L10** — the roster and bands already agree |
| D2 | Over-level handling | 01, 02 | Soft sync (cap +3) vs zero scaling | **Soft sync** |
| D3 | Ch3-Devotion reward | 01 | Twin Ledger vs once-per-fight re-slot | **Twin Ledger** |
| D4 | Duplicates + bare paths | 01 | Cut both dups; grant Oren's Post to Ch8-Mercy? | **Cut both; grant Oren's Post** |
| D5 | Tallies of the City scope | 01 | All 9 vs 3-objective pilot vs skip | **All 9** |
| D6 | L7 shrine inscriptions | 01 | Add vs skip | **Add** |
| D7 | The +2 budget edge | 02 | Declare intentional vs rebuild 21 sheets | **Declare intentional** |
| D8 | Fatigue | 02 | Doubling + Last Bell vs linear + hard cap | **Doubling + Last Bell** |
| D9 | Loss loop depth | 02 | Retries only / +whispers / +Dampened Bell | **All three** |
| D10 | Mother Bell | 02 | Authored levers vs declared DoT-gate | **Levers** |
| D11 | Corvane | 02 | Lock counter per run vs re-pick on re-bell | **Lock** |
| D12 | Bram HP | 02 | 148 vs 120 | **120**, pending telemetry |
| D13 | Memory market | 03 | Blank Ledger + Unmake gate vs cosmetic-only vs free shop | **Blank Ledger** |
| D14 | Vendor stock | 03 | The 3 listed market items vs your pick | **Listed 3** |
| D15 | Drop pool | 03 | Unlived-path vs all-unowned vs 2-item | **Unlived-path** |
| D16 | Recasts | 03 | Ship now vs wait for Phase 9 | **Ship now** |
| D17 | Vigil's Rest | 03 | Cost 2 vs leave at 1 | **Cost 2** |
| D18 | The Chronicle | 04 | Full vs calibration-line-only | **Full** |
| D19 | Deeds | 04 | All 10 vs 5-deed pilot | **All 10** |
| D20 | The Ward | 04 | Default ON (first chapter) then player-set vs OFF vs none | **Default ON, then player-set** |
| D21 | Creation presets | 04 | Ship vs teaching-text-only | **Presets** |
| D22 | Vow suffixes | 04 | Ship 11 vs skip | **Ship** |
| D23 | Shame line | 04 | Re-word vs keep verbatim | **Re-word** |
| D24 | The Second Verse | 05 | Full vs without inheritance vs skip | **Full** |
| D25 | Codex | 05 | Ghosts + matrix vs ownership lists | **Ghosts + matrix** |
| D26 | Recast patches | 05 | Adopt philosophy vs ad-hoc patches | **Adopt** |
| D27 | Unmake schedule | 05 | 3-phase vs launch-visible | **3-phase** |
| D28 | Fifth class | 05 | Gate on requirements list vs re-decide later | **Re-decide later, gate on the list** |
| D29 | Measurement | 05 | Counters+census+cohorts vs cohorts only | **All three** |
| D30 | The Kept Name (Ch7-Ruthless reward, F10) | 00 | Adopt vs design your own vs leave bare | **Adopt** |
| D31 | Pinned micro-numbers (F23 heal 20%, F28 Blade wording, F34 Chorister inheritance) | 00 | Confirm vs adjust | **Confirm as provisional** |
| D32 | Manual-parity policy (F32) | 04 | Adopt as written vs carve an offline exception | **Adopt** |

---

## 0.5 Assumptions register

Every assumption the review made that the GDD does not state. Each is labeled in place; all are safe to correct and the numbers move, not the designs.

| # | Assumption | Where |
|---|-----------|-------|
| A1 | The act table's level bands are the intended arrival levels (§13's "finish at 7" is stale) | 01 R1/R2 |
| A2 | Ch1's three choice items map Ruthless→Mace, Mercy→Shroud, Devotion→Shovel | 01 R9 |
| A3 | Ch4's Ysolde fight and Ch8's Oren fight use the boss XP role; Ch1's Sedge and Ch2's Reaper likewise (second slot of 2-fight chapters = boss role) | 01 R1 |
| A4 | Ilvane Phase II heals 20% of damage dealt | 02 R4 |
| A5 | Bram retune target 120 HP assumes the harness confirms ≥75% two-class first-attempt clear | 02 R7c |
| A6 | Mother Bell's +4 budget delta is a declared hybrid override, like its HP override | 02 §6.1 |
| A7 | The Floor's XP/Toll/drop systems all pay at parity between manual and hourly-resolved fights | 04 R6, 03 R4 |
| A8 | Ash Inheritance carries one item's mark (two if run 1 was Unmake) | 05 R1 |
| A9 | Recast Echoes keep their authored weakness (recasts change level/verse/rating, never the lesson) | 03 R4 |
| A10 | Vendor items (Choir-Scale Blade, Reliquary Lantern, Hourglass of Ash) are the 3 sold — all market-sourced in §8 already | 03 R2 |
| A11 | The story-vow count is canon at 23 (12+11) per §7.2's table | F25 |
| A12 | Patch cadence is owner-set; recast-patch mechanics assume data-file updates only (no server) | 05 R6 |

---

## 0.6 What this review deliberately did NOT change

Per your rules — preserved canon, improved systems:

- **The lore, cast, act structure, all 9 choices, all 10 endings, and the Unmake's gate conditions.** Touching none of it.
- **The combat chassis:** stats, Resolve, statuses, damage pipeline, rounding contract, Bounded Roll, the Wax Meter, anti-lock guarantees. Doc 02 repairs two definitional bugs *inside* it (Fatigue, budget note) and otherwise treats it as finished.
- **The reward hierarchy** (vow > verse > item > stat point), **free respec with the Reshape Ledger**, **fixed loot with no random stats**, **choices paying no XP**, **no daily hooks anywhere.**
- **The Echo AI honesty rules, doctrines, and the Reading panel.** The review's only Reading-adjacent addition is the calibration line (04 R2).
- **Every named character, item name, and verse name** — except the two duplicate rows proposed for deletion (F7/F8) and one pronoun (F20).
- **The anti-manipulation stance.** Every proposal was screened against it: no streaks, no FOMO, no time pressure, no dark patterns; the two systems that touch wall-clock time (hourly challengers, recasts) are bounded by the manual-parity rule and by always-visible honesty.

---

## 0.7 Cross-document consistency notes

The five docs share load-bearing numbers. These are the couplings to check as one unit when any of them changes:

1. **XP curve ↔ act bands ↔ level-sync (01 R1/R3 ↔ 02):** the campaign walk in 01 §3 lands every band with zero Floor play; the sync rule caps grinder drift at +3. Change `10+4L` and re-run the arrival-fit assert before touching anything else.
2. **Fatigue schedule ↔ fight-length targets (02 R2 ↔ §15.3):** 7–12 average rounds and the 2/4/8/16/32 clock are one system; the Last Bell row is the assert's mechanism.
3. **Loss loop ↔ XP (02 R3 ↔ 01 R1):** retries pay nothing extra; whistles and assists exist *because* XP never punishes. If you add any loss penalty, delete the Whisper system — they are substitutes, not complements.
4. **Memory market ↔ Unmake gate ↔ tallies (03 R2 ↔ §4.4):** selling keeps tally contributions and closes Unmake; the Orrery *—sold—* marks are the disclosure. If you reject the Unmake gate, the Blank Ledger still works — but it loses its teeth.
5. **Drop pool ↔ choice exclusivity ↔ Codex (03 R3 ↔ 05 R2/R4):** the pool is exactly "the items the Codex shows as ghosts." Keep those lists generated from one source of truth.
6. **Toll rules ↔ overnight framing (03 R4 ↔ 04 R4):** NPC losses halved *once*; the night-cap is the framing rule's enforcement. Do not stack multiple loss-reduction systems.
7. **Manual parity ↔ all Floor rewards (04 R6 ↔ 01/03):** if any future reward is offline-only, this policy is broken and the mixed-rhythm promise with it.
8. **Vigil's Rest cost ↔ Resolve economy asserts (03 R5 ↔ 02):** the cost-2 change is what lets the "no net-positive loops" assert pass; if you keep cost 1, delete the assert instead — an assert that fails silently is worse than no assert.

---

## 0.8 If you approve everything: build order

Not implementation — the order in which these decisions unblock the existing plan (§16's phases):

1. **Before the harness (Phase 1):** D7 (budget), D8 (Fatigue) — the harness's asserts are written against these truths.
2. **Before story data (Phases 4–6):** D1/D2 (levels/sync), D3/D4 (choice rewards) — the choice table and the calendar generate from these.
3. **Before the Floor (Phase 7):** D13/D15/D16 (memories, pool, recasts), D20 (Ward default) — the Floor's rules are cheaper to build once than to retrofit.
4. **Any time:** D5/D6/D18/D19/D21/D22/D24/D25 (content-layer proposals — all strings and generated screens).
5. **Post-launch:** D27 (Unmake schedule flag), D26/D29 (recast patches, measurement).

**The single highest-leverage sequence in this review:** approve D7 → D8 → D1 → D3 → D13. Those five decisions resolve every critical finding (F1–F6, F12) and cost maybe two hours of your time. Everything else can wait for playtest data.

---

*End of the change log. The five systems documents carry the full reasoning, worked examples, and test plans behind every row above.*
