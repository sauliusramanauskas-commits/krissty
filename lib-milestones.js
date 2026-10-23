// Shared prize-milestone helpers: every 10 000 followers (10000, 20000, 30000, ...).
'use strict';
const STEP = 10000;
function isPrizeMilestone(m) { return Number.isInteger(m) && m >= STEP && m % STEP === 0; }
function prizeMilestonesUpTo(n) { const out = []; for (let k = 1; k * STEP <= n; k++) out.push(k * STEP); return out; }
function nextPrizeMilestone(c) { return (Math.floor(c / STEP) + 1) * STEP; }
module.exports = { STEP, isPrizeMilestone, prizeMilestonesUpTo, nextPrizeMilestone };
