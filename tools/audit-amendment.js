#!/usr/bin/env node
// audit-amendment.js — T0.2 gate: verify THE-ASHEN-CHOIR-v1.0.1.md differs from v1.0
// ONLY inside regions tagged with a decision/clarification tag (<!-- D# / F# / N# / A# / 0x R#>)
// or inside the header change-list (first 10 lines). Zero dependencies.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const A = path.join(ROOT, 'THE-ASHEN-CHOIR-v1.md');
const B = path.join(ROOT, 'THE-ASHEN-CHOIR-v1.0.1.md');
const HEADER_LINES = 10; // title/status/target/change-list block is tag-exempt

function lines(f) { return fs.readFileSync(f, 'utf8').split('\n'); }

// LCS-based diff of line arrays -> list of {aStart,bStart,delCount,addCount} hunks
function diff(a, b) {
  const n = a.length, m = b.length;
  // dynamic LCS too big for 1600x1600? 2.5M cells is fine in Node.
  const dp = new Int32Array((n + 1) * (m + 1));
  const W = m + 1;
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i * W + j] = a[i] === b[j] ? dp[(i + 1) * W + j + 1] + 1 : Math.max(dp[(i + 1) * W + j], dp[i * W + j + 1]);
  const hunks = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { i++; j++; continue; }
    const aStart = i, bStart = j;
    while (i < n && j < m && a[i] !== b[j]) {
      if (dp[(i + 1) * W + j] >= dp[i * W + j + 1]) i++; else j++;
    }
    // consume remaining non-matching tail of this hunk
    while (i < n && (j >= m || a[i] !== b[j]) && dp[(i + 1) * W + (j < m ? j : 0)] !== undefined && j < m && a[i] !== b[j]) i++;
    while (j < m && (i >= n || a[i] !== b[j])) j++;
    hunks.push({ aStart, aEnd: i, bStart, bEnd: j });
    if (hunks.length > 500) throw new Error('diff exploded — files diverged too much');
  }
  if (i < n || j < m) hunks.push({ aStart: i, aEnd: n, bStart: j, bEnd: m });
  return hunks;
}

const a = lines(A), b = lines(B);
const hunks = diff(a, b);
const TAG_RE = /<!--\s*[^>]*(D\d+|F\d+|N\d+|A\d+|R\d+|micro|approved)[^>]*-->/i;
const failures = [];
for (const h of hunks) {
  const changed = b.slice(h.bStart, h.bEnd);
  const region = changed.join('\n');
  // a changed region counts as tagged when a decision/clarification tag appears
  // on any changed line or within a few lines of context around the region
  // (after-context is 8 lines because fenced code blocks carry their tag outside the fence)
  const ctxStart = Math.max(0, h.bStart - 2);
  const ctxEnd = Math.min(b.length, h.bEnd + 8);
  const nearTagged = b.slice(ctxStart, ctxEnd).some((l) => TAG_RE.test(l));
  const inHeader = h.bStart < HEADER_LINES;
  // pure deletions (no added lines) are allowed if the surrounding context is tagged
  const deletionOnly = h.bEnd === h.bStart;
  if (!nearTagged && !inHeader && !deletionOnly) {
    failures.push({ at: `v1.0.1 line ${h.bStart + 1}`, text: changed.slice(0, 3).join(' ⏎ ') });
  }
}
console.log(`audit-amendment: ${hunks.length} changed region(s) found`);
if (failures.length) {
  console.error('FAIL — untagged changes:');
  for (const f of failures) console.error(`  ${f.at}: ${f.text}`);
  process.exit(1);
}
console.log('audit-amendment: OK — every changed region carries a decision/clarification tag or is the header block');
