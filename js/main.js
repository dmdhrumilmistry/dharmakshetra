// App controller: screens, lobby, host authority, guest sync, bots, voice,
// effects and animation.

import { CHARACTERS, CHARACTER_IDS, MAX_PLAYERS, TILES } from './data.js';
import { newGame, apply, player, phase } from './engine.js';
import { botAction } from './bot.js';
import { HostNet, GuestNet, makeCode, cleanCode } from './net.js';
import { Voice } from './voice.js';
import { Comic } from './comic.js';
import { loadNet, saveNet, rtcConfig, encodeTurn, decodeTurn, setSharedTurn, testIce } from './settings.js';
import * as UI from './ui.js';
import { play, soundOn, setSound } from './sound.js';

const $ = (sel) => document.querySelector(sel);
const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 16);
const cleanName = (n, fallback = 'Traveller') => String(n || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 16) || fallback;
const buzz = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch { /* optional */ } };

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
  voice: null,
  voiceRoster: new Map(), // host only: peerId -> { peerId, seatId, muted }
  ui: { krishnaPick: false, modal: null, seenTrade: null, lastRoll: -1, fxSeq: -1, prev: null, draft: null, boardBuilt: false, unread: 0, cash: {} },
  display: {},
};

let comic = null;

// ---------- small helpers ----------

function show(name) {
  for (const id of ['home', 'lobby', 'game']) $(`#screen-${id}`).hidden = id !== name;
  app.screen = name;
  document.body.dataset.screen = name;
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
  modalEl.dataset.kind = kind;
  app.ui.modal = { kind, arg, sticky };
  if (!matchMedia('(pointer: coarse)').matches) {
    const focusable = modalBox.querySelector('input:not([type=checkbox]), select, .btn.primary, .btn');
    if (focusable) focusable.focus({ preventScroll: true });
  }
}
function closeModal() {
  modalEl.hidden = true;
  modalBox.innerHTML = '';
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

function voiceMap() {
  const m = new Map();
  const roster = app.voice ? app.voice.roster : [];
  for (const r of roster) m.set(r.seatId, !!r.muted);
  return m;
}

function ctx() {
  return {
    controls,
    multiLocal: app.mode === 'local' && app.mySeats.length > 1,
    presence: app.presence,
    isHost: app.mode === 'host',
    krishnaPick: app.ui.krishnaPick,
    focus: focusId(),
    voice: voiceMap(),
  };
}

// ---------- home ----------

function renderHome() {
  $('#home-name').value = profile.name;
  $('#home-chars').innerHTML = CHARACTER_IDS.map((id) => `
    <button class="char-opt" role="radio" aria-checked="${id === profile.char}" data-char="${id}">
      ${UI.face(id)}<span>${CHARACTERS[id].name}</span></button>`).join('');
  $('#home-hero').innerHTML = UI.heroCard(profile.char);
  const save = loadSave();
  $('#btn-resume').hidden = !save;
  if (save) $('#btn-resume').textContent = `Resume your saved ${save.mode === 'host' ? 'online ' : ''}game (round ${save.state.round})`;
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
  play('chime');
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
  $('#lobby-share').hidden = !navigator.share || app.mode !== 'host';
  $('#lobby-status').textContent = app.ui.lobbyStatus || '';
  $('#lobby-add-human').hidden = app.mode !== 'local';
  $('#lobby-add-bot').hidden = !isHost;
  $('#lobby-start').hidden = !isHost;
  const full = app.lobby.seats.length >= MAX_PLAYERS;
  $('#lobby-add-human').disabled = full;
  $('#lobby-add-bot').disabled = full;
  $('#lobby-start').disabled = app.lobby.seats.length < 2;
  $('#lobby-chat').hidden = !online;
  const vm = voiceMap();

  $('#lobby-seats').innerHTML = app.lobby.seats.map((seat, k) => {
    const c = CHARACTERS[seat.char];
    const editable = canEditSeat(seat);
    const nameField = editable && !seat.isBot
      ? `<input value="${UI.esc(seat.name)}" maxlength="16" data-seat-name="${seat.id}" aria-label="Player name">`
      : `<div class="seat-name">${UI.esc(seat.name)}</div>`;
    const tags = [
      seat.isBot ? '<span class="tag">computer</span>' : '',
      seat.clientId === clientId && app.mode === 'guest' ? '<span class="tag">you</span>' : '',
      k === 0 && online ? '<span class="tag">host</span>' : '',
      vm.has(seat.id) ? `<span class="tag voice">${UI.uiIcon(vm.get(seat.id) ? 'micOff' : 'mic')}</span>` : '',
    ].join('');
    const removable = isHost && k > 0;
    return `<li class="seat" data-seat="${seat.id}" style="--c:${c.color}">
      <button class="seat-pick" data-pick="${seat.id}" ${editable ? '' : 'disabled'} title="${editable ? 'Change character' : c.name}">${UI.face(seat.char, { cls: 'bob' })}${editable ? '<span class="seat-edit">Change</span>' : ''}</button>
      <div class="seat-body">${nameField}<div class="seat-tags">${tags}</div><div class="seat-meta">${c.name}. <b>${UI.esc(c.power)}:</b> ${UI.esc(c.powerText)}</div></div>
      ${removable ? `<button class="btn small" data-remove="${seat.id}" aria-label="Remove ${UI.esc(seat.name)}">Remove</button>` : '<span></span>'}
    </li>`;
  }).join('');
  renderChat($('#lobby-chat-list'));
  renderVoice();
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
$('#lobby-share').addEventListener('click', () => {
  navigator.share({ title: 'Dharmakshetra', text: `Join my game of Dharmakshetra. Room code ${app.code}.`, url: inviteUrl() }).catch(() => {});
});

function openCharPicker(seatId) {
  const seat = app.lobby.seats.find((s) => s.id === seatId);
  if (!seat) return;
  const taken = takenChars(seat);
  openModal(`<div class="sheet"><div class="sheet-head plain"><h2>Choose a character</h2></div><div class="pad">
    <div class="char-grid">${CHARACTER_IDS.map((id) => `<button class="char-opt ink" data-act="pick-char" data-seat="${seatId}" data-char="${id}" aria-checked="${seat.char === id}" ${taken.has(id) ? 'disabled' : ''}>${UI.face(id)}<span>${CHARACTERS[id].name}</span></button>`).join('')}</div>
    <p class="muted">Each character carries one divine power for the whole game.</p></div>
    <div class="sheet-actions"><button class="btn ink" data-act="close">Close</button></div></div>`, 'pick');
}

function pickChar(seatId, char) {
  const seat = app.lobby.seats.find((s) => s.id === seatId);
  if (!seat || !CHARACTERS[char]) return;
  closeModal();
  play('chime');
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

function inviteUrl() {
  let url = `${location.origin}${location.pathname}?join=${app.code}`;
  const cfg = loadNet();
  if (cfg.shareInvite && cfg.turn.length) url += `#turn=${encodeTurn(cfg.turn)}`;
  return url;
}

function copyInvite() {
  const url = inviteUrl();
  const done = () => toast('Invite link copied. Send it to your friends.');
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(done, () => toast(url));
  else toast(url);
}

// ---------- voice ----------

function makeVoice() {
  app.voice = new Voice({
    announce: (on, muted) => {
      if (app.mode === 'guest') app.net && app.net.send({ t: 'voice-state', on, muted });
      else if (app.mode === 'host' && app.net && app.net.peer) {
        const id = app.net.peer.id;
        if (on) app.voiceRoster.set(id, { peerId: id, seatId: mySeatId(), muted });
        else app.voiceRoster.delete(id);
        hostVoiceBroadcast();
      }
    },
    onUpdate: () => { renderVoice(); refreshPlayers(); },
    onBlocked: (audio) => {
      toast('Tap anywhere to hear voice chat.');
      document.addEventListener('pointerdown', () => audio.play().catch(() => {}), { once: true });
    },
    onLevels: () => {
      const myS = mySeatId();
      document.querySelectorAll('[data-seat]').forEach((el) => {
        el.classList.toggle('speaking', app.voice.active && app.voice.speaking(el.dataset.seat, myS));
      });
    },
  });
}

const mySeatId = () => app.mySeats[0] || (app.lobby.seats.find((s) => s.clientId === clientId) || {}).id;

function hostVoiceBroadcast() {
  const roster = [...app.voiceRoster.values()];
  if (app.net) app.net.broadcast({ t: 'voice', roster });
  app.voice.setRoster(roster);
}

function renderVoice() {
  const online = app.mode === 'host' || app.mode === 'guest';
  const v = app.voice;
  document.querySelectorAll('[data-voice-slot]').forEach((slot) => {
    slot.hidden = !online || !v;
    if (!online || !v) return;
    if (!v.active) {
      const n = v.roster.length;
      slot.innerHTML = `<button class="btn small voice-btn" data-act="voice-join">${UI.uiIcon('headset')}<span>Join voice${n ? ` (${n})` : ''}</span></button>`;
    } else {
      slot.innerHTML = `<button class="btn small voice-btn on${v.muted ? ' muted' : ''}" data-act="voice-mute" aria-pressed="${v.muted}" title="${v.muted ? 'Unmute' : 'Mute'}">${UI.uiIcon(v.muted ? 'micOff' : 'mic')}<span>${v.muted ? 'Muted' : `Live${v.connectedCount() ? ` (${v.connectedCount() + 1})` : ''}`}</span></button>
        <button class="btn small icon-btn danger" data-act="voice-leave" aria-label="Leave voice" title="Leave voice">${UI.uiIcon('hangup')}</button>`;
    }
  });
}

async function joinVoice() {
  try {
    await app.voice.join();
    play('chime');
    toast('You are in voice chat.');
  } catch (e) {
    toast(e.message, true);
  }
}

// ---------- online: host ----------

function startHost() {
  resetApp();
  app.mode = 'host';
  app.code = makeCode();
  app.lobby = { seats: [{ id: nextSeatId(), name: myName(), char: profile.char, clientId, local: true }] };
  makeVoice();
  show('lobby');
  renderLobby('Opening a room...');
  openHostNet(false);
}

function openHostNet(resuming) {
  const net = new HostNet(app.code, {
    onPeer: (peer) => app.voice && app.voice.attach(peer),
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

function seatOfClient(cid) {
  const seats = app.state ? app.state.players : app.lobby.seats;
  return seats.find((s) => s.clientId === cid);
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
        app.net.send(key, { t: 'voice', roster: [...app.voiceRoster.values()] });
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
      app.net.send(key, { t: 'voice', roster: [...app.voiceRoster.values()] });
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
      const seat = cid && seatOfClient(cid);
      if (seat) addChat(seat.name, msg.text);
      return;
    }
    case 'voice-state': {
      const seat = cid && seatOfClient(cid);
      if (!seat) return;
      for (const [k, r] of app.voiceRoster) if (r.seatId === seat.id && k !== key) app.voiceRoster.delete(k);
      if (msg.on) app.voiceRoster.set(key, { peerId: key, seatId: seat.id, muted: !!msg.muted });
      else app.voiceRoster.delete(key);
      hostVoiceBroadcast();
    }
  }
}

function hostLeave(key) {
  const cid = app.peers.get(key);
  app.peers.delete(key);
  if (app.voiceRoster.delete(key)) hostVoiceBroadcast();
  if (!cid) return;
  if ([...app.peers.values()].includes(cid)) return;
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
  if (app.screen === 'game') {
    if (app.ui.modal?.kind !== 'sheet-chat') {
      app.ui.unread++;
      play('coin');
    }
    renderGame();
  }
}

function renderChat(el) {
  el.innerHTML = UI.chatHTML(app.chat);
  el.scrollTop = el.scrollHeight;
}

document.addEventListener('submit', (e) => {
  const form = e.target.closest('.chat-form');
  if (!form) return;
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

// ---------- online: guest ----------

function joinGame(code) {
  resetApp();
  app.mode = 'guest';
  app.code = code;
  sessionStorage.setItem('dk-guest', JSON.stringify({ code }));
  app.lobby = { seats: [] };
  makeVoice();
  show('lobby');
  renderLobby(`Connecting to room ${code}...`);
  const net = new GuestNet(code, {
    onPeer: (peer) => app.voice && app.voice.attach(peer),
    onOpen: () => {
      net.send({ t: 'hello', clientId, name: myName(), char: profile.char });
      if (app.voice && app.voice.active) net.send({ t: 'voice-state', on: true, muted: app.voice.muted });
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
    case 'voice':
      if (app.voice) app.voice.setRoster(msg.roster);
      if (app.screen === 'lobby') renderLobby();
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
  document.body.classList.toggle('online', app.mode !== 'local');
  if (!app.ui.boardBuilt) {
    UI.buildBoard($('#board'));
    app.ui.boardBuilt = true;
  }
  $('#tok-layer').innerHTML = '';
  comic.clear();
  const s = app.state;
  app.display = {};
  for (const p of s.players) app.display[p.id] = p.pos;
  app.ui.cash = {};
  if (fromExisting) {
    app.ui.fxSeq = s.fxSeq;
    app.ui.lastRoll = s.rollId;
  }
  app.ui.prev = s;
  UI.renderDice($('#dice'), s.dice);
  $('#game-chat').hidden = app.mode === 'local';
  $('#top-room').innerHTML = app.mode === 'local' ? '' : `Room <b>${UI.esc(app.code)}</b>`;
  renderSoundBtn();
  renderGame();
  renderVoice();
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
    let delay = a.type === 'BID' || a.type === 'PASS_BID' ? 550 : a.type === 'ROLL' ? 900 : 700;
    delay += animRemaining() * 150 + Math.min(comic.busy(), 4000);
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
  if (app.mode === 'host') makeVoice();
  enterGame(true);
  if (app.mode === 'host') {
    setNetStatus('Reopening your room...');
    openHostNet(true);
  }
  scheduleBots();
}

function resetApp() {
  if (app.voice) app.voice.leave();
  if (app.net) app.net.close();
  clearTimeout(botTimer);
  clearTimeout(animTimer);
  animTimer = null;
  if (comic) comic.clear();
  Object.assign(app, {
    mode: null, code: null, net: null, lobby: { seats: [] }, seatSeq: 0, state: null,
    presence: {}, mySeats: [], chat: [], peers: new Map(), voice: null, voiceRoster: new Map(),
  });
  Object.assign(app.ui, { krishnaPick: false, seenTrade: null, lastRoll: -1, fxSeq: -1, prev: null, draft: null, lobbyStatus: '', unread: 0, cash: {} });
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

function tokenPoint(id) {
  const el = document.querySelector(`.token[data-id="${id}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top };
}

function animateTokens() {
  if (animTimer) return;
  const tick = () => {
    const s = app.state;
    if (!s) { animTimer = null; return; }
    const hopping = new Set();
    const landed = [];
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
      if (d === p.pos) landed.push(d);
      left = Math.max(left, (p.pos - d + 40) % 40);
    }
    UI.renderTokens($('#tok-layer'), s, app.display, hopping, controls);
    for (const i of landed) {
      const t = document.querySelector(`.tile[data-i="${i}"]`);
      if (t) { t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash'); }
    }
    if (hopping.size) {
      play('hop');
      animTimer = setTimeout(tick, left > 12 ? 70 : 150);
    } else {
      animTimer = null;
    }
  };
  tick();
}

// ---------- rendering ----------

function countCash() {
  document.querySelectorAll('.pl-cash[data-cash]').forEach((el) => {
    const id = el.closest('[data-seat]')?.dataset.seat;
    if (!id) return;
    const to = Number(el.dataset.cash);
    const from = app.ui.cash[id] ?? to;
    if (from === to) return;
    el.classList.add(to > from ? 'gain' : 'loss');
    const start = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - start) / 700);
      const v = Math.round(from + (to - from) * (1 - (1 - k) ** 3));
      el.innerHTML = UI.gold(v);
      if (k < 1) requestAnimationFrame(step);
      else setTimeout(() => el.classList.remove('gain', 'loss'), 300);
    };
    requestAnimationFrame(step);
  });
  for (const p of app.state.players) app.ui.cash[p.id] = p.cash;
}

function rollDice(s) {
  const dice = $('#dice');
  const ch = $('#board .chakra');
  ch.classList.remove('spin');
  void ch.offsetWidth;
  ch.classList.add('spin');
  dice.classList.add('rolling');
  play('dice');
  buzz(25);
  let n = 0;
  const spin = setInterval(() => {
    UI.renderDice(dice, [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]);
    if (++n >= 8) {
      clearInterval(spin);
      UI.renderDice(dice, s.dice);
      dice.classList.remove('rolling');
      dice.classList.add('settle');
      setTimeout(() => dice.classList.remove('settle'), 400);
    }
  }, 70);
}

function refreshPlayers() {
  if (app.screen === 'game' && app.state) {
    const c = ctx();
    UI.renderPlayers($('#players'), app.state, c);
    UI.renderStrip($('#pstrip'), app.state, c);
    for (const p of app.state.players) app.ui.cash[p.id] = p.cash;
  } else if (app.screen === 'lobby') renderLobby();
}

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
    if (fresh) rollDice(s); else UI.renderDice($('#dice'), s.dice);
  }
  $('#round').textContent = s.status === 'playing' ? `Round ${s.round}` : 'Game over';
  if (phase(s) !== 'pre') app.ui.krishnaPick = false;
  UI.renderCentre($('#centre-ui'), s, c);
  UI.renderDock($('#dock-ui'), s, c);
  UI.renderPlayers($('#players'), s, c);
  UI.renderStrip($('#pstrip'), s, c);
  UI.renderRealms($('#realms'), $('#realms-title'), s, c.focus);
  $('#log').innerHTML = UI.logHTML(s, app.chat);
  renderFeed(s);
  countCash();

  const me = c.focus && player(s, c.focus);
  $('#btn-trade').disabled = !me || me.bankrupt || s.status !== 'playing' || !!s.trade;
  const badge = $('#chat-badge');
  badge.hidden = !app.ui.unread;
  badge.textContent = app.ui.unread > 9 ? '9+' : String(app.ui.unread);

  handleEffects(s);
  handleTrade(s);
  refreshModal(s, c);
}

function renderFeed(s) {
  const el = $('#feed');
  const last = s.log.slice(-6).reverse();
  const top = last[0] ? last[0].id : 0;
  el.innerHTML = last.map((l, k) => `<li class="${l.id > (app.ui.feedTop || 0) && app.ui.feedTop ? 'new' : ''}" style="opacity:${1 - k * 0.14}">${UI.esc(l.msg)}</li>`).join('');
  app.ui.feedTop = top;
}

function handleEffects(s) {
  if (s.fxSeq === app.ui.fxSeq) return;
  const first = app.ui.fxSeq === -1;
  app.ui.fxSeq = s.fxSeq;
  const prev = app.ui.prev;
  app.ui.prev = s;
  if (first || !s.fx || !s.fx.length) return;
  comic.play(s, prev, s.fx, { delay: animRemaining() * 150 + 120 });
  for (const f of s.fx) {
    if (f.kind === 'buy' || f.kind === 'auction') play('bell');
    else if (f.kind === 'rent' || f.kind === 'tax') { play('coin'); if (controls(f.player)) buzz([20, 40, 20]); }
    else if (f.kind === 'jail') { play('card'); buzz(60); }
    else if (f.kind === 'card') play('card');
    else if (f.kind === 'power' || f.kind === 'set' || f.kind === 'trade') play('chime');
    else if (f.kind === 'turn' && controls(f.player)) buzz(15);
    else if (f.kind === 'win') {
      play('win');
      setTimeout(() => openModal(UI.resultsHTML(app.state), 'results'), animRemaining() * 150 + 3400);
    }
  }
}

function handleTrade(s) {
  if (s.trade && controls(s.trade.to) && app.ui.seenTrade !== s.trade.id) {
    app.ui.seenTrade = s.trade.id;
    play('chime');
    openModal(UI.tradeReviewHTML(s), 'trade-review', s.trade.id, { sticky: true });
  }
}

function refreshModal(s, c) {
  const m = app.ui.modal;
  if (!m) return;
  if (m.kind === 'place') {
    // Keep the sketch, refresh only the deed and buttons.
    const fresh = document.createElement('div');
    fresh.innerHTML = UI.placeHTML(s, m.arg, c);
    const oldPad = modalBox.querySelector('.place > .pad');
    const oldAct = modalBox.querySelector('.place > .sheet-actions');
    if (oldPad && oldAct) {
      oldPad.replaceWith(fresh.querySelector('.place > .pad'));
      oldAct.replaceWith(fresh.querySelector('.place > .sheet-actions'));
    }
  } else if (m.kind === 'trade-review' && (!s.trade || s.trade.id !== m.arg)) closeModal();
  else if (m.kind === 'trade' && app.ui.draft) {
    if (s.trade || !player(s, app.ui.draft.from) || player(s, app.ui.draft.from).bankrupt) closeModal();
  } else if (m.kind === 'player') modalBox.innerHTML = UI.playerHTML(s, m.arg, c);
  else if (m.kind === 'sheet-realms') modalBox.querySelector('.realms').innerHTML = UI.realmsHTML(s, c.focus);
  else if (m.kind === 'sheet-log') modalBox.querySelector('.log').innerHTML = UI.logHTML(s, app.chat);
  else if (m.kind === 'sheet-chat') {
    const list = modalBox.querySelector('.chat-list');
    list.innerHTML = UI.chatHTML(app.chat);
    list.scrollTop = list.scrollHeight;
  }
}

function openPlace(i) {
  play('card');
  openModal(UI.placeHTML(app.state, i, ctx()), 'place', i);
}

function openSheet(kind) {
  const s = app.state;
  const c = ctx();
  if (kind === 'trade') return openTrade();
  if (kind === 'realms') {
    const p = c.focus && player(s, c.focus);
    openModal(`<div class="sheet"><div class="sheet-head plain"><h2>${p ? `${UI.esc(p.name)}'s realms` : 'Realms'}</h2></div>
      <div class="pad"><div class="realms">${UI.realmsHTML(s, c.focus)}</div></div>
      <div class="sheet-actions"><button class="btn ink primary" data-act="close">Close</button></div></div>`, 'sheet-realms');
  } else if (kind === 'log') {
    openModal(`<div class="sheet"><div class="sheet-head plain"><h2>Chronicle</h2></div>
      <div class="pad"><ul class="log ink-log">${UI.logHTML(s, app.chat)}</ul></div>
      <div class="sheet-actions"><button class="btn ink primary" data-act="close">Close</button></div></div>`, 'sheet-log');
  } else if (kind === 'chat') {
    app.ui.unread = 0;
    openModal(`<div class="sheet"><div class="sheet-head plain"><h2>Chat</h2></div>
      <div class="pad"><ul class="chat-list ink-log">${UI.chatHTML(app.chat)}</ul>
      <form class="chat-form"><input maxlength="200" placeholder="Message everyone" aria-label="Chat message"><button class="btn ink primary small">Send</button></form></div>
      <div class="sheet-actions"><button class="btn ink" data-act="close">Close</button></div></div>`, 'sheet-chat');
    const list = modalBox.querySelector('.chat-list');
    list.scrollTop = list.scrollHeight;
    renderGame();
  }
}

function openTrade() {
  const s = app.state;
  const from = focusId();
  if (!from || s.trade || s.status !== 'playing') {
    toast(s.trade ? 'Another trade is already waiting for an answer.' : 'You cannot trade right now.', true);
    return;
  }
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
  const t = e.target;
  if (app.ui.modal?.kind === 'settings') return settingsChange(t);
  const d = app.ui.draft;
  if (!d || app.ui.modal?.kind !== 'trade') return;
  if (t.matches('[data-side]')) {
    const list = d[t.dataset.side].tiles;
    const i = Number(t.value);
    if (t.checked) list.push(i); else list.splice(list.indexOf(i), 1);
  } else if (t.matches('[data-cash]')) {
    d[t.dataset.cash].cash = Math.max(0, Math.floor(Number(t.value) || 0));
  } else if (t.matches('[data-cards]')) {
    d[t.dataset.cards].cards = Math.max(0, Math.floor(Number(t.value) || 0));
  }
});

// ---------- connection settings ----------

let netDraft = null;
let netTest = null;
function openSettings() {
  netDraft = loadNet();
  netTest = null;
  renderSettings();
}
function renderSettings() {
  openModal(UI.settingsHTML(netDraft, { isHost: app.mode === 'host' || app.mode === null, test: netTest }), 'settings', null, { wide: true });
}
function readSettingsForm() {
  const rows = [...modalBox.querySelectorAll('.turn-row')].map((row) => ({
    urls: row.querySelector('[data-f="urls"]').value.trim(),
    username: row.querySelector('[data-f="username"]').value.trim(),
    credential: row.querySelector('[data-f="credential"]').value,
  }));
  netDraft.turn = rows;
  const relay = modalBox.querySelector('[data-f="relayOnly"]');
  const share = modalBox.querySelector('[data-f="shareInvite"]');
  netDraft.relayOnly = !!(relay && relay.checked);
  if (share) netDraft.shareInvite = share.checked;
}
function settingsChange() { readSettingsForm(); }

// ---------- one handler for every button with data-act ----------

document.addEventListener('click', async (e) => {
  const tile = e.target.closest('.tile');
  if (tile && app.state && !e.target.closest('.modal')) return openPlace(Number(tile.dataset.i));
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
      const p = player(app.state, by);
      openModal(`<form class="sheet" data-bid-form="${by}"><div class="sheet-head plain"><h2>Place a bid</h2></div><div class="pad">
        <p>Highest bid is ${a.high}. You hold ${p.cash}.</p>
        <div class="bid-row"><input type="number" inputmode="numeric" min="${a.high + 1}" max="${p.cash}" value="${Math.min(p.cash, a.high + 25)}" aria-label="Bid amount"></div></div>
        <div class="sheet-actions"><button class="btn ink primary">Place bid</button><button type="button" class="btn ink" data-act="close">Cancel</button></div></form>`, 'bid');
      break;
    }
    case 'pay-debt': send('PAY_DEBT', by); break;
    case 'open-realms': openSheet('realms'); break;
    case 'bankrupt':
      openModal(`<div class="sheet"><div class="sheet-head plain"><h2>Yield the game?</h2></div><div class="pad">
        <p>Your gold and holdings pass to whoever you owe, and you leave the game. This cannot be undone.</p></div>
        <div class="sheet-actions"><button class="btn ink danger-ink" data-act="bankrupt-confirm" data-by="${by}">Yield</button><button class="btn ink primary" data-act="close">Keep playing</button></div></div>`, 'confirm');
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
    case 'deed': openPlace(tileArg); break;
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
    case 'replace-bot': closeModal(); hostApply({ type: 'REPLACE_WITH_BOT', host: true, target: b.dataset.target }); break;
    case 'results': openModal(UI.resultsHTML(app.state), 'results'); break;
    case 'home': goHome(); break;
    case 'pick-char': pickChar(b.dataset.seat, b.dataset.char); break;
    case 'rules': openModal(UI.rulesHTML(), 'rules', null, { wide: true }); break;
    case 'player': openModal(UI.playerHTML(app.state, b.dataset.target, ctx()), 'player', b.dataset.target); break;
    case 'sheet': openSheet(b.dataset.sheet); break;
    case 'end-game': closeModal(); hostApply({ type: 'END_GAME', host: true }); break;
    case 'leave': goHome(); break;
    case 'copy-invite': copyInvite(); break;
    case 'settings': openSettings(); break;
    case 'turn-add': readSettingsForm(); netDraft.turn.push({ urls: '', username: '', credential: '' }); renderSettings(); break;
    case 'turn-remove': readSettingsForm(); netDraft.turn.splice(Number(b.dataset.row), 1); renderSettings(); break;
    case 'settings-test': {
      readSettingsForm();
      netTest = { running: true };
      renderSettings();
      const cfg = { ...netDraft, turn: netDraft.turn.filter((t) => t.urls) };
      netTest = await testIce(rtcConfig(cfg));
      if (app.ui.modal?.kind === 'settings') renderSettings();
      break;
    }
    case 'settings-save': {
      readSettingsForm();
      const bad = netDraft.turn.find((t) => t.urls && !/^(turns?|stun):/i.test(t.urls.split(/[\s,]+/)[0]));
      if (bad) { toast('TURN addresses start with turn: or turns: (for example turn:turn.example.com:3478).', true); break; }
      netDraft = saveNet(netDraft);
      closeModal();
      toast(app.net ? 'Saved. New connections, including voice, will use these settings.' : 'Connection settings saved.');
      break;
    }
    case 'voice-join': joinVoice(); break;
    case 'voice-mute': app.voice.toggleMute(); break;
    case 'voice-leave': app.voice.leave(); toast('You left voice chat.'); break;
  }
});

modalBox.addEventListener('click', (e) => {
  const who = e.target.closest('[data-trade-to]');
  if (who && app.ui.draft) {
    app.ui.draft.to = who.dataset.tradeTo;
    app.ui.draft.get = { cash: 0, tiles: [], cards: 0 };
    renderTradeModal();
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
  b.innerHTML = UI.uiIcon(soundOn() ? 'speaker' : 'speakerOff');
  b.setAttribute('aria-pressed', String(soundOn()));
  b.title = soundOn() ? 'Sound on' : 'Sound off';
}
$('#btn-menu').innerHTML = UI.uiIcon('menu');
document.querySelectorAll('[data-ico]').forEach((el) => { el.innerHTML = UI.uiIcon(el.dataset.ico); });
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
    <div class="sheet-actions menu-actions">
      ${app.mode === 'host' ? '<button class="btn ink" data-act="copy-invite">Copy invite link</button>' : ''}
      <button class="btn ink" data-act="rules">How to play</button>
      ${app.mode !== 'local' ? '<button class="btn ink" data-act="settings">Connection settings</button>' : ''}
      ${authority && s && s.status === 'playing' ? '<button class="btn ink" data-act="end-game">End game and count wealth</button>' : ''}
      <button class="btn ink" data-act="leave">Leave to start screen</button>
      <button class="btn ink primary" data-act="close">Back to the game</button>
    </div></div>`, 'menu');
});

// Keyboard: R rolls, E ends the turn, when nothing else has focus.
document.addEventListener('keydown', (e) => {
  if (app.screen !== 'game' || app.ui.modal || e.ctrlKey || e.metaKey || e.altKey) return;
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  const key = e.key.toLowerCase();
  const act = key === 'r' ? 'roll' : key === 'e' ? 'end' : null;
  if (!act) return;
  const btn = document.querySelector(`#centre-ui [data-act="${act}"], #dock-ui [data-act="${act}"]`);
  if (btn && !btn.disabled) {
    e.preventDefault();
    btn.click();
  }
});

// ---------- boot ----------

comic = new Comic($('#comic'), { board: $('#board'), tokenPoint });
$('.home-art').innerHTML = UI.homeArt();

// An invite link may carry the host's TURN servers in its #fragment.
const hash = new URLSearchParams(location.hash.slice(1));
if (hash.get('turn')) {
  const list = decodeTurn(hash.get('turn'));
  if (list.length) {
    setSharedTurn(list);
    toast('Using the relay server shared by your host.');
  }
  history.replaceState(null, '', location.pathname + location.search);
}

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
    toast(`Choose a name and character, then press Join game to enter room ${joinParam}.`);
  }
}
