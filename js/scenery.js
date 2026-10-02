// Painted scenery in a soft, hand-painted animation style: a summer sky with
// drifting clouds, rolling hills, and the landscape at the heart of the board.

let seq = 0;

// A puffy cumulus with a flat, shaded underside.
export function cloud(w = 220, tone = 0) {
  const id = `cl${++seq}`;
  const puffs = [[40, 62, 30], [78, 44, 38], [122, 38, 44], [164, 52, 34], [196, 64, 24], [100, 66, 30], [146, 68, 28]];
  const shade = ['#D9E7F4', '#E8D9E6', '#F3DCC6'][tone] || '#D9E7F4';
  return `<svg viewBox="0 0 230 100" width="${w}" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset=".62" stop-color="#FFFDF8"/><stop offset="1" stop-color="${shade}"/></linearGradient></defs>
    <g fill="url(#${id})">${puffs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}<rect x="14" y="62" width="200" height="30" rx="15"/></g>
    <g fill="#fff" opacity=".7">${puffs.slice(1, 4).map(([x, y, r]) => `<circle cx="${x - r * 0.25}" cy="${y - r * 0.3}" r="${r * 0.45}"/>`).join('')}</g>
  </svg>`;
}

// Hills along the bottom of the page: far ridges in blue-green, a sunny meadow in front.
export function hills() {
  const tufts = Array.from({ length: 34 }, (_, k) => {
    const x = 18 + k * 42 + (k % 3) * 7;
    const y = 300 + Math.sin(k * 1.7) * 10;
    return `<path d="M${x} ${y} q 3 -14 6 -18 M${x + 4} ${y} q 1 -10 -4 -16 M${x + 8} ${y} q 2 -9 7 -12"/>`;
  }).join('');
  return `<svg class="hills" viewBox="0 0 1440 360" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs>
      <linearGradient id="hl-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9CC4C0"/><stop offset="1" stop-color="#B9D8CF"/></linearGradient>
      <linearGradient id="hl-mid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8DBF78"/><stop offset="1" stop-color="#6FA862"/></linearGradient>
      <linearGradient id="hl-near" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#78B25F"/><stop offset="1" stop-color="#4E8C4A"/></linearGradient>
    </defs>
    <path d="M0 170 C 120 120, 240 140, 330 112 S 520 70, 640 118 S 860 150, 980 104 S 1240 84, 1440 132 V 360 H 0 Z" fill="url(#hl-far)" opacity=".85"/>
    <g transform="translate(1040 92)" fill="#86AFA9" opacity=".9">
      <path d="M-26 22 V0 H26 V22 Z"/><path d="M-20 0 C -18 -20, 0 -40, 0 -52 C 0 -40, 18 -20, 20 0 Z"/><path d="M-1 -52 V-66 L 10 -62 L -1 -58"/>
    </g>
    <path d="M0 236 C 160 196, 300 222, 440 200 S 700 170, 860 214 S 1160 236, 1440 196 V 360 H 0 Z" fill="url(#hl-mid)"/>
    <g fill="#5E9452" opacity=".8">
      <ellipse cx="220" cy="212" rx="34" ry="26"/><ellipse cx="250" cy="206" rx="24" ry="20"/>
      <ellipse cx="1180" cy="214" rx="30" ry="22"/><ellipse cx="1206" cy="220" rx="22" ry="16"/>
    </g>
    <path d="M0 296 C 200 262, 380 288, 600 276 S 980 250, 1180 280 S 1360 292, 1440 284 V 360 H 0 Z" fill="url(#hl-near)"/>
    <g stroke="#3F7A3E" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".55">${tufts}</g>
    <g fill="#FFF6E0">${[90, 380, 560, 840, 1010, 1300].map((x, k) => `<circle cx="${x}" cy="${312 + (k % 2) * 14}" r="3"/><circle cx="${x + 9}" cy="${316 + (k % 2) * 14}" r="2.4"/>`).join('')}</g>
    <g fill="#F4A7BB">${[240, 700, 1120].map((x) => `<circle cx="${x}" cy="322" r="3"/><circle cx="${x + 12}" cy="330" r="2.6"/>`).join('')}</g>
  </svg>`;
}

// The full background: sky, sun, clouds, hills and drifting motes of light.
export function sky() {
  const clouds = [
    { top: 8, w: 300, d: 140, delay: -20, op: 1 },
    { top: 18, w: 200, d: 110, delay: -70, op: 0.9 },
    { top: 4, w: 150, d: 95, delay: -40, op: 0.75, tone: 1 },
    { top: 28, w: 260, d: 160, delay: -110, op: 0.85, tone: 2 },
    { top: 13, w: 120, d: 80, delay: -10, op: 0.7 },
  ];
  const motes = Array.from({ length: 16 }, (_, k) => `<i class="mote" style="left:${(k * 61) % 100}%;top:${30 + ((k * 37) % 60)}%;animation-delay:${-(k * 1.3).toFixed(1)}s;animation-duration:${9 + (k % 5) * 2}s"></i>`).join('');
  return `<div class="sun"></div>
    ${clouds.map((c) => `<div class="cloud" style="top:${c.top}%;opacity:${c.op};animation-duration:${c.d}s;animation-delay:${c.delay}s">${cloud(c.w, c.tone)}</div>`).join('')}
    ${hills()}
    <div class="motes">${motes}</div>`;
}

// The board's centrepiece: a river valley at golden hour with a hill temple.
export function centreScene() {
  const id = `cs${++seq}`;
  const lotus = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">
      <ellipse rx="34" ry="11" fill="#3E8E6A"/><path d="M0 0 L 30 -4" stroke="#2F6F52" stroke-width="2"/>
      <path d="M0 -4 C -18 -6, -26 -16, -28 -24 C -16 -22, -6 -14, 0 -4 Z" fill="#F7B6C8"/>
      <path d="M0 -4 C 18 -6, 26 -16, 28 -24 C 16 -22, 6 -14, 0 -4 Z" fill="#F7B6C8"/>
      <path d="M0 -4 C -10 -14, -10 -32, 0 -44 C 10 -32, 10 -14, 0 -4 Z" fill="#EE87A3"/>
    </g>`;
  return `<svg class="centre-art" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#7DB9E3"/><stop offset=".45" stop-color="#BFE0F2"/><stop offset=".7" stop-color="#FFE7C2"/><stop offset="1" stop-color="#FFD7A8"/>
      </linearGradient>
      <radialGradient id="${id}-sun" cx="74%" cy="52%" r="40%">
        <stop offset="0" stop-color="#FFF6D6"/><stop offset=".25" stop-color="#FFE8A8" stop-opacity=".8"/><stop offset="1" stop-color="#FFE8A8" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${id}-river" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#CFE9F2"/><stop offset="1" stop-color="#6FB2CF"/>
      </linearGradient>
      <filter id="${id}-soft"><feGaussianBlur stdDeviation="1.2"/></filter>
    </defs>
    <rect width="600" height="600" fill="url(#${id}-sky)"/>
    <rect width="600" height="600" fill="url(#${id}-sun)"/>
    <g class="cs-clouds" opacity=".95">
      <g transform="translate(30 70) scale(.9)">${cloudShape()}</g>
      <g transform="translate(360 40) scale(.65)">${cloudShape()}</g>
      <g transform="translate(420 150) scale(.45)">${cloudShape()}</g>
    </g>
    <path d="M0 330 C 80 280, 160 300, 230 270 S 360 250, 430 286 S 540 300, 600 270 V 600 H 0 Z" fill="#A9C9C6" opacity=".8" filter="url(#${id}-soft)"/>
    <path d="M0 370 C 90 340, 170 356, 260 336 S 420 320, 520 350 S 580 360, 600 348 V 600 H 0 Z" fill="#9AC487"/>
    <g transform="translate(150 336)">
      <path d="M-22 6 C -10 -4, 10 -4, 22 6 Z" fill="#86B472"/>
      <rect x="-14" y="-22" width="28" height="24" fill="#FFF3DD"/>
      <path d="M-16 -22 C -14 -42, 0 -58, 0 -70 C 0 -58, 14 -42, 16 -22 Z" fill="#E9A65C"/>
      <path d="M-4 2 V-10 C -4 -14, 4 -14, 4 -10 V2 Z" fill="#B8723E"/>
      <path d="M0 -70 V-82 L 9 -79 L 0 -76" stroke="#B8323F" stroke-width="1.6" fill="#E86A8E"/>
    </g>
    <path d="M0 420 C 120 396, 220 420, 330 404 S 520 380, 600 400 V 600 H 0 Z" fill="#7CB565"/>
    <path d="M250 600 C 270 540, 330 500, 300 452 C 284 426, 330 412, 380 404 C 330 420, 312 440, 330 462 C 360 506, 330 560, 340 600 Z" fill="url(#${id}-river)" opacity=".95"/>
    <g stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity=".7" fill="none">
      <path d="M296 520 q 10 -4 20 0"/><path d="M306 470 q 8 -3 16 0"/><path d="M288 568 q 12 -4 24 0"/>
    </g>
    <path d="M0 500 C 140 476, 220 500, 270 490 L 262 600 H 0 Z" fill="#5E9C55"/>
    <path d="M600 486 C 500 470, 420 494, 360 488 L 352 600 H 600 Z" fill="#5E9C55"/>
    <g transform="translate(520 470)">
      <path d="M-6 0 C -4 -40, -10 -70, -2 -96 L 6 -96 C 10 -70, 8 -40, 10 0 Z" fill="#7A5A3A"/>
      <g fill="#4F8F48"><circle cx="-30" cy="-110" r="34"/><circle cx="20" cy="-124" r="40"/><circle cx="-4" cy="-150" r="34"/><circle cx="40" cy="-96" r="26"/><circle cx="-44" cy="-86" r="22"/></g>
      <g fill="#6DAE5C"><circle cx="-24" cy="-122" r="18"/><circle cx="18" cy="-140" r="22"/><circle cx="-6" cy="-160" r="14"/></g>
    </g>
    ${lotus(300, 556, 0.8)}${lotus(330, 486, 0.45)}
    <g fill="#FFF6E0">${[40, 110, 190, 420, 470].map((x, k) => `<circle cx="${x}" cy="${530 + (k % 3) * 18}" r="3"/>`).join('')}</g>
    <g fill="#F4A7BB">${[70, 160, 450].map((x, k) => `<circle cx="${x}" cy="${548 + (k % 2) * 20}" r="2.6"/>`).join('')}</g>
    <g fill="none" stroke="#3B3A36" stroke-width="2" stroke-linecap="round" opacity=".55">
      <path d="M200 150 q 6 -6 12 0 q 6 -6 12 0"/><path d="M236 176 q 4 -4 8 0 q 4 -4 8 0"/>
    </g>
  </svg>`;
}

function cloudShape() {
  return `<g fill="#FFFFFF"><circle cx="40" cy="62" r="30"/><circle cx="78" cy="44" r="38"/><circle cx="122" cy="38" r="44"/><circle cx="164" cy="52" r="34"/><circle cx="196" cy="64" r="24"/><rect x="14" y="62" width="200" height="30" rx="15"/></g>
    <path d="M18 84 H210" stroke="#DCE8F3" stroke-width="12" stroke-linecap="round"/>`;
}
