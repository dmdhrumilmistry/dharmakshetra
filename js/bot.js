// A simple, steady computer player. Returns the next action for a bot, or null.

import { TILES, GROUPS, BUYABLE, groupTiles, JAIL_FINE } from './data.js';
import {
  phase, player, current, tilesOf, rentFor,
  canBuild, canSell, canMortgage, unmortgageCost,
} from './engine.js';

const RESERVE = 150;

function tileValue(s, id, i) {
  const t = TILES[i];
  let v = t.price || 0;
  if (t.type === 'realm') {
    const g = groupTiles(t.group);
    const mine = g.filter((k) => s.own[k] && s.own[k].owner === id).length;
    if (mine === g.length - 1) v *= 1.8; // would complete the set
    else if (mine > 0) v *= 1.25;
  }
  return v;
}

// Would giving tile i to `to` complete their colour set?
const completesFor = (s, to, i) => {
  const t = TILES[i];
  if (t.type !== 'realm') return false;
  return groupTiles(t.group).every((k) => k === i || (s.own[k] && s.own[k].owner === to));
};

function raiseFunds(s, p) {
  const mine = tilesOf(s, p.id);
  const sell = mine.find((i) => canSell(s, p.id, i));
  if (sell !== undefined) return { type: 'SELL', tile: sell };
  const pledge = mine
    .filter((i) => canMortgage(s, p.id, i))
    .sort((a, b) => TILES[a].price - TILES[b].price)[0];
  if (pledge !== undefined) return { type: 'MORTGAGE', tile: pledge };
  return null;
}

// Host-side memory so a bot proposes at most one trade per round.
const proposed = new Map();

const noBuildings = (s, group) => groupTiles(group).every((k) => !s.own[k] || !s.own[k].houses);

// Look for a set that is one realm short and try to buy or swap for it.
function proposeTrade(s, p) {
  if (s.trade || proposed.get(p.id) === s.round) return null;
  proposed.set(p.id, s.round);
  for (const g of Object.keys(GROUPS)) {
    const tiles = groupTiles(g);
    const missing = tiles.filter((k) => !(s.own[k] && s.own[k].owner === p.id));
    if (missing.length !== 1 || missing.length === tiles.length) continue;
    const want = missing[0];
    const o = s.own[want];
    if (!o || !noBuildings(s, g)) continue;
    const target = player(s, o.owner);
    if (!target || target.bankrupt) continue;

    // A swap that completes a set for both sides.
    for (const h of Object.keys(GROUPS)) {
      if (h === g || !noBuildings(s, h)) continue;
      const theirMissing = groupTiles(h).filter((k) => !(s.own[k] && s.own[k].owner === target.id));
      if (theirMissing.length === 1 && s.own[theirMissing[0]] && s.own[theirMissing[0]].owner === p.id) {
        return { type: 'PROPOSE_TRADE', to: target.id, give: { cash: 0, tiles: [theirMissing[0]] }, get: { cash: 0, tiles: [want] } };
      }
    }
    const offer = Math.ceil(TILES[want].price * 2.6);
    if (p.cash - offer >= 200) {
      return { type: 'PROPOSE_TRADE', to: target.id, give: { cash: offer, tiles: [] }, get: { cash: 0, tiles: [want] } };
    }
  }
  // Otherwise chip away at a scattered set we already have a foothold in.
  for (const g of Object.keys(GROUPS)) {
    const tiles = groupTiles(g);
    const mine = tiles.filter((k) => s.own[k] && s.own[k].owner === p.id);
    const others = tiles.filter((k) => s.own[k] && s.own[k].owner !== p.id);
    if (!mine.length || mine.length + others.length !== tiles.length || others.length < 2 || !noBuildings(s, g)) continue;
    const want = others[0];
    const offer = Math.ceil(TILES[want].price * 1.6);
    if (p.cash - offer >= 300) {
      return { type: 'PROPOSE_TRADE', to: s.own[want].owner, give: { cash: offer, tiles: [] }, get: { cash: 0, tiles: [want] } };
    }
  }
  return null;
}

function bestKrishnaTotal(s, p) {
  let best = null, bestScore = -Infinity;
  for (let n = 2; n <= 12; n++) {
    const i = (p.pos + n) % 40;
    const t = TILES[i];
    const o = s.own[i];
    let score = 0;
    if (BUYABLE.has(t.type)) {
      if (!o) score = p.cash >= t.price ? tileValue(s, p.id, i) : 0;
      else if (o.owner === p.id) score = 20;
      else score = -rentFor(s, i, 7);
    } else if (t.type === 'tax') score = -t.amount;
    else if (t.type === 'dice') score = -200;
    if (score > bestScore) { bestScore = score; best = n; }
  }
  return bestScore > 150 ? best : null;
}

export function botAction(s, id) {
  const p = player(s, id);
  if (!p || p.bankrupt || s.status !== 'playing') return null;
  const ph = phase(s);

  // Trades aimed at this bot.
  if (s.trade && s.trade.to === id) {
    const t = s.trade;
    const gainsSet = t.give.tiles.some((i) => completesFor(s, id, i));
    const gain = t.give.cash + t.give.tiles.reduce((a, i) => a + tileValue(s, id, i), 0) + t.give.cards * 50;
    const loss = t.get.cash + t.get.tiles.reduce((a, i) => a + tileValue(s, id, i) * (!gainsSet && completesFor(s, t.from, i) ? 2.2 : 1), 0) + t.get.cards * 50;
    if (gain >= loss * 1.15 && p.cash - t.get.cash >= 0) return { type: 'ACCEPT_TRADE' };
    // Too low? Ask for more gold once or twice before walking away.
    const from = player(s, t.from);
    const more = Math.ceil((loss * 1.2 - gain) / 10) * 10;
    if ((t.round || 1) < 3 && t.get.tiles.length && !t.get.cash && from && from.cash >= t.give.cash + more) {
      return { type: 'COUNTER_TRADE', give: t.get, get: { ...t.give, cash: t.give.cash + more } };
    }
    return { type: 'REJECT_TRADE' };
  }

  // Withdraw our own offer if nobody has answered it for a full round.
  if (s.trade && s.trade.from === id && (proposed.get(id) ?? s.round) < s.round - 1) return { type: 'CANCEL_TRADE' };

  // Debts first.
  const debt = s.debts.find((d) => d.debtor === id);
  if (debt) {
    if (p.cash >= debt.amount) return { type: 'PAY_DEBT' };
    return raiseFunds(s, p) || { type: 'BANKRUPT' };
  }
  if (s.debts.length) return null; // waiting on someone else

  if (ph === 'auction') {
    const a = s.auction;
    if (a.order[a.idx] !== id) return null;
    const limit = Math.min(p.cash - RESERVE / 2, tileValue(s, id, a.tile) * 1.05);
    const bid = a.high + (a.high < 100 ? 10 : 20);
    return bid <= limit ? { type: 'BID', amount: bid } : { type: 'PASS_BID' };
  }

  if (ph === 'buy') {
    if (s.buy.player !== id) return null;
    const t = TILES[s.buy.tile];
    const wants = p.cash >= t.price && (p.cash - t.price >= RESERVE || tileValue(s, id, s.buy.tile) > t.price * 1.5);
    return { type: wants ? 'BUY' : 'DECLINE' };
  }

  if (current(s).id !== id) return null;

  // Housekeeping on our own turn: redeem, then build.
  if (ph === 'pre' || ph === 'post') {
    const mine = tilesOf(s, id);
    const redeem = mine.find((i) => s.own[i].mort && p.cash - unmortgageCost(i) > 600);
    if (redeem !== undefined) return { type: 'UNMORTGAGE', tile: redeem };
    const build = mine
      .filter((i) => canBuild(s, id, i))
      .sort((a, b) => s.own[a].houses - s.own[b].houses)[0];
    if (build !== undefined) {
      const cost = GROUPS[TILES[build].group].house;
      if (p.flags.freeTemple || p.cash - cost > RESERVE + 100) return { type: 'BUILD', tile: build };
    }
  }

  if (ph === 'pre') {
    const trade = proposeTrade(s, p);
    if (trade) return trade;
    if (!p.abilityUsed) {
      if (p.char === 'balarama' && tilesOf(s, id).some((i) => canBuild(s, id, i))) return { type: 'USE_POWER' };
      if (p.char === 'draupadi' && p.cash < 300) return { type: 'USE_POWER' };
      if (p.char === 'bhishma' && p.jail) return { type: 'USE_POWER' };
      if (p.char === 'karna' && s.round > 4) return { type: 'USE_POWER' };
      if (p.char === 'arjuna' && s.round > 8) return { type: 'USE_POWER' };
      if (p.char === 'bhima' && !p.jail && s.round > 3 && Math.random() < 0.15) return { type: 'USE_POWER' };
      if (p.char === 'hanuman' && !p.jail && s.round > 2 && Math.random() < 0.15) return { type: 'USE_POWER' };
      if (p.char === 'krishna' && !p.jail) {
        const n = bestKrishnaTotal(s, p);
        if (n) return { type: 'USE_POWER', value: n };
      }
    }
    if (p.jail) {
      if (p.jailCards.length) return { type: 'USE_JAIL_CARD' };
      const unowned = TILES.filter((t, i) => BUYABLE.has(t.type) && !s.own[i]).length;
      if (unowned > 8 && p.cash >= JAIL_FINE + RESERVE) return { type: 'PAY_JAIL' };
    }
    return { type: 'ROLL' };
  }

  if (ph === 'post') return { type: 'END_TURN' };
  return null;
}
