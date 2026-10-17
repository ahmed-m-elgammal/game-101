# THE ASHEN CHOIR
## v1.0 — Complete Design Document & Ship Manifest

> **Status:** v1.0 SHIP CANDIDATE. Supersedes design draft 0.1.0. Every system below is specced to the level of buildable data.
> **Target:** 3 Acts · 9 Chapters · 21 campaign duels · 4 classes · 10 endings (3 paths × 3 variants + 1 hidden) · 23 vows · 41 items · 1.9 MB of self-hosted assets, zero external dependencies.
> **Changes from 0.1.0:** nothing canon was cut. The five-chapter skeleton was re-cut into three acts of three; the enemy roster went from 10 fights to 21; the 3 endings became 3 paths × 3 epilogue variants + 1 hidden; RNG was formalised from "seeded mulberry32" into the **Bounded Roll** contract; and the "no art pipeline" stance was replaced with a real font/image manifest (§11).

---

## Contents

| § | Section |
|---|---|
| 1 | Pitch & pillars |
| 2 | The world of Verrow |
| 3 | Story architecture — 3 Acts, 9 Chapters |
| 4 | Endings |
| 5 | Combat core |
| 6 | Verses |
| 7 | Vows |
| 8 | Gear & marks |
| 9 | Enemy roster |
| 10 | **Bounded Roll — the randomness contract** |
| 11 | Assets: fonts, images, design tokens |
| 12 | Echoes & the Choir Floor |
| 13 | Progression |
| 14 | Screens & UX |
| 15 | Technical plan |
| 16 | Build plan |
| 17 | Content inventory, risks, open decisions |

---

# 1. Pitch & pillars

You are a **Vigil** — a keeper of a tallow candle in a kingdom whose dead refuse to stay dead. You build a character from **verses** (skills), a **vow** (a build-defining rule) and **marks** (gear passives), walk a nine-chapter campaign across a drowning city, and then **bind an Echo** of your build into the Choir. Your Echo stands on the Choir Floor and fights other players' Echoes while you are away. When you come back, the Vigil Ledger tells you who challenged it and what happened.

**Why it survives without a sprite.** The game is carried by four things: choices, counterplay, voice, and *legible randomness*. Every fight is a few lines of gothic prose over a clean, dense UI. The randomness is bounded so tightly that no player can blame a loss on a die — they can only blame a build. That is the design thesis (§10).

**Pillars**

1. **The build is the game.** A fight is decided mostly by what you chose before it started.
2. **Every strength has a hole.** No build beats everything. Damage-over-time beats armor; armor beats burst; resource denial beats both; cleansing beats damage-over-time.
3. **Your Echo is you.** Async PvP is not a side mode. It is the campaign's central metaphor made playable.
4. **Short fights, readable logs.** 6–12 turns, narrated like a chronicle, never a spreadsheet.
5. **The story holds for every player.** Class, vow, and all three hidden tallies are woven into the act structure, so an Ashblade and a Hollow Cantor experience genuinely different Acts 2 and 3 from the same script.

---

# 2. The world of Verrow

## 2.1 Canon (unchanged from 0.1.0 — do not rewrite)

- **Verrow** was a kingdom of bell-towers.
- The plague called the **Grey Hush** arrived. The **Cantor of Verrow, Ilvane**, sang the **Last Hymn** to hold death back from the living.
- It worked. It never stopped.
- The dead persist as **Echoes** — imprints that replay the last fight they fought, again and again, in the places they died.
- Bells ring by themselves at night.
- The sea has taken the lower city. The nave of the cathedral stands half underwater.

Everything in 0.1.0 above is load-bearing. v1 adds depth; it does not contradict.

## 2.2 The city, bottom to top

Verrow is a city that **drowned from the bottom up** — the Hush came out of the sea, so everyone with money went up and everyone without went under. The campaign is a literal climb, and the geography *is* the difficulty curve.

| Level | Quarter | State | Act |
|---|---|---|---|
| **−2** | **The Lower Silence** | Under the cathedral, under the waterline. Flooded processional corridors, the drowned old city, the stair where the Vigil fell. | III |
| **−1** | **The Drowned Nave** | The cathedral nave, waist-deep black water, the rose window half-submerged. Crypt below is still sealed and dry. | I |
| **0** | **The Tideline** | The Old Staithe and the **Salt Road** causeway. Toll gates, tar pits, the last dry commerce. | I |
| **+1** | **The Wick Market / The Thimble Warrens** | Trade quarter and alms quarter. Still standing, universally condemned. | II |
| **+2** | **The Bellfoundry** | The hot industrial terrace. Bells are recast here, from Echoes. | II |
| **+3** | **The Orrery of Ash** | Ilvane's observatory. A dome of ash-glazed brass and dead astronomy. | III |
| **+4** | **The Bellmouth** | The tallest tower. Where the Choir sings. Where the Hymn is held. | III |

> **Maren, in Chapter 2:** *"Verrow drowned from the bottom up. The rich went up. We did what people do, and then we called it weather."*

## 2.3 The timeline

| Year | Event |
|---|---|
| **0** | The Grey Hush rises out of the sea. Fisherfolk first. A third of Verrow dies in eleven weeks. |
| **0, Midwinter** | Ilvane sings the **Last Hymn** in the Bellmouth, with the full cathedral choir. Death stops. The dead do not lie down. |
| **0, Midwinter +1** | **The Vigil falls.** The Hymn needed a fixed point — one living hand on Saint Orrin's candle. That was the Cantor's last Vigil. *You.* Ilvane finished the note without the anchor. |
| **1** | The Hymn runs **unanchored**, sustained only by the weight of the dead. Echoes multiply. |
| **2** | The sea takes the lower city for good. The Tallow Order is founded in the Warrens. Ledger House opens in the Wick Market. |
| **3** | The Bellfoundry opens the first **recasting furnace** — bells poured from Echo-iron, to give the Hymn more voice. |
| **5** | **The Waking.** You open your eyes in the crypt. Now. |

## 2.4 The central contradiction

This is the thesis the whole story leans on, and it is stated out loud in Chapter 7:

> Ending the plague was easy. Ilvane did it in a night.
> **Ending the Hymn means killing the dead** — everyone it saved, everyone who is currently standing in your city not-quite-alive, and the girl who is teaching you how to hold a sword.

Nobody in Verrow is lying about wanting the Hush to end. They disagree about what it costs, and they are all optimists.

## 2.5 Factions

| Faction | Leader | Wants | Motto | Playable as |
|---|---|---|---|---|
| **The Ashen Choir** | Cantor Ilvane | The Hymn maintained, forever. Verrow never dies properly. | *"Nothing ends that was not sung."* | Ending B |
| **The Tallow Order** | Warden Cassock | Hymn ended. Let the dead rest. | *"The wick is not the light."* | Ending A |
| **Ledger House** | Collector Pell | Echoes as property. Memory as currency. The status quo, monetised. | *"Everything is owed."* | Ending C enabler |
| **The Bellwrights' Compact** | Founder Halbrey | More voice for the Hymn. Pragmatists, not saints. | *"A bell is only a bell until it's rung."* | Neutral |
| **The Unbound** | *(no leader)* | Echoes that slipped the Choir and want nothing. | *(none)* | Wildcard |

**Faction pressure per act.** Act 1 is Tallow Order (nobody knows about the Choir yet). Act 2 is Ledger House and the Compact. Act 3 is the Ashen Choir itself. Each act has a different faction asking you for something, so the tallies never stop mattering.

## 2.6 Cast

| Name | Role | Arc across 9 chapters |
|---|---|---|
| **The Vigil** (you) | Player character, name chosen at creation | Ch1 doesn't know it's dead · Ch3 learns Echoes are people · Ch6 learns who *built* the Hush · Ch7 learns it was themself · Ch9 chooses |
| **Sister Maren** | Drowned confessor, Ilvane's sister, held in the candle. Narrator + tutorial. | Ch1 voice only → Ch3 first memory → Ch6 admits the ledger is hers → Ch7 admits *you* are in the candle too → Ch9 has to let go |
| **Cantor Ilvane, the Pale** | Final boss. Not a monster — a man who has been holding a city's dead up alone for five years. | Ch3 heard as a rumour → Ch5 his name on a contract → Ch7 his face on the glass → Ch9 in person |
| **Saint Orrin** | The first Vigil. Dead centuries. Namesake of the candle and the crypt. | Shrine, relic and passive presence across Act 1; his rule ("a Vigil anchors or nothing holds") is the key to Ch9 |
| **Warden Cassock** | Tallow Order leader. Recruitable ally on a Mercy path. | Ch4 appears desperate → Ch6 gives you the furnace key → Ch9 either stands with you or stands against you |
| **Ninth Sister Ysolde** | Tallow Order zealot. **Killable.** | Ch4 enemy · if killed, the Order fractures in Ch6 and Cassock is alone in Ch9 |
| **Collector Pell** | Ledger House. Buys memories, owns Echoes, keeps a ledger with your name already in it. | Ch3 enemy · Ch5 employer · Ch9 he is the one who knows where the Vigil fell |
| **Founder Halbrey** | Bellwright. Recasts bells from Echo-iron. Complicated, not villainous. | Ch6 enemy → possible ally in Ch9 |
| **Corvane, the Grey Duelist** | Rival. His build is chosen to counter *yours*. | Ch5 fight → spare him and he becomes a named Echo on your ladder; kill him and he is gone for good |
| **Lector Yune** | Ilvane's record-keeper. Copies whatever verse you used last. | Ch7 enemy. Tragic. Killing her is the fastest route to the hidden ending. |
| **Sister Oren** | Keeper of the Gate at the Lower Silence. The last Vigil's post, kept for five years by someone who isn't a Vigil. | Ch8 enemy |
| **Hollowed Sexton Bram** | Ch1 tutorial fight. Died digging graves. Remembers the shovel. | — |
| **Tollward Sedge** | Ch1 boss. The Bell-Ringer's Echo. | — |
| **Brother Ash** | Named ladder Echo. In the Vigil Ledger example. | Recurs in the Choir Floor |
| **The Salt Widow** | Named ladder Echo. Burned a whole roster down in six turns. | Recurs in the Choir Floor |

### Maren's rule

Maren is the only character who addresses the player's actual build, and she does it in **one line per chapter**, drawn from the class. She never explains the system; she explains *you*.

> **Ashblade, Ch4:** *"You bleed things and then you stand there bleeding too. I know the shape. I did it beside someone who did it exactly that way."*
> **Gravewarden, Ch4:** *"You've decided that if you can't move, you can't be reached. Someone decided that for you first."*
> **Cinder Witch, Ch7:** *"You're going to burn the records to save the man in them. Everyone does. It's the one thing the Hush is good at."*
> **Hollow Cantor, Ch9:** *"I'm going to tell you what he never told me. I'm sorry it took you five years to get here."*

---

---

# 3. Story architecture — 3 Acts, 9 Chapters

## 3.0 Structure rules

- **3 acts × 3 chapters.** Each act opens with a **prologue scene** (no fight, pure narrative + one mechanical gift), and closes with an **act boss** that is a hard wall for the build you have at that point.
- **21 campaign duels total.** Chapters 1, 2, 4, 5, 7, 8 have two fights each; Chapters 3, 6, 9 have three (regular, complication, boss).
- **One story choice per chapter** — 9 choices, 3 options each, each mapped to a hidden tally (**Mercy / Ruthless / Devotion**).
- **The player is never told which tally they are on.** The epilogue is the only place it is revealed.
- **Level gate.** Chapters are tuned for the level you arrive at. If you over-level (via the Choir Floor), the fights get harder *and* drop better gear — grinding is a real strategy, not a trap.

| Act | Title | Chapters | Levels | Act boss | Faction in the room |
|---|---|---|---|---|---|
| **I** | **The Waking** | 1–3 | 1–4 | First Vespers, the Drowned Cantor | The Tallow Order |
| **II** | **The Turning** | 4–6 | 4–7 | Mother Bell | Ledger House / The Compact |
| **III** | **The Choir** | 7–9 | 7–10 | The Pale Cantor Ilvane | The Ashen Choir |

### Act shape

```
ACT I  ── water ──────────────────────────────────────────────
  Ch1 Candle Crypt      (L1-2)  You wake. You learn the verbs.
  Ch2 Salt Road         (L2-3)  You learn the city is at war with itself.
  Ch3 Drowned Nave      (L3-4)  You learn the dead are people.  ACT BOSS.
ACT II ── street ─────────────────────────────────────────────
  Ch4 Thimble Warrens   (L4-5)  You meet the people who want it ended.
  Ch5 Wick Market       (L5-6)  You meet the people who profit from it.
  Ch6 Bellfoundry       (L6-7)  You learn what the Hymn is made of.  ACT BOSS.
ACT III── air ────────────────────────────────────────────────
  Ch7 Orrery of Ash     (L7-8)  You learn who you were.
  Ch8 Lower Silence     (L8-9)  You walk back down into the water.
  Ch9 Ashen Choir       (L9-10) You decide.  FINAL BOSS.
```

---

## ACT I — THE WAKING
*Theme: you do not know you are dead.*

### Chapter 1 — The Candle Crypt
**Location:** Cathedral of Saint Orrin, the sealed crypt. **Level 1. Fights: 2.**

You wake on a stone shelf with a candle in your hand that will not go out and no memory of your own name. The name comes back when you say it, and it stays as long as you keep saying it. Maren speaks out of the smoke for the first time and calls you *Vigil*, which is a job, not a name.

The crypt is full of people who are not moving. A sexton is still digging. A bell-ringer is still ringing. They do not see you. You find a hymn-book and the candle answers when you read it aloud — words come out wearing weight. That is a **verse**, and that is the whole combat tutorial: you say something, it happens, and then it has to recharge.

**Duel 1 — Hollowed Sexton Bram** · Gravewarden · L1 · *Teaches: Brace, Ward, what "armour" means to a player.*
He opens with Thorns and then simply refuses to die. He is the gentlest possible introduction to the fact that some enemies are worse at dying than you are.

**Duel 2 — Tollward Sedge, the Bell-Ringer's Echo** · Ashblade · L2 · *Teaches: Bleed, the first real counterplay lesson.*
He is fast and he opens with a cut that would kill a normal person. Maren tells you, once, calmly, that if you had been a normal person you would not be here.

> **Choice — "The two things you were carrying."**
> The crypt had a shroud on a body and a mace in a hand. Someone took the mace. You can take what they took.
>
> - **Take the Pallbearer's Mace.** *Ruthless +1.* The dead get lighter when you decide they were carrying too much.
> - **Take the Sexton's Shroud.** *Mercy +1.* You cover the body before you take anything.
> - **Burn the hymn-book and learn the verses yourself.** *Devotion +1.* The book was Ilvane's. You would rather not read his handwriting.
>
> **All three paths also grant the item.** The difference is the extra line, and the extra line is remembered.

**Carries forward:** an Ashblade player who took the Mace has 30% damage vs low-HP targets from Chapter 1 onward — which quietly makes the Chapter 3 boss trivial. That is *intentional*. The choices should be able to trivialise a wall. The wall is there to be broken by a build you shaped.

---

### Chapter 2 — The Salt Road
**Location:** The Old Staithe, causeway level, tar pits and toll gates. **Level 2. Fights: 2.**

The way out of the crypt is up through the nave, and the nave is a foot of black water with a rose window sinking into it. The city you climb out into has been at war with itself for five years and has not noticed you.

You meet the **Toll-Warden**, an Echo who taxes the living and the dead with equal contempt, and you meet the first **Salt Road** question: the causeway gate is held by people who will let you through if you are useful. Everyone in Verrow has an answer to that question.

**Duel 3 — Toll-Warden Brack** · Hollow Cantor · L4 · *Teaches: Hush, and why resource denial is worse than damage.*
He starves you of Resolve and then walks through a door you cannot afford. Deaf Wax exists because of this fight.

**Duel 4 — The Reaper of the Silt** · Ashblade · L5 · *Teaches: Ward, and the value of a defensive tempo.*
A dredge-crew Echo that fights in threes. It is the first enemy that punishes a build that only knows how to race forward.

> **Choice — "The gate."**
> Brack's replacement at the gate is sixteen years old and terrified, and holding the gate is the only job he has ever had.
>
> - **Open the gate and let the queue through.** *Mercy +1.* They will be late, and alive, and it is the same sentence.
> - **Pay the toll in memories.** *Ruthless +1.* Sell him a year of your past. He lets you through smiling.
> - **Sing the gate open.** *Devotion +1.* You use a verse on a door. Maren is quiet for a long moment afterwards.
>
> **Devotion note:** singing the gate is the first time the player does something *unambiguously Vigil-like*. Maren's silence is the tell.

**Carries forward:** all three routes open the gate. The route decides what the rest of Verrow calls you.

---

### Chapter 3 — The Drowned Nave
**Location:** The nave, half underwater. **Level 3. Fights: 3. Unlocks the Choir Floor.**

The wardens in the water will not touch you. Maren explains why, and the explanation is the first hard lie in the game: they will not touch you because the candle is burning, and the candle is a thing the Hush respects. You are, at this point, a walking ward, and the game lets you enjoy that for about ninety seconds.

Then **Collector Pell** arrives with an offer. He buys memories. He has already bought three of yours.

**Duel 5 — The Drowned Choristers** · Hollow Cantor · L4 · *Teaches: Curse, and debuff stacking as a real threat.*
Three of them, in sequence. The third one is singing a note that is not in any hymn.

**Duel 6 — Tithe-Collector Pell** · Cinder Witch · L6 · *Teaches: Burn, and that "damage over time" is a race you can lose slowly.*
He fights with a ledger open on a table behind him and buys a memory mid-fight, which removes one of your verses' cooldowns for two turns. The narration tells you what he took. It is always something you can stand to lose.

**Duel 7 — ACT BOSS — First Vespers, the Drowned Cantor** · Hollow Cantor · L7 · *Two phases.*
Not Ilvane. Ilvane's *first note*, still standing in the flood, held there because the Hymn has never been allowed to move. Phase 1: Curse and Fray, a debuff lock. Phase 2, at 50%: he stops defending and starts tolling, and the toll is a Hush that costs you the fight unless you brought a cleanser or you built for silence.

> **Choice — "The choristers in the water."**
> Three hundred people are standing in the nave with their mouths open. They are not drowning. They are not breathing. They are waiting to be finished.
>
> - **Finish them.** *Ruthless +1.* It's the fastest way to make a Hush stop. It is exactly what the Hush wants.
> - **Let them go.** *Mercy +1.* You break the loop. They walk out. Nobody in Verrow is ready for how many people walk out.
> - **Learn their song.** *Devotion +1.* You take the note instead of the mercy or the kill. Something in the Bellmouth answers.
>
> **Mechanically:** Ruthless +1 grants **Cantor's Tuning Fork**. Mercy +1 grants **+1 free stat point**. Devotion +1 grants **a free verse swap at any shrine in Act II** — the flexibility reward, for players who want to experiment.

**Act I ends.** The player now has: a class, a vow, a stat spread, 3 items, a working 4-verse loadout, and **the Choir Floor**.

> **Unlocks: the Choir Floor.** Your Echo can be bound, challenged, and rated. This is where the game stops being a single-player RPG.

---

## ACT II — THE TURNING
*Theme: you learn who built the Hush, and that they were reasonable.*

### Chapter 4 — The Thimble Warrens
**Location:** The alms quarter, one level up. Condemned, dry, full of people. **Level 4. Fights: 2.**

The Warrens are where the living go when the Hush takes someone. The Tallow Order runs it, and the Order's entire reason for existing is Chapter 9. Warden Cassock finds you because you are carrying a candle and the Order has been looking for a Vigil for nine years.

The Order wants you to end the Hymn. The Order also has a Ninth Sister who has started burning Echoes for their marrow because she has read the same books you have and reached a worse conclusion.

**Duel 8 — Bone-Nurse Sable** · Gravewarden · L5 · *Teaches: healing denial. A fight you cannot win by out-sustaining anyone.*
She out-heals your chip damage indefinitely. You have to either burst her or Hush her.

**Duel 9 — Ninth Sister Ysolde** · Cinder Witch · L7 · *The fight where the morality is a mechanic.*
She fights using the marrow of the dead as fuel. Her Burn is stronger than the book says it should be and the UI labels it **UNSANCTIONED**.

> **Choice — "The Ninth Sister."**
> Ysolde is down. She is nineteen, she has read everything you have read, and she is about to do to the Echoes what you just did in the nave.
>
> - **Finish her.** *Ruthless +1.* You take the marrow-furnace. It is a real item and it is terrible.
> - **Disarm her and let her live.** *Mercy +1.* She goes to the Warrens. In Chapter 6 the Order is whole and united because of you.
> - **Take her book and answer her.** *Devotion +1.* She kneels. In Chapter 6 the Order splits, and half of it will not help you.

**Carries forward — this is the first choice that visibly changes Chapter 6's fight list.** Mercy keeps Cassock and the Ninth Sister's absence means the Order sends *four* Wardens to the foundry instead of two, but they arrive as allies. Ruthless gives you the **Marrow-Furnace** item at the cost of a fractured Order. Devotion gives you **Ysolde's Vow** (Hollow Cantors gain a new vow option) and a quieter road.

---

### Chapter 5 — The Wick Market
**Location:** The trade quarter. Legally sanctioned duelling, licensed murder, excellent wine. **Level 5. Fights: 2.**

The Wick Market is where Echoes are sold. A duelling licence costs less than a loaf. Corvane is the best duellist in the quarter and he has been waiting for you specifically, because somebody told him what your build does, and he brought the answer to it.

**Duel 10 — The Wick Lad** · Cinder Witch · L5 · *A licensed warm-up. The market crowd narrates.*
You fight in front of people. Every verse you use is read aloud by the crowd, which means the whole market learns your build in one fight.

**Duel 11 — Corvane, the Grey Duelist** · *class chosen to counter yours* · L6 · *The mirror-match boss.*
**This is the fight the whole system is built around.** When the duel starts, the game reads your four slotted verses and your vow and picks from a counter table:

| Your build leans on | Corvane brings |
|---|---|
| Bleed / armor-shred | Hollow Cantor — Curse, Purify, and a Bleed-burner |
| Burn / DoT | Gravewarden — Brace, Ward, Mend the Mortar |
| Ward / Thorns / tanking | Cinder Witch — Conflagration, Fan the Flames |
| Curse / Hush / debuffs | Ashblade — raw burst before the lock lands |
| Crit / burst | Gravewarden — Bastion, Fracture, hold to 6 |
| Drain / lifesteal | Cinder Witch — burst race, out-damage the drain |

He is not stronger than you. He is **correct against you**, and the game's teaching moment is that losing to him means your build has a hole you can now see.

> **Choice — "Corvane's contract."**
> He offers you a seat on the market ladder and a cut. He also offers, off-record, to tell you what he knows about the man who sold him your build.
>
> - **Take the contract.** *Ruthless +1.* Ledger House pays you. You are, briefly, their problem.
> - **Take his blade when he falls.** *Ruthless +1, Corvane dies.* You get **Corvane's Blade** (+3 MIG, and it crits harder the lower your HP).
> - **Spare him.** *Mercy +1.* He lives, he becomes a **named Echo on your ladder**, and he will show up in your Vigil Ledger fighting for you, not against you, forever after.

---

### Chapter 6 — The Bellfoundry
**Location:** The hot terrace, one level below the Orrery. **Level 6. Fights: 3. Act boss.**

Halbrey's foundry is pouring bells out of **Echo-iron** — metal recovered from people who died in the Hush, reforged into resonance. Every new bell adds a voice to the Hymn. Ilvane is not forcing anyone. Everyone here is a craftsman doing excellent work on a horrible commission, and they are **proud**.

**Duel 12 — Furnace-Warden Grast** · Gravewarden · L7 · *Teaches: true damage. Nothing you stack helps.*
Thorns, Brace, Mend the Mortar, and forty resolve. You cannot outlast him. You have to burn through the mitigation, which is the lesson Chapter 2 tried to give you.

**Duel 13 — Founder Halbrey** · Ashblade · L8 · *NEW MECHANIC UNLOCK: Rites of Passage.*
Halbrey fights with a **Rite** — a mid-fight weapon swap that changes his damage type, his stat profile and his behaviour. He goes Steel → Shade → Ember. The UI shows the Rite on his panel and the log narrates the change. This is the campaign's introduction to a mechanic the Choir Floor reuses, so that by the time the player meets a player who uses it, they have already seen it.

**Duel 14 — ACT BOSS — Mother Bell** · *Hybrid: Gravewarden chassis, Hollow Cantor verse pool* · L8 · *Two phases, one HP pool.*
A recast bell grown enormous and given a shape. While **molten** it is armoured, thorned and nearly unkillable by direct damage. While **cooling** it is fragile but casts Shade. The whole fight is **managing the temperature**, and the game shows the temperature as a bar. DoT wins this fight by a mile. So does nothing at all, if you didn't bring DoT.

> **Choice — "The furnace."**
> The recasting can be stopped. Everyone in the foundry loses their livelihood and the last two years of work in one afternoon. Nobody dies. That is the point — the cruelty here is economic, and it is the cruellest thing in the game.
>
> - **Quench it.** *Mercy +1.* The Echo-iron cools. The Echoes in it are finally, permanently still. Halbrey hates you. Cassock gives you the Gate key.
> - **Feed it.** *Ruthless +1.* You put something of yours in the pour. You come out of this fight with +1 permanent Resolve at the start of every fight, forever, and Halbrey names the bell after you.
> - **Turn the pour.** *Devotion +1.* You re-tune the bell to a different note and it *fights on your side* in Chapter 9 as an ally. You do not fully understand what you have done yet.

**Act II ends.** The player is level 7, has 5–6 items, has met every faction, and has a second half of the game that is not about building but about deciding.

---

## ACT III — THE CHOIR
*Theme: you learn who you were, and then you have to decide what that is worth.*

### Chapter 7 — The Orrery of Ash
**Location:** The observatory, high above the foundry. A dome of ash-glazed brass. **Level 7. Fights: 2. THE REVEAL.**

Everything in the Orrery is a model of a bell. Ilvane built the city as an instrument.

Here Maren tells you. Not in a cutscene — in a fight, because she is an Echo too and has been holding back the only weapon that matters. She tells you while the Lector is copying your verses.

**Duel 15 — Lector Yune** · Hollow Cantor · L8 · *The mimic.*
Yune **copies the last verse you cast** and casts it back at you on the next turn. It is the hardest enemy in the campaign for a build that repeats itself, and the easiest for a player who has been told to vary their rotation. Her version of your verse is at 80% power, which is a mercy, and a hint.

**Duel 16 — The Pale Cantor, First Movement** · Hollow Cantor · L9 · *A dry run.*
Not Ilvane. **A recording of Ilvane, from the night of the Hymn, still running.** It does the thing the Hymn does. You fight a memory of the event that created you.

> **Choice — "The record."**
> The Orrery keeps a record of the Vigil who fell. It has a name, and the name is not the one you chose at creation, and it is written in Ilvane's hand.
>
> - **Read the name aloud.** *Devotion +1.* You say it, and the Orrery answers, and something in the Bellmouth stops singing for exactly one second.
> - **Burn the record.** *Mercy +1.* Whatever you were, you were a person, and a person does not have to keep their paperwork.
> - **Take the name and keep it.** *Ruthless +1.* You pocket it. You do not read it. You keep it. Maren does not push, which tells you she knows exactly what's in there.

---

### Chapter 8 — The Lower Silence
**Location:** Under the cathedral, under the waterline. The road back down. **Level 8. Fights: 2.**

The stair down to the Lower Silence is the road the last Vigil walked, in the same direction, five years ago, and did not walk back up.

**Duel 17 — The Tide-Bound** · Cinder Witch · L9 · *Burn that ignores Ward.* Labeled **SALT-SOAKED.** The counterplay is the oldest one in the game: burst it before the burn lands, or build mitigation you already had.
**Duel 18 — Sister Oren, Keeper of the Gate** · Gravewarden · L9 · *The last Vigil's post, held by someone who was never a Vigil.* She has been guarding a door for five years for a person who is currently standing in front of her. She fights to keep you on the wrong side of it, and she is not wrong to.

> **Choice — "The gate."**
> Oren is down. Behind her is the stair to the Bellmouth and the drowned old city, and the Hush, which is the Hymn, which is a room full of people singing your name.
>
> - **Send her up first.** *Mercy +1.* She goes out. She will be waiting at the top of the stair in Chapter 9, and it changes that fight.
> - **Take the Gate ring.** *Ruthless +1.* **Vigil's Ring.** +3 GRD and Brace is free.
> - **Walk past her.** *Devotion +1.* You don't take the ring, you don't send her up. You just go. Maren walks with you and does not say anything, which is the most Maren has ever said.

---

### Chapter 9 — The Ashen Choir
**Location:** The Bellmouth, the top of the city, full of singing. **Level 9. Fights: 3. FINAL BOSS.**

The Bellmouth is not a room. It is a throat. Everyone who died in the Hush is in here, standing, singing the note Ilvane has been holding for five years because he has nobody to hand it to.

**Duel 19 — The Unbound Chorus** · *three sequential weak Echoes, one per class* · L9.
**Duel 20 — Ilvane's Second** · Ashblade · L10 · *The Cantor he was before the Hymn. Fast, aggressive, and completely human.* He is the only fight in the game where the enemy uses no debuffs at all, which is a genuine change of pace after eight chapters of status effects.
**Duel 21 — FINAL BOSS — The Pale Cantor Ilvane** · Hollow Cantor · L10 · *Three phases.*

| Phase | Trigger | Behaviour | What it tests |
|---|---|---|---|
| **I — The Duellist** | 100–66% | Curse, Hush, Tolling Bell. A straight Cantor fight. | Do you actually have a build, or did you stall for nine chapters? |
| **II — The Hymn** | 66–33% | Heals for a percentage of damage dealt. Summons two Choristers at 50% and 25%. The fight becomes a race. | Burst. Purification. Everything you saved. |
| **III — The Baton** | 33–0% | **He copies your verses.** He casts your build at you, using your coefficients, at 100% power. | The only way through is a verse he has no copy of — a relic, a mark, or a verse you have never cast. |

**Phase III is the entire design thesis.** Ilvane can do anything you can do, because he built the system. The answer is that you have one thing he does not: **you have been someone other than him for nine chapters.** The relic, the vow, the uncast verse — the reward for a player who explored.

> **FINAL CHOICE — "The baton."**
> Three options. The epilogue is then filtered by your dominant tally.
>
> - **Silence the Hymn.** Stop the song. Every Echo in the Bellmouth lies down, including you. *(Ending A)*
> - **Take the baton.** Ilvane is five years tired and you are not. You rule Verrow as a sovereign of the unquiet dead. *(Ending C)*
> - **Sit down and sing.** You take a seat in the Choir and become the next voice in the Hymn, forever. *(Ending B)*
> - **The fourth thing** *(appears only if the Hidden Ending condition is met — see §4.4)*

**Act III ends.** Epilogue. Title. The ladder.

---

---

# 4. Endings

## 4.1 Structure

Three final choices × three dominant tallies = **nine readable epilogues**, plus one hidden ending that is not reachable through any single choice and is gated on the whole run. Every epilogue is 3 paragraphs: **what you did**, **what happened to Verrow**, **what happened to the people you met**. Nobody gets a summary screen. You get a scene.

The tally is never shown during play. It is revealed in the epilogue, framed as Maren reading it off the ledger, and it appears as a permanent line on the player's ladder profile: `Tally: Mercy 4 · Ruthless 2 · Devotion 3`.

## 4.2 The nine

### ENDING A — **Silence the Hymn**
*The Hymn stops. Everyone in the Bellmouth lies down. Including you.*

| Tally | Epilogue |
|---|---|
| **A-Mercy** | The Choir falls all at once, like a held breath. It is quiet, and the quiet is enormous. In the Warrens, three hundred people who had been holding a door for five years put it down and sleep for the first time since the Hush. Oren, if you sent her up, makes it to the top of the stair and does not recognise the sky. Maren is the last Echo standing, because Maren is in the candle and the candle went out with you. She says: *"Good. That was a long time to hold."* You do not hear the second half. |
| **A-Ruthless** | It is not a mercy, whatever the Tallow Order will write. The Bellmouth empties in nine seconds. Somewhere under the city a sexton stops digging. Somewhere in the market a duellist's licence goes stiff in its frame. The Order wins and immediately has nothing to do with itself, and Cassock, who has wanted this for five years, sits down on the top step of the Cathedral and does not move for a day. Verrow is quiet. Verrow is a graveyard with a bakery. |
| **A-Devotion** | You end it the way Ilvane started it — with the voice. The Last Hymn has a natural ending; it was always a phrase, not a wall, and the phrase finishes. The Choir goes out on the last note Ilvane ever wrote, which is the one he was holding for you. The bells stop ringing at night. Verrow does not celebrate. Verrow exhales. The tide goes out another four hundred yards and stays there. |

### ENDING B — **Join the Choir**
*You take a seat. You are the next voice. You will be here a long time.*

| Tally | Epilogue |
|---|---|
| **B-Mercy** | You take the seat and you spend the first year rewriting the terms. An Echo who sings by choice can refuse to sing. You write that clause yourself, in the margin, in Ilvane's hand so he will accept it. Corvane's turn comes and he is allowed to decline, and he does, and he leaves. Everyone gets the same offer. The Choir becomes a choir. The dead stay dead-but-standing, awake, and roughly nine percent of them leave town. It is not rest. It is, for the first time in five years, consent. |
| **B-Ruthless** | You take the seat and you take the schedule. The Unbound Chorus is reassigned to the deep watch. Oren is relieved of a post she held for five years and is given a better one. Pell buys your contract, and you sell it, because someone has to own the arrangement. The Choir is not cruel under you. It is simply efficient, and it is yours, and it runs on your time. Ilvane finally sleeps. You are awake for a very long time. |
| **B-Devotion** | You take the seat and it is the most peaceful thing that has ever happened to you. The Hymn is not a punishment. It is the only thing in Verrow that still works. You learn the whole of it — every phrase, every one of the eleven years of songs before the Last Hymn, the ones Ilvane learned as a boy in this city when it was loud and full of bells. You sing them back. For the first time since you woke in the crypt, you remember all of your name. |

### ENDING C — **Take the Baton**
*Ilvane is five years tired. You are not. You rule.*

| Tally | Epilogue |
|---|---|
| **C-Mercy** | You take the baton and you change what the Hush is *for*. No new names go in the Choir. The dead who are still standing are offered the door, one at a time, in a room with a window, by someone who sits with them. It takes eleven years. Verrow becomes the first city in the world where death is negotiable, and it costs you every night, because the Hymn does not take nights off. Maren stays to help. She says it is because she cannot leave. She says it twice. |
| **C-Ruthless** | You take the baton and you end the argument. The Ledger House becomes the Treasury. Pell is appointed Keeper of the Register and is Thrilled. Echoes are counted, catalogued, and assigned to a bell. Corvane's Echo is entered under your seal without his permission. The city is safe, the Hush is stable, and every single person in Verrow knows exactly what they are worth and whose name is on the ledger. The Tallow Order is dissolved for stirring. There is no war. There is no peace either. There is administration. |
| **C-Devotion** | You take the baton and you do the thing Ilvane could not: you anchor it. Saint Orrin's rule is the whole of it — *a Vigil anchors, or nothing holds* — and Ilvane has been holding a city's dead up on nothing but will for five years. You are a Vigil. You are also an Echo, which is why the Hush never counted you. So you do the impossible arithmetic and become the fixed point yourself. The Hymn stops costing anyone. The bells ring on time. Verrow is not free and not happy. Verrow is *kept*. |

## 4.3 Titles

The title appears next to your name on the ladder, permanently, and is chosen from the ending path plus the dominant tally.

| Path | Mercy | Ruthless | Devotion |
|---|---|---|---|
| **A — Silence** | *The Kind Hand* | *The Bell-Breaker* | *The Last Verse* |
| **B — Choir** | *Voice of Ash* | *Warden of Voices* | *Cantor Minor* |
| **C — Baton** | *The Long Keeper* | *Cantor of Ash* | *The Fixed Point* |

> *Cantor of Ash* is carried over verbatim from 0.1.0 and remains the Ruthless-Baton title. It is the most-coveted title on the ladder and it is not the best ending. That is intentional and the ladder never explains it.

## 4.4 The hidden ending — **UNMAKE**

**Gated on the whole run, not on a single choice:**

```
Devotion  ≥ 3
AND Mercy ≥ 3
AND Burn (unlocked verses) count  < 3
AND you bound your own Echo to the Choir Floor and lost to it at least once
```

It appears in Chapter 9 as **"The fourth thing"** and replaces the final choice. The final boss fight still happens first — you still have to beat Ilvane — but Phase III changes.

**The Unmake epilogue:**

> Ilvane is right about one thing and wrong about the rest. The Hymn needs a Vigil. The Hymn does not need a *Vigil*. The difference is the whole of it.
>
> You do not take the baton and you do not stop the song. You do the thing nobody has done in five years: you sing a note that is not in the Hymn. Not against it. *Alongside* it, a second voice, a counter-melody, sung by someone the Hush cannot hear because you are already an Echo and Echoes do not have to obey the song.
>
> It takes eleven days. On the twelfth, the Grey Hush ends — not dies, *ends*, the way a held note ends, having gone all the way to the end of what it was.
>
> Ilvane is still alive. He is the only person in Verrow who was never dead, and he has five years of silence to work through, and someone has to sit with him while he does it. You sit. Maren sits. Corvane, if you spared him, brings wine and does not say anything clever.
>
> The bells do not ring at night. **In the morning they ring**, and someone has to be there, and it turns out that someone is you, and you are fine with it, and that is the whole ending.

**Unmake title:** *The Counter-Voice* — a single unaccounted title on the entire ladder, no description, no hints. Finding it is a community achievement, not a grind target.

## 4.5 What carries into the Choir Floor after an ending

- Your **ending path and title** are permanent on your profile.
- Your **bound Echo survives your ending.** It stays on the Choir Floor and keeps fighting after the campaign ends. This is the emotional payoff of the whole design: the campaign is about what you *were*, the ladder is about what you *are*.
- An **A-Mercy** run cannot bind a new Echo afterwards (the Hymn is over; the Echo goes where the rest went). You keep the one you had.
- A **B** or **C** run can re-bind and re-doctrinely at will.
- An **Unmake** run can do both, and the ladder shows a single line under their name: *The Counter-Voice · the Hymn is over · their Echo is still fighting.*

---

---

# 5. Combat core

Unchanged in substance from 0.1.0; the v1 additions are marked **NEW**. All numbers below are the tuning targets that the balance harness (§15.4) must hold.

## 5.1 Stats

| Stat | Abbr. | Does |
|---|---|---|
| Vigor | VIG | Max HP, healing power |
| Might | MIG | Steel damage, Bleed strength |
| Wit | WIT | Ember and Shade damage, Burn strength, Wards |
| Guard | GRD | Damage mitigation, Guard-scaling skills |
| Haste | HST | Turn order, crit chance |

- **Max HP** = 60 + 8 × VIG
- **Mitigation**: Steel 2% × GRD; Ember and Shade 1% × GRD; capped at 60%
- **Crit chance** = 5% + 1% × HST; crits deal ×1.5
- **Turn order**: higher HST goes first; ties broken by a bounded random measure (§10). The second mover starts with **+1 Resolve** to offset first-move advantage.

## 5.2 Class base stats

Each class totals 27 points. The player adds **4 free points** at creation and **2 more per level** (level cap 10).

| Class | VIG | MIG | WIT | GRD | HST | Identity |
|---|---|---|---|---|---|---|
| **Ashblade** | 6 | 8 | 2 | 4 | 7 | Steel, Bleed stacks, crits, lifesteal |
| **Cinder Witch** | 5 | 2 | 9 | 3 | 8 | Ember, Burn, burst, resource tricks |
| **Gravewarden** | 9 | 5 | 2 | 8 | 3 | Armor, Wards, Thorns, Stun |
| **Hollow Cantor** | 7 | 2 | 8 | 4 | 6 | Shade, Curse, Hush, drain |

**NEW — class kits vs. class kits.** Each class has one *signature* interaction against each other class, surfaced in the pre-fight "reading" panel so the player learns counterplay from the UI, not from a wiki:

| | vs Ashblade | vs Cinder Witch | vs Gravewarden | vs Hollow Cantor |
|---|---|---|---|---|
| **Ashblade** | — | Burn outpaces you | Bleed ignores armor | They cleanse your Bleed |
| **Cinder Witch** | You burn faster than they bleed | — | Conflagration cracks armor | Hush starves your engine |
| **Gravewarden** | You outlast the burst | Ward blunts burn | — | Stun locks their lock |
| **Hollow Cantor** | Curse slows their crits | Shade outpaces burn | Fray breaks their armor | — |

## 5.3 Resolve (the resource)

- Start of fight: 3 Resolve (second mover: 4).
- Each of your turns begins with **+3 Resolve** (cap 10).
- Verses cost Resolve; some have cooldowns.
- **Strike** costs 0, deals small damage in your class's damage type (2 + 0.4 × your main stat) and refunds **+1 Resolve**. A fighter can always act, and skipping a big verse to bank Resolve is a real decision.

## 5.4 Damage

```
raw        = base + Σ(coefficient × stat)
raw       ×= 1 + damage bonuses (marks, vows)
raw       ×= 0.75 if the attacker is Cursed
crit       : chance 5% + 1%×HST (+ bonuses), multiplier ×1.5
mitigation : Steel 2%×GRD, Ember/Shade 1%×GRD
             +40% if Braced, Guard ×0.6 if Frayed, capped at 60%
damage     = round(raw × (1 − mitigation)), minimum 1
Ward absorbs damage first.
```

**NEW — rounding contract.** All internal math is float. **Exactly one rounding happens, at the final line.** No intermediate term is ever rounded, and no term is ever applied in a different order depending on which code path ran. Mitigation is summed into a single `mitigation` value before it is applied. This is what makes the "round controlled randomness" of §10 actually work: two mathematically identical fights produce identical numbers, always.

Bleed, Burn, Thorns and Fatigue are **true damage** and ignore mitigation. This is why armour builds still fear damage-over-time.

## 5.5 Statuses

| Status | Effect | Duration |
|---|---|---|
| **Bleed** | Stacks to 5. At the start of the target's turn, deals stacks × (2 + 0.18 × source MIG) true damage. | 3 turns, refreshed by new stacks |
| **Burn** | At the start of the target's turn, deals (base + 0.25 × source WIT) true damage. Reapplying keeps the higher value and refreshes. | 3 turns |
| **Curse** | Target deals 25% less damage. | 2 turns |
| **Fray** | Target's Guard is multiplied by 0.6. | 3 turns |
| **Hush** | Target's Resolve gain is reduced by 2 (minimum +1). | 2 turns |
| **Brace** | +40% mitigation until your next turn. | 1 turn |
| **Ward** | Absorbs damage before HP. | 3 turns or until broken |
| **Thorns** | Attackers who land a direct hit take X true damage. | 3 turns |
| **Stun** | Target skips its next turn, then cannot be stunned again until it has taken two turns. | 1 turn |
| **Rite** (NEW) | Marks the target as being in a phase of a multi-phase fight. Visible on the panel. Changes damage type and stat profile. | until the phase ends |

**NEW — status chip rules.** Every status shows: icon, name, remaining turns, and **one number that matters** (stack count, potency, or absorb pool). A player should never have to open a tooltip to know whether their burn is winning. Colours are fixed per status (§11.4) and are the only saturated colour in the UI.

**NEW — cleanse rule.** `Purify` and `Dissonance` remove **all** debuffs, including stack-based ones. Burn and Bleed are both removed by cleanse. There is no partial cleanse anywhere in the game, so a cleanse always feels decisive.

## 5.6 Fatigue ("The Bell Tolls")

From round 16, both fighters take true damage starting at 2 and growing by 2 each round. **Every fight ends.**

**NEW — the last three rounds.** From round 13, Fatigue is telegraphed: a bell icon appears in the log gutter and the UI shows a `TOLL IN 3` counter. From round 16, Fatigue doubles. A player who sees `TOLL IN 3` and has no burst available *knows* the fight is lost, and that knowledge is the point — it converts a silent grind into a visible clock.

## 5.7 NEW — Rites of Passage (boss mechanic, reused on the ladder)

A **Rite** is a mid-fight transformation. It is introduced in Chapter 6 (Founder Halbrey) and reused by:
- **Mother Bell** (temperature cycling: molten ↔ cooled)
- **The Pale Cantor, Phase III** (copies your verse pool)
- **Four named Echoes on the Choir Floor** and **one player-doctrined Echo archetype**

A Rite is a data object: `{ trigger: {atHP: 0.66} | {onTurn: 4}, change: { damageType, statMults, versePool }, line: "narration" }`. Rites are the game's one "scripted" mechanic and they are what makes a boss feel authored rather than stat-buffed.

## 5.8 NEW — the pre-fight Reading

Before any fight, a **Reading** panel shows:
- Your build in one line: `Ashblade · Red Tide · Rend / Opening Cut / Flay / Drink Deep`
- The enemy's class, level, **one line naming their likely threat** (e.g. *"It heals. It will not stop healing."*)
- **Your natural counter** against them, if one exists (*"Burn ignores armour."*)

The Reading is generated from a small rules engine over enemy archetypes, not hand-written per enemy — but every enemy also carries a hand-written override line so the top 12 fights feel authored. **No fight is a surprise**, which is what lets the randomness be generous (§10).

---

---

# 6. Verses

Players slot **4 verses** from their class pool plus the common hymns. Class verses unlock by level, so loadout space grows as the campaign progresses. Verses are listed in *priority order* — this order is the Echo's turn order on the Choir Floor.

## 6.1 Common hymns (any class)

| Verse | Cost | CD | Effect |
|---|---|---|---|
| Strike | 0 | none | Basic attack, refunds +1 Resolve (always available, not a slot) |
| Steady Breath | 1 | 2 | Brace |
| Purify | 2 | 4 | Remove all your debuffs |
| Second Wind | 3 | 5 | Heal 10 + 0.8 × VIG |
| **Vigil's Rest** *(NEW)* | 1 | 3 | Gain +4 Resolve and remove 1 debuff |
| **Stand Fast** *(NEW)* | 2 | 4 | Brace and gain 6 Ward |

## 6.2 Ashblade

| Verse | Unlock | Cost | CD | Effect |
|---|---|---|---|---|
| Rend | L1 | 2 | none | Steel 5 + 0.9 MIG, +1 Bleed |
| Opening Cut | L1 | 3 | none | Steel 8 + 1.0 MIG, +25% crit chance |
| Flay | L1 | 4 | none | Steel 4 + 0.6 MIG, +2 Bleed |
| Drink Deep | L2 | 3 | 3 | Steel 6 + 0.8 MIG, heal 50% of damage dealt |
| Reap the Red | L3 | 3 | 2 | Remove all Bleed from target, deal 4 + 0.4 MIG per stack (ignores mitigation) |
| Slip the Hymn | L4 | 2 | 3 | Brace, gain +1 Resolve |
| Red Flurry | L5 | 5 | none | Three hits of 3 + 0.45 MIG, each rolls crit separately |
| **Crimson Waltz** *(NEW)* | L6 | 4 | 3 | Steel 7 + 0.8 MIG, +2 Bleed, gain 1 Resolve per Bleed stack on the target |
| **Blood Ledger** *(NEW)* | L7 | 5 | 4 | Deal 5 + 0.5 MIG per Bleed stack on the target, ignoring mitigation; consume all stacks |

## 6.3 Cinder Witch

| Verse | Unlock | Cost | CD | Effect |
|---|---|---|---|---|
| Spark | L1 | 2 | none | Ember 5 + 0.8 WIT, applies Burn |
| Cinderfall | L1 | 4 | none | Ember 9 + 1.1 WIT |
| Stoke | L1 | 3 | 2 | Double the target's Burn potency (cap 14), refresh duration |
| Ashen Veil | L2 | 3 | 3 | Ward 8 + 0.9 WIT |
| Choking Smoke | L3 | 3 | 3 | Ember 3 + 0.4 WIT, Hush |
| Fan the Flames | L4 | 0 | 3 | Gain +4 Resolve, take 4 true damage |
| Conflagration | L5 | 6 | 3 | Ember 10 + 1.3 WIT, +50% if the target is burning |
| **Cinder Shroud** *(NEW)* | L6 | 3 | 4 | Ward 10 + 1.0 WIT, remove 1 debuff |
| **Sear the Note** *(NEW)* | L7 | 4 | 3 | Ember 8 + 1.0 WIT, ignores half of the target's mitigation, +1 Burn potency |

## 6.4 Gravewarden

| Verse | Unlock | Cost | CD | Effect |
|---|---|---|---|---|
| Bulwark Strike | L1 | 2 | none | Steel 3 + 0.5 MIG + 0.6 GRD |
| Hold the Line | L1 | 2 | 2 | Brace, heal 3 + 0.4 VIG |
| Sepulchral Spikes | L1 | 3 | none | Thorns (4 + 0.2 GRD) for 3 turns |
| Gravebind | L2 | 4 | 4 | Steel 4 + 0.5 GRD, Stun |
| Mend the Mortar | L3 | 3 | 3 | Heal 8 + 1.2 VIG |
| Earthen Toll | L4 | 5 | none | Steel 8 + 0.8 MIG + 0.8 GRD, Fray |
| Crypt Door | L5 | 4 | 4 | Ward 10 + 1.2 GRD, Brace |
| **Stone Vigil** *(NEW)* | L6 | 3 | 4 | Brace and Thorns (4 + 0.2 GRD) |
| **Last Rites** *(NEW)* | L7 | 4 | 4 | Heal 10 + 1.0 VIG, gain 8 + 0.8 GRD Ward, remove 1 debuff |

## 6.5 Hollow Cantor

| Verse | Unlock | Cost | CD | Effect |
|---|---|---|---|---|
| Dirge | L1 | 2 | none | Shade 4 + 0.7 WIT, Curse |
| Wither Note | L1 | 3 | none | Shade 6 + 0.8 WIT, Fray |
| Soul Siphon | L1 | 3 | 2 | Shade 5 + 0.7 WIT, heal 60% of damage dealt |
| Tolling Bell | L2 | 4 | 3 | Shade 6 + 0.8 WIT, Hush |
| Dissonance | L3 | 3 | 3 | Remove all your debuffs, Ward 5 + 0.5 WIT |
| Lullaby | L4 | 4 | 4 | Curse and Hush |
| Requiem | L5 | 6 | 3 | Shade 12 + 1.2 WIT, +20% per distinct debuff on the target |
| **Grave Cadence** *(NEW)* | L6 | 4 | 3 | Shade 7 + 0.9 WIT, Curse and Hush |
| **Seventh Verse** *(NEW)* | L7 | 6 | 4 | Shade 10 + 1.1 WIT, +1 damage for each debuff on the target (max +4); consume 1 debuff |

### Verse count

| | 0.1.0 | v1.0 |
|---|---|---|
| Common hymns | 4 | 6 |
| Ashblade | 7 | 9 |
| Cinder Witch | 7 | 9 |
| Gravewarden | 7 | 9 |
| Hollow Cantor | 7 | 9 |
| **Total** | **32** | **42** |

---

# 7. Vows

A vow is the rule that defines how your build plays. One per build, chosen at creation, swappable at shrines during the campaign.

## 7.1 Class vows (from 0.1.0, unchanged)

| Class | Vow | Effect |
|---|---|---|
| Ashblade | **Red Tide** | Bleed cap 8, Bleed ticks +1 |
| | **Duelist** | +15% crit chance, crits deal ×1.75 |
| | **Hunger** | Heal 12% of direct damage dealt |
| Cinder Witch | **Slow Ash** | Burn lasts +2 turns, +1 potency |
| | **Pyre** | +20% Ember direct damage against burning targets |
| | **Kindling** | +1 Resolve whenever your Burn ticks on the enemy |
| Gravewarden | **Bastion** | +10% mitigation, Brace is 20% stronger |
| | **Thorn-Bearer** | Thorns +4, 25% chance of +1 Resolve when hit |
| | **Long Dark** | Heal 4% max HP at the start of your turn |
| Hollow Cantor | **Last Hymn** | Curse reduces damage by 40% and lasts +1 turn |
| | **Echoing Grief** | +8% Shade damage per debuff on the target |
| | **Silence** | Hush reduces Resolve gain by 3, and you gain +1 Resolve when you apply it |

## 7.2 NEW — Story vows (unlocked by campaign choices)

These are not in the creation screen. They appear in your vow list once earned, with a line of text explaining where they came from. Earning a vow is the single strongest reward in the game, because a vow *redefines* the build.

| Vow | Class | Unlocked by | Effect |
|---|---|---|---|
| **Ninth Sister's Vow** | Hollow Cantor | Ch4 — Devotion (answer Ysolde) | Hush power +1, Curse lasts +1 turn. *The Order's book, read in a voice that is almost like yours.* |
| **The Warden's Oath** | Gravewarden | Ch4 — Mercy (disarm Ysolde) | When a target is Braced or Warded, you take 50% less damage and gain 1 Resolve |
| **Ledger's Price** | any | Ch5 — Ruthless (take Corvane's contract) | +12% damage while the target has 2 or more debuffs; you cannot gain Resolve above 8 |
| **Grey Duelist** | Ashblade | Ch5 — Mercy (spare Corvane) | +1 crit chance per stack of Bleed on the target, cap +15% |
| **Twelve Tolls** | Cinder Witch | Ch6 — Ruthless (feed the furnace) | +1 permanent starting Resolve; Burn potency +1 |
| **The Turned Pour** | Gravewarden | Ch6 — Devotion (turn the pour) | Ward is 50% stronger; Brace also heals 2 + 0.3 VIG |
| **Fixed Point** | any | Ch7 — Devotion (read the name aloud) | You start every fight with 1 Resolve and your first Brace each fight is free |
| **No Paper** | Hollow Cantor | Ch7 — Mercy (burn the record) | All your debuffs last +1 turn; your cleanse also heals 5 + 0.5 VIG |
| **Keeper's Ring** | Gravewarden | Ch8 — Ruthless (take the Gate ring) | +3 GRD, Brace costs 0 Resolve |
| **The Long Walk Down** | any | Ch8 — Devotion (walk past her) | You ignore the first instance of Stun each fight and take 50% less damage while under the Tideline |
| **The Counter-Voice** | any | Unmake ending | See §4.4. Your Echo fights with a second, hidden verse pool it does not show the opponent. |

**Vow count:** 12 → **23** (12 class vows + 11 story vows).

---

# 8. Gear & marks

Three slots: **Weapon, Vestment, Relic**. Each item gives small stat bonuses and one **mark**, a passive that bends a rule. Items are hand-written with a line of lore, never randomly generated.

The **Affinity** column shows which class the item is designed around. An item can be worn by anyone, but at least one class gets a meaningful bonus from it — this is the "it fits" rule, and it also means a 41-item library is readable instead of a bag of noise.

## 8.1 Weapons (13)

| Item | Aff. | Stats | Mark | Source |
|---|---|---|---|---|
| **Pallbearer's Mace** | Ashblade | +2 MIG | +30% damage against targets under 35% HP | Ch1 choice |
| **Cantor's Tuning Fork** | Cantor | +2 WIT | Direct hits have a 20% chance to Hush | Ch3 Ruthless |
| **Wick-Cutter** | Ashblade | +1 MIG, +1 HST | The first Bleed you apply each fight adds +2 stacks | Ch1 boss |
| **Grave-Shovel of Bram** | Warden | +2 GRD | Start each fight with Brace | Ch1 choice |
| **Rites of Passage** | Ashblade | +1 MIG, +1 WIT | Once per fight, become Ember and gain +20% damage for 2 turns | Ch6 — Halbrey |
| **Corvane's Blade** | Ashblade | +3 MIG | Crits deal ×1.6, and +20% more the lower your HP | Ch5 Ruthless |
| **Salt-Reaper's Scythe** | Ashblade | +2 MIG, +1 HST | The first hit each fight applies +2 Bleed | Ch2 boss |
| **Bellmetal Maul** | Warden | +1 GRD, +1 HST | Brace also grants 4 Ward | Ch2 choice |
| **Ysolde's Censer** | Witch | +1 WIT | Burn potency +2; your Burn ticks deal 1 damage to you | Ch4 Ruthless |
| **Choir-Scale Blade** | any | +2 MIG | +1 damage for each debuff on the target | Ch5 — Ledger House |
| **Tollward's Rod** | Cantor | +1 WIT, +1 HST | Your Hush reduces Resolve gain by 3 instead of 2 | Ch2 boss |
| **Founder's Chisel** | Warden | +2 GRD | Your Thorns reflect +50% of the damage that triggered them | Ch6 — Compact |
| **Pale Ash Blade** | any | +1 MIG, +1 WIT, +1 HST | +10% damage against targets above 80% HP | Ch7 — Orrery |

## 8.2 Vestments (13)

| Item | Aff. | Stats | Mark | Source |
|---|---|---|---|---|
| **Sexton's Shroud** | Warden | +2 GRD | Start each fight with 10 Ward | Ch1 choice |
| **Drowned Mantle** | any | +2 VIG | Heal 3 at the start of your turn | Ch3 — Choir Floor |
| **Bellmetal Gauntlets** | Warden | +1 MIG, +1 GRD | Attackers take 3 true damage when they hit you | Ch2 boss |
| **Orrery Robe** | Cantor | +1 WIT, +1 HST | Hush you apply lasts +1 turn | Ch7 boss |
| **Thimble Coat** | any | +2 VIG | Take 2 less Fatigue damage per round | Ch4 |
| **Warden's Cassock** | Warden | +2 GRD, +1 VIG | Brace lasts 1 extra turn | Ch4 Mercy |
| **Cinder Apron** | Witch | +1 WIT, +1 VIG | Burn you apply lasts +1 turn | Ch6 — Compact |
| **Tide-Soaked Vestment** | any | +2 VIG | Immune to Burn | Ch8 — Lower Silence |
| **Grey Pilgrim's Coat** | any | +1 HST, +1 GRD | Start each fight with +1 Resolve | Ch5 — market |
| **Founder's Leather** | Warden | +1 GRD, +1 HST | Ward also absorbs 1 damage from each DoT tick | Ch6 — Compact |
| **Drowned Chorister's Robe** | Cantor | +1 WIT, +1 VIG | You gain +2 Resolve whenever you apply Hush | Ch3 boss |
| **Ash-Glazed Brass** | Warden | +1 GRD, +1 WIT | Your mitigation cap is raised to 70% | Ch7 — Orrery |
| **Vigil's Mantle** | Warden | +2 GRD | Start each fight with 8 Ward and Brace | Ch8 Ruthless |

## 8.3 Relics (15)

| Item | Aff. | Stats | Mark | Source |
|---|---|---|---|---|
| **Reliquary Lantern** | Witch | +2 WIT | Burn potency +1 | Ch2 — market |
| **Deaf Wax** | any | +1 GRD | Immune to Hush and Stun | Ch3 — market |
| **Candle of Saint Orrin** | any | +2 VIG | Once per fight, survive a lethal hit at 1 HP | Ch1 — start |
| **Gravedust Censer** | Cantor | +1 WIT | Your Curse is 35% instead of 25% | Ch4 — Warrens |
| **Hourglass of Ash** | any | +2 HST | +1 starting Resolve | Ch5 — market |
| **Tithe-Collector's Ledger** | any | +1 HST | +10% damage | Ch3 boss |
| **Marrow-Furnace** | Ashblade | +2 VIG | Bleed stacks to 7 instead of 5 | Ch4 Ruthless |
| **Bell of Nine Tolls** | any | +1 HST | At the start of round 3, gain 3 Resolve and Brace | Ch6 act boss |
| **Ysolde's Vow** | Cantor | +1 WIT | Hush +1 power, Curse +1 turn | Ch4 Devotion |
| **Vigil's Ring** | Warden | +3 GRD | Brace costs 0 Resolve | Ch8 Ruthless |
| **Orrery Lens** | any | +1 WIT, +1 HST | The second cast of each verse costs 1 less Resolve | Ch7 — Orrery |
| **Corvane's Grey Coat** | any | +1 HST, +1 GRD | Start each fight with 6 Ward; immune to Hush while Braced | Ch5 Mercy |
| **Salt Widow's Comb** | any | +1 HST, +1 WIT | You win all turn-order ties | Choir Floor — named Echo |
| **Choir-Seal** | Cantor | +2 WIT | Hush you apply also reduces the target's crit chance by 10% | Ch9 — Choir |
| **Leaden Key of the Gate** | any | +1 VIG, +1 GRD | Start each fight with 10 Ward and +1 Resolve | Ch8 — Lower Silence |

**Item count:** 12 → **41**. Every class has at least 5 items that visibly favour it, and every status (Bleed, Burn, Curse, Fray, Hush, Brace, Ward, Thorns, Stun, Fatigue) has **at least one item or vow that counters it** and at least one that amplifies it.

### 8.4 Loot rules

- **Campaign fights award fixed items.** You always get them; the choice item in that chapter's choice comes on top.
- **Choir Floor wins** have a 12% chance to drop an item you do not own, weighted toward your class affinity, with a pity rule at 30 wins.
- **Bosses** always drop their signature item plus a random from their own table.
- **No random stats.** No item ever rolls "+2 to a random stat". This is deliberate: randomness belongs in the fight, not in the shopping.
- **The Ledger House vendor** (Act II) sells 3 items for memories you no longer have — a currency mechanic that makes "give up a memory" a real, visible cost.

---

---

# 9. Enemy roster

Every campaign enemy is a full build, not a stat blob. Each one has a **signature verb** — the thing it does that makes it that enemy rather than a generic HP pool — and a **counter** the player can find from the pre-fight Reading.

**Stat budget.** `budget(L) = 27 (class base) + 4 (creation) + 2 × (L−1)`. Enemies are built to budget, with a hand-tuned **weighting** (a Gravewarden enemy gets Guard-heavy points, a Witch gets Wit-heavy). Bosses override HP explicitly.

**Notation:** `VIG/MIG/WIT/GRD/HST` with the delta from class base in parentheses.

## 9.1 Act I

| # | Enemy | Class | L | Stats | HP | Signature verb | Counter |
|---|---|---|---|---|---|---|---|
| 1 | **Hollowed Sexton Bram** | Gravewarden | 1 | 11(+2)/5/2/10(+2)/5(+2) | 148 | **Sepulchral Spikes** on turn 1. Then Brace and outlast. | Burst. He has no damage; he has a wall. |
| 2 | **Tollward Sedge, the Bell-Ringer's Echo** | Ashblade | 2 | 6/11(+3)/2/5(+1)/11(+4) | 108 | **Opening Cut** as a opener, then Rend. Fast — he usually strikes twice before you act. | Brace. He does not need to be tanked, only slowed. |
| 3 | **Toll-Warden Brack** | Hollow Cantor | 4 | 8(+1)/2/12(+4)/7(+3)/10(+4) | 124 | **Hush** on turn 1, then Tolling Bell. He fights on an empty tank. | Deaf Wax, or Purify, or burst him before the second Hush. |
| 4 | **The Reaper of the Silt** | Ashblade | 5 | 6/13(+5)/2/6(+2)/14(+7) | 108 | **Red Flurry** — three separate crit rolls, so it can spike. | Ward + Thorns. A trio beats one plate. |
| 5 | **The Drowned Choristers** (×3) | Hollow Cantor | 4 | 9(+2)/2/11(+3)/6(+2)/11(+5) | 132 (3 × 44) | **Inheritance** — each chorister inherits the previous one's statuses. Curse stacks across the whole fight. | Cleanse between choristers, or burst one hard before the second opens. |
| 6 | **Tithe-Collector Pell** | Cinder Witch | 6 | 5/2/16(+7)/8(+5)/12(+4) | 100 | **Ledger's Ward** at 50% HP: gains 30 Ward *and buys the memory of your last verse*, setting that verse's cooldown to 0 for an immediate free cast. | Kill him fast. His own Ward is the only defence he has. |
| 7 | **★ ACT BOSS — First Vespers, the Drowned Cantor** | Hollow Cantor | 7 | 8(+1)/2/14(+6)/8(+4)/13(+7) | 124 | **Rite — The Toll** at 50% HP: stops defending, gains +1 Resolve per turn, +30% damage, casts Tolling Bell every turn. | Phase 1 is a debuff lock — cleanse or outsustain. Phase 2 is a damage race. You need both answers. |

**Boss HP note:** Act bosses are tuned to a *narrow* band, not a big one. First Vespers at 124 HP is a **long, lossy fight** for a bad build. That is the point of an act boss: it should end a build that didn't adapt.

## 9.2 Act II

| # | Enemy | Class | L | Stats | HP | Signature verb | Counter |
|---|---|---|---|---|---|---|---|
| 8 | **Bone-Nurse Sable** | Gravewarden | 5 | 12(+3)/5/3(+1)/13(+5)/8(+5) | 156 | **Mend the Mortar** every 3 turns — you cannot out-chip her. | Burst, or Hush her off the rhythm, or true damage. |
| 9 | **Ninth Sister Ysolde** | Cinder Witch | 7 | 6(+1)/2/17(+8)/9(+6)/11(+3) | 108 | **UNSANCTIONED BURN** — potency +3, and each Burn tick also costs you 1 Resolve. | Mitigation and Ward. Or Purify, if you brought it. |
| 10 | **The Wick Lad** | Cinder Witch | 5 | 5/2/14(+5)/7(+4)/13(+5) | 100 | Clean, fast, no tricks. The crowd narrates every verse you cast. | Nothing special. It is a licence to learn the UI under pressure. |
| 11 | **★ Corvane, the Grey Duelist** | *varies* | 7 | *varies* | *varies* | **Counterbuild** — the class, vow and verse pool are chosen at fight start to punish *your* build. See table below. | You do not have one. You have to build one, mid-fight, out of four slots. |
| 12 | **Furnace-Warden Grast** | Gravewarden | 7 | 13(+4)/6(+1)/2/16(+8)/8(+5) | 164 | **Thorns + Brace + Gravebind.** He punishes every direct hit. | True damage. Bleed and Burn ignore the entire stack. |
| 13 | **Founder Halbrey** | Ashblade | 8 | 7(+1)/14(+6)/3(+1)/8(+4)/15(+8) | 116 | **Rite of Passage** — at 66% and 33% HP he changes damage type: Steel → Shade → Ember, with matching stat shifts. | Read the Rite on his panel and re-tool. Ward the Ember phase, burst the Steel phase. |
| 14 | **★ ACT BOSS — Mother Bell** | *Hybrid* (Gravewarden chassis, Cantor verse pool) | 8 | 13(+4)/6(+1)/9(+7)/15(+7)/6(+3) | **300** (override) | **Rite — Temperature.** Molten (>50%): takes 50% less direct damage, 8 Thorns, casts Crypt Door. Cooled (<50%): takes +30% damage, casts Shade and Curse. | DoT, or manage the temperature. The fight is about *when*, not *what*. |

### Corvane's counter table

Chosen at fight start from the player's own loadout. The UI announces it one line before the fight: *"Corvane has watched you fight. He has brought something that answers it."*

| If your build leans on… | Corvane brings | Why it hurts |
|---|---|---|
| Bleed / armour-shred | Hollow Cantor — Curse, Purify, Burn | Purify deletes the entire investment. Your stacks go with it. |
| Burn / damage-over-time | Gravewarden — Brace, Ward, Mend the Mortar | He out-heals your tick rate. |
| Ward / Thorns / tanking | Cinder Witch — Conflagration, Fan the Flames | Burst melts a build built to not die. |
| Curse / Hush / debuffs | Ashblade — raw burst | He kills you before the lock lands. |
| Crit / burst | Gravewarden — Bastion, Fracture, hold to 6 | Crits lose to mitigation, always. |
| Drain / lifesteal | Cinder Witch — burst race | He out-damages your heal. |
| *Unrecognised build* | Random from a neutral pool | You get a normal fight. Rare, and it feels like a gift. |

## 9.3 Act III

| # | Enemy | Class | L | Stats | HP | Signature verb | Counter |
|---|---|---|---|---|---|---|---|
| 15 | **Lector Yune** | Hollow Cantor | 8 | 8(+1)/2/16(+8)/8(+4)/13(+7) | 124 | **Mimic** — she copies the last verse you cast and casts it back at 80% power next turn. | Vary your rotation, use Strike to reset, or burst her before the copy lands. |
| 16 | **The Pale Cantor, First Movement** | Hollow Cantor | 9 | 8(+1)/2/18(+10)/8(+4)/13(+7) | 124 | **A recording.** She repeats the exact same opening every time. It is learnable. | Learn it. The window is always turns 1–3. |
| 17 | **The Tide-Bound** | Cinder Witch | 9 | 6(+1)/2/18(+9)/10(+7)/13(+5) | 108 | **SALT-SOAKED BURN** — ignores Ward *and* mitigation, lasts 4 turns. | Burst before it lands, or heavy mitigation, or Purify. |
| 18 | **Sister Oren, Keeper of the Gate** | Gravewarden | 9 | 14(+5)/7(+2)/2/18(+10)/8(+5) | 172 | **Gravebind** (Stun) plus 4 HP of regen every turn. | DoT, and Hush to break the Stun. You cannot win a straight race. |
| 19 | **The Unbound Chorus** (×3) | mixed | 9 | mixed | 55 each | Three sequential Echoes, one per class, each with a single signature verse. | Small, fast, and a good place to learn the third phase of a fight. |
| 20 | **Ilvane's Second** | Ashblade | 10 | 7(+1)/16(+8)/3(+1)/8(+4)/17(+10) | 116 | **No debuffs at all.** Pure burst, pure crit, Red Flurry + Opening Cut. | Brace and Ward. A change of pace after eight chapters of status effects. |
| 21 | **★ FINAL BOSS — The Pale Cantor Ilvane** | Hollow Cantor | 10 | 8(+1)/2/19(+11)/9(+5)/13(+7) | **420** (override) | **Three phases.** I: the duellist. II: the Hymn (heals from damage dealt, summons two Choristers at 50% and 25%). III: the Baton. | See below. |

### Ilvane, Phase III — the thesis of the whole game

> **He copies verses. He does not copy marks.**

When Phase III begins, Ilvane learns **the verse you have cast most often in this fight** and casts it at you at **100% power**, every time it is off cooldown. The UI labels it plainly: *"He is learning **Opening Cut**."*

This is the design answer to the whole game, and it lands because the player has been taught for nine chapters that **gear, vows and marks bend rules while verses only carry numbers**:

| Your power source | What happens to it in Phase III |
|---|---|
| **Verse coefficients** | Copied and neutralised. He casts your best verse. |
| **Marks** (relic, vestment, weapon) | **Untouched.** He has no gear, because he *is* the system. Your +30% vs low HP still works. |
| **Vows** | **Untouched.** Your vow is a rule you hold, not a number he can read. |
| **Conditional effects** | Untouched. A verse whose effect depends on a mark still behaves differently for you. |

So the counterplay is not "pick a different verse". The counterplay is: **arrive at the final fight with your power in your gear and your vow, not in your verse numbers.** A player who spent nine chapters collecting marks and unlocking story vows walks into Phase III and wins it. A player who spent nine chapters stacking raw verse coefficients walks into Phase III and loses it to a copy of their own best move.

That is a complete argument in one mechanic, and it is teachable from Chapter 1. The 0.1.0 gear and vow systems were already the right shape — v1 just makes them *load-bearing* at the climax.

## 9.4 Named Echoes (Choir Floor)

Eight hand-built NPC Echoes, rated 800–1400, each with a name, a one-line history and a **deliberate weakness**. The weakness is always the thing that teaches the player something.

| Name | Class | L | Toll | History | Deliberate weakness |
|---|---|---|---|---|---|
| **Brother Ash** | Gravewarden | 8 | 1080 | *He has not left the Warrens since the Order closed its doors.* | Cannot be debuffed. Relies entirely on regen — DoT beats him. |
| **The Salt Widow** | Cinder Witch | 9 | 1240 | *Burned down a nine-fighter roster in six turns and asked for a rematch.* | No mitigation at all. Burst kills her before her second cast. |
| **Tollward Vane** | Hollow Cantor | 8 | 940 | *Collects the toll at the Salt Road gate. Has never once been thanked.* | Slow and low-Haste. Burst before the Hush lands. |
| **The Sixth Swineherd** | Ashblade | 6 | 860 | *A Echo of a man who died mid-fight and won anyway.* | All-in. Zero defence. He is also very bad. |
| **Mother Corvane** | Ashblade | 8 | 1120 | *Corvane's mother. Also an Ashblade. The resemblance is the whole joke.* | Relies on crits; every crit he lands is telegraphed one turn ahead. |
| **Hollow Bishop** | Gravewarden | 8 | 980 | *Refuses to heal. Refuses to be killed. Refuses to explain.* | Cannot heal. Pure mitigation, so DoT and Fray are the answer. |
| **The Unpaid Bell** | Hollow Cantor | 9 | 1180 | *Cast for the Bellfoundry and never paid for. Rings anyway.* | Needs 3 turns to set up. Burst him in the first two. |
| **Widow Sedge** | Ashblade | 7 | 1020 | *Was Sedge's wife. He did not know she was in the Choir.* | Steals Resolve but drops below 30% HP and folds. |

**Also on the floor:** a rotating pool of **player's own Echoes** (the PvP loop) and, at release, 4 **Rite-users** — named Echoes that use the Rite of Passage mechanic so the player meets it on the ladder too, not only in the campaign.

## 9.5 Enemy readability rules

1. **Every enemy has a named verb.** If an enemy does something unusual, it has a proper noun for it and a tooltip.
2. **Every enemy has a counter that a player can reach.** The harness (§15.4) asserts this: for every enemy, at least two of the four classes have a build that beats it at ≥55%.
3. **No enemy has a mechanic that only one class can answer** — with one deliberate exception: *Tide-Bound* is answered best by Gravewarden mitigation, and *Salt Widow* by Ashblade burst. Two classes minimum, always.
4. **No enemy exceeds 16% damage share** of a fight's total damage output against a matched build. Bosses are checked against the *intended* build, and a boss that is a wall for 3 of 4 classes is a wall the campaign is allowed to have — Act bosses are checked at ≥40% clear rate for a *correct* build, not ≥55% for all.

---

---

# 10. Bounded Roll — the randomness contract

*This is the section that makes the rest of the game possible. If a player loses, it must be because of their build, not because of a number they could not see or predict. Everything in this section exists to make that true.*

## 10.1 The rule, in one line

> **The wax is bounded.** A fight's outcome can vary from its expected value by at most **±12%**, and no single roll can ever decide a fight.

## 10.2 Why bound it at all

Randomness in a build-driven game is a tax. The player makes forty interesting decisions — which verses, which vow, which mark, which order — and then a die wipes them out. Bounded randomness keeps the *feel* of unpredictability (you do not know the exact number) while removing the *cost* of unpredictability (the number was never going to flip a well-built fight).

The consequences are concrete:

- A player who builds correctly **wins the fight they should win**, ~88–100% of the time.
- A player who builds incorrectly **loses the fight they should lose**, and the loss is legible: the log shows the mistake.
- The game can therefore teach through loss. A loss is a lesson, not a robbery.
- And because the bound is *published*, the player can trust it — which is what makes a competitive ladder viable without rage-quit mechanics.

## 10.3 The PRNG

**mulberry32**, seeded per fight. Pure function, no global state.

```js
// seed derivation — FNV-1a over the canonical build strings
seed = fnv1a( JSON.stringify(buildA) + '|' + JSON.stringify(buildB) + '|' + round + '|' + nonce )
```

The seed is **displayed to the player** in the fight header: `MEASURE · 4F2A-91CC`. Same seed + same builds + same doctrine = a byte-identical fight, every time, on every device. This is what makes bug reports meaningful ("here's the seed, here's what should have happened") and what makes *while you were away* (§12.6) replayable.

## 10.4 The Measure shapes

Every random value in the game is one of six shapes. There is no "roll a percentage" anywhere in the codebase.

| Shape | Definition |
|---|---|
| `Fixed(v)` | Never random. |
| `Band(n)` | Uniform integer in `[0, n)`. |
| `Narrow(a, b)` | Uniform integer in `[a, b]`. |
| `Clamped(c, w)` | Uniform in `[c−w, c+w]`, then clamped to the legal band. |
| `Weighted(list)` | Weighted pick from a fixed table. |
| `Shuffle(list)` | Fisher–Yates over the same stream. |

## 10.5 The Measure table — every source of randomness in v1

| Measure | Where | Shape | Bound | Player-facing |
|---|---|---|---|---|
| **Damage jitter** | Every direct hit | `Clamped(1.00, 0.10)` | 90%–110% of expected | The Wax Meter |
| **Crit roll** | Every damaging verse | `Band(100)` | 5% + 1%/HST | Crit % on the verse button |
| **Turn-order tie** | Equal HST | `Band(2)` | 50/50 — **and the loser of the tie gets +1 Resolve** | "The bell tolls once. You go." |
| **Echo AI tie-break** | Two verses score equally | `Band(k)` | Uniform among equals | Log line names the pick |
| **Loot drop** | Choir Floor win | `Band(100)` | 12%, pity at 30 wins | Roll shown in the Ledger |
| **Item pickup order** | Post-fight loot | `Shuffle` | Uniform | — |
| **Fortune drift** | Each damaging instance | `Clamped(1.00, 0.02)` | **Fight total clamped to [0.88, 1.12]** | The Wax Meter |
| **Fatigue** | Round 16+ | `Fixed` | Deterministic schedule | Telegraphed 3 rounds early |
| **Status application** | Every status | `Fixed` | **Never random** | Chip is visible on the panel |
| **Turn order** | Non-tie | `Fixed` | By HST | — |
| **Cooldowns** | Every verse | `Fixed` | Deterministic | Shown on the button |
| **Lethal / death** | Every hit | `Fixed` | Deterministic | — |
| **AI verse scoring** | Every turn | `Fixed` | Deterministic scoring | — |
| **Corvane's counterbuild** | Fight start | `Weighted` | Weighted by your tags | Announced before the fight |
| **Named-Echo challenger** | Hourly | `Fixed` | Derived from the hour | — |

**Read that table again.** Out of fifteen sources of potential randomness, exactly **five** are actually random in a combat fight: damage jitter, the crit roll, the turn-order tie, the AI tie-break, and Fortune drift. Everything else is arithmetic. **Roughly 95% of every fight is fully deterministic**, and the 5% that varies is hard-bounded.

## 10.6 The Wax Meter — making luck visible

**Fortune** is a single scalar for the whole fight, shared by both fighters.

```
on a damaging instance:
    jitter   = Clamped(1.00, 0.10)     // this hit only
    damage  = expected × jitter
    fortune  = clamp( fortune + Clamped(0.00, 0.02), 0.88, 1.12 )   // shared, slow
    damage *= fortune
```

- Fortune drifts by at most **±2% per damaging instance** and is hard-clamped to **[0.88, 1.12]** for the entire fight.
- **Both fighters use the same Fortune.** A hot fight helps the attacker *and* the defender. Luck never systematically favours the player.
- Crits are **not** affected by Fortune. Fatigue is not affected. DoT ticks are not affected (they are true damage and already bypass mitigation — adding variance on top would be unreadable).
- Fortune **resets to 1.00 at the start of every fight.**

**The Wax Meter** is a thin horizontal gauge that sits under the round counter, spanning 88%–112% with a hairline at 100%:

```
WAX ▁▂▃▄▅▆▇█│▇▆▅▄▃▂▁     ▲ 100%
```

It fills or drains as Fortune drifts, with a soft tallow glow. It is the only animated element in the combat UI. Its purpose is not decoration: it is the game's only admission that it rolled anything, and showing it converts *"that was RNG"* from a complaint into a *reading*.

## 10.7 The post-fight report — "The Ledger"

Every fight ends with a one-line verdict computed from the Fortune track and the simulation:

| Report | Meaning |
|---|---|
| *The wax ran level. You won it.* | Final Fortune within ±2% of 1.00. A pure skill result. |
| *The wax ran cold for you. You won anyway.* | Your cumulative fortune was below 0.98. You out-played a bad break. |
| *The wax ran hot. You won it.* | Cumulative fortune above 1.02 — and it was shared, so your opponent had it too. |
| *The wax ran cold. You lost it.* | Cumulative fortune below 0.98 — but your expected win rate was ≤55%, so this is the honest result. |
| *You fought against a worse build and still lost.* | Expected win rate was ≥70%. Something is wrong with your build; the report links your Reading panel. |

The last line is the most important row in the game. It is the moment the design thesis becomes visible to the player: **the game tells you when your build was wrong.**

## 10.8 The Reading panel — odds before the fight

Before any fight, the game runs **200 seeded simulations** of the exact matchup and shows the player:

```
READING
  Ilvane the Pale · Hollow Cantor · L10
  "He heals from what you do to him. He learns your best verse."
  Expected: 34% win · ~14 rounds · your counter: true damage, and anything he cannot copy
  MEASURE 4F2A-91CC
```

This is the single most important UI element in the game and it costs one server-side-free compute pass (200 × ~14 rounds of pure arithmetic — under 40ms on a phone, and it is cached per matchup key).

It means the player **never fights blind**. The randomness is real, the numbers move, the tension is real — and the player has a calibrated expectation and a named counter. That is what "controlled randomness" is actually for: not making outcomes predictable, but making them **bounded and legible**.

## 10.9 The bans — what randomness can never do

Hard rules, enforced by a unit test suite (`engine/__tests__/randomness.spec.js`):

1. **No roll can flip a fight.** Total fight damage variance across every possible seed: ≤ ±12%.
2. **No status lands or fails at random.** Status application is deterministic.
3. **No critical hits from damage-over-time.** Ever.
4. **No double-mitigation ordering.** All mitigation is summed into one value before it is applied. A fight does not change outcome based on which code path computed it.
5. **No "survive at 1 HP" random saves.** The Candle of Saint Orrin is deterministic and fires exactly once per fight, on the first lethal hit.
6. **No randomness in the AI's competence.** The Echo AI scores every verse with a fixed formula. Only exact score ties are broken randomly, and then only among equals.
7. **No loot inside combat.** Nothing drops mid-fight. Ever.
8. **No hidden modifiers.** Every multiplier that touches a number is either a mark, a vow, a status, a Rite, or the Fortune meter — all four of the first are shown on the panel, and Fortune is on the Wax Meter.
9. **No turn-order loss without compensation.** A turn-order tie is a coin flip; the loser of the coin gets +1 Resolve.
10. **No infinite fights.** Fatigue (§5.6) guarantees a hard finish. The harness asserts no fight exceeds 20 rounds.

## 10.10 Anti-lock guarantees

| Lock | Guarantee |
|---|---|
| Stun lock | After a Stun, the target cannot be Stunned again until it has taken **two turns**. |
| Hush starvation | Hush reduces Resolve gain by 2–3, but **never below +1 Resolve per turn**. |
| Heal sustain | Every healing verse has a cooldown of **≥ 3**. A pure sustain loop is impossible. |
| Ward turtling | Ward expires in 3 turns and does not stack. |
| Fatigue | From round 16, escalating true damage, doubling in the last 3 rounds. |
| Zero-damage stalling | Minimum 1 damage per landed hit. |
| Attrition | Every fight has a hard round ceiling enforced by Fatigue, not by a turn counter. |

## 10.11 "Re-bell" — the sanctioned retry

Because a fight is bounded, the player should be able to reroll it without the outcome feeling rigged. So:

- **One free "Re-bell" per chapter.** The fight restarts with a new seed. No XP loss, no penalty, the first time.
- The **Vigil Ledger** records every re-bell, so a player who re-bells 40 times has a visible record of it. No punishment — a *record*.
- A re-bell **does not** re-roll drops, choices, or story flags. The story never resets. Only the fight.

This is the correct answer to "RNG ruined my run": let them retry the fight, cheaply, and never let them retry the story.

## 10.12 Determinism and the Echo floor

Every Echo-vs-Echo fight resolves with a seed derived from
`hash(challengerEchoCode | defenderEchoCode | hourSlot | nonce)`.
The same hour therefore always produces the same challenger and the same result, on every player's device, forever. The "while you were away" log is therefore not a simulation of a plausible story — it is a **replayable record of what actually happened**.

---

---

# 11. Assets — fonts, images, design tokens

v1 replaces 0.1.0's "no art pipeline" stance with a **small, deliberate, fully-licensed asset set**. The rule: **every image is a plate, a crest or a texture. No character art, no combat sprites, no illustration of anything that happens in a fight.** The game is text; the images are the *stage* the text sits on. This keeps the pipeline at 10 generated files and 5 font files while making the game look authored rather than untextured.

## 11.1 Typography

All four faces are **SIL Open Font License 1.1** — free to bundle, self-host, and modify. Nothing is fetched at runtime; the fonts ship in the build as `.woff2` subsets (Latin + Latin Extended only, ~60–90 KB each).

| Role | Face | Weights | Source | Used for |
|---|---|---|---|---|
| **Wordmark** | **UnifrakturMaguntia** | 400 | Google Fonts | The title on the title screen, the app header, the ending cards. Blackletter, used *only* for the wordmark and the act titles. Never for body copy. |
| **Display / headings** | **Cinzel** | 400, 600 | Google Fonts | Chapter titles, act titles, section headers, enemy names, button labels, small-caps UI labels. Engraved-Roman capitals — the voice of the institution. |
| **Body** | **EB Garamond** | 400, 500, *italic 400* | Google Fonts | All narrative prose, choices, combat log entries, item lore, epilogues. Old-style serif, large x-height, excellent at 16–18px. |
| **Numerals** | **JetBrains Mono** | 400, 700 | Google Fonts | **Numbers only.** HP, Resolve pips, damage values, stat spreads, seeds, Toll rating, cooldowns, timers. Tabular figures so the columns never jitter. |

**Fallback stacks** (used before fonts load, and in the accessibility mode):

```
--font-wordmark: "UnifrakturMaguntia", "Luminari", serif;
--font-display:  "Cinzel", "Trajan Pro", "Optima", Georgia, serif;
--font-body:     "EB Garamond", "Source Serif 4", Georgia, "Times New Roman", serif;
--font-mono:     "JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
```

**Accessibility mode** (a toggle in Settings): swaps `--font-body` to **Source Serif 4** (OFL, higher x-height, wider counters) and raises body size from 17px to 19px. UnifrakturMaguntia is replaced with a plain Cinzel wordmark, because blackletter at small sizes is genuinely hard to read and "readable" outranks "authentic" for a game with 20 minutes of story text.

**Type scale** (1.25 minor third, 16px base):

| Token | Size / line | Use |
|---|---|---|
| `--t-display` | 30 / 34 | Chapter titles |
| `--t-title` | 22 / 28 | Enemy names, act titles |
| `--t-sub` | 18 / 24 | Section headers, buttons |
| `--t-body` | 17 / 27 | Prose, log entries |
| `--t-small` | 14 / 20 | Item lore, tooltips |
| `--t-micro` | 12 / 16 | Labels, chip text, footnotes |
| `--t-num` | 15 / 20 mono | All numbers, tabular |

**Rules.** Body copy is never below 16px. Numbers are *always* mono, so a player can scan a column of damage figures. Enemy names are Cinzel small-caps. The wordmark face is banned from anything longer than four words.

## 11.2 Image manifest

Ten files, all **WebP**, all generated at build time and committed to the repo — **no runtime image generation, no CDN, no network dependency.** Every file listed here is shipped in `assets/img/`.

| File | Size | Px | Where it appears |
|---|---|---|---|
| `wordmark-ashen-choir.webp` | 320 KB | 1600×679 | Title screen, app header, ending card, shareable Echo card. **True alpha channel**, keyed from a flat-white render. |
| `act1-plate.webp` | 309 KB | 1920×640 | Chapter 1–3 header plate (the drowned nave, seen from inside) |
| `act2-plate.webp` | 331 KB | 1920×640 | Chapter 4–6 header plate (the bellfoundry terrace at night) |
| `act3-plate.webp` | 249 KB | 1920×640 | Chapter 7–9 header plate (the Bellmouth from the Orrery) |
| `crest-ashblade.webp` | 71 KB | 512×512 | Class selection card, Echo card, loadout screen |
| `crest-cinder-witch.webp` | 82 KB | 512×512 | " |
| `crest-gravewarden.webp` | 54 KB | 512×512 | " |
| `crest-hollow-cantor.webp` | 51 KB | 512×512 | " |
| `sigil-vigil.webp` | 36 KB | 512×512 | The player's sigil — creation screen, profile, the bound Echo |
| `texture-ash-parchment.webp` | 14 KB | 1024×1024 (tileable) | The global page background, 6% opacity, `repeat` |

**Total shipped image weight: 1.17 MB**, of which ~890 KB never loads on first paint (the three act plates load only on chapter open, via `loading="lazy"`).

**Why WebP and not PNG.** The sources are 1024–3168px PNGs at 4–8 MB each. The shipped files are the same images, cover-fitted to target dimensions, at quality 82–93, with a warm tone-map on the texture and a **true-alpha key** on the wordmark. WebP is supported by every browser that can run the game, and the whole set fits in a phone's worth of cache.

**The wordmark key.** The generator renders a blackletter wordmark as flat artwork on a flat white ground, which is trivially keyable: alpha from darkness, colour recovered by unpremultiplying against white. The first pass produced a grey halo because the model had painted a drop shadow into the artwork; the shipped file was regenerated flat (no shadow, no bevel, no glow) and keyed clean, and it carries a real alpha channel so it composites over any background.

### Art direction for every image

One prompt prefix applies to all ten:

> *"Dark fantasy game plate, blackletter medieval engraving aesthetic, soot-black and bone-white palette with a single warm tallow-gold accent, heavy chiaroscuro, aged vellum and ash, etched cross-hatching, no text, no lettering, no watermark, no signature"*

The **single warm accent** rule is what keeps ten generated plates looking like one game. Anything that drifts off-palette is rejected in review, not tweaked.

### Per-asset brief

| Asset | Composition |
|---|---|
| **Wordmark** | "The Ashen Choir" in blackletter, hairline flourishes, a single lit candle flame inside the "A". Transparent background, bone-white with a warm gold rim-light. |
| **Act I plate** | Interior of a flooded cathedral nave, waist-deep black water, a half-submerged rose window, a single distant warm candle glow. Nothing human. |
| **Act II plate** | A foundry terrace at night, a great bell half-cast on a bed of coals, orange furnace light, cold blue night above. |
| **Act III plate** | The spire of the Bellmouth seen from below, stars, ash falling, one window lit from inside. |
| **Crest — Ashblade** | A vertical line that is half sword, half a wound bleeding downward. Ash-grey with a crimson edge. |
| **Crest — Cinder Witch** | A hand-shaped flame holding a small ember, smoke curling into a question mark. Ember-orange and violet. |
| **Crest — Gravewarden** | A closed tombstone with a shield carved into it, thorns growing from the base. Slate and bone. |
| **Crest — Hollow Cantor** | A cracked bronze bell with a mouth, and a thin note-line rising from it. Violet and verdigris. |
| **Sigil — Vigil** | A single candle in a ring of ash, the flame shaped like a standing figure. Tallow-gold on soot. |
| **Texture** | Seamless tile: ash-grey vellum with soot grain, faint water staining, no motif. |

## 11.3 Colour tokens

| Token | Hex | Use |
|---|---|---|
| `--soot` | `#0d0b0a` | Page background |
| `--soot-2` | `#171412` | Panel background |
| `--soot-3` | `#221d1a` | Raised panel, card |
| `--bone` | `#e6ded0` | Primary text |
| `--bone-dim` | `#9d948a` | Secondary text, labels |
| `--tallow` | `#e8c88a` | Accent: HP bar, the candle, focus rings |
| `--tallow-glow` | `#f6e3bb` | Hover, emphasis |
| `--ember` | `#e0762f` | Burn, furnace, Act II |
| `--crimson` | `#a8322e` | Bleed, damage taken, Act I |
| `--violet` | `#7a5aa8` | Curse, Shade, Act III |
| `--verdigris` | `#5d8071` | Ward, healing, Hush |
| `--rust` | `#8a4b2a` | Fray, thorns, neutral warning |
| `--wax-gold` | `#d9b168` | The Wax Meter fill |

**Rule:** the only saturated colours in the entire UI are the status colours. Everything else is a soot/bone/tallow neutral. A player scanning a fight sees colour only where a status is, which means colour is information rather than decoration.

## 11.4 Status colour mapping

| Status | Colour | Chip glyph |
|---|---|---|
| Bleed | crimson | vertical drop |
| Burn | ember | upward flame |
| Curse | violet | downward chevron |
| Fray | rust | broken stitch |
| Hush | soot-3 on bone-dim | closed mouth |
| Brace | verdigris | open hand |
| Ward | verdigris outline | hex |
| Thorns | rust | spike |
| Stun | bone-dim | broken bell |
| Fatigue | bone-dim | hourglass |
| Rite | tallow | rotating ring |

Glyphs are drawn in CSS and inline SVG — **no image files** for statuses. They must scale to 14px and stay legible on a phone.

## 11.5 Component spec

| Component | Spec |
|---|---|
| **HP bar** | 4px tall, `--tallow` fill, `--soot-3` track, 1px bone-dim border at 20% opacity. Drain animates over 220ms. Never animated on damage-over-time ticks — DoT ticks update instantly, so the player can count them. |
| **Resolve pips** | 10 discrete pips, 6px, 1px gap. Full = `--tallow`, partial = `--tallow` at 40% with a 40%-height fill, empty = 1px outline. |
| **Status chips** | 20px tall, 1px border in the status colour at 50%, 8% fill in the status colour, mono number on the right. |
| **Wax Meter** | 3px tall, 160px wide, `--wax-gold` fill, a 1px hairline at 100%, and a faint glow at the extremes. The only animated element in combat. |
| **Verse button** | Cinzel label, mono cost badge top-right, cooldown sweep overlay, a 12px status preview row of the effects it applies. Disabled verses are 38% opacity, not grey — the cost and cooldown stay readable. |
| **Log gutter** | Each entry is `[round 4] verb + target + amount`, with a 1px left border in the damage type's colour. Prose entries (Maren, story) have no border and are in italic. |
| **Reading panel** | A bordered card above the fight: enemy name, class, level, one-line threat, expected outcome, and the counter. The counter line is `--tallow`. Always present, never collapsed. |

## 11.6 Audio (reserved, not in v1 scope)

v1 ships **silent**. The asset budget was spent on the plates and the type. A v1.1 audio pass would use three ambience beds (crypt, foundry, bellmouth) and one 2-second bell toll for the Fatigue telegraph — but none of it is required for the game to ship, and none of it is specced here. Listed only so nobody thinks it was forgotten.

## 11.7 What is explicitly *not* shipped

- No character portraits.
- No combat illustrations.
- No sprite sheet, no animation frames beyond the Wax Meter.
- No 3D, no shader, no particle.
- No icon font — status glyphs are SVG.

The entire visual identity is **type + plate + rule**. That is a deliberate constraint, and it is the reason the art budget for v1 is 10 files and 5 fonts.

---

# 12. Echoes & the Choir Floor

## 12.1 What an Echo is

A frozen copy of a build: class, level, stat allocation, vow, **four verses in priority order**, three pieces of gear, and a **doctrine**. When an Echo fights, an AI plays it using the player's own setup. The player's job is to build it well, not to be online.

## 12.2 Doctrines

| Doctrine | Behaviour |
|---|---|
| **Hymnal** | Plays the slotted verses strictly in the order the player set. |
| **Predator** | Uses the highest-damage verse it can afford each turn. Defends only below 30% HP. |
| **Bulwark** | Uses defensive verses first when below 70% HP or when no Ward or Brace is active. Otherwise follows Hymnal. |
| **Cantor's Hand** *(NEW)* | Blends Hymnal with the Verse most likely to be punished by the opponent's active statuses. Reserved for the Rites users and one named Echo. |

## 12.3 Echo AI rules (shared by all doctrines)

1. **Lethal check.** If any usable damaging verse is expected to kill, use it.
2. **No pointless casts.** Skip re-applying a debuff that is already active, healing above 65% HP, cleansing when clean, Thorns when already up, a Resolve verse when Resolve is above 3.
3. **Fall back to Strike** if nothing is useful or affordable.
4. **NEW — no knowledge of the opponent's hand.** The AI may read the opponent's *visible* statuses, HP and Resolve. It may not read the opponent's slotted verses, vow, or gear. This is what keeps the ladder honest and is enforced by a unit test.
5. **NEW — no reads of the player's build.** The AI cannot know which of your verses you will cast next.

## 12.4 The Choir Floor (ladder)

- Rating is called **Toll**. Everyone starts at 1000. Elo with **K = 32**.
- The floor holds **8 hand-built NPC Echoes** (rated 800–1400, each with a name, a one-line history and a deliberate weakness — §9.4) plus any Echoes the player imports.
- The game suggests opponents within about **150 Toll** of the player.
- Two ways to fight an Echo:
  - **Duel it yourself:** you control your fighter manually against its AI.
  - **Send your Echo:** both sides are AI and the fight resolves instantly with a replay.
- Wins give XP and a chance at an item drop (12%, pity at 30).

## 12.5 "While you were away"

Every real hour, one challenger arrives at your Echo. On your next visit, up to **6 pending challenges** (a cap, so long absences stay readable) are resolved and written into the **Vigil Ledger** (last 20 kept):

> *Hour 3. Brother Ash stood against your Echo for nine turns. Your Echo held. Toll +14.*
> *Hour 5. The Salt Widow burned it down in six. Toll −11.*

Each challenger is chosen from a seed derived from the hour, so results are deterministic and can be replayed (§10.12).

## 12.6 Sharing Echoes

An **Echo Code** is the build serialized to JSON and base64-encoded. Players paste each other's codes to challenge them. Imported codes are validated:

- level is 1 to 10
- stat points do not exceed `4 + 2 × (level − 1)`
- every verse is unlocked at that level and belongs to the class (or is common)
- every gear id exists
- every vow id exists and is available to that class and story-state

An invalid code is rejected with: *"The Choir turns this Echo away. It rings false."*

Example shape (before encoding):

```json
{
  "v": 1,
  "name": "Mourne",
  "cls": "cantor",
  "level": 7,
  "alloc": { "vig": 3, "mig": 0, "wit": 9, "grd": 2, "hst": 4 },
  "vow": "silence",
  "verses": ["tolling_bell", "dirge", "requiem", "dissonance"],
  "gear": { "weapon": "tuning_fork", "vestment": "drowned_mantle", "relic": "deaf_wax" },
  "doctrine": "bulwark"
}
```

**v2 of the code format** adds `"rite": null` and a `"talley"` field so that a player's run state travels with their Echo.

## 12.7 Optional later phase: a shared ladder

If the game is hosted somewhere with shared storage, players can bind their Echo to a shared list. Challengers write a short result record, and defenders read the records addressed to them on their next visit. This makes "while you were away" about real players instead of simulated hourly challengers. **The single-player version must work fully without it** — and does.

---

# 13. Progression

- **Level cap:** 10. XP thresholds: 0, 40, 100, 180, 280, 400, 540, 700, 880, 1080.
- The campaign is tuned to finish around **level 7**. Arena wins carry the player to 10.
- **Stat points:** 4 at creation, +2 per level.
- **Verses:** class verses unlock at L1 through L7.
- **Gear:** collected from the campaign and the arena.
- **Reshaping:** at any shrine in the campaign or between arena bouts, the player can re-slot verses, swap vows, and reassign stat points for free. The Echo only changes when the player re-binds it, so experimentation never damages the bound Echo.
- **NEW — the Reshape Ledger.** Every reshape is recorded with a timestamp and the build before/after, and the player can rewind to any previous loadout in one click. The game *wants* you to experiment; it should never punish an experiment you can see.
- **NEW — the Shrines.** Twelve shrines across the campaign (one per chapter, plus a hidden one). A shrine is where you reshape, and each has a one-line inscription. They are also where the story-vows are granted.

---

# 14. Screens & UX

1. **Title and creation:** the wordmark, name, class (with crests), vow, 4 free points.
2. **Chronicle:** the campaign narrative with choice buttons, the act plate behind, and Maren's line.
3. **Duel:** two fighter panels (HP bar, Resolve pips, status chips), the **Reading** card, the **Wax Meter**, a log showing the last several events, and 4 verse buttons plus Strike. Each button shows cost, cooldown, and a one-line effect.
4. **Hymnal (loadout):** verse slots with arrow reordering (this order is the Echo's priority), vow picker, gear, stat allocation, and the Reshape Ledger.
5. **Choir Floor:** ladder list, challenge buttons, import-a-code box, your current Toll.
6. **Your Echo:** doctrine picker, Echo Code with a copy button, bind or re-bind.
7. **Vigil Ledger:** results from challenges while away, and the post-fight Wax report.
8. **NEW — The Orrery (post-campaign):** a summary screen showing tallies, ending, title, and every choice you made, in order, as a scroll of the nine decisions.

**Visual direction:** a dark, ink-on-soot page that feels like a worn manuscript. Old-style serif body text, small-caps headings, one blackletter wordmark, monospace only for numbers. Status types use consistent colors (§11.4). HP is a thin tallow-colored bar. Resolve is ten small pips. The global page background carries the ash-parchment texture at 6%.

**Mobile:** single column. Fighter panels stack above the log, verse buttons sit in a 2×2 grid with Strike full-width beneath, and the Reading card collapses to a single line you tap to expand. The Wax Meter stays visible at all times — it is the one thing a phone player should never have to scroll for.

---

# 15. Technical plan

**Platform:** a single web page, vanilla JavaScript, no framework. Runs on desktop and phone, saves to the browser, and can export and import a save code.

**Architecture**

| Module | Purpose |
|---|---|
| `engine` | Pure functions: build a fighter, resolve a verse, tick statuses, Echo AI, fatigue, Fortune. No UI. Runs in Node for testing. |
| `data` | Verses, vows, items, enemy builds, named Echoes, Rites. |
| `story` | Chapters, scenes, choices, endings, tallies — as data. |
| `rng` | Seeded generator (mulberry32) + the six Measure shapes (§10.4). |
| `sim` | The 200-seed expectation simulator behind the Reading panel. |
| `ui` | Screens and rendering. |
| `store` | Local save, save-code export and import, Echo codes. |

**Determinism:** every fight takes a seed. Same builds plus same seed gives the same result. This makes bugs reproducible and makes "while you were away" replayable.

**Rounding:** exactly one rounding operation per damage pipeline, at the final line (§5.4).

**Assets:** self-hosted. `assets/fonts/` (18 woff2 + `fonts.css` + 5 OFL licences) and `assets/img/` (10 WebP). No CDN, no runtime fetch, no external request at any point. Total shipped weight ≈ **1.9 MB**.

### 15.1 The core damage function

```js
function resolveDamage(state, actor, target, verse, rng) {
  // 1. base + stat coefficients (float)
  let raw = verse.base + verse.coef * stat(actor, verse.stat);
  // 2. flat damage bonuses (marks, vows) — applied as a multiplier
  raw *= 1 + bonus(actor, target, 'damage');
  // 3. curse
  if (has(target, 'curse')) raw *= 0.75;
  // 4. per-hit jitter  (the only per-hit randomness)
  raw *= rng.measure('Clamped', 1.00, 0.10);
  // 5. shared fight fortune (the Wax Meter)
  raw *= state.fortune;
  // 6. crit  (not affected by fortune)
  if (rng.measure('Band', 100) < critChance(actor)) raw *= 1.5;
  // 7. mitigation — SUMMED, never applied in pieces
  let mit = mitigation(actor, target, verse.type);   // returns 0..0.6
  let dmg = Math.round(raw * (1 - mit));
  // 8. ward absorbs first
  return Math.max(1, applyWard(target, dmg));
}
```

`mitigation()` sums every source into a single value before it is applied, and clamps to 0.6 (0.7 with Ash-Glazed Brass). This is the rounding contract of §5.4 in code, and it is what makes two identical fights produce identical numbers.

### 15.2 Turn structure

```
round++                                     // fatigue telegraph at >=13
for each fighter in turn order:
    resolve gain  (+3, modified by Hush, floor +1, cap 10)
    turn-start effects (heals, regen, vow procs)
    status ticks, fixed order: BURN -> BLEED -> THORN COUNTER -> FATIGUE
    if stunned: skip, decrement stun lock, continue
    player chooses a verse (or Strike) / AI scores and chooses
    resolve the verse
    tick cooldowns
    if either fighter is dead: end the fight
```

### 15.3 Balance harness (build this first)

A headless script that plays thousands of Echo-vs-Echo fights across all class pairings at several levels and prints win rates, average fight length, and longest fight.

**Targets:**

- no class above about **58%** overall win rate
- mirror matches near **50%**
- average fight **7 to 12** rounds
- no fight reaches round **20**
- every status has at least one build that wins by leaning on it and at least one that loses to it
- **NEW:** every campaign enemy has ≥2 classes with a build that beats it at ≥55%
- **NEW:** every campaign enemy has ≥2 classes with a build that loses to it at ≤35% (no enemy is a universal wall)
- **NEW:** total fight damage variance across 10,000 seeds stays within **±12%** (§10.9, rule 1) — this is a hard assert, not a guideline
- **NEW:** no fight exceeds 20 rounds under any seed

### 15.4 Build plan

| Phase | Deliverable | Done when |
|---|---|---|
| 1 | Engine, Bounded Roll module, balance harness | Simulated win rates and the ±12% variance assert both meet the targets above |
| 2 | Duel UI, Reading panel, Wax Meter, the Ashblade-vs-Sexton tutorial fight | A full manual fight is playable, readable, and the Reading matches the harness |
| 3 | Loadout screen, vows, marks, Echo AI, doctrines, Reshape Ledger | Any build can be assembled and sent to fight |
| 4 | Act I (Ch 1–3) with the first ending gate | Start-to-finish Act I with all three choices resolved |
| 5 | Act II (Ch 4–6), branching chapter 4, Rites of Passage | Act II's branch visibly changes Act II's fight list |
| 6 | Act III (Ch 7–9), Ilvane's three phases, all 10 endings incl. Unmake | Every ending reachable and its epilogue matches the tally |
| 7 | Choir Floor, Toll rating, Vigil Ledger, Echo Codes, "while you were away" | Async PvP loop works end to end |
| 8 | Assets, fonts, save/export, balance pass 2, accessibility mode | Playtested by at least five people |
| 9 (optional) | Shared ladder with real players | Echoes and results visible across players |

---

# 16. Content inventory

| Asset | 0.1.0 | v1.0 |
|---|---|---|
| Acts | — | **3** |
| Chapters | 5 | **9** |
| Campaign duels | 10 | **21** |
| Named boss fights | 1 | **6** |
| Story choices | 5 | **9** |
| Endings | 3 | **10** (3 paths × 3 variants + 1 hidden) |
| Epilogue variants | — | **9** written |
| Class verses | 28 | **36** (42 incl. common) |
| Vows | 12 | **23** |
| Items / marks | 12 | **41** |
| Story vows | — | **11** |
| Named Echoes | 8 | **8 + 4 Rite-users** |
| Named characters | 3 | **13** |
| Named ladder Echoes | 8 | **12** |
| Factions | 1 implied | **5** |
| Locations | 5 | **8** |
| Rites (phase-change mechanics) | — | **4** |
| Enemy signature verbs | 0 | **21** |
| Shipped images | 0 | **10** |
| Shipped fonts | 0 | **5 families / 18 woff2** |
| Randomness sources in a fight | unconstrained | **5, all bounded** |
| Words of prose (est.) | ~6,000 | **~24,000** |

---

# 17. Risks & open decisions

| Risk | Mitigation |
|---|---|
| **Echo AI quality.** If the AI plays badly, PvP feels random. | The lethal check, the pointless-cast filter, and doctrines are the minimum; the harness shows which verses the AI misuses. §12.3 rules 4–5 stop the AI from reading hidden information. |
| **Stun and Hush lock.** Both can feel oppressive. | Stun immunity, Hush floor of +1, Deaf Wax, and a 2-turn re-stun lock. |
| **Snowballing in long fights.** | Fatigue from round 16, a telegraph at round 13, and a cooldown on every heal. |
| **Ilvane's Phase III is too strong.** Copying the player's best verse may flatline non-marks builds. | The counter is signposted from Chapter 1 (gear and vows bend rules). The harness flags any class below 35% clear rate on the final boss and the campaign is tuned until all four clear at ≥30%. |
| **Content volume.** 36 class verses, 23 vows, 41 items, 21 fights, 8 named Echoes, ~24,000 words. | Write the data tables first, the prose second. The story data model makes branches additive rather than rewrite-heavy. |
| **Ten endings dilute each other.** | The three paths are the axes; the three variants are one paragraph each. The Unmake is the only full extra scene, and it is gated so it never appears by accident. |
| **The Reading panel spoils the fight.** | It shows odds and a counter, not the enemy's verse list. Phase III explicitly says "he learns your best verse" without saying which. |
| **"Controlled randomness" reads as rigged.** | The Wax Meter, the published seed, the replay button, and the post-fight report all exist to prove the opposite. |

**Open for you to decide:**

1. Whether to ship the **shared-ladder** phase (Phase 9). Everything else works without it.
2. Whether the **campaign is replayable with the other three classes**. v1 says yes — a second run is a new Vigil with a new class, and the tallies, title and ending persist. Recommended.
3. Whether to add a **fifth class** after launch. The 0.1.0 note suggested it; v1's Phase III mechanic means a fifth class would need a new "power in gear vs. power in verses" identity to stay interesting, so it is **not** recommended for launch.
4. Whether the **Unmake ending** should be discoverable by players or kept as a community secret for the first month. Both are implemented; the difference is one flag.

---

# Appendix A — Shipped asset manifest

**`assets/img/`** — 10 WebP, 1.17 MB total

| File | Dimensions | Size | Where it appears |
|---|---|---|---|
| `wordmark-ashen-choir.webp` | 1600×679 | 320 KB | Title screen, app header, ending card, Echo card. **True alpha**, keyed from a flat-white render. |
| `act1-plate.webp` | 1920×640 | 309 KB | Chapters 1–3 header plate — the flooded nave |
| `act2-plate.webp` | 1920×640 | 331 KB | Chapters 4–6 header plate — the bellfoundry terrace |
| `act3-plate.webp` | 1920×640 | 249 KB | Chapters 7–9 header plate — the Bellmouth from the Orrery |
| `crest-ashblade.webp` | 512×512 | 71 KB | Class card, Echo card, loadout |
| `crest-cinder-witch.webp` | 512×512 | 82 KB | " |
| `crest-gravewarden.webp` | 512×512 | 54 KB | " |
| `crest-hollow-cantor.webp` | 512×512 | 51 KB | " |
| `sigil-vigil.webp` | 512×512 | 36 KB | Creation, profile, the bound Echo |
| `texture-ash-parchment.webp` | 1024×1024 | 14 KB | Global page background at 6%, `repeat` |

**`assets/fonts/`** — 18 woff2 (latin + latin-ext), 733 KB, plus `fonts.css` and 5 `OFL-*.txt` licence files.

| Family | Files | Licence |
|---|---|---|
| UnifrakturMaguntia | Regular | OFL 1.1 |
| Cinzel | Regular, SemiBold | OFL 1.1 |
| EB Garamond | Regular, Medium, Italic | OFL 1.1 |
| JetBrains Mono | Regular, Bold | OFL 1.1 |
| Source Serif 4 | Regular | OFL 1.1 |

---

# Appendix B — Where v1 changed 0.1.0

| 0.1.0 | v1.0 | Why |
|---|---|---|
| 5 chapters, 10 fights | 3 acts, 9 chapters, 21 fights | 5 chapters could not carry a three-act story or enough counterplay teaching. The new structure climbs a city that drowns from the bottom up, so the geography *is* the curve. |
| 3 endings | 3 paths × 3 epilogue variants + 1 hidden | 0.1.0's endings were one paragraph each. v1 gives each path a Mercy, a Ruthless and a Devotion reading, so the nine choices in nine chapters all land somewhere. |
| Seeded RNG, unspecified bounds | **Bounded Roll** (§10) | 0.1.0 said "the challenge is deterministic" but never said how much a roll could swing a fight. That is exactly the number a competitive async ladder needs published. |
| "No art pipeline" | 10 images, 5 font families, a token sheet | The 0.1.0 stance was a constraint of a draft with no art budget, not a principle. Type + plate + rule is a complete and cheap visual identity. |
| Gear listed 12 items, "targeting about 24" | 41 items, all written, all with an affinity | The promise was in 0.1.0 but the table wasn't finished. It is finished now. |
| Gear/vows were decorative | Gear and vows are **the counter to the final boss** | The 0.1.0 systems were already the right shape; v1 makes them load-bearing. Phase III of the final fight is answered by marks and vows, not by verse numbers. |
| Corvane "plays the build that counters yours" | A published counter table with a stated weighting | It was a great idea with no implementation. Now it is a table a designer can tune and a player can read. |
| 12 vows | 22, including 10 earned from story | A vow is the strongest thing a player owns. Earning one at Chapter 4 is worth more than an item. |
| Named Echoes: 8 with histories | 8 with histories + deliberate weaknesses + 4 Rite-users | 0.1.0 promised "a deliberate weakness" and did not deliver one. The weakness is now the lesson. |
| "Rites" did not exist | 4 scripted boss mechanics, reused on the ladder | A boss that only has more HP is not a boss. Rites make Phase transitions authored. |
| No expected-outcome tool | The **Reading** panel | The single best thing in v1. It makes the bounded randomness legible instead of merely honest. |
| Chapter 1 → 5 flat | 1–3 → 4–6 → 7–9 with level gates | A campaign that respects a player's time needs a curve, not a list. |

**Nothing was cut.** Every mechanic, item, verse, vow, status, doctrine and named character in 0.1.0 exists in v1. The only removals are two things that were *promises* rather than content: the 24-item target (now exceeded) and the "no art pipeline" stance (now reversed on purpose).
