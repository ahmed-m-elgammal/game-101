# 01 — Rewards, Levels, Quests & Unlocks

**The Ashen Choir — Systems Design Review, Document 1 of 5**

| | |
|---|---|
| **Scope** | Everything the player earns: XP and levels, stat points, verse unlocks, vows, gear, story-choice rewards, and the unlock calendar across the 9-chapter campaign and the Choir Floor. |
| **Source of truth** | `THE-ASHEN-CHOIR-v1.md` — principally §3 (story architecture), §6 (verses), §7 (vows), §8 (gear & loot rules), §12 (Choir Floor), §13 (progression). |
| **Status** | Design review. Nothing here is canon until you approve it. |
| **Tag legend** | `[CANON]` = restated from the GDD, unchanged. `[CLARIFICATION]` = resolves an ambiguity without changing intent. `[PROPOSAL]` = new or changed design, fully specced. `[DECISION NEEDED]` = fork in the road; you pick. `[ASSUMPTION]` = I assumed something the GDD does not state; correct me and the numbers move. |
| **Companion docs** | 02 (difficulty/pacing), 03 (economy), 04 (motivation), 05 (retention), 00 (change log). |

---

## 1. Current system, restated

This section restates the reward and progression systems exactly as v1.0 defines them, so this document stands alone.

### 1.1 What a player can own `[CANON]`

A build in The Ashen Choir is five things, and the GDD is explicit that they are not equal in power:

1. **A class** — Ashblade, Cinder Witch, Gravewarden, or Hollow Cantor. Fixed at creation, defines base stats (27 points across VIG/MIG/WIT/GRD/HST), damage type, and the verse pool.
2. **A stat spread** — 4 free points at creation, +2 per level, level cap 10. That is **22 discretionary points** over a full run (4 + 2×9). Max HP = 60 + 8 × VIG.
3. **Four slotted verses** — chosen from 6 common hymns plus 9 class verses unlocked at levels L1 through L7. Slot order is also the Echo's AI priority order on the Choir Floor, so a loadout is both a kit *and* a script.
4. **One vow** — the build-defining rule. 12 class vows at creation; 11 story vows earned from specific campaign choices (23 total).
5. **Three gear slots** — Weapon, Vestment, Relic, from 41 hand-written items. Each item gives small stat bonuses and one **mark** (a passive that bends a rule). No random stats anywhere.

The GDD's own hierarchy, stated in §7.2: *"Earning a vow is the single strongest reward in the game, because a vow redefines the build."* The final boss's Phase III mechanic (it copies your most-cast verse, but not your marks or vow) makes that hierarchy **load-bearing**: power stored in gear and vows is final-boss-proof; power stored in verse coefficients is not.

### 1.2 XP and levels as written `[CANON]`

- Level cap 10. Cumulative XP thresholds: **0, 40, 100, 180, 280, 400, 540, 700, 880, 1080** (i.e., each level-up costs 40, 60, 80, 100, 120, 140, 160, 180, 200).
- The campaign is "tuned to finish around **level 7**" (§13); "Arena wins carry the player to 10" (§13).
- The act table (§3) bands each chapter: Ch1 (L1–2), Ch2 (L2–3), Ch3 (L3–4), Ch4 (L4–5), Ch5 (L5–6), Ch6 (L6–7), Ch7 (L7–8), Ch8 (L8–9), Ch9 (L9–10).
- "Chapters are tuned for the level you arrive at. If you over-level (via the Choir Floor), the fights get harder *and* drop better gear — grinding is a real strategy, not a trap" (§3.0).
- Choir Floor wins "give XP" (§12.4) — amount unspecified.

### 1.3 Unlocks as written `[CANON]`

- **Verses:** each class's 9 verses unlock at L1 (3 verses), L2, L3, L4, L5, L6, L7 — so the 4-slot loadout grows in options throughout the campaign, with the ninth and final class verse arriving at L7.
- **The Choir Floor** unlocks at the end of Chapter 3 (§3, "Unlocks: the Choir Floor"), which the GDD calls the moment "the game stops being a single-player RPG."
- **Story vows:** 11 of them, earned by specific choices (§7.2). Examples: Ninth Sister's Vow (Ch4 Devotion), Ledger's Price (Ch5 contract), Twelve Tolls (Ch6 Ruthless), Fixed Point (Ch7 Devotion).
- **Items:** campaign fights award **fixed** items; chapter choices grant a choice-item on top; bosses drop signature items; Choir Floor wins drop at 12% with a pity rule at 30 wins; the Ledger House vendor sells 3 items in Act II (§8.4).
- **Endings/titles:** 10 endings; the title is permanent on the ladder profile; the hidden **Unmake** ending is gated on run-wide conditions (tallies ≥3 Mercy and ≥3 Devotion, fewer than 3 unlocked Burn verses, and having lost to your own bound Echo at least once).

### 1.4 The nine story choices as rewards `[CANON]`

Each chapter carries exactly one 3-option choice mapped to the hidden tallies (Mercy / Ruthless / Devotion). Choices are simultaneously narrative and mechanical: they grant items (Pallbearer's Mace / Sexton's Shroud, Ch1), stat points (+1, Ch3 Mercy), boons (a free verse swap, Ch3 Devotion), story vows (Ch4, Ch5, Ch6, Ch7, Ch8), permanent stat gains (+1 starting Resolve forever, Ch6 Ruthless), and ally state (spared Corvane joins your ladder; the turned pour fights beside you in Ch9). All three Ch1 paths "also grant the item" (§3, Ch1 choice note).

### 1.5 What the GDD gets right — do not touch `[CANON]`

Before the criticism, four things this document will defend rather than change, because they are the spine of the reward experience:

- **The reward hierarchy (vow > verse > item > stat point).** It gives every reward tier a distinct *feel*: a stat point is a nudge, an item is a tool, a verse is a new verb, a vow is a new identity. Players can feel the difference, which is what makes a 10-level game with no loot rarity colours work.
- **Choices as rewards.** The nine choices never ask "which reward do you want?" — they ask "who are you?" and pay you *afterward*. The reward is a consequence, not a price tag. This is the correct inversion for a game about what you were.
- **Free reshaping + the Reshape Ledger** (§13). Every shrine re-slots verses, swaps vows, and reassigns stat points for free, with one-click rewind. Experimentation is free; the Echo only changes when re-bound. This is the single best player-respect rule in the GDD.
- **Fixed loot, no random stats** (§8.4). "Randomness belongs in the fight, not in the shopping" is the right call for a legible-randomness game and must survive every fix below.

---

## 2. Problems

Severity: **C** critical (blocks ship), **H** high (damages the experience), **M** medium (visible roughness), **L** low (polish).

### P1 — The XP economy does not exist. **[C]**

The GDD defines nine XP thresholds and then never defines a single XP source. No fight, chapter, choice, or Floor win states an XP award. This is the one system in v1.0 that is genuinely unbuildable as written: `data/story` cannot pay out what `data/economy` never mints. Everything downstream depends on it — the act-level bands (§3), the "campaign finishes at 7" claim (§13), the "grinding is a real strategy" promise (§3.0), and the pacing of every unlock (verses at L1–L7, the Choir Floor's difficulty at Ch3). Without an XP economy, the level column of the act table is a hope, not a rule.

### P2 — The campaign's target level contradicts itself. **[C]**

§3's act table says Chapter 9 is played at **L9–10**, with L10 enemies (Ilvane's Second and Ilvane are both L10, built on a 51-point budget). §13 says the campaign "is tuned to finish around **level 7**." Both cannot be true. A player who arrives at the Bellmouth at L7 fights a 51-point-stat, 420-HP three-phase boss with 6 fewer stat points, and — worse — with the L7 unlock being the *last* verse unlock, they get nothing new for the entire act. I believe §13's sentence is a stale remnant of the 0.1.0 five-chapter draft (Appendix B confirms the re-cut), but it is stated as canon, so it must be resolved explicitly rather than silently. This document resolves it toward the act table (see R2) because the act table is consistent with the enemy roster and with the level-gate design note in §3.0.

### P3 — "Over-level and fights get harder" punishes the game's best system. **[H]**

The Choir Floor unlocks mid-campaign (end of Ch3) as the GDD's flagship system. The stated response to a player who engages with it — levels up through it — is that campaign fights get harder. That trains players to avoid the Choir Floor until after the credits, which inverts Pillar 3 ("async PvP is not a side mode") during exactly the chapters where habits form. The second clause, "and drop better gear," is also contradictory: §8.4 says campaign fights award **fixed** items, so there is no mechanism by which an over-levelled campaign fight could drop anything, better or otherwise. The *intent* behind the rule is sound — grinding shouldn't trivialize the walls — but the execution as written is a punishment with a dangling reward promise. Fix: keep walls walled with a bounded, honest scaling rule, and replace the phantom "better drops" with a reward that exists (R3).

### P4 — The Chapter 3 Devotion reward is worth zero. **[H]**

Ch3's choice grants: Ruthless → Cantor's Tuning Fork (an item), Mercy → +1 stat point, Devotion → "a free verse swap at any shrine in Act II." But §13 already makes reshaping — verses, vows, stat points — **free at every shrine in the campaign**, with a rewind ledger. A "free verse swap" is already free. One of the three paths of the game's first act-final choice currently awards nothing. This matters beyond fairness: Ch3 is the act boss choice, the Devotion option is the "first unambiguously Vigil-like act" in the story, and its mechanical answer is a null. Players who chose it will eventually read the Hymnal screen, realize reshaping was always free, and conclude the game lied to them about their reward. Replacement proposed in R4.

### P5 — Two rewards exist twice, in two different systems. **[M]**

- **Ysolde's Vow.** §7.2 lists story vow *Ninth Sister's Vow* (Hollow Cantor, Ch4 Devotion): "Hush power +1, Curse lasts +1 turn." §8.3 lists relic *Ysolde's Vow* (Cantor, Ch4 Devotion): "Hush +1 power, Curse +1 turn." Same source, same effect, two different rewards in two different slots. A Cantor taking Ch4 Devotion is owed both by one table and one by the other.
- **The Gate ring.** Ch8 Ruthless prose says "**Vigil's Ring.** +3 GRD and Brace is free." §8.3 lists relic *Vigil's Ring* (+3 GRD, Brace costs 0 Resolve, Ch8 Ruthless). §7.2 lists story vow *Keeper's Ring* (Gravewarden, Ch8 Ruthless): "+3 GRD, Brace costs 0 Resolve." Same choice, same effect, relic *and* vow.

Duplicates like this are balance bugs waiting to load: whoever implements them will ship both, and Ch8-Ruthless Gravewardens will start fights with +6 GRD and two sources of free Braces. Fix in R5.

### P6 — The last verse unlock arrives with no runway. **[M]**

Class verses unlock L1–L7; the ninth verse lands at L7. Under the act table, L7 is reached during Chapter 7 — meaning the final verse unlock lands one or two fights before the final boss, inside the act where the game is *deliberately* testing "everything you saved." One reading says that is intentional (the finale consolidates); a fairer reading says a player never gets to *master* their newest verb before the game asks them to graduate. The resolution here is not to move the unlock (that would renumber every verse table) but to make the arrival *deliberate* — a designed consolidation beat with a shrine beside it (R6).

### P7 — There are no optional objectives, and the game is poorer for it. **[M]**

The campaign is 21 mandatory fights and 9 mandatory choices. The Choir Floor is the only optional system, and it does not unlock until Ch3. Before that, Ch1–2 are strictly on rails: fight, prose, choice, fight, prose, choice. A "quests and unlocks" review that found nothing to add would be ignoring the weakest hours of the game — but the fix must be featherweight, diegetic, and completely ignorable, because the GDD's pacing philosophy ("short fights, readable logs") is correct. R7 proposes nine one-line optional objectives, buildable as data in under a day.

### P8 — Choir Floor XP is undefined and unbounded. **[H]**

" Wins give XP" (§12.4) is the entire specification. No amount, no repeat-win rule, no relationship to opponent level. Without one: a player who duels Brother Ash forty times before Chapter 4 either earns nothing (grinding is dead, P3's promise broken again) or arrives at Chapter 9 at L10 (the act bands are dead). The XP economy in R1 therefore includes Floor XP with diminishing returns per opponent — no time gates, no daily caps (per your "mixed rhythm" call), just per-opponent decay.

### P9 — The post-campaign reward ceiling is a cliff. **[M]**

At L10 with 41 items seen and 42 verses unlocked, the only remaining rewards are Toll rating and 12% duplicate drops. This is a retention problem more than a rewards problem, so it is specced in **05** (§5, the Second Verse and the Echo Codex); this document only stakes the claim: the *reward* layer ends at the ending, and something must sit past it.

### P10 — Ch1's "all three paths also grant the item" is ambiguous in prose. **[L]**

§8.1 sources imply the mapping (Pallbearer's Mace = Ch1 choice, Sexton's Shroud = Ch1 choice, Grave-Shovel of Bram = Ch1 choice — one per path), but the choice text says only "the item." R9's unlock calendar makes the mapping explicit: Ruthless → Mace, Mercy → Shroud, Devotion → Shovel. One sentence of prose fixes it.

---

## 3. Recommendations

### R1 — The XP economy `[PROPOSAL]`

One formula, four roles, two decays. Every number below is `[ASSUMPTION/PROVISIONAL]` and exists to make the act table true; the harness (§7) asserts the fit.

**Per-fight XP:**

```
XP(fight) = round( (10 + 4 × enemy_level) × role )
```

| Role | Multiplier | Where |
|---|---|---|
| Regular | ×1.00 | First fight of any chapter; all fights of 2-fight chapters except the second |
| Complication | ×1.25 | Middle fight of 3-fight chapters (Duel 6 Pell, Duel 13 Halbrey, Duel 20 Ilvane's Second) |
| Boss | ×1.75 | Second fight of 2-fight chapters; act bosses (Duels 7, 14, 21) |
| Chapter completion | +10 flat | Paid once, when the chapter's prose closes |
| Story choice | +0 | Tallies are never purchasable — no choice ever pays XP |

**Choir Floor XP (no time gates, per-opponent decay):**

```
XP(floor win, opponent O) = 8 + 2 × level(O)   on the first win vs O in this run
                          = 50% of the above   on every repeat win vs the same O   (min 4)
                          = 25% of the above   if level(O) ≤ your level − 2
First Echo bound: +15.  First Echo Code imported and fought: +10.
```

**Anti-double-dip:** a fight pays XP exactly once per run — the first time it is cleared. Re-bells and re-fights after a loss pay nothing extra ("the bell does not ring twice for the same fight"). Losing and eventually clearing pays full XP; there is no loss penalty.

**Why this shape:** `10 + 4L` keeps early fights meaningful (a L1 regular is worth 14 XP — 35% of the first level-up) and late fights proportionate (a L10 boss is 88 XP against a 200-XP final level). The role multipliers make the fight *kinds* feel different in the ledger: bosses pay ~1.75× and players will read that as "walls are worth breaking." The Floor's per-opponent decay kills infinite grinding without touching rhythm — a player can duel all day, but the *ninth* win against Brother Ash is worth 4 XP, and the game shows that number honestly in the post-fight report.

**The full campaign walk** (zero Choir Floor play, all fights cleared first try):

| Ch | Fights (L, role, XP) | Chapter | Total | Cumulative | Level on arrival | Act band `[CANON]` | Fits? |
|---|---|---|---|---|---|---|---|
| 1 | Bram L1 reg 14 · Sedge L2 boss 32 | +10 | 56 | 56 | L2 | L1–2 | ✓ |
| 2 | Brack L4 reg 26 · Reaper L5 boss 40 | +10 | 76 | 132 | L3 | L2–3 | ✓ |
| 3 | Choristers L4 reg 26 · Pell L6 comp 43 · First Vespers L7 boss 67 | +10 | 146 | 278 | L4 | L3–4 | ✓ |
| 4 | Sable L5 reg 30 · Ysolde L7 boss 66 | +10 | 106 | 384 | L5 | L4–5 | ✓ |
| 5 | Wick Lad L5 reg 30 · Corvane L7 boss 66 | +10 | 106 | 490 | L6 | L5–6 | ✓ |
| 6 | Grast L7 reg 38 · Halbrey L8 comp 53 · Mother Bell L8 boss 74 | +10 | 175 | 665 | L7 | L6–7 | ✓ |
| 7 | Yune L8 reg 42 · First Movement L9 boss 81 | +10 | 133 | 798 | L8 | L7–8 | ✓ |
| 8 | Tide-Bound L9 reg 46 · Oren L9 boss 81 | +10 | 137 | 935 | L9 | L8–9 | ✓ |
| 9 | Chorus L9 reg 46 · Second L10 comp 63 · Ilvane L10 boss 88 | +10 | 207 | 1142 | L9 → L10 after the boss | L9–10 | ✓ |

Read that table as the design's promise: **the player arrives at every chapter inside its band, fights the entire finale at L9, and crosses 1080 (L10) on Ilvane's corpse.** The epilogue says you were level 10; the Bellmouth says you earned it there. Optional objectives (R7) add at most +45 XP across the run — half a level of drift, absorbed by the band widths.

### R2 — Strike "the campaign is tuned to finish around level 7" `[PROPOSAL — resolves P2]`

Replace the §13 sentence with: *"The campaign naturally delivers L9 by the Bellmouth; L10 is crossed by the finale itself or earned on the Floor."* The act table, the enemy roster (L9–L10 enemies in Act III), and §3.0's level-gate note all support this reading; the "finishes at 7" line matches nothing else in the document and dates from the 0.1.0 five-chapter cut. Note the pleasant consequence: **"arena wins carry the player to 10" stays true** but stops being *required* — the Floor is now a parallel path to L10, not the only one.

### R3 — Soft level-sync replaces "harder fights + better drops" `[PROPOSAL — structural, DECISION NEEDED]`

Keep walls walled without punishing Floor engagement:

```
If the player's level exceeds the chapter band's ceiling by N levels (N capped at 3):
  each campaign enemy in that chapter gains +1 stat point (auto-allocated to its
  heaviest stat) and +4% max HP, per level of N.
  N > 3: no further scaling — the wall holds at +3.
```

- Enemies stay **fixed published builds** at or below the band (the Reading panel and the harness keep working — no dynamic balancing of a static roster).
- **The phantom "better gear" line is struck.** It cannot exist under §8.4's fixed-loot rule. Replacement reward: each chapter completed while over-levelled advances the **Choir Floor pity counter by +1** (of 30) — a small, honest, deterministic credit toward a guaranteed drop.
- Over-levelled fights pay **25% XP** (they are past their level), so grinding converts into comfort and pity progress, not runaway levels.

**Why this improves the experience:** the player who loves the Floor gets to keep loving it mid-campaign; the campaign keeps its teeth; nothing is hidden. The Reading panel simply shows the adjusted sheet, because honesty about scaling is the entire Bounded-Roll brand. **[DECISION NEEDED]** — the alternative is zero scaling (grinders trivialize the campaign; simplest to build). I recommend sync-at-+3.

### R4 — Replace the Chapter 3 Devotion reward with the Twin Ledger `[PROPOSAL — DECISION NEEDED]`

**The Twin Ledger** — *"The candle remembers a second way you held it."*
Unlocked by Ch3 Devotion. Effect: **unlock a second saved loadout.** Both loadouts live in the Hymnal; swapping between them is free at any shrine *and* on the pre-fight Reading screen, for the rest of the run (and both remain available on the Choir Floor after the ending — the Echo binds whichever was active). `[DECISION NEEDED]`

**Why this reward:** the three Ch3 paths currently pay Ruthless in *force* (Tuning Fork), Mercy in *growth* (+1 stat), and Devotion should pay in *flexibility* — that is the option's stated fantasy ("the flexibility reward, for players who want to experiment"). A second loadout is flexibility that (a) the other paths don't grant, (b) stays valuable for the entire run including the Floor, where a second doctrine-ready kit is genuinely strategic, and (c) is honest the moment you open the Hymnal. The fallback candidate — "once per fight, re-slot a verse after the Reading, Act II only" — is more dramatic but creates a mid-fight UI mode the game doesn't otherwise have. I recommend the Twin Ledger. **Whichever you pick, it must not be a reshaping discount; reshaping is already free.**

### R5 — Deduplicate the double rewards `[PROPOSAL]`

- **Ch4 Devotion:** keep the **story vow** (it is the stronger reward tier and §7.2 is the canonical table); **delete the relic row** from §8.3. If you want the Cantor to feel a stat bump, fold it in: *"The Ninth Sister's Vow — +1 WIT while equipped; Hush power +1; Curse lasts +1 turn."* Unify the name (pick **The Ninth Sister's Vow** or **Ysolde's Vow** — the vow table and the Ch4 prose currently disagree). `[DECISION NEEDED: name]`
- **Ch8 Ruthless:** keep the **relic Vigil's Ring** (it matches the choice prose verbatim); **delete the Keeper's Ring vow row** from §7.2. If you want a story vow in Ch8, it should move to the Mercy path ("Send her up first") — e.g., *"Oren's Post: while Braced, you cannot be Stunned"* — which currently grants no mechanical reward at all. `[DECISION NEEDED: cut, or move-to-Mercy]`

**Why:** duplicates are implementation hazards (both will ship, Ch8-Ruthless Gravewardens get +6 GRD), and both duplicates stole a reward slot from a path that currently pays nothing mechanical.

### R6 — Make the L7 verse unlock a designed consolidation beat `[CLARIFICATION → PROPOSAL]`

Do not move the unlock. Instead, name it: when the ninth class verse unlocks (L7, Chapter 7 — the act of the reveal), the shrine in that chapter carries a one-line inscription per class — *"The Ashblade's last verse is the one she swore she'd never need"* — and Maren's Ch7 line already addresses the build. The unlock that used to feel like a late arrival becomes the game's last deliberate gift before it starts taking things away. Cost: one data row per class. **Why:** P6's risk is emotional (players feeling under-prepared at the finale); the cure is framing, not renumbering — renumbering would ripple through enemy sheets, the Reading engine, and Corvane's counter table.

### R7 — "Tallies of the City": nine optional objectives `[PROPOSAL]`

One optional objective per chapter, unlocked from Ch1 (fixing the Ch1–2 deadness before the Floor exists). Format: a single line on the chapter's opening prose screen, phrased as a challenge rune; each is a *fight modifier*, not a fetch quest. Reward: **+5 XP, a Codex deed entry, and one Maren line** — nothing else, so the curve absorbs them (max +45 XP per run) and nobody is compelled.

| Ch | Objective (player-facing, one line) | Tests |
|---|---|---|
| 1 | *End the sexton's digging without your candle's mercy.* | Win Duel 1 without triggering the Candle of Saint Orrin |
| 2 | *Cross the toll with your purse unopened.* | Win Duel 3 having never spent above 6 Resolve in a single turn |
| 3 | *Learn the third chorister's note.* | Win Duel 5 while every slotted verse was cast at least once |
| 4 | *Take the book and lose nothing for it.* (if Devotion) | Reach the Ch4 shrine without losing a fight |
| 5 | *Give the crowd a fight worth narrating.* | Win Duel 10 with a critical hit in the final round |
| 6 | *Pour nothing of yours into the furnace.* | Win Duel 14 (Mother Bell) in 12 rounds or fewer |
| 7 | *Cast nothing twice in a row.* | Win Duel 15 without repeating a verse on consecutive turns |
| 8 | *Walk the drowned stair without a lamp.* | Win Duel 17 with zero Ward on your panel all fight |
| 9 | *Sing over him.* | Win the final fight having used your Phase-III-uncopied answer verse |

**Why this improves the experience:** each objective is a *mastery prompt* (doc 04's competence loop) disguised as a city legend; they give the 6–10 minute chapters a second read for players who want one, and they cost the game nothing in pacing because they are ignorable by design. They also quietly seed the Unmake hunt: objective 9 is a hint without being a hint.

### R8 — Define the Floor's first-time rewards `[PROPOSAL]`

Fold into R1's Floor XP table; additionally: **first Echo bound: +15 XP** and a ledger line (*"Your Echo takes its place on the Floor. It does not look up."*); **first Echo Code imported and fought: +10 XP**. These are onboarding rewards that pay for exactly the two actions the meta-game needs the player to take, once, at the moment the Floor opens (Ch3) — they are not engagement mechanics and they never repeat.

### R9 — Publish the unlock calendar `[CLARIFICATION — consolidation]`

One table, generated from data, shipped in the Hymnal as "The Vigil's Calendar." It lists, per chapter: verses unlocked, items sourced, vows earned, systems opened, and the choice rewards with their per-path item spelled out (fixing P10: Ch1 Ruthless → Pallbearer's Mace, Mercy → Sexton's Shroud, Devotion → Grave-Shovel of Bram — the mapping §8.1 already implies). **Why:** the game's promise is "no fight is a surprise"; the reward layer should keep the same promise. It also gives you a one-page audit artifact — when anything moves, the calendar diff is the review.

---

## 4. Revised spec — ready to paste

**§13 Progression, revised lines:**

> - Level cap: 10. XP thresholds: 0, 40, 100, 180, 280, 400, 540, 700, 880, 1080.
> - The campaign naturally delivers **L9** by the Bellmouth; the finale itself crosses into **L10**. Floor wins are a parallel path, not a requirement.
> - **XP:** regular duel `10 + 4×enemy level`; complication ×1.25; boss ×1.75; chapter completion +10; choices pay 0. Floor wins `8 + 2×opponent level`, first win per opponent per run; repeats 50% (min 4); 25% vs opponents ≥2 levels below you. First Echo bound +15; first code imported +10. A fight pays XP once per run.
> - **Level-sync:** chapter enemies scale +1 stat / +4% HP per player level above the band ceiling, capped at +3 levels; over-levelled chapters pay 25% XP and advance the Floor pity counter +1.
> - **The Twin Ledger** (Ch3 Devotion): a second saved loadout, swappable at shrines and pre-fight.

**Ch3 choice reward line, revised:**

> - **Learn their song.** *Devotion +1.* Grants the **Twin Ledger** — the candle remembers a second way you held it.

---

## 5. Worked examples

### 5.1 Two players through Act I

**Mira, Gravewarden, cautious.** Clears both Ch1 fights, takes the Shroud (Mercy), reads every prose screen, does the Ch1 and Ch2 Tallies of the City, binds her Echo at Ch3 (+15), wins two Floor duels vs Brother Ash (first: 8+16=24 XP; repeat: 12 XP) before the First Vespers. Ledger: 56 + 10 (objectives) + 76 + 10 + 137 + 25 (Floor) = 314 XP — she crosses into L5 (280) one fight *after* the act boss, exactly the band's outer edge, and the sync rule never triggers. Her Twin Ledger is unused (she took Mercy) but the calendar shows her what she left on the table, which is the correct feeling at a shrine: not punishment — invitation.

**Kestrel, Ashblade, grinder.** Treats the Floor like a second job from the hour it opens: 20 wins in the Ch3–4 window against a pool of 6 opponents (5 first-wins ≈ 8+2×avg6 ≈ 108; 15 repeats ≈ 4–12 each ≈ 96). Total ≈ 204 XP from the Floor by Ch5 — two levels of drift. Ch5's band ceiling is L6; Kestrel arrives at L7. **Sync: +1 level → Ch5 enemies gain +1 stat, +4% HP; fights pay 25% XP; one pity advance per chapter.** His Reading panels show the adjusted sheets before every fight. He is stronger, the walls still test him, and the ledger tells him why — the same honesty contract as the Wax Meter.

### 5.2 The reward a player actually feels, per tier

The XP economy's job is invisible; the reward *layers* are what players feel. At each tier the GDD's hierarchy survives intact under these proposals: a Tallies-of-the-City deed is felt as *recognition*, a stat point as *growth*, an item as *a new tool*, the Twin Ledger as *a new way to hold the build*, a story vow as *a new identity*, and L10 as *graduation*. No proposal above changes the relative weight of those feelings — it only removes the two places where the ladder had a missing rung (the null Devotion reward, the undefined XP) and one place where it had a duplicated rung (§R5).

---

## 6. Test plan

**Harness assertions (build into `sim`, alongside §15.3's targets):**

1. **Arrival-level fit.** Simulate 10,000 no-Floor runs (all four classes, three skill profiles: always-loses-one-fight, clean, perfect): level-on-arrival must land inside each chapter's band for ≥97% of runs. Failure ⇒ tune `10 + 4L` or the chapter bonus, not the bands.
2. **Grinder containment.** Simulate a "Floor-mad" profile (200 Floor wins pre-Ch5): Ch9 arrival ≤ L10, and total campaign XP ≤ 1.4× the clean run. Failure ⇒ deepen the per-opponent decay.
3. **Sync audit.** For every chapter and N ∈ {1,2,3}, the synced enemy sheet beats the unsynced sheet against the *intended* build by ≤ 15 percentage points of win rate (walls get harder; they must not become gates).
4. **Reward-integrity unit tests.** (a) No two rewards share an effect id and source chapter (kills the R5 class of bug permanently). (b) Every choice path grants exactly one tier-appropriate reward (item, stat, boon, or vow — never zero, never two). (c) Every item `Source` string resolves to a real fight/choice/vendor entry (would have caught the §8.3 "Choir Floor"-sourced Drowned Mantle ambiguity — see 03, P7).
5. **Calendar diff test.** The Vigil's Calendar is generated from data; a CI check asserts it matches the item/vow/verse tables byte-for-byte.

**Playtest protocol (fold into Phase 8's five-tester pass):**

- After Ch3: "What did your Devotion/Mercy/Ruthless choice give you?" — a player who cannot answer, or answers wrong, failed R4's clarity bar.
- After any Floor session mid-campaign: "Did the next chapter feel different? In a good way?" — calibrates R3's sync weight; +4% HP per level is the starting point, ±2% is the honest tuning range.
- Watch for the **shrine check**: count of players who open the Hymnal, see reshaping is free, and then go looking for the "free verse swap" they were promised. Should be zero after R4.

**Metrics (post-launch, opt-in only — see 05 §6 on the no-tracking stance):** median level on Ilvane attempt (target 9.0–9.4); % of runs with any sync active (target < 25%); Ch3-Devotion pick rate vs the other two paths (a healthy choice menu sits within ±15% of uniform; a collapsing pick rate signals the reward is under- or over-valued).

---

## 7. Open decisions for the owner

| # | Decision | Options | My recommendation |
|---|---|---|---|
| D1 | R2's level target | Keep "finishes at L7" (and re-band the whole act table + re-level the Act III roster), or adopt the L9/L10 read | **L9/L10 read.** The roster and bands already agree with it. |
| D2 | R3's sync rule | Bounded soft sync (+3 cap), or zero scaling | **Soft sync.** It is the only version where "grinding is a real strategy" survives honestly. |
| D3 | R4's Ch3-Devotion reward | Twin Ledger, or once-per-fight Act II re-slot | **Twin Ledger.** Less UI, permanent value, Floor-compatible. |
| D4 | R5's duplicates | Cut relic + keep vow (Ch4); cut vow + keep relic (Ch8); optionally grant Oren's Post to Ch8-Mercy | **Cut both duplicates; adopt Oren's Post** so Ch8-Mercy isn't mechanically bare. |
| D5 | R7's Tallies of the City | Ship all nine, ship a three-objective pilot (Ch1/5/9), or skip | **Ship all nine** — they are one data row each and Ch1–2 needs them most. |
| D6 | R6's consolidation framing | Add the four shrine inscriptions or skip | **Add them.** One line of prose buys the payoff of the whole unlock ladder. |

