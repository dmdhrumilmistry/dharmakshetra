// Tiny synthesised sounds: dice clatter, a temple bell, a soft chime.

let ctx = null;
let enabled = localStorage.getItem('dk-sound') !== 'off';

export const soundOn = () => enabled;
export function setSound(on) {
  enabled = on;
  localStorage.setItem('dk-sound', on ? 'on' : 'off');
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

function tone(freq, start, dur, type = 'sine', gain = 0.12) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, a.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, a.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.05);
}

export function play(name) {
  if (!enabled) return;
  try {
    switch (name) {
      case 'dice':
        for (let k = 0; k < 6; k++) tone(180 + Math.random() * 260, k * 0.06, 0.05, 'triangle', 0.08);
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
        tone(320, 0, 0.06, 'sine', 0.03);
        break;
    }
  } catch { /* audio is a nicety */ }
}
