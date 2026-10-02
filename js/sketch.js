// Painted scenes of each place in a soft, hand-painted animation style:
// watercolour skies and meadows, solid painted shapes with comic ink outlines.
// Ink lines draw themselves in when the scene opens.

import { PLACES } from './places.js';

let seq = 0;
let delay = 0;
let gid = 'sk';

const ink = (d, w = 1.6) => {
  delay += 0.025;
  return `<path class="ink" pathLength="1" d="${d}" fill="none" stroke="#2E2A26" stroke-width="${(w * 1.25).toFixed(2)}" style="animation-delay:${delay.toFixed(2)}s"/>`;
};
// White highlight strokes, for ripples on water.
const shine = (d, w = 1.4) => `<path d="${d}" fill="none" stroke="#FFFFFF" stroke-width="${w}" stroke-linecap="round" opacity=".8"/>`;
// A solid painted fill with a soft light from above.
const wash = (d, color) => `<path class="wash" d="${d}" fill="${color}" stroke="none"/><path class="wash" d="${d}" fill="url(#${gid}-gl)" stroke="none"/>`;
const at = (x, y, s, body, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${body}</g>`;
const circ = (cx, cy, r) => `M${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`;
const rect = (x, y, w, h) => `M${x} ${y} h${w} v${h} h${-w} Z`;

const M = {
  ground: () => wash('M0 156 C 60 150, 110 160, 170 154 S 280 150, 320 156 V180 H0 Z', '#79B861')
    + `<path d="M0 166 C 80 160, 160 170, 320 164 V180 H0 Z" fill="#5E9C4E"/>`
    + `<g stroke="#3F7A3E" stroke-width="1.2" stroke-linecap="round" fill="none">${[18, 52, 96, 134, 188, 226, 262, 300].map((x, k) => `<path d="M${x} ${164 + (k % 2) * 6} q 1 -6 3 -8 M${x + 3} ${164 + (k % 2) * 6} q 0 -5 -3 -7"/>`).join('')}</g>`
    + `<g>${[40, 112, 176, 244, 288].map((x, k) => `<circle cx="${x}" cy="${168 + (k % 2) * 5}" r="1.8" fill="${k % 2 ? '#F7B6C8' : '#FFF6E0'}"/>`).join('')}</g>`
    + ink('M0 156 C 60 150, 110 160, 170 154 S 280 150, 320 156', 1.2),
  hills: () => wash('M0 122 C 40 98, 80 98, 120 118 C 150 102, 190 94, 230 114 C 260 102, 300 104, 320 114 V160 H0 Z', '#8DC27A')
    + `<g fill="#6EA862">${[[40, 114, 9], [52, 116, 7], [210, 108, 10], [224, 112, 7]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>`
    + ink('M0 122 C 40 98, 80 98, 120 118 C 150 102, 190 94, 230 114 C 260 102, 300 104, 320 114', 1.1),
  sun: (x, y, r = 14, low = false) => `<circle cx="${x}" cy="${y}" r="${r * 3}" fill="url(#${gid}-glow)"/>`
    + `<circle cx="${x}" cy="${y}" r="${r}" fill="${low ? '#FF9A5C' : '#FFE08A'}"/><circle cx="${x - r * 0.25}" cy="${y - r * 0.25}" r="${r * 0.6}" fill="${low ? '#FFC08A' : '#FFF4C8'}"/>`,
  moon: (x, y) => `<circle cx="${x}" cy="${y}" r="40" fill="url(#${gid}-glow)"/>`
    + `<path d="M${x + 6} ${y - 15} A 16 16 0 1 0 ${x + 6} ${y + 15} A 12 12 0 1 1 ${x + 6} ${y - 15} Z" fill="#FFF3C4"/>`
    + `<g fill="#FFFFFF">${[[-120, -10], [-60, 20], [-160, 30], [30, 40], [-30, -20]].map(([dx, dy]) => `<circle cx="${x + dx}" cy="${y + dy}" r="1.3"/>`).join('')}</g>`,
  palace: (x, y, s = 1) => at(x, y, s, wash('M-60 0 V-40 H60 V0 Z M-24 -40 Q-24 -70 0 -78 Q24 -70 24 -40 Z', '#E9B949', 0.35)
    + ink('M-60 0 V-40 H60 V0 M-66 0 H66 M-70 5 H70')
    + ink('M-24 -40 Q-24 -70 0 -78 Q24 -70 24 -40 M0 -78 V-81 M-3.5 -81 Q0 -88 3.5 -81 Z M0 -86 V-92')
    + ink('M-60 -40 V-62 H-46 V-40 M-62 -62 Q-53 -76 -44 -62 M60 -40 V-62 H46 V-40 M62 -62 Q53 -76 44 -62')
    + ink('M-10 0 V-18 Q0 -28 10 -18 V0 M-40 -14 V-26 Q-35 -32 -30 -26 V-14 M30 -14 V-26 Q35 -32 40 -26 V-14', 1.2)),
  flag: (x, y) => ink(`M${x} ${y} V${y - 24} M${x} ${y - 24} L${x + 16} ${y - 19} L${x} ${y - 14}`, 1.3),
  tree: (x, y, s = 1) => at(x, y, s, wash('M-22 -34 C -30 -48, -14 -62, -2 -56 C 4 -70, 26 -66, 24 -50 C 36 -44, 26 -28, 12 -34 C 4 -26, -14 -26, -22 -34 Z', '#4E9A62', 0.35)
    + ink('M-3 0 C -2 -14, -4 -24, -1 -32 M3 0 C 2 -14, 4 -24, 1 -32 M0 -22 L -8 -30 M1 -26 L 9 -32')
    + ink('M-22 -34 C -30 -48, -14 -62, -2 -56 C 4 -70, 26 -66, 24 -50 C 36 -44, 26 -28, 12 -34 C 4 -26, -14 -26, -22 -34 Z')),
  hut: (x, y, s = 1) => at(x, y, s, wash('M-18 0 V-18 H18 V0 Z M-24 -16 L0 -36 L24 -16 Z', '#C9A46A', 0.4)
    + ink('M-18 0 V-17 H18 V0 M-24 -16 L0 -36 L24 -16 M-5 0 V-11 H5 V0')
    + ink('M-14 -22 L-8 -18 M-6 -28 L0 -22 M4 -28 L8 -22 M12 -22 L16 -18', 1)),
  cart: (x, y, s = 1) => at(x, y, s, wash('M-20 -10 H20 V-22 H-20 Z M-18 -22 C -14 -34, 14 -34, 18 -22 Z', '#E9B949', 0.35)
    + ink('M-20 -10 H20 V-22 H-20 Z M20 -14 L36 -8 M-18 -22 C -14 -34, 14 -34, 18 -22')
    + ink(`${circ(-12, -4, 7)} ${circ(12, -4, 7)}`, 1.3)),
  house: (x, y, s = 1) => at(x, y, s, wash('M-40 0 V-34 H40 V0 Z M-48 -32 L0 -58 L48 -32 Z', '#D9A44A', 0.35)
    + ink('M-40 0 V-34 H40 V0 M-48 -32 L0 -58 L48 -32 M-26 0 V-34 M0 0 V-34 M26 0 V-34 M-46 0 H46')),
  flames: (x, y, s = 1) => at(x, y, s, wash('M-16 0 C -26 -14, -12 -26, -10 -40 C -2 -28, 4 -36, 6 -52 C 12 -36, 22 -26, 20 -32 C 28 -18, 26 -6, 20 0 Z', '#E9573F', 0.45)
    + ink('M-14 0 C -24 -14, -10 -26, -8 -40 C -2 -28, 6 -22, 2 0 M0 0 C -8 -18, 4 -34, 6 -52 C 12 -36, 20 -24, 12 0 M10 0 C 6 -12, 18 -20, 20 -32 C 26 -18, 26 -8, 20 0', 1.4)),
  tunnel: (x, y) => ink(`M${x - 50} ${y} Q ${x} ${y + 22} ${x + 50} ${y - 4}`, 1.2).replace('class="ink"', 'class="ink dash"') + ink(circ(x + 52, y - 6, 4), 1.2),
  altar: (x, y, s = 1) => at(x, y, s, wash('M-30 0 H30 V-10 H-30 Z M-22 -10 V-20 H22 V-10 Z', '#B8323F', 0.3)
    + ink('M-30 0 H30 V-10 H-30 Z M-22 -10 V-20 H22 V-10 M-30 -5 H30 M-10 0 V-10 M10 0 V-10', 1.4)),
  smoke: (x, y) => ink(`M${x} ${y + 10} C ${x - 8} ${y}, ${x + 8} ${y - 10}, ${x} ${y - 20} C ${x - 8} ${y - 30}, ${x + 6} ${y - 36}, ${x} ${y - 44} M${x + 16} ${y + 6} C ${x + 10} ${y - 4}, ${x + 22} ${y - 12}, ${x + 16} ${y - 22}`, 1),
  ghat: (x, y, s = 1) => at(x, y, s, wash('M-50 -40 H-20 V-32 H0 V-24 H20 V-16 H40 V-8 H60 V0 H-50 Z', '#C9A46A', 0.35)
    + ink('M-50 -40 H-20 V-32 H0 V-24 H20 V-16 H40 V-8 H60 M-50 -40 V0')
    + ink('M-50 -40 V-56 H-34 V-40 M-54 -56 L-42 -68 L-30 -56', 1.3)),
  temple: (x, y, s = 1) => at(x, y, s, wash('M-22 0 V-18 H22 V0 Z M-18 -18 C -18 -40, -8 -58, 0 -64 C 8 -58, 18 -40, 18 -18 Z', '#E8893A', 0.35)
    + ink('M-22 0 V-18 H22 V0 M-26 0 H26 M-6 0 V-10 Q0 -15 6 -10 V0')
    + ink('M-18 -18 C -18 -40, -8 -58, 0 -64 C 8 -58, 18 -40, 18 -18 M-16 -30 H16 M-12 -44 H12 M-6 -64 H6 M0 -64 V-74 M0 -74 L10 -71 L0 -68', 1.4)),
  river: (y) => `<path d="M0 ${y - 4} C 40 ${y - 10}, 80 ${y + 2}, 120 ${y - 4} S 200 ${y - 10}, 240 ${y - 4} S 300 ${y + 2}, 320 ${y - 4} V180 H0 Z" fill="url(#${gid}-water)"/>`
    + ink(`M0 ${y - 4} C 40 ${y - 10}, 80 ${y + 2}, 120 ${y - 4} S 200 ${y - 10}, 240 ${y - 4} S 300 ${y + 2}, 320 ${y - 4}`, 1.1)
    + [8, 20, 32].map((d, k) => shine(`M${20 + k * 30} ${y + d} q 10 -4 20 0 M${150 + k * 20} ${y + d + 3} q 12 -4 24 0 M${250 - k * 10} ${y + d} q 9 -3 18 0`)).join(''),
  lotus: (x, y, s = 1) => at(x, y, s, wash('M0 0 C -10 -4, -18 -12, -20 -20 C -10 -18, -6 -22, 0 -26 C 6 -22, 10 -18, 20 -20 C 18 -12, 10 -4, 0 0 Z', '#E86A8E', 0.45)
    + ink('M0 0 C -6 -8, -6 -18, 0 -26 C 6 -18, 6 -8, 0 0 M0 0 C -10 -4, -18 -12, -20 -20 C -10 -18, -4 -10, 0 0 M0 0 C 10 -4, 18 -12, 20 -20 C 10 -18, 4 -10, 0 0 M-22 4 C -10 8, 10 8, 22 4', 1.3)),
  fishTarget: (x, y, s = 1) => at(x, y, s, ink('M0 60 V16')
    + ink(`${circ(0, 0, 16)} M-16 0 H16 M0 -16 V16 M-11 -11 L11 11 M11 -11 L-11 11`, 1.2)
    + wash('M-14 -24 C -6 -32, 8 -32, 14 -24 C 8 -18, -6 -18, -14 -24 Z', '#5FA8CC', 0.5)
    + ink('M-14 -24 C -6 -32, 8 -32, 14 -24 C 8 -18, -6 -18, -14 -24 Z M14 -24 L22 -30 L22 -18 Z M-8 -25 l0.1 0', 1.3)),
  pool: (x, y) => `<path d="M${x - 62} ${y} C ${x - 62} ${y - 12}, ${x + 62} ${y - 12}, ${x + 62} ${y} C ${x + 62} ${y + 12}, ${x - 62} ${y + 12}, ${x - 62} ${y} Z" fill="url(#${gid}-water)"/>`
    + ink(`M${x - 62} ${y} C ${x - 62} ${y - 12}, ${x + 62} ${y - 12}, ${x + 62} ${y} C ${x + 62} ${y + 12}, ${x - 62} ${y + 12}, ${x - 62} ${y} Z`, 1.2)
    + shine(`M${x - 30} ${y} q 8 -3 16 0 M${x + 10} ${y + 2} q 8 -3 16 0`),
  bow: (x, y, s = 1) => at(x, y, s, ink('M-4 -36 C 22 -18, 22 18, -4 36', 2) + ink('M-4 -36 L -4 36', 0.9) + ink('M-26 0 H 26 M20 -5 L27 0 L20 5 M-26 0 l-5 -4 M-26 0 l-5 4', 1.3)),
  cow: (x, y, s = 1) => at(x, y - 12 * s, s, wash('M-26 -10 C -26 -26, 18 -28, 22 -14 C 24 -6, 18 -2, 14 -2 H-20 C -26 -2, -27 -6, -26 -10 Z', '#FBF3E0', 0.9)
    + ink('M-26 -10 C -26 -26, 18 -28, 22 -14 C 24 -6, 18 -2, 14 -2 H-20 C -26 -2, -27 -6, -26 -10 Z')
    + ink('M-18 -2 V12 M-10 -2 V12 M8 -2 V12 M14 -2 V12 M22 -14 C 30 -20, 36 -16, 34 -8 C 32 -4, 26 -6, 22 -8 M28 -18 l -2 -6 M32 -17 l 3 -6 M-26 -10 C -32 -6, -32 2, -30 6', 1.3)
    + wash('M-8 -20 C -2 -24, 6 -20, 4 -14 C -2 -10, -10 -14, -8 -20 Z', '#8B5A3C', 0.5)),
  chakra: (x, y, r = 28) => wash(circ(x, y, r + 4), '#E9B949', 0.35)
    + ink(`${circ(x, y, r)} ${circ(x, y, r * 0.3)}`, 1.5)
    + ink(Array.from({ length: 12 }, (_, k) => {
      const a = (k * Math.PI) / 6;
      return `M${(x + r * 0.3 * Math.cos(a)).toFixed(1)} ${(y + r * 0.3 * Math.sin(a)).toFixed(1)} L${(x + r * Math.cos(a)).toFixed(1)} ${(y + r * Math.sin(a)).toFixed(1)} M${(x + r * Math.cos(a)).toFixed(1)} ${(y + r * Math.sin(a)).toFixed(1)} L${(x + (r + 8) * Math.cos(a + 0.13)).toFixed(1)} ${(y + (r + 8) * Math.sin(a + 0.13)).toFixed(1)}`;
    }).join(' '), 1.1),
  crown: (x, y, s = 1) => at(x, y, s, wash('M-24 0 L-28 -26 L-12 -14 L0 -32 L12 -14 L28 -26 L24 0 Z', '#E9B949', 0.45)
    + ink('M-24 0 L-28 -26 L-12 -14 L0 -32 L12 -14 L28 -26 L24 0 Z M-24 0 H24 V6 H-24 Z')
    + ink(circ(0, -10, 3.4), 1.2)),
  mace: (x, y, s = 1, flip = false) => at(x, y, s, wash(circ(0, -20, 12), '#E0A33A', 0.45)
    + ink(`M0 30 L0 -8 ${circ(0, -20, 12)} M-11 -24 Q0 -18 11 -24 M-11 -16 Q0 -10 11 -16 M0 -32 V-38`, 1.5), flip ? 24 : -24),
  basket: (x, y, s = 1) => at(x, y, s, wash('M-22 -6 C -22 -28, 22 -28, 22 -6 Z', '#2E7D4F', 0.3)
    + ink('M-16 0 C -16 12, 16 12, 16 0 Z M-16 4 H16')
    + ink(`${circ(0, -4, 5)} M-22 -6 C -22 -28, 22 -28, 22 -6 M-22 -6 q 5 -6 9 -2 q 5 -6 9 -2 q 4 -6 8 -2 q 4 -6 8 -2`, 1.3)),
  serpent: (x, y, s = 1) => at(x, y, s, ink('M-44 0 C -34 -10, -24 10, -12 0 S 8 -10, 20 0 C 26 -12, 34 -20, 30 -30 C 24 -34, 18 -28, 22 -22 M24 -30 l0.1 0', 1.7)),
  rain: () => ink(Array.from({ length: 22 }, (_, k) => {
    const x = 12 + k * 14, y = 10 + (k % 3) * 14;
    return `M${x} ${y} l-5 12`;
  }).join(' '), 0.9),
  mountain: (x, y, s = 1) => at(x, y, s, wash('M-52 0 L -10 -62 L 8 -38 L 20 -50 L 58 0 Z', '#8A8FA8', 0.3)
    + ink('M-52 0 L -10 -62 L 8 -38 L 20 -50 L 58 0')
    + ink('M-22 -44 L-10 -62 L 2 -46 L -4 -48 L -10 -42 L -16 -46 Z M0 -10 l 10 -14 M10 -6 l 10 -14 M20 -4 l 10 -14', 1)),
  dice: (x, y, s = 1) => at(x, y, s, wash('M-32 -8 H32 V8 H-32 Z', '#FBF3E0', 0.9)
    + ink('M-32 -8 H32 V8 H-32 Z M-14 0 l0.1 0 M0 0 l0.1 0 M14 0 l0.1 0', 1.6), -14)
    + at(x + 6, y + 16, s, wash('M-32 -8 H32 V8 H-32 Z', '#FBF3E0', 0.9) + ink('M-32 -8 H32 V8 H-32 Z M-8 0 l0.1 0 M8 0 l0.1 0', 1.6), 10),
  chariot: (x, y, s = 1) => at(x, y, s, wash('M-30 -28 H34 C 40 -36, 38 -44, 30 -46 H6 V-44 H-30 Z', '#E9B949', 0.35)
    + ink(`${circ(-6, -16, 16)} M-6 -32 V0 M-22 -16 H10 M-17 -27 L5 -5 M5 -27 L-17 -5`, 1.4)
    + ink('M-30 -28 H34 M-30 -28 V-44 H6 M34 -28 C 40 -36, 38 -44, 30 -46 M34 -28 L 62 -24 M-26 -44 V-72 M-26 -72 L-8 -66 L-26 -60')),
  scroll: (x, y, s = 1) => at(x, y, s, wash('M-26 -8 H26 V8 H-26 Z', '#F6E7B0', 0.8) + ink(`M-26 -8 H26 V8 H-26 Z ${circ(-26, 0, 8)} ${circ(26, 0, 8)} M-14 -2 H14 M-14 3 H8`, 1.2)),
  plough: (x, y, s = 1) => at(x, y, s, ink('M-50 -30 C -20 -24, 10 -16, 36 -2 M-20 -24 L -30 -46 M-36 -50 L -24 -42', 2)
    + wash('M36 -2 L 52 6 L 34 9 Z', '#E9B949', 0.6) + ink('M36 -2 L 52 6 L 34 9 Z', 1.4)),
  deer: (x, y, s = 1) => at(x, y - 14 * s, s, wash('M-16 -6 C -16 -14, 14 -14, 16 -6 C 14 0, -14 0, -16 -6 Z', '#C98A3A', 0.45)
    + ink('M-16 -6 C -16 -14, 14 -14, 16 -6 C 14 0, -14 0, -16 -6 Z M-12 -2 V14 M-6 -1 V14 M8 -1 V14 M12 -2 V14 M14 -10 L 20 -22 L 26 -20 L 22 -14 M20 -22 l -2 -8 l -4 -2 M20 -22 l 4 -8 l 4 0', 1.3)),
  steam: (x, y) => ink([-14, 0, 14].map((d) => `M${x + d} ${y + 10} C ${x + d - 6} ${y}, ${x + d + 6} ${y - 8}, ${x + d} ${y - 18}`).join(' '), 1),
  pot: (x, y, s = 1) => at(x, y, s, wash('M-26 -38 C -30 -10, -20 0, 0 0 C 20 0, 30 -10, 26 -38 Z', '#B87A14', 0.4)
    + ink('M-26 -38 C -30 -10, -20 0, 0 0 C 20 0, 30 -10, 26 -38 M-30 -40 H30 M-28 -24 H28')
    + wash('M-20 -40 C -14 -56, 14 -56, 20 -40 Z', '#FBF3E0', 0.8) + ink('M-20 -40 C -14 -56, 14 -56, 20 -40', 1.2)),
  field: () => wash('M0 120 H320 V180 H0 Z', '#E6C46A') + ink('M0 120 H320', 1.2)
    + `<g stroke="#C79A3E" stroke-width="3" opacity=".6">${[-140, -80, -30, 20, 70, 130, 200].map((d) => `<path d="M${160 + d * 2.2} 180 L ${160 + d * 0.4} 122"/>`).join('')}</g>`,
  pillars: () => ink('M20 40 H300 M20 46 H300 M20 160 H300', 1.4)
    + ink([40, 100, 220, 280].map((x) => `M${x} 46 V160 M${x + 10} 46 V160 M${x - 4} 52 H${x + 14} M${x - 4} 154 H${x + 14}`).join(' '), 1.2)
    + ink('M50 46 Q 75 70 100 46 M230 46 Q 255 70 280 46', 1),
  prison: (x, y, s = 1) => at(x, y, s, wash('M-36 0 V-56 H36 V0 Z', '#8A8FA8', 0.3)
    + ink('M-36 0 V-56 H36 V0 M-14 -40 H14 V-20 H-14 Z M-7 -40 V-20 M0 -40 V-20 M7 -40 V-20')
    + ink('M-36 -10 H-14 M14 -10 H36 M-36 -48 H36 M-24 0 V-10 M24 0 V-10', 0.9)),
  butterPot: (x, y, s = 1) => at(x, y, s, ink('M-14 0 L 0 -50 L 14 0 M0 -50 V-64', 1.1)
    + wash('M-18 0 C -24 20, -10 32, 0 32 C 10 32, 24 20, 18 0 Z', '#C98A3A', 0.4)
    + ink('M-18 0 C -24 20, -10 32, 0 32 C 10 32, 24 20, 18 0 Z M-18 0 H18')
    + wash('M-12 0 C -10 -9, 10 -9, 12 0 Z', '#FBF3E0', 0.95) + ink('M-12 0 C -10 -9, 10 -9, 12 0', 1.2)),
  govardhan: (x, y, s = 1) => at(x, y, s, wash('M-62 -30 C -42 -72, 42 -72, 62 -30 C 30 -36, -30 -36, -62 -30 Z', '#4E9A62', 0.4)
    + ink('M-62 -30 C -42 -72, 42 -72, 62 -30 C 30 -36, -30 -36, -62 -30 Z M-30 -50 l 4 -8 l 4 8 M10 -56 l 4 -8 l 4 8 M34 -44 l 3 -6 l 3 6')
    + ink('M0 -32 V 34 M-4 34 H4', 1.6)
    + ink('M-40 30 q 4 -10 8 0 M-24 32 q 4 -10 8 0 M20 32 q 4 -10 8 0 M36 30 q 4 -10 8 0', 1.2)),
  confluence: () => `<path d="M0 30 C 80 60, 120 100, 150 180 H190 C 200 100, 260 50, 320 30 V 0 H 300 C 240 30, 190 70, 170 130 C 150 80, 80 30, 0 0 Z" fill="url(#${gid}-water)"/>`
    + ink('M0 30 C 80 60, 120 100, 150 180 M0 0 C 80 30, 150 80, 170 130 M320 30 C 260 50, 200 100, 190 180 M300 0 C 240 30, 190 70, 170 130', 1.2)
    + ink('M150 150 q 8 -4 16 0 M160 120 q 6 -3 12 0', 0.9),
  sea: (y) => `<path d="M0 ${y} H320 V180 H0 Z" fill="url(#${gid}-water)"/>` + ink(`M0 ${y} H320`, 1.1)
    + [8, 20, 32].map((d) => shine(Array.from({ length: 9 }, (_, k) => `M${k * 36 + (d % 24 ? 18 : 0)} ${y + d} q 9 -6 18 0`).join(' '))).join(''),
  boat: (x, y, s = 1) => at(x, y, s, wash('M-24 0 C -16 8, 16 8, 24 0 Z M0 -30 L 18 -8 H0 Z', '#FBF3E0', 0.9) + ink('M-24 0 C -16 8, 16 8, 24 0 Z M0 0 V-30 M0 -30 L 18 -8 H0', 1.3)),
  diya: (x, y, s = 1) => at(x, y, s, wash('M-20 0 C -14 10, 14 10, 20 0 Z', '#B87A14', 0.5)
    + ink('M-20 0 C -14 10, 14 10, 20 0 Z')
    + wash('M0 -2 C -6 -10, -2 -18, 0 -26 C 2 -18, 6 -10, 0 -2 Z', '#F2B632', 0.7) + ink('M0 -2 C -6 -10, -2 -18, 0 -26 C 2 -18, 6 -10, 0 -2 Z', 1.2)),
  petals: () => [[60, 40], [250, 50], [90, 140], [230, 150], [40, 100], [280, 110]].map(([x, y], k) => at(x, y, 0.5, wash('M0 0 C -6 -8, -6 -18, 0 -26 C 6 -18, 6 -8, 0 0 Z', '#E86A8E', 0.5) + ink('M0 0 C -6 -8, -6 -18, 0 -26 C 6 -18, 6 -8, 0 0 Z', 1.6), k * 50)).join(''),
  flute: (x, y, s = 1) => at(x, y, s, wash('M-70 -4 H70 V4 H-70 Z', '#B5651D', 0.5) + ink('M-70 -4 H70 V4 H-70 Z M-20 0 l0.1 0 M-6 0 l0.1 0 M8 0 l0.1 0 M22 0 l0.1 0 M-54 -4 V4', 1.4), -16),
  feather: (x, y, s = 1) => at(x, y, s, ink('M0 40 C 2 20, 2 0, 0 -18', 1.2)
    + wash(circ(0, -20, 10), '#1FA38D', 0.5) + ink(`M0 -6 C -12 -10, -12 -32, 0 -36 C 12 -32, 12 -10, 0 -6 Z ${circ(0, -20, 4)}`, 1.2), 18),
  notes: () => ink('M60 60 v-16 l10 -3 v14 M60 60 a3 2 0 1 1 -1 -1 M250 120 v-14 l9 -3 v12 M250 120 a3 2 0 1 1 -1 -1 M270 40 v-12 M270 40 a3 2 0 1 1 -1 -1', 1.3),
  fort: (x, y, s = 1) => at(x, y, s, wash('M-60 0 V-40 H60 V0 Z', '#8A8FA8', 0.3)
    + ink(`M-60 0 V-40 ${Array.from({ length: 6 }, (_, k) => `h10 v-6 h10 v6`).join(' ')} V0 M-66 0 H66`)
    + ink('M-12 0 V-18 Q0 -30 12 -18 V0 M-60 -40 V-56 H-44 V-40 M60 -40 V-56 H44 V-40', 1.3)),
};

// A puffy cloud with a flat, shaded underside.
const cloud = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})" class="sk-cloud">
  <g fill="#FFFFFF"><circle cx="14" cy="16" r="10"/><circle cx="28" cy="10" r="13"/><circle cx="44" cy="8" r="15"/><circle cx="58" cy="14" r="11"/><rect x="4" y="14" width="64" height="12" rx="6"/></g>
  <path d="M8 24 H66" stroke="#DCE8F3" stroke-width="4" stroke-linecap="round"/></g>`;

const SKIES = {
  day: ['#7DB9E3', '#BFE0F2', '#FFF0D2'],
  sunset: ['#8FB8E0', '#F7C8A8', '#FFB38A'],
  dusk: ['#8A93D8', '#D9A6CF', '#FFD3A8'],
};

export function sketch(index, tint = '#E9C46A') {
  const place = PLACES[index];
  if (!place) return '';
  gid = `sk${++seq}`;
  delay = 0;
  const names = place.scene.map((m) => m[0]);
  const mode = names.includes('moon') ? 'dusk' : place.scene.some((m) => m[0] === 'sun' && m[4]) ? 'sunset' : 'day';
  const [top, mid, low] = SKIES[mode];
  const grounded = names.some((n) => ['ground', 'river', 'sea', 'field', 'confluence', 'pillars'].includes(n));
  const body = place.scene.map(([name, ...args]) => (M[name] ? M[name](...args) : '')).join('');
  return `<svg class="sketch" viewBox="0 0 320 180" role="img" aria-label="${place.why ? 'Painting of the place' : 'Painting'}">
    <defs>
      <linearGradient id="${gid}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset=".6" stop-color="${mid}"/><stop offset="1" stop-color="${low}"/></linearGradient>
      <linearGradient id="${gid}-gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".38"/><stop offset=".55" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#2E2A26" stop-opacity=".12"/></linearGradient>
      <linearGradient id="${gid}-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFE3F2"/><stop offset="1" stop-color="#4F9FC4"/></linearGradient>
      <radialGradient id="${gid}-glow"><stop offset="0" stop-color="#FFF6D6" stop-opacity=".95"/><stop offset=".4" stop-color="#FFE8A8" stop-opacity=".45"/><stop offset="1" stop-color="#FFE8A8" stop-opacity="0"/></radialGradient>
      <radialGradient id="${gid}-t" cx="50%" cy="40%" r="65%"><stop offset="0" stop-color="${tint}" stop-opacity=".18"/><stop offset="1" stop-color="${tint}" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="320" height="180" fill="url(#${gid}-sky)"/>
    <rect width="320" height="180" fill="url(#${gid}-t)"/>
    ${cloud(18, 18, 0.9)}${cloud(196, 8, 0.7)}${cloud(250, 52, 0.5)}
    <path d="M0 132 C 50 112, 100 120, 150 108 S 250 100, 320 118 V180 H0 Z" fill="#9CC9B4" opacity=".75"/>
    ${grounded ? '' : `<path d="M0 150 C 70 140, 150 152, 220 144 S 300 142, 320 146 V180 H0 Z" fill="#86BF6C"/><path d="M0 166 C 90 158, 200 170, 320 162 V180 H0 Z" fill="#6AAA58"/>${[40, 120, 200, 280].map((x, k) => `<circle cx="${x}" cy="${168 + (k % 2) * 4}" r="1.8" fill="${k % 2 ? '#F7B6C8' : '#FFF6E0'}"/>`).join('')}`}
    <g stroke-linecap="round" stroke-linejoin="round">${body}</g>
  </svg>`;
}
