// Voice chat: a small full mesh of WebRTC audio calls over PeerJS.
// The host keeps the roster of who is in voice and shares it; every member
// calls the members whose peer id sorts after its own, so each pair connects once.

const RETRY_MS = 4000;

export class Voice {
  constructor(hooks) {
    // hooks: { announce(on, muted), onUpdate(), onBlocked() }
    this.hooks = hooks;
    this.peer = null;
    this.stream = null;
    this.muted = false;
    this.roster = []; // [{ peerId, seatId, muted }]
    this.calls = new Map(); // peerId -> { call, audio }
    this.lastTry = new Map();
    this.meters = new Map(); // key -> analyser
    this.levels = new Map();
    this.ac = null;
    this.timer = null;
  }

  get active() { return !!this.stream; }

  attach(peer) {
    if (!peer || this.peer === peer) return;
    this.peer = peer;
    peer.on('call', (call) => this._incoming(call));
    // A new peer means a new id: existing calls are dead.
    for (const id of [...this.calls.keys()]) this._drop(id, false);
    if (this.active) this.hooks.announce(true, this.muted);
  }

  async join() {
    if (this.stream) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Voice needs a secure (https) page and a browser with microphone support.');
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
    } catch (e) {
      throw new Error(e && e.name === 'NotAllowedError'
        ? 'Microphone access was blocked. Allow it in your browser settings to talk.'
        : 'No microphone could be opened.');
    }
    this.muted = false;
    this._meter('me', this.stream);
    this.timer = setInterval(() => this._sample(), 150);
    this.hooks.announce(true, false);
    this.sync();
    this.hooks.onUpdate();
  }

  leave() {
    if (!this.stream) return;
    for (const id of [...this.calls.keys()]) this._drop(id, false);
    this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
    clearInterval(this.timer);
    this.meters.clear();
    this.levels.clear();
    this.hooks.announce(false, false);
    this.hooks.onUpdate();
  }

  toggleMute() {
    if (!this.stream) return;
    this.muted = !this.muted;
    this.stream.getAudioTracks().forEach((t) => { t.enabled = !this.muted; });
    this.hooks.announce(true, this.muted);
    this.hooks.onUpdate();
  }

  setRoster(list) {
    this.roster = Array.isArray(list) ? list : [];
    this.sync();
    this.hooks.onUpdate();
  }

  sync() {
    if (!this.stream || !this.peer || !this.peer.id) return;
    const me = this.peer.id;
    const ids = new Set(this.roster.map((r) => r.peerId));
    for (const id of [...this.calls.keys()]) if (!ids.has(id)) this._drop(id, false);
    for (const r of this.roster) {
      if (r.peerId === me || this.calls.has(r.peerId) || !(me < r.peerId)) continue;
      const last = this.lastTry.get(r.peerId) || 0;
      if (Date.now() - last < RETRY_MS) continue;
      this.lastTry.set(r.peerId, Date.now());
      this._track(r.peerId, this.peer.call(r.peerId, this.stream));
    }
  }

  // Is the player in seat `seatId` currently speaking?
  speaking(seatId, mySeat) {
    if (seatId === mySeat) return !this.muted && (this.levels.get('me') || 0) > 0.05;
    const r = this.roster.find((x) => x.seatId === seatId);
    return !!r && !r.muted && (this.levels.get(r.peerId) || 0) > 0.05;
  }

  connectedCount() {
    let n = 0;
    for (const c of this.calls.values()) if (c.audio) n++;
    return n;
  }

  _incoming(call) {
    if (!this.stream) { call.close(); return; }
    if (this.calls.has(call.peer)) this._drop(call.peer, false);
    call.answer(this.stream);
    this._track(call.peer, call);
  }

  _track(peerId, call) {
    if (!call) return;
    const entry = { call, audio: null };
    this.calls.set(peerId, entry);
    call.on('stream', (remote) => {
      if (entry.audio) return;
      const a = document.createElement('audio');
      a.autoplay = true;
      a.playsInline = true;
      a.srcObject = remote;
      a.hidden = true;
      document.body.append(a);
      a.play().catch(() => this.hooks.onBlocked && this.hooks.onBlocked(a));
      entry.audio = a;
      this._meter(peerId, remote);
      this.hooks.onUpdate();
    });
    const gone = () => { if (this.calls.get(peerId) === entry) this._drop(peerId, true); };
    call.on('close', gone);
    call.on('error', gone);
  }

  _drop(peerId, retry) {
    const e = this.calls.get(peerId);
    if (!e) return;
    this.calls.delete(peerId);
    try { e.call.close(); } catch { /* already closed */ }
    if (e.audio) { e.audio.srcObject = null; e.audio.remove(); }
    this.meters.delete(peerId);
    this.levels.delete(peerId);
    this.hooks.onUpdate();
    if (retry) setTimeout(() => this.sync(), RETRY_MS + 100);
  }

  _meter(key, stream) {
    try {
      if (!this.ac) this.ac = new (window.AudioContext || window.webkitAudioContext)();
      const src = this.ac.createMediaStreamSource(stream);
      const an = this.ac.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      this.meters.set(key, an);
    } catch { /* level meter is optional */ }
  }

  _sample() {
    this.ticks = (this.ticks || 0) + 1;
    if (this.ticks % 30 === 0) this.sync(); // heal links that dropped
    const buf = new Uint8Array(512);
    for (const [key, an] of this.meters) {
      an.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += ((v - 128) / 128) ** 2;
      this.levels.set(key, Math.sqrt(sum / buf.length));
    }
    if (this.hooks.onLevels) this.hooks.onLevels();
  }
}
