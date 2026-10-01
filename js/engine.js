// Pure game rules. The host runs apply(); every client only renders state.
// No DOM access here so the engine can be tested in Node.

import {
  TILES, GROUPS, LEELA, ASHIRVAD, CHARACTERS, BUYABLE, groupTiles,
  START_CASH, GO_SALARY, JAIL_FINE, JAIL_POS,
} from './data.js';

const DECKS = { leela: LEELA, ashirvad: ASHIRVAD };
const TIRTHAS = TILES.map((t, i) => (t.type === 'tirtha' ? i : -1)).filter((i) => i >= 0);
const UTILS = TILES.map((t, i) => (t.type === 'util' ? i : -1)).filter((i) => i >= 0);
const LOG_LIMIT = 80;

const shuffle = (arr, rng) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const clone = (o) => JSON.parse(JSON.stringify(o));

export function newGame(seats, rng = Math.random) {
  const players = seats.map((s) => ({
    id: s.id, name: s.name, char: s.char, isBot: !!s.isBot, clientId: s.clientId || null,
    cash: START_CASH, pos: 0, jail: false, jailTurns: 0, jailCards: [],
    bankrupt: false, abilityUsed: false, flags: {},
  }));
  const s = {
    v: 1, status: 'playing', players, own: {},
    cur: 0, turn: { rolled: false, doubles: 0 }, round: 1,
    dice: [1, 1], rollId: 0, moveId: 0, lastMove: null,
    buy: null, auction: null, debts: [], trade: null,
    decks: {
      leela: shuffle(LEELA.map((_, i) => i), rng),
      ashirvad: shuffle(ASHIRVAD.map((_, i) => i), rng),
    },
    event: null, eventId: 0, fx: [], fxSeq: 0, log: [], logId: 0, winner: null,
  };
  log(s, `The game of Dharmakshetra begins. ${players[0].name} rolls first.`);
  return s;
}

// ---------- queries ----------

export const player = (s, id) => s.players.find((p) => p.id === id);
export const current = (s) => s.players[s.cur];
export const alive = (s) => s.players.filter((p) => !p.bankrupt);

export function phase(s) {
  if (s.status !== 'playing') return 'over';
  if (s.auction) return 'auction';
  if (s.buy) return 'buy';
  if (s.debts.length) return 'debt';
  return s.turn.rolled ? 'post' : 'pre';
}

export const ownsGroup = (s, owner, group) =>
  groupTiles(group).every((i) => s.own[i] && s.own[i].owner === owner);

export const tilesOf = (s, owner) =>
  Object.keys(s.own).map(Number).filter((i) => s.own[i].owner === owner).sort((a, b) => a - b);

export function rentFor(s, i, diceTotal, mult = 1) {
  const t = TILES[i];
  const o = s.own[i];
  if (!o || o.mort) return 0;
  if (t.type === 'realm') {
    if (o.houses > 0) return t.rent[o.houses] * mult;
    return t.rent[0] * (ownsGroup(s, o.owner, t.group) ? 2 : 1) * mult;
  }
  if (t.type === 'tirtha') {
    const n = TIRTHAS.filter((k) => s.own[k] && s.own[k].owner === o.owner).length;
    return 25 * 2 ** (n - 1) * mult;
  }
  if (t.type === 'util') {
    const n = UTILS.filter((k) => s.own[k] && s.own[k].owner === o.owner).length;
    const factor = mult === 'util10' ? 10 : n === 2 ? 10 : 4;
    return factor * diceTotal;
  }
  return 0;
}

export function netWorth(s, id) {
  const p = player(s, id);
  let w = p.cash;
  for (const i of tilesOf(s, id)) {
    const t = TILES[i];
    const o = s.own[i];
    w += o.mort ? t.price / 2 : t.price;
    if (o.houses) w += o.houses * GROUPS[t.group].house;
  }
  return w;
}

export const unmortgageCost = (i) => Math.ceil((TILES[i].price / 2) * 1.1);

export function canBuild(s, id, i) {
  const t = TILES[i];
  const o = s.own[i];
  if (!o || o.owner !== id || t.type !== 'realm' || o.houses >= 5) return false;
  if (!ownsGroup(s, id, t.group)) return false;
  const g = groupTiles(t.group);
  if (g.some((k) => s.own[k].mort)) return false;
  return o.houses <= Math.min(...g.map((k) => s.own[k].houses));
}

export function canSell(s, id, i) {
  const t = TILES[i];
  const o = s.own[i];
  if (!o || o.owner !== id || !o.houses) return false;
  return o.houses >= Math.max(...groupTiles(t.group).map((k) => s.own[k].houses));
}

export function canMortgage(s, id, i) {
  const t = TILES[i];
  const o = s.own[i];
  if (!o || o.owner !== id || o.mort) return false;
  if (t.type === 'realm' && groupTiles(t.group).some((k) => s.own[k] && s.own[k].houses)) return false;
  return true;
}

// Tiles in a trade cannot have buildings anywhere in their colour group.
function tradable(s, id, i) {
  const o = s.own[i];
  if (!o || o.owner !== id) return false;
  const t = TILES[i];
  if (t.type === 'realm' && groupTiles(t.group).some((k) => s.own[k] && s.own[k].houses)) return false;
  return true;
}

// ---------- mutations ----------

function log(s, msg) {
  s.log.push({ id: ++s.logId, msg });
  if (s.log.length > LOG_LIMIT) s.log.splice(0, s.log.length - LOG_LIMIT);
}

function event(s, data) {
  s.event = { id: ++s.eventId, ...data };
  fx(s, data);
}

// Visual effects queue for clients; cleared at the start of every action.
function fx(s, data) {
  (s.fx ||= []).push(data);
}

function checkSet(s, owner, i) {
  const t = TILES[i];
  if (t.type === 'realm' && ownsGroup(s, owner, t.group)) fx(s, { kind: 'set', player: owner, group: t.group });
}

function pay(s, fromId, toId, amount, reason, { bank = false } = {}) {
  if (amount <= 0) return;
  const p = player(s, fromId);
  if (bank && p.flags.shield) {
    delete p.flags.shield;
    log(s, `${p.name}'s Kavacha turns away a payment of ${amount}.`);
    fx(s, { kind: 'shield', player: p.id });
    return;
  }
  if (p.cash >= amount) {
    p.cash -= amount;
    if (toId) player(s, toId).cash += amount;
    fx(s, { kind: reason.startsWith('rent') ? 'rent' : bank ? 'tax' : 'pay', player: fromId, to: toId, amount, reason });
    log(s, `${p.name} pays ${amount}${toId ? ` to ${player(s, toId).name}` : ''} for ${reason}.`);
  } else {
    s.debts.push({ debtor: fromId, creditor: toId, amount, reason });
    fx(s, { kind: 'debt', player: fromId, to: toId, amount, reason });
    log(s, `${p.name} owes ${amount} for ${reason} and must raise funds.`);
  }
}

function moveTo(s, p, target, { dice = 0, mult = 1, salary = true } = {}) {
  const from = p.pos;
  if (salary && target < from) {
    p.cash += GO_SALARY;
    fx(s, { kind: 'go', player: p.id });
    log(s, `${p.name} passes Hastinapura and collects ${GO_SALARY}.`);
  }
  p.pos = target;
  s.lastMove = { id: ++s.moveId, player: p.id, from, to: target, steps: (target - from + 40) % 40 };
  land(s, p, dice, mult);
}

function moveBy(s, p, n, dice) {
  if (n >= 0) return moveTo(s, p, (p.pos + n) % 40, { dice });
  const from = p.pos;
  p.pos = (p.pos + n + 40) % 40;
  s.lastMove = { id: ++s.moveId, player: p.id, from, to: p.pos, steps: n, back: true };
  land(s, p, dice);
}

function sendToJail(s, p) {
  if (p.flags.exileImmune) {
    delete p.flags.exileImmune;
    log(s, `${p.name} invokes Iccha Mrityu and refuses the sentence of exile.`);
    fx(s, { kind: 'shield', player: p.id });
    return;
  }
  const from = p.pos;
  p.pos = JAIL_POS;
  p.jail = true;
  p.jailTurns = 0;
  s.lastMove = { id: ++s.moveId, player: p.id, from, to: JAIL_POS, steps: 0, direct: true };
  if (s.players[s.cur].id === p.id) s.turn.doubles = 0;
  log(s, `${p.name} is sent into exile at Vanavas.`);
  fx(s, { kind: 'jail', player: p.id });
}

function land(s, p, dice, mult = 1) {
  const i = p.pos;
  const t = TILES[i];
  if (BUYABLE.has(t.type)) {
    const o = s.own[i];
    if (!o) {
      s.buy = { tile: i, player: p.id };
    } else if (o.owner !== p.id && !o.mort) {
      const rent = rentFor(s, i, dice, mult);
      if (p.flags.freeRent) {
        delete p.flags.freeRent;
        log(s, `${p.name} draws Gandiva and pays no rent at ${t.name}.`);
        fx(s, { kind: 'shield', player: p.id });
      } else {
        pay(s, p.id, o.owner, rent, `rent at ${t.name}`);
      }
    }
    return;
  }
  if (t.type === 'tax') return pay(s, p.id, null, t.amount, t.name, { bank: true });
  if (t.type === 'leela' || t.type === 'ashirvad') return drawCard(s, p, t.type, dice);
  if (t.type === 'dice') return sendToJail(s, p);
}

function drawCard(s, p, deck, dice) {
  const idx = s.decks[deck].shift();
  const c = DECKS[deck][idx];
  if (c.kind === 'jailCard') p.jailCards.push(deck);
  else s.decks[deck].push(idx);
  event(s, { kind: 'card', deck, text: c.text, player: p.id });
  log(s, `${p.name} draws ${deck === 'leela' ? 'Leela' : 'Ashirvad'}: ${c.text}`);

  switch (c.kind) {
    case 'move': return moveTo(s, p, c.to, { dice });
    case 'gain': p.cash += c.n; return;
    case 'pay': return pay(s, p.id, null, c.n, 'a card', { bank: true });
    case 'jail': return sendToJail(s, p);
    case 'back': return moveBy(s, p, -c.n, dice);
    case 'nearestTirtha': {
      const to = TIRTHAS.find((k) => k > p.pos) ?? TIRTHAS[0];
      return moveTo(s, p, to, { dice, mult: 2 });
    }
    case 'nearestUtil': {
      const to = UTILS.find((k) => k > p.pos) ?? UTILS[0];
      return moveTo(s, p, to, { dice, mult: 'util10' });
    }
    case 'payEach':
      for (const o of alive(s)) if (o.id !== p.id) pay(s, p.id, o.id, c.n, 'the feast');
      return;
    case 'collectEach':
      for (const o of alive(s)) if (o.id !== p.id) pay(s, o.id, p.id, c.n, 'Holi gifts');
      return;
    case 'repairs': {
      let h = 0, pal = 0;
      for (const k of tilesOf(s, p.id)) {
        const n = s.own[k].houses || 0;
        if (n === 5) pal++; else h += n;
      }
      return pay(s, p.id, null, h * c.h + pal * c.p, 'repairs', { bank: true });
    }
  }
}

function roll(s, p, rng, forced) {
  let d1, d2;
  if (forced) {
    d1 = Math.min(6, forced - 1);
    d2 = forced - d1;
  } else {
    d1 = 1 + Math.floor(rng() * 6);
    d2 = 1 + Math.floor(rng() * 6);
  }
  s.dice = [d1, d2];
  s.rollId++;
  const total = d1 + d2;
  const doubles = !forced && d1 === d2;
  log(s, `${p.name} rolls ${d1} and ${d2}${forced ? ' by divine will' : ''}.`);

  if (p.jail) {
    s.turn.rolled = true;
    if (doubles) {
      p.jail = false;
      log(s, `Doubles. ${p.name} walks free from Vanavas.`);
      fx(s, { kind: 'free', player: p.id });
      return moveBy(s, p, total, total);
    }
    p.jailTurns++;
    if (p.jailTurns >= 3) {
      p.jail = false;
      pay(s, p.id, null, JAIL_FINE, 'the exile fine');
      return moveBy(s, p, total, total);
    }
    return;
  }

  if (doubles) {
    s.turn.doubles++;
    if (s.turn.doubles < 3) fx(s, { kind: 'doubles', player: p.id });
    if (s.turn.doubles >= 3) {
      log(s, `Three doubles in a row. Shakuni cries foul.`);
      sendToJail(s, p);
      s.turn.rolled = true;
      return;
    }
  }
  let steps = total;
  if (p.flags.doubleMove) {
    delete p.flags.doubleMove;
    steps *= 2;
    log(s, `Vayu's speed carries ${p.name} ${steps} tiles.`);
  }
  moveBy(s, p, steps, total);
  s.turn.rolled = p.jail ? true : !doubles;
}

function startAuction(s, tile) {
  const order = [];
  for (let k = 0; k < s.players.length; k++) {
    const p = s.players[(s.cur + k) % s.players.length];
    if (!p.bankrupt) order.push(p.id);
  }
  s.auction = { tile, high: 0, bidder: null, order, idx: 0 };
  log(s, `${TILES[tile].name} goes to auction.`);
}

function settleAuction(s) {
  const a = s.auction;
  if (a.order.length === 1 && a.bidder === a.order[0]) {
    const p = player(s, a.bidder);
    p.cash -= a.high;
    s.own[a.tile] = { owner: p.id, houses: 0, mort: false };
    log(s, `${p.name} wins ${TILES[a.tile].name} at auction for ${a.high}.`);
    fx(s, { kind: 'auction', player: p.id, tile: a.tile, amount: a.high });
    checkSet(s, p.id, a.tile);
    s.auction = null;
  } else if (a.order.length === 0) {
    log(s, `No one bids. ${TILES[a.tile].name} stays with the crown.`);
    s.auction = null;
  }
}

function bankrupt(s, p, creditorId) {
  // Sell every building back to the bank at half price first.
  for (const i of tilesOf(s, p.id)) {
    const o = s.own[i];
    if (o.houses) {
      p.cash += (o.houses * GROUPS[TILES[i].group].house) / 2;
      o.houses = 0;
    }
  }
  const creditor = creditorId ? player(s, creditorId) : null;
  for (const i of tilesOf(s, p.id)) {
    if (creditor) s.own[i].owner = creditor.id;
    else delete s.own[i];
  }
  if (creditor) {
    creditor.cash += Math.max(0, p.cash);
    creditor.jailCards.push(...p.jailCards);
  } else {
    for (const d of p.jailCards) s.decks[d].push(DECKS[d].findIndex((c) => c.kind === 'jailCard'));
  }
  p.jailCards = [];
  p.cash = 0;
  p.bankrupt = true;
  p.jail = false;
  s.debts = s.debts.filter((d) => d.debtor !== p.id);
  for (const d of s.debts) if (d.creditor === p.id) d.creditor = null;
  if (s.trade && (s.trade.from === p.id || s.trade.to === p.id)) s.trade = null;
  if (s.buy && s.buy.player === p.id) {
    const tile = s.buy.tile;
    s.buy = null;
    startAuction(s, tile);
  }
  if (s.auction) {
    const a = s.auction;
    const k = a.order.indexOf(p.id);
    if (k >= 0) {
      a.order.splice(k, 1);
      if (a.bidder === p.id) { a.bidder = null; a.high = 0; }
      if (a.idx >= a.order.length) a.idx = 0;
      settleAuction(s);
    }
  }
  fx(s, { kind: 'fall', player: p.id });
  log(s, `${p.name} has fallen and leaves the field${creditor ? `. Their lands pass to ${creditor.name}` : ''}.`);

  const left = alive(s);
  if (left.length <= 1) return finish(s, left[0]?.id);
  if (current(s).id === p.id) nextTurn(s);
}

function finish(s, winnerId) {
  s.status = 'over';
  s.winner = winnerId || null;
  s.buy = null;
  s.auction = null;
  s.trade = null;
  s.debts = [];
  if (winnerId) {
    log(s, `${player(s, winnerId).name} stands victorious on the field of dharma.`);
    event(s, { kind: 'win', player: winnerId });
  }
}

function nextTurn(s) {
  let k = s.cur;
  for (let n = 0; n < s.players.length; n++) {
    k = (k + 1) % s.players.length;
    if (k === 0) s.round++;
    if (!s.players[k].bankrupt) break;
  }
  s.cur = k;
  s.turn = { rolled: false, doubles: 0 };
  fx(s, { kind: 'turn', player: current(s).id });
  log(s, `${current(s).name}'s turn.`);
}

function validateSide(s, id, side) {
  const p = player(s, id);
  if (!side || typeof side !== 'object') return 'Invalid trade.';
  const cash = Math.floor(Number(side.cash) || 0);
  if (cash < 0 || cash > p.cash) return `${p.name} cannot cover that much gold.`;
  const tiles = Array.isArray(side.tiles) ? side.tiles : [];
  for (const i of tiles) if (!tradable(s, id, i)) return `${TILES[i]?.name || 'A realm'} cannot be traded right now. Sell its temples first.`;
  const cards = Math.floor(Number(side.cards) || 0);
  if (cards < 0 || cards > p.jailCards.length) return 'Not enough pardon cards.';
  return null;
}

// ---------- the reducer ----------

export function apply(state, action, rng = Math.random) {
  if (!action || !action.type) return { error: 'Unknown action.' };
  if (state.status !== 'playing' && action.type !== 'END_GAME') return { error: 'The game is over.' };
  const s = clone(state);
  s.fx = [];
  s.fxSeq = (state.fxSeq || 0) + 1;

  // Host-only actions do not need a living seat.
  if (action.type === 'END_GAME' || action.type === 'REPLACE_WITH_BOT') {
    if (!action.host) return { error: 'Only the host can do that.' };
    if (action.type === 'END_GAME') {
      if (s.status !== 'playing') return { error: 'The game is already over.' };
      const best = alive(s).sort((x, y) => netWorth(s, y.id) - netWorth(s, x.id))[0];
      log(s, 'The host calls the end of the war. Wealth is counted.');
      finish(s, best.id);
    } else {
      const target = player(s, action.target);
      if (!target) return { error: 'Unknown player.' };
      target.isBot = true;
      target.clientId = null;
      log(s, `A sage now plays on behalf of ${target.name}.`);
    }
    return { state: s };
  }

  const p = player(s, action.by);
  if (!p) return { error: 'Unknown player.' };
  if (p.bankrupt) return { error: 'You have left the field.' };
  const isCur = current(s).id === p.id;
  const ph = phase(s);
  const err = (m) => ({ error: m });

  switch (action.type) {
    case 'ROLL': {
      if (!isCur || ph !== 'pre') return err('You cannot roll now.');
      roll(s, p, rng);
      break;
    }
    case 'PAY_JAIL': {
      if (!isCur || ph !== 'pre' || !p.jail) return err('You are not in exile.');
      if (p.cash < JAIL_FINE) return err('Not enough gold for the fine.');
      p.cash -= JAIL_FINE;
      p.jail = false;
      log(s, `${p.name} pays ${JAIL_FINE} and returns from Vanavas.`);
      break;
    }
    case 'USE_JAIL_CARD': {
      if (!isCur || ph !== 'pre' || !p.jail || !p.jailCards.length) return err('No pardon to use.');
      const d = p.jailCards.shift();
      s.decks[d].push(DECKS[d].findIndex((c) => c.kind === 'jailCard'));
      p.jail = false;
      log(s, `${p.name} shows a pardon and leaves Vanavas.`);
      break;
    }
    case 'USE_POWER': {
      if (!isCur || ph !== 'pre') return err('Divine powers are used before you roll.');
      if (p.abilityUsed) return err('Your power has already been used.');
      const c = CHARACTERS[p.char];
      switch (p.char) {
        case 'krishna': {
          const n = Math.floor(Number(action.value));
          if (p.jail) return err('Sudarshana cannot be used in exile.');
          if (!(n >= 2 && n <= 12)) return err('Choose a total from 2 to 12.');
          p.abilityUsed = true;
          log(s, `${p.name} raises Sudarshana and chooses ${n}.`);
          roll(s, p, rng, n);
          break;
        }
        case 'balarama': p.flags.freeTemple = true; break;
        case 'arjuna': p.flags.freeRent = true; break;
        case 'bhima': if (p.jail) return err('Not while in exile.'); p.flags.doubleMove = true; break;
        case 'draupadi': p.cash += 200; break;
        case 'karna': p.flags.shield = true; break;
        case 'bhishma':
          if (p.jail) { p.jail = false; log(s, `${p.name} walks out of Vanavas by his own will.`); }
          else p.flags.exileImmune = true;
          break;
        case 'hanuman': {
          if (p.jail) return err('Not while in exile.');
          p.abilityUsed = true;
          log(s, `${p.name} takes a great leap.`);
          const to = TIRTHAS.find((k) => k > p.pos) ?? TIRTHAS[0];
          moveTo(s, p, to, { dice: s.dice[0] + s.dice[1] });
          break;
        }
        default: return err('Unknown power.');
      }
      if (!p.abilityUsed) {
        p.abilityUsed = true;
        log(s, `${p.name} invokes ${c.power}.`);
      }
      event(s, { kind: 'power', player: p.id });
      break;
    }
    case 'BUY': {
      if (!s.buy || s.buy.player !== p.id) return err('Nothing to buy.');
      const t = TILES[s.buy.tile];
      if (p.cash < t.price) return err('Not enough gold.');
      p.cash -= t.price;
      s.own[s.buy.tile] = { owner: p.id, houses: 0, mort: false };
      log(s, `${p.name} claims ${t.name} for ${t.price}.`);
      event(s, { kind: 'buy', player: p.id, tile: s.buy.tile });
      checkSet(s, p.id, s.buy.tile);
      s.buy = null;
      break;
    }
    case 'DECLINE': {
      if (!s.buy || s.buy.player !== p.id) return err('Nothing to decline.');
      const tile = s.buy.tile;
      s.buy = null;
      startAuction(s, tile);
      break;
    }
    case 'BID': {
      const a = s.auction;
      if (!a || a.order[a.idx] !== p.id) return err('It is not your bid.');
      const amt = Math.floor(Number(action.amount));
      if (!(amt > a.high)) return err(`Bid more than ${a.high}.`);
      if (amt > p.cash) return err('You cannot bid more gold than you hold.');
      a.high = amt;
      a.bidder = p.id;
      a.idx = (a.idx + 1) % a.order.length;
      log(s, `${p.name} bids ${amt}.`);
      settleAuction(s);
      break;
    }
    case 'PASS_BID': {
      const a = s.auction;
      if (!a || a.order[a.idx] !== p.id) return err('It is not your bid.');
      a.order.splice(a.idx, 1);
      if (a.idx >= a.order.length) a.idx = 0;
      log(s, `${p.name} withdraws from the auction.`);
      settleAuction(s);
      break;
    }
    case 'BUILD': {
      const i = action.tile;
      if (s.auction) return err('Wait for the auction to finish.');
      if (!canBuild(s, p.id, i)) return err('You cannot build there. Hold the whole group, unpledged, and build evenly.');
      const cost = GROUPS[TILES[i].group].house;
      const free = !!p.flags.freeTemple;
      if (!free && p.cash < cost) return err('Not enough gold.');
      if (free) delete p.flags.freeTemple; else p.cash -= cost;
      s.own[i].houses++;
      fx(s, { kind: 'build', player: p.id, tile: i, palace: s.own[i].houses === 5 });
      log(s, `${p.name} raises a ${s.own[i].houses === 5 ? 'palace' : 'temple'} in ${TILES[i].name}${free ? ' with Balarama\'s plough' : ''}.`);
      break;
    }
    case 'SELL': {
      const i = action.tile;
      if (!canSell(s, p.id, i)) return err('Sell buildings evenly across the group.');
      const back = GROUPS[TILES[i].group].house / 2;
      s.own[i].houses--;
      p.cash += back;
      log(s, `${p.name} sells a building in ${TILES[i].name} for ${back}.`);
      break;
    }
    case 'MORTGAGE': {
      const i = action.tile;
      if (!canMortgage(s, p.id, i)) return err('Sell the group\'s temples before pledging.');
      s.own[i].mort = true;
      p.cash += TILES[i].price / 2;
      log(s, `${p.name} pledges ${TILES[i].name} for ${TILES[i].price / 2}.`);
      break;
    }
    case 'UNMORTGAGE': {
      const i = action.tile;
      const o = s.own[i];
      if (!o || o.owner !== p.id || !o.mort) return err('That realm is not pledged.');
      const cost = unmortgageCost(i);
      if (p.cash < cost) return err(`Redeeming costs ${cost}.`);
      p.cash -= cost;
      o.mort = false;
      log(s, `${p.name} redeems ${TILES[i].name} for ${cost}.`);
      break;
    }
    case 'PAY_DEBT': {
      const k = s.debts.findIndex((d) => d.debtor === p.id);
      if (k < 0) return err('You owe nothing.');
      const d = s.debts[k];
      if (p.cash < d.amount) return err(`You need ${d.amount - p.cash} more gold.`);
      p.cash -= d.amount;
      if (d.creditor) player(s, d.creditor).cash += d.amount;
      s.debts.splice(k, 1);
      log(s, `${p.name} settles ${d.amount}${d.creditor ? ` with ${player(s, d.creditor).name}` : ''}.`);
      break;
    }
    case 'BANKRUPT': {
      const d = s.debts.find((x) => x.debtor === p.id);
      if (!d) return err('You can only yield when you cannot pay a debt.');
      bankrupt(s, p, d.creditor);
      break;
    }
    case 'END_TURN': {
      if (!isCur || ph !== 'post') return err('You cannot end your turn yet.');
      nextTurn(s);
      break;
    }
    case 'PROPOSE_TRADE': {
      if (s.trade) return err('Another trade is already on the table.');
      const to = player(s, action.to);
      if (!to || to.bankrupt || to.id === p.id) return err('Choose another player.');
      const e = validateSide(s, p.id, action.give) || validateSide(s, to.id, action.get);
      if (e) return err(e);
      const norm = (x) => ({ cash: Math.floor(Number(x.cash) || 0), tiles: (x.tiles || []).slice(), cards: Math.floor(Number(x.cards) || 0) });
      const give = norm(action.give), get = norm(action.get);
      if (!give.cash && !give.tiles.length && !give.cards && !get.cash && !get.tiles.length && !get.cards) return err('The offer is empty.');
      s.trade = { id: s.logId + 1, from: p.id, to: to.id, give, get };
      log(s, `${p.name} offers a trade to ${to.name}.`);
      break;
    }
    case 'ACCEPT_TRADE': {
      const t = s.trade;
      if (!t || t.to !== p.id) return err('No trade awaits you.');
      const e = validateSide(s, t.from, t.give) || validateSide(s, t.to, t.get);
      if (e) { s.trade = null; log(s, `The trade falls through. ${e}`); break; }
      const a = player(s, t.from), b = player(s, t.to);
      a.cash += t.get.cash - t.give.cash;
      b.cash += t.give.cash - t.get.cash;
      for (const i of t.give.tiles) s.own[i].owner = b.id;
      for (const i of t.get.tiles) s.own[i].owner = a.id;
      b.jailCards.push(...a.jailCards.splice(0, t.give.cards));
      a.jailCards.push(...b.jailCards.splice(0, t.get.cards));
      log(s, `${b.name} accepts the trade with ${a.name}.`);
      event(s, { kind: 'trade', player: b.id, from: a.id, to: b.id });
      for (const i of t.give.tiles) checkSet(s, b.id, i);
      for (const i of t.get.tiles) checkSet(s, a.id, i);
      s.trade = null;
      break;
    }
    case 'REJECT_TRADE': {
      if (!s.trade || s.trade.to !== p.id) return err('No trade awaits you.');
      log(s, `${p.name} declines the trade.`);
      s.trade = null;
      break;
    }
    case 'CANCEL_TRADE': {
      if (!s.trade || s.trade.from !== p.id) return err('You have no open offer.');
      log(s, `${p.name} withdraws the trade offer.`);
      s.trade = null;
      break;
    }
    default:
      return err('Unknown action.');
  }

  // A bankrupt current player is skipped automatically.
  if (s.status === 'playing' && current(s).bankrupt) nextTurn(s);
  return { state: s };
}
