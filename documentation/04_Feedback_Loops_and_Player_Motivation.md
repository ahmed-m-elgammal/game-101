# 04 — Feedback Loops & Player Motivation

**The Ashen Choir — Systems Design Review, Document 4 of 5**

| | |
|---|---|
| **Scope** | Every channel through which the game talks back: the combat feedback stack, the loop structure (turn → build → campaign → Floor), the motivation model behind the design, how loss and mastery are framed, and the psychology of the overnight ledger. |
| **Source of truth** | `THE-ASHEN-CHOIR-v1.md` — principally §1 (pillars), §5.8 (Reading), §10 (Bounded Roll, Wax Meter, post-fight report), §12 (doctrines, Floor, Vigil Ledger), §14 (screens), §2.6 (Maren's rule). |
| **Status** | Design review. Nothing here is canon until you approve it. |
| **Tag legend** | `[CANON]` restated · `[CLARIFICATION]` · `[PROPOSAL]` · `[DECISION NEEDED]` · `[ASSUMPTION]`. |
| **Companion docs** | 01 (rewards), 02 (difficulty), 03 (economy), 05 (retention), 00 (change log). |

---

## 1. Current system, restated

### 1.1 The feedback stack in a fight `[CANON]`

- **Before:** the Reading panel — enemy identity and level, one hand-written threat line ("It heals. It will not stop healing."), the player's named counter if one exists, expected win % and length from 200 seeded sims, and the displayed measure seed. "No fight is a surprise."
- **During:** status chips carrying icon, name, remaining turns, and *the one number that matters*; ten Resolve pips; a 4px HP bar that animates on direct hits but updates instantly on DoT ticks "so the player can count them"; the Wax Meter (the only animated element — the game's sole admission that it rolled anything); a log gutter where every entry is `[round] verb + target + amount` with a color-coded border; the `TOLL IN 3` counter from round 13.
- **After:** the post-fight report's one-line verdict (§10.7) computed from the Fortune track — *the wax ran level / ran cold / ran hot / you fought against a worse build and still lost* — the last of which "links your Reading panel."

### 1.2 The loop structure `[CANON]`

- **Turn loop (seconds):** Resolve in, verse out, statuses tick, chip numbers move. Every cast has a visible cost and cooldown; nothing is hidden.
- **Build loop (chapters):** shrine → free reshaping with one-click rewind (Reshape Ledger) → re-bind the Echo → the Floor plays the new script. The player's theory of the build gets tested twice: once by them, once by the ladder.
- **Campaign loop (acts):** 9 choices → hidden tallies → 10 endings. The tally is *never shown in play*; the epilogue is the only reveal, framed as Maren reading the ledger.
- **Floor loop (between sittings):** hourly challengers (6 pending cap) resolved deterministically from the hour seed; the Vigil Ledger narrates them ("Hour 3. Brother Ash stood against your Echo for nine turns. Your Echo held. Toll +14."); Toll moves; a 12% drop chance with pity.
- **The Echo AI contract:** no reading of hidden information (opponent's slots, vow, gear), no reads of future casts; lethal check, pointless-cast filter, Strike fallback, four doctrines. AI competence is deterministic; only exact ties are random.

### 1.3 The motivation model the GDD argues, whether it names it or not `[CANON + ANALYSIS]`

Mapping v1's stated pillars onto the three basic psychological needs (self-determination theory):

- **Autonomy — "The build is the game."** Forty decisions before a fight (class, vow, 22 points, 4 slots and their *order*, 3 gear slots); free respec means autonomy without fear; the choices never show their tally prices, so decisions are identity-driven, not reward-driven.
- **Competence — "Every strength has a hole" + the Reading.** Counterplay is taught by the UI, not a wiki; walls are exams with named answers; Bounded Roll guarantees that outcomes are attributable to the build ("they can only blame a build") — in attribution terms, the design *forces internal, stable, controllable attributions*, which is the exact condition under which losses produce learning instead of helplessness.
- **Relatedness — "Your Echo is you."** The Echo fights while you're away; the ledger narrates its results as biography; Corvane can spend the whole game on your ladder; Echo Codes let players hand each other their builds like relics. The async PvP is not adjacent to the story — it *is* the story's metaphor, made playable.

And one more the GDD does uniquely: **self-discovery motivation.** The hidden tally converts nine small choices into a mirror. The epilogue reveal is a *self-verification* event — the game tells you who you were, and the title becomes permanent. That is a stronger retention hook than any daily reward, and it costs nothing per day.

### 1.4 What the design refuses to do `[CANON]`

No daily streaks, no login calendars, no energy, no gacha, no FOMO windows, no dark patterns — per your brief and per the design's own honesty contract (published seed, shown bounds, recorded re-bells). This document treats that refusal as load-bearing: **every recommendation below must survive the test "would this still be honest if the player read the code?"**

---

## 2. What works — protect these

- **The Wax Meter as a trust artifact.** One animated element, one honest admission of luck, shared by both fighters. It converts "that was RNG" from a complaint into a reading. Nothing else in the genre does this.
- **The fifth verdict line.** "You fought against a worse build and still lost" is the most important sentence in the UI: it is the moment the game tells the truth about a loss at the exact moment the player is most motivated to hear it (immediately post-loss, cause still traceable).
- **Maren's rule.** One line per chapter, drawn from the class, that explains *you* — the only character who addresses the build. It is personalization without surveillance: the game proves it's been paying attention without ever grading you.
- **The pointless-cast filter.** The Echo AI refusing to waste casts is a *competence mirror* — your Echo plays the way you wish you did, which flatters the build and teaches the rotation at the same time.
- **Choice prices being invisible.** Tallies hidden during play means players choose on identity, then discover. Any visible tally meter would convert the entire choice system into farming. (Defended again in R8.)

---

## 3. Problems

### P1 — There is no longitudinal feedback axis. `[H]`

Every feedback channel in v1 is per-fight. Nothing answers the question players actually care about most: **am I getting better, and is my build getting somewhere?** Ten fights from now, the Wax Meter is reset, the Reading is a new card, and the Reshape Ledger holds diffs nobody reads. The post-fight report knows the fight; it does not know the run. Concretely missing: (a) a build-diff view ("since Ch1: +2 Bleed cap, +18% burst, two new answers to armor"); (b) a *calibration* line ("you win the fights the Reading calls close") that teaches players to trust their own forecasts. Without this axis, competence feedback is stuck at the fight level and the mastery story goes untold — which wastes the game's best motivation engine.

### P2 — Mastery moments pass uncelebrated. `[H]`

The first 5-stack Blood Ledger, the first win from a 30%-Reading, the first counter-executed act boss — the design's most skill-expressive events produce exactly the same post-fight text as a farm win. Recognition is the cheapest motivator in the toolbox and the GDD spends none of it (no achievements, no deeds, nothing). The risk of adding recognition is toast-popup gamification — the fix is a diegetic layer that costs no mechanics (R3).

### P3 — The overnight ledger can read as punishment for sleeping. `[H]`

"Every real hour, one challenger arrives… Toll −11" — for a player on any rhythm other than daily, the first thing they may read on return is *their Echo lost while they were gone*. The fiction is perfect (the Echo is you; the Floor is indifferent); the motivation math is not: overnight losses are outside the player's control, which violates the game's own attribution contract. The Bounded Roll bounds *fights*; nothing bounds the *schedule*. Three protections are needed: framing, consent, and parity (R4, R6).

### P4 — Character creation makes four permanent-feeling decisions before the player understands any of them. `[M]`

Class, vow, name, 4 free stat points — all on one screen, all before the first fight. Vows are build-defining (the strongest reward tier, per the GDD), and the creation screen asks for one with zero experience to inform it. Free respec at shrines rescues the system *later* — but only for players who don't quit at the screen. Presets fix this without removing agency (R5).

### P5 — The hourly loop is wall-clock, and the brief says no cadence. `[M]`

You chose **mixed rhythm: no cadence assumed, no daily-login rewards.** The hourly challenger system is the one feature that quietly assumes a cadence: offline time generates content online play doesn't (pending challenges). It must never become *required* content. The rule to adopt: **manual play is always reward-parity or better** (R6).

### P6 — The verdict lines are better at framing losses than wins. `[L]`

Five report lines: two are wins-with-asterisks ("ran hot"), two are losses, one is the build-shame line. The aggregate story a player gets over a session skews negative-coded. One aggregate calibration line fixes the skew (R8).

### P7 — Maren is class-aware but vow-blind. `[L]`

Her rule is "she explains *you*" — but she only reads the class. A Red Tide Ashblade and a Hunger Ashblade get the same line, in a game where the vow is the identity tier. A cheap suffix system makes her vow-aware (R7).

---

## 4. Recommendations

### R1 — Formalize the loop map (and design no new loops) `[CLARIFICATION]`

```
TURN (≈30s)          → chips, pips, Wax, log        → "did that cast pay?"
BUILD (≈20 min)      → shrine, reshape, re-bind      → "is my theory of the build better?"
CHAPTER (≈10 min)    → Maren line, calendar, deed    → "who am I becoming?"
FLOOR (between sits) → ledger, Toll, drops           → "what did my Echo do without me?"
CAMPAIGN (≈8–12h)    → 9 choices → epilogue reveal   → "who was I all along?"
```

Every recommendation in this doc attaches to exactly one loop; nothing adds a sixth loop. The audit question for any future feature: *which loop does it feed, and what does it cost the others?* Features that feed the Floor loop while taxing the campaign loop (dailies, event shops) are the genre's classic mistake and are pre-refused by the map.

### R2 — The Chronicle: a run-long feedback axis `[PROPOSAL]`

One screen (reachable from the Hymnal and the post-fight report), generated from data, showing:

- **The build's biography** — an auto-diff of the five milestones: creation, Ch3, Ch6, Ch9, final bind. Text, not graphs: *"At the crypt you were 6/12/2/4/7. At the Bellmouth you are 9/16/3/9/10, you hold Corvane's Blade, and you stopped casting Cinderfall in Act II."* (The verse-drop detection is already implicit in cast counts the Echo AI uses.)
- **The calibration line** — after 10 fights, one persistent sentence under the Reading: *"Your wins cluster where the Reading is uncertain (40–60%). Fights it calls clear, you clear."* Computed from the run's own expected-vs-actual record. It turns the player into a calibrated forecaster — the single most transferable skill the game teaches — and it defends the Reading panel's authority when a 75%-expected loss happens (the variance was bounded; the forecast was honest).
- **The re-bell count, framed as effort** — *"Four fights asked for two of you. You came back four times."* The ledger already records this (§10.11); the Chronicle is the first screen that frames it as persistence rather than failure.

**Why:** this is the "am I getting better?" axis, built entirely from data the game already tracks, with zero new mechanics. It also gives the epilogue somewhere to point back at — the Orrery recap (§14.8) shows the nine choices; the Chronicle shows the nine chapters of *craft* around them.

### R3 — Verses of Deed: diegetic recognition `[PROPOSAL]`

A fixed list of ~10 named deeds. Each is a ledger entry with a name and one Maren line; they unlock nothing, gate nothing, and are listed in the Codex under *Deeds*. No toasts — the discovery is a line in the Vigil Ledger, dated, the way the hourly challengers are written.

| Deed | Unlocked by |
|---|---|
| **The Wax Ran Level** | Win with final Fortune within ±2% of 1.00 |
| **Over the Trace** | Win a fight the Reading called ≤35% |
| **Counted** | Win using only your four slotted verses — no Strikes |
| **The Unwalled** | Win with zero Ward and zero Brace used |
| **Five Voices** | Land a 5-stack Blood Ledger (or per-class equivalents: Conflagration on a burning target at full potency; a 5-hit Requiem… one per class) |
| **The Long Note** | Win a fight that reached The Last Bell (02 R2) |
| **The Vigil Kept** | Clear a chapter with no re-bell |
| **The Kind Hand** | Complete a campaign with zero Ruthless tallies |
| **The Counter-Voice's Shadow** | See the Unmake condition met in the Orrery without triggering it *(the hint the ending deserves — still unexplained)* |
| **Practice of the Dead** | Beat the same named Echo after it has recast three times |

**Why this shape:** recognition with no currency attached cannot inflate, cannot farm, and cannot manipulate. The deeds double as a skill rubric — a player reading the list learns what *good play* looks like in this system (the deed list is the mastery syllabus, in fiction's clothing). And "The Counter-Voice's Shadow" is the Unmake hint the community will trade for years — a secret that *wants* to be found, per your discoverability question in §17.

### R4 — Ledger, not ladder: the overnight contract `[PROPOSAL]`

Three rules, all visible on the Floor screen the first time it matters:

1. **Framing:** the Vigil Ledger always writes the Echo as the agent — *"held," "fell," "answered," "refused to fall"* — never the player as bystander. Losses get one line of *consequence*, not judgment: *"The Salt Widow burned it down in six. Your Echo has been studying the scorch marks."* (One string table; the determinism of §10.12 means the lines can be authored per named challenger.)
2. **Consent — the Ward:** a toggle on Your Echo: **"She will not answer challengers rated more than 300 above her."** Default ON for the first chapter after binding, always player-settable, never pushed. It kills seal-clubbing anxiety without hiding the ladder. The full fantasy ("fight anyone") is one toggle away, and the toggle's existence *teaches* that the default was a kindness, not a cage.
3. **Stakes:** overnight losses to NPC challengers pay **half Toll** (03 R4), never drop-pity progress, and never more than one Toll-decade per night (`floor` at −15/night from hourly challenges). The Floor is a place your Echo *lives*; it should not be a place your rating *bleeds*.

**Why:** "your Echo is you" cuts both ways — the same identification that makes the Floor magical makes an overnight −11 read as personal harm. These three rules keep the magic (results happen without you, and they're *real*, replayable, seeded) while bounding the harm to something a mixed-rhythm player can shrug off.

### R5 — Creation presets: "The four shapes of the Vigil" `[PROPOSAL]`

The creation screen offers, under the free-point allocation, four one-tap presets — class-appropriate standard spreads with names that teach the identity: the Ashblade's *"The Duelist's Debt"* (MIG/HST skew, "fast, and fragile, on purpose"), the Gravewarden's *"The Long Door"* (VIG/GRD), the Witch's *"The Kindling Curve"* (WIT/HST), the Cantor's *"The Held Note"* (WIT/VIG). Presets are fully editable before the first fight and flagged as starting points ("the shrine will undo all of this, later, for free" — one line on the screen that teaches the respec promise *at the moment of maximum fear*). `[PROVISIONAL spreads: class-standard allocations, tuned against the harness's clear-rate targets — they set starting points, never required builds.]`

**Why:** choice paralysis at creation is a *first-session* churn vector; presets convert it into a 10-second decision that still teaches (each name is a mini-pitch of the class fantasy). Agency is untouched — the 22 points remain the player's; this only shortens the distance to the first interesting fight.

### R6 — Manual-parity rule (policy) `[PROPOSAL]`

Every reward obtainable from hourly-challenger resolution is obtainable at equal or better rate through fights the player performs themselves: same XP table (01 R1), same drop roll, same Toll math (03 R4). Offline time is a *bonus*, never a *yield advantage*. This one sentence in the design doc is what makes "mixed rhythm" true rather than aspirational — and it is the anti-FOMO guarantee in mechanism form: there is nothing to log in *for*, only something to log in *about*.

### R7 — Maren reads the vow `[PROPOSAL]`

Her per-chapter line gains an optional suffix slot keyed to story-vows owned (11 strings per chapter would be 99 strings — too many; instead, **one suffix per story vow, global, not per chapter**): e.g., owning Ledger's Price, her next line ends *"…and you signed something. I can hear the ink."* Eleven suffixes total, appended when first earned. She reads the class every chapter and the vow once, which matches their actual narrative weights.

### R8 — Tone audit of the report, plus the calibration line `[CLARIFICATION]`

Keep all five verdict lines (they are honest). Add the aggregate calibration line (R2) to the post-fight report after fight 10, and re-word one: *"You fought against a worse build and still lost"* → *"You were favored and lost. The Reading knows why — open it."* Same truth, one degree less contempt, and it routes the player to the fix. The report is the game's most-read screen; its tone is the game's tone.

---

## 5. Revised spec — ready to paste

**§10.7 post-fight report, appended line:**

> After every 10 fights, the report appends one calibration line, computed from the run's expected-vs-actual record: *"Your wins cluster where the Reading is uncertain. Fights it calls clear, you clear."* (Variant for strong forecasters: *"You know what the Reading knows."*)

**§12.5 'while you were away', appended rules:**

> - The Ward: your Echo declines challengers rated >300 above her; default on for the first chapter after binding; player-settable always.
> - Overnight Toll losses to NPC challengers are halved and capped at −15 per night. Drops and pity are never lost overnight.
> - Manual play is always reward-parity or better than offline resolution (the Floor never charges rent for absence).

**New Codex tab — Deeds:**

> Ten named deeds; ledger entries with one Maren line each; no mechanical effects, no gating, no notifications. The deed list is public in the Codex from the start.

---

## 6. Worked examples

### 6.1 One sitting's feedback trace (Ch4, Mira the Gravewarden, 55 minutes)

- **Fight 1 — Sable.** Reading: 58%, ~11 rounds, *"She out-heals chip damage."* Mira wins in 9. Verdict: *wax ran level*. Deed: none — but the log shows her Blood Ledger-shaped... no: her **Mend the Mortar economy** — the chip numbers counted down on the DoT ticks, instant, countable, exactly as the component spec promises.
- **Choice — Ysolde.** Disarm (Mercy). No reward shown. (The reward arrives in Ch6 as four Wardens at the foundry — feedback *delayed by design*, and the delayed payoff is stronger for being unadvertised.)
- **Shrine.** Rewind demo: she re-slots Last Rites for Crypt Door, fights nothing, rewinds, re-slots again. The Reshape Ledger shows both states. Zero cost, zero friction — the build loop's whole argument in one interaction.
- **Floor.** Binds the new doctrine. Three pending: two wins (Toll +22), one loss to the Salt Widow (−5, halved; *"studying the scorch marks"*). The Ward note explains why the Widow was her only loss: above the line, declined. First Deed appears in the ledger: **The Vigil Kept** (Ch4, no re-bell). One line from Maren about the Ninth Sister — R7's suffix slot, first fire.
- **Post-session.** The Chronicle's calibration line ticks over fight 20: *"You know what the Reading knows."* She reads it twice. That sentence cost nothing and it is the reason she opens the game tomorrow that isn't a daily reward.

### 6.2 The overnight ledger of a mixed-rhythm player

Kestrel plays Sunday (90 min), then not again until Thursday. Monday's ledger: three challengers — Brother Ash (held, +8), the Unpaid Bell (fell, −7, halved from −14), an imported code (won, +16). Tuesday: two challengers, both held (+12). Wednesday: none spawned below the Ward line — the ledger reads, one line, *"No one came. The Floor is quiet. She waited anyway."* Thursday he opens the game to a story, not a tax: five results, net +29, one authored line per entry, and a drop he didn't roll for. The wall-clock produced *content*, never *obligation* — because nothing decays, nothing expires, and the pending cap (6) means long absences are a longer read, not a bigger loss.

### 6.3 The attribution contract, enforced twice

A 78%-Reading loss. Old report: shame line → player blames RNG → forum post. New stack: bounded variance (±12% published) → Wax Meter showed the cold streak *shared* → verdict: *"The wax ran cold. You lost it."* → report links the Reading → Chronicle calibration line contextualizes (this was a 40–60%-cluster fight type for this player) → Maren's Whisper (02 R3) names the axis on retry. Five systems, one message, zero randomness-blame available. That is what "they can only blame a build" means in practice — not one feature but a *pipeline*, and every stage of it is already in the GDD except the Chronicle's link.

---

## 7. Test plan

**Harness / instrumentation (local, opt-in, anonymous — see 05 §6):**

1. **Verdict-tone audit:** sample 1,000 fights across testers; assert the report's loss-lines never co-occur with session-abandonment within 5 minutes at a rate >2× the win-line baseline (tone regression alarm).
2. **Calibration accuracy:** the calibration line's claim must be *true* — the sim asserts expected-vs-actual correlation ≥0.6 per run of 20+ fights before the line is allowed to render ("You know what the Reading knows" is a factual claim, not a compliment).
3. **Deed coverage:** every deed has a >0 observed unlock rate across 10k sim runs (a deed no build can unlock is a lie in the Codex); and no single deed exceeds 90% unlock (a deed everyone gets is noise).
4. **Overnight-harm bound:** sim 90 days of mixed-rhythm absence: max cumulative overnight Toll loss ≤ 60; zero pity loss; zero content loss. **Manual-parity assert:** every hourly-resolvable reward must have a manual path with equal-or-better expected rate (property test over the reward tables).
5. **Creation A/B (playtest, not telemetry):** five testers with presets, five without: time-to-first-fight and first-vight vow confidence ("could you explain your vow?") — presets should cut time-to-fight by ≥60% with no vow-confidence loss.

**Playtest protocol:**

- After the first overnight return, ask: "Anything feel unfair while you were gone?" Any yes = R4's framing lines or Ward defaults need another pass.
- After Ch9: "Tell me the story of your build" — a player who can narrate it (the Chronicle worked) vs one who recites stats (it didn't).
- Watch for deed-hunting: if testers optimize play *for* deeds, the list has become a checklist — soften names/lines until they're read as biography, not trophies. (Recognition must stay non-instrumental.)

**Red-line metrics:** session-start quit rate after overnight-loss-first screens (must match baseline); Reading-trust questions ("was the % honest?") below 80% agreement (the whole legibility thesis is at stake); any player-visible streak/counter added by accident (audit the UI diff — the no-manipulation stance is one accidental progress bar away from broken).

---

## 8. Open decisions for the owner

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D18 | R2 — the Chronicle | Ship full (biography + calibration + re-bell framing), or calibration line only | **Full.** It is one generated screen, and it is the run-long axis everything else points at. |
| D19 | R3 — deeds | Ship all ten, or a five-deed pilot | **All ten.** Deeds are strings; the pilot saves nothing. |
| D20 | R4 — the Ward | Default ON with toggle, default OFF, or no Ward | **Default ON, first chapter only, then player-set.** Protection at the moment of maximum fragility; freedom after. |
| D21 | R5 — presets | Ship presets, or improve the creation screen's teaching text only | **Presets.** Teaching text is read by nobody at creation time; presets are chosen by everybody. |
| D22 | R7 — vow suffixes | 11 suffixes, or skip | **Ship.** Cheapest uncanny personalization in the whole plan. |
| D23 | R8 — the shame line | Re-word, or keep verbatim | **Re-word.** Same truth; the route-to-fix is worth more than the sting. |
