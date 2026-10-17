/**
 * ai.js — the deterministic Echo-AI scorer (Phase-1 placeholder; the full
 * doctrine AI is T5.4). [GDD] §10.9 rule 6: NO randomness in AI competence —
 * every verse is scored with a fixed formula; only EXACT ties are broken
 * randomly, and then only among equals (Band(k) over the tied set).
 *
 * The scoring values below are engine-level heuristic weights, not canon
 * balance numbers; they exist so the harness can play thousands of legal
 * fights. T5.4 replaces the scorer, not this interface.
 */

const { STRIKE } = require('../data/verses.js');

/**
 * @param {object} actor - runtime fighter (to act)
 * @param {object} target - opponent
 * @param {object} state - fight state
 * @param {object} m - Measure facade
 * @param {object} tuning
 * @param {function} legalVersesOf - (fighter) => verse[]
 * @returns {{verse: object, scores: Array<{id, score}>, tieBreak: boolean}}
 */
function chooseVerse(actor, target, state, m, tuning, legalVersesOf) {
  const legal = legalVersesOf(actor);
  if (legal.length === 0) {
    // Unreachable by construction (Strike is free); the guard keeps the
    // engine total anyway (Ban 6: no randomness in AI competence).
    return { verse: STRIKE, scores: [], tieBreak: false, empty: true };
  }
  const scored = legal.map((v) => ({ verse: v, score: scoreVerse(actor, target, v, tuning) }));
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0].score;
  const tied = scored.filter((s) => s.score === top);
  if (tied.length === 1) return { verse: tied[0].verse, scores: scored, tieBreak: false };
  const pick = tied[m.band(tied.length)]; // uniform among equals only
  return { verse: pick.verse, scores: scored, tieBreak: true };
}

function scoreVerse(actor, target, verse, tuning) {
  let score = 0;
  const stats = actor.sheet.stats;
  const hpFrac = actor.hp / actor.maxHp;
  const targetHpFrac = target.hp / target.maxHp;

  for (const e of verse.effects) {
    switch (e.op) {
      case 'damage': {
        if (e.perBleedStackTrue || e.perBleedStackIgnoreMit) {
          const stacks = target.statuses.bleed?.stacks || 0;
          if (stacks === 0) { score -= 5; break; } // dead card without stacks
          let dmg = e.base;
          for (const c of e.coefs || []) {
            const k = c.stat === 'main' ? actor.sheet.mainStat : c.stat;
            dmg += c.c * stats[k];
          }
          score += dmg * stacks * 1.1; // ignores mitigation → worth more
          break;
        }
        let est = e.base;
        for (const c of e.coefs || []) {
          const k = c.stat === 'main' ? actor.sheet.mainStat : c.stat;
          est += c.c * stats[k];
        }
        if (e.bonusIfTargetBurning && target.statuses.burn) est *= 1 + e.bonusIfTargetBurning;
        if (e.perDebuffPct) {
          const deb = ['bleed', 'burn', 'curse', 'fray', 'hush', 'stun'].filter((k) => target.statuses[k]).length;
          est *= 1 + e.perDebuffPct * deb;
        }
        if (e.perDebuffFlat) {
          const deb = ['bleed', 'burn', 'curse', 'fray', 'hush', 'stun'].filter((k) => target.statuses[k]).length;
          est += e.perDebuffFlat * Math.min(e.perDebuffFlatMax ?? 4, deb);
        }
        const mit = target.statuses.brace ? 0.4 : 0;
        est *= 1 - mit * (e.ignoreMit ? 0 : 1);
        score += est;
        if (e.lifestealPct) score += e.lifestealPct * est * (1 - hpFrac) * 1.5;
        if (target.hp <= est) score += 1000; // lethal line — always take it
        break;
      }
      case 'bleed+':
        score += (target.statuses.bleed ? Math.min(5, target.statuses.bleed.stacks + e.stacks) : e.stacks) * 9;
        break;
      case 'burn':
        if (e.double && target.statuses.burn) score += target.statuses.burn.potency * 2.2;
        else if (e.potencyBonus) score += 4;
        else score += (2 + 0.25 * stats.wit) * 2.4;
        break;
      case 'curse': score += target.statuses.curse ? 2 : 14; break;
      case 'fray': score += target.statuses.fray ? 2 : 9; break;
      case 'hush': score += target.statuses.hush ? 2 : 10 + target.resolve * 0.5; break;
      case 'stun': score += target.statuses.stun?.skipNext ? 0 : 22; break;
      case 'brace': score += (1 - hpFrac) * 12 + 3; break;
      case 'ward': {
        let pool = e.base;
        for (const c of e.coefs || []) {
          const k = c.stat === 'main' ? actor.sheet.mainStat : c.stat;
          pool += c.c * stats[k];
        }
        score += pool * 0.95;
        break;
      }
      case 'thorns': score += (e.base + e.coefs.reduce((s, c) => s + c.c * stats[c.stat], 0)) * 1.6; break;
      case 'heal': {
        let amt = e.base;
        for (const c of e.coefs || []) amt += c.c * stats[c.stat];
        score += Math.min(actor.maxHp - actor.hp, amt) * 1.15;
        break;
      }
      case 'resolve': score += (e.amount ?? 0) * 1.4 + (e.amountPerBleedStack ? (target.statuses.bleed?.stacks || 0) * 1.4 : 0); break;
      case 'cleanse': score += e.all ? (hasAnyDebuff(actor) ? 16 : 0) : (hasAnyDebuff(actor) ? 8 : 0); break;
      case 'selfTrue': score -= (e.amount ?? 0) * (0.5 + hpFrac); break;
      default: break;
    }
  }
  score -= verse.cost * 1.2; // spend efficiency; Strike (0) gets a banking bonus via damage
  if (verse.isStrike) score += 1.0; // never a dead turn
  return Math.round(score * 100) / 100; // exact ties only, per Ban 6
}

function hasAnyDebuff(f) {
  return ['bleed', 'burn', 'curse', 'fray', 'hush', 'stun'].some((k) => !!f.statuses[k]);
}


module.exports = { chooseVerse };
