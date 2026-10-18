/**
 * index.js — engine barrel. Phase 1 (T1.1–T1.9) surface.
 * Pure functions only: no DOM, no clock, no globals, no Math.random.
 */
Object.assign(exports, require('../rng/index.js'));
Object.assign(exports, require('./fighter.js'));
Object.assign(exports, require('./status.js'));
Object.assign(exports, require('./damage.js'));
Object.assign(exports, require('./resolve.js'));
Object.assign(exports, require('./fatigue.js'));
Object.assign(exports, require('./ai.js'));
const _re0 = require('./fight.js'); exports.createSession = _re0.createSession; exports.legalVerses = _re0.legalVerses; exports.submitChoice = _re0.submitChoice; exports.step = _re0.step; exports.runToCompletion = _re0.runToCompletion; exports.runFight = _re0.runFight; exports.resultsOf = _re0.resultsOf; exports.ledgerVerdict = _re0.ledgerVerdict; exports.executeVerse = _re0.executeVerse;
const _re1 = require('./rites.js'); exports.evalRites = _re1.evalRites; exports.temperatureState = _re1.temperatureState; exports.temperatureDefenseMult = _re1.temperatureDefenseMult;
const _re2 = require('../data/config.js'); exports.CANON = _re2.CANON;
const _re3 = require('../tuning.js'); exports.createTuning = _re3.createTuning; exports.diffTuning = _re3.diffTuning; exports.TUNING_TAGS = _re3.TUNING_TAGS;
