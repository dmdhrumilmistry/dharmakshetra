// DOM rendering. Everything here reads state and writes HTML; no rules live here.

import { TILES, GROUPS, CHARACTERS, CHARACTER_IDS, BUYABLE, groupTiles, JAIL_FINE } from './data.js';
import {
  phase, player, current, tilesOf, rentFor, netWorth, ownsGroup,
  canBuild, canSell, canMortgage, unmortgageCost,
} from './engine.js';
import { medallion, emblem, tileIcon, icon, coin, chakra, centreArt } from './art.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const gold = (n) => `${coin}${Number(n).toLocaleString('en-IN')}`;

export function med(p, size = 36, extra = {}) {
  const c = CHARACTERS[p.char];
  return medallion(c.emblem, c.color, { size, title: `${p.name} as ${c.name}`, ...extra });
}
export function charMed(id, size = 40, extra = {}) {
  const c = CHARACTERS[id];
  return medallion(c.emblem, c.color, { size, title: c.name, ...extra });
}

const ownerColor = (s, id) => CHARACTERS[player(s, id).char].color;

// ---------- board geometry ----------

function gridPos(i) {
  if (i <= 10) return { row: 11, col: 11 - i, side: 'bottom' };
  if (i < 20) return { row: 11 - (i - 10), col: 1, side: 'left' };
  if (i <= 30) return { row: 1, col: i - 19, side: 'top' };
  return { row: i - 29, col: 11, side: 'right' };
}

const CORNER_SUB = { go: 'Collect 200', exile: 'Just visiting', rest: 'Rest awhile', dice: 'Go to Vanavas' };

function tileHTML(t, i) {
  const { row, col, side } = gridPos(i);
  const corner = i % 10 === 0;
  const style = `grid-row:${row};grid-column:${col}`;
  const label = `${t.name}${t.price ? `, ${t.price} gold` : ''}`;
  if (corner) {
    return `<button class="tile corner ${t.type} s-${side}" data-i="${i}" style="${style}" aria-label="${esc(label)}">
      ${tileIcon(t)}<span class="nm">${esc(t.name)}</span><span class="sub">${CORNER_SUB[t.type]}</span>
      <div class="tokens"></div></button>`;
  }
  const band = t.type === 'realm' ? `<div class="band" style="background:${GROUPS[t.group].color}"></div>` : '';
  const price = t.price ? `<span class="pr">${t.price}</span>` : t.amount ? `<span class="pr">Pay ${t.amount}</span>` : '';
  return `<button class="tile ${t.type} s-${side}" data-i="${i}" style="${style}" aria-label="${esc(label)}">
    ${band}<div class="body"><span class="nm">${esc(t.name)}</span>${t.type !== 'realm' ? tileIcon(t) : ''}${price}</div>
    <div class="tokens"></div></button>`;
}

export function buildBoard(el) {
  el.innerHTML = TILES.map(tileHTML).join('') + `
    <div class="centre">
      ${centreArt()}
      <h2 class="logo">Dharmakshetra</h2>
      <div class="round" id="round"></div>
      <div class="dice-zone">${chakra()}<div class="dice" id="dice"></div></div>
      <div class="centre-ui" id="centre-ui"></div>
    </div>`;
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
      if (!mark) {
        mark = document.createElement('i');
        mark.className = 'owner-mark';
        tile.append(mark);
      }
      mark.style.background = ownerColor(s, o.owner);
      mark.title = player(s, o.owner).name;
    } else if (mark) mark.remove();
    const band = tile.querySelector('.band');
    if (band) band.innerHTML = o && o.houses ? (o.houses === 5 ? PALACE : TEMPLE.repeat(o.houses)) : '';
  }
}

export function updateTokens(el, s, displayPos, hopping) {
  const at = {};
  for (const p of s.players) {
    if (p.bankrupt) continue;
    (at[displayPos[p.id]] ||= []).push(p);
  }
  el.querySelectorAll('.tile').forEach((tile) => {
    const i = Number(tile.dataset.i);
    const list = at[i] || [];
    tile.querySelector('.tokens').innerHTML = list
      .map((p) => {
        const cls = [hopping.has(p.id) ? 'hop' : '', p.jail && i === 10 ? 'jailed' : ''].join(' ');
        return med(p, 24).replace('class="medallion', `class="medallion ${cls}`);
      })
      .join('');
  });
}

const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
export function renderDice(el, dice) {
  el.innerHTML = dice
    .map((d) => `<div class="die${d === 1 ? ' red' : ''}" aria-label="Die showing ${d}">${Array.from({ length: 9 }, (_, k) => `<i class="${PIPS[d].includes(k) ? 'on' : ''}"></i>`).join('')}</div>`)
    .join('');
}

// ---------- centre controls ----------

function powerUsable(s, p) {
  if (p.abilityUsed) return false;
  if (p.jail && ['krishna', 'bhima', 'hanuman'].includes(p.char)) return false;
  return true;
}

export function renderCentre(el, s, ctx) {
  const ph = phase(s);
  const cur = current(s);
  const mine = (id) => ctx.controls(id);
  let line = `${med(cur, 28)}<span>${esc(cur.name)}'s turn</span>`;
  let prompt = '';
  let acts = '';

  if (ph === 'over') {
    const w = s.winner && player(s, s.winner);
    line = w ? `${med(w, 28)}<span>${esc(w.name)} is victorious</span>` : '<span>The war is over</span>';
    prompt = 'The field falls quiet.';
    acts = `<button class="btn primary" data-act="results">See the standings</button>`;
  } else if (ph === 'auction') {
    const a = s.auction;
    const t = TILES[a.tile];
    const bidder = player(s, a.order[a.idx]);
    const high = a.bidder ? `<b>${a.high}</b> from ${esc(player(s, a.bidder).name)}` : 'no bids yet';
    line = `<span>Auction for ${esc(t.name)}</span>`;
    prompt = `Highest bid: ${high}. ${esc(bidder.name)} to bid.`;
    if (mine(bidder.id)) {
      const steps = [10, 50, 100].map((n) => a.high + n).filter((n) => n <= bidder.cash);
      acts = steps.map((n) => `<button class="btn${n === a.high + 10 ? ' primary' : ''}" data-act="bid" data-amount="${n}" data-by="${bidder.id}">Bid ${n}</button>`).join('')
        + `<button class="btn" data-act="bid-custom" data-by="${bidder.id}">Other amount</button>`
        + `<button class="btn danger" data-act="pass-bid" data-by="${bidder.id}">Withdraw</button>`;
      prompt = `${mine(bidder.id) && ctx.multiLocal ? `<b>${esc(bidder.name)}</b>, it's your bid. ` : 'Your bid. '}Highest: ${high}. You hold ${bidder.cash}.`;
    }
  } else if (ph === 'buy') {
    const t = TILES[s.buy.tile];
    const p = player(s, s.buy.player);
    line = `${med(p, 28)}<span>${esc(p.name)} arrives at ${esc(t.name)}</span>`;
    if (mine(p.id)) {
      prompt = `Unclaimed. Claim it for <b>${t.price}</b>, or send it to auction. You hold ${p.cash}.`;
      acts = `<button class="btn primary" data-act="buy" data-by="${p.id}" ${p.cash < t.price ? 'disabled' : ''}>Claim for ${t.price}</button>
        <button class="btn" data-act="decline" data-by="${p.id}">Auction it</button>
        <button class="btn" data-act="deed" data-tile="${s.buy.tile}">View deed</button>`;
    } else prompt = `${esc(p.name)} is deciding whether to claim it.`;
  } else if (ph === 'debt') {
    const d = s.debts.find((x) => mine(x.debtor)) || s.debts[0];
    const p = player(s, d.debtor);
    const to = d.creditor ? esc(player(s, d.creditor).name) : 'the bank';
    line = `${med(p, 28)}<span>${esc(p.name)} owes ${d.amount}</span>`;
    if (mine(p.id)) {
      const short = d.amount - p.cash;
      prompt = short > 0
        ? `You owe <b>${d.amount}</b> to ${to} for ${esc(d.reason)}. Raise <b>${short}</b> more by selling temples or pledging realms from your deeds.`
        : `You can now pay <b>${d.amount}</b> to ${to}.`;
      acts = `<button class="btn primary" data-act="pay-debt" data-by="${p.id}" ${short > 0 ? 'disabled' : ''}>Pay ${d.amount}</button>
        <button class="btn danger" data-act="bankrupt" data-by="${p.id}">Yield the game</button>`;
    } else prompt = `Waiting for ${esc(p.name)} to pay ${to}.`;
  } else if (ph === 'pre' || ph === 'post') {
    if (mine(cur.id)) {
      const c = CHARACTERS[cur.char];
      if (ph === 'pre') {
        if (ctx.krishnaPick) {
          prompt = 'Sudarshana: choose the total you will move.';
          acts = `<div class="krishna-pick">${Array.from({ length: 11 }, (_, k) => `<button class="btn" data-act="krishna" data-value="${k + 2}" data-by="${cur.id}">${k + 2}</button>`).join('')}</div>
            <button class="btn" data-act="krishna-cancel">Cancel</button>`;
        } else {
          prompt = cur.jail
            ? `You are in exile (attempt ${cur.jailTurns + 1} of 3). Roll doubles, pay ${JAIL_FINE}, or show a pardon.`
            : ctx.multiLocal ? `<b>${esc(cur.name)}</b>, roll when ready.` : 'Roll when ready.';
          acts = `<button class="btn primary" data-act="roll" data-by="${cur.id}">${cur.jail ? 'Roll for doubles' : 'Roll the dice'}</button>`;
          if (cur.jail) {
            acts += `<button class="btn" data-act="pay-jail" data-by="${cur.id}" ${cur.cash < JAIL_FINE ? 'disabled' : ''}>Pay ${JAIL_FINE}</button>`;
            if (cur.jailCards.length) acts += `<button class="btn" data-act="jail-card" data-by="${cur.id}">Use pardon</button>`;
          }
          if (powerUsable(s, cur)) acts += `<button class="btn" data-act="power" data-by="${cur.id}" title="${esc(c.powerText)}">${esc(c.power)}</button>`;
        }
      } else {
        prompt = cur.flags && Object.keys(cur.flags).length ? 'Your divine power is ready for the moment it is needed.' : 'Build, trade or end your turn.';
        acts = `<button class="btn primary" data-act="end" data-by="${cur.id}">End turn</button>`;
      }
    } else {
      prompt = cur.isBot ? `${esc(cur.name)} is thinking...` : ctx.presence[cur.id] === false ? `${esc(cur.name)} has lost connection.` : `Waiting for ${esc(cur.name)}...`;
    }
  }

  el.innerHTML = `<div class="turn-line">${line}</div><p class="prompt">${prompt}</p><div class="acts">${acts}</div>`;
}

// ---------- sidebar ----------

export function renderPlayers(el, s, ctx) {
  el.innerHTML = s.players.map((p, k) => {
    const c = CHARACTERS[p.char];
    const sets = tilesOf(s, p.id).map((i) => {
      const t = TILES[i];
      const color = t.type === 'realm' ? GROUPS[t.group].color : t.type === 'tirtha' ? '#7FB8C9' : '#E9C46A';
      return `<i style="background:${color}${s.own[i].mort ? ';opacity:.35' : ''}" title="${esc(t.name)}"></i>`;
    }).join('');
    const tags = [];
    if (p.isBot) tags.push('<span class="tag">computer</span>');
    if (p.jail) tags.push('<span class="tag">in exile</span>');
    if (!p.isBot && ctx.presence[p.id] === false && !p.bankrupt) tags.push('<span class="tag off">offline</span>');
    if (p.jailCards.length) tags.push(`<span class="tag">${p.jailCards.length} pardon</span>`);
    const power = p.abilityUsed ? `${esc(c.power)} used` : `${esc(c.power)} ready`;
    const replace = ctx.isHost && !p.isBot && !p.bankrupt && ctx.presence[p.id] === false
      ? `<div class="pl-actions"><button class="btn small" data-act="replace-bot" data-target="${p.id}">Let the computer play</button></div>` : '';
    return `<li class="pl${k === s.cur && s.status === 'playing' ? ' now' : ''}${p.bankrupt ? ' out' : ''}">
      ${med(p, 38, { dim: p.bankrupt })}
      <div><div class="pl-name">${esc(p.name)}${tags.join('')}</div>
        <div class="pl-meta">${esc(c.name)}, ${p.bankrupt ? 'left the field' : power}</div>
        <div class="pl-sets">${sets}</div></div>
      <div class="pl-cash">${p.bankrupt ? '' : gold(p.cash)}</div>${replace}</li>`;
  }).join('');
}

export function renderRealms(el, titleEl, s, focusId) {
  const p = focusId && player(s, focusId);
  if (!p) {
    titleEl.textContent = 'Realms';
    el.innerHTML = '<p class="empty">You are watching this game.</p>';
    return;
  }
  titleEl.textContent = `${p.name}'s realms`;
  let html = '';
  if (s.trade && (s.trade.from === p.id)) {
    html += `<div class="realm-row" style="cursor:default"><span class="sw" style="background:var(--gold)"></span><span class="nm">Offer to ${esc(player(s, s.trade.to).name)} awaits a reply</span><button class="btn small" data-act="cancel-trade" data-by="${p.id}">Withdraw</button></div>`;
  }
  const mine = tilesOf(s, p.id);
  if (!mine.length) {
    el.innerHTML = html + '<p class="empty">No realms yet. Land on an unclaimed tile to claim it.</p>';
    return;
  }
  html += mine.map((i) => {
    const t = TILES[i];
    const o = s.own[i];
    const color = t.type === 'realm' ? GROUPS[t.group].color : t.type === 'tirtha' ? '#7FB8C9' : '#E9C46A';
    let st = o.mort ? 'pledged' : t.type === 'realm' ? (o.houses === 5 ? 'palace' : o.houses ? `${o.houses} temple${o.houses > 1 ? 's' : ''}` : ownsGroup(s, p.id, t.group) ? 'full set' : '') : '';
    return `<button class="realm-row${o.mort ? ' mort' : ''}" data-act="deed" data-tile="${i}">
      <span class="sw" style="background:${color}"></span><span class="nm">${esc(t.name)}</span><span class="st">${st}</span></button>`;
  }).join('');
  el.innerHTML = html;
}

export function renderLog(el, s, chat) {
  // Chat lines carry the log id current when they were sent, so they slot in after it.
  const items = s.log.map((l) => ({ key: l.id, html: esc(l.msg) }));
  const oldest = s.log.length ? s.log[0].id : 0;
  for (const c of chat) if (c.at >= oldest) items.push({ key: c.at + 0.5, html: `<b>${esc(c.from)}:</b> ${esc(c.text)}`, chat: true });
  items.sort((a, b) => b.key - a.key);
  el.innerHTML = items.slice(0, 120).map((x) => `<li class="${x.chat ? 'chat-line' : ''}">${x.html}</li>`).join('');
}

// ---------- modals ----------

export function deedHTML(s, i, ctx) {
  const t = TILES[i];
  const o = s.own[i];
  const owner = o && player(s, o.owner);
  let head, body = '';
  if (t.type === 'realm') {
    const g = GROUPS[t.group];
    head = `<div class="sheet-head" style="background:${g.color}"><div class="grp">${esc(g.name)}</div><h2>${esc(t.name)}</h2></div>`;
    const level = o ? (o.houses || (ownsGroup(s, o.owner, t.group) ? 'set' : 0)) : -1;
    const rows = [
      ['Rent', t.rent[0], level === 0],
      ['With the full set', t.rent[0] * 2, level === 'set'],
      ['With 1 temple', t.rent[1], level === 1],
      ['With 2 temples', t.rent[2], level === 2],
      ['With 3 temples', t.rent[3], level === 3],
      ['With 4 temples', t.rent[4], level === 4],
      ['With a palace', t.rent[5], level === 5],
    ];
    body += `<table class="rent">${rows.map(([a, b, on]) => `<tr class="${on ? 'on' : ''}"><td>${a}</td><td>${b}</td></tr>`).join('')}</table>
      <p class="muted">Price ${t.price}. Temples cost ${g.house} each; a palace replaces four temples. Pledge value ${t.price / 2}.</p>`;
  } else if (t.type === 'tirtha') {
    head = `<div class="sheet-head" style="background:#1B6E8C"><div class="grp">Tirtha</div><h2>${esc(t.name)}</h2></div>`;
    const n = o ? groupCount(s, o.owner, 'tirtha') : 0;
    body += `<table class="rent">${[1, 2, 3, 4].map((k) => `<tr class="${n === k ? 'on' : ''}"><td>Owner holds ${k} Tirtha${k > 1 ? 's' : ''}</td><td>${25 * 2 ** (k - 1)}</td></tr>`).join('')}</table>
      <p class="muted">Price ${t.price}. Pledge value ${t.price / 2}.</p>`;
  } else if (t.type === 'util') {
    head = `<div class="sheet-head" style="background:#8C6A1E"><div class="grp">Divine treasure</div><h2>${esc(t.name)}</h2></div>`;
    body += `<p class="muted">Price ${t.price}. Pledge value ${t.price / 2}.</p>`;
  } else {
    head = `<div class="sheet-head plain"><h2>${esc(t.name)}</h2></div>`;
  }
  let owned = '';
  if (owner) {
    owned = `<div class="owner-line">${med(owner, 26)}<span>Held by ${esc(owner.name)}${o.mort ? ' (pledged)' : ''}</span></div>`;
    if (!o.mort && BUYABLE.has(t.type) && o.owner !== ctx.focus) {
      const r = t.type === 'util' ? `${groupCount(s, o.owner, 'util') === 2 ? 10 : 4}x the dice` : rentFor(s, i, 7);
      owned += `<p class="muted">Current rent: ${r}.</p>`;
    }
  } else if (BUYABLE.has(t.type)) owned = '<p class="muted">Unclaimed.</p>';

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
    if (t.type === 'realm' && !ownsGroup(s, id, t.group)) actions += '<p class="muted" style="width:100%;margin:.2em 0 0">Hold every realm in this group to build temples.</p>';
  }
  return `<div class="sheet">${head}<div class="pad"><p>${esc(t.blurb)}</p>${body}${owned}</div>
    <div class="sheet-actions">${actions}<button class="btn ink" data-act="close">Close</button></div></div>`;
}

function groupCount(s, owner, type) {
  return TILES.filter((t, k) => t.type === type && s.own[k] && s.own[k].owner === owner).length;
}

export function cardHTML(s, ev) {
  const p = player(s, ev.player);
  const leela = ev.deck === 'leela';
  return `<div class="card-pop ${ev.deck}">
    ${icon(leela ? 'flute' : 'diya')}
    <h2>${leela ? 'Leela' : 'Ashirvad'}</h2>
    <div class="by">${med(p, 22)}<span>Drawn by ${esc(p.name)}</span></div>
    <p>${esc(ev.text)}</p>
    <button class="btn ${leela ? 'primary' : 'ink primary'}" data-act="close">Continue</button></div>`;
}

export function resultsHTML(s) {
  const ranked = s.players.slice().sort((a, b) => (a.bankrupt - b.bankrupt) || netWorth(s, b.id) - netWorth(s, a.id));
  const w = s.winner && player(s, s.winner);
  return `<div class="sheet win">
    ${w ? med(w, 84) : ''}
    <h2>${w ? `${esc(w.name)} wins` : 'The war is over'}</h2>
    ${w ? `<p class="muted">${esc(CHARACTERS[w.char].name)}, ${esc(CHARACTERS[w.char].title.toLowerCase())}, holds the field of dharma.</p>` : ''}
    <ul class="standings">${ranked.map((p) => `<li><span>${esc(p.name)}</span><span>${p.bankrupt ? 'fell' : `${netWorth(s, p.id).toLocaleString('en-IN')} total wealth`}</span></li>`).join('')}</ul>
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
      const color = t.type === 'realm' ? GROUPS[t.group].color : t.type === 'tirtha' ? '#7FB8C9' : '#E9C46A';
      const checked = draft[side].tiles.includes(i) ? 'checked' : '';
      return `<label class="${blocked ? 'no' : ''}" title="${blocked ? 'Sell the temples in this group first' : ''}"><input type="checkbox" data-side="${side}" value="${i}" ${checked} ${blocked ? 'disabled' : ''}><span class="sw" style="background:${color}"></span>${esc(t.name)}${o.mort ? ' (pledged)' : ''}</label>`;
    }).join('');
  };
  const cards = (owner, side) => owner.jailCards.length
    ? `<label class="cash-in">Pardons <input type="number" min="0" max="${owner.jailCards.length}" value="${draft[side].cards || 0}" data-cards="${side}"></label>` : '';
  return `<div class="sheet"><div class="sheet-head plain"><h2>Propose a trade</h2></div><div class="pad">
    <label class="cash-in" style="margin-bottom:10px">Trade with
      <select data-trade-to>${others.map((p) => `<option value="${p.id}" ${p.id === them.id ? 'selected' : ''}>${esc(p.name)} (${esc(CHARACTERS[p.char].name)})</option>`).join('')}</select></label>
    <div class="trade-cols">
      <div class="trade-col"><h4>${med(me, 22)}${esc(me.name)} gives</h4><div class="trade-list">${list(me, 'give')}</div>
        <label class="cash-in">Gold <input type="number" min="0" max="${me.cash}" step="10" value="${draft.give.cash || 0}" data-cash="give"></label>${cards(me, 'give')}</div>
      <div class="trade-col"><h4>${med(them, 22)}${esc(them.name)} gives</h4><div class="trade-list">${list(them, 'get')}</div>
        <label class="cash-in">Gold <input type="number" min="0" max="${them.cash}" step="10" value="${draft.get.cash || 0}" data-cash="get"></label>${cards(them, 'get')}</div>
    </div></div>
    <div class="sheet-actions"><button class="btn ink primary" data-act="propose" data-by="${fromId}" data-to="${them.id}">Send offer</button><button class="btn ink" data-act="close">Cancel</button></div></div>`;
}

export function tradeReviewHTML(s) {
  const t = s.trade;
  const a = player(s, t.from), b = player(s, t.to);
  const side = (x) => {
    const items = [...x.tiles.map((i) => esc(TILES[i].name) + (s.own[i] && s.own[i].mort ? ' (pledged)' : ''))];
    if (x.cash) items.push(`${x.cash} gold`);
    if (x.cards) items.push(`${x.cards} pardon card${x.cards > 1 ? 's' : ''}`);
    return items.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>` : '<p class="muted">Nothing</p>';
  };
  return `<div class="sheet"><div class="sheet-head plain"><h2>${esc(a.name)} offers a trade</h2></div><div class="pad trade-sum">
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
    <h3>Debts</h3>
    <ul><li>If you cannot pay, sell temples and pledge realms until you can. If you still cannot, you yield and your holdings pass to whoever you owe.</li></ul>
    </div><div class="sheet-actions"><button class="btn ink primary" data-act="close">Close</button></div></div>`;
}

// Home hero: the eight characters circling Sudarshana over the lotus pond.
export function homeArt() {
  const ring = CHARACTER_IDS.map((id, k) => {
    const a = (k / CHARACTER_IDS.length) * Math.PI * 2 - Math.PI / 2;
    const x = 300 + 186 * Math.cos(a), y = 290 + 186 * Math.sin(a);
    const c = CHARACTERS[id];
    return `<g class="ring-med" style="animation-delay:${0.2 + k * 0.1}s"><g transform="translate(${x - 40} ${y - 40}) scale(1.25)">
      <circle cx="32" cy="32" r="31" fill="#E9C46A"/><circle cx="32" cy="32" r="28.5" fill="${c.color}"/>
      <g transform="translate(6.4 6.4) scale(.8)">${emblem(c.emblem)}</g></g>
      <text x="${x}" y="${y + 58}" text-anchor="middle" class="ring-name">${c.name}</text></g>`;
  }).join('');
  const art = centreArt().replace(/<\/svg>\s*$/, '');
  return `${art}${chakra('class="home-chakra" x="195" y="185" width="210" height="210"')}${ring}</svg>`;
}
