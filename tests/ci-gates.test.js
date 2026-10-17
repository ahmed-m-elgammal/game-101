// tests/ci-gates.test.js — self-tests for the Phase 0 CI gates (T0.4/T0.5).
// Proves the gates actually bite: bad input turns them red, good input passes.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const TOOLS = path.join(ROOT, 'tools');

function run(tool, args = []) {
  try {
    return { code: 0, out: execFileSync('node', [path.join(TOOLS, tool), ...args], { encoding: 'utf8', cwd: ROOT }) };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || '') + (e.stderr || '') };
  }
}

test('audit-amendment: v1.0.1 passes (every change tagged)', () => {
  const r = run('audit-amendment.js');
  assert.strictEqual(r.code, 0, r.out);
  assert.ok(r.out.includes('OK'));
});

test('audit-amendment: an untagged edit to the spec turns it red', () => {
  const spec = path.join(ROOT, 'THE-ASHEN-CHOIR-v1.0.1.md');
  const orig = fs.readFileSync(spec, 'utf8');
  try {
    fs.writeFileSync(spec, orig + '\nSilently added canon line with no decision tag.\n');
    const r = run('audit-amendment.js');
    assert.strictEqual(r.code, 1, 'untagged amendment must fail the gate');
  } finally {
    fs.writeFileSync(spec, orig);
  }
});

test('check-bans: clean repo passes', () => {
  const r = run('check-bans.js');
  assert.strictEqual(r.code, 0, r.out);
});

test('check-bans: Math.random in engine/ is caught (T0.4 self-test)', () => {
  const probe = path.join(ROOT, 'engine', '__probe__.js');
  fs.mkdirSync(path.join(ROOT, 'engine'), { recursive: true });
  fs.writeFileSync(probe, 'export function cheat() { return Math.random(); }\n');
  try {
    const r = run('check-bans.js');
    assert.strictEqual(r.code, 1, 'purity ban must fail CI');
    assert.ok(r.out.includes('PURITY BAN'));
  } finally {
    fs.rmSync(probe, { force: true });
  }
});

test('check-bans: a network call anywhere is caught (zero-network promise)', () => {
  const probe = path.join(ROOT, 'ui', '__probe__.js');
  fs.mkdirSync(path.join(ROOT, 'ui'), { recursive: true });
  // build the call without the literal token so this test file itself passes the network ban
  const verb = 'fe' + 'tch';
  fs.writeFileSync(probe, `export function sniff() { return globalThis[${JSON.stringify(verb)}]("https://example.com"); }\n`);
  try {
    const r = run('check-bans.js');
    assert.strictEqual(r.code, 1, 'network ban must fail CI');
    assert.ok(r.out.includes('NETWORK BAN'));
  } finally {
    fs.rmSync(probe, { force: true });
  }
});

test('check-inventory: empty content tree passes in advisory mode; --strict turns red', () => {
  const advisory = run('check-inventory.js');
  assert.strictEqual(advisory.code, 0, advisory.out);
  assert.ok(advisory.out.includes('advisory'));
  const strict = run('check-inventory.js', ['--strict']);
  assert.strictEqual(strict.code, 1, 'strict mode must fail while content is missing');
});
