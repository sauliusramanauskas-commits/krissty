// Shared prize-milestone helpers: every N000 and N666, N>=1.
'use strict';
function isPrizeMilestone(m) { return Number.isInteger(m) && m >= 1000 && (m % 1000 === 0 || m % 1000 === 666); }
function prizeMilestonesUpTo(n) { const out = []; for (let k = 1; k * 1000 <= n; k++) { out.push(k * 1000); if (k * 1000 + 666 <= n) out.push(k * 1000 + 666); } return out; }
function nextPrizeMilestone(c) { const k = Math.floor(c / 1000); for (const m of [k * 1000, k * 1000 + 666, (k + 1) * 1000]) if (m >= 1000 && m > c) return m; return (k + 1) * 1000; }
module.exports = { isPrizeMilestone, prizeMilestonesUpTo, nextPrizeMilestone };
