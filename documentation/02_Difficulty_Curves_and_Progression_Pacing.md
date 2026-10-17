# 02 — Difficulty Curves & Progression Pacing

**The Ashen Choir — Systems Design Review, Document 2 of 5**

| | |
|---|---|
| **Scope** | The shape of challenge: combat math as it scales across the campaign, enemy build budgets, act-boss walls, fight length, the Fatigue clock, loss and retry rules, and the pacing of the whole 9-chapter climb. |
| **Source of truth** | `THE-ASHEN-CHOIR-v1.md` — principally §5 (combat core), §9 (enemy roster), §10 (Bounded Roll), §13 (progression), §15.3 (balance harness). |
| **Status** | Design review. Nothing here is canon until you approve it. |
| **Tag legend** | `[CANON]` restated · `[CLARIFICATION]` resolves ambiguity, no intent change · `[PROPOSAL]` new/changed design, specced · `[DECISION NEEDED]` your call · `[ASSUMPTION]` unstated, numbers provisional. |
| **Companion docs** | 01 (rewards/XP — owns levels and level-sync), 03 (economy), 04 (motivation), 05 (retention), 00 (change log). |

---

## 1. Current system, restated

### 1.1 The combat chassis `[CANON]`

- **Stats:** VIG (max HP = 60 + 8×VIG, healing power), MIG (Steel damage, Bleed), WIT (Ember/Shade damage, Burn, Wards), GRD (mitigation: Steel 2%×GRD, Ember/Shade 1%×GRD, hard cap 60% — 70% with Ash-Glazed Brass), HST (turn order, crit = 5% + 1%×HST, crit ×1.5).
- **Resolve:** start 3 (second mover 4), +3 per turn, cap 10. Strike costs 0, deals `2 + 0.4×main stat`, refunds +1. The second mover's +1 is the published counter to first-move advantage.
- **Damage pipeline:** `raw = base + Σ(coef×stat)` → ×(1 + damage bonuses) → ×0.75 if Cursed → ×per-hit jitter (Clamped 1.00 ± 0.10) → ×shared Fortune (fight-wide, clamped [0.88, 1.12]) → crit ×1.5 (unaffected by Fortune) → ×(1 − summed mitigation, capped) → round once, minimum 1. Ward absorbs first.
- **True damage:** Bleed, Burn, Thorns, Fatigue ignore mitigation. This is the load-bearing counter to armor builds.
- **Statuses:** Bleed (5 stacks, `stacks × (2 + 0.18×MIG)` true/turn), Burn (`base + 0.25×WIT` true/turn, keeps higher on reapply), Curse (−25% damage), Fray (Guard ×0.6), Hush (Resolve gain −2, floor +1), Brace (+40% mitigation, 1 turn), Ward (absorb pool, 3 turns, no stacking), Thorns (X true on being hit), Stun (skip a turn, then 2-turn re-stun immunity), Rite (phase marker).
- **Anti-lock guarantees (§10.10):** no stun re-lock before 2 turns; Hush never below +1 Resolve; heals cooldown ≥3; Ward expires in 3 turns and never stacks; minimum 1 damage per landed hit; Fatigue ends every fight.

### 1.2 Fatigue, "The Bell Tolls" `[CANON]`

From round 16, both fighters take true damage "starting at 2 and growing by 2 each round." From round 13 it is telegraphed (`TOLL IN 3`). "From round 16, Fatigue doubles." The harness asserts no fight exceeds 20 rounds (§10.9 rule 10, §15.3). Note the two sentences already disagree with each other — this is P2 below.

### 1.3 Enemy construction `[CANON]`

Every enemy is a full build: class, level, hand-tuned stat weighting, signature verb, and a Reading-panel counter. The stated budget: `budget(L) = 27 (class base) + 4 (creation) + 2 × (L−1)` — i.e., enemies are built exactly like a player of the same level. Bosses override HP explicitly (Mother Bell 300, Ilvane 420). The roster runs 21 fights: L1 (Bram, 148 HP) to L10 (Ilvane, 420 HP), with per-enemy sheets published in §9.

### 1.4 The difficulty philosophy as stated `[CANON]`

- Geography is the curve: the city drowns bottom-up and the campaign climbs; act bosses are "hard walls for the build you have at that point," and the walls are *meant* to be breakable by a build you shaped (the Ch1 Mace "quietly makes the Chapter 3 boss trivial — that is intentional").
- **No fight is a surprise.** The pre-fight Reading shows expected win %, expected length, and a named counter (200-seed simulation, cached). §10's thesis: a correct build wins ~88–100% of the fights it should win; a loss is legible.
- **Re-bell:** one free retry per chapter, new seed, no XP loss, story never resets; all re-bells recorded in the Vigil Ledger.
- **Harness targets (§15.3):** no class >58% overall in PvP; mirrors ~50%; fights average 7–12 rounds; no fight reaches round 20; every campaign enemy is beaten by ≥2 classes at ≥55% and beats ≥2 classes at ≤35%; act bosses checked at ≥40% clear for a *correct* build; the final boss must clear at ≥30% for all four classes; total fight damage variance ±12% asserted across seeds.

### 1.5 The curve as staged `[CANON]`

| Act | Chapters | Levels `[CANON]` | Walls |
|---|---|---|---|
| I — The Waking | 1–3 | 1–4 | First Vespers (two-phase debuff lock → damage race) |
| II — The Turning | 4–6 | 4–7 | Corvane (counterbuild), Mother Bell (temperature, 300 HP) |
| III — The Choir | 7–9 | 7–10 | Ilvane (three phases, 420 HP, Phase III copies your best verse) |

---

## 2. What works — do not touch

- **Walls that teach.** Each act boss is a thesis exam: First Vespers tests "did you learn to answer debuff locks," Mother Bell tests "did you learn true damage," Ilvane tests "did you store power where he can't copy it." This is the rare campaign where the difficulty curve *argues* something.
- **The Reading panel.** Expected win % before every fight converts difficulty from a feeling into a forecast, and makes the harness's targets *player-visible*. Most games hide their balance math; this one prints it on a card.
- **True damage as the armor answer.** One rule does the work of a whole rock-paper-scissors layer, and the item/vow library consistently reinforces it.
- **Anti-lock guarantees.** Every degenerate stall strategy in the design space has a published, named counter-rule. That list is the reason the game can promise "every fight ends."
- **Re-bell's honesty.** Free retry, recorded forever, story never reset. The ledger *shows* you your stubbornness instead of taxing it.

---

## 3. Problems

### P1 — The enemy budget formula is off by exactly +2, everywhere. `[C]`

§9 states `budget(L) = 27 + 4 + 2(L−1)`. I audited all 19 individually-statted roster rows. **Every single one exceeds the formula by exactly +2 stat points.** Three examples (deltas from class base in parens):

| Enemy | L | Sheet total | Formula says | Over by |
|---|---|---|---|---|
| Bram (11/5/2/10/5) | 1 | 33 | 31 | +2 |
| Pell (5/2/16/8/12) | 6 | 43 | 41 | +2 |
| Oren (14/7/2/18/8) | 9 | 49 | 47 | +2 |

The full audit is §6.1 below. The pattern is too uniform to be sloppiness — every enemy is built like a player **one level higher**. This is either (a) a formula typo that survived the re-cut, or (b) an undocumented intentional edge. Either way it must be written down, because the harness will be tuned against whatever the truth is, and "enemies are built to budget" is currently false in a way that inflates every act boss's effective difficulty by roughly a level. R1 resolves it as (b), deliberately, with a lore-facing name — but it is your call.

### P2 — Fatigue contradicts itself, and the round-20 assert has no mechanism. `[C]`

§5.6 says Fatigue "starts at 2 and grows by 2 each round" (linear: r16=2, r17=4, r18=6, r19=8, r20=10 — cumulative 30) and then says "from round 16, Fatigue doubles" (exponential: r16=2, r17=4, r18=8, r19=16, r20=32 — cumulative 62). These are different clocks. Worse, the harness *asserts* no fight exceeds round 20 (§10.9 rule 10), but linear Fatigue does not guarantee that: two high-mitigation builds trading ~6 damage/round into ~170 HP pools survive past r20 comfortably with cumulative Fatigue of 30. As written, the assert fails on its own target roster. R2 resolves both: one schedule (the doubling one), plus a terminal mechanism at r20 — **The Last Bell** — so the assert is true by arithmetic, not by hope.

### P3 — Losing a campaign fight is undefined beyond the first retry. `[C]`

The game specifies one free Re-bell per chapter and then says nothing. What happens on the second loss? The third? Is there a state where the campaign cannot proceed? For a game whose thesis is "a loss is a lesson, not a robbery," the loss loop is the most important loop in the campaign, and it is unspecified. Three failure modes ship by default if nobody decides: (a) infinite identical retries with no new information (frustration loop), (b) players assume a fail state that doesn't exist and quit (lost players), or (c) someone improvises a punishment later and breaks the design's promise. R3 defines the whole loop, including an honest assist mode for players below the floor.

### P4 — The act bosses have no published pacing targets. `[H]`

§15.3 gives roster-wide targets (≥55% two-class clear, ≥40% boss clear for correct builds) but no per-fight sheet: expected rounds, intended DPS windows, phase-entry thresholds, or which builds each wall is *supposed* to fail. Without that sheet, Mother Bell's "DoT wins by a mile" and Ilvane's Phase II heal percentage are vibes, not specs — and the harness cannot flag a wall that drifted. R4 publishes the sheet.

### P5 — Two walls are single-axis, and one of them strands two classes. `[H]`

The readability rules promise "no enemy has a mechanic that only one class can answer" (§9.5 rule 3, with Tide-Bound as the one named exception). **Mother Bell is a second, unnamed exception.** Molten (>50% HP) takes 50% less *direct* damage; the only damage that ignores that rule is true damage — Bleed (Ashblade), Burn (Cinder Witch), Thorns (Gravewarden, but reflect income is too low to matter), and nothing at all for the Hollow Cantor, whose whole kit is direct Shade. Count it honestly: **two classes clear Mother Bell comfortably, and two are reduced to chipping a 50%-resistant target for 15+ rounds into the Fatigue clock.** Rule 2's letter ("≥2 classes at ≥55%") is satisfied; its spirit — and rule 3's — is not, and unlike Tide-Bound, this one sits at an act-boss position every player must pass. R5 gives the two stranded classes a real (still harder) path without diluting the DoT thesis.

### P6 — Corvane's retry behavior is undefined and can degenerate. `[H]`

Corvane's build is picked at fight start to counter yours. Undefined: does a Re-bell re-pick? If yes, players reroll the fight until the counter table lands on something soft — the counter-pick mechanic becomes a slot machine the player farms. If no (locked), a player whose build is hard-countered has exactly one Re-bell and then a permanent wall. R6 locks the pick to the run and adds a loss-hint line, which keeps the lesson ("your build has a hole") while guaranteeing the hole is *visible*.

### P7 — There is no below-the-floor path. `[M]`

Every player is assumed to clear walls at the harness rates. A player who cannot read the counterplay — the demographic the assist-mode debate exists for — has one Re-bell, then undefined loss (P3). The Bounded-Roll philosophy gives the perfect cover for an assist mode: if variance can't flip fights, then a small, *disclosed* enemy nerf can't corrupt the ladder either (the Floor doesn't use campaign assists). R3c proposes the Dampened Bell.

### P8 — Small ambiguities that will become bugs. `[L]`

(a) §9.3 calls the Pale Cantor, First Movement "she" — it is a recording of Ilvane (he/him); (b) Ilvane Phase III "the verse you have cast most often" — undefined whether Strike counts (if it does, he copies Strike for every conservative player and Phase III is trivial); (c) Ch1 Bram is labeled "the gentlest possible introduction" while being the highest-HP L1 entity in the game (148) — see the worked sim in §6.2; (d) the Ch9 ally bell (Turned Pour) has no published sheet. Each gets a line in R7.

---

## 4. Recommendations

### R1 — Name the edge: "The Echoes' Practice" `[CLARIFICATION → PROPOSAL]`

Amend §9's budget line to:

> `budget(L) = 27 (class base) + 6 (the practice of the dead) + 2 × (L−1).`
> *Every Echo in the campaign has fought its fight more times than you have. The +2 is that practice, made visible. The player's own +4 creation points remain the player's alone.*

Every roster row then conforms exactly (audit in §6.1). No sheet changes. The Reading panel needs no edit; the harness's expected-win math was presumably already computed against the real sheets. **Why write it down:** the alternative is shipping a doc whose formula contradicts all 21 of its own fights — the first thing any future balancer (including you, in six months) will trip over. Marking it intentional also protects the *feel*: enemies punching at weight-class+1 is why campaign fights at parity feel tense.

### R2 — One Fatigue schedule, and The Last Bell `[PROPOSAL]`

Replace §5.6 with:

| Round | 13 | 14 | 15 | **16** | 17 | 18 | 19 | **20** |
|---|---|---|---|---|---|---|---|---|
| Telegraph | `TOLL IN 3` | `TOLL IN 2` | `TOLL IN 1` | Fatigue **2** | **4** | **8** | **16** | **32** — then **THE LAST BELL** |

- Fatigue damage doubles each round from 2 at r16 (cumulative 62 by end of r20) — one schedule, matching the "doubles" sentence; the "grows by 2" sentence is struck.
- **The Last Bell:** at the end of round 20 the fight resolves. **Higher HP% wins; exact ties go to the defender.** The log narrates it: *"The bell falls. Whoever is still standing when it does, was always going to."* Post-fight report marks it `LAST BELL`.
- Harness rule 10 becomes an arithmetic truth: no fight can exceed 20 rounds because round 20 ends the fight.

**Why this shape:** doubling from r16 turns the last three rounds into a mandatory decision point (burst now, or lose the HP% race), which is exactly the tension the TOLL telegraph promises. The Last Bell converts the theoretical round-cap into a *climax rule*: stall wars end with a verdict instead of a crash. It cannot produce cheap wins against correct play — cumulative Fatigue is symmetric, so the player who managed resources better arrives at r20 ahead, which is the entire argument of the build game. `[PROVISIONAL: 62 cumulative is ~35–45% of a mid-campaign HP pool — large enough to threaten, small enough that r18–19 kills are about the fight, not the clock. The ±2-step tuning band is {2,4,8,16,32} → {3,5,9,17,33}.]`

### R3 — The complete loss loop: retry, whisper, dampened bell `[PROPOSAL — DECISION NEEDED on c]`

**a) Retries are infinite and free.** A campaign fight can always be re-fought. XP pays on first clear only (01 R1); no stat, item, or story state is ever lost to a loss. The Re-bell name stays; the "one per chapter" limit is **removed** (it was a punishment pretending to be a resource — the ledger already records every retry, which is the honest cost).

**b) Maren's Whisper.** On the **third** loss to the same fight, the pre-fight Reading gains one specific line, drawn from the enemy's counter column and sharpened: e.g., vs Grast — *"He is a wall. Walls do not bleed, but they burn."* It never plays the fight for you; it names the axis. A fourth loss adds a second line naming one slot swap ("Something in this kit has never been cast"). The system is data (one string per loss-count per enemy), not logic.

**c) The Dampened Bell (assist mode).** A toggle in Settings, discoverable only after a fourth loss on any fight (the game offers it; it is never pushed): **enemy damage −15%, enemy HP −15%, marked permanently on your profile as `dampened`.** It cannot be toggled per-fight mid-run, disables nothing (all endings, all rewards, the Floor, all titles reachable), and the profile mark is the entire "cost" — visible, factual, shame-free: *dampened* is a bell that rings quieter, not a bell that lies. The Bounded Roll contract is untouched (jitter, Fortune, and bounds are identical; the sheets are smaller). PvP/Toll is unaffected: campaign assists don't travel into Echo sheets — an Echo built in a dampened run carries **full** stat lines, so the Floor stays a level field. `[DECISION NEEDED: ship c at all. I recommend yes — it is the only feature that rescues the sub-55%-clear demographic without touching anyone else's game.]`

**Why this loop works:** (a) removes the cliff, (b) converts repetition into teaching, (c) gives the truly stuck an exit that costs pride once, at the door, instead of costing the whole run. None of it taxes the skilled: a good player never sees (b) or (c). This is the anti-manipulation stance applied to difficulty — no artificial friction, no dark-pattern retry timers, just honest exits.

### R4 — Publish the pacing sheet for every wall `[PROPOSAL]`

One row per fight, generated by the harness, reviewed by hand for the 12 authored fights. Columns: intended clear % (per class), expected rounds (intended build), phase thresholds, failure signature (what a *wrong* build's loss looks like — the teaching moment), and the axis the fight tests. Draft for the six walls:

| Fight | Tests | Intended clear (correct build) | Expected rounds | Failure signature |
|---|---|---|---|---|
| First Vespers (L7) | Debuff-lock answers + a burst reserve | ≥45% all classes with a cleanser or silence answer; ≥40% without | 12–15 | Death in Phase 2 toll to a build that brought no race answer |
| Corvane (L7) | Build self-awareness | ≥50% (he is *correct*, not stronger — RNG-bounded) | 8–12 | Same-axis loss: your strength mirrored back |
| Mother Bell (L8) | True-damage literacy | ≥55% Ashblade/Cinder; ≥30% Warden/Cantor pre-R5; ≥40% post-R5 | 14–18 | Fatigue death while molten holds |
| First Movement (L9) | Pattern learning | ≥65% after one loss (it is a recording — learnable) | 8–10 | Repeat loss to the same 3-turn opener |
| Oren (L9) | Attrition answers | ≥45% (regen + Stun punish the race) | 12–16 | Stun-lock death by fatigue |
| Ilvane (L10) | Everything; Phase III thesis | ≥30% all classes (§17 risk line) | 15–20 | Phase III: your own best verse, returned |

The sheet is the contract between §9's prose ("hard wall") and §15.3's harness numbers. When a wall drifts in playtesting, you tune against the row, not against vibes.

### R5 — Mother Bell: give the two stranded classes a harder, real path `[PROPOSAL]`

Keep the DoT thesis (Ashblade/Cinder still clear easiest). Add two authored levers:

- **Gravewarden — "Ring the bell back."** While the Bell is molten, its attacks come more often (it casts Crypt Door and attacks in the same round). Sepulchral Spikes/Stone Vigil reflect income roughly doubles; a Warden built for Thorns reflection (Founder's Chisel, +50%) can win the molten phase by standing there. It stays the slowest clear on the sheet — but it is a *plan*, not a chip.
- **Hollow Cantor — "Tune it down."** Curse and Fray apply normally in the molten phase, and the Rite's temperature flips *for one round* whenever the Bell is Cursed *and* Frayed simultaneously ("the note souring"): the Bell cools early, taking its cooled-phase +30% damage vulnerability while the Rite re-heats. A debuff-lock Cantor can force two or three cool windows per fight — still the hardest intended clear, but authored.

**Why:** this preserves the exam ("did you bring true damage?") while making it a *timed* exam rather than a *pass/fail by class* exam. Both levers are Rite-adjacent (they live inside the existing temperature data object), use existing statuses, and require zero new UI. If you'd rather keep Mother Bell as the game's one honest DoT-gate, that is a defensible call — but then §9.5 rule 3 needs its exceptions list updated (Tide-Bound, Salt Widow, *Mother Bell*), and the Cantor needs a Ch6 shrine inscription telling it the truth.

### R6 — Corvane: lock the counter, signpost the lesson `[PROPOSAL]`

- The counterbuild is **seeded from your build string at chapter start and locked for the run** — Re-bell does not re-pick ("He watched you fight once. He does not forget"). This kills the reroll-for-a-soft-counter exploit before it exists.
- On your **first loss** to Corvane, the Reading panel's next entry adds one line naming the axis he punished: *"He did not bring a duelist. He brought an answer."* — plus the counter table row your build triggered, now that you've paid for it. Second loss onward, the standard Maren's Whisper applies (R3b).
- His sheet is otherwise harness-normal: ≥50% clear for any build that read the pre-fight line ("Corvane has watched you fight"), because his stats are same-level + practice, not inflated.

**Why:** the fight's design goal is legible self-knowledge, which requires that losing *once* be sufficient to see the hole. A locked pick + a paid-for reveal achieves that; a re-rolled pick turns the best fight in the game into a farm target.

### R7 — Small fixes, stated once `[CLARIFICATION]`

(a) First Movement pronoun → "It repeats the exact same opening every time" (it is a recording; "it" also strengthens the uncanny). (b) Ilvane Phase III copies "your most-cast **slotted** verse; Strike is never copied" — Strike stays the universal pressure valve and the mimic's blind spot, which is thematically perfect: the most basic note is beneath him. (c) Bram, see §6.2 — recommend **148 → 120 HP** if the Phase-8 playtest shows >50% first-attempt failure; he must remain the fight that *teaches* the candle, not the fight that *spends* it every run. (d) The Turned Pour ally bell needs a one-row sheet (propose: L8 Gravewarden chassis, 140 HP, Thorns 6, attacks once per round, cannot be targeted by Ilvane's Curse) — data, not design.

---

## 5. Revised spec — ready to paste

**§9 header note:**

> **Stat budget.** `budget(L) = 27 (class base) + 6 (the practice of the dead) + 2 × (L−1)`. Every campaign Echo carries two points of practice; they have fought this fight before. Bosses override HP explicitly.

**§5.6 Fatigue, full replacement:**

> From round 16 ("TOLL" telegraphed from 13), both fighters take true damage: **2, 4, 8, 16, 32** on rounds 16–20. At the end of round 20, **THE LAST BELL**: the fight resolves, higher HP% wins, ties to the defender. No fight exceeds 20 rounds; the harness asserts the schedule, not the outcome.

**§15.3 harness, two added asserts:**

> - Every enemy sheet conforms to `budget(L) = 35 + 2(L−1)` exactly (the +6 practice included), within ±0 points.
> - Every wall's harness-measured clear rate sits inside its R4 pacing row (±8 points), or the row is re-declared.

---

## 6. Worked examples

### 6.1 The full budget audit (the evidence for R1)

Sheet totals vs `27 + 4 + 2(L−1)`, from §9's tables:

| # | Enemy | L | Sum | Budget | Δ |
|---|---|---|---|---|---|
| 1 | Bram | 1 | 33 | 31 | **+2** |
| 2 | Sedge | 2 | 35 | 33 | **+2** |
| 3 | Brack | 4 | 39 | 37 | **+2** |
| 4 | Reaper of the Silt | 5 | 41 | 39 | **+2** |
| 5 | Choristers (each) | 4 | 39 | 37 | **+2** |
| 6 | Pell | 6 | 43 | 41 | **+2** |
| 7 | First Vespers | 7 | 45 | 43 | **+2** |
| 8 | Sable | 5 | 41 | 39 | **+2** |
| 9 | Ysolde | 7 | 45 | 43 | **+2** |
| 10 | Wick Lad | 5 | 41 | 39 | **+2** |
| 12 | Grast | 7 | 45 | 43 | **+2** |
| 13 | Halbrey | 8 | 47 | 45 | **+2** |
| 14 | Mother Bell | 8 | 49 | 45 | **+4** (hybrid override, like its HP override) |
| 15 | Yune | 8 | 47 | 45 | **+2** |
| 16 | First Movement | 9 | 49 | 47 | **+2** |
| 17 | Tide-Bound | 9 | 49 | 47 | **+2** |
| 18 | Oren | 9 | 49 | 47 | **+2** |
| 20 | Ilvane's Second | 10 | 51 | 49 | **+2** |
| 21 | Ilvane | 10 | 51 | 49 | **+2** |

Eighteen of nineteen rows: exactly +2. One row: +4, and that row already declares itself an override in two other columns. The fix is one sentence, not twenty-one edits.

### 6.2 The tutorial exam, simulated by hand (Bram)

Fresh Ashblade, creation points into MIG (12 MIG, 6 VIG → 108 HP, HST 7). Rend = 5 + 0.9×12 = 15.8 raw; Bram's GRD 10 → Steel mitigation 20% → ~12.6/turn, +1 Bleed (2 + 0.18×12 = 4.2 true/turn). Realistic output ≈ 16/turn once Bleed stacks. Bram's 148 HP ⇒ **~10–11 rounds.** Incoming: Bram's Bulwark ≈ 14.5 raw × 0.92 (player GRD 4) ≈ 13/turn, + Thorns 6 per direct hit ⇒ ~19/turn unbraced. Over 10 rounds: ~190 damage vs 108 HP. **The fight is unwinnable without Bracing (Steady Breath turns ~19 into ~11–12, plus Purify-less sustain absent) and almost always spends the Candle of Saint Orrin.** That is a real exam — but it is not "the gentlest possible introduction," and a first-time player who loses it has burned their only Re-bell (pre-R3). Recommendation stands: retune to 120 HP (≈ 8 rounds, Candle optional rather than mandatory), and let R3's infinite retries carry whoever still fails. `[PROVISIONAL: verify with the harness at ≥75% two-class clear — this is a tutorial fight, and the R4 row for it should read "tests: the verbs," not "tests: everything."]`

### 6.3 The final exam, phase by phase (Ilvane, L9 player, Ashblade)

Arrival state (per 01's curve): L9, 47 stat points, e.g., MIG 20, VIG 12 (156 HP), HST 11; gear: Corvane's Blade (+3 MIG, crit scale), Pallbearer's Mace available in slot; vow Red Tide (Bleed cap 8).

- **Phase I (100–66%):** Ilvane curses and hushes; his Shade vs your 12% Shade mitigation + Braces. Your Red Flurry (3×(3+0.45×23)=~40 raw, ~31 post-mitigation) plus Bleed at cap 8 (8×(2+0.18×23)=~49 true/turn) ⇒ ~140 HP of his 420 gone in ~4 rounds. He enters Phase II ahead of schedule — the fight is *fast* if you built for it, which is the point.
- **Phase II (66–33%):** he heals from damage dealt `[ASSUMPTION: 20%, to be specced — R4's sheet row should pin it; 20% of a 40-damage hit is 8 HP back, which punishes chip but not burst]`, summons two Choristers at 50% and 25%. Burst investment pays: the summons are 55-HP bodies that die to one Flurry; the heal is out-raced by Bleed's true damage, which the heal cannot answer.
- **Phase III (33–0%):** he copies your most-cast slotted verse — Red Flurry, at 100%, with *his* 19 WIT-shape stats... no: with your coefficients on his sheet, meaning his Flurry hits like a L10 MIG build's. The pivot: **Blood Ledger** (cast once, consumed all 8 stacks for 5+0.5×MIG×8 = true damage he cannot copy because it is now on cooldown) and the marks he doesn't have — Mace execute below 35%, Blade crit scaling. Rounds 15–19 are a true-damage race into the Fatigue doubling; the Last Bell at r20 is your insurance only if you managed the HP% race.
- **Verdict:** the phase design *works* for a marks-and-vow build and *fails* for a coefficient-stacking build exactly as §9.3's table promises. The one number that must be pinned is the Phase II heal % — at 30%+ the race flips to unwinnable for Ashblade (Bleed ticks get healed back); at ≤20% it holds. R4's sheet pins it; **[ASSUMPTION: 20%.]**

### 6.4 The mountain profile (intended clear %, correct-ish builds)

```
clear%  95 ┤ ●Ch1a
        85 ┤   ●Ch1b
        75 ┤        ●Ch2a ●Ch3a        ●Ch5a
        65 ┤              ●Ch3b        ●Ch5bCORVANE  ●Ch7a ●Ch8a
        55 ┤  ●Ch2b                ●Ch4b           ●Ch6cMBELL* ●Ch7b ●Ch8b
        45 ┤     ●Ch3cF.VESPERS ●Ch4a        ●Ch6b ●Ch6a        ●Ch9a
        35 ┤                                             ●Ch9b
        30 ┤                                                  ●Ch9cILVANE
            └──────────────────────────────────────────────────────────
             Ch1   Ch2   Ch3   Ch4   Ch5   Ch6   Ch7   Ch8   Ch9
```

Not a smooth ramp — a sawtooth that climbs. Each act opens easier than its boss closed (the post-boss trough is where new verbs are practised), and the three deepest dips are the three exams. The sawtooth is the design; the *floor* under it (R3's loop) is what makes it kind.

---

## 7. Test plan

**Harness additions (alongside §15.3):**

1. **Budget conformance assert:** every sheet sums to `35 + 2(L−1)` ±0 (hybrids excluded, declared).
2. **Fatigue terminal assert:** across 10,000 seeds × all roster matchups, zero fights exceed r20, and Last-Bell resolutions distribute ≤5% of all fights (if more, average fight length has drifted past 12 — tune sheets, not the clock).
3. **Wall-band assert:** each R4 row's measured clear sits within ±8 points for the stated builds/classes.
4. **Loss-loop telemetry (local, opt-in):** distribution of attempts-per-fight; flag any fight with median ≥4 attempts (its Whisper lines are failing) or ≥15% of players activating the Dampened Bell before Ch3 (the tutorial, not the player, failed).
5. **Assist integrity test:** an Echo exported from a `dampened` run must byte-match the full-stat sheet (PvP fairness invariant).

**Playtest protocol (Phase 8, five testers):**

- Track first-attempt clear for Bram and Sedge (target ≥75% and ≥70% respectively — these are the on-ramp).
- After each act-boss loss, ask: "What would you change?" A player with an answer passed; silence means the Whisper system needs that fight's line sharpened.
- After Ilvane: "When did you understand Phase III?" — the correct answer is "before the fight" (Ch1 gear framing) or "at the copy" (acceptable); "never" is a signpost failure.

**Red-line metrics:** any wall <25% clear for its *intended* build ⇒ sheet bug, not tuning; median campaign attempts per fight >2.2 ⇒ the curve is lying about its own Reading panels.

---

## 8. Open decisions for the owner

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D7 | P1/R1 — the +2 | Declare it intentional ("practice of the dead") or rebuild 21 sheets to the old formula | **Declare intentional.** The sheets are good; the sentence was wrong. |
| D8 | R2 — Fatigue | Doubling + Last Bell, or linear + hard round cap | **Doubling + Last Bell.** One schedule, a climax rule, an assert that is true by construction. |
| D9 | R3 — loss loop | (a) only, (a)+(b), or all three incl. Dampened Bell | **All three.** (c) is the only honest answer to the sub-floor player, and it is opt-in. |
| D10 | R5 — Mother Bell | Authored levers for Warden/Cantor, or accept it as a declared DoT-gate | **Levers.** Two stranded classes at an act boss is a churn point, not a philosophy. |
| D11 | R6 — Corvane | Lock counterbuild per run, or allow re-picks on Re-bell | **Lock.** Re-picks make the mirror-match farmable. |
| D12 | R7c — Bram | 148 HP (candle mandatory most runs) or 120 HP (candle optional) | **120**, pending Phase-8 first-attempt telemetry. |
