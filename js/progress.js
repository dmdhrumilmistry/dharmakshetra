// Player progress on this device: experience, levels, ranks and badges.
// Purely cosmetic. It never changes the rules of a game.

import { TILES, GROUPS, CHARACTER_IDS } from './data.js';

const KEY = 'dk-progress';
const blank = () => ({ xp: 0, games: 0, wins: 0, badges: {}, chars: [], days: [], best: 0 });

let data = blank();
try { data = { ...blank(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* storage disabled */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage disabled */ } };

export const stats = () => data;

// ---------- levels ----------

const RANKS = [[1, 'Shishya'], [3, 'Yoddha'], [6, 'Rathi'], [10, 'Maharathi'], [15, 'Atimaharathi'], [21, 'Chakravartin']];
const stepFor = (lvl) => 100 + 50 * (lvl - 1);

export function levelOf(xp = data.xp) {
  let lvl = 1;
  let left = xp;
  while (left >= stepFor(lvl)) { left -= stepFor(lvl); lvl++; }
  const rank = RANKS.filter(([at]) => lvl >= at).pop()[1];
  const need = stepFor(lvl);
  return { level: lvl, rank, into: left, need, pct: Math.round((left / need) * 100) };
}

// ---------- badges ----------

export const BADGES = [
  { id: 'first-claim', name: 'First Banner', text: 'Claim your first realm.', icon: 'flag' },
  { id: 'full-set', name: 'Kingdom United', text: 'Hold every realm of one colour.', icon: 'crown' },
  { id: 'temple', name: 'Temple Builder', text: 'Raise a temple.', icon: 'temple' },
  { id: 'palace', name: 'Palace of Indra', text: 'Raise a palace.', icon: 'palace' },
  { id: 'rent-king', name: 'Rent of Kings', text: 'Collect 500 or more rent at once.', icon: 'coins' },
  { id: 'escape', name: 'Great Escape', text: 'Roll doubles to walk out of Vanavas.', icon: 'dice' },
  { id: 'power', name: 'Divine Touch', text: 'Use your divine power.', icon: 'spark' },
  { id: 'trade', name: 'Silver Tongue', text: 'Complete a trade.', icon: 'swap' },
  { id: 'pilgrim', name: 'Pilgrim', text: 'Hold all four Tirthas.', icon: 'wave' },
  { id: 'tycoon', name: 'Chakravartin', text: 'Hold three full colour sets at once.', icon: 'chakra' },
  { id: 'victor', name: 'Dharma Victor', text: 'Win a game.', icon: 'trophy' },
  { id: 'maharathi', name: 'Maharathi', text: 'Win five games.', icon: 'star' },
  { id: 'comeback', name: 'Rise Again', text: 'Win after falling below 100 gold.', icon: 'sun' },
  { id: 'avatar', name: 'Many Forms', text: 'Play a game as every character.', icon: 'mask' },
  { id: 'devotee', name: 'Devotee', text: 'Play on three days in a row.', icon: 'diya' },
];
const BADGE = Object.fromEntries(BADGES.map((b) => [b.id, b]));

function unlock(id, out) {
  if (data.badges[id]) return;
  data.badges[id] = Date.now();
  out.badges.push(BADGE[id]);
  out.xp += 50;
  data.xp += 50;
}

// ---------- tracking a game ----------

// A run holds what happened to the tracked seat in the current game.
export function newRun(seatId) {
  return { seat: seatId, xp: 0, items: {}, badges: [], minCash: Infinity, done: false };
}

const add = (run, out, reason, n) => {
  if (n <= 0) return;
  out.xp += n;
  data.xp += n;
  run.xp += n;
  run.items[reason] = (run.items[reason] || 0) + n;
};

const fullSets = (s, id) => Object.keys(GROUPS).filter((g) => TILES.every((t, i) => t.group !== g || (s.own[i] && s.own[i].owner === id))).length;

// Read one batch of game effects. Returns { xp, badges, levelUp } for display.
export function track(run, s, list) {
  const out = { xp: 0, badges: [], levelUp: null };
  if (!run || !run.seat) return out;
  const before = levelOf().level;
  const me = run.seat;
  const p = s.players.find((x) => x.id === me);
  if (p && !p.bankrupt) run.minCash = Math.min(run.minCash, p.cash);
  for (const f of list || []) {
    switch (f.kind) {
      case 'buy': case 'auction':
        if (f.player === me) { add(run, out, 'Realms claimed', 10); unlock('first-claim', out); }
        break;
      case 'set':
        if (f.player === me) {
          add(run, out, 'Full sets', 40);
          unlock('full-set', out);
          if (fullSets(s, me) >= 3) unlock('tycoon', out);
        }
        break;
      case 'build':
        if (f.player === me) {
          add(run, out, 'Temples and palaces', f.palace ? 40 : 15);
          unlock(f.palace ? 'palace' : 'temple', out);
        }
        break;
      case 'rent':
        if (f.to === me) {
          add(run, out, 'Rent collected', Math.min(30, Math.max(2, Math.round(f.amount / 25))));
          if (f.amount >= 500) unlock('rent-king', out);
        }
        break;
      case 'go': if (f.player === me) add(run, out, 'Laps of Hastinapura', 5); break;
      case 'doubles': if (f.player === me) add(run, out, 'Doubles', 3); break;
      case 'free': if (f.player === me) { add(run, out, 'Escapes', 10); unlock('escape', out); } break;
      case 'power': if (f.player === me) { add(run, out, 'Divine powers', 10); unlock('power', out); } break;
      case 'trade':
        if (f.from === me || f.to === me) { add(run, out, 'Trades', 15); unlock('trade', out); }
        break;
    }
  }
  if (TILES.every((t, i) => t.type !== 'tirtha' || (s.own[i] && s.own[i].owner === me))) unlock('pilgrim', out);
  if (out.badges.length) run.badges.push(...out.badges);
  const after = levelOf().level;
  if (after > before) out.levelUp = levelOf();
  save();
  return out;
}

const today = () => new Date().toISOString().slice(0, 10);
const dayBefore = (d) => new Date(Date.parse(d) - 86400000).toISOString().slice(0, 10);

// Close a finished game for the tracked seat, once.
export function finish(run, s) {
  const out = { xp: 0, badges: [], levelUp: null };
  if (!run || run.done || !run.seat) return out;
  const p = s.players.find((x) => x.id === run.seat);
  if (!p) return out;
  run.done = true;
  const before = levelOf().level;
  const won = s.winner === run.seat;
  data.games++;
  add(run, out, 'Game played', 40);
  const d = today();
  if (!data.days.includes(d)) {
    add(run, out, 'First game today', 25);
    data.days = [...data.days, d].slice(-30);
  }
  if (!data.chars.includes(p.char)) data.chars = [...data.chars, p.char];
  if (won) {
    data.wins++;
    add(run, out, 'Victory', 150);
    unlock('victor', out);
    if (data.wins >= 5) unlock('maharathi', out);
    if (run.minCash < 100) unlock('comeback', out);
  }
  if (CHARACTER_IDS.every((c) => data.chars.includes(c))) unlock('avatar', out);
  if (data.days.includes(dayBefore(d)) && data.days.includes(dayBefore(dayBefore(d)))) unlock('devotee', out);
  data.best = Math.max(data.best, run.xp);
  if (out.badges.length) run.badges.push(...out.badges);
  const after = levelOf().level;
  if (after > before) out.levelUp = levelOf();
  save();
  return out;
}
