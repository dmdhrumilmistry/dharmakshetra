// App controller: screens, lobby, host authority, guest sync, bots and animation.

import { CHARACTERS, CHARACTER_IDS, MAX_PLAYERS, TILES } from './data.js';
import { newGame, apply, player, phase } from './engine.js';
import { botAction } from './bot.js';
import { HostNet, GuestNet, makeCode, cleanCode } from './net.js';
import * as UI from './ui.js';
import { play, soundOn, setSound } from './sound.js';

const $ = (sel) => document.querySelector(sel);
const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 16);
const cleanName = (n, fallback = 'Traveller') => String(n || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 16) || fallback;

const profile = Object.assign({ name: '', char: 'krishna' }, JSON.parse(localStorage.getItem('dk-profile') || '{}'));
if (!CHARACTERS[profile.char]) profile.char = 'krishna';
const saveProfile = () => localStorage.setItem('dk-profile', JSON.stringify(profile));

let clientId = sessionStorage.getItem('dk-client');
if (!clientId) {
  clientId = randomId();
  sessionStorage.setItem('dk-client', clientId);
}

const app = {
  mode: null, // 'local' | 'host' | 'guest'
  code: null,
  net: null,
  lobby: { seats: [] },
  seatSeq: 0,
  state: null,
  presence: {},
  mySeats: [],
  chat: [],
  peers: new Map(), // host only: peer key -> clientId
  ui: { krishnaPick: false, modal: null, seenEvent: -1, seenTrade: null, lastRoll: -1, draft: null, boardBuilt: false },
  display: {},
};

// ---------- small helpers ----------

function show(name) {
  for (const id of ['home', 'lobby', 'game']) $(`#screen-${id}`).hidden = id !== name;
  app.screen = name;
  window.scrollTo(0, 0);
}

function toast(text, err = false) {
  const el = document.createElement('div');
  el.className = `toast${err ? ' err' : ''}`;
  el.textContent = text;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), err ? 4200 : 3000);
}

const modalEl = $('#modal');
const modalBox = modalEl.querySelector('.modal-box');
function openModal(html, kind = 'info', arg = null, { wide = false, sticky = false } = {}) {
  modalBox.innerHTML = html;
  modalBox.classList.toggle('wide', wide);
  modalEl.hidden = false;
  app.ui.modal = { kind, arg, sticky };
  const focusable = modalBox.querySelector('input, select, .btn.primary, .btn');
  if (focusable) focusable.focus({ preventScroll: true });
}
function closeModal() {
  modalEl.hidden = true;
  modalBox.innerHTML = '';
  clearTimeout(app.ui.cardTimer);
  app.ui.modal = null;
}
modalEl.querySelector('.modal-back').addEventListener('click', () => {
  if (!app.ui.modal || !app.ui.modal.sticky) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && app.ui.modal && !app.ui.modal.sticky) closeModal();
});

const controls = (id) => {
  const p = app.state && player(app.state, id);
  return !!p && !p.isBot && !p.bankrupt && app.mySeats.includes(id);
};

function focusId() {
  const s = app.state;
  if (!s) return null;
  const debt = s.debts.find((d) => controls(d.debtor));
  if (debt) return debt.debtor;
  if (s.buy && controls(s.buy.player)) return s.buy.player;
  const cur = s.players[s.cur];
  if (controls(cur.id)) return cur.id;
  if (app.mode === 'local' && app.ui.lastFocus && controls(app.ui.lastFocus)) return app.ui.lastFocus;
  return app.mySeats.find((id) => controls(id)) || app.mySeats[0] || null;
}

function ctx() {
  return {
    controls,
    multiLocal: app.mode === 'local' && app.mySeats.length > 1,
    presence: app.presence,
    isHost: app.mode === 'host',
    krishnaPick: app.ui.krishnaPick,
    focus: focusId(),
  };
}

// ---------- home ----------

function renderHome() {
  $('#home-name').value = profile.name;
  $('#home-chars').innerHTML = CHARACTER_IDS.map((id) => `
    <button class="char-opt" role="radio" aria-checked="${id === profile.char}" data-char="${id}">
      ${UI.charMed(id, 46)}<span>${CHARACTERS[id].name}</span></button>`).join('');
  const c = CHARACTERS[profile.char];
  $('#home-char-power').innerHTML = `<b>${c.name}, ${UI.esc(c.title.toLowerCase())}.</b> ${UI.esc(c.power)}: ${UI.esc(c.powerText)}`;
  const save = loadSave();
  $('#btn-resume').hidden = !save;
  if (save) $('#btn-resume').textContent = `Resume your saved ${save.mode === 'host' ? 'online' : ''} game (round ${save.state.round})`.replace('  ', ' ');
}

$('#home-name').addEventListener('input', (e) => {
  profile.name = e.target.value.slice(0, 16);
  saveProfile();
});
$('#home-chars').addEventListener('click', (e) => {
  const b = e.target.closest('[data-char]');
  if (!b) return;
  profile.char = b.dataset.char;
  saveProfile();
  renderHome();
  $(`[data-char="${profile.char}"]`).focus();
});
$('#btn-local').addEventListener('click', startLocal);
$('#btn-host').addEventListener('click', startHost);
$('#join-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const code = cleanCode($('#join-code').value);
  if (code.length < 4) {
    toast('Enter the room code your host shared.', true);
    return;
  }
  joinGame(code);
});
$('#btn-resume').addEventListener('click', resume);
$('#btn-rules').addEventListener('click', () => openModal(UI.rulesHTML(), 'rules', null, { wide: true }));

const myName = () => cleanName(profile.name, CHARACTERS[profile.char].name);

// ---------- lobby ----------

const takenChars = (exceptSeat) => new Set(app.lobby.seats.filter((s) => s !== exceptSeat).map((s) => s.char));
function freeChar(prefer, exceptSeat) {
  const taken = takenChars(exceptSeat);
  if (prefer && CHARACTERS[prefer] && !taken.has(prefer)) return prefer;
  return CHARACTER_IDS.find((c) => !taken.has(c));
}
const nextSeatId = () => `p${++app.seatSeq}`;

function startLocal() {
  resetApp();
  app.mode = 'local';
  app.lobby = { seats: [] };
  app.lobby.seats.push({ id: nextSeatId(), name: myName(), char: profile.char, local: true });
  addBot();
  show('lobby');
  renderLobby();
}

function addBot() {
  if (app.lobby.seats.length >= MAX_PLAYERS) return;
  const char = freeChar();
  app.lobby.seats.push({ id: nextSeatId(), name: CHARACTERS[char].name, char, isBot: true });
  lobbyChanged();
}

function addLocalHuman() {
  if (app.lobby.seats.length >= MAX_PLAYERS) return;
  const char = freeChar();
  const n = app.lobby.seats.filter((s) => !s.isBot).length + 1;
  app.lobby.seats.push({ id: nextSeatId(), name: `Player ${n}`, char, local: true });
  lobbyChanged();
}

function canEditSeat(seat) {
  if (app.mode === 'guest') return seat.clientId === clientId;
  return !!(seat.local || seat.isBot);
}

function renderLobby(status) {
  if (status !== undefined) app.ui.lobbyStatus = status;
  const online = app.mode !== 'local';
  const isHost = app.mode !== 'guest';
  $('#lobby-room').hidden = !online || !app.code;
  $('#lobby-code').textContent = app.code || '';
  $('#lobby-status').textContent = app.ui.lobbyStatus || '';
  $('#lobby-add-human').hidden = app.mode !== 'local';
  $('#lobby-add-bot').hidden = !isHost;
  $('#lobby-start').hidden = !isHost;
  const full = app.lobby.seats.length >= MAX_PLAYERS;
  $('#lobby-add-human').disabled = full;
  $('#lobby-add-bot').disabled = full;
  $('#lobby-start').disabled = app.lobby.seats.length < 2;
  $('#lobby-chat').hidden = !online;

  $('#lobby-seats').innerHTML = app.lobby.seats.map((seat, k) => {
    const c = CHARACTERS[seat.char];
    const editable = canEditSeat(seat);
    const nameField = editable && !seat.isBot
      ? `<input value="${UI.esc(seat.name)}" maxlength="16" data-seat-name="${seat.id}" aria-label="Player name">`
      : `<div class="seat-name">${UI.esc(seat.name)}${seat.isBot ? '<span class="tag">computer</span>' : ''}${seat.clientId === clientId && app.mode === 'guest' ? '<span class="tag">you</span>' : ''}${k === 0 && online ? '<span class="tag">host</span>' : ''}</div>`;
    const removable = isHost && k > 0;
    return `<li class="seat">
      <button class="seat-pick" data-pick="${seat.id}" ${editable ? '' : 'disabled'} title="${editable ? 'Change character' : c.name}">${UI.charMed(seat.char, 52)}</button>
      <div>${nameField}<div class="seat-meta">${c.name}. <b>${UI.esc(c.power)}:</b> ${UI.esc(c.powerText)}</div></div>
      ${removable ? `<button class="btn small" data-remove="${seat.id}">Remove</button>` : '<span></span>'}
    </li>`;
  }).join('');
  renderChat($('#lobby-chat-list'));
}

function lobbyChanged() {
  if (app.mode === 'host' && app.net) app.net.broadcast({ t: 'lobby', lobby: app.lobby, code: app.code });
  if (app.screen === 'lobby') renderLobby();
}

$('#lobby-seats').addEventListener('click', (e) => {
  const pick = e.target.closest('[data-pick]');
  if (pick) return openCharPicker(pick.dataset.pick);
  const rm = e.target.closest('[data-remove]');
  if (rm) {
    app.lobby.seats = app.lobby.seats.filter((s) => s.id !== rm.dataset.remove);
    lobbyChanged();
  }
});
$('#lobby-seats').addEventListener('input', (e) => {
  const id = e.target.dataset.seatName;
  if (!id) return;
  const seat = app.lobby.seats.find((s) => s.id === id);
  if (!seat) return;
  seat.name = cleanName(e.target.value, CHARACTERS[seat.char].name);
  if (app.lobby.seats[0] === seat && app.mode !== 'guest') {
    profile.name = seat.name;
    saveProfile();
  }
  if (app.mode === 'guest') app.net.send({ t: 'rename', name: seat.name });
  else if (app.mode === 'host') app.net.broadcast({ t: 'lobby', lobby: app.lobby, code: app.code });
});
$('#lobby-add-bot').addEventListener('click', addBot);
$('#lobby-add-human').addEventListener('click', addLocalHuman);
$('#lobby-start').addEventListener('click', startGame);
$('#lobby-back').addEventListener('click', () => goHome());
$('#lobby-copy').addEventListener('click', () => copyInvite());

function openCharPicker(seatId) {
  const seat = app.lobby.seats.find((s) => s.id === seatId);
  if (!seat) return;
  const taken = takenChars(seat);
  openModal(`<div class="sheet"><div class="sheet-head plain"><h2>Choose a character</h2></div><div class="pad">
    <div class="char-grid">${CHARACTER_IDS.map((id) => `<button class="char-opt" style="color:var(--ink)" data-act="pick-char" data-seat="${seatId}" data-char="${id}" aria-checked="${seat.char === id}" ${taken.has(id) ? 'disabled' : ''}>${UI.charMed(id, 46)}<span>${CHARACTERS[id].name}</span></button>`).join('')}</div>
    <p class="muted">Each character carries one divine power for the whole game.</p></div>
    <div class="sheet-actions"><button class="btn ink" data-act="close">Close</button></div></div>`, 'pick');
}

function pickChar(seatId, char) {
  const seat = app.lobby.seats.find((s) => s.id === seatId);
  if (!seat || !CHARACTERS[char]) return;
  closeModal();
  if (app.mode === 'guest') {
    app.net.send({ t: 'pick', char });
    profile.char = char;
    saveProfile();
    return;
  }
  if (takenChars(seat).has(char)) return toast('Another player already has that character.', true);
  const wasDefault = seat.isBot && seat.name === CHARACTERS[seat.char].name;
  seat.char = char;
  if (wasDefault) seat.name = CHARACTERS[char].name;
  if (app.lobby.seats[0] === seat) {
    profile.char = char;
    saveProfile();
  }
  lobbyChanged();
}

function copyInvite() {
  const url = `${location.origin}${location.pathname}?join=${app.code}`;
  const done = () => toast('Invite link copied. Send it to your friends.');
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(done, () => toast(url));
  else toast(url);
}

// ---------- online: host ----------

function startHost() {
  resetApp();
  app.mode = 'host';
  app.code = makeCode();
  app.lobby = { seats: [{ id: nextSeatId(), name: myName(), char: profile.char, clientId, local: true }] };
  show('lobby');
  renderLobby('Opening a room...');
  openHostNet(false);
}

function openHostNet(resuming) {
  const net = new HostNet(app.code, {
    onReady: () => {
      if (app.state) {
        setNetStatus(null);
        toast('Room reopened. Players can rejoin with the same code.');
      } else renderLobby('Your room is open. Share the code or the invite link.');
    },
    onMessage: hostMessage,
    onLeave: hostLeave,
    onError: (text, fatal) => {
      if (fatal && !app.state && /in use/.test(text)) {
        net.close();
        app.code = makeCode();
        renderLobby('Opening a room...');
        openHostNet(false);
        return;
      }
      if (app.state) setNetStatus(text); else renderLobby(text);
      if (fatal) toast(text, true);
    },
  });
  app.net = net;
  net.start({ persistentRetry: resuming }).catch((e) => {
    toast(e.message, true);
    renderLobby(e.message);
  });
}

function computePresence() {
  if (!app.state) return;
  const online = new Set(app.peers.values());
  app.presence = {};
  for (const p of app.state.players) {
    app.presence[p.id] = app.mode === 'local' || p.isBot || p.clientId === clientId || online.has(p.clientId);
  }
}

function sendState(key) {
  const msg = { t: 'state', state: app.state, presence: app.presence };
  if (key) app.net.send(key, msg); else app.net.broadcast(msg);
}

function hostMessage(key, msg) {
  const cid = app.peers.get(key);
  switch (msg.t) {
    case 'hello': {
      const id = String(msg.clientId || '').slice(0, 40);
      if (!id) return;
      app.peers.set(key, id);
      const name = cleanName(msg.name);
      if (app.state) {
        const p = app.state.players.find((x) => x.clientId === id);
        if (!p) {
          app.net.send(key, { t: 'error', text: 'This game has already begun. Ask the host to start a new one.', fatal: true });
          return;
        }
        app.net.send(key, { t: 'welcome', seatId: p.id, code: app.code });
        app.net.send(key, { t: 'chatlog', chat: app.chat.slice(-60) });
        computePresence();
        sendState();
        renderGame();
        return;
      }
      let seat = app.lobby.seats.find((s) => s.clientId === id);
      if (seat) seat.name = name;
      else {
        if (app.lobby.seats.length >= MAX_PLAYERS) {
          app.net.send(key, { t: 'error', text: 'This room is full.', fatal: true });
          return;
        }
        seat = { id: nextSeatId(), name, char: freeChar(msg.char), clientId: id };
        app.lobby.seats.push(seat);
      }
      app.net.send(key, { t: 'welcome', seatId: seat.id, code: app.code });
      app.net.send(key, { t: 'chatlog', chat: app.chat.slice(-60) });
      lobbyChanged();
      return;
    }
    case 'pick': {
      if (app.state || !cid) return;
      const seat = app.lobby.seats.find((s) => s.clientId === cid);
      if (seat && CHARACTERS[msg.char] && !takenChars(seat).has(msg.char)) seat.char = msg.char;
      else app.net.send(key, { t: 'toast', text: 'That character is taken.', err: true });
      lobbyChanged();
      return;
    }
    case 'rename': {
      if (app.state || !cid) return;
      const seat = app.lobby.seats.find((s) => s.clientId === cid);
      if (seat) seat.name = cleanName(msg.name, seat.name);
      lobbyChanged();
      return;
    }
    case 'action': {
      if (!app.state || !cid || !msg.action || typeof msg.action !== 'object') return;
      const p = app.state.players.find((x) => x.clientId === cid && !x.isBot);
      const action = { ...msg.action };
      delete action.host;
      if (!p || action.by !== p.id) {
        app.net.send(key, { t: 'toast', text: 'That move is not yours to make.', err: true });
        return;
      }
      hostApply(action, key);
      return;
    }
    case 'chat': {
      if (!cid) return;
      const seats = app.state ? app.state.players : app.lobby.seats;
      const seat = seats.find((s) => s.clientId === cid);
      if (seat) addChat(seat.name, msg.text);
    }
  }
}

function hostLeave(key) {
  const cid = app.peers.get(key);
  app.peers.delete(key);
  if (!cid) return;
  const stillHere = [...app.peers.values()].includes(cid);
  if (stillHere) return;
  if (!app.state) {
    app.lobby.seats = app.lobby.seats.filter((s) => s.clientId !== cid);
    lobbyChanged();
  } else {
    computePresence();
    sendState();
    renderGame();
  }
}

function addChat(from, text) {
  text = String(text || '').trim().slice(0, 200);
  if (!text) return;
  const entry = { from: cleanName(from), text, at: app.state ? app.state.logId : 0 };
  pushChat(entry);
  if (app.mode === 'host') app.net.broadcast({ t: 'chat', entry });
}

function pushChat(entry) {
  app.chat.push(entry);
  if (app.chat.length > 100) app.chat.shift();
  if (app.screen === 'lobby') renderChat($('#lobby-chat-list'));
  if (app.screen === 'game') renderGame();
}

function renderChat(el) {
  el.innerHTML = app.chat.slice(-50).map((c) => `<li><b>${UI.esc(c.from)}:</b> ${UI.esc(c.text)}</li>`).join('');
  el.scrollTop = el.scrollHeight;
}

for (const form of document.querySelectorAll('.chat-form')) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    if (app.mode === 'guest') app.net.send({ t: 'chat', text });
    else if (app.mode === 'host') {
      const me = app.state ? app.state.players.find((p) => p.clientId === clientId) : app.lobby.seats[0];
      addChat(me ? me.name : myName(), text);
    }
  });
}

// ---------- online: guest ----------

function joinGame(code) {
  resetApp();
  app.mode = 'guest';
  app.code = code;
  sessionStorage.setItem('dk-guest', JSON.stringify({ code }));
  app.lobby = { seats: [] };
  show('lobby');
  renderLobby(`Connecting to room ${code}...`);
  const net = new GuestNet(code, {
    onOpen: () => {
      net.send({ t: 'hello', clientId, name: myName(), char: profile.char });
      if (!app.state) renderLobby('Connected. Waiting for the host to begin.');
    },
    onMessage: guestMessage,
    onStatus: (text) => {
      if (app.state) setNetStatus(text);
      else if (text) renderLobby(text);
    },
    onError: (text, fatal) => {
      toast(text, true);
      if (fatal) goHome(true);
    },
  });
  app.net = net;
  net.start().catch((e) => {
    toast(e.message, true);
    goHome(true);
  });
}

function guestMessage(msg) {
  switch (msg.t) {
    case 'welcome':
      app.mySeats = [msg.seatId];
      return;
    case 'lobby':
      if (app.state) return;
      app.lobby = msg.lobby;
      if (app.screen !== 'lobby') show('lobby');
      renderLobby('Connected. Waiting for the host to begin.');
      return;
    case 'state': {
      const first = !app.state;
      app.state = msg.state;
      app.presence = msg.presence || {};
      if (first) enterGame(true);
      else renderGame();
      return;
    }
    case 'chat':
      pushChat(msg.entry);
      return;
    case 'chatlog':
      app.chat = Array.isArray(msg.chat) ? msg.chat : [];
      if (app.screen === 'lobby') renderChat($('#lobby-chat-list'));
      return;
    case 'toast':
      toast(msg.text, !!msg.err);
      return;
    case 'error':
      toast(msg.text, true);
      if (msg.fatal) goHome(true);
  }
}

function setNetStatus(text) {
  const el = $('#net-status');
  el.hidden = !text;
  el.textContent = text || '';
}

// ---------- game flow ----------

function startGame() {
  if (app.lobby.seats.length < 2) return toast('You need at least two players.', true);
  const seats = app.lobby.seats.map((s) => ({ id: s.id, name: cleanName(s.name, CHARACTERS[s.char].name), char: s.char, isBot: !!s.isBot, clientId: s.clientId || null }));
  if (app.mode === 'local') app.mySeats = seats.filter((s) => !s.isBot).map((s) => s.id);
  else app.mySeats = [seats[0].id];
  app.state = newGame(seats);
  computePresence();
  enterGame(false);
  commit();
}

function enterGame(fromExisting) {
  show('game');
  if (!app.ui.boardBuilt) {
    UI.buildBoard($('#board'));
    app.ui.boardBuilt = true;
  }
  const s = app.state;
  app.display = {};
  for (const p of s.players) app.display[p.id] = p.pos;
  if (fromExisting) {
    app.ui.seenEvent = s.event ? s.event.id : 0;
    app.ui.lastRoll = s.rollId;
  }
  UI.renderDice($('#dice'), s.dice);
  $('#game-chat').hidden = app.mode === 'local';
  $('#top-room').innerHTML = app.mode === 'local' ? '' : `Room <b>${UI.esc(app.code)}</b>`;
  renderSoundBtn();
  renderGame();
}

function send(type, by, extra = {}) {
  const action = { type, by, ...extra };
  if (app.mode === 'guest') {
    if (!app.net.send({ t: 'action', action })) toast('Not connected to the host. Reconnecting...', true);
    return;
  }
  hostApply(action);
}

function hostApply(action, fromKey) {
  const r = apply(app.state, action);
  if (r.error) {
    if (fromKey) app.net.send(fromKey, { t: 'toast', text: r.error, err: true });
    else if (!player(app.state, action.by)?.isBot) toast(r.error, true);
    return false;
  }
  app.state = r.state;
  commit();
  return true;
}

function commit() {
  persist();
  if (app.mode === 'host') {
    computePresence();
    sendState();
  }
  renderGame();
  scheduleBots();
}

// Bots run only on the host. One action at a time, paced for humans to follow.
let botTimer = null;
let botErrors = 0;
function scheduleBots() {
  clearTimeout(botTimer);
  const s = app.state;
  if (app.mode === 'guest' || !s || s.status !== 'playing') return;
  for (const p of s.players) {
    if (!p.isBot || p.bankrupt) continue;
    const a = botAction(s, p.id);
    if (!a) continue;
    let delay = a.type === 'BID' || a.type === 'PASS_BID' ? 500 : a.type === 'ROLL' ? 850 : 650;
    delay += animRemaining() * 110;
    botTimer = setTimeout(() => {
      if (app.state !== s) return scheduleBots();
      if (hostApply({ ...a, by: p.id })) botErrors = 0;
      else if (++botErrors < 3) scheduleBots();
    }, delay);
    return;
  }
}

// ---------- persistence ----------

function persist() {
  if (app.mode === 'guest' || !app.state) return;
  if (app.state.status !== 'playing') {
    localStorage.removeItem('dk-save');
    return;
  }
  try {
    localStorage.setItem('dk-save', JSON.stringify({
      mode: app.mode, code: app.code, state: app.state, chat: app.chat.slice(-40), clientId, mySeats: app.mySeats, at: Date.now(),
    }));
  } catch { /* storage full or disabled */ }
}

function loadSave() {
  try {
    const d = JSON.parse(localStorage.getItem('dk-save') || 'null');
    return d && d.state && d.state.status === 'playing' ? d : null;
  } catch {
    return null;
  }
}

function resume() {
  const d = loadSave();
  if (!d) return;
  resetApp();
  app.mode = d.mode;
  app.code = d.code;
  app.chat = d.chat || [];
  if (d.clientId) {
    clientId = d.clientId;
    sessionStorage.setItem('dk-client', clientId);
  }
  app.state = d.state;
  app.mySeats = d.mySeats || app.state.players.filter((p) => !p.isBot).map((p) => p.id);
  computePresence();
  enterGame(true);
  if (app.mode === 'host') {
    setNetStatus('Reopening your room...');
    openHostNet(true);
  }
  scheduleBots();
}

function resetApp() {
  if (app.net) app.net.close();
  clearTimeout(botTimer);
  clearTimeout(animTimer);
  animTimer = null;
  Object.assign(app, {
    mode: null, code: null, net: null, lobby: { seats: [] }, seatSeq: 0, state: null,
    presence: {}, mySeats: [], chat: [], peers: new Map(),
  });
  Object.assign(app.ui, { krishnaPick: false, seenEvent: -1, seenTrade: null, lastRoll: -1, draft: null, lobbyStatus: '' });
  setNetStatus(null);
  closeModal();
}

function goHome(silent) {
  if (app.mode === 'guest') sessionStorage.removeItem('dk-guest');
  resetApp();
  history.replaceState(null, '', location.pathname);
  show('home');
  renderHome();
  if (!silent) window.scrollTo(0, 0);
}

// ---------- tokens ----------

let animTimer = null;
function animRemaining() {
  const s = app.state;
  if (!s) return 0;
  let n = 0;
  for (const p of s.players) {
    const d = app.display[p.id];
    if (d !== undefined && d !== p.pos) n = Math.max(n, (p.pos - d + 40) % 40);
  }
  return Math.min(n, 40);
}

function animateTokens() {
  if (animTimer) return;
  const tick = () => {
    const s = app.state;
    if (!s) { animTimer = null; return; }
    const hopping = new Set();
    let left = 0;
    for (const p of s.players) {
      let d = app.display[p.id];
      if (d === undefined || p.bankrupt) { app.display[p.id] = p.pos; continue; }
      if (d === p.pos) continue;
      const lm = s.lastMove && s.lastMove.player === p.id ? s.lastMove : null;
      if (lm && lm.direct && lm.to === p.pos) d = p.pos;
      else if (lm && lm.back && lm.to === p.pos) d = (d + 39) % 40;
      else d = (d + 1) % 40;
      app.display[p.id] = d;
      hopping.add(p.id);
      left = Math.max(left, (p.pos - d + 40) % 40);
    }
    UI.updateTokens($('#board'), s, app.display, hopping);
    if (hopping.size) {
      play('hop');
      animTimer = setTimeout(tick, left > 12 ? 60 : 130);
    } else {
      animTimer = null;
    }
  };
  tick();
}

// ---------- rendering ----------

function renderGame() {
  const s = app.state;
  if (!s || app.screen !== 'game') return;
  const board = $('#board');
  const c = ctx();
  if (c.focus) app.ui.lastFocus = c.focus;

  UI.updateTiles(board, s);
  animateTokens();

  if (s.rollId !== app.ui.lastRoll) {
    const fresh = app.ui.lastRoll !== -1;
    app.ui.lastRoll = s.rollId;
    UI.renderDice($('#dice'), s.dice);
    if (fresh) {
      const dice = $('#dice');
      const ch = board.querySelector('.chakra');
      dice.classList.remove('roll');
      ch.classList.remove('spin');
      void dice.offsetWidth;
      dice.classList.add('roll');
      ch.classList.add('spin');
      play('dice');
    }
  }
  $('#round').textContent = s.status === 'playing' ? `Round ${s.round}` : 'Game over';
  if (phase(s) !== 'pre') app.ui.krishnaPick = false;
  UI.renderCentre($('#centre-ui'), s, c);
  UI.renderPlayers($('#players'), s, c);
  UI.renderRealms($('#realms'), $('#realms-title'), s, c.focus);
  UI.renderLog($('#log'), s, app.chat);

  const me = c.focus && player(s, c.focus);
  $('#btn-trade').disabled = !me || me.bankrupt || s.status !== 'playing' || !!s.trade;

  handleEvents(s, c);
  refreshModal(s, c);
}

function handleEvents(s, c) {
  const ev = s.event;
  if (ev && ev.id !== app.ui.seenEvent) {
    const first = app.ui.seenEvent === -1;
    app.ui.seenEvent = ev.id;
    if (!first) {
      if (ev.kind === 'card') {
        play('card');
        const delay = animRemaining() * 120 + 250;
        setTimeout(() => {
          if (app.state !== s && app.state.event?.id !== ev.id) return;
          if (app.ui.modal && app.ui.modal.kind !== 'card') {
            toast(`${player(s, ev.player).name}: ${ev.text}`);
            return;
          }
          openModal(UI.cardHTML(s, ev), 'card');
          clearTimeout(app.ui.cardTimer);
          app.ui.cardTimer = setTimeout(() => app.ui.modal?.kind === 'card' && closeModal(), controls(ev.player) ? 7000 : 4500);
        }, delay);
      } else if (ev.kind === 'buy') {
        play('bell');
        toast(`${player(s, ev.player).name} claims ${TILES[ev.tile].name}.`);
      } else if (ev.kind === 'power') {
        play('chime');
        const p = player(s, ev.player);
        toast(`${p.name} invokes ${CHARACTERS[p.char].power}.`);
      } else if (ev.kind === 'trade') {
        play('coin');
      } else if (ev.kind === 'win') {
        play('win');
        setTimeout(() => openModal(UI.resultsHTML(app.state), 'results'), animRemaining() * 120 + 400);
      }
    }
  }
  // An offer addressed to a player at this screen.
  if (s.trade && controls(s.trade.to) && app.ui.seenTrade !== s.trade.id) {
    app.ui.seenTrade = s.trade.id;
    play('chime');
    openModal(UI.tradeReviewHTML(s), 'trade-review', s.trade.id, { sticky: true });
  }
}

function refreshModal(s, c) {
  const m = app.ui.modal;
  if (!m) return;
  if (m.kind === 'deed') modalBox.innerHTML = UI.deedHTML(s, m.arg, c);
  else if (m.kind === 'trade-review' && (!s.trade || s.trade.id !== m.arg)) closeModal();
  else if (m.kind === 'trade' && app.ui.draft) {
    if (s.trade || !player(s, app.ui.draft.from) || player(s, app.ui.draft.from).bankrupt) closeModal();
  }
}

function openDeed(i) {
  openModal(UI.deedHTML(app.state, i, ctx()), 'deed', i);
}

function openTrade() {
  const s = app.state;
  const from = focusId();
  if (!from || s.trade) return;
  const others = s.players.filter((p) => !p.bankrupt && p.id !== from);
  if (!others.length) return;
  app.ui.draft = { from, to: others[0].id, give: { cash: 0, tiles: [], cards: 0 }, get: { cash: 0, tiles: [], cards: 0 } };
  renderTradeModal();
}

function renderTradeModal() {
  const d = app.ui.draft;
  openModal(UI.tradeHTML(app.state, d.from, d.to, d), 'trade', null, { wide: true });
}

modalBox.addEventListener('change', (e) => {
  const d = app.ui.draft;
  if (!d || app.ui.modal?.kind !== 'trade') return;
  const t = e.target;
  if (t.matches('[data-trade-to]')) {
    d.to = t.value;
    d.get = { cash: 0, tiles: [], cards: 0 };
    renderTradeModal();
  } else if (t.matches('[data-side]')) {
    const list = d[t.dataset.side].tiles;
    const i = Number(t.value);
    if (t.checked) list.push(i); else list.splice(list.indexOf(i), 1);
  } else if (t.matches('[data-cash]')) {
    d[t.dataset.cash].cash = Math.max(0, Math.floor(Number(t.value) || 0));
  } else if (t.matches('[data-cards]')) {
    d[t.dataset.cards].cards = Math.max(0, Math.floor(Number(t.value) || 0));
  }
});

// ---------- one handler for every button with data-act ----------

document.addEventListener('click', (e) => {
  const tile = e.target.closest('.tile');
  if (tile && app.state) return openDeed(Number(tile.dataset.i));
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const by = b.dataset.by;
  const tileArg = b.dataset.tile !== undefined ? Number(b.dataset.tile) : undefined;
  switch (b.dataset.act) {
    case 'close': closeModal(); break;
    case 'roll': send('ROLL', by); break;
    case 'end': send('END_TURN', by); break;
    case 'buy': send('BUY', by); break;
    case 'decline': send('DECLINE', by); break;
    case 'bid': send('BID', by, { amount: Number(b.dataset.amount) }); break;
    case 'pass-bid': send('PASS_BID', by); break;
    case 'bid-custom': {
      const a = app.state.auction;
      openModal(`<form class="sheet" data-bid-form="${by}"><div class="sheet-head plain"><h2>Place a bid</h2></div><div class="pad">
        <p>Highest bid is ${a.high}. You hold ${player(app.state, by).cash}.</p>
        <div class="bid-row"><input type="number" min="${a.high + 1}" max="${player(app.state, by).cash}" value="${a.high + 25}" aria-label="Bid amount"></div></div>
        <div class="sheet-actions"><button class="btn ink primary">Place bid</button><button type="button" class="btn ink" data-act="close">Cancel</button></div></form>`, 'bid');
      break;
    }
    case 'pay-debt': send('PAY_DEBT', by); break;
    case 'bankrupt':
      openModal(`<div class="sheet"><div class="sheet-head plain"><h2>Yield the game?</h2></div><div class="pad">
        <p>Your gold and holdings pass to whoever you owe, and you leave the game. This cannot be undone.</p></div>
        <div class="sheet-actions"><button class="btn danger ink" style="border-color:var(--sindoor);color:var(--sindoor)" data-act="bankrupt-confirm" data-by="${by}">Yield</button><button class="btn ink primary" data-act="close">Keep playing</button></div></div>`, 'confirm');
      break;
    case 'bankrupt-confirm': closeModal(); send('BANKRUPT', by); break;
    case 'pay-jail': send('PAY_JAIL', by); break;
    case 'jail-card': send('USE_JAIL_CARD', by); break;
    case 'power': {
      const p = player(app.state, by);
      if (p.char === 'krishna') {
        app.ui.krishnaPick = true;
        renderGame();
      } else send('USE_POWER', by);
      break;
    }
    case 'krishna': app.ui.krishnaPick = false; send('USE_POWER', by, { value: Number(b.dataset.value) }); break;
    case 'krishna-cancel': app.ui.krishnaPick = false; renderGame(); break;
    case 'deed': openDeed(tileArg); break;
    case 'build': send('BUILD', by, { tile: tileArg }); break;
    case 'sell': send('SELL', by, { tile: tileArg }); break;
    case 'mortgage': send('MORTGAGE', by, { tile: tileArg }); break;
    case 'unmortgage': send('UNMORTGAGE', by, { tile: tileArg }); break;
    case 'propose': {
      const d = app.ui.draft;
      closeModal();
      send('PROPOSE_TRADE', d.from, { to: d.to, give: d.give, get: d.get });
      break;
    }
    case 'accept-trade': closeModal(); send('ACCEPT_TRADE', by); break;
    case 'reject-trade': closeModal(); send('REJECT_TRADE', by); break;
    case 'cancel-trade': send('CANCEL_TRADE', by); break;
    case 'replace-bot': hostApply({ type: 'REPLACE_WITH_BOT', host: true, target: b.dataset.target }); break;
    case 'results': openModal(UI.resultsHTML(app.state), 'results'); break;
    case 'home': goHome(); break;
    case 'pick-char': pickChar(b.dataset.seat, b.dataset.char); break;
    case 'rules': openModal(UI.rulesHTML(), 'rules', null, { wide: true }); break;
    case 'end-game':
      closeModal();
      hostApply({ type: 'END_GAME', host: true });
      break;
    case 'leave': goHome(); break;
  }
});

modalBox.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-bid-form]');
  if (!f) return;
  e.preventDefault();
  const amount = Math.floor(Number(f.querySelector('input').value));
  closeModal();
  send('BID', f.dataset.bidForm, { amount });
});

$('#btn-trade').addEventListener('click', openTrade);
$('#btn-sound').addEventListener('click', () => {
  setSound(!soundOn());
  renderSoundBtn();
  if (soundOn()) play('chime');
});
function renderSoundBtn() {
  const b = $('#btn-sound');
  b.textContent = soundOn() ? 'Sound on' : 'Sound off';
  b.setAttribute('aria-pressed', String(soundOn()));
}
$('#btn-menu').addEventListener('click', () => {
  const s = app.state;
  const authority = app.mode !== 'guest';
  const leaveNote = app.mode === 'guest'
    ? 'Your seat stays in the game. Rejoin with the same code from this tab, or the host can hand it to the computer.'
    : app.mode === 'host'
      ? 'The game is saved on this device. While you are away, nobody can play. Resume it from the start screen.'
      : 'The game is saved on this device. Resume it from the start screen.';
  openModal(`<div class="sheet"><div class="sheet-head plain"><h2>Menu</h2></div><div class="pad">
    ${app.mode !== 'local' ? `<p>Room code <b>${UI.esc(app.code)}</b></p>` : ''}
    <p class="muted">${leaveNote}</p></div>
    <div class="sheet-actions">
      ${app.mode === 'host' ? '<button class="btn ink" data-act="copy-invite">Copy invite link</button>' : ''}
      <button class="btn ink" data-act="rules">How to play</button>
      ${authority && s && s.status === 'playing' ? '<button class="btn ink" data-act="end-game">End game and count wealth</button>' : ''}
      <button class="btn ink" data-act="leave">Leave to start screen</button>
      <button class="btn ink primary" data-act="close">Back to the game</button>
    </div></div>`, 'menu');
});
modalBox.addEventListener('click', (e) => {
  if (e.target.closest('[data-act="copy-invite"]')) copyInvite();
});

// Keyboard: R rolls, E ends the turn, when nothing else has focus.
document.addEventListener('keydown', (e) => {
  if (app.screen !== 'game' || app.ui.modal || e.ctrlKey || e.metaKey || e.altKey) return;
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  const key = e.key.toLowerCase();
  const act = key === 'r' ? 'roll' : key === 'e' ? 'end' : null;
  if (!act) return;
  const btn = document.querySelector(`#centre-ui [data-act="${act}"]`);
  if (btn && !btn.disabled) {
    e.preventDefault();
    btn.click();
  }
});

// ---------- boot ----------

$('.home-art').innerHTML = UI.homeArt();
renderHome();
const params = new URLSearchParams(location.search);
const joinParam = cleanCode(params.get('join'));
const guestSession = JSON.parse(sessionStorage.getItem('dk-guest') || 'null');
if (guestSession && guestSession.code) {
  joinGame(guestSession.code);
} else {
  show('home');
  if (joinParam) {
    $('#join-code').value = joinParam;
    $('#home-name').focus();
    toast(`Choose a name and character, then press Join game to enter room ${joinParam}.`);
  }
}
