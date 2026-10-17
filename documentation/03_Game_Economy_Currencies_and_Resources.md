# 03 — Game Economy: Currencies, Costs & Resources

**The Ashen Choir — Systems Design Review, Document 3 of 5**

| | |
|---|---|
| **Scope** | Every scarce thing the player manages: in-fight Resolve, HP, stat allocations, gear/verse slots, XP, items and their drop rules, the Ledger House vendor's "memories," Toll rating, and the Echo Code sharing economy. |
| **Source of truth** | `THE-ASHEN-CHOIR-v1.md` — principally §5.3 (Resolve), §7–8 (vows, gear, loot rules), §12 (Choir Floor), §13 (progression). |
| **Status** | Design review. Nothing here is canon until you approve it. |
| **Tag legend** | `[CANON]` restated · `[CLARIFICATION]` · `[PROPOSAL]` · `[DECISION NEEDED]` · `[ASSUMPTION]`. |
| **Companion docs** | 01 (XP amounts — owned there), 02 (difficulty), 04 (motivation), 05 (retention), 00 (change log). |

---

## 1. Current system, restated

### 1.1 The in-fight economy: Resolve `[CANON]`

Resolve is the game's only combat currency. Start of fight: 3 (second mover: 4). Each turn begins with +3, cap 10. Verses cost 0–6; cooldowns gate repeats. **Strike** costs 0, deals `2 + 0.4 × main stat`, and refunds +1 — so a fighter can always act, and banking Resolve by Striking is a real decision. **Hush** reduces Resolve gain by 2 (floor +1) for 2 turns; **Vigil's Rest** (common, cost 1, CD 3) grants +4 Resolve and removes 1 debuff; **Fan the Flames** (Witch, cost 0, CD 3) grants +4 Resolve at 4 true damage to self. Deaf Wax and Vigil's Ring/Keeper's Ring-class effects grant Hush immunity or free Braces. The published anti-starvation rule: Hush never takes a fighter below +1/turn.

### 1.2 The build economy: allocations and slots `[CANON]`

- **22 discretionary stat points per run** (4 at creation + 2×9 levels) across five stats. Respec is free at shrines, with a rewind ledger.
- **4 verse slots** from 42 verses (6 common + 9 per class). Slot order is the Echo's AI priority.
- **1 vow slot** from 23 vows (12 class, 11 story-earned).
- **3 gear slots** (Weapon / Vestment / Relic) from 41 items; each item = small stats + one rule-bending mark. No random stats, ever.

### 1.3 The item economy: sources `[CANON]`

Per §8.4: campaign fights award **fixed** items (always); the chapter choice grants a choice-item on top; bosses always drop their signature item plus a random from their own table; **Choir Floor wins drop at 12%, weighted toward class affinity, pity rule at 30 wins**; the Ledger House vendor (Act II) sells **3 items for memories you no longer have** — "a currency mechanic that makes 'give up a memory' a real, visible cost." Two items carry Floor-flavored sources in the §8 tables (Drowned Mantle, "Ch3 — Choir Floor"; Salt Widow's Comb, "Choir Floor — named Echo").

### 1.4 The social economy: Toll and Echo Codes `[CANON]`

- **Toll** is the rating: Elo, K = 32, everyone starts at 1000. Matchmaking suggests opponents within ~150 Toll. The Floor holds 8 hand-built NPC Echoes rated 800–1400 plus imported player Echoes.
- **Echo Codes** serialize a build to base64 JSON with validation (level bounds, stat-point caps, verse/gear/vow legality). No trading, no selling, no server — the only "economy" between players is challenge and reputation. v2 of the format adds `"rite"` and a `"talley"` field (sic — the typo is in the GDD).

### 1.5 What the GDD gets right — do not touch `[CANON]`

- **The game is deliberately anti-materialist.** There is no gold, no shop-and-grind loop, no consumables, no durability. Everything scarce is *build-shaped* (points, slots, vows) or *narrative-shaped* (memories). This is a design identity, not an omission, and every fix below preserves it.
- **No random item stats.** "Randomness belongs in the fight, not in the shopping" — the single most importable sentence in §8.
- **Free respec with a rewind ledger.** The allocation economy is a playground, not a trap; the Reshape Ledger makes experimentation literally costless.
- **Echo Codes as the only player-to-player economy.** Challenges and reputations, not markets. It cannot inflate, cannot be farmed for advantage, and matches the fiction (Echoes are given, not sold — except by Pell, which is the point).

---

## 2. Problems

### P1 — The vendor's "memories" have no defined cost. `[C]`

§8.4 promises the Ledger House vendor makes "give up a memory" a real, visible cost — and then defines nothing. What is a memory? Where do they come from? What happens when you spend one? Does it touch the tallies (the choice system), the Echo (the build), the endings (the epilogue), or nothing at all? As written, the vendor is either a trap that will ship broken (a cost the code cannot compute) or a free shop (three items for nothing). This is the game's **only sink outside the build system**, and it is the one place where the economy can carry narrative weight — the Ch2 Ruthless option already taught the gesture ("sell him a year of your past. He lets you through smiling"), so the mechanic exists in the fiction three chapters before the shop opens. It needs rules, and R2 gives them.

### P2 — The Floor's drop pool is undefined. `[H]`

"12% chance to drop an item you do not own, weighted toward your class affinity, with a pity rule at 30 wins" — dropping from *what*? The §8 tables give only two items Floor sources. If the pool is all 41 unowned items, players can fish for choice-gated exclusives (Marrow-Furnace without the kill, Corvane's Blade without the mercy) — which cheapens the choice system. If the pool is 2 items, the 12% faucet dries after two drops and the pity counter is a lie. R3 defines the pool in a way that *strengthens* the choice system instead of bypassing it.

### P3 — Toll has no opponents above 1400 and no repeat-opponent decay. `[H]`

The strongest NPC on the Floor is rated 1400. A player at 1410 has nothing left to beat except themselves — and the spec is silent on what repeated wins against the same 800–1400 pool do to rating. Full Elo swings against farmable static opponents means Toll is a *time* measurement, not a skill one (fight Brother Ash forty times, climb to 1400). Single-player ladders need either decay rules or scaling opponents, or Toll stops meaning anything exactly when it should start meaning the most.

### P4 — The item faucet is unbounded over a lifetime but bounded over a run. `[M]`

12% per win with no stated cap on wins per day (your rhythm call: mixed, no daily gates) means a dedicated player empties the pool fast — which is *fine* if the pool is finite and dry-pool behavior is defined, and *broken* if the pool regenerates or the pity rule silently keeps rolling. R3 also defines dry-pool behavior.

### P5 — Resolve has one economy outlier. `[M]`

Audit of the six common hymns and all 36 class verses: **Vigil's Rest** (cost 1, gain +4, remove 1 debuff, CD 3) is a net +3 Resolve plus partial cleanse for less than the cost of a Strike. It is the strongest economic verse in the game by a wide margin — strictly better economy than anything else in the common pool, and better *value* than most class verses. It will be slot-locked into essentially every loadout at every level, which flattens loadout diversity (the thing the 42-verse library exists to create). It is not degenerate (CD 3 caps it; Hush still bites), but it is a "correct answer" in a game whose brand is "every strength has a hole." R5 fixes the hole without nerfing it into oblivion.

### P6 — Dead inventory is a real (if small) UX tax. `[L]`

41 items, 3 slots, no sell/dismantle, no equip-compare affordance specified. Late campaign, the Hymnal holds ~20 owned items of which 3 are ever relevant; the other 17 are lore the player must scroll past every reshape. The Codex (05 R4) is the right home for them; the Hymnal should stop pretending they're all loadout candidates.

### P7 — One item source is ambiguous. `[L]`

Drowned Mantle's source reads "Ch3 — Choir Floor." Is it the guaranteed first-Floor drop, a 12% roll, or campaign-fixed? R6 pins it.

### P8 — `"talley"` typo in the Echo Code v2 spec. `[L]`

Trivial, but it is the schema *players will hand-write*; fix before it ossifies.

---

## 3. Recommendations

### R1 — The Five Currencies (the map the docs share) `[CLARIFICATION — consolidation]`

| Currency | Faucet | Sink | Refill? | Owns the feel of |
|---|---|---|---|---|
| **Resolve** | +3/turn, Strike +1, Vigil's Rest, Fan the Flames, Kindling, turn-order tie win… | every verse cast | every turn | *tempo* |
| **HP** | heals, lifesteal, Long Dark, Mend the Mortar | damage taken, Fatigue, self-costs | per fight | *risk* |
| **Allocations** | +2/level, creation 4 | stat lines | never (respec free) | *identity* |
| **Slots** | level unlocks, item count | 4 verses / 1 vow / 3 gear | never | *choice* |
| **Toll** | Floor wins | losses | always | *standing* |

XP and items are **flows, not currencies** — they accumulate, nothing spends them. Writing the map down matters because every future balance argument ("is X too strong?") is really a question about which currency X prints or drains. The vendor (R2) is the one mechanic that deliberately converts a *narrative* asset into the build economy, which is why it needs the tightest rules in the game.

### R2 — The memory market, fully specified `[PROPOSAL — DECISION NEEDED]`

**What a memory is.** You hold nine — one per chapter choice made. They are not a counter; they are *the choices themselves*, visible in the Orrery as nine sealed lines. A memory cannot be sold before its chapter is complete (you cannot sell what you haven't lived).

**The vendor.** In Act II, Collector Pell's stall offers 3 fixed items (from the current pool — suggest: **Choir-Scale Blade, Reliquary Lantern, Hourglass of Ash**, all market-sourced in §8 already). Each costs **one memory**. You can buy 0, 1, 2, or 3. He never restocks; he never haggle-buys story vows or gear already owned.

**What selling does.** `[DECISION NEEDED between A and B]`

- **A — The Blank Ledger (recommended).** A sold choice is marked **"—sold—"** in the Orrery scroll: the line of prose remains, the tally contribution *remains* (you meant it when you meant it), but the epilogue's reading of you carries the blank, and Maren's final ledger line names it once: *"Three pages of you are in his book, not yours."* And one hard rule: **a run with any sold memory cannot reach the Unmake ending.** The counter-voice must be sung by someone who kept all of their name; that is not a punishment, it is the thesis. The vendor warns exactly once, in fiction: *"Pell does not sell back what the candle gives him."*
- **B — The Quiet Cost (lighter).** Sold choices lose their line in the Orrery and the Echo Code's tally field shows the blank; no ending gates change. Cheapest to build, weakest to feel.

**What selling never does:** touch stats, verses, gear already granted, story flags, ally states, or the tallies themselves. You are selling the *memory*, not the deed.

**Why A improves the experience:** the game finally has a sink that *means* something — a player staring at Hourglass of Ash (+2 HST) is weighing a stat line against a page of their own epilogue, which is the entire moral architecture of Verrow in one transaction. It is also self-balancing: the items are conveniences, not build-warpers, and the cost scales with how much the player values their own story. No other economy rule in the GDD carries this much weight for this little code.

### R3 — The Floor drop pool: "the unlived path" `[PROPOSAL]`

Define the 12% drop pool as, in priority order:

1. **Choice-items from paths you did not take** (weighted ×2 toward your class affinity): the Marrow-Furnace you didn't claim, the Blade you didn't take, the Mace you didn't lift. These are the true "missables" — roughly 9–10 items across a run.
2. **The two canon Floor items** (Drowned Mantle, Salt Widow's Comb) if unowned.
3. **Dry-pool rule:** when every pool item is owned, drops stop rolling and each win instead advances a visible **+1 Wax bank** (pity-carry: 30 banked = first item of the *next* content drop or NG+ is granted at bind). The faucet never lies and never stalls mid-promise.

**Pity stays 30 wins**, counter shared across pool priorities, reset only on a drop.

**Why this pool:** it converts the Floor from a duplicate-printer into **the place where your Echo brings home the life you didn't choose** — which is almost embarrassingly on-theme for a game about Echoes replaying fights. It also fixes completionism honestly: a completionist runs 2–3 campaigns *by choice* (to live the other paths) or grinds the Floor for the ghosts of them, and both routes are legible. It does not cheapen choices: the choice paths still grant their item *immediately and free* — the Floor path costs 30-wins-pity expectation, i.e., the item is bought with time, not with the deed.

### R4 — Toll: decay, recasts, and a ceiling that isn't `[PROPOSAL]`

- **First win vs any opponent pays full Elo** (K = 32 × expected-swing). **Repeat wins vs the same opponent in the same run pay ±2 flat** (win/loss symmetric). Farming Ash is now worth 4 rating points, once.
- **The Recast.** When your Toll exceeds a named Echo's rating by more than 150, that Echo returns **recast**: +1 level on their sheet, one verse swapped for their counter-answer to the meta they've been watching, rating re-anchored to `your Toll − 100`, and one new history line (*"Brother Ash has been listening."*). Each named Echo can recast up to three times (level cap 10 still binds). Eight Echoes × three recasts = **a ladder that climbs with you to ~1900 without a single new asset.**
- **Losses to NPCs pay half** (`−K × expected × 0.5`) — the Floor is where you *practice*; it should not bleed you like ranked PvP does.
- Imported Echoes always pay full Elo both ways — they're players, even when they're someone else's file.

**Why:** Toll must remain a *standing* currency (R1) — a measure of what your build has proven. Decay kills the farm; recasts kill the ceiling; the half-loss keeps practice cheap without making losses free.

### R5 — Vigil's Rest: give the hole back `[PROPOSAL]`

Cost 1 → **cost 2**, and remove the cleanse rider's free ride: *"Gain +4 Resolve and remove 1 debuff; you cannot cast it two turns in a row"* is overbuilt — the CD 3 already caps that. Just: **cost 2, CD 3, effect unchanged.** Net economy drops from +3 to +2, which is still the best dedicated economy verse in the game (it should be — it's the "breathe" button) but no longer beats class verses' *total* value at equal slots. `[PROVISIONAL: if harness shows <30% of high-Toll loadouts running it, it's tuned; >70% means cost 3.]`

### R6–R8 — Small fixes `[CLARIFICATION]`

R6: Drowned Mantle = **guaranteed drop on your first Floor win** (teaches the drop system with a gift, matches "Ch3 — Choir Floor" source). R7: Hymnal splits owned-but-unslottable items into a collapsed "kept" row with the Codex link (05 R4 owns the Codex spec). R8: `"talley"` → `"tally"` in the v2 Echo Code schema, before anyone hand-writes a parser.

---

## 4. Revised spec — ready to paste

**§8.4 Loot rules, revised lines:**

> - **Choir Floor wins** drop from the **unlived-path pool**: choice-items from paths you did not take (weighted ×2 toward your class affinity), then the two Floor-native items. 12% per win, pity at 30 wins, reset on drop. Dry pool → each win banks +1 Wax (30 Wax = first drop of the next content tier).
> - **Drowned Mantle** drops guaranteed on your first Floor win.
> - **The Ledger House vendor** sells 3 fixed items for **one memory each**. A memory is one of your nine chapter choices; selling marks it *—sold—* in the Orrery, keeps its tally and rewards, and **closes the Unmake path for that run** ("Pell does not sell back what the candle gives him"). Never restocks.

**§12.4 Choir Floor, revised lines:**

> - Toll: Elo, K = 32, start 1000. First win vs an opponent pays full swing; repeats vs the same opponent in a run pay ±2. Losses to NPC Echoes pay half. Losses to imported Echoes pay full.
> - **Recasts:** any named Echo whose rating sits >150 below your Toll returns recast (+1 level, one counter-verse swapped, re-anchored at your Toll − 100, new history line), up to three times each.

**Common hymn table, one row changed:**

> | Vigil's Rest | **2** | 3 | Gain +4 Resolve and remove 1 debuff |

---

## 5. Worked examples

### 5.1 One transaction at Pell's stall

Kestrel the Ashblade, Chapter 5, standing at the market stall with six chapters lived. Pell offers the **Hourglass of Ash** (+2 HST, +1 starting Resolve) for one memory. Kestrel's Orrery holds six lines; the Ch2 line reads *"You paid the toll in memories"* — he already sold a year of his past to a gate, and the game taught him the gesture before it charged him for it. He sells the Ch4 line (*he disarmed Ysolde and let her live*). Nothing mechanical changes: the Warden's Oath vow he earned by that choice still works, his Ruthless count is untouched, Corvane still fights him in an hour. But in the epilogue — weeks away — Maren will read a ledger with a hole in it, and if he was ever hunting the counter-voice, the hunt ended at this stall, and the game told him so exactly once, in a shopkeeper's smile. **That is a real economy: the currency is self, the price is displayed, the refund is never.**

### 5.2 The faucet, drained honestly

A completionist's Floor ledger, post-campaign: 16 pool items remain (10 unlived-path, 2 Floor-native, 4 vendor items skipped — vendor items are *not* in the drop pool, they stay Pell's). At 12% per win: expected wins per drop ≈ 8.3; pity caps any drought at 30. Full drain: ~95–130 wins ≈ 8–12 sittings of an hour. Every drop is a *name they recognize* (they saw the other path's item in the calendar), not a stat-salad dupe. Then the pool dries, the Wax bank starts counting, and the player's 131st win banks toward the next content tier instead of printing junk. The faucet starts honest, runs dry loudly, and stops.

### 5.3 The five currencies in one turn

Round 7 of Oren (doc 02's attrition exam). Resolve: banked 9 from two Strikes last round — spent on Gravebind (4) to answer her Stun rhythm; HP: 61/140 — Long Dark's 4%/turn is the only sustain and it is losing to Fatigue's telegraph three rounds out; Allocations: untouched since the Ch7 shrine (the rewind ledger shows he tried WIT-heavy and rewound); Slots: the 4th slot has held Crypt Door all campaign and was re-slotted to Last Rites *for this fight* — the slot, not the item, is the scarce thing; Toll: irrelevant here, and that's the design — the campaign spends identity, the Floor spends standing, and neither buys the other.

---

## 6. Test plan

**Harness / unit asserts:**

1. **Faucet audit (property test):** for every economy source, simulate 10,000-fight horizons and assert the cumulative payout is bounded — XP by the 01 decay curve, items by pool exhaustion, Toll by repeat-decay ±2, memories by 9. No source may be unbounded. (This test would have failed pre-R3/R4 — that's the point.)
2. **Drop-curve sim:** 100-win horizon → expected 10–13 drops, max drought ≤ 30, zero post-dry-pool drops. Vendor purchase parity: a 3-memory run's item delta vs a 0-memory run ≤ 2 items' stat value — the shop can never be *required*.
3. **Toll sim:** 500 simulated players vs the NPC pool (with recasts): median rating after 100 games 1150–1350; zero players stuck with no available opponent at any rating ≤ 1900; repeat-opponent rating income ≤ 5% of first-opponent income at 50 games.
4. **Resolve economy assert:** no verse sequence sustains net positive Resolve above +4/turn beyond income for 3 consecutive rounds (Vigil's Rest at cost 2 must pass; at cost 1 it fails — that's the bug the test exists to catch).
5. **Schema test:** Echo Code v2 round-trips with `tally` (fixed spelling), rejects invalid allocations, and *dampened*-run exports byte-match full-stat sheets (02's assist invariant).

**Playtest protocol:**

- Watch five testers meet Pell. If nobody hesitates, the memories are priced wrong (too cheap). If everyone refuses, the items are priced wrong (too weak). You want a beat of silence and then a decision — that beat is the whole mechanic working.
- Post-campaign interview: "What did the Floor give you?" — correct answers are names (*"the Scythe I didn't take"*), not stats. Stat answers mean the unlived-path weighting is upside down.
- Track Vigil's Rest slot rate across tester loadouts at Ch4 and Ch8 (target <70% after R5).

**Red-line metrics:** any pool item with >1,000-wins-or-never acquisition shape (drop-weighting bug); Toll median stagnation at exactly the NPC ceiling (recast system offline); Orrery *—sold—* rate >25% of choices economy-wide (memories priced too cheap — narrow the vendor's item pool, never raise the price; the price is the point).

---

## 7. Open decisions for the owner

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D13 | R2 — memory cost | A: Blank Ledger + Unmake gate; B: cosmetic blank only; C: no cost (free shop) | **A.** The Unmake gate is the thesis, not a punishment — and it is disclosed in fiction. |
| D14 | R2 — vendor stock | The 3 market items listed, or your pick of any 3 non-exclusive items | Listed 3; all are conveniences, none are build-warpers. |
| D15 | R3 — drop pool | Unlived-path pool, or all-unowned pool, or 2-item canon pool | **Unlived-path.** It's the only pool that strengthens the choice system. |
| D16 | R4 — recasts | Ship recasts, or leave the ceiling at 1400 until the shared ladder (Phase 9) | **Ship.** Phase 9 may never come; the ceiling is here now. |
| D17 | R5 — Vigil's Rest | Cost 2, or leave at 1 and accept the auto-slot | **Cost 2.** "Every strength has a hole" applies to the common pool too. |
