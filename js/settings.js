// Connection settings: Google STUN is always on; players can add their own TURN
// servers for networks that block direct peer connections.

const KEY = 'dk-net';
const SESSION_KEY = 'dk-net-shared';

export const GOOGLE_STUN = {
  urls: [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302',
    'stun:stun3.l.google.com:19302',
    'stun:stun4.l.google.com:19302',
  ],
};

const validUrl = (u) => /^(turns?|stun):[^\s]+$/i.test(u);
const splitUrls = (s) => String(s || '').split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);

function cleanServer(t) {
  if (!t || typeof t !== 'object') return null;
  const urls = splitUrls(t.urls).filter(validUrl);
  if (!urls.length) return null;
  return {
    urls: urls.join(' '),
    username: String(t.username || '').slice(0, 200),
    credential: String(t.credential || '').slice(0, 400),
  };
}

export function loadNet() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      turn: (Array.isArray(d.turn) ? d.turn : []).map(cleanServer).filter(Boolean),
      relayOnly: !!d.relayOnly,
      shareInvite: !!d.shareInvite,
    };
  } catch {
    return { turn: [], relayOnly: false, shareInvite: false };
  }
}

export function saveNet(cfg) {
  const clean = {
    turn: (cfg.turn || []).map(cleanServer).filter(Boolean),
    relayOnly: !!cfg.relayOnly,
    shareInvite: !!cfg.shareInvite,
  };
  localStorage.setItem(KEY, JSON.stringify(clean));
  return clean;
}

// TURN servers handed over in a host's invite link, kept for this tab only.
export function sharedTurn() {
  try {
    return (JSON.parse(sessionStorage.getItem(SESSION_KEY) || '[]') || []).map(cleanServer).filter(Boolean);
  } catch {
    return [];
  }
}
export function setSharedTurn(list) {
  const clean = (list || []).map(cleanServer).filter(Boolean);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(clean));
  return clean;
}

export function activeTurn() {
  const own = loadNet().turn;
  return own.length ? own : sharedTurn();
}

export function rtcConfig(override) {
  const cfg = override || loadNet();
  const turn = override ? cfg.turn : activeTurn();
  const iceServers = [GOOGLE_STUN, ...turn.map((t) => {
    const s = { urls: splitUrls(t.urls) };
    if (t.username) s.username = t.username;
    if (t.credential) s.credential = t.credential;
    return s;
  })];
  return { iceServers, iceTransportPolicy: cfg.relayOnly && turn.length ? 'relay' : 'all' };
}

// Base64url JSON, used in the invite link's #fragment (never sent to any server).
export function encodeTurn(list) {
  const json = JSON.stringify(list.map((t) => [t.urls, t.username, t.credential]));
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodeTurn(s) {
  try {
    const b = s.replace(/-/g, '+').replace(/_/g, '/');
    const arr = JSON.parse(decodeURIComponent(escape(atob(b))));
    return arr.map(([urls, username, credential]) => cleanServer({ urls, username, credential })).filter(Boolean);
  } catch {
    return [];
  }
}

// Gather ICE candidates to see which paths this network allows.
export async function testIce(config, timeout = 8000) {
  const found = { host: 0, srflx: 0, relay: 0 };
  if (!window.RTCPeerConnection) return { ...found, error: 'This browser does not support WebRTC.' };
  let pc;
  try {
    pc = new RTCPeerConnection(config);
    pc.createDataChannel('probe');
    const done = new Promise((resolve) => {
      const t = setTimeout(resolve, timeout);
      pc.onicecandidate = (e) => {
        if (!e.candidate) { clearTimeout(t); resolve(); return; }
        const m = / typ (host|srflx|prflx|relay)/.exec(e.candidate.candidate);
        if (m) found[m[1] === 'prflx' ? 'srflx' : m[1]]++;
      };
    });
    await pc.setLocalDescription(await pc.createOffer());
    await done;
    return found;
  } catch (e) {
    return { ...found, error: e.message || 'The test could not run.' };
  } finally {
    if (pc) pc.close();
  }
}
