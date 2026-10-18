/**
 * fight.js — the authoritative fight loop. [GDD] §15.2, §5.1 (turn order),
 * §5.3 (Resolve), §10.5/10.6 (Measure order, Wax Meter), §5.6 (Fatigue, D8),
 * §5.7 (Rites), §10.9 (bans), §11.5 (log gutter spec).
 *
 * The engine is agnostic to who plays: a side is either AI-scored
 * (deterministic, Ban 6) or driven by an injected human choice
 * (submitChoice). Same seed + same builds + same choices = byte-identical
 * log, on Node and browser.
 *
 * ENG call (recorded): when a killing blow and Thorn retaliation land in the
 * same damage instance, the KILL resolves first — a fighter that dies to
 * Thorns after landing a lethal hit has still won. The log narrates both.
 */

import { makeMeasures, mulberry32, deriveSeed, displaySeed } from '../rng/index.js';
import { buildSheet, vowMods } from './fighter.js';
import { initStatuses, applyBleed, applyBurn, applyTimed, applyWard, applyThorns, applyStun, cleanseAll, cleanseOne, consumeDebuffs, tickAtTurnStart, distinctDebuffs } from './status.js';
import { resolveDamage, trueTick } from './damage.js';
import { resolveAtFightStart, resolveGain, canPay, pay, gain } from './resolve.js';
import { telegraphFor, fatigueDamage, isLastBellRound, lastBellResolve } from './fatigue.js';
import { evalRites } from './rites.js';
import { getVerse, STRIKE, VERSE_BY_ID } from '../data/verses.js';
import { RITES } from '../data/rites.js';
import { chooseVerse } from './ai.js';
import { markMods, mergeMods, statusBlocked, applyFightStartMarks, turnStartMarks, effectiveCost, applierCurseMult } from './marks.js';

const DEBUFF_KEYS = ['bleed', 'burn', 'curse', 'fray', 'hush', 'stun'];

function toRuntime(sheet, side, tuning) {
  return {
    side,
    sheet,
    hp: sheet.maxHp,
    maxHp: sheet.maxHp,
    resolve: 0,
    statuses: initStatuses(),
    cooldowns: {},
    casts: {},
    firstCast: {}, // verse id → round of its first cast (Ilvane tie-break, F-FIGHT-3)
    flags: { candleUsed: false },
    // T4.5: vow mods + mark mods merged with documented combination rules
    // (marks.js header). Gear-free builds produce byte-identical mods.
    mods: mergeMods(vowMods(sheet, tuning), markMods(sheet, tuning), tuning),
    riteState: sheet.rite
      ? { name: RITES[sheet.rite]?.name || 'Rite', firedIdx: [], statMults: {}, flags: {}, learn: null }
      : null,
    totals: { dealt: 0, taken: 0, healed: 0 },
  };
}

/**
 * Create a fight session.
 * @param {object} buildA - attacker/challenger build
 * @param {object} buildB - defender build
 * @param {{seed?:number, tuning:object, manualSide?:'a'|'b'|null}} opts
 */
export function createSession(buildA, buildB, opts) {
  const tuning = opts.tuning;
  const seed = opts.seed != null ? opts.seed >>> 0 : deriveSeed(buildA, buildB, 0, 0);
  const m = makeMeasures(mulberry32(seed));

  const a = toRuntime(buildSheet(buildA, tuning), 'a', tuning);
  const b = toRuntime(buildSheet(buildB, tuning), 'b', tuning);
  a.opponent = b; b.opponent = a;

  // Turn order: higher HST first; ties via Band(2) and the loser (second
  // mover) starts with +1 Resolve — the §5.1/§10.5 compensation.
  let tieBroken = false;
  let order;
  if (a.sheet.stats.hst > b.sheet.stats.hst) order = [a, b];
  else if (b.sheet.stats.hst > a.sheet.stats.hst) order = [b, a];
  else if (a.mods.winTieFlips && !b.mods.winTieFlips) {
    // Salt Widow's Comb (T4.5): the holder wins all turn-order ties. The
    // Measure band is NOT consumed — the draw stream stays aligned per build.
    tieBroken = true;
    order = [a, b];
  } else if (b.mods.winTieFlips && !a.mods.winTieFlips) {
    tieBroken = true;
    order = [b, a];
  } else {
    tieBroken = true;
    order = m.band(2) === 0 ? [a, b] : [b, a];
  }
  resolveAtFightStart(order[0], false, tuning);
  resolveAtFightStart(order[1], true, tuning);

  const session = {
    tuning,
    seed,
    display: displaySeed(seed),
    m,
    fighters: { a, b },
    order,
    idx: 0,
    tieBroken,
    state: {
      round: 0,
      fortune: 1.0,
      fortuneTrack: [1.0],
      over: false,
      phase: 'ready', // ready | turn_start | await_input | resolving | done
      current: null,
      winner: null,
      lastBell: false,
      learned: null, // Ilvane III's copied verse id (fixture path)
    },
    log: [],
    manualSide: opts.manualSide || null,
    pendingChoice: null, // fighter awaiting a manual verse choice
  };

  session.logLine = (kind, side, text, extra) => {
    const entry = { r: session.state.round, kind, side, text };
    // Presentation-only extras (e.g. { color: rawType } for the log gutter's
    // damage-type border, §11.5). Never read back by the math.
    if (extra) Object.assign(entry, extra);
    session.log.push(entry);
  };
  if (opts.silent) {
    // Harness mode (T2.1/T2.4): no log lines. Logging never feeds back into
    // the math, so results are byte-identical with and without it (asserted
    // in tests/phase2-harness.test.js).
    session.logLine = () => {};
  }

  if (tieBroken) {
    session.logLine('info', order[0].side,
      `The bell tolls once. ${order[0].sheet.name} goes. ${order[1].sheet.name} starts with +1 Resolve.`);
  } else {
    session.logLine('info', order[0].side, `${order[0].sheet.name} is faster and goes first.`);
  }

  // T4.5 fight-start marks (Ward/Brace/Resolve grants) — after the §5.3
  // start Resolve so a mark +1 lands on top, cap respected.
  applyFightStartMarks(order[0], tuning, session.logLine);
  applyFightStartMarks(order[1], tuning, session.logLine);

  return session;
}

/** Verses a fighter may legally cast right now. Deterministic list. */
export function legalVerses(session, f) {
  const tuning = session.tuning;
  // Rite override: a "castEveryTurn" flag locks the pool to that verse.
  const locked = f.riteState?.flags?.castEveryTurn;
  const ids = locked
    ? [locked]
    : [STRIKE.id, ...f.sheet.verses];
  const out = [];
  for (const id of ids) {
    const v = getVerse(id);
    if (f.cooldowns[id] > 0) continue;
    // T4.5: mark pricing (Vigil's Ring / Orrery Lens) counts here too, or
    // the legal list would disagree with submitChoice (the F-FIGHT-1 class).
    if (!canPay(f, effectiveCost(f, v, tuning), tuning)) continue;
    if (v.isStrike) { out.push(v); continue; }
    if (f.riteState?.learn && id === f.riteState.learn?.verseId) { out.push(v); continue; }
    if (f.sheet.verses.includes(id)) out.push(v);
  }
  // A learned verse (Ilvane III) is part of the cast pool even though it is
  // not on the learner's own sheet (re-test fix F-FIGHT-1: poolForAI already
  // treated it so — the exported legal list must agree, or the manual UI
  // would hide a verse the engine accepts).
  const learned = f.riteState?.learn?.verseId;
  if (!locked && learned && (f.cooldowns[learned] || 0) <= 0
    && canPay(f, effectiveCost(f, getVerse(learned), tuning), tuning)
    && !out.some((v) => v.id === learned)) {
    out.push(getVerse(learned));
  }
  // A Rite-locked fighter whose locked verse is unaffordable still acts.
  if (locked && out.length === 0) out.push(getVerse(STRIKE.id));
  return out;
}

/** Effective cast pool for AI (includes a learned Ilvane III verse). */
function poolForAI(session, f) {
  const legal = legalVerses(session, f);
  const learned = f.riteState?.learn?.verseId;
  if (learned && f.cooldowns[learned] <= 0 && canPay(f, effectiveCost(f, getVerse(learned), session.tuning), session.tuning)) {
    const v = getVerse(learned);
    if (!legal.some((x) => x.id === learned)) legal.push(v);
  }
  return legal;
}

/** One damaging instance's shared bookkeeping (totals + death + rites). */
function afterDamage(session, actor, target, audit, verb) {
  actor.totals.dealt += audit.dealt;
  target.totals.taken += audit.land;
  if (audit.candle) {
    session.logLine('bell', target.side, `The Candle of Saint Orrin flares — ${target.sheet.name} stands at 1 HP. It will not flare twice.`);
  }
  if (audit.warded > 0) {
    session.logLine('ward', target.side, `${target.sheet.name}'s Ward drinks ${audit.warded}.`);
  }
  if (audit.thornsDealt > 0) {
    session.logLine('dot', actor.side, `Thorns answer: ${actor.sheet.name} takes ${audit.thornsDealt} true damage.`);
  }
  if (audit.markThorns > 0) {
    session.logLine('dot', actor.side, `The gauntlets bite back: ${actor.sheet.name} takes ${audit.markThorns} true damage.`);
  }
  evalRitesNow(session, target);
  evalRitesNow(session, actor);
  if (audit.killed) {
    // Kill precedes Thorn retaliation (ENG call, recorded in header).
    endFight(session, actor.side, `${target.sheet.name} falls.`);
    return true;
  }
  if (actor.hp <= 0) {
    endFight(session, target.side, `${actor.sheet.name} dies on the reply — the thorns were the last word.`);
    return true;
  }
  return false;
}

/** Evaluate Rite triggers; apply stat mults to the per-fight sheet copy. */
function evalRitesNow(session, f) {
  if (!f.riteState) return;
  const { fired, lines } = evalRites(f, session.state.round);
  for (const t of fired) {
    if (t.change.statMults) {
      for (const [k, mult] of Object.entries(t.change.statMults)) {
        f.sheet.stats[k] = f.sheet.stats[k] * mult;
      }
    }
    if (t.change.damageType) f.sheet.damageType = t.change.damageType;
    if (t.change.special === 'learn_most_cast') {
      // T1.8: he learns the verse you have cast MOST OFTEN (slotted only,
      // Strike excluded per F21). Tie → earliest FIRST-CAST of the tied
      // (re-test fix F-FIGHT-3: the header comment recorded this rule but
      // the code implemented loadout order — now it tracks firstCast rounds,
      // with loadout order as the final determinism anchor).
      const player = f.side === 'a' ? session.fighters.b : session.fighters.a;
      let best = null; let bestN = -1; let bestFirst = Infinity;
      for (const id of player.sheet.verses) {
        const n = player.casts[id] || 0;
        const first = player.firstCast?.[id] ?? Infinity;
        if (n > bestN || (n === bestN && n > 0 && first < bestFirst)) {
          best = id; bestN = n; bestFirst = first;
        }
      }
      if (best && bestN > 0) {
        f.riteState.learn = { verseId: best };
        session.state.learned = f.side;
        session.state.learnedVerse = best;
        const name = getVerse(best).name;
        session.logLine('rite', f.side, `He is learning ${name}.`);
      } else {
        session.logLine('rite', f.side, 'He is learning your silence — nothing worth copying yet.');
      }
    }
    session.logLine('rite', f.side, `RITE — ${t.line}`);
  }
}

/**
 * Execute one verse: the effect op-code interpreter. Reads verse data,
 * never mutates it. Consumes the Measure stream in the canonical order.
 */
export function executeVerse(session, actor, target, verse) {
  const tuning = session.tuning;
  const m = session.m;
  // accepts both log(kind, text) and log(kind, side, text)
  const log = (kind, a, b) => session.logLine(kind, actor.side, b === undefined ? a : b);
  actor.casts[verse.id] = (actor.casts[verse.id] || 0) + 1;
  if (actor.firstCast[verse.id] === undefined) actor.firstCast[verse.id] = session.state.round;

  for (const e of verse.effects) {
    if (session.state.over) break;
    switch (e.op) {
      case 'damage': {
        // Rites of Passage (T4.5): while the ember shift is live, the
        // wielder's damage IS Ember regardless of the verse's type.
        const rawType = actor.flags.emberShift
          ? 'ember'
          : (e.type === 'main' ? actor.sheet.damageType : (e.type || actor.sheet.damageType));
        const hits = e.hits || 1;
        const bleedStacks = target.statuses.bleed?.stacks || 0;
        for (let h = 0; h < hits; h++) {
          const spec = {
            base: e.base,
            coefs: e.coefs,
            type: rawType === 'true' ? actor.sheet.damageType : rawType,
            critBonus: e.critBonus,
            bonusIfTargetBurning: e.bonusIfTargetBurning,
            perDebuffPct: e.perDebuffPct,
            perDebuffFlat: e.perDebuffFlat,
            perDebuffFlatMax: e.perDebuffFlatMax,
            mitigationFactor: e.mitigationFactor,
            ignoreMit: e.ignoreMit || e.type === 'true',
            perBleedStack: !!(e.perBleedStackTrue || e.perBleedStackIgnoreMit),
            _bleedStacks: bleedStacks,
          };
          const audit = resolveDamage(session.state, actor, target, spec, m, tuning);
          const bits = [];
          if (audit.crit) bits.push('CRIT ×' + (actor.mods.critMult || tuning.critMult));
          if (audit.warded > 0) bits.push('ward ' + audit.warded);
          const hitName = hits > 1 ? ` (hit ${h + 1}/${hits})` : '';
          // the damage line carries its type so the log gutter can draw the
          // 1px left border in the damage type's colour (§11.5)
          session.logLine('damage', actor.side,
            `${actor.sheet.name}'s ${verse.name} hits ${target.sheet.name} for ${audit.land}${rawType === 'true' ? ' true' : ' ' + rawType}${hitName}${bits.length ? ' [' + bits.join(', ') + ']' : ''}.`,
            { color: rawType });

          // lifesteal: verse pct + vow pct, on damage that reached HP
          const ls = (e.lifestealPct || 0) + (actor.mods.lifestealPct || 0);
          if (ls > 0 && audit.land > 0) {
            const heal = Math.round(audit.land * ls);
            actor.hp = Math.min(actor.maxHp, actor.hp + heal);
            actor.totals.healed += heal;
            log('heal', `${actor.sheet.name} drinks ${heal}.`);
          }

          if (afterDamage(session, actor, target, audit, verse.name)) return;

          // T4.5 on-hit marks — deterministic, RNG consumed ONLY when the
          // item is present (builds without the gear draw the same stream).
          if (audit.land > 0) {
            if (actor.mods.firstHitBleed && !actor.flags.firstHitBleedUsed) {
              actor.flags.firstHitBleedUsed = true;
              applyBleed(target, actor.mods.firstHitBleed, actor.sheet.stats.mig,
                actor.mods.bleedCap, actor.mods.bleedTickBonus || 0, tuning.statusTurns.bleed);
              session.logLine('status', actor.side, `The first cut opens deep — ${target.sheet.name} bleeds +${actor.mods.firstHitBleed}.`);
            }
            if (actor.mods.onHitHushChance && !statusBlocked(target, 'hush')) {
              if (m.band(100) < Math.round(actor.mods.onHitHushChance * 100)) {
                applyTimed(target, 'hush',
                  tuning.statusTurns.hush + (actor.mods.hushTurnsBonus || 0),
                  actor.mods.hushMod ?? tuning.hushMod,
                  actor.mods.hushCritReduction ? { critCut: actor.mods.hushCritReduction } : undefined);
                session.logLine('status', actor.side, `The fork finds the note — ${target.sheet.name} is Hushed.`);
              }
            }
          }
        }
        // consume-after: Reap the Red / Blood Ledger empty the stacks
        if (e.consumeBleed && target.statuses.bleed) {
          session.logLine('status', actor.side, `All ${target.statuses.bleed.stacks} Bleed stacks are spent.`);
          target.statuses.bleed = null;
        }
        if (e.consumeDebuff) {
          const gone = consumeDebuffs(target, e.consumeDebuff);
          if (gone.length) log('status', actor.side, `${verse.name} consumes ${gone.join(', ')}.`);
        }
        break;
      }
      case 'bleed+': {
        // Source's tick bonus + the single-source bleed duration ride along
        // (F-STATUS-1 / F-STATUS-2: the victim's vow mods never decide the
        // tick, and tuning.statusTurns.bleed is live config, not dead text).
        // Wick-Cutter (T4.5): the FIRST bleed applied each fight +2 stacks.
        let stacks = e.stacks;
        if (actor.mods.bleedFirstApplyBonus && !actor.flags.bleedFirstApplyUsed) {
          actor.flags.bleedFirstApplyUsed = true;
          stacks += actor.mods.bleedFirstApplyBonus;
          session.logLine('status', actor.side, `The Wick-Cutter opens wide (+${actor.mods.bleedFirstApplyBonus} stacks).`);
        }
        const st = applyBleed(target, stacks, actor.sheet.stats.mig, actor.mods.bleedCap,
          actor.mods.bleedTickBonus || 0, tuning.statusTurns.bleed);
        log('status', actor.side, `${target.sheet.name} bleeds — ${st.stacks} stacks.`);
        break;
      }
      case 'burn': {
        if (statusBlocked(target, 'burn')) {
          log('status', actor.side, `${target.sheet.name} is soaked through — the flame will not take.`);
          break;
        }
        const wit = actor.sheet.stats.wit;
        const existing = target.statuses.burn;
        let potency;
        if (e.double) {
          if (!existing) { log('status', actor.side, 'There is no ember to stoke yet.'); break; }
          potency = Math.min(tuning.burnPotencyCapStoke, existing.potency * 2);
        } else {
          potency = tuning.burnBase + tuning.burnCoefWit * wit + (e.potencyBonus || 0) + (actor.mods.burnPotency || 0);
        }
        const turns = tuning.statusTurns.burn + (actor.mods.burnTurns || 0);
        // Kindling flag + side stored at application (F-STATUS-1)
        const st = applyBurn(target, potency, wit, turns, actor.mods.burnTickResolve || 0, actor.side);
        // Ysolde's Censer (T4.5): the applier pays 1 per tick of their own
        // burn — strongest application stands, like the Kindling flag.
        if (actor.mods.burnSelfTick) st.selfTick = Math.max(st.selfTick || 0, actor.mods.burnSelfTick);
        log('status', actor.side, `${target.sheet.name} burns for ${potency} per turn.`);
        break;
      }
      case 'curse': {
        if (statusBlocked(target, 'curse')) {
          log('status', actor.side, `${target.sheet.name} cannot be cursed.`);
          break;
        }
        // Duration is the APPLIER's; the DEPTH now travels with the status
        // too (F-DATA-1 — same transport as Hush, F-STATUS-1).
        applyTimed(target, 'curse', tuning.statusTurns.curse + (actor.mods.curseTurns || 0),
          { curseMult: applierCurseMult(actor, tuning) });
        log('status', actor.side, `${target.sheet.name} is Cursed — their verses ring hollow.`);
        break;
      }
      case 'fray': {
        applyTimed(target, 'fray', tuning.statusTurns.fray);
        log('status', actor.side, `${target.sheet.name}'s guard frays.`);
        break;
      }
      case 'hush': {
        if (statusBlocked(target, 'hush')) {
          log('status', actor.side, `The hush cannot find a hold on ${target.sheet.name}.`);
          break;
        }
        // The APPLIER's depth travels with the status (F-STATUS-1): a Silence
        // Cantor's hush starves −3 even off the victim's own sheet. Orrery
        // Robe adds +1 turn; the Choir-Seal's rider cuts the target's crits.
        applyTimed(target, 'hush', tuning.statusTurns.hush + (actor.mods.hushTurnsBonus || 0),
          actor.mods.hushMod ?? tuning.hushMod,
          actor.mods.hushCritReduction ? { critCut: actor.mods.hushCritReduction } : undefined);
        log('status', actor.side, `${target.sheet.name} is Hushed.`);
        if (actor.mods.hushApplyResolve) {
          gain(actor, actor.mods.hushApplyResolve, tuning);
          log('resolve', actor.side, `The hush feeds ${actor.sheet.name} +${actor.mods.hushApplyResolve} Resolve.`);
        }
        break;
      }
      case 'brace': {
        // Warden's Cassock (T4.5): Brace lasts 1 extra turn; Bellmetal Maul:
        // Brace also grants 4 Ward.
        applyTimed(actor, 'brace', tuning.statusTurns.brace + (actor.mods.braceTurnsBonus || 0));
        log('status', actor.side, `${actor.sheet.name} braces.`);
        if (actor.mods.braceGrantsWard) {
          applyWard(actor, actor.mods.braceGrantsWard, tuning.statusTurns.ward);
          log('status', actor.side, `The maul hums — ${actor.sheet.name} raises ${actor.mods.braceGrantsWard} Ward.`);
        }
        break;
      }
      case 'ward': {
        let pool = e.base;
        for (const c of e.coefs || []) pool += c.c * actor.sheet.stats[c.stat];
        applyWard(actor, Math.round(pool), tuning.statusTurns.ward);
        log('status', actor.side, `${actor.sheet.name} raises ${Math.round(pool)} Ward.`);
        break;
      }
      case 'thorns': {
        let value = e.base;
        for (const c of e.coefs || []) value += c.c * actor.sheet.stats[c.stat];
        applyThorns(actor, Math.round(value) + (actor.mods.thornsBonus || 0), tuning.statusTurns.thorns);
        log('status', actor.side, `${actor.sheet.name} grows spikes (${Math.round(value) + (actor.mods.thornsBonus || 0)}).`);
        break;
      }
      case 'stun': {
        if (statusBlocked(target, 'stun')) {
          log('status', actor.side, `The stun slides off ${target.sheet.name} — wax deafens the bell.`);
          break;
        }
        const ok = applyStun(target);
        if (ok) log('status', actor.side, `${target.sheet.name} is Stunned — the next bell is theirs to miss.`);
        else log('status', actor.side, `${target.sheet.name} is still reeling — the stun will not take twice yet.`);
        break;
      }
      case 'heal': {
        let amount = e.base;
        for (const c of e.coefs || []) amount += c.c * actor.sheet.stats[c.stat];
        const healed = Math.min(actor.maxHp - actor.hp, Math.round(amount));
        if (healed > 0) {
          actor.hp += healed;
          actor.totals.healed += healed;
          log('heal', `${actor.sheet.name} mends ${healed}.`);
        }
        break;
      }
      case 'resolve': {
        let amount = e.amount || 0;
        if (e.amountPerBleedStack) amount += (target.statuses.bleed?.stacks || 0) * e.amountPerBleedStack;
        if (amount > 0) {
          gain(actor, amount, tuning);
          log('resolve', actor.side, `${actor.sheet.name} gathers +${amount} Resolve.`);
        }
        break;
      }
      case 'cleanse': {
        let removed;
        if (e.all) {
          removed = cleanseAll(actor);
        } else {
          const k = cleanseOne(actor);
          removed = k ? [k] : [];
        }
        if (removed.length) log('status', actor.side, `${actor.sheet.name} is cleansed of ${removed.join(', ')}.`);
        else log('status', actor.side, `${actor.sheet.name} has nothing to cleanse.`);
        break;
      }
      case 'selfTrue': {
        const amt = trueTick(e.amount);
        actor.hp = Math.max(0, actor.hp - amt);
        actor.totals.taken += amt;
        log('dot', actor.side, `${actor.sheet.name} pays ${amt} true damage to the flame.`);
        evalRitesNow(session, actor);
        if (actor.hp <= 0) {
          endFight(session, target.side, `${actor.sheet.name} burns past the wick.`);
          return;
        }
        break;
      }
      default:
        break;
    }
  }
}

function cleanseOneName(actor) {
  for (const k of DEBUFF_KEYS) if (actor.statuses[k]) return k;
  return null;
}

/** Cooldown tick point: end of the caster's own turn (§15.2 step 7). */
function tickCooldowns(f) {
  for (const id of Object.keys(f.cooldowns)) {
    f.cooldowns[id] -= 1;
    if (f.cooldowns[id] <= 0) delete f.cooldowns[id];
  }
}

function endFight(session, winnerSide, line) {
  const s = session.state;
  if (s.over) return;
  s.over = true;
  s.winner = winnerSide;
  s.phase = 'done';
  if (line) session.logLine('info', winnerSide, line);
  session.logLine('info', winnerSide, `The fight ends in round ${s.round}.`);
}

function endTurn(session) {
  const f = session.state.current;
  if (f) tickCooldowns(f);
  session.state.current = null;
  session.pendingChoice = null;
  session.state.phase = 'turn_start';
  session.idx += 1;
  if (session.state.over) return;
  if (session.idx >= session.order.length) {
    session.idx = 0;
    // Last Bell: end of round 20 resolves the fight (D8)
    if (isLastBellRound(session.state.round, session.tuning)) {
      const [x, y] = session.order;
      const verdict = lastBellResolve(x, y);
      const winner = verdict.winner === 'a' ? session.fighters.a : session.fighters.b;
      const loser = verdict.winner === 'a' ? session.fighters.b : session.fighters.a;
      session.state.lastBell = true;
      session.logLine('bell', winner.side, 'THE LAST BELL — the bell falls. Whoever is still standing when it does, was always going to.');
      session.logLine('bell', winner.side, `${winner.sheet.name} stands at ${Math.round((winner.hp / winner.maxHp) * 100)}%. ${loser.sheet.name} at ${Math.round((loser.hp / loser.maxHp) * 100)}%.`);
      endFight(session, verdict.winner, `LAST BELL — ${winner.sheet.name} wins on standing. The report will mark it.`);
      return;
    }
    beginRound(session);
  } else {
    startTurn(session);
  }
}

function beginRound(session) {
  const s = session.state;
  if (s.over) return;
  s.round += 1;
  session.logLine('round', null, `— round ${s.round} —`);
  const toll = telegraphFor(s.round, session.tuning);
  if (toll) session.logLine('bell', null, `TOLL IN ${toll}.`);
  const fd = fatigueDamage(s.round, session.tuning);
  if (fd > 0) {
    // Thimble Coat (T4.5): take 2 less Fatigue damage per round, floor 0.
    for (const f of session.order) {
      const amt = Math.max(0, fd - (f.mods.fatigueReduction || 0));
      f.statuses.fatigue = { amount: amt };
    }
    const reduced = session.order.some((f) => f.mods.fatigueReduction > 0);
    session.logLine('bell', null, `The bell tolls — both fighters take ${fd} true damage this round.${reduced ? ' Padded coats soften it for some.' : ''}`);
  }
  startTurn(session);
}

function startTurn(session) {
  const s = session.state;
  if (s.over) return;
  const f = session.order[session.idx];
  s.current = f;
  s.phase = 'turn_start';
  const tuning = session.tuning;
  const foe = f.opponent;

  // 1. resolve gain (+3, Hush-modified, floor +1, cap 10) + Rite bonus
  const g = resolveGain(f, tuning);
  let gainLine = `+${g} Resolve`;
  if (f.riteState?.flags.resolveBonusPerTurn) {
    gain(f, f.riteState.flags.resolveBonusPerTurn, tuning);
    gainLine += ` (+${f.riteState.flags.resolveBonusPerTurn} Rite)`;
  }
  session.logLine('resolve', f.side, `${f.sheet.name}: ${gainLine} → ${f.resolve}.`);

  // 2. turn-start effects: vow Long Dark + mark layer (Drowned Mantle heal,
  //    Bell of Nine Tolls round trigger, ember-shift expiry — T4.5)
  if (f.mods.turnStartHealPct > 0) {
    const heal = Math.round(f.maxHp * f.mods.turnStartHealPct);
    const actual = Math.min(f.maxHp - f.hp, heal);
    if (actual > 0) {
      f.hp += actual;
      f.totals.healed += actual;
      session.logLine('heal', f.side, `The Long Dark keeps ${f.sheet.name}: +${actual}.`);
    }
  }
  turnStartMarks(session, f);

  // 3. status ticks, FIXED order: BURN → BLEED → THORN COUNTER → FATIGUE
  //    Founder's Leather (T4.5): the holder's Ward absorbs 1 per DoT tick.
  const events = tickAtTurnStart(
    f, tuning, f.mods,
    (amount, key) => {
      let dmg = trueTick(amount);
      if (f.mods.wardDotAbsorb > 0 && (key === 'burn' || key === 'bleed')
        && f.statuses.ward && f.statuses.ward.pool > 0 && dmg > 0) {
        const absorb = Math.min(f.mods.wardDotAbsorb, f.statuses.ward.pool, dmg);
        f.statuses.ward.pool -= absorb;
        dmg -= absorb;
        if (f.statuses.ward.pool <= 0) f.statuses.ward = null;
        session.logLine('ward', f.side, `The leather drinks ${absorb} of the ${key}.`);
      }
      if (dmg > 0) {
        f.hp = Math.max(0, f.hp - dmg);
        f.totals.taken += dmg;
        session.logLine('dot', f.side, `${f.sheet.name} takes ${dmg} true damage (${key}).`);
      }
    },
    (ev) => {
      if (ev.kind === 'resolve') {
        // Kindling resolves to the SOURCE of the burn (F-STATUS-1) — the
        // event carries the applier's side; fall back to the ticker.
        const who = ev.side ? session.fighters[ev.side] : f;
        gain(who, ev.amount, tuning);
        session.logLine('resolve', who.side, `Kindling: +${ev.amount} Resolve.`);
      } else if (ev.kind === 'selfTick') {
        // Ysolde's Censer: the burn's SOURCE pays 1 per tick (T4.5).
        const who = ev.side ? session.fighters[ev.side] : f;
        who.hp = Math.max(0, who.hp - ev.amount);
        who.totals.taken += ev.amount;
        session.logLine('dot', who.side, `The censer collects from ${who.sheet.name}: ${ev.amount} true.`);
      }
    }
  );
  evalRitesNow(session, f);
  evalRitesNow(session, foe);

  if (f.hp <= 0) {
    endFight(session, foe.side, `${f.sheet.name} succumbs between the bells.`);
    return;
  }

  // 4. Stun: skip the turn, keep the re-stun lock honest
  if (f.statuses.stun?.skipNext) {
    f.statuses.stun.skipNext = false;
    session.logLine('stun', f.side, `${f.sheet.name} is stunned and loses the turn.`);
    endTurn(session);
    return;
  }

  // 5. choose verse: manual injection pauses here; the AI path yields to the
  //    driver loop (phase 'ai_ready') so every choice is one atomic step.
  if (session.manualSide === f.side) {
    s.phase = 'await_input';
    session.pendingChoice = f;
    return; // UI calls submitChoice(verseId)
  }
  s.phase = 'ai_ready';
}

/**
 * Submit a verse choice for the pending fighter (manual mode). Also used
 * internally by the AI path. Validates affordability/cooldown again.
 */
export function submitChoice(session, verseId) {
  const f = session.state.current || session.pendingChoice;
  if (!f || session.state.over) return { ok: false, error: 'no pending turn' };
  const tuning = session.tuning;
  // Unknown ids are a structured rejection like every other invalid input —
  // not an engine crash (re-test fix F-FIGHT-2; manual input is untrusted).
  const verse = VERSE_BY_ID.get(verseId);
  if (!verse) return { ok: false, error: `unknown verse: ${verseId}` };
  if (f.cooldowns[verseId] > 0) return { ok: false, error: 'on cooldown' };
  // T4.5 mark pricing: Vigil's Ring (Brace free) + Orrery Lens (second cast −1)
  const cost = effectiveCost(f, verse, tuning);
  if (!canPay(f, cost, tuning)) return { ok: false, error: 'not enough Resolve' };
  const isLearned = f.riteState?.learn?.verseId === verseId;
  if (!verse.isStrike && !f.sheet.verses.includes(verseId) && !isLearned) {
    return { ok: false, error: 'not in loadout' };
  }
  session.state.phase = 'resolving';
  session.pendingChoice = null;
  if (cost > 0) pay(f, cost, tuning);
  else if (verse.isStrike) { /* Strike is free and refunds +1 in effects */ }
  if (verse.cd) f.cooldowns[verseId] = verse.cd;

  executeVerse(session, f, f.opponent, verse);
  if (verse.isStrike) {
    // refund is part of the Strike definition (§5.3)
    gain(f, tuning.strikeRefund, tuning);
  }
  if (!session.state.over) endTurn(session);
  return { ok: true };
}

/**
 * Step one atomic unit: a round header, or ONE AI verse choice. Returns
 * false when the fight is over or waiting on a human choice.
 */
export function step(session) {
  const s = session.state;
  if (s.over) return false;
  if (s.phase === 'ready') { beginRound(session); return true; }
  if (s.phase === 'await_input') return false; // needs a human choice
  if (s.phase === 'ai_ready') {
    const f = s.current;
    // Scripted opener (ENG-9, T3.6): consume one queued verse per AI turn.
    // A trailing '*' on an id means REPEAT that verse whenever it is legal
    // (the enemy doctrine — Bram's "Brace and outlast", §9.1) until T5.7
    // replaces this hook with the full scripting engine. A queued id that is
    // not currently legal is dropped and the scorer takes over —
    // deterministic either way, and the script can never make the AI cast an
    // illegal verse (the §10.9 bans hold under scripting).
    if (Array.isArray(f.sheet.script) && f.sheet.script.length) {
      const queued = f.sheet.script[0];
      const repeat = queued.endsWith('*');
      const id = repeat ? queued.slice(0, -1) : queued;
      const legalPick = legalVerses(session, f).find((v) => v.id === id);
      if (legalPick) {
        if (!repeat) f.sheet.script.shift();
        submitChoice(session, id);
        return true;
      }
      if (!repeat) f.sheet.script.shift();
    }
    const pick = chooseVerse(f, f.opponent, s, session.m, session.tuning, (actor) => poolForAI(session, actor));
    if (pick.tieBreak) {
      session.logLine('info', f.side, `${f.sheet.name} hesitates between equals — the Measure picks ${pick.verse.name}.`);
    }
    if (pick.verse) submitChoice(session, pick.verse.id);
    return true;
  }
  return false;
}

/** Run to completion (auto mode). */
export function runToCompletion(session) {
  let guard = 0;
  while (!session.state.over && guard < 1000) {
    guard += 1;
    if (!step(session)) break; // await_input (manual) or done
  }
  return session.state.over;
}

/** Convenience: full auto fight. Returns the results object. */
export function runFight(buildA, buildB, opts) {
  const session = createSession(buildA, buildB, opts);
  runToCompletion(session);
  return resultsOf(session);
}

/** Post-fight results object (the Ledger's raw inputs). */
export function resultsOf(session) {
  const s = session.state;
  return {
    seed: session.seed,
    display: session.display,
    winner: s.winner,
    rounds: s.round,
    lastBell: s.lastBell,
    fortune: s.fortune,
    fortuneTrack: s.fortuneTrack,
    totals: { a: session.fighters.a.totals.dealt, b: session.fighters.b.totals.dealt },
    hp: { a: session.fighters.a.hp, b: session.fighters.b.hp },
    maxHp: { a: session.fighters.a.maxHp, b: session.fighters.b.maxHp },
    log: session.log,
    over: s.over,
  };
}

/**
 * The Ledger verdict line. [GDD] §10.7 — computed from the Fortune track;
 * the "favored and lost" variant needs the Reading's expected win rate.
 */
export function ledgerVerdict(result, playerSide, expectedWinRate) {
  const won = result.winner === playerSide;
  const f = result.fortune;
  if (won) {
    if (f > 0.98 && f < 1.02) return 'The wax ran level. You won it.';
    if (f <= 0.98) return 'The wax ran cold for you. You won anyway.';
    return 'The wax ran hot. You won it — and it was shared, so your opponent had it too.';
  }
  if (expectedWinRate != null && expectedWinRate >= 0.7) {
    return 'You were favored and lost. The Reading knows why — open it.';
  }
  if (f <= 0.98) return 'The wax ran cold. You lost it — and the Reading saw it coming.';
  return 'You lost it. The log shows the mistake — a loss is a lesson, not a robbery.';
}
