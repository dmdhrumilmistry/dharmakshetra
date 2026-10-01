// Plays many all-bot games to check the rules never stall or corrupt state.
// Run with: node tests/sim.test.js

import { newGame, apply, phase, tilesOf } from '../js/engine.js';
import { botAction } from '../js/bot.js';
import { CHARACTER_IDS, TILES } from '../js/data.js';

let seed = 12345;
const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

function check(s, where) {
  for (const p of s.players) {
    if (p.cash < 0) throw new Error(`${where}: negative cash for ${p.name}`);
  }
  for (const [i, o] of Object.entries(s.own)) {
    const owner = s.players.find((p) => p.id === o.owner);
    if (!owner || owner.bankrupt) throw new Error(`${where}: tile ${TILES[i].name} owned by missing/bankrupt player`);
    if (o.houses < 0 || o.houses > 5) throw new Error(`${where}: bad house count`);
    if (o.mort && o.houses) throw new Error(`${where}: pledged tile with buildings`);
  }
}

function play(n, gameNo) {
  const seats = CHARACTER_IDS.slice(0, n).map((c, k) => ({ id: `p${k + 1}`, name: c, char: c, isBot: true }));
  let s = newGame(seats, rng);
  let steps = 0, rejected = 0;
  while (s.status === 'playing' && steps < 20000) {
    // Occasionally float a random trade.
    if (!s.trade && rng() < 0.01) {
      const a = s.players.filter((p) => !p.bankrupt);
      const from = a[Math.floor(rng() * a.length)], to = a[Math.floor(rng() * a.length)];
      if (from.id !== to.id) {
        const r = apply(s, { type: 'PROPOSE_TRADE', by: from.id, to: to.id,
          give: { cash: Math.floor(from.cash / 4), tiles: tilesOf(s, from.id).slice(0, 1) },
          get: { cash: 0, tiles: tilesOf(s, to.id).slice(0, 1) } }, rng);
        if (r.state) s = r.state;
      }
    }
    let acted = false;
    for (const p of s.players) {
      const a = botAction(s, p.id);
      if (!a) continue;
      const r = apply(s, { ...a, by: p.id }, rng);
      if (r.error) {
        rejected++;
        if (rejected > 50) throw new Error(`game ${gameNo}: bot keeps sending bad actions: ${a.type} ${r.error} phase=${phase(s)}`);
        continue;
      }
      s = r.state;
      check(s, `game ${gameNo} step ${steps}`);
      acted = true;
      break;
    }
    if (!acted) {
      if (s.trade) { s = apply(s, { type: 'CANCEL_TRADE', by: s.trade.from }, rng).state; continue; }
      throw new Error(`game ${gameNo}: stalled in phase ${phase(s)} cur=${s.cur} debts=${JSON.stringify(s.debts)}`);
    }
    steps++;
  }
  if (s.status === 'playing') s = apply(s, { type: 'END_GAME', host: true }, rng).state;
  return { steps, round: s.round, winner: s.winner };
}

let total = 0;
for (let g = 0; g < 300; g++) {
  const r = play(2 + (g % 5), g);
  total += r.round;
}
console.log(`ok: 300 games, average ${Math.round(total / 300)} rounds`);
