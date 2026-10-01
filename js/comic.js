// Comic-book effects layer: event panels with speech bubbles, turn banners,
// floating gold numbers and lotus-petal confetti. Purely visual.

import { TILES, GROUPS, CHARACTERS } from './data.js';
import { portrait, line } from './characters.js';
import { icon } from './art.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Comic {
  constructor(layer, { board, tokenPoint, onPanel }) {
    this.layer = layer;
    this.board = board;
    this.tokenPoint = tokenPoint;
    this.onPanel = onPanel || (() => {});
    this.queue = [];
    this.current = null;
    this.endsAt = 0;
  }

  // Remaining time of queued panels, so bots wait for the show.
  busy() {
    const now = Date.now();
    const cur = Math.max(0, this.endsAt - now);
    return cur + this.queue.reduce((a, p) => a + p.ms, 0);
  }

  clear() {
    this.queue = [];
    this.layer.innerHTML = '';
    this.current = null;
    this.endsAt = 0;
  }

  play(s, prev, list, { delay = 0 } = {}) {
    if (!list || !list.length) return;
    const who = (id) => s.players.find((p) => p.id === id);
    for (const f of list) {
      const p = who(f.player);
      if (!p) continue;
      const c = p.char;
      const panel = (o) => this.queue.push({ ms: 1900, ...o, color: CHARACTERS[c].color });
      switch (f.kind) {
        case 'turn': this.banner(p, s); break;
        case 'rent': {
          const owner = who(f.to);
          panel({ burst: 'Rent!', kind: 'rent', cast: [[c, 'sad', line(c, 'rentPay')], [owner.char, 'happy', line(owner.char, 'rentGet')]], text: `${p.name} pays ${f.amount} to ${owner.name}` });
          break;
        }
        case 'tax': panel({ burst: 'Tribute!', kind: 'tax', cast: [[c, 'sad', line(c, 'tax')]], text: `${p.name} pays ${f.amount} for ${f.reason}` }); break;
        case 'buy': panel({ burst: 'Claimed!', kind: 'buy', cast: [[c, 'happy', line(c, 'buy')]], text: `${p.name} claims ${TILES[f.tile].name}`, tile: f.tile }); break;
        case 'auction': panel({ burst: 'Sold!', kind: 'buy', cast: [[c, 'happy', line(c, 'buy')]], text: `${p.name} wins ${TILES[f.tile].name} for ${f.amount}`, tile: f.tile }); break;
        case 'jail': panel({ burst: 'Exile!', kind: 'jail', cast: [[c, 'shock', line(c, 'jail')]], text: `${p.name} is sent to Vanavas` }); break;
        case 'free': panel({ burst: 'Free!', kind: 'mini', ms: 1300, cast: [[c, 'happy', 'Doubles! I walk free.']] }); break;
        case 'go': panel({ burst: '+200', kind: 'mini', ms: 1300, cast: [[c, 'happy', line(c, 'go')]] }); break;
        case 'doubles': panel({ burst: 'Doubles!', kind: 'mini', ms: 1100, cast: [[c, 'happy', 'Roll again!']] }); break;
        case 'set': panel({ burst: 'Full set!', kind: 'set', ms: 2300, cast: [[c, 'happy', line(c, 'set')]], text: `${p.name} holds all of ${GROUPS[f.group].name}`, confetti: 18 }); break;
        case 'build': panel({ burst: f.palace ? 'Palace!' : 'Temple!', kind: 'mini', ms: 1300, cast: [[c, 'happy', line(c, 'build')]], text: TILES[f.tile].name }); break;
        case 'card': panel({ burst: f.deck === 'leela' ? 'Leela' : 'Ashirvad', kind: `card ${f.deck}`, ms: 3600, cast: [[c, 'idle', line(c, 'card')]], card: f.text }); break;
        case 'power': panel({ burst: CHARACTERS[c].power, kind: 'power', ms: 2200, cast: [[c, 'happy', CHARACTERS[c].powerText]] }); break;
        case 'shield': panel({ burst: 'Blocked!', kind: 'mini', ms: 1500, cast: [[c, 'happy', 'Divine protection!']] }); break;
        case 'debt': panel({ burst: 'In debt!', kind: 'jail', cast: [[c, 'shock', 'I need to raise gold!']], text: `${p.name} owes ${f.amount}` }); break;
        case 'trade': {
          const a = who(f.from);
          panel({ burst: 'Deal!', kind: 'buy', ms: 1700, cast: [[a.char, 'happy', 'A fair exchange.'], [c, 'happy', 'Agreed!']] });
          break;
        }
        case 'fall': panel({ burst: 'Fallen!', kind: 'jail', ms: 2400, cast: [[c, 'sad', line(c, 'fall')]], text: `${p.name} leaves the field` }); break;
        case 'win': panel({ burst: 'Victory!', kind: 'win', ms: 3200, cast: [[c, 'happy', line(c, 'win')]], text: `${p.name} wins the game`, confetti: 90 }); break;
      }
    }
    if (prev) setTimeout(() => this.floats(s, prev), delay);
    // Never fall far behind the game: drop the oldest panels, keep the rest brisk.
    while (this.queue.length > 4) this.queue.shift();
    if (this.queue.length > 3) for (const q of this.queue) q.ms = Math.max(900, q.ms * 0.6);
    if (!this.current) setTimeout(() => this._next(), delay);
  }

  _next() {
    const p = this.queue.shift();
    if (!p) { this.current = null; return; }
    this.current = p;
    this.endsAt = Date.now() + p.ms;
    const el = document.createElement('div');
    el.className = `comic-panel k-${p.kind.split(' ').join(' k-')}`;
    el.style.setProperty('--c', p.color);
    const cast = p.cast.map(([ch, mood, say], k) => `
      <div class="cp-actor${k ? ' right' : ''}">
        <div class="cp-face">${portrait(ch, mood)}</div>
        ${say ? `<div class="bubble">${esc(say)}</div>` : ''}
      </div>`).join('');
    el.innerHTML = `
      <div class="cp-burst"><span>${esc(p.burst)}</span></div>
      ${p.card ? `<div class="cp-card">${icon(p.kind.includes('leela') ? 'flute' : 'diya')}<p>${esc(p.card)}</p></div>` : ''}
      <div class="cp-cast">${cast}</div>
      ${p.text ? `<p class="cp-text">${esc(p.text)}</p>` : ''}`;
    this._place(el);
    el.addEventListener('click', () => this._dismiss(el), { once: true });
    this.layer.append(el);
    this.onPanel(p);
    if (p.confetti && !reduced()) this.confetti(p.confetti);
    el._timer = setTimeout(() => this._dismiss(el), p.ms);
  }

  _dismiss(el) {
    if (el._gone) return;
    el._gone = true;
    clearTimeout(el._timer);
    el.classList.add('out');
    setTimeout(() => el.remove(), 260);
    this.endsAt = Date.now();
    setTimeout(() => this._next(), 120);
  }

  _place(el) {
    const r = this.board.getBoundingClientRect();
    el.style.left = `${r.left + r.width / 2}px`;
    el.style.top = `${r.top + r.height * 0.5}px`;
  }

  banner(p, s) {
    const old = this.layer.querySelector('.turn-banner');
    if (old) old.remove();
    const el = document.createElement('div');
    el.className = 'turn-banner';
    el.style.setProperty('--c', CHARACTERS[p.char].color);
    el.innerHTML = `<div class="tb-face">${portrait(p.char, 'idle', { headOnly: true })}</div>
      <div><b>${esc(p.name)}'s turn</b><span>${esc(line(p.char, 'turn'))}</span></div>`;
    const r = this.board.getBoundingClientRect();
    el.style.top = `${Math.max(8, r.top + r.height * 0.14)}px`;
    el.style.left = `${r.left + r.width / 2}px`;
    this.layer.append(el);
    setTimeout(() => el.remove(), reduced() ? 1200 : 1900);
  }

  floats(s, prev) {
    for (const p of s.players) {
      const before = prev.players.find((x) => x.id === p.id);
      if (!before || before.cash === p.cash) continue;
      const d = p.cash - before.cash;
      const pt = this.tokenPoint(p.id);
      if (!pt) continue;
      const el = document.createElement('div');
      el.className = `float ${d > 0 ? 'up' : 'down'}`;
      el.textContent = `${d > 0 ? '+' : ''}${d}`;
      el.style.left = `${pt.x}px`;
      el.style.top = `${pt.y}px`;
      this.layer.append(el);
      setTimeout(() => el.remove(), 1700);
    }
  }

  confetti(n = 60) {
    const colors = ['#E86A8E', '#F4A7BB', '#E9C46A', '#FBF3E0', '#1FA38D'];
    for (let k = 0; k < n; k++) {
      const el = document.createElement('i');
      el.className = 'petal';
      el.style.left = `${Math.random() * 100}vw`;
      el.style.background = colors[k % colors.length];
      el.style.animationDuration = `${2.6 + Math.random() * 2.4}s`;
      el.style.animationDelay = `${Math.random() * 0.8}s`;
      el.style.setProperty('--sway', `${(Math.random() * 120 - 60).toFixed(0)}px`);
      el.style.setProperty('--rot', `${(Math.random() * 720 - 360).toFixed(0)}deg`);
      this.layer.append(el);
      setTimeout(() => el.remove(), 6000);
    }
  }
}
