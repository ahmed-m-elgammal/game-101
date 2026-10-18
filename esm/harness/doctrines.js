/**
 * doctrines.js (harness) — T5.5 acceptance: "doctrine behavior differences
 * measurable in harness (win-rate deltas by matchup)".
 *
 * compareDoctrines plays the SAME matchup (same builds, same seeds) four
 * times with side A's doctrine swapped across the §12.2 set, and reports
 * the win-rate rows + the spread. Pure: identical inputs → identical table
 * (the fights are seeded; the doctrine is the only moved part).
 *
 * This is the report the Balance Harness surfaces; it is NOT a tuning tool —
 * canon fixes the four behaviors, the harness only measures them.
 */

import { runFight } from '../engine/fight.js';
import { DOCTRINE_IDS } from '../data/doctrines.js';
import { CANON } from '../data/config.js';

/**
 * @param {object} buildA   a legal player build (its doctrine is overridden per row)
 * @param {object} buildB   the opponent build (played by the default AI)
 * @param {number[]} seeds  one fight per seed per doctrine
 * @returns {{ rows: {doctrine, wins, seeds, winRate}[], spread: number, best, worst }}
 */
export function compareDoctrines(buildA, buildB, seeds) {
  if (!Array.isArray(seeds) || seeds.length === 0) throw new Error('seeds required');
  const rows = DOCTRINE_IDS.map((doctrine) => {
    let wins = 0;
    for (const seed of seeds) {
      const r = runFight({ ...structuredClone(buildA), doctrine }, structuredClone(buildB), {
        seed, tuning: CANON,
      });
      if (r.winner === 'a') wins += 1;
    }
    return { doctrine, wins, seeds: seeds.length, winRate: wins / seeds.length };
  });
  const rates = rows.map((r) => r.winRate);
  const best = rows[rates.indexOf(Math.max(...rates))];
  const worst = rows[rates.indexOf(Math.min(...rates))];
  return { rows, spread: Math.max(...rates) - Math.min(...rates), best, worst };
}



