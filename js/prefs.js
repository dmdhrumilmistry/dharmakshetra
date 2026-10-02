// Player preferences kept on this device: game speed, guide tips, ambient music.

const KEY = 'dk-prefs';
const DEFAULTS = { speed: 'normal', tips: true, music: false };

let prefs = { ...DEFAULTS };
try { prefs = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* storage disabled */ }

export const SPEEDS = { relaxed: 1.35, normal: 1, fast: 0.6 };

export function pref(name) { return prefs[name]; }
export function setPref(name, value) {
  prefs[name] = value;
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* storage disabled */ }
}

// Multiplier for animation and pacing: lower is quicker.
export const pace = () => SPEEDS[prefs.speed] || 1;
