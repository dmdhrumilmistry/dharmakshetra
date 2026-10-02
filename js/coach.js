// A gentle guide for new players: one short tip at a time, shown the first
// time each situation comes up on this device.

import { TILES, GROUPS, JAIL_FINE } from './data.js';
import { phase, current, tilesOf, canBuild } from './engine.js';
import { pref } from './prefs.js';

const KEY = 'dk-tips';
let seen = {};
try { seen = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { /* storage disabled */ }

export function markSeen(id) {
  seen[id] = 1;
  try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch { /* storage disabled */ }
}
export function resetTips() {
  seen = {};
  try { localStorage.removeItem(KEY); } catch { /* storage disabled */ }
}

// The tip that fits this moment for the player at this device, if any.
export function tipFor(s, controls) {
  if (!pref('tips') || !s || s.status !== 'playing') return null;
  const ph = phase(s);
  const cur = current(s);
  const pick = (id, title, text) => (seen[id] ? null : { id, title, text, char: who.char });
  let who = cur;

  if (ph === 'debt') {
    const d = s.debts.find((x) => controls(x.debtor));
    if (d) {
      who = s.players.find((p) => p.id === d.debtor);
      return pick('debt', 'Short of gold', 'Open your realms to sell temples or pledge land to the bank. Pledged land can be redeemed later.');
    }
    return null;
  }
  if (ph === 'auction') {
    const bidder = s.auction.order[s.auction.idx];
    if (!controls(bidder)) return null;
    who = s.players.find((p) => p.id === bidder);
    return pick('auction', 'Auction time', 'Everyone can bid on land nobody claimed. Raise the bid or withdraw. The highest bid wins.');
  }
  if (ph === 'buy') {
    if (!controls(s.buy.player)) return null;
    who = s.players.find((p) => p.id === s.buy.player);
    return pick('buy', 'Unclaimed land', 'Claim it and every rival who lands here pays you rent. Pass, and it goes to auction.');
  }
  if (!controls(cur.id)) return null;
  if (ph === 'pre') {
    if (cur.jail) return pick('jail', 'Exiled to Vanavas', `Roll doubles to walk free, or pay ${JAIL_FINE} to leave now. You still collect rent while in exile.`);
    if (!seen.roll) return pick('roll', 'Your turn', 'Tap Roll the dice to move. On a keyboard, press R.');
    if (!cur.abilityUsed && s.round >= 2) return pick('power', 'Divine power', 'Your character has one power, usable once a game before you roll. Save it for the right moment.');
    return null;
  }
  const buildable = tilesOf(s, cur.id).some((i) => canBuild(s, cur.id, i) && cur.cash >= GROUPS[TILES[i].group].house);
  if (buildable) return pick('build', 'You hold a full set', 'Tap Build to raise temples. Each temple makes rent much higher. Four temples become a palace.');
  if (s.round >= 4 && tilesOf(s, cur.id).length >= 2) return pick('trade', 'Make a deal', 'One realm short of a full set? Use Trade to offer gold or land to a rival.');
  return pick('end', 'Before you end', 'Tap any tile on the board to read its story. When you are done, tap End turn (or press E).');
}
