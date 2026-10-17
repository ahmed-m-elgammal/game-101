# 05 — Retention & Replayability

**The Ashen Choir — Systems Design Review, Document 5 of 5**

| | |
|---|---|
| **Scope** | What brings a player back *by choice*: the post-campaign state, the Floor ecology, second runs, completionism, the hidden ending's social life, live-balance philosophy for a serverless game, and how to measure retention without tracking anyone. |
| **Source of truth** | `THE-ASHEN-CHOIR-v1.md` — principally §4.5 (what carries after an ending), §12 (Choir Floor), §17 (risks & open decisions), §16 (content inventory). |
| **Status** | Design review. Nothing here is canon until you approve it. |
| **Tag legend** | `[CANON]` restated · `[CLARIFICATION]` · `[PROPOSAL]` · `[DECISION NEEDED]` · `[ASSUMPTION]`. |
| **Companion docs** | 01 (rewards), 02 (difficulty), 03 (economy), 04 (motivation), 00 (change log). |

---

## 1. Current system, restated

### 1.1 What a run leaves behind `[CANON]`

- **The ending path and title are permanent** on the ladder profile. Nine titles (3 paths × 3 tallies) plus one unaccounted title (*The Counter-Voice*, Unmake) that "the ladder never explains."
- **The bound Echo survives the ending** and keeps fighting on the Floor — "the campaign is about what you *were*, the ladder is about what you *are*."
- **Re-bind rights vary by ending:** an A-Mercy run cannot bind a new Echo (the Hymn is over); B or C runs can re-bind and re-doctrine at will; an Unmake run can do both, and its profile carries the line *"the Hymn is over · their Echo is still fighting."*
- **The Orrery** (§14.8) recaps the run: tallies, ending, title, and the nine decisions in order.

### 1.2 The Floor ecology at ship `[CANON]`

Eight hand-built named Echoes (800–1400 Toll, each with a history and a deliberate weakness) + 4 Rite-user Echoes at release + a rotating pool of the player's own and imported Echoes. Hourly NPC challengers (deterministic from the hour seed, 6-pending cap). Echo Codes let players exchange builds by copy-paste with full validation. A shared ladder exists only as an optional Phase 9; "the single-player version must work fully without it — and does."

### 1.3 The replayability assets `[CANON]`

Four classes with genuinely different Acts II–III content; 23 vows (12 class + 11 story-earned); choice-gated exclusive items, vows, and ally states (spared Corvane lives on your ladder; the turned pour fights beside you in Ch9); 10 endings; the run-gated Unmake (tallies ≥3 Mercy and ≥3 Devotion, <3 unlocked Burn verses, have lost to your own bound Echo); Maren's class-keyed lines; Corvane's counterbuild keyed to *your* build. §17 lists the open decisions: ship the shared ladder; whether replays with other classes are the intended replay model (v1 says yes, recommended); whether to add a fifth class (not recommended for launch); whether Unmake is discoverable or a kept secret.

### 1.4 What the design already understands `[CANON]`

The retention thesis is stated in one line and it is correct: **"The campaign is about what you *were*, the ladder is about what you *are*."** The game's answer to retention is not a schedule — it is an *heirloom* (the Echo), a *mirror* (the tally), and a *city that keeps duelling* (the Floor). Every recommendation below is an attempt to finish that thought, not to add a retention mechanic on top of it.

---

## 2. What works — protect these

- **The Echo as the retention object.** Everything else in the genre bolts meta-progression onto a finished character; this game makes the character's afterlife the whole point. The Echo outliving the campaign is both the emotional payoff and the loop.
- **The ending's effect on play.** A-Mercy losing re-bind rights is a mechanical consequence of a narrative choice that arrives *after* the choice — the rare punishment that is actually a themed reward (your Echo is the last Echo, and that means something).
- **Named Echoes with authored weaknesses.** Eight NPCs that each teach a lesson and carry a biography. This is what makes a serverless ladder feel inhabited.
- **The Unmake's gate shape.** It requires *playing against type* across a whole run (Mercy AND Devotion, refusing Burn verses, and — best of all — **losing to your own Echo**). That last condition is a masterstroke: the game teaches self-knowledge through the build, and the hidden ending demands the ultimate version of it.

---

## 3. Problems

### P1 — The endgame has a reward ceiling and a silence right after it. `[H]`

At L10, all 42 verses unlocked, the item pool drained (03 R3's dry-pool rule makes the drain honest), the only moving number is Toll. For competitive players that is enough; for the majority it is the moment the game goes quiet. There is no *second mountain*: no structured post-campaign goal that isn't "keep duelling." This document adds two (R1, R3) without adding a single daily hook.

### P2 — New Game+ is recommended by §17 and designed by no one. `[H]`

Open decision 2 says a second run as a new class is the intended replay model, "recommended" — with zero mechanical support. A replay that is just the same 21 fights with different stats is a weaker version of the game the first run already was. The second run needs its own *reason to exist*, and the fiction hands it to us: in Verrow, someone has walked this road before, and the city remembers (R1).

### P3 — Completionism is uncharted, and the chart is the game's best replayability argument. `[M]`

The choice system creates run-exclusive rewards (Ruthless Ch4 can never own Warden's Oath), but nothing in the game *says so* — not the calendar, not the Codex, not the epilogue. Players who finish once don't know what they didn't get, which wastes the entire exclusivity design. The matrix in R2 computes the honest numbers: the full mechanical Codex takes ~4 runs; the full title wall takes 9–10. Those are *great* numbers for an heirloom game — if the player can see the shape of them.

### P4 — The Floor must stay inhabited without a server. `[M]`

If the shared ladder never ships (Phase 9 is optional), the Floor's whole population is 8 + 4 hand-built Echoes. With recasts (03 R4) that stretches to ~1900 Toll — but a player who duels weekly empties even recast content in a month. The ecology needs a *renewal mechanism* that a client-only game can actually perform (R5, R6).

### P5 — The Unmake's discoverability is undecided, and the decision has a best answer. `[M]`

§17 leaves it as a flag. The community dynamics of a hidden ending on a copy-paste-code game are unusually strong (codes, titles, and ladder lines are *shareable*), which makes the secret self-advertising *if* it exists in public artifacts. R7 proposes the three-phase plan.

### P6 — A fifth class would break the one thing it can't afford to break. `[M]`

§17 correctly notes a fifth class needs a new "power in gear vs. power in verses" identity to stay interesting under Ilvane's Phase III. Undecided is *what that identity would be* and what the class would cost (36 verses, 3+ vows, a Corvane row, a Reading archetype, counter-table entries — the fifth class is a content project, not a content patch). R8 states the requirements so the decision can be made with eyes open.

### P7 — The A-Mercy re-bind lock is emotionally right and communicationally naked. `[L]`

The rule is perfect; nothing frames it. The player who ends the Hymn mercifully finds the Floor's re-bind button gone and the reason implicit. One profile line and one mark fix it (R9).

### P8 — There is no measurement plan, and the game refuses tracking. `[L]` — and rightly so.

A zero-network game cannot see churn. The answer is not analytics; it is *designed self-report* and cohort playtests (R10). But the plan must exist before launch, or every future balance decision is anecdote-driven.

---

## 4. Recommendations

### R1 — The Second Verse: New Game+ as the campaign's echo `[PROPOSAL]`

After any ending, the title screen offers **"Begin the Second Verse."** Rules:

- **Carried:** your title, your tally history (the Orrery of run 1 remains readable), your Echo (still on the Floor), your Codex and deeds. **New:** a fresh Vigil — new class, new name, new vow, standard creation (04 R5's presets apply).
- **The Vigil Who Came Before:** run 1's *Echo* is baked into run 2's campaign as a named challenger — it appears in Act II or III (chapter keyed to run 1's dominant act), rated honestly, with a history line: *"It fights the way you fought. You wrote it. It has not forgotten."* Beating it grants the **Ash Inheritance**: one item from run 1's kit may be carried forward as a ghost-mark on the new Vigil (a *memory*, not a copy — the item's mark, not its stats). `[ASSUMPTION: one item; two if run 1 was Unmake.]`
- **The city remembers, lightly:** nine one-line prose variants ("You have stood at this gate before. The toll-keeper has not changed. You have."), one per chapter, and Maren's Ch1 line gains a second-verse variant: *"You again. Good. It's worse the second time. You'll know why by the fourth."*
- **Difficulty:** unchanged sheets (02's bands hold); the Second Verse's extra difficulty is *self-imposed* by the new class's unfamiliarity — which is the correct difficulty for a replay.
- **Unmake hunting:** the gate is per-run, but deeds and the Codex remember cross-run conditions — a player at 2-of-4 Unmake conditions sees the Orrery annotate the missing ones in plain sight ("*the candle does not remember losing to itself*"), which converts the secret hunt from wiki-lore into legible self-instruction after the first cryptic discovery.

**Why this is the right NG+:** it reuses 100% existing content and systems (the "previous Echo" is just a named Echo generated from save data), it deepens the theme (your past run is literally an Echo haunting your present), and it gives the second run an arc the first couldn't have: you already know the city's secret — the story now plays as tragedy instead of mystery.

### R2 — The completionism matrix: show the shape of the whole `[CLARIFICATION → PROPOSAL]`

Computed from the §3/§7/§8 tables (per-path rewards are run-exclusive; each chapter's branches are independent):

| Collection | Runs needed | Notes |
|---|---|---|
| All 41 items | **3** (+Floor pity for the 2 Floor-native, or first-Floor-drop) | 3 tally-pure runs (all-Ruthless, all-Mercy, all-Devotion) collect every choice-item and story vow |
| All 23 vows | **3** | Same runs; class-vow completeness is per-class |
| All 42 verses (mastery, not ownership) | **4** | One run per class |
| All 9 titles + The Counter-Voice | **9–10** | One title per run; the Counter-Voice wants a devoted build |
| All 9 epilogue texts | **9** (+1) | Same runs as titles |
| Maren's 4 class line-sets + 11 vow suffixes (04 R7) | **4 + attentive play** | Suffixes land inside the 3-run plan |

**The Echo Codex (R4) displays this table honestly** — including the 9–10 title-wall number — because the completionist's decision ("is 90 hours of heirloom game worth it to me?") deserves a real answer, and the casual's decision ("what might I have missed?") deserves a *browseable* one. What the Codex never does: nag, percentage-tick, or place a progress bar under anything (04's red-line metric).

### R3 — The Second Choir: three post-campaign mountains `[PROPOSAL]`

No dailies, no seasons, no battle pass — three */player-chosen* structures:

1. **The Codex** (R4) — the completion mountain: 4 runs to fill, 9–10 to perfect.
2. **The recast ladder** (03 R4) — the skill mountain: eight Echoes that climb with you to ~1900, each recast a rematch with a new line.
3. **The parish** — the *content* mountain, delivered the only way a serverless game can: **every balance patch is a recasting.** (R6.) Each patch re-tunes a handful of sheets, adds one named Echo "newly bound" to the Floor, and writes its changelog as ledger prose. The Floor grows with the game's whole life.

### R4 — The Echo Codex `[PROPOSAL]`

One Codex screen, five tabs, generated entirely from data:

- **Relics & Marks** — all 41 items; owned in full; unowned as *ghost silhouettes* with their source chapter named ("Ch4 — the furnace, fed"). The ghost line is the completionism pitch: one sentence, no nagging.
- **Verses & Vows** — owned/unowned per class (unowned class rows are visible only for classes you've played, to keep first-run screens clean).
- **Deeds** — the ten (04 R3), with Maren's lines preserved.
- **Echoes Met** — every named Echo fought, their history line, your record against them; imported codes remembered as a guest-book ("*Mourne, a Cantor. Challenged twice. Held once.*").
- **The Nine** — per-run Orrery scrolls, kept across runs; the tally reveal of run 1 readable forever (this is where second runs get their emotional fuel).

The Codex also *fixes* 03's P6: owned-but-unslottable items live here, not in the Hymnal's face.

### R5 — Dead-floor protection: the Floor never falls below its parish `[PROPOSAL]`

Hard rules for both phases of the game's life:

- **Single-player phase:** the Floor always holds ≥8 named Echoes + 4 Rite-users + recast variants. Hourly challengers draw from the same pool with the same determinism. Nothing expires.
- **If Phase 9 ships:** imported player Echoes are *added*, never substituted. The NPC parish is permanent — a dead shared ladder degrades to single-player behavior, never to an empty floor. One guardrail test asserts it: `floor_population ≥ 12 at all times, both phases`.

### R6 — Recast patches: live balance as fiction `[PROPOSAL — philosophy]`

A serverless game's "live service" is its update cadence. Proposal: every balance patch is written as a **recasting** — the Bellfoundry pours again, some sheets come back changed, one new Echo takes the Floor, and the changelog is in-world: *"The Salt Widow has learned to wait. Burn potency +1 at Toll ≥1200. A new bell has been bound: the Ninth Swineherd."* Balance changes to player-facing formulas (Fatigue schedule, verse costs) get a plain-language line in the same ledger, because the honesty contract outranks the fiction. `[ASSUMPTION: patch cadence is yours; the design works at any pace — the mechanism is a data file, not an event system.]`

**Why:** it converts maintenance into content and gives returning players a *reason* that isn't FOMO — the city changed while they were gone, in ways they can read. It is the only "retention mechanic" in this document that is also the engineering plan.

### R7 — The Unmake, discoverable on schedule `[PROPOSAL — resolves §17 open decision 4]`

Three phases, one flag each:

1. **Month 1 — sealed.** The fourth thing exists; nothing points at it. The community codes, duels, and reads.
2. **Month 2 — the title surfaces.** Any Unmake player's ladder line (*The Counter-Voice · the Hymn is over · their Echo is still fighting*) is public and copyable via codes. Social proof does the advertising; the game still explains nothing.
3. **Month 3 — the Shadow deed** (04 R3) goes live for everyone: seeing the condition met-but-untriggered in the Orrery. Now the hunt has a visible edge without ever a wiki-mandatory step.

**Why this order:** the Unmake's value is *communal discovery* — your framing in §4.4 says exactly that ("finding it is a community achievement, not a grind target"). The three phases let the discovery happen in public artifacts the game itself ships, so the secret spreads without anyone's spoil-for-clout thread being load-bearing.

### R8 — The fifth class: requirements before desire `[CLARIFICATION — resolves §17 open decision 3]`

Not at launch (agree with §17). When it happens, the class must ship with: 9 verses incl. two NEW-tier (L6/L7) verse-shape innovations; 3 class vows, one of which defines a *new* Phase III answer (the "power in gear vs verses" axis must gain a third pole — e.g., power held in *status economics*: a class whose strength is what it denies rather than what it deals; Ilvane copies verse coefficients, but denial is a *rule*, like a vow — the copy inherits the denial, which creates the class's unique Phase III problem to solve); a Corvane counter-table row; a Reading archetype; ≥6 affinity items rebalanced; class kit interactions for the 4×4 matrix (§5.2); and a Maren line-set. **Cost estimate: comparable to Act II in content weight.** This list is the answer to "should we?" — it converts a vibe into a project plan.

### R9 — The Kept Echo: framing the A-Mercy lock `[CLARIFICATION → PROPOSAL]`

Keep the rule. Add the frame: the A-Mercy profile line reads *"The Kept Echo — the last Echo in Verrow. It fights because it chooses to."* and the Echo card carries a white-candle mark no other ending grants. The lock becomes a crest. `[CLARIFICATION: also verify — §4.5 says A-Mercy "cannot bind a new Echo… you keep the one you had." The Floor UI must say this *in that voice*, not as a greyed-out button.]`

### R10 — Measuring retention without tracking anyone `[PROPOSAL]`

The zero-network stance is a feature; the measurement plan must fit inside it:

- **Opt-in local counters** (Settings, off by default, described in one honest line: *"Counts sittings and fights on this device. Never leaves it unless you send it."*): return-sitting count, Floor-touch rate, second-run starts, re-bell counts, ending reached. Exportable as a line of text with the save code.
- **The save-code census:** players who share Echo codes already publish their state; the Echo Code's v2 `tally` field (03 R8) is consented public telemetry by design. Population-level readings (title distribution, Toll distribution, build-shape distribution) come from any public code repository thread — the community *is* the analytics pipeline, and it opted in by posting.
- **Cohort playtests** at 1 week / 1 month / 3 months post-launch with the same 5–8 testers (Phase 8 cohort retained): the D1/D7/D30 analog for a game this size, run as interviews, not dashboards.
- **The one metric that matters most:** *second-verse starts per finished campaign.* Everything in this document exists to move that number above 0.5.

---

## 5. Revised spec — ready to paste

**§4.6 (new) — After the ending, for every ending:**

> - Title, tally history, Echo, Codex and deeds persist. The Orrery of each run is kept in the Codex's **The Nine** tab.
> - **The Second Verse:** after any ending, begin a new Vigil — new class and vow, standard creation. Run 1's Echo returns as a named challenger in the new run's Act II or III; defeating it grants the **Ash Inheritance** (one item's mark carried as a ghost-mark; two if run 1 was Unmake). Nine chapter lines acknowledge the return. Difficulty bands unchanged.
> - **Unmake legibility:** after the first cryptic discovery (or month 3, R7), the Orrery annotates unmet Unmake conditions in plain sight.
> - **The Kept Echo** (A-Mercy): re-bind closed, framed as the crest it is — *"the last Echo in Verrow."*

**§12.8 (new) — Floor population guarantees:**

> The Floor always holds ≥12 Echoes (8 named + 4 Rite-users) in every phase of the game's life, including after shared-ladder integration. Imported Echoes add; they never substitute. Balance patches are **recastings**: sheets re-tuned, one new Echo bound per patch, changelog written as ledger prose with plain-language lines for any player-facing formula change.

**Codex (new screen):**

> Relics & Marks · Verses & Vows · Deeds · Echoes Met · The Nine. Ghost silhouettes name their source. No progress bars, no percentages, no prompts.

---

## 6. Worked examples

### 6.1 The three-run completionist plan (and where it breaks)

Run 1: Ruthless-lean Cinder Witch — Marrow-Furnace, Corvane's Blade, Twelve Tolls, Tuning Fork, the Mace, Vigil's Ring; Ending C-Ruthless (*Cantor of Ash*, the coveted one). Run 2: Mercy Gravewarden — Shroud, Warden's Oath, Corvane's Grey Coat + Grey Duelist, Warden's Cassock, Oren's Post, No Paper; Ending A-Mercy (the Kept Echo). Run 3: Devotion Hollow Cantor — Shovel, Twin Ledger, Ninth Sister's Vow, The Turned Pour, Fixed Point, Long Walk Down; Ending B-Devotion, and — with the Burn-verse refusal rule — the Unmake door is *structurally open* on exactly this run (Devotion run, <3 Burn verses unlocked is nearly automatic for a Cantor built on Curse/Hush). **The design's best-kept secret: the Devotion run and the Unmake run want to be the same run** — three runs cover the item/vow Codex, and the third one is the hunt. Where it breaks: the 4th class (Ashblade mastery) and the 9-title wall — which is why the Codex shows those numbers honestly instead of promising "complete it all in three."

### 6.2 A Second Verse prologue, as it would read

> The crypt again. The same stone shelf, the same candle that will not go out. But the smoke knows you now.
> *"You again,"* Maren says, and there is something in it that is almost relief. *"Different hands this time. Good. The last pair left a mark on everything they touched — you'll trip over it by the foundry."*
> **New: The Vigil Who Came Before waits on the Floor. It fights the way you fought.**

### 6.3 The second-month player, week by week (no calendar required)

**Week 5.** Campaign done (Ending A-Ruthless). Floor: Widow recast twice; losses feel earned now. **Week 6.** Codes thread found; imports three builds, loses to all three, rebuilds the Witch around denial. **Week 7.** Second Verse begins (Gravewarden) — Ch1 feels like visiting a grave you helped dig. **Week 8.** The Vigil Who Came Before appears mid-Act II; the fight is a mirror with your old gear's ghost on the line. Ash Inheritance: the Widow's Comb mark now lives on a Warden. Nothing in those four weeks was scheduled, prompted, or streaked. The game's retention engine is *biography* — and biographies are only worth returning to if the player, not the calendar, turns the page.

---

## 7. Test plan

**Asserts and sims:**

1. **Codex completeness:** every item/vow/verse/deed/ending is reachable per the R2 matrix by *some* run combination (a SAT-style check over the choice-reward graph; catches any future reward added to a path that makes full completion impossible).
2. **Second Verse isolation:** run-2 saves must not mutate run-1 state (Orrery, Echo, title) — regression test at the save layer; the Ash Inheritance is the *only* permitted cross-run write.
3. **Floor population floor:** `≥12` Echoes in both phases, asserted at boot.
4. **Unmake gate determinism:** across 10k simulated runs, P(reachable) ≈ 1–3% per run (discoverable, never accidental); zero reachable runs *without* the lost-to-own-Echo condition (the thesis condition is load-bearing).
5. **Local-counter honesty:** the opt-in counter's exported line must round-trip and contain no identifiers (device, time, IP — nothing); the privacy test is a schema test.

**Cohort protocol (R10):**

- 1-week interviews: "What did you do after the ending?" — the R3 mountains should appear unprompted in ≥2 of 5 answers.
- 1-month: second-verse start rate (target ≥50% of finishers), Floor-touch rate among finishers (target ≥80%).
- 3-month: "What would make you stop?" — the honest churn list; cross-reference against the recast-patch cadence.
- Title-wall sentiment: show the R2 matrix to testers post-run-1; measure *want* ("I'll do the Mercy run") vs *debt* ("I have to"). Want is the goal; any debt reading means a ghost line is phrased as an obligation — rephrase, never remove.

**Red-line metrics:** second-verse starts <25% (the post-campaign silence is real — revisit R3); Floor-touch rate <50% among finishers (the heirloom loop failed — check §12's first-bind flow); any completionism complaint containing the word "grind" (the Codex voice has drifted from invitation to invoice).

---

## 8. Open decisions for the owner

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D24 | R1 — Second Verse | Ship as specced; ship without the Ash Inheritance; skip NG+ | **Ship as specced.** It is the theme, executable in data. |
| D25 | R4/R2 — Codex | Ship with ghosts + matrix, or ownership lists only | **Ghosts + matrix.** Honest numbers are the pitch. |
| D26 | R6 — recast patches | Adopt the philosophy; set your cadence | **Adopt.** Cadence is yours; the shape is the point. |
| D27 | R7 — Unmake schedule | Sealed → title → Shadow (3 phases), or discoverable at launch | **3 phases.** Communal discovery needs a window to happen in. |
| D28 | R8 — fifth class | Commit to the requirements list now, or re-decide post-launch data | **Re-decide post-launch** — with this list as the gate. |
| D29 | R10 — measurement | Opt-in counters + census + cohorts, or cohorts only | **All three.** They cost players nothing and they are the only honest eyes the game will ever have. |
