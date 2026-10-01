// DOM rendering. Everything here reads state and writes HTML; no rules live here.

import { TILES, GROUPS, CHARACTERS, CHARACTER_IDS, BUYABLE, groupTiles, JAIL_FINE } from './data.js';
import {
  phase, player, current, tilesOf, rentFor, netWorth, ownsGroup,
  canBuild, canSell, canMortgage, unmortgageCost,
} from './engine.js';
import { medallion, tileIcon, icon, coin, chakra, centreArt, uiIcon } from './art.js';
import { portrait } from './characters.js';
import { PLACES } from './places.js';
import { sketch } from './sketch.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const gold = (n) => `${coin}${Number(n).toLocaleString('en-IN')}`;

export function charMed(id, size = 40, extra = {}) {
  const c = CHARACTERS[id];
  return medallion(c.emblem, c.color, { size, title: c.name, ...extra });
}

// A character's head in a coloured ring.
export function face(charId, { mood = 'idle', cls = '' } = {}) {
  return `<span class="face ${cls}" style="--c:${CHARACTERS[charId].color}">${portrait(charId, mood, { headOnly: true })}</span>`;
}

const tileColor = (t) => (t.type === 'realm' ? GROUPS[t.group].color : t.type === 'tirtha' ? '#5FA8CC' : '#D9AE2B');

// ---------- board geometry ----------

function gridPos(i) {
  if (i <= 10) return { row: 11, col: 11 - i, side: 'bottom' };
  if (i < 20) return { row: 11 - (i - 10), col: 1, side: 'left' };
  if (i <= 30) return { row: 1, col: i - 19, side: 'top' };
  return { row: i - 29, col: 11, side: 'right' };
}

// Tile centre as a percentage of the board, matching the CSS grid tracks.
const UNITS = 1.55 * 2 + 9;
const track = (n) => {
  const start = n === 1 ? 0 : 1.55 + (n - 2);
  const size = n === 1 || n === 11 ? 1.55 : 1;
  return ((start + size / 2) / UNITS) * 100;
};
export function tileCentre(i) {
  const { row, col } = gridPos(i);
  return { x: track(col), y: track(row) };
}

const CORNER_SUB = { go: 'Collect 200', exile: 'Just visiting', rest: 'Rest awhile', dice: 'Go to Vanavas' };

function tileHTML(t, i) {
  const { row, col, side } = gridPos(i);
  const style = `grid-row:${row};grid-column:${col}`;
  const label = `${t.name}${t.price ? `, ${t.price} gold` : ''}`;
  if (i % 10 === 0) {
    return `<button class="tile corner ${t.type} s-${side}" data-i="${i}" style="${style}" aria-label="${esc(label)}">
      ${tileIcon(t)}<span class="nm">${esc(t.name)}</span><span class="sub">${CORNER_SUB[t.type]}</span></button>`;
  }
  const band = t.type === 'realm' ? `<div class="band" style="background:${GROUPS[t.group].color}"></div>` : '';
  const price = t.price ? `<span class="pr">${t.price}</span>` : t.amount ? `<span class="pr">Pay ${t.amount}</span>` : '';
  return `<button class="tile ${t.type} s-${side}" data-i="${i}" style="${style}" aria-label="${esc(label)}">
    ${band}<div class="body"><span class="nm">${esc(t.name)}</span>${t.type !== 'realm' ? tileIcon(t) : ''}${price}</div></button>`;
}

export function buildBoard(el) {
  el.innerHTML = TILES.map(tileHTML).join('') + `
    <div class="centre">
      ${centreArt()}
      <h2 class="logo">Dharmakshetra</h2>
      <div class="round" id="round"></div>
      <div class="dice-zone">${chakra()}<div class="dice" id="dice"></div></div>
      <div class="centre-ui" id="centre-ui"></div>
    </div>
    <div class="tok-layer" id="tok-layer"></div>`;
}

const TEMPLE = '<svg class="bld temple" viewBox="0 0 10 12" aria-hidden="true"><path d="M5 0 L8.5 5 V12 H1.5 V5 Z" fill="currentColor" stroke="#7A5418" stroke-width=".7"/></svg>';
const PALACE = '<svg class="bld palace" viewBox="0 0 16 14" aria-hidden="true"><path d="M8 .5 C 12 2.5, 14 5, 14 7 H 2 C 2 5, 4 2.5, 8 .5 Z M 1 7 H 15 V 13.5 H 1 Z" fill="#B8323F" stroke="#FFF3D6" stroke-width=".8"/></svg>';

export function updateTiles(el, s) {
  for (let i = 0; i < 40; i++) {
    const t = TILES[i];
    if (!BUYABLE.has(t.type)) continue;
    const tile = el.querySelector(`.tile[data-i="${i}"]`);
    const o = s.own[i];
    tile.classList.toggle('mortgaged', !!(o && o.mort));
    let mark = tile.querySelector('.owner-mark');
    if (o) {
      const color = CHARACTERS[player(s, o.owner).char].color;
      if (!mark) {
        mark = document.createElement('i');
        mark.className = 'owner-mark stamp';
        tile.append(mark);
      } else if (mark.dataset.owner !== o.owner) {
        mark.classList.remove('stamp');
        void mark.offsetWidth;
        mark.classList.add('stamp');
      }
      mark.dataset.owner = o.owner;
      mark.style.background = color;
      mark.title = player(s, o.owner).name;
    } else if (mark) mark.remove();
    const band = tile.querySelector('.band');
    if (band) {
      const n = o ? o.houses : 0;
      if (Number(band.dataset.n || 0) !== n) {
        band.innerHTML = n ? (n === 5 ? PALACE : TEMPLE.repeat(n)) : '';
        if (n > Number(band.dataset.n || 0)) band.classList.add('grow');
        setTimeout(() => band.classList.remove('grow'), 700);
        band.dataset.n = n;
      }
    }
  }
}

// Tokens live in one absolutely positioned layer and glide between tiles.
const OFFSETS = [[0, 0], [-1, -1], [1, 1], [1, -1], [-1, 1], [0, -1.4]];
export function renderTokens(layer, s, displayPos, hopping, mine) {
  const groups = {};
  for (const p of s.players) if (!p.bankrupt) (groups[displayPos[p.id]] ||= []).push(p.id);
  const curId = s.status === 'playing' ? current(s).id : null;
  for (const p of s.players) {
    let el = layer.querySelector(`.token[data-id="${p.id}"]`);
    if (p.bankrupt) { if (el) el.remove(); continue; }
    if (!el) {
      el = document.createElement('div');
      el.className = 'token';
      el.dataset.id = p.id;
      el.style.setProperty('--c', CHARACTERS[p.char].color);
      el.innerHTML = `<div class="tk-in">${portrait(p.char, 'idle', { headOnly: true })}</div>`;
      layer.append(el);
    }
    const pos = displayPos[p.id];
    const { x, y } = tileCentre(pos);
    const list = groups[pos] || [];
    const k = list.indexOf(p.id);
    const [ox, oy] = list.length > 1 ? OFFSETS[k % OFFSETS.length] : [0, 0];
    el.style.left = `calc(${x}% + ${ox * 1.3}cqw)`;
    el.style.top = `calc(${y}% + ${oy * 1.3}cqw)`;
    el.classList.toggle('cur', p.id === curId);
    el.classList.toggle('mine', mine(p.id));
    el.classList.toggle('jailed', p.jail && pos === 10);
    if (hopping.has(p.id)) {
      el.classList.remove('hop');
      void el.offsetWidth;
      el.classList.add('hop');
    }
  }
}

const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
export function renderDice(el, dice) {
  el.innerHTML = dice
    .map((d) => `<div class="die${d === 1 ? ' red' : ''}" aria-label="Die showing ${d}">${Array.from({ length: 9 }, (_, k) => `<i class="${PIPS[d].includes(k) ? 'on' : ''}"></i>`).join('')}</div>`)
    .join('');
}

// ---------- turn controls (board centre on large screens, dock on phones) ----------

function powerUsable(p) {
  if (p.abilityUsed) return false;
  if (p.jail && ['krishna', 'bhima', 'hanuman'].includes(p.char)) return false;
  return true;
}

function turnView(s, ctx) {
  const ph = phase(s);
  const cur = current(s);
  const mine = (id) => ctx.controls(id);
  let who = cur;
  let title = `${esc(cur.name)}'s turn`;
  let prompt = '';
  let acts = '';
  let mood = 'idle';

  if (ph === 'over') {
    const w = s.winner && player(s, s.winner);
    who = w || cur;
    mood = 'happy';
    title = w ? `${esc(w.name)} is victorious` : 'The war is over';
    prompt = 'The field falls quiet.';
    acts = `<button class="btn primary" data-act="results">See the standings</button>`;
  } else if (ph === 'auction') {
    const a = s.auction;
    const t = TILES[a.tile];
    const bidder = player(s, a.order[a.idx]);
    who = bidder;
    const high = a.bidder ? `<b>${a.high}</b> from ${esc(player(s, a.bidder).name)}` : 'no bids yet';
    title = `Auction: ${esc(t.name)}`;
    prompt = `Highest bid: ${high}. ${esc(bidder.name)} to bid.`;
    if (mine(bidder.id)) {
      const steps = [10, 50, 100].map((n) => a.high + n).filter((n) => n <= bidder.cash);
      acts = steps.map((n, k) => `<button class="btn${k === 0 ? ' primary' : ''}" data-act="bid" data-amount="${n}" data-by="${bidder.id}">Bid ${n}</button>`).join('')
        + `<button class="btn" data-act="bid-custom" data-by="${bidder.id}">Other</button>`
        + `<button class="btn danger" data-act="pass-bid" data-by="${bidder.id}">Withdraw</button>`;
      prompt = `${ctx.multiLocal ? `<b>${esc(bidder.name)}</b>, your bid. ` : 'Your bid. '}Highest: ${high}. You hold ${bidder.cash}.`;
    }
  } else if (ph === 'buy') {
    const t = TILES[s.buy.tile];
    const p = player(s, s.buy.player);
    who = p;
    title = `${esc(p.name)} reaches ${esc(t.name)}`;
    if (mine(p.id)) {
      prompt = `Unclaimed. Claim it for <b>${t.price}</b>, or send it to auction. You hold ${p.cash}.`;
      acts = `<button class="btn primary" data-act="buy" data-by="${p.id}" ${p.cash < t.price ? 'disabled' : ''}>Claim for ${t.price}</button>
        <button class="btn" data-act="decline" data-by="${p.id}">Auction it</button>
        <button class="btn" data-act="deed" data-tile="${s.buy.tile}">Read about it</button>`;
    } else prompt = `${esc(p.name)} is deciding whether to claim it.`;
  } else if (ph === 'debt') {
    const d = s.debts.find((x) => mine(x.debtor)) || s.debts[0];
    const p = player(s, d.debtor);
    who = p;
    mood = 'shock';
    const to = d.creditor ? esc(player(s, d.creditor).name) : 'the bank';
    title = `${esc(p.name)} owes ${d.amount}`;
    if (mine(p.id)) {
      const short = d.amount - p.cash;
      prompt = short > 0
        ? `You owe <b>${d.amount}</b> to ${to} for ${esc(d.reason)}. Raise <b>${short}</b> more by selling temples or pledging realms.`
        : `You can now pay <b>${d.amount}</b> to ${to}.`;
      acts = `<button class="btn primary" data-act="pay-debt" data-by="${p.id}" ${short > 0 ? 'disabled' : ''}>Pay ${d.amount}</button>
        ${short > 0 ? `<button class="btn" data-act="open-realms">Manage realms</button>` : ''}
        <button class="btn danger" data-act="bankrupt" data-by="${p.id}">Yield</button>`;
    } else prompt = `Waiting for ${esc(p.name)} to pay ${to}.`;
  } else if (mine(cur.id)) {
    const c = CHARACTERS[cur.char];
    if (ph === 'pre') {
      if (ctx.krishnaPick) {
        prompt = 'Sudarshana: choose the total you will move.';
        acts = `<div class="krishna-pick">${Array.from({ length: 11 }, (_, k) => `<button class="btn" data-act="krishna" data-value="${k + 2}" data-by="${cur.id}">${k + 2}</button>`).join('')}</div>
          <button class="btn" data-act="krishna-cancel">Cancel</button>`;
      } else {
        prompt = cur.jail
          ? `In exile (try ${cur.jailTurns + 1} of 3). Roll doubles, pay ${JAIL_FINE}, or use a pardon.`
          : ctx.multiLocal ? `<b>${esc(cur.name)}</b>, roll when ready.` : 'Your turn. Roll when ready.';
        acts = `<button class="btn primary roll-btn" data-act="roll" data-by="${cur.id}">${cur.jail ? 'Roll for doubles' : 'Roll the dice'}</button>`;
        if (cur.jail) {
          acts += `<button class="btn" data-act="pay-jail" data-by="${cur.id}" ${cur.cash < JAIL_FINE ? 'disabled' : ''}>Pay ${JAIL_FINE}</button>`;
          if (cur.jailCards.length) acts += `<button class="btn" data-act="jail-card" data-by="${cur.id}">Use pardon</button>`;
        }
        if (powerUsable(cur)) acts += `<button class="btn power" data-act="power" data-by="${cur.id}" title="${esc(c.powerText)}">${charMed(cur.char, 20)}${esc(c.power)}</button>`;
      }
    } else {
      prompt = cur.flags && Object.keys(cur.flags).length ? 'Your divine power waits for its moment.' : 'Build, trade, or end your turn.';
      acts = `<button class="btn primary" data-act="end" data-by="${cur.id}">End turn</button>`;
    }
  } else {
    prompt = cur.isBot ? `${esc(cur.name)} is thinking...` : ctx.presence[cur.id] === false ? `${esc(cur.name)} has lost connection.` : `Waiting for ${esc(cur.name)}...`;
  }
  return { who, title, prompt, acts, mood };
}

export function renderCentre(el, s, ctx) {
  const v = turnView(s, ctx);
  el.innerHTML = `<div class="turn-line">${face(v.who.char, { mood: v.mood, cls: 'bob' })}<span>${v.title}</span></div>
    <p class="prompt">${v.prompt}</p><div class="acts">${v.acts}</div>`;
}

export function renderDock(el, s, ctx) {
  const v = turnView(s, ctx);
  el.innerHTML = `<div class="dock-head">${face(v.who.char, { mood: v.mood, cls: 'bob' })}<div><b>${v.title}</b><p>${v.prompt}</p></div></div>
    ${v.acts ? `<div class="acts">${v.acts}</div>` : ''}`;
}

// ---------- players ----------

function tags(s, p, ctx) {
  const t = [];
  if (p.isBot) t.push('<span class="tag">computer</span>');
  if (p.jail) t.push('<span class="tag">in exile</span>');
  if (!p.isBot && ctx.presence[p.id] === false && !p.bankrupt) t.push('<span class="tag off">offline</span>');
  if (p.jailCards.length) t.push(`<span class="tag">${p.jailCards.length} pardon</span>`);
  if (ctx.voice && ctx.voice.has(p.id)) t.push(`<span class="tag voice${ctx.voice.get(p.id) ? ' muted' : ''}" title="In voice chat">${uiIcon(ctx.voice.get(p.id) ? 'micOff' : 'mic')}</span>`);
  return t.join('');
}

export function renderPlayers(el, s, ctx) {
  el.innerHTML = s.players.map((p, k) => {
    const c = CHARACTERS[p.char];
    const sets = tilesOf(s, p.id).map((i) => `<i style="background:${tileColor(TILES[i])}${s.own[i].mort ? ';opacity:.35' : ''}" title="${esc(TILES[i].name)}"></i>`).join('');
    const power = p.abilityUsed ? `${esc(c.power)} used` : `${esc(c.power)} ready`;
    const replace = ctx.isHost && !p.isBot && !p.bankrupt && ctx.presence[p.id] === false
      ? `<div class="pl-actions"><button class="btn small" data-act="replace-bot" data-target="${p.id}">Let the computer play</button></div>` : '';
    return `<li class="pl${k === s.cur && s.status === 'playing' ? ' now' : ''}${p.bankrupt ? ' out' : ''}" data-seat="${p.id}">
      <button class="pl-face" data-act="player" data-target="${p.id}" aria-label="About ${esc(p.name)}">${face(p.char, { mood: p.bankrupt ? 'sad' : 'idle' })}</button>
      <div><div class="pl-name">${esc(p.name)}${tags(s, p, ctx)}</div>
        <div class="pl-meta">${esc(c.name)}, ${p.bankrupt ? 'left the field' : power}</div>
        <div class="pl-sets">${sets}</div></div>
      <div class="pl-cash" data-cash="${p.cash}">${p.bankrupt ? '' : gold(p.cash)}</div>${replace}</li>`;
  }).join('');
}

// Phone: a horizontal strip of player chips.
export function renderStrip(el, s, ctx) {
  el.innerHTML = s.players.map((p, k) => `
    <button class="chip${k === s.cur && s.status === 'playing' ? ' now' : ''}${p.bankrupt ? ' out' : ''}${ctx.controls(p.id) ? ' me' : ''}" data-act="player" data-target="${p.id}" data-seat="${p.id}">
      ${face(p.char, { mood: p.bankrupt ? 'sad' : 'idle' })}
      <span class="chip-txt"><b>${esc(p.name)}</b><span class="pl-cash" data-cash="${p.cash}">${p.bankrupt ? 'fallen' : gold(p.cash)}</span></span>
      ${ctx.voice && ctx.voice.has(p.id) ? `<span class="chip-mic${ctx.voice.get(p.id) ? ' muted' : ''}">${uiIcon(ctx.voice.get(p.id) ? 'micOff' : 'mic')}</span>` : ''}
      ${p.jail ? '<span class="chip-flag">exile</span>' : ''}
    </button>`).join('');
}

export function playerHTML(s, id, ctx) {
  const p = player(s, id);
  const c = CHARACTERS[p.char];
  const mine = tilesOf(s, id);
  return `<div class="sheet"><div class="sheet-head char-head" style="--c:${c.color}">
      <div class="char-hero">${portrait(p.char, p.bankrupt ? 'sad' : 'happy')}</div>
      <div><div class="grp">${esc(c.name)}, ${esc(c.title.toLowerCase())}</div><h2>${esc(p.name)}</h2>
      <p class="hero-cash">${p.bankrupt ? 'Has left the field' : `${gold(p.cash)} gold, worth ${netWorth(s, id).toLocaleString('en-IN')} in all`}</p></div></div>
    <div class="pad">
      <p><b>${esc(c.power)}${p.abilityUsed ? ' (used)' : ''}:</b> ${esc(c.powerText)}</p>
      ${mine.length ? `<div class="realms">${mine.map((i) => realmRow(s, i, id)).join('')}</div>` : '<p class="muted">No realms yet.</p>'}
    </div>
    <div class="sheet-actions">${ctx.isHost && !p.isBot && !p.bankrupt && ctx.presence[p.id] === false ? `<button class="btn ink" data-act="replace-bot" data-target="${p.id}">Let the computer play</button>` : ''}<button class="btn ink primary" data-act="close">Close</button></div></div>`;
}

function realmRow(s, i, ownerId) {
  const t = TILES[i];
  const o = s.own[i];
  const st = o.mort ? 'pledged' : t.type === 'realm' ? (o.houses === 5 ? 'palace' : o.houses ? `${o.houses} temple${o.houses > 1 ? 's' : ''}` : ownsGroup(s, ownerId, t.group) ? 'full set' : '') : '';
  return `<button class="realm-row${o.mort ? ' mort' : ''}" data-act="deed" data-tile="${i}">
    <span class="sw" style="background:${tileColor(t)}"></span><span class="nm">${esc(t.name)}</span><span class="st">${st}</span></button>`;
}

export function realmsHTML(s, focusId) {
  const p = focusId && player(s, focusId);
  if (!p) return '<p class="empty">You are watching this game.</p>';
  let html = '';
  if (s.trade && s.trade.from === p.id) {
    html += `<div class="realm-row note"><span class="sw" style="background:var(--gold)"></span><span class="nm">Offer to ${esc(player(s, s.trade.to).name)} awaits a reply</span><span class="btn small" role="button" tabindex="0" data-act="cancel-trade" data-by="${p.id}">Withdraw</span></div>`;
  }
  const mine = tilesOf(s, p.id);
  if (!mine.length) return html + '<p class="empty">No realms yet. Land on an unclaimed tile to claim it.</p>';
  return html + mine.map((i) => realmRow(s, i, p.id)).join('');
}

export function renderRealms(el, titleEl, s, focusId) {
  const p = focusId && player(s, focusId);
  titleEl.textContent = p ? `${p.name}'s realms` : 'Realms';
  el.innerHTML = realmsHTML(s, focusId);
}

export function logHTML(s, chat) {
  // Chat lines carry the log id current when they were sent, so they slot in after it.
  const items = s.log.map((l) => ({ key: l.id, html: esc(l.msg) }));
  const oldest = s.log.length ? s.log[0].id : 0;
  for (const c of chat) if (c.at >= oldest) items.push({ key: c.at + 0.5, html: `<b>${esc(c.from)}:</b> ${esc(c.text)}`, chat: true });
  items.sort((a, b) => b.key - a.key);
  return items.slice(0, 120).map((x) => `<li class="${x.chat ? 'chat-line' : ''}">${x.html}</li>`).join('');
}

export function chatHTML(chat) {
  return chat.slice(-60).map((c) => `<li><b>${esc(c.from)}:</b> ${esc(c.text)}</li>`).join('') || '<li class="muted">No messages yet. Say namaste.</li>';
}

// ---------- place sheet: sketch, story and deed ----------

export function placeHTML(s, i, ctx) {
  const t = TILES[i];
  const o = s.own[i];
  const owner = o && player(s, o.owner);
  const place = PLACES[i] || {};
  const tint = t.type === 'realm' ? GROUPS[t.group].color : t.type === 'tirtha' ? '#5FA8CC' : '#E9C46A';
  const label = t.type === 'realm' ? GROUPS[t.group].name : t.type === 'tirtha' ? 'Tirtha' : t.type === 'util' ? 'Divine treasure' : '';

  let deed = '';
  if (t.type === 'realm') {
    const g = GROUPS[t.group];
    const level = o ? (o.houses || (ownsGroup(s, o.owner, t.group) ? 'set' : 0)) : -1;
    const rows = [
      ['Rent', t.rent[0], level === 0], ['With the full set', t.rent[0] * 2, level === 'set'],
      ['With 1 temple', t.rent[1], level === 1], ['With 2 temples', t.rent[2], level === 2],
      ['With 3 temples', t.rent[3], level === 3], ['With 4 temples', t.rent[4], level === 4],
      ['With a palace', t.rent[5], level === 5],
    ];
    deed = `<table class="rent">${rows.map(([a, b, on]) => `<tr class="${on ? 'on' : ''}"><td>${a}</td><td>${b}</td></tr>`).join('')}</table>
      <p class="muted">Price ${t.price}. Temples cost ${g.house} each; a palace replaces four temples. Pledge value ${t.price / 2}.</p>`;
  } else if (t.type === 'tirtha') {
    const n = o ? TILES.filter((x, k) => x.type === 'tirtha' && s.own[k] && s.own[k].owner === o.owner).length : 0;
    deed = `<table class="rent">${[1, 2, 3, 4].map((k) => `<tr class="${n === k ? 'on' : ''}"><td>Owner holds ${k} Tirtha${k > 1 ? 's' : ''}</td><td>${25 * 2 ** (k - 1)}</td></tr>`).join('')}</table>
      <p class="muted">Price ${t.price}. Pledge value ${t.price / 2}.</p>`;
  } else if (t.type === 'util') {
    deed = `<p class="muted">Price ${t.price}. Rent is 4x the dice, or 10x when one player holds both treasures. Pledge value ${t.price / 2}.</p>`;
  }

  let owned = '';
  if (owner) {
    owned = `<div class="owner-line">${face(owner.char)}<span>Held by ${esc(owner.name)}${o.mort ? ' (pledged)' : ''}</span></div>`;
    if (!o.mort && o.owner !== ctx.focus) {
      const r = t.type === 'util' ? 'set by the dice' : rentFor(s, i, 7);
      owned += `<p class="muted">Rent if you land here: ${r}.</p>`;
    }
  } else if (BUYABLE.has(t.type)) owned = '<p class="muted">Unclaimed. Land here to claim it.</p>';

  let actions = '';
  if (owner && ctx.controls(owner.id) && s.status === 'playing') {
    const id = owner.id;
    const house = t.type === 'realm' ? GROUPS[t.group].house : 0;
    const free = owner.flags && owner.flags.freeTemple;
    if (t.type === 'realm') {
      actions += `<button class="btn ink primary" data-act="build" data-tile="${i}" data-by="${id}" ${canBuild(s, id, i) && (free || owner.cash >= house) ? '' : 'disabled'}>${o.houses === 4 ? 'Raise palace' : 'Build temple'} (${free ? 'free' : house})</button>`;
      actions += `<button class="btn ink" data-act="sell" data-tile="${i}" data-by="${id}" ${canSell(s, id, i) ? '' : 'disabled'}>Sell building (+${house / 2})</button>`;
    }
    if (o.mort) actions += `<button class="btn ink" data-act="unmortgage" data-tile="${i}" data-by="${id}" ${owner.cash >= unmortgageCost(i) ? '' : 'disabled'}>Redeem (${unmortgageCost(i)})</button>`;
    else actions += `<button class="btn ink" data-act="mortgage" data-tile="${i}" data-by="${id}" ${canMortgage(s, id, i) ? '' : 'disabled'}>Pledge (+${t.price / 2})</button>`;
    if (t.type === 'realm' && !ownsGroup(s, id, t.group)) actions += '<p class="muted hint">Hold every realm in this group to build temples.</p>';
  }

  return `<div class="sheet place">
    <div class="sketch-wrap">${sketch(i, tint)}${t.type === 'realm' ? `<span class="place-band" style="background:${tint}"></span>` : ''}</div>
    <div class="pad">
      ${label ? `<div class="grp" style="color:${tint === '#E9C46A' ? '#9A6E10' : tint}">${esc(label)}</div>` : ''}
      <h2>${esc(t.name)}</h2>
      <p class="story">${esc(place.story || t.blurb)}</p>
      ${place.why ? `<p class="why">${esc(place.why)}</p>` : ''}
      ${owned}${deed}
    </div>
    <div class="sheet-actions">${actions}<button class="btn ink" data-act="close">Close</button></div></div>`;
}

export function resultsHTML(s) {
  const ranked = s.players.slice().sort((a, b) => (a.bankrupt - b.bankrupt) || netWorth(s, b.id) - netWorth(s, a.id));
  const w = s.winner && player(s, s.winner);
  return `<div class="sheet win">
    ${w ? `<div class="win-hero" style="--c:${CHARACTERS[w.char].color}">${portrait(w.char, 'happy')}</div>` : ''}
    <h2>${w ? `${esc(w.name)} wins` : 'The war is over'}</h2>
    ${w ? `<p class="muted">${esc(CHARACTERS[w.char].name)}, ${esc(CHARACTERS[w.char].title.toLowerCase())}, holds the field of dharma.</p>` : ''}
    <ol class="standings">${ranked.map((p) => `<li>${face(p.char, { mood: p.bankrupt ? 'sad' : p === w ? 'happy' : 'idle' })}<span>${esc(p.name)}</span><span>${p.bankrupt ? 'fell' : `${netWorth(s, p.id).toLocaleString('en-IN')}`}</span></li>`).join('')}</ol>
    <div class="sheet-actions" style="justify-content:center"><button class="btn ink primary" data-act="home">Back to the start</button><button class="btn ink" data-act="close">Look at the board</button></div></div>`;
}

export function tradeHTML(s, fromId, toId, draft) {
  const me = player(s, fromId);
  const others = s.players.filter((p) => !p.bankrupt && p.id !== fromId);
  const them = player(s, toId) || others[0];
  const list = (owner, side) => {
    const tiles = tilesOf(s, owner.id);
    if (!tiles.length) return '<p class="muted">No realms.</p>';
    return tiles.map((i) => {
      const t = TILES[i];
      const o = s.own[i];
      const blocked = t.type === 'realm' && groupTiles(t.group).some((k) => s.own[k] && s.own[k].houses);
      const checked = draft[side].tiles.includes(i) ? 'checked' : '';
      return `<label class="${blocked ? 'no' : ''}" title="${blocked ? 'Sell the temples in this group first' : ''}"><input type="checkbox" data-side="${side}" value="${i}" ${checked} ${blocked ? 'disabled' : ''}><span class="sw" style="background:${tileColor(t)}"></span>${esc(t.name)}${o.mort ? ' (pledged)' : ''}</label>`;
    }).join('');
  };
  const cards = (owner, side) => owner.jailCards.length
    ? `<label class="cash-in">Pardons <input type="number" inputmode="numeric" min="0" max="${owner.jailCards.length}" value="${draft[side].cards || 0}" data-cards="${side}"></label>` : '';
  return `<div class="sheet"><div class="sheet-head plain"><h2>Propose a trade</h2></div><div class="pad">
    <div class="trade-who">${others.map((p) => `<button class="who${p.id === them.id ? ' on' : ''}" data-trade-to="${p.id}">${face(p.char)}<span>${esc(p.name)}</span></button>`).join('')}</div>
    <div class="trade-cols">
      <div class="trade-col"><h4>${face(me.char)}${esc(me.name)} gives</h4><div class="trade-list">${list(me, 'give')}</div>
        <label class="cash-in">Gold <input type="number" inputmode="numeric" min="0" max="${me.cash}" step="10" value="${draft.give.cash || 0}" data-cash="give"></label>${cards(me, 'give')}</div>
      <div class="trade-col"><h4>${face(them.char)}${esc(them.name)} gives</h4><div class="trade-list">${list(them, 'get')}</div>
        <label class="cash-in">Gold <input type="number" inputmode="numeric" min="0" max="${them.cash}" step="10" value="${draft.get.cash || 0}" data-cash="get"></label>${cards(them, 'get')}</div>
    </div></div>
    <div class="sheet-actions"><button class="btn ink primary" data-act="propose" data-by="${fromId}" data-to="${them.id}">Send offer</button><button class="btn ink" data-act="close">Cancel</button></div></div>`;
}

export function tradeReviewHTML(s) {
  const t = s.trade;
  const a = player(s, t.from), b = player(s, t.to);
  const side = (x) => {
    const items = [...x.tiles.map((i) => `<span class="sw" style="background:${tileColor(TILES[i])}"></span>${esc(TILES[i].name)}${s.own[i] && s.own[i].mort ? ' (pledged)' : ''}`)];
    if (x.cash) items.push(`${coin}${x.cash} gold`);
    if (x.cards) items.push(`${x.cards} pardon card${x.cards > 1 ? 's' : ''}`);
    return items.length ? `<ul class="offer">${items.map((i) => `<li>${i}</li>`).join('')}</ul>` : '<p class="muted">Nothing</p>';
  };
  return `<div class="sheet"><div class="sheet-head char-head" style="--c:${CHARACTERS[a.char].color}">
      <div class="char-hero small">${portrait(a.char, 'happy')}</div><div><div class="grp">Trade offer</div><h2>${esc(a.name)} proposes a deal</h2></div></div>
    <div class="pad trade-sum">
    <p><b>${esc(b.name)}, you receive:</b></p>${side(t.give)}
    <p><b>You give:</b></p>${side(t.get)}</div>
    <div class="sheet-actions"><button class="btn ink primary" data-act="accept-trade" data-by="${b.id}">Accept</button><button class="btn ink" data-act="reject-trade" data-by="${b.id}">Decline</button></div></div>`;
}

export function rulesHTML() {
  return `<div class="sheet rules"><div class="sheet-head plain"><h2>How to play</h2></div><div class="pad">
    <p>Travel the board, claim realms and collect rent from rivals. The last player standing wins, or the host can end the game and count total wealth.</p>
    <h3>Your turn</h3>
    <ul><li>Roll two dice and move. Doubles let you roll again; three doubles in a row send you to Vanavas.</li>
    <li>Land on an unclaimed realm, Tirtha or treasure to claim it. Pass, and it goes to auction for everyone.</li>
    <li>Land on a rival's holding and pay rent. Passing Hastinapura pays you 200.</li></ul>
    <h3>Building</h3>
    <ul><li>Hold every realm of one colour to double its rent and raise temples. Build evenly; four temples become a palace.</li>
    <li>Pledge a holding to the bank for half its price when you need gold. Redeem it for that amount plus 10%.</li></ul>
    <h3>Vanavas</h3>
    <ul><li>In exile you still collect rent. Leave by rolling doubles, paying ${JAIL_FINE}, or using a pardon. After three tries you pay and walk out.</li></ul>
    <h3>Leela and Ashirvad</h3>
    <ul><li>Leela cards are Krishna's play: sudden journeys and twists of fortune. Ashirvad cards are blessings, though not every blessing is kind.</li></ul>
    <h3>Divine powers</h3>
    <ul>${CHARACTER_IDS.map((id) => `<li><b>${CHARACTERS[id].name}, ${esc(CHARACTERS[id].power)}:</b> ${esc(CHARACTERS[id].powerText)}</li>`).join('')}</ul>
    <p class="muted">Each power works once per game, on your turn before you roll.</p>
    <h3>Stories</h3>
    <ul><li>Tap any tile to see a sketch of the place and read its story from the epic.</li></ul>
    <h3>Debts</h3>
    <ul><li>If you cannot pay, sell temples and pledge realms until you can. If you still cannot, you yield and your holdings pass to whoever you owe.</li></ul>
    </div><div class="sheet-actions"><button class="btn ink primary" data-act="close">Close</button></div></div>`;
}

// ---------- connection settings ----------

export function settingsHTML(cfg, { isHost, test }) {
  const rows = cfg.turn.length ? cfg.turn : [{ urls: '', username: '', credential: '' }];
  const result = test
    ? test.running ? '<p class="test-res">Testing your network...</p>'
      : test.error ? `<p class="test-res bad">${esc(test.error)}</p>`
        : `<ul class="test-res">
          <li class="${test.host ? 'good' : 'bad'}">Local network: ${test.host ? 'found' : 'not found'}</li>
          <li class="${test.srflx ? 'good' : 'bad'}">Google STUN: ${test.srflx ? 'reachable, direct connections should work' : 'not reachable'}</li>
          <li class="${test.relay ? 'good' : cfg.turn.length ? 'bad' : ''}">TURN relay: ${test.relay ? 'working' : cfg.turn.length ? 'no relay found. Check the address and credentials.' : 'none set up'}</li></ul>`
    : '';
  return `<div class="sheet settings"><div class="sheet-head plain"><h2>Connection settings</h2></div><div class="pad">
    <p>Players connect directly, browser to browser. Google's STUN servers are always used to find a path. If friends on strict office or mobile networks cannot connect, add a TURN server: it relays traffic when no direct path exists.</p>
    <p class="muted">Free and paid TURN servers are offered by providers such as Metered and Cloudflare, or you can run your own with coturn. Everyone in the game benefits if each player, or at least the host, has one set.</p>
    <div class="turn-rows">${rows.map((t, k) => `
      <fieldset class="turn-row" data-row="${k}">
        <legend>TURN server ${rows.length > 1 ? k + 1 : ''}</legend>
        <label>Address<input data-f="urls" value="${esc(t.urls)}" placeholder="turn:turn.example.com:3478" spellcheck="false" autocomplete="off"></label>
        <div class="two"><label>Username<input data-f="username" value="${esc(t.username)}" autocomplete="off" spellcheck="false"></label>
        <label>Password<input data-f="credential" type="password" value="${esc(t.credential)}" autocomplete="off"></label></div>
        ${rows.length > 1 ? `<button type="button" class="link" data-act="turn-remove" data-row="${k}">Remove this server</button>` : ''}
      </fieldset>`).join('')}</div>
    <button type="button" class="btn ink small" data-act="turn-add">Add another server</button>
    <label class="check"><input type="checkbox" data-f="relayOnly" ${cfg.relayOnly ? 'checked' : ''}> Always relay through TURN (hides your IP address from other players)</label>
    ${isHost ? `<label class="check"><input type="checkbox" data-f="shareInvite" ${cfg.shareInvite ? 'checked' : ''}> Include these TURN settings in my invite link</label>
      <p class="muted">Only share TURN credentials with people you trust; anyone with the link can use your relay.</p>` : ''}
    ${result}
    </div>
    <div class="sheet-actions"><button class="btn ink primary" data-act="settings-save">Save</button><button class="btn ink" data-act="settings-test">Test connection</button><button class="btn ink" data-act="close">Close</button></div></div>`;
}

// ---------- home art: characters circling Sudarshana ----------

export function homeArt() {
  const ring = CHARACTER_IDS.map((id, k) => {
    const a = (k / CHARACTER_IDS.length) * Math.PI * 2 - Math.PI / 2;
    const x = 300 + 192 * Math.cos(a), y = 290 + 192 * Math.sin(a);
    const c = CHARACTERS[id];
    return `<g class="ring-med" style="animation-delay:${0.2 + k * 0.1}s">
      <circle cx="${x}" cy="${y}" r="47" fill="#E9C46A"/><circle cx="${x}" cy="${y}" r="44" fill="${c.color}"/>
      <svg class="portrait" x="${x - 44}" y="${y - 44}" width="88" height="88" viewBox="14 3 72 72" style="--blink:-${k * 0.8}s">${portrait(id, 'idle').replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>
      <text x="${x}" y="${y + 66}" text-anchor="middle" class="ring-name">${c.name}</text></g>`;
  }).join('');
  const art = centreArt().replace(/<\/svg>\s*$/, '');
  return `${art}${chakra('class="home-chakra" x="195" y="185" width="210" height="210"')}${ring}</svg>`;
}

export function heroCard(id) {
  const c = CHARACTERS[id];
  return `<div class="hero-card" style="--c:${c.color}">
    <div class="hero-portrait">${portrait(id, 'happy')}</div>
    <div class="hero-txt"><b>${esc(c.name)}</b><span>${esc(c.title)}</span>
      <p>${charMed(id, 22)}<b>${esc(c.power)}:</b> ${esc(c.powerText)}</p></div></div>`;
}

export { uiIcon, portrait };
