// Peer-to-peer networking over WebRTC data channels.
// PeerJS's free public broker is used only to exchange connection offers;
// all game traffic flows directly between browsers. NAT traversal uses
// Google's public STUN servers plus any TURN servers set in Connection settings.

import { rtcConfig } from './settings.js';

const PEER_SRC = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
export const PREFIX = 'dharmakshetra-v1-';

const peerOpts = () => ({ config: rtcConfig(), debug: 1 });
const PING_MS = 4000;
const DEAD_MS = 14000;

let loading = null;
function loadPeer() {
  if (window.Peer) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = PEER_SRC;
      s.onload = resolve;
      s.onerror = () => {
        loading = null;
        reject(new Error('Could not load the networking library. Check your internet connection.'));
      };
      document.head.append(s);
    });
  }
  return loading;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function makeCode() {
  let c = '';
  const buf = new Uint32Array(5);
  crypto.getRandomValues(buf);
  for (const n of buf) c += ALPHABET[n % ALPHABET.length];
  return c;
}
export const cleanCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);

function describe(err) {
  switch (err && err.type) {
    case 'peer-unavailable': return 'No game found with that code. Check the code and make sure the host is still online.';
    case 'unavailable-id': return 'That room code is already in use.';
    case 'network':
    case 'server-error':
    case 'socket-error':
    case 'socket-closed': return 'Lost contact with the connection broker. Retrying...';
    case 'browser-incompatible': return 'This browser does not support WebRTC. Try a recent Chrome, Firefox, Edge or Safari.';
    default: return (err && err.message) || 'A connection error occurred.';
  }
}

// ---------- host ----------

export class HostNet {
  constructor(code, handlers) {
    this.code = code;
    this.h = handlers; // { onReady, onMessage(peerKey, msg), onLeave(peerKey), onError(text, fatal) }
    this.conns = new Map(); // peerKey -> { conn, last }
    this.peer = null;
    this.timer = null;
    this.retries = 0;
  }

  async start({ persistentRetry = false } = {}) {
    await loadPeer();
    this.persistentRetry = persistentRetry;
    this._open();
    this.timer = setInterval(() => this._sweep(), PING_MS);
  }

  _open() {
    const peer = new window.Peer(PREFIX + this.code, peerOpts());
    this.peer = peer;
    if (this.h.onPeer) this.h.onPeer(peer);
    peer.on('open', () => { this.retries = 0; this.h.onReady(); });
    peer.on('connection', (conn) => this._accept(conn));
    peer.on('disconnected', () => {
      if (!peer.destroyed) setTimeout(() => !peer.destroyed && peer.reconnect(), 1500);
    });
    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        // When resuming, the broker may still hold our old id for a short while.
        if (this.persistentRetry && this.retries++ < 20) {
          peer.destroy();
          this.h.onError('Reclaiming your room code...', false);
          setTimeout(() => this._open(), 3000);
          return;
        }
        this.h.onError(describe(err), true);
        return;
      }
      if (err.type === 'peer-unavailable') return; // a guest vanished mid-handshake
      this.h.onError(describe(err), err.type === 'browser-incompatible');
      // Could not register with the broker at all (network blip): try again.
      if (!peer.open && !this.closed && ['network', 'server-error', 'socket-error', 'socket-closed'].includes(err.type)) {
        peer.destroy();
        setTimeout(() => { if (!this.closed) this._open(); }, 3000);
      }
    });
  }

  _accept(conn) {
    const key = conn.peer;
    conn.on('open', () => {
      const old = this.conns.get(key);
      if (old && old.conn !== conn) old.conn.close();
      this.conns.set(key, { conn, last: Date.now() });
    });
    conn.on('data', (msg) => {
      const e = this.conns.get(key);
      if (e) e.last = Date.now();
      if (!msg || typeof msg !== 'object') return;
      if (msg.t === 'ping') { this._raw(conn, { t: 'pong' }); return; }
      this.h.onMessage(key, msg);
    });
    const gone = () => {
      const e = this.conns.get(key);
      if (e && e.conn === conn) {
        this.conns.delete(key);
        this.h.onLeave(key);
      }
    };
    conn.on('close', gone);
    conn.on('error', gone);
  }

  _sweep() {
    const now = Date.now();
    for (const [key, e] of this.conns) {
      if (now - e.last > DEAD_MS) {
        this.conns.delete(key);
        try { e.conn.close(); } catch { /* already closed */ }
        this.h.onLeave(key);
      } else {
        this._raw(e.conn, { t: 'pong' });
      }
    }
  }

  _raw(conn, msg) {
    try { if (conn.open) conn.send(msg); } catch { /* channel closing */ }
  }

  send(key, msg) {
    const e = this.conns.get(key);
    if (e) this._raw(e.conn, msg);
  }

  broadcast(msg) {
    for (const e of this.conns.values()) this._raw(e.conn, msg);
  }

  close() {
    this.closed = true;
    clearInterval(this.timer);
    for (const e of this.conns.values()) try { e.conn.close(); } catch { /* ignore */ }
    this.conns.clear();
    if (this.peer) this.peer.destroy();
  }
}

// ---------- guest ----------

export class GuestNet {
  constructor(code, handlers) {
    this.code = code;
    this.h = handlers; // { onOpen, onMessage(msg), onStatus(text|null), onError(text, fatal) }
    this.peer = null;
    this.conn = null;
    this.last = 0;
    this.backoff = 1000;
    this.closed = false;
    this.everConnected = false;
    this.timer = null;
  }

  async start() {
    await loadPeer();
    this._ensurePeer();
    this.timer = setInterval(() => this._tick(), PING_MS);
  }

  _ensurePeer() {
    if (this.peer && !this.peer.destroyed) {
      // A peer that never received an id from the broker cannot recover; start over.
      if (!this.peer.id) this.peer.destroy();
      else {
        if (this.peer.disconnected) this.peer.reconnect();
        else if (this.peer.open) this._connect();
        return;
      }
    }
    const peer = new window.Peer(peerOpts());
    this.peer = peer;
    if (this.h.onPeer) this.h.onPeer(peer);
    peer.on('open', () => this._connect());
    peer.on('disconnected', () => {
      if (!peer.destroyed && !this.closed) setTimeout(() => !peer.destroyed && peer.reconnect(), 1500);
    });
    peer.on('error', (err) => {
      if (err.type === 'peer-unavailable') {
        if (!this.everConnected) { this.h.onError(describe(err), true); this.close(); return; }
        this._retry();
        return;
      }
      this.h.onStatus(describe(err));
      this._retry();
    });
  }

  _connect() {
    if (this.closed) return;
    if (this.conn) try { this.conn.close(); } catch { /* ignore */ }
    const conn = this.peer.connect(PREFIX + this.code, { reliable: true, serialization: 'json' });
    this.conn = conn;
    conn.on('open', () => {
      this.everConnected = true;
      this.backoff = 1000;
      this.last = Date.now();
      this.h.onStatus(null);
      this.h.onOpen();
    });
    conn.on('data', (msg) => {
      this.last = Date.now();
      if (msg && msg.t !== 'pong') this.h.onMessage(msg);
    });
    conn.on('close', () => { if (this.conn === conn) this._retry(); });
    conn.on('error', () => { if (this.conn === conn) this._retry(); });
  }

  _retry() {
    if (this.closed || this.retrying) return;
    this.retrying = true;
    this.h.onStatus('Connection lost. Reconnecting...');
    setTimeout(() => {
      this.retrying = false;
      if (!this.closed) this._ensurePeer();
    }, this.backoff);
    this.backoff = Math.min(this.backoff * 2, 8000);
  }

  _tick() {
    if (!this.conn || !this.conn.open) return;
    if (Date.now() - this.last > DEAD_MS) {
      try { this.conn.close(); } catch { /* ignore */ }
      this._retry();
      return;
    }
    try { this.conn.send({ t: 'ping' }); } catch { /* ignore */ }
  }

  send(msg) {
    if (this.conn && this.conn.open) {
      try { this.conn.send(msg); return true; } catch { return false; }
    }
    return false;
  }

  close() {
    this.closed = true;
    clearInterval(this.timer);
    if (this.conn) try { this.conn.close(); } catch { /* ignore */ }
    if (this.peer) this.peer.destroy();
  }
}
