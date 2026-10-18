/**
 * doctrines.js — T5.1: the four Echo doctrines as data. [GDD] §12.2.
 * The behavior LINES are canon verbatim; the fight-behavior layering over
 * the T5.4 shared rules is T5.5 (this module only pins identity + the
 * validation surface "doctrine exists").
 *
 * `reservedFor` carries the canon reservation ("Reserved for the Rites users
 * and one named Echo") — enforced by engine/build.js as a reason-coded
 * rejection unless the build declares the reservation satisfied
 * (build.rite set, or build.allowReservedDoctrine for the named-Echo path
 * that T5.5/T7.2 will name). Nothing is silently blocked.
 */

const DOCTRINES = [
  {
    id: 'hymnal', name: 'Hymnal',
    behavior: 'Plays the slotted verses strictly in the order the player set.',
  },
  {
    id: 'predator', name: 'Predator',
    behavior: 'Uses the highest-damage verse it can afford each turn. Defends only below 30% HP.',
  },
  {
    id: 'bulwark', name: 'Bulwark',
    behavior: 'Uses defensive verses first when below 70% HP or when no Ward or Brace is active. Otherwise follows Hymnal.',
  },
  {
    id: 'cantors_hand', name: "Cantor's Hand",
    behavior: "Blends Hymnal with the Verse most likely to be punished by the opponent's active statuses.",
    reserved: true,
    reservedNote: 'Reserved for the Rites users and one named Echo.',
  },
];

const DOCTRINE_BY_ID = new Map(DOCTRINES.map((d) => [d.id, d]));

function getDoctrine(id) {
  const d = DOCTRINE_BY_ID.get(id);
  if (!d) throw new Error('Unknown doctrine: ' + id);
  return d;
}

/** Ids only — the validation surface build.js checks against. */
const DOCTRINE_IDS = DOCTRINES.map((d) => d.id);


module.exports = { getDoctrine, DOCTRINES, DOCTRINE_BY_ID, DOCTRINE_IDS };
