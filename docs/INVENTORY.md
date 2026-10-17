# INVENTORY.md — Content inventory tracker (T0.5)

The v1.0.1 target inventory ([GDD] §16 as reconciled by `docs/DECISIONS.md` §6). `tools/check-inventory.js` diffs the actual content files (`data/*.json`, `story/*.json`) against this table on every CI run. **Advisory until Phase 6; `--strict` blocks the build at Phase 10.** "Content complete" is a CI result, not a feeling.

| Kind | Target | Counted from | Notes |
|---|---|---|---|
| Acts | 3 | story/chapters.json | |
| Chapters | 9 | story/chapters.json | |
| Campaign duels | 21 | story/duels.json | |
| Named boss fights | 6 | story/duels.json | `boss: true` rows |
| Story choices | 9 | story/choices.json | 3 options each |
| Endings | 10 | story/endings.json | 3 paths × 3 variants + Unmake |
| Epilogue variants | 9 | story/epilogues.json | |
| Verses | 42 | data/verses.json | 36 class + 6 common |
| Vows | **24** | data/vows.json | 12 class + **12 story** (D4 + D30; supersedes F25's 23) |
| Items / marks | **40** | data/items.json | 13 + 13 + 14 (D4 cut one duplicate relic) |
| Named Echoes | 8 | data/named_echoes.json | + 4 Rite-users |
| Rites | 4 | data/rites.json | |
| Signature verbs | 21 | data/signature_verbs.json | one per enemy |
| Shrines | **10** | story/shrines.json | nine chapter + the hidden tenth (F24) |
| Tallies of the City | 9 | story/objectives.json | D5 |
| Deeds | 10 | data/deeds.json | D19 |
| Named characters | 13 | prose | audited at T6.x |
| Ladder Echoes | 12 | data/named_echoes.json | 8 named + 4 Rite-users (05 R5 floor ≥ 12) |
| Factions | 5 | prose | |
| Locations | 8 | prose | |
| Images | 10 | assets/img/ | App A manifest |
| Fonts | 5 families / 18 woff2 | assets/fonts/ | OFL licences bundled |
| Prose words | ~24,000 | story/*.md | estimate; audited at T4.12 |

Per-class minimums from [GDD] §8.3 (asserted, not counted here): ≥5 affinity items per class; every status has ≥1 counter-item/vow and ≥1 amplifier.
