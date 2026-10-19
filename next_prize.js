#!/usr/bin/env node
// Usage: node next_prize.js <count>   (or with no count: reads the live status.json)
// Prints {current, nextMilestone, reachedUndrawn:[...]} using draws.json next to this script (or --site-dir <dir>).
'use strict';
const fs = require('fs'), path = require('path');
const { prizeMilestonesUpTo, nextPrizeMilestone } = require('./lib-milestones');
(async () => {
  const a = process.argv.slice(2); let siteDir = __dirname, count;
  for (let i = 0; i < a.length; i++) { if (a[i] === '--site-dir') siteDir = a[++i]; else if (a[i] === '--count') count = a[++i]; else count = a[i]; }
  let c = count === undefined ? null : Number(count);
  if (c === null) { const r = await fetch('https://sauliusramanauskas-commits.github.io/lifeis-short-follower-watch/status.json?t=' + Date.now()); c = Number((await r.json()).current); }
  if (!Number.isInteger(c) || c < 0) { console.log(JSON.stringify({ ok: false, error: 'invalid count' })); process.exit(1); }
  const f = path.join(siteDir, 'draws.json');
  const drawn = new Set(fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).draws.map(d => d.milestone) : []);
  console.log(JSON.stringify({ current: c, nextMilestone: nextPrizeMilestone(c), reachedUndrawn: prizeMilestonesUpTo(c).filter(m => !drawn.has(m)) }));
})().catch(e => { console.log(JSON.stringify({ ok: false, error: e.message })); process.exit(1); });
