#!/usr/bin/env node
// check-bans.js — T0.4 CI gate: enforce the determinism coding standard and the
// zero-network promise ([GDD] §15, §10.3; docs/ENGINE_RULES.md).
// 1) engine/, rng/, sim/ must not contain Math.random( or Date.now(
// 2) the whole repo (excluding docs/, node_modules, .git) must not contain
//    fetch(, XMLHttpRequest, WebSocket, import ... 'http' etc.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', '.github']);
const CODE_EXTS = new Set(['.js', '.mjs', '.cjs', '.html', '.css']);

const PURITY_DIRS = ['engine', 'rng', 'sim'];
const PURITY_BANS = [/Math\.random\s*\(/, /Date\.now\s*\(/, /new Date\s*\(\s*\)/, /toLocale/, /performance\.now\s*\(/];
const NETWORK_BANS = [/\bfetch\s*\(/, /XMLHttpRequest/, /WebSocket/, /EventSource/, /require\s*\(\s*['"]https?['"]\s*\)/, /from\s+['"]https?['"]/, /\[\s*['"](fetch|XMLHttpRequest|WebSocket|EventSource)['"]\s*\]/];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (CODE_EXTS.has(path.extname(e.name))) out.push(p);
  }
  return out;
}

let failures = 0;
const all = walk(ROOT);
// documented allowlist: this tool itself contains the ban patterns as regex source
const SELF_ALLOW = new Set([path.join(ROOT, 'tools', 'check-bans.js')]);
for (const dir of PURITY_DIRS) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) continue;
  for (const f of walk(full)) {
    const src = fs.readFileSync(f, 'utf8');
    PURITY_BANS.forEach((re, i) => {
      if (re.test(src)) { console.error(`PURITY BAN ${i + 1} violated in ${path.relative(ROOT, f)}`); failures++; }
    });
  }
}
for (const f of all) {
  if (SELF_ALLOW.has(f)) continue;
  const src = fs.readFileSync(f, 'utf8');
  NETWORK_BANS.forEach((re, i) => {
    if (re.test(src)) { console.error(`NETWORK BAN ${i + 1} violated in ${path.relative(ROOT, f)}`); failures++; }
  });
}
if (failures) { console.error(`check-bans: FAIL (${failures} violation(s))`); process.exit(1); }
console.log(`check-bans: OK (${all.length} files scanned)`);
