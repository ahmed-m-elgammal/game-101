/**
 * ai-scripts.js — T5.7: enemy AI scripting. [GDD] §9.1–9.3, §9.5;
 * [00] F20/F21/F34; N4; A4. Enemies are "full builds, not stat blobs":
 * each one's signature behavior is DATA this layer executes, before the
 * doctrine layer takes over.
 *
 * Two layers, kept apart on purpose:
 *   1. SCRIPTS (here) — what the enemy CHOOSES: turn-keyed openers, repeat
 *      tails, conditional triggers (HP thresholds, turn windows).
 *   2. MECHANICS (fight.js specials/rites) — what the game DOES when a verb
 *      lands: Inheritance, Ledger's Ward theft, Mimic power, the
 *      Unsanctioned tax, temperature, phases, summons. Those live with the
 *      fight math because they change RULES, not choices.
 *
 * Data forms (data/enemies.js rows):
 *   `script` — the ENG-9 queue grammar (T3.6): plain ids cast once in
 *              order; a trailing '*' repeats whenever legal. Semantics are
 *              byte-identical to the original fight.js hook (shift per AI
 *              turn; illegal entries drop and the scorer takes over; a
 *              repeat tail sticks until illegal; the setup/fold postures
 *              gate the cast). A script can never make the AI cast an
 *              illegal verse — the §10.9 bans hold under scripting.
 *   `aiScript` — T5.7 structured triggers, evaluated before the queue:
 *              { when: 'atTurn', value: n, verse, why? }        — turn key
 *              { when: 'hpBelowPct', value: 50, verse, once? }   — own HP
 *              { when: 'targetHpBelowPct', value, verse, once? } — public HP
 *              { when: 'roundAtLeast', value, verse, once? }     — round key
 *              `once` guards by flag; an unaffordable/off-cooldown verse is
 *              skipped without burning the once (deterministic either way).
 *
 * HONESTY: triggers read own state and PUBLIC board fields (HP, round). No
 * hidden reads — the same firewall the doctrine layer lives under.
 */

/** One trigger's predicate over the fighter's own + public state. */
function triggerFired(trig, f, s) {
  switch (trig.when) {
    case 'atTurn':
      return (f.flags.aiTurn || 0) === trig.value;
    case 'hpBelowPct':
      return f.maxHp > 0 && (f.hp / f.maxHp) * 100 < trig.value;
    case 'targetHpBelowPct':
      return !!f.opponent && f.opponent.maxHp > 0
        && (f.opponent.hp / f.opponent.maxHp) * 100 < trig.value;
    case 'roundAtLeast':
      return s.round >= trig.value;
    default:
      return false;
  }
}

/**
 * Evaluate the scripted layer for one AI turn.
 * @returns {{ id: string, why?: string } | null} the verse to cast, or null
 *   when the doctrine layer takes over.
 */
function scriptedPick(session, f, s, ctx) {
  const { restrictToSetup = false, folded = false, legal } = ctx;

  // -- Phase III — the Baton (§9.3 #21, F21/D31) ---------------------------
  // "He casts it at you at 100% power, EVERY TIME IT IS OFF COOLDOWN" — the
  // learned copy outranks the enemy's own script and triggers. It can only
  // fire when the verse is actually legal (off cooldown, affordable, in the
  // legal pool — castEveryTurn-locked pools exclude it by construction),
  // and it can never cast an illegal verse. He copies verses; he does not
  // copy marks.
  const learned = f.riteState && f.riteState.learn && f.riteState.learn.verseId;
  if (learned && !restrictToSetup && !folded) {
    const pick = legal.find((v) => v.id === learned);
    if (pick) {
      session.logLine('script', f.side, `${f.sheet.name} swings the borrowed verse — ${pick.name}, at full weight.`);
      return { id: learned };
    }
  }

  // -- structured triggers (aiScript rows) ---------------------------------
  // A posture-gated turn (setup/fold) is NOT a scripted turn: the counter
  // does not advance and no trigger evaluates — the same deference the
  // setup/fold postures get from the doctrine layer below them.
  const rows = Array.isArray(f.sheet.aiScript) ? f.sheet.aiScript : [];
  if (rows.length && !restrictToSetup && !folded) {
    f.flags.aiTurn = (f.flags.aiTurn || 0) + 1;
    for (let i = 0; i < rows.length; i++) {
      const trig = rows[i];
      if (!trig || typeof trig !== 'object' || !trig.verse) continue;
      const key = `trigFired_${i}`;
      if (trig.once && f.flags[key]) continue;
      if (!triggerFired(trig, f, s)) continue;
      if (!legal.some((v) => v.id === trig.verse)) continue; // never illegal
      if (trig.once) f.flags[key] = true;
      if (trig.why) session.logLine('script', f.side, trig.why);
      return { id: trig.verse, why: trig.why || null };
    }
  }

  // -- the ENG-9 queue (T3.6 grammar, byte-identical semantics) ------------
  if (Array.isArray(f.sheet.script) && f.sheet.script.length) {
    const queued = f.sheet.script[0];
    const repeat = queued.endsWith('*');
    const id = repeat ? queued.slice(0, -1) : queued;
    const legalPick = legal.find((v) => v.id === id);
    if (legalPick && !(restrictToSetup || folded)) {
      if (!repeat) f.sheet.script.shift();
      return { id };
    }
    // Illegal entries drop and the scorer takes over — but only on REAL
    // scripted turns. A posture-gated (setup/fold) turn is not a scripted
    // turn (the same deference the triggers get above): the queue rides
    // over it untouched instead of draining silently without casting.
    // (Stress-re-test fix; no canon row combines queue + posture, so no
    // pinned fight changes.)
    if (!repeat && !(restrictToSetup || folded)) f.sheet.script.shift();
  }
  return null;
}

/**
 * Normalize a data row's script forms into one plan — the shape tools and
 * tests read: { lead: [{ atTurn, verse }], repeat: id | null }.
 * Accepts the queue grammar (and a structured aiScript list untouched).
 */
function compileScript(row) {
  const plan = { lead: [], repeat: null, triggers: [] };
  if (Array.isArray(row?.script)) {
    for (const entry of row.script) {
      const repeat = entry.endsWith('*');
      const verse = repeat ? entry.slice(0, -1) : entry;
      if (repeat) plan.repeat = verse;
      else plan.lead.push({ atTurn: plan.lead.length + 1, verse });
    }
  }
  if (Array.isArray(row?.aiScript)) {
    for (const t of row.aiScript) {
      if (t && typeof t === 'object' && t.verse) {
        plan.triggers.push({ when: t.when, value: t.value ?? null, verse: t.verse, once: !!t.once });
      }
    }
  }
  return plan;
}





module.exports = { triggerFired, scriptedPick, compileScript };
