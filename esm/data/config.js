/**
 * config.js — the single source of every tunable constant (ENG-5).
 * Canon values mirror [GDD] §5 + DECISIONS.md verdicts. PROVISIONAL:D# tags
 * mark the numbers a later telemetry verdict can change with a one-line edit.
 *
 * The engine NEVER hardcodes these numbers — it receives a `tuning` object
 * (createTuning(overrides) over CANON). The Tuning Bench in the Phase-1
 * viewer produces session-local overrides; nothing here is silently edited.
 */

export const CANON = {
  // -- Fighter math ------------------------------------------------ [GDD] §5.1
  hpBase: 60,
  hpPerVig: 8,
  mitSteelPerGrd: 0.02,      // Steel mitigation per GRD
  mitMagicPerGrd: 0.01,      // Ember/Shade mitigation per GRD
  mitCap: 0.6,               // hard cap (0.70 with Ash-Glazed Brass)
  mitCapAshGlazed: 0.7,      // relic Ash-Glazed Brass [GDD] §8.3
  braceBonus: 0.4,           // +40% mitigation while Braced
  braceBonusBastion: 0.6,    // vow Bastion: Brace is 20% stronger (0.4→0.6)
  frayGuardMult: 0.6,        // Guard ×0.6 while Frayed
  critBase: 0.05,
  critPerHst: 0.01,
  critMult: 1.5,
  critMultDuelist: 1.75,     // vow Duelist

  // -- Stat budget -------------------------------------------------- D7/N5
  creationPoints: 4,
  pointsPerLevel: 2,
  statCap: 10,
  budgetBase: 33,            // budget(L) = 33 + 2(L−1); enemy budget edge is
  budgetPerLevel: 2,         // intentional (D7: "the practice of the dead")

  // -- Level sync (over-level handling) --------------------------------- D2
  levelSync: {
    statPerLevel: 1,         // +1 stat per level over band
    hpPctPerLevel: 0.04,     // +4% HP per level over band
    capLevels: 3,
  },

  // -- Resolve ------------------------------------------------------ [GDD] §5.3
  resolveStart: 3,
  resolveStartSecondMover: 4,
  resolveIncome: 3,
  resolveCap: 10,
  hushMod: 2,                // Hush: gain −2
  hushModSilence: 3,         // vow Silence / Tollward's Rod: −3
  hushFloor: 1,              // never below +1
  strikeRefund: 1,

  // -- Bounded Roll ------------------------------------------------- [GDD] §10
  jitterCenter: 1.0,
  jitterWidth: 0.1,          // per-hit 90%–110%
  fortuneDrift: 0.02,        // ±2% per damaging instance
  fortuneMin: 0.88,
  fortuneMax: 1.12,

  // -- Fatigue — one schedule ------------------------------------------- D8
  fatigue: {
    telegraphRound: 13,      // TOLL IN 3/2/1 on r13–15
    startRound: 16,
    schedule: [2, 4, 8, 16, 32], // r16–20, cumulative 62
    lastBellRound: 20,
  },

  // -- Statuses ----------------------------------------------------- [GDD] §5.5
  bleedCap: 5,               // cap 8 with vow Red Tide
  bleedCapRedTide: 8,
  bleedTickBase: 2,
  bleedCoefMig: 0.18,
  burnBase: 2,               // ENG call (canon defines tick as base + 0.25×WIT
  burnCoefWit: 0.25,         // without naming base); single source, tweakable
  burnPotencyCapStoke: 14,
  curseMult: 0.75,           // ×0.75 damage while Cursed
  curseMultLastHymn: 0.6,    // vow Last Hymn: 40% reduction, +1 turn
  frayMult: 0.6,
  stunLockTurns: 2,          // turns the target must take before re-stun
  statusTurns: { bleed: 3, burn: 3, curse: 2, fray: 3, hush: 2, brace: 1, ward: 3, thorns: 3 },

  // -- Class vows --------------------------------------------------- [GDD] §7.1
  vows: {
    redTideTickBonus: 1,
    duelistCritBonus: 0.15,
    hungerPct: 0.12,           // heal 12% of direct damage
    slowAshTurns: 2,
    slowAshPotency: 1,
    pyreBonus: 0.2,            // +20% Ember direct vs burning targets
    kindlingResolve: 1,        // +1 Resolve when your Burn ticks
    bastionMit: 0.1,           // +10% mitigation
    thornBearerBonus: 4,
    longDarkPct: 0.04,         // heal 4% max HP at turn start
    lastHymnTurns: 1,
    echoingGriefPct: 0.08,     // +8% Shade per debuff on the target
    silenceHush: 3,            // Hush reduces gain by 3
    silenceApplyResolve: 1,    // +1 Resolve when you apply Hush
  },

  // -- Item flags the engine honours -------------------------------- [GDD] §8.3
  items: {
    ashGlazedBrassId: 'ash_glazed_brass',   // mitigation cap 0.70
    candleId: 'candle_of_saint_orrin',      // deterministic 1-HP save, once
  },

  // -- PROVISIONAL single-source numbers ------------------------------------
  bramHP: 120,               // PROVISIONAL:D12 (was 148; Phase-10 telemetry)
  vigilsRestCost: 2,         // PROVISIONAL:D17 — required for the no-net-positive
                             // Resolve-loop assert to pass
  ilvanePhase2HealPct: 0.2,  // PROVISIONAL:D31/A4
  ilvanePhase3MaxCopy: 1,    // T1.8: he learns the single most-cast slotted verse
};
