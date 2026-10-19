#!/usr/bin/env node
// Krissty milestone giveaway draw.
// Usage:
//   node draw.js --milestone 1000 --followers /workspace/fb-follower-watch/celebration/followers.jsonl [--publish] [--redraw]
//   node draw.js --confirm 1000 [--publish]
// Options: --site-dir <dir> (where draws.json + draws/ live; default: this script's dir)
//          --any-milestone (allow non-prize milestone numbers, for testing only)
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const { isPrizeMilestone } = require('./lib-milestones');
const OWNER_ID = '100013159621667';

function parseArgs(a) {
  const o = { flags: new Set() };
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (!k.startsWith('--')) throw new Error('Unexpected argument: ' + k);
    const name = k.slice(2);
    if (['publish', 'redraw', 'any-milestone'].includes(name)) o.flags.add(name);
    else { if (a[i + 1] === undefined) throw new Error('Missing value for ' + k); o[name] = a[++i]; }
  }
  return o;
}
function berlinIso(d = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(d).map(p => [p.type, p.value]));
  const local = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  const off = Math.round((local - Math.floor(d.getTime() / 1000) * 1000) / 60000);
  const sign = off >= 0 ? '+' : '-', ab = Math.abs(off);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${sign}${String(Math.floor(ab / 60)).padStart(2, '0')}:${String(ab % 60).padStart(2, '0')}`;
}
function normUrl(u) {
  try {
    const x = new URL(String(u).trim()); x.hash = '';
    const id = x.searchParams.get('id');
    x.hostname = 'www.facebook.com';
    if (x.pathname.replace(/\/$/, '') === '/profile.php' && id) return `https://www.facebook.com/profile.php?id=${id}`;
    return `https://www.facebook.com${x.pathname.replace(/\/+$/, '')}`;
  } catch { return null; }
}
function loadDraws(file) {
  if (!fs.existsSync(file)) return { draws: [] };
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(j.draws)) throw new Error(file + ' has no draws array');
  return j;
}
function saveDraws(file, j) {
  j.updatedAt = berlinIso();
  j.draws.sort((a, b) => a.milestone - b.milestone);
  const tmp = file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(j, null, 2) + '\n'); fs.renameSync(tmp, file);
}
function git(dir, ...args) { return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
function publish(dir, msg) {
  git(dir, 'add', 'draws.json', 'draws');
  if (!git(dir, 'status', '--porcelain', '--', 'draws.json', 'draws')) return { pushed: false, reason: 'nothing to commit' };
  git(dir, 'commit', '-m', msg, '--', 'draws.json', 'draws');
  git(dir, 'pull', '--rebase', '--autostash');
  git(dir, 'push');
  return { pushed: true, commit: git(dir, 'rev-parse', '--short', 'HEAD') };
}

function main() {
  const o = parseArgs(process.argv.slice(2));
  const siteDir = path.resolve(o['site-dir'] || __dirname);
  const drawsFile = path.join(siteDir, 'draws.json');
  const db = loadDraws(drawsFile);

  if (o.confirm !== undefined) {
    const m = Number(o.confirm);
    const d = db.draws.find(x => x.milestone === m);
    if (!d) throw new Error(`No draw for milestone ${m}`);
    if (d.status === 'confirmed') return out({ ok: true, action: 'confirm', milestone: m, alreadyConfirmed: true, winner: d.winner });
    d.status = 'confirmed'; d.confirmedAt = berlinIso();
    saveDraws(drawsFile, db);
    const pub = o.flags.has('publish') ? publish(siteDir, `Confirm giveaway winner for ${m} followers`) : null;
    return out({ ok: true, action: 'confirm', milestone: m, status: d.status, confirmedAt: d.confirmedAt, winner: d.winner, publish: pub });
  }

  const m = Number(o.milestone);
  if (!Number.isInteger(m) || m <= 0) throw new Error('--milestone <number> is required');
  if (!isPrizeMilestone(m) && !o.flags.has('any-milestone')) throw new Error(`${m} is not a prize milestone (N000 or N666, N>=1)`);
  if (!o.followers) throw new Error('--followers <followers.jsonl> is required');
  const existing = db.draws.find(x => x.milestone === m);
  if (existing && !o.flags.has('redraw')) throw new Error(`Milestone ${m} already drawn (${existing.drawnAt}, status ${existing.status}). Use --redraw to replace it.`);

  const folDir = path.dirname(path.resolve(o.followers));
  const lines = fs.readFileSync(o.followers, 'utf8').split('\n').filter(l => l.trim());
  const prevWinners = new Set(db.draws.filter(x => x.milestone !== m && x.winner).map(x => normUrl(x.winner.url)));
  const byUrl = new Map(); let invalid = 0, owner = 0, prev = 0;
  for (const l of lines) {
    let f; try { f = JSON.parse(l); } catch { invalid++; continue; }
    const u = normUrl(f.url); if (!u) { invalid++; continue; }
    if (u.includes(OWNER_ID) || /^lifeis short$/i.test(String(f.name || '').trim())) { owner++; continue; }
    if (prevWinners.has(u)) { prev++; continue; }
    if (!byUrl.has(u)) byUrl.set(u, { ...f, url: u });
  }
  const entrants = [...byUrl.values()].sort((a, b) => a.url < b.url ? -1 : a.url > b.url ? 1 : 0);
  if (!entrants.length) throw new Error('No eligible entrants');
  const urls = entrants.map(e => e.url);
  const entrantsSha256 = crypto.createHash('sha256').update(urls.join('\n')).digest('hex');
  const randomIndex = crypto.randomInt(entrants.length);
  const w = entrants[randomIndex];

  // copy avatar into the site repo as draws/<milestone>.jpg (only if it is a real jpeg)
  let image = null;
  if (w.file) {
    const src = path.resolve(folDir, w.file);
    if (fs.existsSync(src)) {
      const buf = fs.readFileSync(src);
      if (buf[0] === 0xff && buf[1] === 0xd8) { fs.mkdirSync(path.join(siteDir, 'draws'), { recursive: true }); fs.writeFileSync(path.join(siteDir, 'draws', `${m}.jpg`), buf); image = `draws/${m}.jpg`; }
    }
  }
  if (!image) { const stale = path.join(siteDir, 'draws', `${m}.jpg`); if (fs.existsSync(stale)) fs.unlinkSync(stale); }

  const rec = {
    milestone: m, status: 'pending-confirmation', drawnAt: berlinIso(),
    entrantCount: entrants.length, entrantsSha256, hashMethod: 'sha256 of normalized entrant profile URLs, sorted ascending, joined with \\n',
    randomIndex, rng: 'node crypto.randomInt(entrantCount), index into the sorted list',
    winner: { name: w.name || null, url: w.url, image },
    excluded: { owner, previousWinners: prev, invalidLines: invalid, duplicates: lines.length - invalid - owner - prev - entrants.length },
    source: path.basename(o.followers), sourceLines: lines.length
  };
  if (existing) rec.redrawOf = { drawnAt: existing.drawnAt, entrantsSha256: existing.entrantsSha256, randomIndex: existing.randomIndex };
  db.draws = db.draws.filter(x => x.milestone !== m); db.draws.push(rec);
  saveDraws(drawsFile, db);
  const pub = o.flags.has('publish') ? publish(siteDir, `Giveaway draw for ${m} followers (pending confirmation)`) : null;
  out({ ok: true, action: existing ? 'redraw' : 'draw', drawsFile, ...rec, publish: pub });
}
function out(j) { process.stdout.write(JSON.stringify(j, null, 2) + '\n'); }
try { main(); } catch (e) { out({ ok: false, error: e.message }); process.exit(1); }
