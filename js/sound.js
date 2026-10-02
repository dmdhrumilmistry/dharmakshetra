// Tiny synthesised sounds (dice clatter, temple bell, chimes) and optional
// ambient music: a soft tanpura drone with a bamboo flute wandering in raga Bhupali.

let ctx = null;
let enabled = localStorage.getItem('dk-sound') !== 'off';

export const soundOn = () => enabled;
export function setSound(on) {
  enabled = on;
  localStorage.setItem('dk-sound', on ? 'on' : 'off');
  if (!on) stopMusic();
}

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, type = 'sine', gain = 0.12, dest = null) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, a.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, a.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  o.connect(g).connect(dest || a.destination);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.05);
}

export function play(name) {
  if (!enabled) return;
  try {
    switch (name) {
      case 'dice':
        for (let k = 0; k < 7; k++) tone(180 + Math.random() * 260, k * 0.06, 0.05, 'triangle', 0.08);
        break;
      case 'bell':
        tone(660, 0, 1.6, 'sine', 0.1);
        tone(1320, 0, 1.1, 'sine', 0.04);
        tone(1980, 0, 0.6, 'sine', 0.02);
        break;
      case 'chime':
        tone(880, 0, 0.5, 'sine', 0.06);
        tone(1175, 0.09, 0.6, 'sine', 0.05);
        break;
      case 'card':
        tone(523, 0, 0.35, 'triangle', 0.06);
        tone(784, 0.08, 0.5, 'sine', 0.05);
        break;
      case 'coin':
        tone(1400, 0, 0.12, 'square', 0.03);
        tone(1900, 0.05, 0.18, 'square', 0.025);
        break;
      case 'win':
        [523, 659, 784, 1047].forEach((f, k) => tone(f, k * 0.14, 0.9, 'sine', 0.08));
        break;
      case 'hop':
        tone(320 + Math.random() * 40, 0, 0.06, 'sine', 0.03);
        break;
      case 'land':
        tone(220, 0, 0.12, 'sine', 0.06);
        tone(330, 0.03, 0.1, 'triangle', 0.03);
        break;
      case 'tap':
        tone(740, 0, 0.05, 'sine', 0.035);
        break;
      case 'xp':
        tone(1320, 0, 0.12, 'sine', 0.035);
        tone(1760, 0.06, 0.16, 'sine', 0.03);
        break;
      case 'badge':
        [784, 988, 1175, 1568].forEach((f, k) => tone(f, k * 0.08, 0.6, 'sine', 0.06));
        tone(2350, 0.34, 0.8, 'sine', 0.02);
        break;
      case 'level':
        [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, k * 0.1, 1.1, 'triangle', 0.05));
        [1047, 1319, 1568].forEach((f) => tone(f, 0.55, 1.4, 'sine', 0.04));
        break;
    }
  } catch { /* audio is a nicety */ }
}

// ---------- ambient music ----------

let music = null;
// Bhupali: Sa Re Ga Pa Dha, around a gentle C#.
const SA = 277.18;
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16].map((n) => SA * 2 ** (n / 12));

function flute(a, out, freq, at, dur) {
  const o = a.createOscillator();
  const v = a.createOscillator();
  const vg = a.createGain();
  const g = a.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  v.frequency.value = 5;
  vg.gain.value = freq * 0.006;
  v.connect(vg).connect(o.frequency);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(0.5, at + 0.12);
  g.gain.setValueAtTime(0.45, at + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(out);
  o.start(at); v.start(at);
  o.stop(at + dur + 0.1); v.stop(at + dur + 0.1);
}

export function startMusic() {
  if (music || !enabled) return;
  const a = ac();
  if (!a) return;
  const master = a.createGain();
  master.gain.value = 0;
  master.gain.linearRampToValueAtTime(0.05, a.currentTime + 3);
  master.connect(a.destination);
  // Drone: Sa and Pa, breathing slowly.
  const drones = [SA / 2, (SA * 1.5) / 2, SA / 4].map((f, k) => {
    const o = a.createOscillator();
    const g = a.createGain();
    const lfo = a.createOscillator();
    const lg = a.createGain();
    o.type = k === 2 ? 'sine' : 'triangle';
    o.frequency.value = f;
    g.gain.value = k === 2 ? 0.5 : 0.22;
    lfo.frequency.value = 0.08 + k * 0.05;
    lg.gain.value = 0.12;
    lfo.connect(lg).connect(g.gain);
    o.connect(g).connect(master);
    o.start(); lfo.start();
    return [o, lfo];
  });
  let note = 2;
  const phrase = () => {
    if (!music) return;
    let t = a.currentTime + 0.1;
    const n = 2 + Math.floor(Math.random() * 4);
    for (let k = 0; k < n; k++) {
      note = Math.max(0, Math.min(SCALE.length - 1, note + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
      const dur = [0.5, 0.75, 1, 1.5][Math.floor(Math.random() * 4)];
      flute(a, master, SCALE[note], t, dur * 1.1);
      t += dur;
    }
    music.timer = setTimeout(phrase, (t - a.currentTime) * 1000 + 1800 + Math.random() * 3200);
  };
  music = { master, drones, timer: setTimeout(phrase, 1500) };
}

export function stopMusic() {
  if (!music) return;
  const m = music;
  music = null;
  clearTimeout(m.timer);
  const a = ac();
  if (!a) return;
  m.master.gain.cancelScheduledValues(a.currentTime);
  m.master.gain.setValueAtTime(m.master.gain.value, a.currentTime);
  m.master.gain.linearRampToValueAtTime(0, a.currentTime + 0.8);
  setTimeout(() => { for (const [o, l] of m.drones) { o.stop(); l.stop(); } m.master.disconnect(); }, 900);
}

export const musicOn = () => !!music;
